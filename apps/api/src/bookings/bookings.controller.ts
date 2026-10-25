import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LineAuthGuard } from '../common/auth/line-auth.guard';
import type { LineAuthenticatedRequest } from '../common/auth/line-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('trainee bookings')
@Controller('trainee/bookings')
@UseGuards(LineAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get() list(@Req() request: LineAuthenticatedRequest) { return this.bookings.listForTrainee(request.lineUserId!); }
  @Post() create(@Req() request: LineAuthenticatedRequest, @Body() input: CreateBookingDto) {
    return this.bookings.createForTrainee(request.lineUserId!, input);
  }
  @Post(':id/cancel') cancel(@Req() request: LineAuthenticatedRequest, @Param('id') id: string, @Body() input: CancelBookingDto) {
    return this.bookings.cancelForTrainee(request.lineUserId!, id, input);
  }
}
