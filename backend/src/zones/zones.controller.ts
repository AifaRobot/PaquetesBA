import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('zones')
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() data: any) {
    return this.zonesService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.zonesService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.zonesService.deactivate(id);
  }
}
