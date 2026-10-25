import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import { LineAuthGuard } from '../common/auth/line-auth.guard';
import type { LineAuthenticatedRequest } from '../common/auth/line-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('admin/dashboard') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  admin() { return this.dashboard.adminDashboard(); }

  @Get('trainee/dashboard') @UseGuards(LineAuthGuard) @ApiBearerAuth()
  trainee(@Req() req: LineAuthenticatedRequest) { return this.dashboard.traineeDashboard(req.lineUserId!); }
}
