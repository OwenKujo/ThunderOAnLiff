import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { LineModule } from '../line/line.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
@Module({ imports: [PrismaModule, SecurityModule, LineModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
