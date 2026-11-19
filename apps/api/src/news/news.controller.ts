import {
  Body, Controller, Get, Inject, Param, Post, Put, Query, Req, StreamableFile,
  UploadedFile, UseGuards, UseInterceptors, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  MenuDishIdSchema, MenuRestaurantQuerySchema, NewsContentSchema, NewsUpdateSchema, NewsVersionSchema,
} from '@encanto/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { MAX_DISH_PHOTO_BYTES } from '../menu-admin/dish-photo-processing.js';
import { parseMenu } from '../menu/menu.validation.js';
import { NewsService } from './news.service.js';

@ApiTags('Noticias')
@Controller('noticias')
export class NewsController {
  constructor(@Inject(NewsService) private readonly news: NewsService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.news.list(parseMenu(MenuRestaurantQuerySchema, query).restauranteId);
  }

  @Get(':id/imagen')
  @Header('Cache-Control', 'no-store')
  async image(@Param('id') id: string, @Query() query: unknown) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    const bytes = await this.news.image(restauranteId, parseMenu(MenuDishIdSchema, id));
    return new StreamableFile(bytes, { type: 'image/webp', length: bytes.length });
  }
}

@ApiTags('Administración de noticias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/noticias')
export class AdminNewsController {
  constructor(@Inject(NewsService) private readonly news: NewsService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.news.list(parseMenu(MenuRestaurantQuerySchema, query).restauranteId, true);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Query() query: unknown, @Body() body: unknown) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.news.create(restauranteId, request.user.sub, parseMenu(NewsContentSchema, body));
  }

  @Put(':id')
  update(@Param('id') id: string, @Query() query: unknown, @Body() body: unknown) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.news.update(restauranteId, parseMenu(MenuDishIdSchema, id), parseMenu(NewsUpdateSchema, body));
  }

  @Put(':id/imagen')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: MAX_DISH_PHOTO_BYTES } }))
  @ApiConsumes('multipart/form-data')
  upload(@Param('id') id: string, @Query() query: unknown, @Body() body: unknown, @UploadedFile() file?: { buffer: Buffer }) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    const { version } = parseMenu(NewsVersionSchema, body);
    return this.news.upload(restauranteId, parseMenu(MenuDishIdSchema, id), version, file?.buffer);
  }
}
