import { Module } from '@nestjs/common';
import { RatesController } from './rates.controller.js';
import { RatesService } from './rates.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [RatesController],
  providers: [RatesService, PrismaService],
  exports: [RatesService],
})
export class RatesModule {}
