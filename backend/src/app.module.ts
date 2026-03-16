import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { DriversModule } from './drivers/drivers.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ZonesModule } from './zones/zones.module.js';
import { RatesModule } from './rates/rates.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DriversModule,
    OrdersModule,
    ZonesModule,
    RatesModule,
    TrackingModule,
    NotificationsModule,
    PaymentsModule,
    ReportsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
