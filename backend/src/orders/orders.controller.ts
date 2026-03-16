import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { uploadImageBuffer } from '../common/cloudinary.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('track/:trackingCode')
  trackPublic(@Param('trackingCode') code: string) {
    return this.ordersService.findByTrackingCode(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: any) {
    return this.ordersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationQueryDto & { status?: string; zoneId?: string }) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body('driverId') driverId: string) {
    return this.ordersService.assignDriver(id, driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.ordersService.acceptOrder(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; lat?: number; lng?: number; notes?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.lat, body.lng, body.notes);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @Post(':id/deliver')
  async confirmDelivery(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    let signatureUrl: string | undefined;
    let proofPhotoUrl: string | undefined;

    const parts = (req as any).parts() as AsyncIterable<any>;
    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer: Buffer = await part.toBuffer();
        if (part.fieldname === 'signature') {
          const result = await uploadImageBuffer(buffer, `sig-${id}`, 'signatures');
          signatureUrl = result.url;
        } else if (part.fieldname === 'proofPhoto') {
          const result = await uploadImageBuffer(buffer, `proof-${id}`, 'proofs');
          proofPhotoUrl = result.url;
        }
      }
    }

    if (!signatureUrl) throw new BadRequestException('Firma requerida');
    return this.ordersService.confirmDelivery(id, signatureUrl, proofPhotoUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Post(':id/rate')
  rate(@Param('id') id: string, @Body() body: { rating: number; review?: string }) {
    return this.ordersService.rateOrder(id, body.rating, body.review);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }
}
