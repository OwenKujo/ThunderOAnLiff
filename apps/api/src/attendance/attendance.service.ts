import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, BookingStatus, MemberStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { isWithinCheckInWindow } from '../bookings/booking-policy';

const adminAttendanceInclude = {
  trainee: { select: { id: true, firstName: true, lastName: true, phone: true } },
  classSchedule: { include: { trainer: { select: { id: true, name: true } } } },
  attendance: true,
} satisfies Prisma.BookingInclude;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(from?: string, to?: string) {
    const fromAt = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toAt = to ? new Date(to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromAt.getTime()) || Number.isNaN(toAt.getTime()) || fromAt >= toAt) throw new BadRequestException('Invalid attendance date range.');
    return this.prisma.booking.findMany({
      where: { classSchedule: { startAt: { gte: fromAt, lt: toAt } } },
      include: adminAttendanceInclude,
      orderBy: { classSchedule: { startAt: 'asc' } }, take: 1000,
    });
  }

  async updateByAdmin(bookingId: string, input: UpdateAttendanceDto, adminId: string) {
    if (input.status === AttendanceStatus.CANCELLED) {
      throw new BadRequestException('Use the booking cancellation workflow to cancel a booking.');
    }

    const bookingStatusByAttendance: Record<Exclude<AttendanceStatus, 'CANCELLED'>, BookingStatus> = {
      [AttendanceStatus.CHECKED_IN]: BookingStatus.CHECKED_IN,
      [AttendanceStatus.ATTENDED]: BookingStatus.ATTENDED,
      [AttendanceStatus.NO_SHOW]: BookingStatus.NO_SHOW,
    };
    const bookingStatus = bookingStatusByAttendance[input.status];
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Read and validate the booking in the same transaction as attendance updates to avoid
      // racing with a concurrent cancellation or class-cancellation workflow.
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: adminAttendanceInclude });
      if (!booking) throw new NotFoundException('Booking was not found.');
      if (booking.status === BookingStatus.CANCELLED) {
        throw new ConflictException('Attendance cannot be recorded for a cancelled booking.');
      }

      const updated = await tx.attendance.upsert({
        where: { bookingId },
        create: {
          traineeId: booking.traineeId,
          bookingId,
          classScheduleId: booking.classScheduleId,
          status: input.status,
          checkedInAt: input.status === AttendanceStatus.CHECKED_IN ? now : null,
          attendedAt: input.status === AttendanceStatus.ATTENDED ? now : null,
          notes: input.notes?.trim() || null,
        },
        update: {
          status: input.status,
          // Keep timestamps semantically accurate when an admin corrects an attendance state.
          checkedInAt: input.status === AttendanceStatus.CHECKED_IN
            ? booking.attendance?.checkedInAt ?? now
            : input.status === AttendanceStatus.ATTENDED
              ? booking.attendance?.checkedInAt ?? null
              : null,
          attendedAt: input.status === AttendanceStatus.ATTENDED ? now : null,
          notes: input.notes?.trim() || null,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { status: bookingStatus } });
      await tx.auditLog.create({
        data: {
          adminUserId: adminId,
          traineeId: booking.traineeId,
          action: 'ATTENDANCE_UPDATED',
          entityType: 'Attendance',
          entityId: updated.id,
          details: JSON.stringify({ status: input.status, notes: input.notes }),
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async checkInFromLine(bookingId: string, lineUserId: string) {
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { id: bookingId, trainee: { lineAccounts: { some: { lineUserId, status: 'active' } } } },
          include: { classSchedule: true, trainee: true, attendance: true },
        });
        if (!booking) throw new NotFoundException('No booking was found for this LINE account.');
        if (booking.trainee.memberStatus !== MemberStatus.ACTIVE) throw new BadRequestException('Your membership is not active. Please contact the admin.');
        if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) throw new ConflictException('This booking is no longer eligible for check-in.');
        if (booking.attendance?.checkedInAt) return { attendance: booking.attendance, alreadyCheckedIn: true };
        if (booking.status !== BookingStatus.BOOKED && booking.status !== BookingStatus.CHECKED_IN) {
          throw new ConflictException('This booking is not in a check-in eligible state.');
        }

        if (!isWithinCheckInWindow(booking.classSchedule.startAt, now)) {
          throw new BadRequestException('Check-in is available from 30 minutes before to 15 minutes after the class starts.');
        }

        const attendance = await tx.attendance.create({
          data: { traineeId: booking.traineeId, bookingId, classScheduleId: booking.classScheduleId, status: AttendanceStatus.CHECKED_IN, checkedInAt: now },
        });
        await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CHECKED_IN } });
        return { attendance, alreadyCheckedIn: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.attendance.findUnique({ where: { bookingId } });
        if (existing?.checkedInAt) return { attendance: existing, alreadyCheckedIn: true };
      }
      throw error;
    }
  }
}
