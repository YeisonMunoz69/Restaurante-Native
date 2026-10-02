import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const usuario = {
    sub: 'usuario-1',
    correo: 'comensal@encanto.com',
    rol: Role.COMENSAL,
    sid: 'sesion-1',
  };

  let request: Partial<AuthenticatedRequest>;
  let jwtService: Pick<JwtService, 'verifyAsync'>;
  let guard: JwtAuthGuard;

  // Preparo un request vacío y un JWT de prueba antes de cada caso.
  beforeEach(() => {
    request = { headers: {} };
    jwtService = { verifyAsync: vi.fn() } as unknown as Pick<
      JwtService,
      'verifyAsync'
    >;
    guard = new JwtAuthGuard(jwtService as JwtService);
  });

  // Creo el contexto mínimo que Nest entrega a la guardia.
  const contexto = () =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  // Verifico que una ruta protegida no acepte una petición anónima.
  it('rechaza una petición sin bearer token', async () => {
    await expect(guard.canActivate(contexto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // Verifico que JWT rechace un token que no puede comprobarse.
  it('rechaza un token inválido o expirado', async () => {
    request.headers = { authorization: 'Bearer token-malo' };
    vi.mocked(jwtService.verifyAsync).mockRejectedValue(
      new Error('token inválido'),
    );

    await expect(guard.canActivate(contexto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // Verifico que una sesión válida quede disponible para los controladores.
  it('verifica el token y agrega el usuario autenticado a la petición', async () => {
    request.headers = { authorization: 'Bearer token-valido' };
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(usuario);

    await expect(guard.canActivate(contexto())).resolves.toBe(true);
    expect(request.user).toEqual(usuario);
  });

  // Verifico que el payload incluya una sesión y un rol válidos.
  it('rechaza un token sin el identificador de sesión o un rol conocido', async () => {
    request.headers = { authorization: 'Bearer token-incompleto' };
    vi.mocked(jwtService.verifyAsync).mockResolvedValue({
      ...usuario,
      sid: '',
      rol: 'SUPERADMIN',
    });

    await expect(guard.canActivate(contexto())).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
