import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma.service.js';
import { RatesService } from '../rates/rates.service.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, RatesService],
  exports: [OrdersService],
})
export class OrdersModule {}
