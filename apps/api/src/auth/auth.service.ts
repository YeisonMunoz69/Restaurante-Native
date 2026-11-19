import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { AccountProfile, RegisterDto, LoginDto, GoogleLoginDto, ProfileUpdateDto } from '@encanto/shared';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from '../prisma/prisma.service.js';

const sessionUser = {
  id: true, correo: true, rol: true, activo: true, nombre: true, telefono: true,
  googleNombre: true, googleFotoUrl: true, nombrePerfil: true, ciudad: true,
  region: true, nacionalidad: true, fechaNacimiento: true,
} satisfies Prisma.UserSelect;
type SessionUser = Prisma.UserGetPayload<{ select: typeof sessionUser }>;
type Provider = 'password' | 'google';

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    this.requirePasswordEnabled();
    // Verificar si el correo ya existe
    const existing = await this.prisma.user.findUnique({
      where: { correo: registerDto.correo.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Hashear contraseña con argon2id
    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    // Crear usuario en BD
    const newUser = await this.prisma.user.create({
      data: {
        nombre: registerDto.nombre,
        correo: registerDto.correo.toLowerCase(),
        telefono: registerDto.telefono,
        passwordHash,
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        telefono: true,
        rol: true,
        createdAt: true,
      },
    });

    return newUser;
  }

  async login(loginDto: LoginDto) {
    this.requirePasswordEnabled();
    // Buscar usuario por correo en la tabla usuarios
    const user = await this.prisma.user.findUnique({
      where: { correo: loginDto.correo.toLowerCase() },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Cuenta inactiva');
    }

    // Verificar contraseña con argon2id
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.startSession(user, 'password');
  }

  // Las cuentas antiguas conservan su acceso mientras se vinculan en el entorno de migración.
  private requirePasswordEnabled() {
    if (this.configService.get<string>('AUTH_GOOGLE_ONLY') === 'true') {
      throw new ForbiddenException('Inicia sesión con Google');
    }
  }

  // Solo uso datos de identidad verificados por Google y emitidos para nuestro cliente.
  private async googleIdentity(idToken: string) {
    const audience = this.configService.get<string>('GOOGLE_WEB_CLIENT_ID')?.trim();
    if (!audience) throw new ServiceUnavailableException('El acceso con Google todavía no está configurado');
    try {
      const payload = (await this.google.verifyIdToken({ idToken, audience })).getPayload();
      if (payload?.email_verified && payload.email && payload.sub) {
        const fullName = payload.name?.trim() ||
          [payload.given_name, payload.family_name].filter(Boolean).join(' ').trim();
        return {
          sub: payload.sub,
          correo: payload.email.trim().toLowerCase(),
          googleNombre: fullName.slice(0, 100) || null,
          googleFotoUrl: this.googlePhoto(payload.picture),
        };
      }
    } catch {
      // Evito registrar el token de identidad o la respuesta privada de Google.
    }
    throw new UnauthorizedException('No se pudo verificar la cuenta de Google');
  }

  // Acepto únicamente enlaces HTTPS de fotos que devuelve la identidad verificada.
  private googlePhoto(picture?: string): string | null {
    if (!picture || picture.length > 2048) return null;
    try {
      const url = new URL(picture);
      return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        url.hostname.endsWith('.googleusercontent.com') ? url.href : null;
    } catch {
      return null;
    }
  }

  async googleLogin(input: GoogleLoginDto) {
    const identity = await this.googleIdentity(input.idToken);
    const { googleNombre, googleFotoUrl } = identity;
    const linked = await this.prisma.user.findUnique({ where: { googleSub: identity.sub } });
    if (linked) {
      if (!linked.activo) throw new UnauthorizedException('Cuenta inactiva');
      // Pongo al día la foto y el nombre del proveedor. El nombre elegido en Perfil conserva prioridad.
      const user = linked.googleNombre === googleNombre && linked.googleFotoUrl === googleFotoUrl
        ? linked
        : await this.prisma.user.update({
            where: { id: linked.id, googleSub: identity.sub, activo: true },
            data: { googleNombre, googleFotoUrl },
            select: sessionUser,
          });
      return this.startSession(user, 'google');
    }

    // Un correo coincidente nunca transfiere por sí solo una cuenta ni sus privilegios.
    const existing = await this.prisma.user.findUnique({ where: { correo: identity.correo } });
    if (existing) throw new ConflictException({ code: 'GOOGLE_LINK_REQUIRED', message: 'Esta cuenta de Encanto requiere un vínculo previo' });
    if (!input.telefono) throw new UnprocessableEntityException({ code: 'GOOGLE_PHONE_REQUIRED', message: 'Completa tu teléfono para crear la cuenta' });

    try {
      const user = await this.prisma.user.create({
        data: {
          googleSub: identity.sub,
          nombre: googleNombre || identity.correo.split('@')[0].slice(0, 100),
          googleNombre,
          googleFotoUrl,
          correo: identity.correo,
          telefono: input.telefono,
          correoVerificado: true,
        },
      });
      return this.startSession(user, 'google');
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const created = await this.prisma.user.findUnique({ where: { googleSub: identity.sub } });
      if (created) return this.startSession(created, 'google');
      throw new ConflictException({ code: 'GOOGLE_LINK_REQUIRED', message: 'Esta cuenta de Encanto requiere un vínculo previo' });
    }
  }

  // Vínculo explícito desde una sesión vigente. Actualizo el mismo usuario y conservo sus relaciones.
  async linkGoogle(userId: string, sessionId: string, idToken: string) {
    const identity = await this.googleIdentity(idToken);
    const user = await this.prisma.$transaction(async db => {
      const session = await db.refreshToken.findFirst({
        where: { id: sessionId, usuarioId: userId, revocadoEn: null, expiraEn: { gt: new Date() } },
        select: { id: true },
      });
      const account = await db.user.findUnique({ where: { id: userId } });
      if (!session || !account?.activo) throw new UnauthorizedException('La sesión ya no está activa');
      if (account.correo.toLowerCase() !== identity.correo) throw new ForbiddenException('Selecciona el correo de tu cuenta de Encanto');
      if (account.googleSub && account.googleSub !== identity.sub) {
        throw new ConflictException('Ya existe un vínculo para esa identidad');
      }
      const imported = { googleNombre: identity.googleNombre, googleFotoUrl: identity.googleFotoUrl };
      try {
        const changed = await db.user.updateMany({
          where: { id: userId, activo: true, googleSub: account.googleSub },
          data: { googleSub: identity.sub, correoVerificado: true, ...imported },
        });
        if (changed.count === 1) return { ...account, ...imported };
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      }
      throw new ConflictException('Ya existe un vínculo para esa identidad');
    });
    return this.startSession(user, 'google');
  }

  // Ambos proveedores emiten la misma sesión interna y comparten la política de refresco.
  private async startSession(user: SessionUser, provider: Provider) {
    if (!user.activo) throw new UnauthorizedException('Cuenta inactiva');
    const sessionId = randomUUID();
    const payload = {
      sub: user.id,
      correo: user.correo,
      rol: user.rol,
      sid: sessionId,
      provider,
    };
    const tokens = await this.generateTokens(payload);

    // Guardar hash del refresh token en tokens_refresco
    const tokenHash = await argon2.hash(tokens.refreshToken, {
      type: argon2.argon2id,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: sessionId,
        usuarioId: user.id,
        tokenHash,
        dispositivo: 'web',
        expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { ...tokens, perfil: this.profile(user, provider) };
  }

  // Uso el mismo perfil en alta, restauración y edición sin incluirlo en los JWT.
  private profile(user: SessionUser, provider: Provider): AccountProfile {
    return {
      nombre: user.nombrePerfil || (provider === 'google' && user.googleNombre) || user.nombre,
      telefono: user.telefono,
      ciudad: user.ciudad,
      region: user.region,
      nacionalidad: user.nacionalidad,
      fechaNacimiento: user.fechaNacimiento?.toISOString().slice(0, 10) ?? null,
      fotoGoogleUrl: provider === 'google' ? user.googleFotoUrl : null,
    };
  }

  async updateProfile(userId: string, provider: Provider, input: ProfileUpdateDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId, activo: true },
        data: {
          nombrePerfil: input.nombre,
          telefono: input.telefono,
          ciudad: input.ciudad === undefined ? undefined : input.ciudad || null,
          region: input.region === undefined ? undefined : input.region || null,
          nacionalidad: input.nacionalidad,
          fechaNacimiento: input.fechaNacimiento ? new Date(`${input.fechaNacimiento}T00:00:00Z`) : input.fechaNacimiento,
        },
        select: sessionUser,
      });
      return this.profile(user, provider);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new UnauthorizedException('La cuenta no está activa');
      }
      throw error;
    }
  }

  async refresh(refreshToken: string) {
    try {
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
      const payload = this.jwtService.verify(refreshToken, { secret });
      if (payload.provider !== 'google') this.requirePasswordEnabled();

      // Buscar registros activos (no revocados, no expirados) para el usuario
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: {
          usuarioId: payload.sub,
          revocadoEn: null,
          expiraEn: { gt: new Date() },
        },
      });

      if (!storedTokens.length) {
        throw new UnauthorizedException('Refresh token no encontrado');
      }

      // Verificar cuál hash coincide
      let stored = null;
      for (const t of storedTokens) {
        const hashValid = await argon2.verify(t.tokenHash, refreshToken);
        if (hashValid) {
          stored = t;
          break;
        }
      }

      if (!stored) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Generar nuevos tokens y actualizar la fila (rotación)
      if (payload.sid && payload.sid !== stored.id) {
        throw new UnauthorizedException(
          'La sesión del refresh token no coincide',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: sessionUser,
      });

      if (!user || !user.activo) {
        throw new UnauthorizedException('La cuenta no está activa');
      }

      const provider = payload.provider === 'google' ? 'google' : 'password';
      const newTokens = await this.generateTokens({
        sub: user.id,
        correo: user.correo,
        rol: user.rol,
        sid: stored.id,
        provider,
      });
      const newHash = await argon2.hash(newTokens.refreshToken, {
        type: argon2.argon2id,
      });

      const rotacion = await this.prisma.refreshToken.updateMany({
        where: {
          id: stored.id,
          tokenHash: stored.tokenHash,
          revocadoEn: null,
          expiraEn: { gt: new Date() },
        },
        data: {
          tokenHash: newHash,
          expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      if (rotacion.count !== 1) {
        throw new UnauthorizedException('El refresh token ya fue utilizado');
      }

      return { ...newTokens, perfil: this.profile(user, provider) };
    } catch (error) {
      console.error('Error en refresh:', error);
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(userId: string, sessionId: string) {
    // Revoco la sesión indicada por el token de acceso y dejo las demás intactas.
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, usuarioId: userId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    return { message: 'Sesión cerrada correctamente' };
  }

  private async generateTokens(payload: any) {
    // Emito un Access Token JWT
    const accessToken = this.jwtService.sign(payload);

    // Emito un Refresh Token rotatorio
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
