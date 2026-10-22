import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { MenuModule } from './menu/menu.module.js';
import { DishAvailabilityModule } from './dish-availability/dish-availability.module.js';
import { MenuAdminModule } from './menu-admin/menu-admin.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AdminsModule } from './admins/admins.module.js';

@Module({
  imports: [
    // Configuro las variables de entorno para que estén disponibles globalmente
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    CalendarModule,
    MenuModule,
    DishAvailabilityModule,
    MenuAdminModule,
    ReservationsModule,
    PaymentsModule,
    AdminsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
