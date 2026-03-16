import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersQueryDto } from './dto/users-query.dto.js';
import { CreateAddressDto } from './dto/create-address.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.usersService.updateStatus(id, status);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser() user: any) {
    return this.usersService.getAddresses(user.sub);
  }

  @Patch('me/addresses')
  createAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.sub, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.sub, id);
  }
}
