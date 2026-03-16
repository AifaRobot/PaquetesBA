import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('summary')
  getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('orders-by-status')
  getOrdersByStatus() {
    return this.reportsService.getOrdersByStatus();
  }

  @Get('deliveries')
  getDeliveries(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getDeliveriesOverTime(from, to);
  }

  @Get('drivers')
  getDrivers() {
    return this.reportsService.getDriverPerformance();
  }
}
