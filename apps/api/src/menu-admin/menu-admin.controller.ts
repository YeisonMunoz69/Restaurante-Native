import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  DishActiveSchema,
  DishCreateSchema,
  DishGeneralAvailabilitySchema,
  DishPhotoOrderSchema,
  DishUpdateSchema,
  MenuAdminPageQuerySchema,
  MenuDishIdSchema,
  MenuRestaurantQuerySchema,
} from '@encanto/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { parseMenu } from '../menu/menu.validation.js';
import { MenuAdminService } from './menu-admin.service.js';
import { DishPhotoService, type UploadedDishPhoto } from './dish-photo.service.js';

@ApiTags('Administración de carta')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente, inválido o expirado' })
@ApiForbiddenResponse({ description: 'La sesión no tiene rol ADMIN' })
@ApiNotFoundResponse({ description: 'La sede, categoría o plato no existe' })
@ApiConflictResponse({ description: 'El slug existe o la carta cambió durante la escritura' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/menu')
export class MenuAdminController {
  constructor(
    @Inject(MenuAdminService) private readonly catalog: MenuAdminService,
    @Inject(DishPhotoService) private readonly photos: DishPhotoService,
  ) {}

  @Get('categorias')
  @ApiOperation({ summary: 'Listar categorías activas o todas para administración' })
  categories(@Query() query: unknown) {
    return this.catalog.categories(
      parseMenu(MenuAdminPageQuerySchema, query),
    );
  }

  @Post('categorias')
  @ApiOperation({ summary: 'Crear una categoría' })
  createCategory(@Query() query: unknown, @Body() body: unknown) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.catalog.createCategory(
      restauranteId,
      parseMenu(CategoryCreateSchema, body),
    );
  }

  @Put('categorias/:id')
  @ApiOperation({ summary: 'Editar, ordenar o desactivar una categoría' })
  updateCategory(
    @Query() query: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.catalog.updateCategory(
      restauranteId,
      parseMenu(MenuDishIdSchema, id),
      parseMenu(CategoryUpdateSchema, body),
    );
  }

  @Get('platos')
  @ApiOperation({ summary: 'Listar platos y fotos para administración' })
  dishes(@Query() query: unknown) {
    return this.catalog.dishes(parseMenu(MenuAdminPageQuerySchema, query));
  }

  @Post('platos')
  @ApiOperation({ summary: 'Crear un plato' })
  createDish(@Query() query: unknown, @Body() body: unknown) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.catalog.createDish(
      restauranteId,
      parseMenu(DishCreateSchema, body),
    );
  }

  @Put('platos/:id')
  @ApiOperation({ summary: 'Editar los datos de un plato' })
  updateDish(
    @Query() query: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.catalog.updateDish(
      restauranteId,
      id,
      parseMenu(DishUpdateSchema, body),
    );
  }

  @Put('platos/:id/activo')
  @ApiOperation({ summary: 'Dar de baja o reactivar un plato conservando su historial' })
  setDishActive(
    @Query() query: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    const { activo } = parseMenu(DishActiveSchema, body);
    return this.catalog.setDishActive(restauranteId, id, activo);
  }

  @Put('platos/:id/disponibilidad')
  @ApiOperation({ summary: 'Alternar inmediatamente la disponibilidad general de un plato' })
  setGeneralAvailability(
    @Query() query: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    const { disponible } = parseMenu(DishGeneralAvailabilitySchema, body);
    return this.catalog.setGeneralAvailability(restauranteId, id, disponible);
  }

  @Post('platos/:id/fotos')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { foto: { type: 'string', format: 'binary' } }, required: ['foto'] } })
  @ApiOperation({ summary: 'Subir una foto, comprimirla y crear su vista previa' })
  uploadPhoto(
    @Query() query: unknown,
    @Param('id') id: string,
    @UploadedFile() file?: UploadedDishPhoto,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.photos.upload(
      restauranteId,
      parseMenu(MenuDishIdSchema, id),
      file,
    );
  }

  @Put('platos/:id/fotos/orden')
  @ApiOperation({ summary: 'Guardar el orden y la foto principal de la galería' })
  reorderPhotos(
    @Query() query: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    const { fotos } = parseMenu(DishPhotoOrderSchema, body);
    return this.photos.reorder(
      restauranteId,
      parseMenu(MenuDishIdSchema, id),
      fotos,
    );
  }

  @Delete('platos/:id/fotos/:fotoId')
  @ApiOperation({ summary: 'Quitar una foto y reordenar la galería' })
  removePhoto(
    @Query() query: unknown,
    @Param('id') id: string,
    @Param('fotoId') photoId: string,
  ) {
    const { restauranteId } = parseMenu(MenuRestaurantQuerySchema, query);
    return this.photos.remove(
      restauranteId,
      parseMenu(MenuDishIdSchema, id),
      parseMenu(MenuDishIdSchema, photoId),
    );
  }
}
