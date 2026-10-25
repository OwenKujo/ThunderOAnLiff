import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PackageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false, includeCounts = false) {
    return this.prisma.package.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      ...(includeCounts ? { include: { _count: { select: { entitlements: true, payments: true } } } } : {}),
    });
  }

  async create(input: CreatePackageDto, adminId: string) {
    this.validatePackageRules(input.type, input.sessionCount, input.durationDays);
    return this.prisma.$transaction(async (tx) => {
      const pkg = await tx.package.create({
        data: {
          name: input.name.trim(), type: input.type, priceCents: input.priceCents,
          sessionCount: input.sessionCount ?? null, durationDays: input.durationDays ?? null,
          description: input.description?.trim() || null, isActive: input.isActive ?? true,
        },
      });
      await tx.auditLog.create({ data: { adminUserId: adminId, action: 'PACKAGE_CREATED', entityType: 'Package', entityId: pkg.id, details: JSON.stringify({ name: pkg.name, type: pkg.type, priceCents: pkg.priceCents }) } });
      return pkg;
    });
  }

  async update(id: string, input: Partial<CreatePackageDto>, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.package.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Package was not found.');
      const nextType = input.type ?? current.type;
      const nextSessions = input.sessionCount !== undefined ? input.sessionCount : current.sessionCount;
      const nextDuration = input.durationDays !== undefined ? input.durationDays : current.durationDays;
      this.validatePackageRules(nextType, nextSessions, nextDuration);
      const pkg = await tx.package.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
          ...(input.sessionCount !== undefined ? { sessionCount: input.sessionCount } : {}),
          ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
      await tx.auditLog.create({ data: { adminUserId: adminId, action: 'PACKAGE_UPDATED', entityType: 'Package', entityId: pkg.id, details: JSON.stringify(input) } });
      return pkg;
    });
  }

  private validatePackageRules(type: PackageType, sessionCount?: number | null, durationDays?: number | null) {
    if (type === PackageType.MONTHLY_UNLIMITED && durationDays == null) {
      throw new BadRequestException('Monthly unlimited packages must define durationDays.');
    }
    if (type !== PackageType.MONTHLY_UNLIMITED && type !== PackageType.CUSTOM && sessionCount == null) {
      throw new BadRequestException('Session-based packages must define sessionCount.');
    }
  }
}
