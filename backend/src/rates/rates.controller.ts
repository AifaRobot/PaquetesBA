import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('rates')
export class RatesController {
  constructor(private ratesService: RatesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.ratesService.findAll();
  }

  @Get('estimate')
  estimate(
    @Query('zoneId') zoneId: string,
    @Query('packageSize') packageSize: string,
    @Query('packageType') packageType: string,
    @Query('distanceKm') distanceKm: string,
  ) {
    return this.ratesService.estimate(zoneId, packageSize, packageType, parseFloat(distanceKm));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() data: any) {
    return this.ratesService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.ratesService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ratesService.remove(id);
  }
}
