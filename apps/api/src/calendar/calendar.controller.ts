import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CalendarDayQuerySchema,
  CalendarNextQuerySchema,
} from '@encanto/shared';
import { CalendarService } from './calendar.service.js';
import { parseCalendar } from './calendar.validation.js';
import {
  CalendarContract,
  calendarDateProperty,
  calendarDayResponse,
} from './calendar.swagger.js';

@ApiTags('Calendario público')
@CalendarContract()
@Controller('calendario')
export class CalendarController {
  constructor(
    @Inject(CalendarService) private readonly calendar: CalendarService,
  ) {}

  // Entrego el día efectivo con todas sus franjas y la procedencia del horario.
  @Get('dia')
  @ApiOperation({
    summary: 'Consultar un día de atención',
    description:
      'La excepción reemplaza todas las reglas; sin excepción usamos todas las reglas abiertas activas. Sin reglas, cerrado.',
  })
  @ApiQuery({ name: 'fecha', required: true, schema: calendarDateProperty })
  @ApiOkResponse({ schema: calendarDayResponse })
  day(@Query() query: unknown) {
    const { restauranteId, fecha } = parseCalendar(
      CalendarDayQuerySchema,
      query,
    );
    return this.calendar.day(restauranteId, fecha);
  }

  // Incluyo desde aunque sea hoy; no calculo disponibilidad de reservas ni de aforo.
  @Get('proximo')
  @ApiOperation({
    summary: 'Consultar el próximo día abierto',
    description:
      'Desde es inclusivo y por defecto es hoy en America/Bogota. Buscamos hasta 366 fechas, truncadas en 9999-12-31; dia=null indica que no encontramos apertura en ese intervalo, no que nunca abrirá.',
  })
  @ApiQuery({ name: 'desde', required: false, schema: calendarDateProperty })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        desde: calendarDateProperty,
        hasta: calendarDateProperty,
        diasBuscados: { type: 'integer', minimum: 1, maximum: 366 },
        dia: { ...calendarDayResponse, nullable: true },
      },
    },
  })
  next(@Query() query: unknown) {
    const { restauranteId, desde } = parseCalendar(
      CalendarNextQuerySchema,
      query,
    );
    return this.calendar.next(restauranteId, desde);
  }
}
