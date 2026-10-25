import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import type { AdminPrincipal } from '../common/auth/admin-auth.guard';
import { LineAuthGuard } from '../common/auth/line-auth.guard';
import type { LineAuthenticatedRequest } from '../common/auth/line-auth.guard';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { TraineesService } from './trainees.service';
import type { Request } from 'express';

type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('trainees')
@Controller()
export class TraineesController {
  constructor(private readonly trainees: TraineesService) {}

  @Get('admin/trainees')
  @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  list(@Query('search') search?: string, @Query('status') status?: MemberStatus) {
    return this.trainees.list(search, status);
  }

  @Post('admin/trainees')
  @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a trainee profile' })
  create(@Body() input: CreateTraineeDto, @Req() req: AdminRequest) { return this.trainees.create(input, req.admin!.id); }

  @Get('admin/trainees/:id')
  @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  getById(@Param('id') id: string) { return this.trainees.getById(id); }

  @Patch('admin/trainees/:id')
  @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() input: UpdateTraineeDto, @Req() req: AdminRequest) {
    return this.trainees.update(id, input, req.admin?.id);
  }

  @Post('admin/trainees/:id/link-code')
  @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  createLinkCode(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.trainees.createLinkCode(id, req.admin!.id);
  }

  @Get('trainee/me')
  @UseGuards(LineAuthGuard) @ApiBearerAuth()
  getCurrent(@Req() req: LineAuthenticatedRequest) { return this.trainees.findCurrentByLineId(req.lineUserId!); }

  @Post('trainee/link-account')
  @UseGuards(LineAuthGuard) @ApiBearerAuth()
  linkAccount(@Req() req: LineAuthenticatedRequest, @Body() input: LinkAccountDto) {
    return this.trainees.linkCurrentLineAccount(req.lineUserId!, input);
  }
}
