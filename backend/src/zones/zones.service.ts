import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.zone.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id }, include: { rates: true } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    return zone;
  }

  create(data: any) {
    return this.prisma.zone.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.zone.update({ where: { id }, data });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.zone.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
}
