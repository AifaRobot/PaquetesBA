import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/pagination.js';

@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: PaginationQueryDto & { zoneId?: string }) {
    return this.driversService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('available')
  findAvailable(@Query('zoneId') zoneId?: string) {
    return this.driversService.findAvailable(zoneId);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Get('me/profile')
  getProfile(@CurrentUser() user: any) {
    return this.driversService.getProfile(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Get('me/stats')
  getStats(@CurrentUser() user: any) {
    return this.driversService.getStats(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Patch('me/profile')
  updateProfile(@CurrentUser() user: any, @Body() data: any) {
    return this.driversService.updateProfile(user.sub, data);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Post('me/online')
  goOnline(@CurrentUser() user: any) {
    return this.driversService.setOnline(user.sub, true);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Post('me/offline')
  goOffline(@CurrentUser() user: any) {
    return this.driversService.setOnline(user.sub, false);
  }

  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @Patch('me/location')
  updateLocation(@CurrentUser() user: any, @Body() body: { lat: number; lng: number }) {
    return this.driversService.updateLocation(user.sub, body.lat, body.lng);
  }
}
