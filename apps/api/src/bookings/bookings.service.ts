import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, ClassStatus, MemberStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { isCancellationAllowed, SEAT_OCCUPYING_BOOKING_STATUSES } from './booking-policy';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService, private readonly messaging: LineMessagingService) {}

  async listForTrainee(lineUserId: string) {
    const trainee = await this.getTraineeByLineId(lineUserId);
    return this.prisma.booking.findMany({
      where: { traineeId: trainee.id },
      include: {
        classSchedule: { include: { trainer: { select: { name: true } } } },
        entitlement: { include: { package: { select: { name: true, type: true } } } },
        attendance: true,
      },
      orderBy: { classSchedule: { startAt: 'desc' } }, take: 100,
    });
  }

  async createForTrainee(lineUserId: string, input: CreateBookingDto) {
    const account = await this.prisma.lineAccount.findFirst({
      where: { lineUserId, status: 'active' },
      select: { traineeId: true },
    });
    if (!account) throw new NotFoundException('LINE_ACCOUNT_NOT_LINKED');
    return this.createBookingForTrainee(account.traineeId, input, { lineUserId });
  }

  async createForAdmin(traineeId: string, input: CreateBookingDto, adminId: string) {
    return this.createBookingForTrainee(traineeId, input, { adminId });
  }

  private async createBookingForTrainee(
    traineeId: string,
    input: CreateBookingDto,
    context: { lineUserId?: string; adminId?: string },
  ) {
    const booking = await this.prisma.$transaction(async (tx) => {
      const traineeWhere: Prisma.TraineeWhereInput = context.lineUserId
        ? { id: traineeId, lineAccounts: { some: { lineUserId: context.lineUserId, status: 'active' } } }
        : { id: traineeId };
      const trainee = await tx.trainee.findFirst({ where: traineeWhere });
      if (!trainee) {
        throw new NotFoundException(context.lineUserId ? 'LINE_ACCOUNT_NOT_LINKED' : 'Trainee was not found.');
      }
      if (trainee.memberStatus !== MemberStatus.ACTIVE) {
        throw new ForbiddenException('The trainee membership is not active. Contact the admin for help.');
      }

      const klass = await tx.classSchedule.findUnique({ where: { id: input.classScheduleId }, include: { trainer: true } });
      if (!klass) throw new NotFoundException('Class was not found.');
      if (klass.status !== ClassStatus.OPEN) throw new ConflictException('This class is not open for booking.');
      if (klass.startAt <= new Date()) throw new ConflictException('A class that has already started cannot be booked.');

      const duplicate = await tx.booking.findFirst({
        where: { traineeId: trainee.id, classScheduleId: klass.id, status: { in: [...SEAT_OCCUPYING_BOOKING_STATUSES] } },
      });
      if (duplicate) throw new ConflictException('This trainee already has a booking for the class.');

      const overlapping = await tx.booking.findFirst({
        where: {
          traineeId: trainee.id,
          status: { in: [...SEAT_OCCUPYING_BOOKING_STATUSES] },
          classSchedule: { startAt: { lt: klass.endAt }, endAt: { gt: klass.startAt } },
        },
      });
      if (overlapping) throw new ConflictException('This class overlaps with another booking in the trainee schedule.');

      const bookedCount = await tx.booking.count({ where: { classScheduleId: klass.id, status: { in: [...SEAT_OCCUPYING_BOOKING_STATUSES] } } });
      if (bookedCount >= klass.capacity) throw new ConflictException('This class is full. Please choose another time.');

      const now = new Date();
      const entitlements = await tx.packageEntitlement.findMany({
        where: {
          traineeId: trainee.id,
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        include: { package: true },
        orderBy: [{ endDate: 'asc' }, { createdAt: 'asc' }],
      });
      const selected = entitlements.find((candidate) => candidate.remainingSessions === null || (candidate.remainingSessions ?? 0) > 0);
      if (!selected) throw new ForbiddenException('This trainee has no active package with available sessions.');

      let remainingAfter: number | null = selected.remainingSessions;
      if (remainingAfter !== null) {
        const updated = await tx.packageEntitlement.updateMany({
          where: { id: selected.id, remainingSessions: { gt: 0 }, isActive: true },
          data: { remainingSessions: { decrement: 1 } },
        });
        if (updated.count !== 1) throw new ConflictException('The package balance changed. Refresh and try booking again.');
        remainingAfter -= 1;
      }

      const created = await tx.booking.create({
        data: { traineeId: trainee.id, classScheduleId: klass.id, entitlementId: selected.id },
        include: { classSchedule: { include: { trainer: { select: { name: true } } } }, entitlement: { include: { package: true } } },
      });
      if (remainingAfter !== null) {
        await tx.creditLedger.create({
          data: {
            traineeId: trainee.id,
            entitlementId: selected.id,
            bookingId: created.id,
            amount: -1,
            balanceAfter: remainingAfter,
            reason: context.adminId ? 'ADMIN_BOOKING_RESERVED' : 'BOOKING_RESERVED',
            idempotencyKey: `booking:${created.id}:reserve`,
          },
        });
      }
      if (context.adminId) {
        await tx.auditLog.create({
          data: {
            adminUserId: context.adminId,
            traineeId: trainee.id,
            action: 'BOOKING_CREATED_BY_ADMIN',
            entityType: 'Booking',
            entityId: created.id,
            details: JSON.stringify({ classScheduleId: klass.id, entitlementId: selected.id }),
          },
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('The class or package balance changed while booking. Refresh and try again.');
      }
      throw error;
    });

    await this.messaging.sendBookingConfirmationToTrainee({
      traineeId: booking.traineeId,
      bookingId: booking.id,
      classTitle: booking.classSchedule.title,
      startsAt: booking.classSchedule.startAt,
      trainerName: booking.classSchedule.trainer.name,
    });
    return booking;
  }

  async cancelForTrainee(lineUserId: string, bookingId: string, input: CancelBookingDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const trainee = await tx.trainee.findFirst({ where: { lineAccounts: { some: { lineUserId, status: 'active' } } } });
      if (!trainee) throw new NotFoundException('LINE_ACCOUNT_NOT_LINKED');
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, traineeId: trainee.id },
        include: { classSchedule: true, entitlement: { include: { package: true } } },
      });
      if (!booking) throw new NotFoundException('Booking was not found.');
      if (booking.status === BookingStatus.CANCELLED) return { booking, alreadyCancelled: true };
      if (booking.status !== BookingStatus.BOOKED) throw new ConflictException('Only a booking that has not checked in can be cancelled.');
      if (!isCancellationAllowed(booking.classSchedule.startAt)) {
        throw new BadRequestException('Bookings can only be cancelled at least 60 minutes before class starts.');
      }

      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: input.reason?.trim() || 'Cancelled by trainee' },
        include: { classSchedule: true, entitlement: { include: { package: true } } },
      });
      if (booking.entitlement?.remainingSessions !== null && booking.entitlement?.remainingSessions !== undefined) {
        const updatedEntitlement = await tx.packageEntitlement.update({
          where: { id: booking.entitlement.id }, data: { remainingSessions: { increment: 1 } },
        });
        await tx.creditLedger.create({
          data: { traineeId: trainee.id, entitlementId: booking.entitlement.id, bookingId: booking.id, amount: 1, balanceAfter: updatedEntitlement.remainingSessions!, reason: 'BOOKING_CANCELLED_REFUND', idempotencyKey: `booking:${booking.id}:cancel-refund` },
        });
      }
      return { booking: cancelled, alreadyCancelled: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('The booking changed while cancelling. Refresh and try again.');
      }
      throw error;
    });

    if (!result.alreadyCancelled) {
      await this.messaging.sendTextToTrainee({
        traineeId: result.booking.traineeId, bookingId: result.booking.id, type: NotificationType.BOOKING_CANCELLATION,
        message: `ยกเลิกการจอง ${result.booking.classSchedule.title} เรียบร้อยแล้ว`,
      });
    }
    return result.booking;
  }

  private async getTraineeByLineId(lineUserId: string) {
    const account = await this.prisma.lineAccount.findFirst({ where: { lineUserId, status: 'active' }, include: { trainee: true } });
    if (!account) throw new NotFoundException('LINE_ACCOUNT_NOT_LINKED');
    return account.trainee;
  }
}
