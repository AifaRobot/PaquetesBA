import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class TrackingService {
  // Throttle: driverId -> last emit timestamp
  private locationThrottle = new Map<string, number>();
  private readonly THROTTLE_MS = 5000;

  constructor(private prisma: PrismaService) {}

  shouldUpdate(driverId: string): boolean {
    const last = this.locationThrottle.get(driverId) ?? 0;
    if (Date.now() - last < this.THROTTLE_MS) return false;
    this.locationThrottle.set(driverId, Date.now());
    return true;
  }

  updateDriverLocation(driverId: string, lat: number, lng: number) {
    return this.prisma.driverProfile.update({
      where: { userId: driverId },
      data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
    });
  }

  async getOrderLocation(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        driverId: true,
        status: true,
        driver: {
          select: {
            driverProfile: {
              select: {
                currentLat: true,
                currentLng: true,
                lastLocationAt: true,
              },
            },
          },
        },
      },
    });
    return order;
  }

  async getFleetLocations() {
    return this.prisma.driverProfile.findMany({
      where: { isOnline: true },
      select: {
        userId: true,
        currentLat: true,
        currentLng: true,
        lastLocationAt: true,
        isOnline: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
