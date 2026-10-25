import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
@Module({ imports: [PrismaModule, SecurityModule], controllers: [AttendanceController], providers: [AttendanceService], exports: [AttendanceService] })
export class AttendanceModule {}
