import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { prismaPaginate, PaginationQueryDto } from '../common/pagination.js';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto & { zoneId?: string; isOnline?: boolean | string }) {
    const isOnline =
      query.isOnline === undefined
        ? undefined
        : query.isOnline === true || query.isOnline === 'true';
    return prismaPaginate(this.prisma.driverProfile, {
      where: {
        ...(query.zoneId && { zoneId: query.zoneId }),
        ...(isOnline !== undefined && { isOnline }),
      },
      include: {
        user: { omit: { password: true } },
        zone: true,
      },
      orderBy: { rating: 'desc' },
    }, query);
  }

  async findAvailable(zoneId?: string) {
    return this.prisma.driverProfile.findMany({
      where: {
        isOnline: true,
        user: { status: 'ACTIVE' },
        ...(zoneId && { zoneId }),
      },
      include: { user: { omit: { password: true } } },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { zone: true },
    });
    if (!profile) throw new NotFoundException('Perfil de repartidor no encontrado');
    return profile;
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data,
    });
  }

  async setOnline(userId: string, isOnline: boolean) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data: { isOnline },
    });
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    return this.prisma.driverProfile.update({
      where: { userId },
      data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
    });
  }

  async getStats(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [delivered, failed, ordersThisMonth] = await Promise.all([
      this.prisma.order.count({ where: { driverId: userId, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { driverId: userId, status: 'FAILED' } }),
      this.prisma.order.count({
        where: { driverId: userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalDeliveries: delivered,
      successfulDeliveries: delivered,
      failedDeliveries: failed,
      averageRating: profile.rating ?? null,
      totalEarnings: 0,
      ordersThisMonth,
      completionRate:
        delivered + failed > 0 ? Math.round((delivered / (delivered + failed)) * 100) : 100,
    };
  }
}
