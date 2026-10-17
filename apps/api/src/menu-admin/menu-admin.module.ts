import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MenuAdminController } from './menu-admin.controller.js';
import { MenuAdminService } from './menu-admin.service.js';
import { DishPhotoService } from './dish-photo.service.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MenuAdminController],
  providers: [MenuAdminService, DishPhotoService, SupabaseStorageService],
})
export class MenuAdminModule {}
