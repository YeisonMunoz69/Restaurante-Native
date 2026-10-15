import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';

export const calendarDateProperty: SchemaObject = {
  type: 'string',
  format: 'date',
  example: '2026-10-11',
  description: 'Fecha civil real YYYY-MM-DD; usamos America/Bogota para hoy',
};
const time: SchemaObject = {
  type: 'string',
  pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
  example: '12:00',
};
export const calendarRuleBody: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['horaApertura', 'horaCierre'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description:
        'Opcional: conservamos esta regla existente del mismo día/sede y sus campos ajenos al calendario',
    },
    horaApertura: time,
    horaCierre: { ...time, example: '17:00' },
    abierto: { type: 'boolean', default: true },
    activo: { type: 'boolean', default: true },
  },
};
export const calendarConfirmationBody: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confirmarReservasAfectadas: {
      type: 'integer',
      minimum: 0,
      description:
        'Repetimos la misma petición con la cantidad del 409; se vuelve a consultar antes de escribir',
    },
  },
};
export const calendarExceptionBody: SchemaObject = {
  ...calendarConfirmationBody,
  required: ['abierto'],
  properties: {
    ...calendarConfirmationBody.properties,
    abierto: { type: 'boolean' },
    horaApertura: { ...time, nullable: true },
    horaCierre: { ...time, nullable: true, example: '17:00' },
    soloPorReserva: { type: 'boolean', default: false },
    motivo: { type: 'string', nullable: true, maxLength: 500 },
  },
  description:
    'Si abierto=true, exigimos horas ordenadas. Si está cerrado, omitimos horas (o null) y soloPorReserva=false. Reemplazo completo, sin horarios nocturnos.',
};
export const calendarDayResponse: SchemaObject = {
  type: 'object',
  required: [
    'restauranteId',
    'fecha',
    'zonaHoraria',
    'abierto',
    'soloPorReserva',
    'origen',
    'horarios',
    'motivo',
  ],
  properties: {
    restauranteId: { type: 'string', format: 'uuid' },
    fecha: calendarDateProperty,
    zonaHoraria: { type: 'string', enum: ['America/Bogota'] },
    abierto: { type: 'boolean' },
    soloPorReserva: { type: 'boolean' },
    origen: { type: 'string', enum: ['EXCEPCION', 'SEMANAL', 'SIN_REGLA'] },
    horarios: {
      type: 'array',
      items: {
        type: 'object',
        required: ['horaApertura', 'horaCierre'],
        properties: { horaApertura: time, horaCierre: time },
      },
    },
    motivo: { type: 'string', nullable: true },
  },
};
export const calendarExceptionResponse: SchemaObject = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string', format: 'uuid' },
    restaurantId: { type: 'string', format: 'uuid' },
    fecha: calendarDateProperty,
    abierto: { type: 'boolean' },
    horaApertura: { ...time, nullable: true },
    horaCierre: { ...time, nullable: true },
    soloPorReserva: { type: 'boolean' },
    motivo: { type: 'string', nullable: true },
  },
};

// Declaro los errores comunes sin alterar nuestro filtro global existente.
export function CalendarContract() {
  return applyDecorators(
    ApiQuery({
      name: 'restauranteId',
      required: true,
      type: String,
      format: 'uuid',
    }),
    ApiBadRequestResponse({
      description:
        'UUID, fecha, día semanal, horas o cuerpo inválidos; message contiene campo y detalle',
    }),
    ApiNotFoundResponse({
      description:
        'Restaurante inexistente; DELETE también devuelve 404 si no existe la excepción',
    }),
    ApiResponse({
      status: 500,
      description:
        'Error de persistencia; no afirmamos que la operación haya sido aplicada',
    }),
  );
}

// Expongo la advertencia en message porque así la conserva el filtro de producción.
export function CalendarWriteConflict() {
  return ApiConflictResponse({
    description:
      'RESERVAS_CONFIRMADAS_AFECTADAS exige repetir con la cantidad actual; SEDE_UNICA_REQUERIDA impide escrituras multisede; CALENDARIO_CONCURRENTE exige consultar y reintentar. No modificamos reservas.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 409 },
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string' },
        message: {
          type: 'object',
          properties: {
            codigo: {
              type: 'string',
              example: 'RESERVAS_CONFIRMADAS_AFECTADAS',
            },
            reservasAfectadas: { type: 'integer', example: 2 },
            fechas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fecha: calendarDateProperty,
                  cantidad: { type: 'integer' },
                },
              },
            },
            confirmacion: { type: 'string' },
            detalle: { type: 'string' },
          },
        },
      },
    },
  });
}
