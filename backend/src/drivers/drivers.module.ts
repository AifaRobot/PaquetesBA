import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [DriversController],
  providers: [DriversService, PrismaService],
  exports: [DriversService],
})
export class DriversModule {}
