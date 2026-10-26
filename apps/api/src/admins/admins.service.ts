import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export const MIN_ACTIVE_ADMINS = 3;
const publicFields = { id: true, nombre: true, correo: true, rol: true, activo: true } as const;

@Injectable()
export class AdminsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Solo muestro datos de identificación; nunca hashes, tokens ni secretos TOTP.
  async list(actorId: string) {
    await this.requireAdmin(this.prisma, actorId);
    return { minimo: MIN_ACTIVE_ADMINS, activos: await this.prisma.user.count({ where: { rol: Role.ADMIN, activo: true } }), usuarios: await this.prisma.user.findMany({ where: { rol: Role.ADMIN }, select: publicFields, orderBy: { nombre: 'asc' } }) };
  }

  private async requireAdmin(db: Pick<PrismaService, 'user'>, actorId: string) {
    const actor = await db.user.findUnique({ where: { id: actorId }, select: { rol: true, activo: true } });
    if (!actor?.activo || actor.rol !== Role.ADMIN) throw new ForbiddenException('Se requiere un administrador activo');
  }

  // Serializo altas y retiros antes de contar: dos solicitudes concurrentes no pueden saltarse el mínimo.
  async change(actorId: string, correo: string, grant: boolean) {
    return this.prisma.$transaction(async db => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(722022103)`;
      await this.requireAdmin(db, actorId);
      const target = await db.user.findUnique({ where: { correo: correo.trim().toLowerCase() }, select: publicFields });
      if (!target) throw new NotFoundException('La persona debe tener una cuenta registrada antes de recibir permisos');
      if (!target.activo) throw new ConflictException('La cuenta está inactiva; no cuenta como administrador disponible');
      if ((target.rol === Role.ADMIN) === grant) return target;
      if (!grant && await db.user.count({ where: { rol: Role.ADMIN, activo: true } }) <= MIN_ACTIVE_ADMINS) throw new ConflictException('Deben quedar al menos tres administradores activos. Designe otro antes de retirar permisos');
      const next = await db.user.update({ where: { id: target.id }, data: { rol: grant ? Role.ADMIN : Role.COMENSAL }, select: publicFields });
      // Revoco refrescos; la guardia consulta el rol vigente para no reutilizar privilegios del JWT anterior.
      await db.refreshToken.updateMany({ where: { usuarioId: target.id, revocadoEn: null }, data: { revocadoEn: new Date() } });
      await db.auditLog.create({ data: { usuarioId: actorId, accion: grant ? 'DESIGNAR_ADMIN' : 'RETIRAR_ADMIN', entidad: 'usuarios', entidadId: target.id, datosPrevios: { rol: target.rol }, datosNuevos: { rol: next.rol } } });
      return next;
    });
  }
}
