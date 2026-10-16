import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

// Registro solo lecturas públicas; la administración se entrega por separado.
@Module({
  imports: [PrismaModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
