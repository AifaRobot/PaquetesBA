import { Module } from '@nestjs/common';
import { ZonesController } from './zones.controller.js';
import { ZonesService } from './zones.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [ZonesController],
  providers: [ZonesService, PrismaService],
  exports: [ZonesService],
})
export class ZonesModule {}
