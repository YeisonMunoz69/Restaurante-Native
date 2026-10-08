import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CalendarConfirmationSchema,
  CalendarDateSchema,
  CalendarDayQuerySchema,
  CalendarExceptionInputSchema,
  CalendarRestaurantSchema,
  CalendarRulesInputSchema,
  CalendarWeekdaySchema,
} from '@encanto/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CalendarService } from './calendar.service.js';
import { parseCalendar } from './calendar.validation.js';
import {
  CalendarContract,
  CalendarWriteConflict,
  calendarConfirmationBody,
  calendarDateProperty,
  calendarExceptionBody,
  calendarExceptionResponse,
  calendarRuleBody,
} from './calendar.swagger.js';

@ApiTags('Administración del calendario')
@ApiBearerAuth()
@CalendarContract()
@ApiUnauthorizedResponse({
  description: 'Token de acceso ausente, inválido o expirado',
})
@ApiForbiddenResponse({ description: 'La sesión válida no tiene rol ADMIN' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/calendario')
export class CalendarAdminController {
  constructor(
    @Inject(CalendarService) private readonly calendar: CalendarService,
  ) {}

  // Muestro todas las reglas, incluso las inactivas, para poder mantenerlas.
  @Get('reglas')
  @ApiOperation({ summary: 'Listar reglas semanales' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        ...calendarRuleBody,
        properties: {
          ...calendarRuleBody.properties,
          id: { type: 'string', format: 'uuid' },
          diaSemana: { type: 'integer', minimum: 0, maximum: 6 },
        },
      },
    },
  })
  rules(@Query() query: unknown) {
    const { restauranteId } = parseCalendar(CalendarRestaurantSchema, query);
    return this.calendar.rules(restauranteId);
  }

  // Reemplazo un solo día semanal con cero o varias franjas.
  @Put('reglas/:diaSemana')
  @ApiOperation({
    summary: 'Reemplazar las reglas de un día semanal',
    description:
      '0=domingo, 6=sábado; reglas=[] elimina las de ese día. Advertimos las reservas futuras confirmadas en fechas que pasan de abiertas a cerradas, respetando excepciones.',
  })
  @ApiParam({
    name: 'diaSemana',
    schema: { type: 'integer', minimum: 0, maximum: 6 },
  })
  @ApiBody({
    schema: {
      ...calendarConfirmationBody,
      required: ['reglas'],
      properties: {
        ...calendarConfirmationBody.properties,
        reglas: { type: 'array', maxItems: 48, items: calendarRuleBody },
      },
    },
  })
  @CalendarWriteConflict()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        restauranteId: { type: 'string', format: 'uuid' },
        diaSemana: { type: 'integer' },
        reglas: { type: 'array', items: calendarRuleBody },
        reservasAfectadas: { type: 'integer' },
      },
    },
  })
  replaceRules(
    @Query() query: unknown,
    @Param('diaSemana') weekday: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseCalendar(CalendarRestaurantSchema, query);
    return this.calendar.replaceRules(
      restauranteId,
      parseCalendar(CalendarWeekdaySchema, weekday),
      parseCalendar(CalendarRulesInputSchema, body),
    );
  }

  // Distingo la excepción guardada del calendario efectivo de la consulta pública.
  @Get('excepciones')
  @ApiOperation({
    summary: 'Consultar una excepción por fecha',
    description:
      'Devuelve null si no existe; el calendario efectivo sigue disponible en /calendario/dia.',
  })
  @ApiQuery({ name: 'fecha', required: true, schema: calendarDateProperty })
  @ApiOkResponse({ schema: calendarExceptionResponse })
  exception(@Query() query: unknown) {
    const { restauranteId, fecha } = parseCalendar(
      CalendarDayQuerySchema,
      query,
    );
    return this.calendar.exception(restauranteId, fecha);
  }

  // Exijo validación completa tanto al crear como al reemplazar una excepción.
  @Put('excepciones/:fecha')
  @ApiOperation({
    summary: 'Crear o reemplazar una excepción',
    description:
      'Prevalece sobre todas las reglas semanales. Un cierre con reservas confirmadas devuelve 409 antes de escribir.',
  })
  @ApiParam({ name: 'fecha', schema: calendarDateProperty })
  @ApiBody({ schema: calendarExceptionBody })
  @CalendarWriteConflict()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        excepcion: { ...calendarExceptionResponse, nullable: false },
        reservasAfectadas: { type: 'integer' },
      },
    },
  })
  putException(
    @Query() query: unknown,
    @Param('fecha') date: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseCalendar(CalendarRestaurantSchema, query);
    return this.calendar.putException(
      restauranteId,
      parseCalendar(CalendarDateSchema, date),
      parseCalendar(CalendarExceptionInputSchema, body),
    );
  }

  // Restauro la regla semanal y advierto si quitar la excepción cierra una apertura.
  @Delete('excepciones/:fecha')
  @ApiOperation({
    summary: 'Eliminar una excepción',
    description:
      'También exige confirmación si al volver a las reglas semanales queda un día cerrado con reservas confirmadas.',
  })
  @ApiParam({ name: 'fecha', schema: calendarDateProperty })
  @ApiBody({ required: false, schema: calendarConfirmationBody })
  @CalendarWriteConflict()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        eliminada: { type: 'boolean' },
        reservasAfectadas: { type: 'integer' },
      },
    },
  })
  deleteException(
    @Query() query: unknown,
    @Param('fecha') date: string,
    @Body() body: unknown,
  ) {
    const { restauranteId } = parseCalendar(CalendarRestaurantSchema, query);
    const { confirmarReservasAfectadas } = parseCalendar(
      CalendarConfirmationSchema,
      body ?? {},
    );
    return this.calendar.deleteException(
      restauranteId,
      parseCalendar(CalendarDateSchema, date),
      confirmarReservasAfectadas,
    );
  }
}
