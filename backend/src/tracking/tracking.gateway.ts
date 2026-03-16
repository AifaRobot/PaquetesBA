import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TrackingService } from './tracking.service.js';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/tracking' })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private trackingService: TrackingService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // cleanup if needed
  }

  @SubscribeMessage('join:order')
  async joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    await client.join(`order:${data.orderId}`);
    return { ok: true };
  }

  @SubscribeMessage('join:fleet')
  async joinFleetRoom(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (user?.role !== 'ADMIN') {
      client.disconnect();
      return;
    }
    await client.join('fleet:admin');
    const fleet = await this.trackingService.getFleetLocations();
    client.emit('fleet:snapshot', fleet);
  }

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { orderId: string; lat: number; lng: number; heading?: number },
  ) {
    const user = (client as any).user;
    if (!user || user.role !== 'DRIVER') return;

    if (this.trackingService.shouldUpdate(user.sub)) {
      await this.trackingService.updateDriverLocation(user.sub, data.lat, data.lng);
    }

    const payload = {
      orderId: data.orderId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      updatedAt: new Date(),
    };
    this.server.to(`order:${data.orderId}`).emit('order:location', payload);
    this.server
      .to('fleet:admin')
      .emit('fleet:update', { driverId: user.sub, ...payload });
  }

  emitOrderStatus(orderId: string, status: string) {
    this.server
      .to(`order:${orderId}`)
      .emit('order:status', { orderId, status, updatedAt: new Date() });
  }
}
