import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DishAvailabilityController } from './dish-availability.controller.js';
import { DishAvailabilityService } from './dish-availability.service.js';

// Reutilizo JWT configurado y sus providers; no basta con poner los decoradores.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DishAvailabilityController],
  providers: [DishAvailabilityService],
})
export class DishAvailabilityModule {}
