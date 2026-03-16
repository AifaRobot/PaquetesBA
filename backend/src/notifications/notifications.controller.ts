import { Controller, Get, Patch, Param, UseGuards, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.notificationsService.findAll(user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.sub);
  }
}
