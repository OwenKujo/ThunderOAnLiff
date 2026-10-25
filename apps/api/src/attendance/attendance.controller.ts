import { Controller, Get, Param, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminAuthGuard, AdminPrincipal } from '../common/auth/admin-auth.guard';
import { AttendanceService } from './attendance.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('attendance')
@Controller('admin/attendance')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get() list(@Query('from') from?: string, @Query('to') to?: string) { return this.attendance.list(from, to); }
  @Patch(':bookingId') update(@Param('bookingId') bookingId: string, @Body() input: UpdateAttendanceDto, @Req() req: AdminRequest) {
    return this.attendance.updateByAdmin(bookingId, input, req.admin!.id);
  }
}
