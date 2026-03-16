import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller.js';
import { TrackingGateway } from './tracking.gateway.js';
import { TrackingService } from './tracking.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService, PrismaService],
  exports: [TrackingGateway],
})
export class TrackingModule {}
