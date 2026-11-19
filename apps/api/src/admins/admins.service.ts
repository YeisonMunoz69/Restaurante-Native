import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { lockAdminRoleChanges, protectedAdminEmails } from './protected-admins.js';

export const MIN_ACTIVE_ADMINS = 3;
const publicFields = { id: true, nombre: true, correo: true, rol: true, activo: true } as const;

@Injectable()
export class AdminsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  // Solo muestro datos de identificación; nunca hashes, tokens ni secretos TOTP.
  async list(actorId: string, includeStaff = false) {
    await this.requireAdmin(this.prisma, actorId);
    const protectedEmails = protectedAdminEmails(this.config?.get<string>('PROTECTED_ADMIN_EMAILS'));
    const [activos, usuarios] = await Promise.all([
      this.prisma.user.count({ where: { rol: Role.ADMIN, activo: true } }),
      this.prisma.user.findMany({
        where: { rol: { in: includeStaff ? [Role.ADMIN, Role.STAFF] : [Role.ADMIN] } },
        select: publicFields,
        orderBy: { nombre: 'asc' },
      }),
    ]);
    return { minimo: MIN_ACTIVE_ADMINS, activos, usuarios: usuarios.map(user => ({
      ...user, protegido: protectedEmails.has(user.correo.toLowerCase()),
    })) };
  }

  private async requireAdmin(db: Pick<PrismaService, 'user'>, actorId: string) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { rol: true, activo: true } });
    if (!actor?.activo || actor.rol !== Role.ADMIN) throw new ForbiddenException('Se requiere un administrador activo');
  }

  // Serializo altas y retiros antes de contar: dos solicitudes concurrentes no pueden saltarse el mínimo.
  async change(actorId: string, correo: string, change: boolean | Role) {
    return this.prisma.$transaction(async db => {
      await lockAdminRoleChanges(db);
      await this.requireAdmin(db, actorId);
      const target = await db.user.findUnique({ where: { correo: correo.trim().toLowerCase() }, select: publicFields });
      if (!target) throw new NotFoundException('La persona debe tener una cuenta registrada antes de recibir permisos');
      if (!target.activo) throw new ConflictException('La cuenta está inactiva; no cuenta como administrador disponible');
      if (change === false && target.rol !== Role.ADMIN) return target;
      const role = typeof change === 'boolean' ? (change ? Role.ADMIN : Role.COMENSAL) : change;
      if (target.rol === role) return target;
      if (protectedAdminEmails(this.config?.get<string>('PROTECTED_ADMIN_EMAILS')).has(target.correo.toLowerCase())) {
        throw new ForbiddenException('El rol de esta cuenta protegida se asigna al ingresar con Google');
      }
      if (target.rol === Role.ADMIN && await db.user.count({ where: { rol: Role.ADMIN, activo: true } }) <= MIN_ACTIVE_ADMINS) throw new ConflictException('Deben quedar al menos tres administradores activos. Designe otro antes de retirar permisos');
      const next = await db.user.update({ where: { id: target.id }, data: { rol: role }, select: publicFields });
      // Revoco refrescos; la guardia consulta el rol vigente para no reutilizar privilegios del JWT anterior.
      await db.refreshToken.updateMany({ where: { usuarioId: target.id, revocadoEn: null }, data: { revocadoEn: new Date() } });
      const accion = role === Role.ADMIN ? 'DESIGNAR_ADMIN' : target.rol === Role.ADMIN ? 'RETIRAR_ADMIN' : 'CAMBIAR_ROL';
      await db.auditLog.create({ data: { usuarioId: actorId, accion, entidad: 'usuarios', entidadId: target.id, datosPrevios: { rol: target.rol }, datosNuevos: { rol: next.rol } } });
      return next;
    });
  }
}
