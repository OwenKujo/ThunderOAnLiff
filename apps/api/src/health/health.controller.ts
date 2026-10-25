import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  getLiveness() {
    return { ok: true, service: 'thunder-oan-liff-api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (includes database connectivity)' })
  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, database: 'connected', timestamp: new Date().toISOString() };
  }
}
