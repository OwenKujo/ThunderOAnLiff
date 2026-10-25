import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import type { Request } from 'express';
import { AdminAuthGuard } from '../common/auth/admin-auth.guard';
import type { AdminPrincipal } from '../common/auth/admin-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
type AdminRequest = Request & { admin?: AdminPrincipal };

@ApiTags('payments')
@Controller('admin/payments')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get() list(@Query('status') status?: PaymentStatus) { return this.payments.list(status); }
  @Post() create(@Body() input: CreatePaymentDto, @Req() req: AdminRequest) { return this.payments.create(input, req.admin!.id); }
  @Patch(':id/mark-paid') markPaid(@Param('id') id: string, @Req() req: AdminRequest) { return this.payments.markPaid(id, req.admin!.id); }
}
