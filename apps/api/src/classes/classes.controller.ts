import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import type { AdminPrincipal } from '../common/auth/admin-auth.guard';
import type { Request } from 'express';
import { CreateClassDto } from './dto/create-class.dto';
import { ClassesService } from './classes.service';

type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('classes')
@Controller()
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get('classes') listOpen(@Query('from') from?: string, @Query('to') to?: string) { return this.classes.list(from, to, false); }

  @Get('admin/classes') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  listAdmin(@Query('from') from?: string, @Query('to') to?: string) { return this.classes.list(from, to, true); }

  @Post('admin/classes') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  create(@Body() input: CreateClassDto, @Req() req: AdminRequest) { return this.classes.create(input, req.admin!.id); }

  @Patch('admin/classes/:id/close') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  close(@Param('id') id: string, @Req() req: AdminRequest) { return this.classes.close(id, false, req.admin!.id); }

  @Patch('admin/classes/:id/cancel') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  cancel(@Param('id') id: string, @Req() req: AdminRequest) { return this.classes.close(id, true, req.admin!.id); }
}
