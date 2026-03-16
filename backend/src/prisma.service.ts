import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env["DATABASE_URL"] ||
      'postgresql://admin:admin123@127.0.0.1:5432/paquetesba';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }
}
