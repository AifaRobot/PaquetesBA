import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersQueryDto } from './dto/users-query.dto.js';
import { prismaPaginate } from '../common/pagination.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: UsersQueryDto) {
    return prismaPaginate(this.prisma.user, {
      where: {
        ...(query.role && { role: query.role as any }),
        ...(query.status && { status: query.status as any }),
      },
      omit: { password: true },
      orderBy: { createdAt: 'desc' },
    }, query);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
      include: { driverProfile: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      omit: { password: true },
    });
    return user;
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      omit: { password: true },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(userId: string, data: any) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.prisma.address.deleteMany({ where: { id: addressId, userId } });
    return { ok: true };
  }
}
