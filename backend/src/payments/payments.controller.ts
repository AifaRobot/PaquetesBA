import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  webhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getByOrderId(orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @Post(':orderId/cash')
  confirmCash(@Param('orderId') orderId: string, @Body('amount') amount: number) {
    return this.paymentsService.createCashPayment(orderId, amount);
  }
}
