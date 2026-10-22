import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { parseMenu } from '../menu/menu.validation.js';
import { AdminsService } from './admins.service.js';
const changeSchema = z.object({ correo: z.string().trim().email().max(254), administrador: z.boolean() }).strict();

@ApiTags('Administradores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/administradores')
export class AdminsController {
  constructor(@Inject(AdminsService) private readonly admins: AdminsService) {}
  @Get()
  @ApiOperation({ summary: 'Consultar administradores y mínimo de tres activos' })
  list(@Req() req: AuthenticatedRequest) { return this.admins.list(req.user.sub); }
  @Put()
  @ApiOperation({ summary: 'Designar o retirar permisos a una cuenta existente, sin borrar su historial' })
  change(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseMenu(changeSchema, body);
    return this.admins.change(req.user.sub, input.correo, input.administrador);
  }
}
