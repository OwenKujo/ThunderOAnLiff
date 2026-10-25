import { Injectable } from '@nestjs/common';
import { BookingStatus, MemberStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function bangkokDayRange(now = new Date()) {
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate()) - 7 * 60 * 60 * 1000;
  return { start: new Date(midnightUtc), end: new Date(midnightUtc + 24 * 60 * 60 * 1000) };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async adminDashboard() {
    const { start, end } = bangkokDayRange();
    const now = new Date();
    const nearExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [activeMembers, todayClasses, bookedSeats, pendingPayments, packagesNearExpiry, todayBookings, todayCheckIns] = await Promise.all([
      this.prisma.trainee.count({ where: { memberStatus: MemberStatus.ACTIVE } }),
      this.prisma.classSchedule.count({ where: { startAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.count({ where: { classSchedule: { startAt: { gte: start, lt: end } }, status: { in: [BookingStatus.BOOKED, BookingStatus.CHECKED_IN, BookingStatus.ATTENDED, BookingStatus.COMPLETED] } } }),
      this.prisma.paymentRecord.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.packageEntitlement.count({ where: { isActive: true, endDate: { gt: now, lte: nearExpiry } } }),
      this.prisma.booking.findMany({
        where: { classSchedule: { startAt: { gte: start, lt: end } } },
        include: { trainee: { select: { firstName: true, lastName: true } }, classSchedule: { include: { trainer: { select: { name: true } } } }, attendance: true },
        orderBy: { classSchedule: { startAt: 'asc' } }, take: 100,
      }),
      this.prisma.attendance.count({ where: { checkedInAt: { gte: start, lt: end } } }),
    ]);
    return {
      activeMembers, todayClasses, bookedSeats, pendingPayments, packagesNearExpiry, todayCheckIns,
      todayBookings: todayBookings.map((b) => ({
        bookingId: b.id, traineeName: `${b.trainee.firstName} ${b.trainee.lastName}`,
        className: b.classSchedule.title, trainer: b.classSchedule.trainer.name,
        startAt: b.classSchedule.startAt, status: b.status, checkedInAt: b.attendance?.checkedInAt ?? null,
      })),
    };
  }

  async traineeDashboard(lineUserId: string) {
    const account = await this.prisma.lineAccount.findFirst({ where: { lineUserId, status: 'active' }, include: { trainee: true } });
    if (!account) return { linked: false };
    const trainee = account.trainee;
    const now = new Date();
    const [entitlement, upcomingBookings, totalAttendances, attendedCount] = await Promise.all([
      this.prisma.packageEntitlement.findFirst({
        where: { traineeId: trainee.id, isActive: true, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
        include: { package: { select: { name: true, type: true } } },
        orderBy: [{ endDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: { traineeId: trainee.id, status: { in: [BookingStatus.BOOKED, BookingStatus.CHECKED_IN] }, classSchedule: { startAt: { gte: now } } },
        include: { classSchedule: { include: { trainer: { select: { name: true } } } }, attendance: true },
        orderBy: { classSchedule: { startAt: 'asc' } }, take: 10,
      }),
      this.prisma.attendance.count({ where: { traineeId: trainee.id, status: { in: ['ATTENDED', 'NO_SHOW'] } } }),
      this.prisma.attendance.count({ where: { traineeId: trainee.id, status: 'ATTENDED' } }),
    ]);
    return {
      linked: true,
      trainee: { id: trainee.id, name: `${trainee.firstName} ${trainee.lastName}`, memberStatus: trainee.memberStatus },
      package: entitlement ? { id: entitlement.id, name: entitlement.package.name, type: entitlement.package.type, remainingSessions: entitlement.remainingSessions, startDate: entitlement.startDate, endDate: entitlement.endDate } : null,
      upcomingBookings: upcomingBookings.map((booking) => ({
        id: booking.id, classScheduleId: booking.classScheduleId, className: booking.classSchedule.title,
        startAt: booking.classSchedule.startAt, endAt: booking.classSchedule.endAt,
        trainer: booking.classSchedule.trainer.name, location: booking.classSchedule.location,
        status: booking.status, checkedInAt: booking.attendance?.checkedInAt ?? null,
      })),
      attendanceRate: totalAttendances ? Math.round((attendedCount / totalAttendances) * 100) : null,
    };
  }
}
