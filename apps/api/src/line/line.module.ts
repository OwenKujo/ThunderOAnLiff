import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineIdentityService } from './line-identity.service';
import { LineAuthGuard } from '../common/auth/line-auth.guard';
import { LineMessagingService } from './line-messaging.service';
import { LineWebhookController } from './line-webhook.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { SecurityModule } from '../common/security.module';

@Module({
  imports: [PrismaModule, AttendanceModule, SecurityModule],
  controllers: [LineWebhookController],
  providers: [LineIdentityService, LineMessagingService, LineAuthGuard],
  exports: [LineIdentityService, LineMessagingService, LineAuthGuard],
})
export class LineModule {}
