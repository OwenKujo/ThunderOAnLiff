import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { MemberStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import { LinkAccountDto } from './dto/link-account.dto';

const traineeSelect = {
  id: true, firstName: true, lastName: true, phone: true, email: true,
  lineUserId: true, memberStatus: true, createdAt: true, updatedAt: true,
  lineAccounts: { select: { id: true, displayName: true, pictureUrl: true, status: true, createdAt: true } },
  packageEntitlements: {
    where: { isActive: true },
    include: { package: { select: { id: true, name: true, type: true, sessionCount: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.TraineeSelect;

@Injectable()
export class TraineesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string, status?: MemberStatus) {
    const q = search?.trim();
    const where: Prisma.TraineeWhereInput = {
      ...(status ? { memberStatus: status } : {}),
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    };
    return this.prisma.trainee.findMany({
      where,
      select: traineeSelect,
      orderBy: [{ createdAt: 'desc' }],
      take: 250,
    });
  }

  async create(input: CreateTraineeDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const trainee = await tx.trainee.create({
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim().toLowerCase() || null,
          memberStatus: MemberStatus.PENDING,
        },
        select: traineeSelect,
      });
      await tx.auditLog.create({ data: { adminUserId: adminId, traineeId: trainee.id, action: 'TRAINEE_CREATED', entityType: 'Trainee', entityId: trainee.id } });
      return trainee;
    });
  }

  async getById(id: string) {
    const trainee = await this.prisma.trainee.findUnique({ where: { id }, select: traineeSelect });
    if (!trainee) throw new NotFoundException('Trainee was not found.');
    return trainee;
  }

  async update(id: string, input: UpdateTraineeDto, adminId?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await tx.trainee.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new NotFoundException('Trainee was not found.');
        const trainee = await tx.trainee.update({
          where: { id },
          data: {
            ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
            ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
            ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
            ...(input.email !== undefined ? { email: input.email?.trim().toLowerCase() || null } : {}),
            ...(input.memberStatus !== undefined ? { memberStatus: input.memberStatus } : {}),
          },
          select: traineeSelect,
        });
        await tx.auditLog.create({
          data: { adminUserId: adminId, traineeId: id, action: 'TRAINEE_UPDATED', entityType: 'Trainee', entityId: id, details: JSON.stringify(input) },
        });
        return trainee;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A trainee with that email already exists.');
      }
      throw error;
    }
  }

  async createLinkCode(traineeId: string, adminId: string) {
    await this.getById(traineeId);
    const code = randomBytes(8).toString('hex').toUpperCase();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.traineeLinkCode.updateMany({
        where: { traineeId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.traineeLinkCode.create({
        data: { traineeId, codeHash, expiresAt, createdByAdminId: adminId },
      });
      await tx.auditLog.create({
        data: { adminUserId: adminId, traineeId, action: 'LINE_LINK_CODE_CREATED', entityType: 'Trainee', entityId: traineeId },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    // The clear-text code is intentionally returned once and never persisted.
    return { code, expiresAt, traineeId };
  }

  async linkCurrentLineAccount(lineUserId: string, input: LinkAccountDto) {
    const codeHash = createHash('sha256').update(input.code.toUpperCase()).digest('hex');
    const linkCode = await this.prisma.traineeLinkCode.findUnique({ where: { codeHash } });
    if (!linkCode || linkCode.consumedAt || linkCode.expiresAt <= new Date()) {
      throw new BadRequestException('This linking code is invalid, expired, or already used. Request a new code from the admin.');
    }
    const accountOwner = await this.prisma.lineAccount.findUnique({ where: { lineUserId } });
    if (accountOwner && accountOwner.traineeId !== linkCode.traineeId) {
      throw new ConflictException('This LINE account is already linked to another member.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ownerInTransaction = await tx.lineAccount.findUnique({ where: { lineUserId } });
        if (ownerInTransaction && ownerInTransaction.traineeId !== linkCode.traineeId) {
          throw new ConflictException('This LINE account is already linked to another member.');
        }
        const claim = await tx.traineeLinkCode.updateMany({
          where: { id: linkCode.id, consumedAt: null, expiresAt: { gt: new Date() } },
          data: { consumedAt: new Date() },
        });
        if (claim.count !== 1) throw new ConflictException('This linking code has already been used.');
        await tx.lineAccount.upsert({
          where: { lineUserId },
          create: {
            traineeId: linkCode.traineeId,
            lineUserId,
            displayName: input.displayName,
            pictureUrl: input.pictureUrl,
          },
          update: {
            displayName: input.displayName,
            pictureUrl: input.pictureUrl,
            status: 'active',
          },
        });
        await tx.trainee.update({
          where: { id: linkCode.traineeId },
          data: { lineUserId },
        });
        await tx.auditLog.create({ data: { traineeId: linkCode.traineeId, action: 'LINE_ACCOUNT_LINKED', entityType: 'LineAccount', details: JSON.stringify({ linked: true }) } });
        return tx.trainee.findUniqueOrThrow({ where: { id: linkCode.traineeId }, select: traineeSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This LINE account is already linked to another member.');
      }
      throw error;
    }
  }

  async findCurrentByLineId(lineUserId: string) {
    const account = await this.prisma.lineAccount.findFirst({
      where: { lineUserId, status: 'active' },
      include: { trainee: { select: traineeSelect } },
    });
    if (!account) throw new NotFoundException('LINE_ACCOUNT_NOT_LINKED');
    return account.trainee;
  }
}
