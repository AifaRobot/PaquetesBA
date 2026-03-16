import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':orderId')
  getOrderLocation(@Param('orderId') orderId: string) {
    return this.trackingService.getOrderLocation(orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('drivers/fleet')
  getFleet() {
    return this.trackingService.getFleetLocations();
  }
}
