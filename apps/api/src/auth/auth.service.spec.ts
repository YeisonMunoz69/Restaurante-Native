import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { OAuth2Client } from 'google-auth-library';
import { GoogleLoginSchema } from '@encanto/shared';

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

describe('AuthService Google', () => {
  const account = { id: 'encanto-id', correo: 'persona@example.test', activo: true, rol: 'COMENSAL', googleSub: null };
  const identity = { sub: 'google-id', email: account.correo, email_verified: true, name: 'Persona' };
  const findUnique = vi.fn();
  const create = vi.fn();
  const updateMany = vi.fn();
  const refreshCreate = vi.fn();
  const sign = vi.fn();
  const getConfig = vi.fn();
  const sessionFind = vi.fn();
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    getConfig.mockImplementation(key => key === 'GOOGLE_WEB_CLIENT_ID' ? 'web.example' : 'secret-test');
    const db = { user: { findUnique, create, updateMany }, refreshToken: { create: refreshCreate, findFirst: sessionFind } };
    const prisma = { ...db, $transaction: (callback: (client: typeof db) => unknown) => callback(db) };
    service = new AuthService({ sign } as never, { get: getConfig } as never, prisma as never);
    sign.mockReturnValue('jwt-de-prueba');
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => identity } as never);
  });

  it('pide teléfono para un alta nueva y evita que el cliente asigne su propio rol', async () => {
    expect(GoogleLoginSchema.safeParse({ idToken: 't', rol: 'ADMIN' }).success).toBe(false);
    findUnique.mockResolvedValue(null);
    await expect(service.googleLogin({ idToken: 't' })).rejects.toMatchObject({ response: { code: 'GOOGLE_PHONE_REQUIRED' } });
    expect(create).not.toHaveBeenCalled();
    create.mockResolvedValue(account);
    await service.googleLogin({ idToken: 't', telefono: '3001234567' });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ googleSub: identity.sub, telefono: '3001234567' }) });
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ sub: account.id, rol: 'COMENSAL', provider: 'google' }));
  });

  it('exige vínculo explícito si el correo pertenece a una cuenta existente', async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...account, rol: 'ADMIN' });
    await expect(service.googleLogin({ idToken: 't' })).rejects.toMatchObject({ response: { code: 'GOOGLE_LINK_REQUIRED' } });
    expect(sign).not.toHaveBeenCalled();
  });

  it('vincula un administrador con su sesión vigente y conserva su ID y rol', async () => {
    findUnique.mockResolvedValue({ ...account, rol: 'ADMIN' });
    sessionFind.mockResolvedValue({ id: 'encanto-session' });
    updateMany.mockResolvedValue({ count: 1 });
    await service.linkGoogle(account.id, 'encanto-session', 't');
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { googleSub: identity.sub, correoVerificado: true },
    }));
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ sub: account.id, rol: 'ADMIN', provider: 'google' }));
  });

  it('rechaza un ID token que no supera la validación de Google', async () => {
    vi.mocked(OAuth2Client.prototype.verifyIdToken).mockRejectedValueOnce(new Error('audience'));
    await expect(service.googleLogin({ idToken: 't' })).rejects.toMatchObject({ status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
