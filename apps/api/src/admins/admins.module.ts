import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';
@Module({ imports: [AuthModule, PrismaModule], controllers: [AdminsController], providers: [AdminsService] })
export class AdminsModule {}
