import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RegisterSchema, LoginSchema } from '@encanto/shared';
import type { RegisterDto, LoginDto } from '@encanto/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', example: 'Alex' },
        correo: { type: 'string', example: 'alex@encanto.com' },
        telefono: { type: 'string', example: '3001234567' },
        password: { type: 'string', example: 'SuperSecreta123' },
      },
      required: ['nombre', 'correo', 'telefono', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de registro inválidos' })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() registerDto: RegisterDto) {
    // Proceso el registro a través del servicio
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        correo: { type: 'string', example: 'alex@encanto.com' },
        password: { type: 'string', example: 'SuperSecreta123' },
      },
      required: ['correo', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Sesión iniciada, retorna tokens' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() loginDto: LoginDto) {
    // Proceso el login para obtener los tokens JWT
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar tokens' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { refreshToken: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Nuevos tokens generados' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body('refreshToken') refreshToken: string) {
    // Invalido el token anterior (implícito al requerir uno válido y emitir otro)
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el usuario de la sesión actual' })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMENSAL, Role.STAFF, Role.ADMIN)
  // Devuelvo solo los datos publicos asociados al token validado.
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return {
      id: req.user.sub,
      correo: req.user.correo,
      rol: req.user.rol,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada correctamente' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMENSAL, Role.STAFF, Role.ADMIN)
  async logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.sub, req.user.sid);
  }
}
