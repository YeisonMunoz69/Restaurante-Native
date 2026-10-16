import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  MenuDishIdSchema,
  MenuDishQuerySchema,
  MenuDishesQuerySchema,
  MenuPageQuerySchema,
} from '@encanto/shared';
import { MenuService } from './menu.service.js';
import { parseMenu } from './menu.validation.js';
import {
  MenuContract,
  MenuPaginationContract,
  menuCategoryResponse,
  menuDateProperty,
  menuDishResponse,
  menuPageResponse,
  menuTagResponse,
} from './menu.swagger.js';

@ApiTags('Menú público')
@MenuContract()
@Controller('menu')
export class MenuController {
  constructor(@Inject(MenuService) private readonly menu: MenuService) {}

  // Entrego categorías activas de la sede en su orden configurado.
  @Get('categorias')
  @MenuPaginationContract()
  @ApiOperation({
    summary: 'Consultar categorías activas',
    description:
      'Sin autenticación. Orden estable por orden/id. Las páginas vacías conservan los metadatos.',
  })
  @ApiOkResponse({ schema: menuPageResponse(menuCategoryResponse) })
  categories(@Query() query: unknown) {
    return this.menu.categories(parseMenu(MenuPageQuerySchema, query));
  }

  // La disponibilidad usa siempre la fecha solicitada, no la fecha del servidor.
  @Get('platos')
  @MenuPaginationContract()
  @ApiQuery({ name: 'fecha', required: true, schema: menuDateProperty })
  @ApiOperation({
    summary: 'Consultar platos por fecha',
    description:
      'Incluye los no disponibles con su estado. Excluye categorías inactivas. Orden: categoría.orden, categoría.id, plato.orden, plato.id; el cliente agrupa por categoria.id al unir páginas. No depende de que el calendario esté abierto ni indica aforo.',
  })
  @ApiOkResponse({ schema: menuPageResponse(menuDishResponse, true) })
  dishes(@Query() query: unknown) {
    return this.menu.dishes(parseMenu(MenuDishesQuerySchema, query));
  }

  // Un ID válido no permite consultar platos de otra sede o categoría inactiva.
  @Get('platos/:id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiQuery({ name: 'fecha', required: true, schema: menuDateProperty })
  @ApiOperation({
    summary: 'Consultar detalle de un plato por fecha',
    description:
      'Mismo DTO de plato que la lista, con descripción, alérgenos, precio COP numérico, etiquetas y hasta diez fotos persistidas.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['restauranteId', 'fecha', 'plato'],
      properties: {
        restauranteId: { type: 'string', format: 'uuid' },
        fecha: menuDateProperty,
        plato: menuDishResponse,
      },
    },
  })
  dish(@Param('id') id: string, @Query() query: unknown) {
    return this.menu.dish(
      parseMenu(MenuDishIdSchema, id),
      parseMenu(MenuDishQuerySchema, query),
    );
  }

  // Restrinjo el catálogo público de etiquetas a las usadas por esa sede.
  @Get('etiquetas')
  @MenuPaginationContract()
  @ApiOperation({
    summary: 'Consultar etiquetas de la carta pública',
    description:
      'Solo etiquetas asociadas a platos de categorías activas de la sede, incluidos platos no disponibles. Orden estable por nombre/id.',
  })
  @ApiOkResponse({ schema: menuPageResponse(menuTagResponse) })
  tags(@Query() query: unknown) {
    return this.menu.tags(parseMenu(MenuPageQuerySchema, query));
  }
}
