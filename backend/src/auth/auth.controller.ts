import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterDriverDto } from './dto/register-driver.dto.js';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/client')
  registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('register/driver')
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.authService.registerDriver(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('[LOGIN] dto recibido:', JSON.stringify(dto));
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('fcm-token')
  updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.authService.updateFcmToken(user.sub, dto.fcmToken);
  }
}
