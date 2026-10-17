import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  ReservationCreateSchema,
  ReservationIdSchema,
  ReservationListQuerySchema,
  ReservationRejectSchema,
  ReservationSlotsQuerySchema,
} from '@encanto/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { parseMenu } from '../menu/menu.validation.js';
import { ReservationsService } from './reservations.service.js';

@ApiTags('Reservas del comensal')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente, inválido o expirado' })
@ApiConflictResponse({ description: 'El aforo, el calendario o el estado cambió; recargue antes de repetir' })
@ApiNotFoundResponse({ description: 'La reserva no existe o no pertenece al usuario' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COMENSAL, Role.STAFF, Role.ADMIN)
@Controller('reservas')
export class ReservationsController {
  constructor(
    @Inject(ReservationsService) private readonly reservations: ReservationsService,
  ) {}

  @Get('franjas')
  @ApiOperation({ summary: 'Consultar franjas disponibles para una fecha y grupo' })
  availableSlots(@Query() query: unknown) {
    return this.reservations.availableSlots(
      parseMenu(ReservationSlotsQuerySchema, query),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una solicitud pendiente y guardar precios del pedido',
    description:
      'La solicitud ocupa aforo desde SOLICITADA. El pago se verifica fuera de la aplicación; no se confirma automáticamente.',
  })
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.reservations.create(
      request.user.sub,
      parseMenu(ReservationCreateSchema, body),
    );
  }

  @Get('mias')
  @ApiOperation({ summary: 'Consultar únicamente las reservas del usuario autenticado' })
  mine(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    return this.reservations.mine(
      request.user.sub,
      parseMenu(ReservationListQuerySchema, query),
    );
  }

  @Get('mias/:id')
  @ApiOperation({ summary: 'Consultar el detalle de una reserva propia' })
  mineDetail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.mineDetail(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }

  @Patch('mias/:id/cancelar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Retirar una solicitud o cancelar una confirmada con 60 minutos de anticipación',
  })
  cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.cancel(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }
}

@ApiTags('Operación de reservas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente, inválido o expirado' })
@ApiForbiddenResponse({ description: 'El rol no tiene permiso para esta operación' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reservas')
export class AdminReservationsController {
  constructor(
    @Inject(ReservationsService) private readonly reservations: ReservationsService,
  ) {}

  @Get('solicitudes')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar solicitudes por fecha y estado' })
  requests(@Query() query: unknown) {
    return this.reservations.adminList(
      parseMenu(ReservationListQuerySchema, query),
    );
  }

  @Patch(':id/aprobar')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirmar una solicitud después de verificar el pago externo' })
  approve(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.approve(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }

  @Patch(':id/rechazar')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar una solicitud con un motivo obligatorio' })
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.reservations.reject(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
      parseMenu(ReservationRejectSchema, body),
    );
  }

  @Get('agenda')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Consultar agenda confirmada y en curso para una fecha' })
  agenda(@Query() query: unknown) {
    const parsed = parseMenu(ReservationListQuerySchema, query);
    if (!parsed.fecha) throw new BadRequestException('La fecha es obligatoria');
    return this.reservations.agenda(parsed.fecha);
  }

  @Patch(':id/llegada')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @ApiOperation({ summary: 'Registrar la llegada de una reserva confirmada' })
  arrival(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.markArrival(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }

  @Patch(':id/inasistencia')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @ApiOperation({ summary: 'Registrar una inasistencia después de la tolerancia configurada' })
  noShow(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.markNoShow(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }

  @Patch(':id/completar')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar una atención que ya está en curso' })
  complete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservations.complete(
      request.user.sub,
      parseMenu(ReservationIdSchema, id),
    );
  }
}
