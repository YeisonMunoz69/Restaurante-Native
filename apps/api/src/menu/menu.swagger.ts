import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';

const uuid: SchemaObject = { type: 'string', format: 'uuid' };
export const menuCategoryResponse: SchemaObject = {
  type: 'object',
  required: ['id', 'nombre', 'orden'],
  properties: {
    id: uuid,
    nombre: { type: 'string' },
    orden: { type: 'integer' },
  },
};
export const menuTagResponse: SchemaObject = {
  type: 'object',
  required: ['id', 'nombre', 'icono'],
  properties: {
    id: uuid,
    nombre: { type: 'string' },
    icono: { type: 'string', nullable: true },
  },
};
const photo: SchemaObject = {
  type: 'object',
  required: ['id', 'path', 'pathOg', 'orden', 'principal'],
  properties: {
    id: uuid,
    path: {
      type: 'string',
      description:
        'Ruta persistida de la imagen; no fabricamos URLs ni credenciales de Storage',
    },
    pathOg: { type: 'string', nullable: true },
    orden: { type: 'integer' },
    principal: { type: 'boolean' },
  },
};
export const menuDateProperty: SchemaObject = {
  type: 'string',
  format: 'date',
  example: '2026-10-18',
  description:
    'Fecha civil real YYYY-MM-DD, obligatoria; no asumimos hoy ni convertimos de zona horaria',
};
export const menuDishResponse: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'categoria',
    'nombre',
    'slug',
    'descripcionBreve',
    'descripcion',
    'precio',
    'moneda',
    'alergenos',
    'destacado',
    'orden',
    'disponible',
    'disponibilidadOrigen',
    'fotos',
    'etiquetas',
  ],
  properties: {
    id: uuid,
    categoria: menuCategoryResponse,
    nombre: { type: 'string' },
    slug: { type: 'string' },
    descripcionBreve: { type: 'string', nullable: true },
    descripcion: { type: 'string' },
    precio: {
      type: 'number',
      format: 'double',
      example: 32000.5,
      description:
        'COP numérico, hasta dos decimales persistidos; el cliente formatea el importe, sin calcular el precio de futuras reservas',
    },
    moneda: { type: 'string', enum: ['COP'] },
    alergenos: { type: 'string', nullable: true },
    destacado: { type: 'boolean' },
    orden: { type: 'integer' },
    disponible: {
      type: 'boolean',
      description:
        'La excepción DishSchedule por fecha prevalece, incluyendo false; sin registro aplicamos Dish.disponible',
    },
    disponibilidadOrigen: { type: 'string', enum: ['FECHA', 'GENERAL'] },
    fotos: { type: 'array', maxItems: 10, items: photo },
    etiquetas: { type: 'array', items: menuTagResponse },
  },
};

// Mantengo el mismo sobre paginado en categorías, platos y etiquetas.
export function menuPageResponse(
  item: SchemaObject,
  dated = false,
): SchemaObject {
  return {
    type: 'object',
    required: [
      'restauranteId',
      'data',
      'paginacion',
      ...(dated ? ['fecha'] : []),
    ],
    properties: {
      restauranteId: uuid,
      ...(dated ? { fecha: menuDateProperty } : {}),
      data: { type: 'array', items: item },
      paginacion: {
        type: 'object',
        required: ['pagina', 'tamanoPagina', 'total', 'totalPaginas'],
        properties: {
          pagina: { type: 'integer', minimum: 1 },
          tamanoPagina: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer', minimum: 0 },
          totalPaginas: { type: 'integer', minimum: 0 },
        },
      },
    },
  };
}

// Documento la paginación acotada; los filtros de búsqueda no pertenecen a EC-25.
export function MenuPaginationContract() {
  return applyDecorators(
    ApiQuery({
      name: 'pagina',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 },
    }),
    ApiQuery({
      name: 'tamanoPagina',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    }),
  );
}

// Conservo el formato global de errores en vez de crear otro filtro para menú.
export function MenuContract() {
  return applyDecorators(
    ApiQuery({
      name: 'restauranteId',
      required: true,
      schema: uuid,
      description:
        'ID real suministrado en la configuración del cliente; no existe un endpoint de descubrimiento en EC-25',
    }),
    ApiBadRequestResponse({
      description:
        'UUID, fecha real o paginación inválidos; campos desconocidos/repetidos. message contiene una lista de campo/detalle.',
    }),
    ApiNotFoundResponse({
      description:
        'Restaurante inexistente; en detalle, plato inexistente, de otra sede o categoría inactiva.',
    }),
    ApiResponse({
      status: 500,
      description:
        'Error de persistencia. El cliente muestra error/reintento; no devolvemos platos de muestra.',
    }),
  );
}
