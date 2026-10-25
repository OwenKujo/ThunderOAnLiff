import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { LineModule } from '../line/line.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsService } from './bookings.service';

@Module({ imports: [PrismaModule, SecurityModule, LineModule], controllers: [BookingsController, AdminBookingsController], providers: [BookingsService], exports: [BookingsService] })
export class BookingsModule {}
