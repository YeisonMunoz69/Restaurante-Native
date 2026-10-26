import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { PaymentConfig, PaymentConfigResult } from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';

// Leo datos para recibir pagos; no guardamos PIN, contraseñas ni comprobantes aquí.
export function paymentConfig(row: {
  whatsapp: string;
  mediosPago: string;
  instruccionesPago: string;
  pagoVersion: number;
}): PaymentConfigResult {
  return {
    whatsapp: row.whatsapp,
    mediosPago: row.mediosPago,
    instruccionesPago: row.instruccionesPago,
    version: row.pagoVersion,
    configurada:
      /^\+[1-9]\d{9,14}$/.test(row.whatsapp) &&
      Boolean(row.mediosPago.trim() && row.instruccionesPago.trim()),
  };
}

// Compongo el texto vigente sin inventar métodos o cuentas cuando faltan datos.
export function paymentInstructions(config: PaymentConfigResult) {
  return [config.mediosPago, config.instruccionesPago]
    .filter(Boolean)
    .join('\n\n');
}

@Injectable()
export class PaymentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async current() {
    const rows = await this.prisma.restaurant.findMany({ take: 2 });
    if (rows.length !== 1)
      throw new ConflictException(
        'Configure una única sede antes de editar los pagos',
      );
    return paymentConfig(rows[0]);
  }

  // Comparo versión para que dos dueños no se sobrescriban sin enterarse.
  async save(actorId: string, input: PaymentConfig) {
    return this.prisma.$transaction(async (db) => {
      const rows = await db.restaurant.findMany({ take: 2 });
      if (rows.length !== 1)
        throw new ConflictException(
          'Configure una única sede antes de editar los pagos',
        );
      const previous = rows[0];
      const changed = await db.restaurant.updateMany({
        where: { id: previous.id, pagoVersion: input.version },
        data: {
          whatsapp: input.whatsapp,
          mediosPago: input.mediosPago,
          instruccionesPago: input.instruccionesPago,
          pagoVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'Otro administrador cambió los datos. Recargue antes de guardar',
        );
      const next = paymentConfig({ ...input, pagoVersion: input.version + 1 });
      await db.auditLog.create({
        data: {
          usuarioId: actorId,
          accion: 'CONFIGURAR_PAGOS',
          entidad: 'restaurantes',
          entidadId: previous.id,
          datosPrevios: { ...paymentConfig(previous) },
          datosNuevos: { ...next },
        },
      });
      return next;
    });
  }
}
