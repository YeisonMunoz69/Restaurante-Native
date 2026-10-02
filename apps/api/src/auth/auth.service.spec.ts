import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService.logout', () => {
  const updateMany = vi.fn();
  let service: AuthService;

  // Restablezco los dobles antes de cada verificación del cierre de sesión.
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
    const prisma = {
      refreshToken: { updateMany },
    } as never;

    service = new AuthService({} as JwtService, {} as ConfigService, prisma);
  });

  // Compruebo que la revocación se limite al ID de sesión y al usuario recibidos.
  it('revoca la sesión solicitada y conserva las otras sesiones del usuario', async () => {
    await expect(service.logout('usuario-1', 'sesion-2')).resolves.toEqual({
      message: 'Sesión cerrada correctamente',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sesion-2',
        usuarioId: 'usuario-1',
        revocadoEn: null,
      },
      data: { revocadoEn: expect.any(Date) },
    });
  });
});
