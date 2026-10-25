import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, BookingStatus, ClassStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { CreateClassDto } from './dto/create-class.dto';
import { SEAT_OCCUPYING_BOOKING_STATUSES } from '../bookings/booking-policy';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService, private readonly messaging: LineMessagingService) {}

  async list(from?: string, to?: string, includeClosed = false) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate >= toDate) {
      throw new BadRequestException('The class date range is invalid.');
    }
    const classes = await this.prisma.classSchedule.findMany({
      where: { startAt: { gte: fromDate, lt: toDate }, ...(includeClosed ? {} : { status: ClassStatus.OPEN }) },
      include: {
        trainer: { select: { id: true, name: true, specialty: true } },
        _count: { select: { bookings: { where: { status: { in: [...SEAT_OCCUPYING_BOOKING_STATUSES] } } } } },
      },
      orderBy: { startAt: 'asc' },
      take: 500,
    });
    return classes.map((item) => ({ ...item, bookedCount: item._count.bookings, spotsRemaining: Math.max(0, item.capacity - item._count.bookings) }));
  }

  async create(input: CreateClassDto, adminId: string) {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (startAt <= new Date() || endAt <= startAt) {
      throw new BadRequestException('Class end time must be after start time and the class must be in the future.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const trainer = await tx.trainer.findFirst({ where: { id: input.trainerId, isActive: true } });
        if (!trainer) throw new BadRequestException('The selected trainer is not active.');
        const overlap = await tx.classSchedule.findFirst({
          where: { trainerId: input.trainerId, status: { not: ClassStatus.CANCELLED }, startAt: { lt: endAt }, endAt: { gt: startAt } },
        });
        if (overlap) throw new BadRequestException('The trainer already has a class scheduled during this time.');
        const created = await tx.classSchedule.create({
          data: { title: input.title.trim(), trainerId: input.trainerId, startAt, endAt, capacity: input.capacity, location: input.location?.trim() || null, notes: input.notes?.trim() || null },
          include: { trainer: { select: { id: true, name: true } } },
        });
        await tx.auditLog.create({
          data: { adminUserId: adminId, action: 'CLASS_CREATED', entityType: 'ClassSchedule', entityId: created.id, details: JSON.stringify({ title: created.title, trainerId: created.trainerId, startAt: created.startAt.toISOString(), endAt: created.endAt.toISOString(), capacity: created.capacity }) },
        });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException('The trainer schedule changed while saving. Refresh the schedule and try again.');
      }
      throw error;
    }
  }

  async close(id: string, cancel: boolean, adminId: string) {
    const klass = await this.prisma.classSchedule.findUnique({ where: { id } });
    if (!klass) throw new NotFoundException('Class was not found.');
    if (klass.startAt <= new Date()) throw new BadRequestException('A class that has already started cannot be closed from this screen.');
    if (cancel && klass.status === ClassStatus.CANCELLED) {
      return { id, status: ClassStatus.CANCELLED, cancelledBookings: 0, alreadyCancelled: true };
    }
    if (!cancel) {
      return this.prisma.$transaction(async (tx) => {
        const current = await tx.classSchedule.findUniqueOrThrow({ where: { id } });
        if (current.startAt <= new Date()) throw new BadRequestException('A class that has already started cannot be closed from this screen.');
        const updated = await tx.classSchedule.update({ where: { id }, data: { status: ClassStatus.CLOSED } });
        await tx.auditLog.create({ data: { adminUserId: adminId, action: 'CLASS_CLOSED', entityType: 'ClassSchedule', entityId: id } });
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    const cancelledBookings = await this.prisma.$transaction(async (tx) => {
      const current = await tx.classSchedule.findUniqueOrThrow({ where: { id } });
      if (current.startAt <= new Date()) throw new BadRequestException('A class that has already started cannot be cancelled from this screen.');
      await tx.classSchedule.update({ where: { id }, data: { status: ClassStatus.CANCELLED } });
      const bookings = await tx.booking.findMany({
        where: { classScheduleId: id, status: { in: [BookingStatus.BOOKED, BookingStatus.CHECKED_IN] } },
        include: { entitlement: true, attendance: true },
      });
      const results: Array<{ id: string; traineeId: string }> = [];
      for (const booking of bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Class cancelled by studio' },
        });
        if (booking.attendance) {
          await tx.attendance.update({ where: { bookingId: booking.id }, data: { status: AttendanceStatus.CANCELLED } });
        }
        if (booking.entitlement?.remainingSessions !== null && booking.entitlement?.remainingSessions !== undefined) {
          const entitlement = await tx.packageEntitlement.update({
            where: { id: booking.entitlement.id }, data: { remainingSessions: { increment: 1 } },
          });
          await tx.creditLedger.create({
            data: {
              traineeId: booking.traineeId, entitlementId: booking.entitlement.id, bookingId: booking.id,
              amount: 1, balanceAfter: entitlement.remainingSessions!, reason: 'STUDIO_CANCELLED_REFUND',
              idempotencyKey: `booking:${booking.id}:studio-cancel-refund`,
            },
          });
        }
        results.push({ id: booking.id, traineeId: booking.traineeId });
      }
      await tx.auditLog.create({ data: { adminUserId: adminId, action: 'CLASS_CANCELLED', entityType: 'ClassSchedule', entityId: id, details: JSON.stringify({ cancelledBookings: results.length }) } });
      return results;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });

    for (const booking of cancelledBookings) {
      await this.messaging.sendTextToTrainee({
        traineeId: booking.traineeId, bookingId: booking.id, type: NotificationType.BOOKING_CANCELLATION,
        message: `คลาส ${klass.title} ถูกยกเลิกโดยสตูดิโอ ระบบคืนสิทธิ์การจองให้แล้ว กรุณาตรวจสอบตารางคลาสใน LIFF`,
      });
    }
    return { id, status: ClassStatus.CANCELLED, cancelledBookings: cancelledBookings.length, alreadyCancelled: false };
  }
}
