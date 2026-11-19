import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminNewsController, NewsController } from './news.controller.js';
import { NewsService } from './news.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NewsController, AdminNewsController],
  providers: [NewsService],
})
export class NewsModule {}
