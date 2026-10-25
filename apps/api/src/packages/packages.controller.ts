import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, AdminPrincipal } from '../common/auth/admin-auth.guard';
import { Request } from 'express';
import { CreatePackageDto } from './dto/create-package.dto';
import { PackagesService } from './packages.service';

type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('packages')
@Controller()
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get('packages') listActive(@Query('activeOnly') activeOnly?: string) {
    return this.packages.list(activeOnly !== 'false');
  }

  @Get('admin/packages') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  listAdmin() { return this.packages.list(false, true); }

  @Post('admin/packages') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  create(@Body() input: CreatePackageDto, @Req() req: AdminRequest) { return this.packages.create(input, req.admin!.id); }

  @Patch('admin/packages/:id') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() input: Partial<CreatePackageDto>, @Req() req: AdminRequest) { return this.packages.update(id, input, req.admin!.id); }
}
