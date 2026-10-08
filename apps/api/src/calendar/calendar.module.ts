import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarAdminController } from './calendar-admin.controller.js';
import { CalendarService } from './calendar.service.js';

// Importo JWT y sus guardias configuradas; Prisma también se puede sustituir en pruebas.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CalendarController, CalendarAdminController],
  providers: [CalendarService],
})
export class CalendarModule {}
