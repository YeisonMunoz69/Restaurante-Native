import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CalendarDateSchema,
  DishAvailabilityCopySchema,
  DishAvailabilityQuerySchema,
  DishAvailabilityWriteSchema,
  MenuRestaurantQuerySchema,
} from '@encanto/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { parseMenu } from '../menu/menu.validation.js';
import {
  MenuContract,
  MenuPaginationContract,
  menuCategoryResponse,
  menuDateProperty,
  menuPageResponse,
} from '../menu/menu.swagger.js';
import { ApiQuery } from '@nestjs/swagger';
import { DishAvailabilityService } from './dish-availability.service.js';

@ApiTags('Disponibilidad por fecha ADMIN')
@ApiBearerAuth()
@MenuContract()
@ApiUnauthorizedResponse({ description: 'JWT ausente, inválido o expirado' })
@ApiForbiddenResponse({ description: 'La sesión no tiene rol ADMIN' })
@ApiConflictResponse({
  description:
    'DISPONIBILIDAD_CONCURRENTE exige recargar; COPIA_DESACTUALIZADA exige nueva previsualización. No hay escritura parcial.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/menu/disponibilidad')
export class DishAvailabilityController {
  constructor(
    @Inject(DishAvailabilityService)
    private readonly availability: DishAvailabilityService,
  ) {}

  // Consulto regla general y excepción sin hacer pasar una por la otra.
  @Get()
  @MenuPaginationContract()
  @ApiQuery({ name: 'fecha', required: true, schema: menuDateProperty })
  @ApiOperation({
    summary: 'Listar disponibilidad efectiva y excepción por fecha',
    description:
      'Solo categorías activas de la sede. No modifica disponibilidad general ni implementa aforo.',
  })
  @ApiOkResponse({
    schema: menuPageResponse(
      {
        type: 'object',
        properties: {
          platoId: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
          categoria: menuCategoryResponse,
          disponibleGeneral: { type: 'boolean' },
          disponible: { type: 'boolean' },
          origen: { type: 'string', enum: ['FECHA', 'GENERAL'] },
          excepcion: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              disponible: { type: 'boolean' },
            },
          },
        },
      },
      true,
    ),
  })
  list(@Query() query: unknown) {
    return this.availability.list(
      parseMenu(DishAvailabilityQuerySchema, query),
    );
  }

  // Cada elemento cambia únicamente ese plato y esa fecha; null vuelve a la regla general.
  @Put(':fecha')
  @ApiParam({ name: 'fecha', schema: menuDateProperty })
  @ApiOperation({
    summary: 'Guardar lote de excepciones por fecha',
    description:
      'Booleano crea/actualiza excepción; null la elimina. Operación atómica, hasta 1000 IDs distintos. Conserva IDs/cupo de excepciones retenidas; no escribe Dish.disponible.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['cambios'],
      properties: {
        cambios: {
          type: 'array',
          minItems: 1,
          maxItems: 1000,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['platoId', 'disponible'],
            properties: {
              platoId: { type: 'string', format: 'uuid' },
              disponible: { type: 'boolean', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        restauranteId: { type: 'string', format: 'uuid' },
        fecha: menuDateProperty,
        procesados: { type: 'integer' },
      },
    },
  })
  save(
    @Query() query: unknown,
    @Param('fecha') fecha: string,
    @Body() body: unknown,
  ) {
    return this.availability.save(
      parseMenu(MenuRestaurantQuerySchema, query).restauranteId,
      parseMenu(CalendarDateSchema, fecha),
      parseMenu(DishAvailabilityWriteSchema, body),
    );
  }

  // Sin confirmación solo previsualizo; el cliente debe mostrar el resumen antes de escribir.
  @Post('copiar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Previsualizar o confirmar copia de disponibilidad efectiva',
    description:
      'Origen/destino distintos. Sin confirmacion no escribe. Con el hash mostrado copia la disponibilidad efectiva de origen a excepciones del destino, solo de categorías activas de la sede. Si cambia la fotografía, 409. No copia cupo ni afecta generales, otras fechas o categorías inactivas.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['origen', 'destino'],
      properties: {
        origen: menuDateProperty,
        destino: menuDateProperty,
        confirmacion: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        aplicada: { type: 'boolean' },
        procesados: { type: 'integer' },
        previsualizacion: {
          type: 'object',
          properties: {
            restauranteId: { type: 'string', format: 'uuid' },
            origen: menuDateProperty,
            destino: menuDateProperty,
            total: { type: 'integer' },
            cambios: { type: 'integer' },
            excepcionesDestino: { type: 'integer' },
            confirmacion: { type: 'string' },
          },
        },
      },
    },
  })
  copy(@Query() query: unknown, @Body() body: unknown) {
    return this.availability.copy(
      parseMenu(MenuRestaurantQuerySchema, query).restauranteId,
      parseMenu(DishAvailabilityCopySchema, body),
    );
  }
}
