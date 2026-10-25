import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';

@ApiTags('trainers')
@Controller()
export class TrainersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('trainers')
  listActive() { return this.prisma.trainer.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }); }

  @Get('admin/trainers') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  listAll() { return this.prisma.trainer.findMany({ orderBy: { name: 'asc' } }); }

  @Post('admin/trainers') @UseGuards(AdminAuthGuard) @ApiBearerAuth()
  create(@Body() input: CreateTrainerDto) {
    return this.prisma.trainer.create({ data: { name: input.name.trim(), specialty: input.specialty?.trim() || null, isActive: input.isActive ?? true } });
  }
}
