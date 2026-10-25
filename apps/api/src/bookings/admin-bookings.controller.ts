import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import type { AdminPrincipal } from '../common/auth/admin-auth.guard';
import { CreateAdminBookingDto } from './dto/create-admin-booking.dto';
import { BookingsService } from './bookings.service';

type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('admin bookings')
@Controller('admin/bookings')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Manually enroll an active trainee in a class from the Admin Web' })
  create(@Body() input: CreateAdminBookingDto, @Req() request: AdminRequest) {
    const { traineeId, ...bookingInput } = input;
    return this.bookings.createForAdmin(traineeId, bookingInput, request.admin!.id);
  }
}
