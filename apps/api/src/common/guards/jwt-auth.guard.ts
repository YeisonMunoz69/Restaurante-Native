import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { protectedAdminEmails } from '../../admins/protected-admins.js';

export interface AuthenticatedUser {
  sub: string;
  correo: string;
  rol: Role;
  sid: string;
  provider?: 'google' | 'password';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Inyecto el servicio JWT configurado para validar los tokens de acceso.
  constructor(
    private readonly jwtService: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  // Valido el token y adjunto al request únicamente una sesión bien formada.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Se requiere un token de acceso válido');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      if (payload.provider !== 'google' && this.config?.get('AUTH_GOOGLE_ONLY') === 'true') {
        throw new UnauthorizedException('Inicia sesión con Google');
      }
      const roles = Object.values(Role) as string[];

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.correo !== 'string' ||
        typeof payload.sid !== 'string' ||
        !roles.includes(payload.rol)
      ) {
        throw new UnauthorizedException(
          'El token de acceso no contiene una sesión válida',
        );
      }

      // Compruebo los privilegios vigentes aunque el JWT de ADMIN o STAFF aún no haya vencido.
      if (payload.rol !== Role.COMENSAL) {
        const current = await this.prisma.user.findUnique({
          where: { id: payload.sub }, select: { rol: true, activo: true, correo: true, googleSub: true },
        });
        if (!current?.activo || current.rol !== payload.rol) {
          throw new UnauthorizedException('Los permisos de la cuenta cambiaron; inicie sesión nuevamente');
        }
        if (payload.provider !== 'google' && current.googleSub &&
          protectedAdminEmails(this.config?.get<string>('PROTECTED_ADMIN_EMAILS')).has(current.correo)) {
          throw new UnauthorizedException('Inicia sesión con Google para usar esta cuenta protegida');
        }
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'El token de acceso es inválido o expiró',
      );
    }
  }
}
