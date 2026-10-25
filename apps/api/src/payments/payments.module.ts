import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
@Module({ imports: [PrismaModule, SecurityModule], controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
