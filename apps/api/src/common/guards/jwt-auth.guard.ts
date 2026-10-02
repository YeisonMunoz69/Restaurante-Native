import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  correo: string;
  rol: Role;
  sid: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Inyecto el servicio JWT configurado para validar los tokens de acceso.
  constructor(private readonly jwtService: JwtService) {}

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

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'El token de acceso es inválido o expiró',
      );
    }
  }
}
