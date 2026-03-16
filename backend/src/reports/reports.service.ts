import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      ordersToday,
      activeDrivers,
      totalDrivers,
      totalClients,
      revenueAgg,
      revenueTodayAgg,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.driverProfile.count({ where: { isOnline: true } }),
      this.prisma.driverProfile.count(),
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID', paidAt: { gte: today } } }),
    ]);

    return {
      totalOrders,
      ordersToday,
      activeDrivers,
      totalDrivers,
      totalClients,
      revenue: revenueAgg._sum.amount ?? 0,
      revenueToday: revenueTodayAgg._sum.amount ?? 0,
    };
  }

  async getOrdersByStatus() {
    const statuses = [
      'PENDING',
      'CONFIRMED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'CANCELLED',
    ];
    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.prisma.order.count({ where: { status: status as any } }),
      })),
    );
    return counts;
  }

  async getDeliveriesOverTime(from: string, to: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        status: { in: ['DELIVERED', 'FAILED', 'CANCELLED'] as any[] },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<string, { delivered: number; failed: number; total: number }>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().split('T')[0];
      const entry = map.get(day) ?? { delivered: 0, failed: 0, total: 0 };
      entry.total++;
      if (o.status === 'DELIVERED') entry.delivered++;
      else entry.failed++;
      map.set(day, entry);
    }
    return Array.from(map.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async getDriverPerformance() {
    const drivers = await this.prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            driverOrders: { select: { status: true } },
          },
        },
      },
      orderBy: { completedDeliveries: 'desc' },
      take: 20,
    });
    return drivers.map((d) => {
      const orders = d.user.driverOrders;
      const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
      const total = orders.filter((o) => ['DELIVERED', 'FAILED', 'CANCELLED'].includes(o.status)).length;
      return {
        driverId: d.userId,
        driverName: `${d.user.firstName} ${d.user.lastName}`,
        deliveries: d.completedDeliveries,
        successRate: total > 0 ? delivered / total : 1,
        averageRating: d.rating ?? null,
      };
    });
  }
}
