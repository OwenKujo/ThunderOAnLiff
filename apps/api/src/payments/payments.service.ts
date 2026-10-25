import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: PaymentStatus) {
    return this.prisma.paymentRecord.findMany({
      where: status ? { status } : {},
      include: {
        trainee: { select: { id: true, firstName: true, lastName: true, phone: true } },
        package: { select: { id: true, name: true, type: true } },
        entitlement: { select: { id: true, startDate: true, endDate: true, remainingSessions: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 300,
    });
  }

  async create(input: CreatePaymentDto, adminId: string) {
    const [trainee, pkg] = await Promise.all([
      this.prisma.trainee.findUnique({ where: { id: input.traineeId } }),
      this.prisma.package.findFirst({ where: { id: input.packageId, isActive: true } }),
    ]);
    if (!trainee) throw new NotFoundException('Trainee was not found.');
    if (!pkg) throw new NotFoundException('Active package was not found.');
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.create({
        data: {
          traineeId: trainee.id, packageId: pkg.id, amountCents: input.amountCents,
          paymentMethod: input.paymentMethod.trim(), paymentReference: input.paymentReference?.trim() || null,
          notes: input.notes?.trim() || null, status: PaymentStatus.PENDING,
        },
        include: { trainee: true, package: true },
      });
      await tx.auditLog.create({
        data: { adminUserId: adminId, traineeId: trainee.id, action: 'PAYMENT_RECORDED', entityType: 'PaymentRecord', entityId: payment.id, details: JSON.stringify({ amountCents: input.amountCents, status: 'PENDING' }) },
      });
      return payment;
    });
  }

  async markPaid(id: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.findUnique({ where: { id }, include: { package: true, trainee: true, entitlement: true } });
      if (!payment) throw new NotFoundException('Payment record was not found.');
      if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.FAILED) {
        throw new BadRequestException(`A ${payment.status.toLowerCase()} payment cannot be marked as paid.`);
      }
      if (payment.status === PaymentStatus.PAID) return payment;
      if (!payment.package) throw new BadRequestException('Payment does not have a package attached.');

      const now = new Date();
      const endDate = payment.package.durationDays == null
        ? null
        : new Date(now.getTime() + payment.package.durationDays * 24 * 60 * 60 * 1000);
      const entitlement = await tx.packageEntitlement.create({
        data: {
          traineeId: payment.traineeId,
          packageId: payment.packageId!,
          startDate: now,
          endDate,
          remainingSessions: payment.package.sessionCount,
          isActive: true,
        },
      });
      const updatedPayment = await tx.paymentRecord.update({
        where: { id },
        data: { status: PaymentStatus.PAID, paidAt: now, entitlementId: entitlement.id },
        include: { trainee: true, package: true, entitlement: true },
      });
      if (payment.trainee.memberStatus === MemberStatus.PENDING || payment.trainee.memberStatus === MemberStatus.EXPIRED) {
        await tx.trainee.update({ where: { id: payment.traineeId }, data: { memberStatus: MemberStatus.ACTIVE } });
      }
      await tx.auditLog.create({
        data: { adminUserId: adminId, traineeId: payment.traineeId, action: 'PAYMENT_MARKED_PAID', entityType: 'PaymentRecord', entityId: id },
      });
      return updatedPayment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
