import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentConfigSchema } from '@encanto/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { parseMenu } from '../menu/menu.validation.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Contacto y pagos externos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Get('reservas/datos-pago')
  @Roles(Role.COMENSAL, Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Consultar medios, instrucciones y WhatsApp vigentes',
  })
  current() {
    return this.payments.current();
  }

  @Get('admin/configuracion/pagos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cargar datos editables de pago externo' })
  adminCurrent() {
    return this.payments.current();
  }

  @Put('admin/configuracion/pagos')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar manualmente contacto, medios e instrucciones de pago',
  })
  save(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.payments.save(
      request.user.sub,
      parseMenu(PaymentConfigSchema, body),
    );
  }
}
