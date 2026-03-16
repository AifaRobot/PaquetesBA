import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async getByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }

  async createCashPayment(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.prisma.payment.upsert({
      where: { orderId },
      create: { orderId, amount, method: 'cash', status: 'PAID', paidAt: new Date() },
      update: { status: 'PAID', paidAt: new Date() },
    });
  }

  async handleWebhook(body: any) {
    // MercadoPago webhook handler — to be expanded
    return { received: true };
  }
}
