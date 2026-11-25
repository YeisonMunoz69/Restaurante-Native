import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { OAuth2Client } from 'google-auth-library';
import { ageInColombia, GoogleLoginSchema, ProfileUpdateSchema } from '@encanto/shared';

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
  const account = {
    id: 'encanto-id', correo: 'persona@example.test', activo: true, rol: 'COMENSAL', googleSub: null,
    nombre: 'Persona anterior', telefono: '3001234567', nombrePerfil: null, googleNombre: null, googleFotoUrl: null, ciudad: null,
    region: null, nacionalidad: 'Colombia', fechaNacimiento: null,
  };
  const identity = {
    sub: 'google-id', email: account.correo, email_verified: true, name: 'María Pérez',
    picture: 'https://lh3.googleusercontent.com/avatar',
  };
  const findUnique = vi.fn();
  const create = vi.fn();
  const updateMany = vi.fn();
  const update = vi.fn();
  const refreshCreate = vi.fn();
  const sign = vi.fn();
  const getConfig = vi.fn();
  const sessionFind = vi.fn();
  const auditCreate = vi.fn();
  const refreshRevoke = vi.fn();
  const executeRaw = vi.fn();
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    getConfig.mockImplementation(key => key === 'GOOGLE_WEB_CLIENT_ID' ? 'web.example' : 'secret-test');
    const db = {
      user: { findUnique, create, update, updateMany },
      refreshToken: { create: refreshCreate, findFirst: sessionFind, updateMany: refreshRevoke },
      auditLog: { create: auditCreate }, $executeRaw: executeRaw,
    };
    const prisma = { ...db, $transaction: (callback: (client: typeof db) => unknown) => callback(db) };
    service = new AuthService({ sign } as never, { get: getConfig } as never, prisma as never);
    sign.mockReturnValue('jwt-de-prueba');
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => identity } as never);
  });

  it('permite el alta Google sin teléfono y evita que el cliente asigne su propio rol', async () => {
    expect(GoogleLoginSchema.safeParse({ idToken: 't', rol: 'ADMIN' }).success).toBe(false);
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ ...account, telefono: null });
    await service.googleLogin({ idToken: 't' });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ googleSub: identity.sub, telefono: null }) });
    create.mockClear();
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

  it('crea ADMIN protegido solo para el correo exacto de Workspace y registra la asignación', async () => {
    getConfig.mockImplementation(key => key === 'PROTECTED_ADMIN_EMAILS'
      ? ' PERSONA@EXAMPLE.TEST , otra@example.test ' : 'web.example');
    vi.mocked(OAuth2Client.prototype.verifyIdToken).mockResolvedValue({
      getPayload: () => ({ ...identity, hd: 'example.test' }),
    } as never);
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ ...account, rol: 'ADMIN' });
    await service.googleLogin({ idToken: 't', telefono: '3001234567' });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ rol: 'ADMIN', correo: account.correo }) });
    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      accion: 'ASIGNAR_ADMIN_PROTEGIDO', entidadId: account.id, datosNuevos: { rol: 'ADMIN' },
    }) });
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ rol: 'ADMIN', provider: 'google' }));
  });

  it('exige confirmación del dominio institucional para una identidad configurada', async () => {
    getConfig.mockImplementation(key => key === 'PROTECTED_ADMIN_EMAILS' ? account.correo : 'web.example');
    await expect(service.googleLogin({ idToken: 't', telefono: '3001234567' })).rejects.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it('actualiza a ADMIN una cuenta Google ya vinculada y revoca su sesión anterior', async () => {
    getConfig.mockImplementation(key => key === 'PROTECTED_ADMIN_EMAILS' ? account.correo : 'web.example');
    vi.mocked(OAuth2Client.prototype.verifyIdToken).mockResolvedValue({
      getPayload: () => ({ ...identity, hd: 'example.test' }),
    } as never);
    findUnique.mockResolvedValue({ ...account, googleSub: identity.sub });
    update.mockResolvedValue({ ...account, rol: 'ADMIN', googleSub: identity.sub });
    await service.googleLogin({ idToken: 't' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rol: 'ADMIN' }) }));
    expect(refreshRevoke).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: account.id, revocadoEn: null } }));
    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ datosPrevios: { rol: 'COMENSAL' } }) });
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ sub: account.id, rol: 'ADMIN' }));
  });

  it('vincula un administrador con su sesión vigente y conserva su ID y rol', async () => {
    findUnique.mockResolvedValue({ ...account, rol: 'ADMIN' });
    sessionFind.mockResolvedValue({ id: 'encanto-session' });
    updateMany.mockResolvedValue({ count: 1 });
    await service.linkGoogle(account.id, 'encanto-session', 't');
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { googleSub: identity.sub, correoVerificado: true, googleNombre: identity.name, googleFotoUrl: identity.picture },
    }));
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ sub: account.id, rol: 'ADMIN', provider: 'google' }));
  });

  it('rechaza un ID token que no supera la validación de Google', async () => {
    vi.mocked(OAuth2Client.prototype.verifyIdToken).mockRejectedValueOnce(new Error('audience'));
    await expect(service.googleLogin({ idToken: 't' })).rejects.toMatchObject({ status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('devuelve el nombre y la foto de Google en el perfil, fuera de los JWT', async () => {
    findUnique.mockResolvedValue({ ...account, googleSub: identity.sub });
    update.mockResolvedValue({ ...account, googleNombre: identity.name, googleFotoUrl: identity.picture });
    const session = await service.googleLogin({ idToken: 't' });
    expect(session.perfil).toEqual({
      nombre: identity.name, fotoGoogleUrl: identity.picture, telefono: account.telefono, ciudad: null,
      region: null, nacionalidad: 'Colombia', fechaNacimiento: null,
    });
    expect(sign.mock.calls.every(([payload]) => !('nombre' in payload) && !('fotoGoogleUrl' in payload))).toBe(true);
  });

  it('edita solo los datos de perfil del dueño y conserva su foto de Google', async () => {
    expect(ProfileUpdateSchema.safeParse({ nombre: 'Ana Pérez', ciudad: null, rol: 'ADMIN' }).success).toBe(false);
    update.mockResolvedValue({ ...account, nombrePerfil: 'Ana Pérez', googleFotoUrl: identity.picture, ciudad: 'Timbío' });
    const profile = await service.updateProfile(account.id, 'google', { nombre: 'Ana Pérez', ciudad: 'Timbío' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: account.id, activo: true },
      data: expect.objectContaining({ nombrePerfil: 'Ana Pérez', ciudad: 'Timbío' }),
    }));
    expect(profile).toMatchObject({ nombre: 'Ana Pérez', ciudad: 'Timbío', fotoGoogleUrl: identity.picture });
  });

  it('permite completar la ciudad sin reemplazar el nombre recibido de Google', async () => {
    const input = ProfileUpdateSchema.parse({ ciudad: 'Timbío' });
    update.mockResolvedValue({ ...account, googleNombre: identity.name, ciudad: input.ciudad });
    const profile = await service.updateProfile(account.id, 'google', input);
    expect(update.mock.calls[0][0].data).toMatchObject({ nombrePerfil: undefined, telefono: undefined, ciudad: 'Timbío' });
    expect(profile.nombre).toBe(identity.name);
  });

  it('guarda la fecha civil y devuelve nacionalidad y región al actualizar el perfil', async () => {
    const input = ProfileUpdateSchema.parse({ fechaNacimiento: '2000-11-19', nacionalidad: 'Ecuador', region: 'Cauca' });
    update.mockResolvedValue({ ...account, ...input, fechaNacimiento: new Date('2000-11-19T00:00:00Z') });
    await expect(service.updateProfile(account.id, 'google', input)).resolves.toMatchObject(input);
    expect(update.mock.calls[0][0].data.fechaNacimiento).toEqual(new Date('2000-11-19T00:00:00Z'));
    expect(ProfileUpdateSchema.safeParse({ fechaNacimiento: '2099-01-01' }).success).toBe(false);
    expect(ProfileUpdateSchema.safeParse({ fechaNacimiento: '2001-02-29' }).success).toBe(false);
    expect(ageInColombia('2000-11-19', new Date('2026-11-19T04:59:59Z'))).toBe(25);
    expect(ageInColombia('2000-11-19', new Date('2026-11-19T05:00:00Z'))).toBe(26);
  });
});
