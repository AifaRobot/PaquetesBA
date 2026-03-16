import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma.service.js';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'changeme',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
