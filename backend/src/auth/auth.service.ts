import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';
import { RegisterClientDto } from './dto/register-client.dto.js';
import { RegisterDriverDto } from './dto/register-driver.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async registerClient(dto: RegisterClientDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (exists) throw new ConflictException('Email o teléfono ya registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CLIENT',
      },
    });

    return this.buildTokenResponse(user);
  }

  async registerDriver(dto: RegisterDriverDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (exists) throw new ConflictException('Email o teléfono ya registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleType: dto.vehicleType,
            licensePlate: dto.licensePlate,
            licenseNumber: dto.licenseNumber,
          },
        },
      },
      include: { driverProfile: true },
    });

    return this.buildTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { phone: dto.identifier }] },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Cuenta suspendida');

    return this.buildTokenResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
      omit: { password: true },
    });
    return user;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    return { ok: true };
  }

  private buildTokenResponse(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      firstName: user.firstName,
    };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }
}
