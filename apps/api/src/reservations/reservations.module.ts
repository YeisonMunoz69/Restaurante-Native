import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  AdminReservationsController,
  ReservationsController,
} from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReservationsController, AdminReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
