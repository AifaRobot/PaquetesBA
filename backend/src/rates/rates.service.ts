import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.rate.findMany({ include: { zone: true }, orderBy: { createdAt: 'desc' } });
  }

  async estimate(
    zoneId: string,
    packageSize: string,
    packageType: string,
    distanceKm: number,
  ) {
    const rate = await this.prisma.rate.findFirst({
      where: {
        zoneId,
        packageSize: packageSize as any,
        packageType: packageType as any,
        isActive: true,
      },
    });
    if (!rate) throw new NotFoundException('No hay tarifa configurada para esta combinación');
    const price = rate.basePrice + rate.pricePerKm * distanceKm;
    return { estimatedPrice: Math.round(price * 100) / 100, rate };
  }

  create(data: any) {
    return this.prisma.rate.create({ data });
  }

  async update(id: string, data: any) {
    const rate = await this.prisma.rate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Tarifa no encontrada');
    return this.prisma.rate.update({ where: { id }, data });
  }

  async remove(id: string) {
    const rate = await this.prisma.rate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Tarifa no encontrada');
    return this.prisma.rate.delete({ where: { id } });
  }
}
