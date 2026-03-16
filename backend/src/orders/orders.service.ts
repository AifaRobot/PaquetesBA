import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Scope,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma.service.js';
import { RatesService } from '../rates/rates.service.js';
import { prismaPaginate } from '../common/pagination.js';
import type { FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';

function generateTrackingCode() {
  const year = new Date().getFullYear();
  const code = randomBytes(3).toString('hex').toUpperCase();
  return `PBA-${year}-${code}`;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable({ scope: Scope.REQUEST })
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ratesService: RatesService,
    @Inject(REQUEST) private req: FastifyRequest,
  ) {}

  private get userId(): string {
    return (this.req as any).user?.sub;
  }

  private get userRole(): string {
    return (this.req as any).user?.role;
  }

  async create(dto: any) {
    console.log('[CREATE] req.user:', (this.req as any).user, 'userId:', this.userId);
    const distanceKm = haversineKm(
      dto.originLat,
      dto.originLng,
      dto.destLat,
      dto.destLng,
    );

    let estimatedPrice: number | undefined;
    if (dto.zoneId) {
      try {
        const estimate = await this.ratesService.estimate(
          dto.zoneId,
          dto.packageSize,
          dto.packageType,
          distanceKm,
        );
        estimatedPrice = estimate.estimatedPrice;
      } catch (_) {}
    }

    const order = await this.prisma.order.create({
      data: {
        trackingCode: generateTrackingCode(),
        client: { connect: { id: this.userId } },
        zoneId: dto.zoneId,
        packageSize: dto.packageSize,
        packageType: dto.packageType,
        packageDescription: dto.packageDescription,
        weightKg: dto.weightKg,
        originStreet: dto.originStreet,
        originStreetNumber: dto.originStreetNumber,
        originApartment: dto.originApartment,
        originCity: dto.originCity,
        originLat: dto.originLat,
        originLng: dto.originLng,
        originContact: dto.originContact,
        originPhone: dto.originPhone,
        destStreet: dto.destStreet,
        destStreetNumber: dto.destStreetNumber,
        destApartment: dto.destApartment,
        destCity: dto.destCity,
        destLat: dto.destLat,
        destLng: dto.destLng,
        destContact: dto.destContact,
        destPhone: dto.destPhone,
        scheduledAt: dto.scheduledAt,
        distanceKm: Math.round(distanceKm * 100) / 100,
        estimatedPrice,
        statusHistory: {
          create: { status: 'PENDING', changedById: this.userId },
        },
      },
      include: { statusHistory: true },
    });
    return order;
  }

  async findAll(query: any) {
    const where: any = {};
    if (this.userRole === 'CLIENT') where.clientId = this.userId;
    if (this.userRole === 'DRIVER') where.driverId = this.userId;
    if (query.status) where.status = query.status;
    if (query.zoneId) where.zoneId = query.zoneId;

    return prismaPaginate(
      this.prisma.order,
      {
        where,
        include: {
          client: { omit: { password: true } },
          driver: { omit: { password: true } },
          zone: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      query,
    );
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: { omit: { password: true } },
        driver: { omit: { password: true } },
        zone: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    this.checkAccess(order);
    return order;
  }

  async findByTrackingCode(trackingCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingCode },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        driver: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            driverProfile: {
              select: {
                currentLat: true,
                currentLng: true,
                vehicleType: true,
                rating: true,
              },
            },
          },
        },
        zone: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async assignDriver(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        orderStatus: 'ASSIGNED',
        statusHistory: {
          create: { status: 'CONFIRMED', changedById: this.userId },
        },
      },
    });
  }

  async acceptOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.driverId !== this.userId) throw new ForbiddenException();
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        orderStatus: 'IN_PROGRESS',
        statusHistory: {
          create: { status: 'CONFIRMED', changedById: this.userId },
        },
      },
    });
  }

  async updateStatus(
    orderId: string,
    status: string,
    lat?: number,
    lng?: number,
    notes?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (this.userRole === 'DRIVER' && order.driverId !== this.userId)
      throw new ForbiddenException();

    const data: any = { status };
    if (status === 'PICKED_UP') data.pickedUpAt = new Date();
    if (status === 'DELIVERED') {
      data.deliveredAt = new Date();
      data.orderStatus = 'COMPLETED';
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...data,
        statusHistory: {
          create: {
            status: status as any,
            changedById: this.userId,
            lat,
            lng,
            notes,
          },
        },
      },
    });
  }

  async confirmDelivery(
    orderId: string,
    signatureUrl: string,
    proofPhotoUrl?: string,
    notes?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.driverId !== this.userId) throw new ForbiddenException();

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        orderStatus: 'COMPLETED',
        signatureUrl,
        proofPhotoUrl,
        deliveryNotes: notes,
        deliveredAt: new Date(),
        statusHistory: {
          create: { status: 'DELIVERED', changedById: this.userId, notes },
        },
      },
    });
  }

  async rateOrder(orderId: string, rating: number, review?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.clientId !== this.userId) throw new ForbiddenException();
    if (order.status !== 'DELIVERED')
      throw new BadRequestException('Solo se pueden calificar pedidos entregados');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { clientRating: rating, clientReview: review },
    });
  }

  async cancel(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (this.userRole === 'CLIENT' && order.clientId !== this.userId)
      throw new ForbiddenException();
    if (this.userRole === 'CLIENT' && order.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se pueden cancelar pedidos en estado pendiente',
      );
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        orderStatus: 'CANCELLED',
        statusHistory: {
          create: { status: 'CANCELLED', changedById: this.userId },
        },
      },
    });
  }

  private checkAccess(order: any) {
    if (this.userRole === 'ADMIN') return;
    if (this.userRole === 'CLIENT' && order.clientId !== this.userId)
      throw new ForbiddenException();
    if (this.userRole === 'DRIVER' && order.driverId !== this.userId)
      throw new ForbiddenException();
  }
}
