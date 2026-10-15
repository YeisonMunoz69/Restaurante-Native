import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CalendarModule } from './calendar/calendar.module.js';

@Module({
  imports: [
    // Configuro las variables de entorno para que estén disponibles globalmente
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
