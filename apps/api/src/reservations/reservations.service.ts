import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, ReservationStatus } from '@prisma/client';
import { formatCurrencyCOP } from '@encanto/shared';
import type {
  ReservationCreate,
  ReservationListQuery,
  ReservationReject,
  ReservationResult,
  ReservationSlot,
  ReservationSlotsQuery,
} from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  calendarDate,
  dateKey,
  resolveCalendarDay,
  todayInBogota,
} from '../calendar/calendar.service.js';
import { canTransitionReservation } from './reservation-state.js';
import { paymentConfig, paymentInstructions } from '../payments/payments.service.js';

const activeStatuses = [
  ReservationStatus.SOLICITADA,
  ReservationStatus.CONFIRMADA,
  ReservationStatus.EN_CURSO,
];
const reservationInclude = {
  lines: {
    include: { plato: { select: { nombre: true } } },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.ReservationInclude;
const reservationAdminInclude = {
  ...reservationInclude,
  usuario: {
    select: {
      id: true,
      nombre: true,
      telefono: true,
      cancelaciones: true,
      inasistencias: true,
    },
  },
} satisfies Prisma.ReservationInclude;
type ReservationRow = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

const minuteOf = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};
const timeOf = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
// Colombia usa UTC-5 sin horario de verano; convierto la hora comercial antes de compararla.
const localInstant = (fecha: string, hora: string) =>
  new Date(`${fecha}T${hora}:00-05:00`);

export function hasMinimumNotice(
  startsAt: Date,
  now: Date,
  minimumMinutes: number,
) {
  return startsAt.getTime() - now.getTime() >= minimumMinutes * 60 * 1000;
}

export function canCancelConfirmedReservation(
  startsAt: Date,
  now: Date,
  cutoffMinutes: number,
) {
  return startsAt.getTime() - now.getTime() >= cutoffMinutes * 60 * 1000;
}

export function canMarkNoShow(
  startsAt: Date,
  now: Date,
  toleranceMinutes: number,
) {
  return now.getTime() >= startsAt.getTime() + toleranceMinutes * 60 * 1000;
}

export function addCalendarMonths(fecha: string, months: number) {
  const [year, month, day] = fecha.split('-').map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return dateKey(
    new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))),
  );
}

export function buildReservationTicket(row: {
  codigo: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  numComensales: number;
  total: Prisma.Decimal;
  estado?: ReservationStatus;
  lines: { cantidad: number; precioUnitario: Prisma.Decimal; plato: { nombre: string } }[];
}) {
  const statusText: Record<ReservationStatus, string> = {
    SOLICITADA: 'Pendiente de revisión',
    CONFIRMADA: 'Confirmada',
    RECHAZADA: 'Rechazada',
    EXPIRADA: 'Expirada',
    CANCELADA: 'Cancelada',
    EN_CURSO: 'En curso',
    COMPLETADA: 'Completada',
    NO_ASISTIO: 'No asistió',
  };
  const items = row.lines.length
    ? row.lines.map(
        (line) =>
          `${line.cantidad} x ${line.plato.nombre} — ${formatCurrencyCOP(line.precioUnitario.mul(line.cantidad).toNumber())}`,
      )
    : ['Sin pedido anticipado'];
  return [
    `Reserva ${row.codigo}`,
    `Fecha: ${dateKey(row.fecha)} · ${row.horaInicio}–${row.horaFin}`,
    `Personas: ${row.numComensales}`,
    'Pedido:',
    ...items,
    `Total: ${formatCurrencyCOP(row.total.toNumber())}`,
    `Estado: ${statusText[row.estado ?? ReservationStatus.SOLICITADA]}`,
  ].join('\n');
}

function serialize(row: ReservationRow): ReservationResult {
  const lineas = row.lines.map((line) => {
    const precioUnitario = line.precioUnitario.toNumber();
    const subtotal = line.precioUnitario.mul(line.cantidad).toNumber();
    return {
      platoId: line.platoId,
      nombre: line.plato.nombre,
      cantidad: line.cantidad,
      precioUnitario,
      subtotal,
    };
  });
  return {
    id: row.id,
    codigo: row.codigo,
    fecha: dateKey(row.fecha),
    horaInicio: row.horaInicio,
    horaFin: row.horaFin,
    numComensales: row.numComensales,
    estado: row.estado,
    total: row.total.toNumber(),
    nota: row.nota,
    motivoRechazo: row.motivoRechazo,
    creadaEn: row.createdAt.toISOString(),
    llegadaPorId: row.llegadaPorId,
    llegadaEn: row.llegadaEn?.toISOString() ?? null,
    inasistioPorId: row.inasistioPorId,
    inasistioEn: row.inasistioEn?.toISOString() ?? null,
    completadaPorId: row.completadaPorId,
    completadaEn: row.completadaEn?.toISOString() ?? null,
    lineas,
    ticket: buildReservationTicket(row),
  };
}

@Injectable()
export class ReservationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Las lecturas y escrituras delicadas comparten una instantánea coherente.
  private async write<T>(action: (db: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      ) {
        throw new ConflictException({
          codigo: 'RESERVA_CONCURRENTE',
          detalle:
            'El calendario o el aforo cambiaron mientras procesábamos la solicitud. Consulte de nuevo antes de repetir.',
        });
      }
      throw error;
    }
  }

  private async restaurant(db: Prisma.TransactionClient) {
    const restaurants = await db.restaurant.findMany({
      take: 2,
      select: {
        id: true,
        nombre: true,
        whatsapp: true,
        mediosPago: true,
        instruccionesPago: true,
        pagoVersion: true,
        toleranciaMin: true,
        aforoTotal: true,
        duracionReservaHasta4Min: true,
        duracionReservaDesde5Min: true,
        granularidadMin: true,
        ventanaCancelacionMin: true,
        anticipacionMaxMeses: true,
        anticipacionMinMin: true,
        minPersonasEntreSemana: true,
        horasExpiracionSolicitud: true,
      },
    });
    if (restaurants.length !== 1) {
      throw new ConflictException({
        codigo: 'SEDE_UNICA_REQUERIDA',
        detalle: 'Las reservas solo funcionan mientras exista una sede configurada',
      });
    }
    return restaurants[0];
  }

  private async expirePending(
    db: Prisma.TransactionClient,
    horas: number,
    usuarioId?: string,
    reservaId?: string,
    now = new Date(),
  ) {
    const cutoff = new Date(now.getTime() - horas * 60 * 60 * 1000);
    await db.reservation.updateMany({
      where: {
        estado: ReservationStatus.SOLICITADA,
        createdAt: { lte: cutoff },
        ...(usuarioId ? { usuarioId } : {}),
        ...(reservaId ? { id: reservaId } : {}),
      },
      data: { estado: ReservationStatus.EXPIRADA },
    });
  }

  private async calendar(
    db: Prisma.TransactionClient,
    restaurantId: string,
    fecha: string,
  ) {
    const date = calendarDate(fecha);
    const [rules, exception] = await Promise.all([
      db.timeSlot.findMany({
        where: {
          restaurantId,
          diaSemana: date.getUTCDay(),
          activo: true,
        },
        orderBy: [{ horaApertura: 'asc' }, { id: 'asc' }],
      }),
      db.calendarDay.findUnique({
        where: { restaurantId_fecha: { restaurantId, fecha: date } },
      }),
    ]);
    return {
      rules,
      exception,
      day: resolveCalendarDay(restaurantId, fecha, rules, exception),
    };
  }

  private async capacityFor(
    db: Prisma.TransactionClient,
    restaurantId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    aforoTotal: number,
  ) {
    const { rules, exception, day } = await this.calendar(db, restaurantId, fecha);
    if (!day.abierto) return { day, capacity: 0, compatible: false };
    const start = minuteOf(horaInicio);
    const end = minuteOf(horaFin);
    const fitsHours = day.horarios.some(
      (hours) =>
        minuteOf(hours.horaApertura) <= start && minuteOf(hours.horaCierre) >= end,
    );
    if (!fitsHours) return { day, capacity: 0, compatible: false };
    if (exception) return { day, capacity: aforoTotal, compatible: true };
    const compatible = rules.some(
      (rule) =>
        rule.abierto &&
        minuteOf(rule.horaApertura) <= start &&
        minuteOf(rule.horaCierre) >= end,
    );
    return {
      day,
      capacity: this.weeklyCapacity(rules, horaInicio, horaFin, aforoTotal),
      compatible,
    };
  }

  private weeklyCapacity(
    rules: { abierto: boolean; horaApertura: string; horaCierre: string; aforoMaximo: number | null }[],
    horaInicio: string,
    horaFin: string,
    aforoTotal: number,
  ) {
    const start = minuteOf(horaInicio);
    const end = minuteOf(horaFin);
    const matchingRules = rules.filter(
      (rule) =>
        rule.abierto &&
        minuteOf(rule.horaApertura) <= start &&
        minuteOf(rule.horaCierre) >= end,
    );
    const limits = matchingRules
      .map((rule) => rule.aforoMaximo)
      .filter((value): value is number => value !== null);
    return limits.length ? Math.min(aforoTotal, ...limits) : aforoTotal;
  }

  private async slotsInTransaction(
    db: Prisma.TransactionClient,
    query: ReservationSlotsQuery,
    now = new Date(),
  ) {
    const restaurant = await this.restaurant(db);
    await this.expirePending(
      db,
      restaurant.horasExpiracionSolicitud,
      undefined,
      undefined,
      now,
    );
    const today = todayInBogota(now);
    const latest = addCalendarMonths(today, restaurant.anticipacionMaxMeses);
    if (query.fecha < today || query.fecha > latest) {
      throw new BadRequestException(
        `Elija una fecha entre ${today} y ${latest} (máximo ${restaurant.anticipacionMaxMeses} meses calendario)`,
      );
    }
    const { rules, exception, day } = await this.calendar(
      db,
      restaurant.id,
      query.fecha,
    );
    const weekday = calendarDate(query.fecha).getUTCDay();
    if (
      day.soloPorReserva &&
      weekday >= 1 &&
      weekday <= 5 &&
      query.numComensales < restaurant.minPersonasEntreSemana
    ) {
      return {
        fecha: query.fecha,
        zonaHoraria: 'America/Bogota' as const,
        duracionMin: query.numComensales <= 4
          ? restaurant.duracionReservaHasta4Min
          : restaurant.duracionReservaDesde5Min,
        franjas: [] as ReservationSlot[],
        mensaje: `Este día se atiende solo por reserva para grupos de ${restaurant.minPersonasEntreSemana} personas o más`,
      };
    }
    const duration =
      query.numComensales <= 4
        ? restaurant.duracionReservaHasta4Min
        : restaurant.duracionReservaDesde5Min;
    if (query.numComensales > restaurant.aforoTotal || !day.abierto) {
      return {
        fecha: query.fecha,
        zonaHoraria: 'America/Bogota' as const,
        duracionMin: duration,
        franjas: [] as ReservationSlot[],
        mensaje: !day.abierto
          ? 'El restaurante no tiene un horario abierto configurado para esta fecha'
          : 'El grupo supera el aforo total configurado',
      };
    }

    const reservationDate = calendarDate(query.fecha);
    const occupied = await db.reservation.findMany({
      where: { fecha: reservationDate, estado: { in: activeStatuses } },
      select: { horaInicio: true, horaFin: true, numComensales: true },
    });
    const slots = new Map<string, ReservationSlot>();
    for (const hours of day.horarios) {
      const open = minuteOf(hours.horaApertura);
      const close = minuteOf(hours.horaCierre);
      for (
        let start = open;
        start + duration <= close;
        start += restaurant.granularidadMin
      ) {
        const end = start + duration;
        const horaInicio = timeOf(start);
        const horaFin = timeOf(end);
        if (
          !hasMinimumNotice(
            localInstant(query.fecha, horaInicio),
            now,
            restaurant.anticipacionMinMin,
          )
        ) {
          continue;
        }
        const capacity = exception
          ? restaurant.aforoTotal
          : this.weeklyCapacity(
              rules,
              horaInicio,
              horaFin,
              restaurant.aforoTotal,
            );
        const used = occupied
          .filter(
            (row) =>
              start < minuteOf(row.horaFin) && end > minuteOf(row.horaInicio),
          )
          .reduce((sum, row) => sum + row.numComensales, 0);
        const available = Math.max(0, capacity - used);
        if (available >= query.numComensales) {
          slots.set(horaInicio, {
            horaInicio,
            horaFin,
            duracionMin: duration,
            aforoDisponible: available,
          });
        }
      }
    }
    return {
      fecha: query.fecha,
      zonaHoraria: 'America/Bogota' as const,
      duracionMin: duration,
      franjas: [...slots.values()].sort((a, b) =>
        a.horaInicio.localeCompare(b.horaInicio),
      ),
      mensaje: slots.size ? null : 'No hay franjas disponibles para este grupo',
    };
  }

  async availableSlots(query: ReservationSlotsQuery) {
    return this.prisma.$transaction(
      (db) => this.slotsInTransaction(db, query),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async create(userId: string, input: ReservationCreate) {
    return this.write(async (db) => {
      const restaurant = await this.restaurant(db);
      const slotResult = await this.slotsInTransaction(
        db,
        { fecha: input.fecha, numComensales: input.numComensales },
      );
      const slot = slotResult.franjas.find(
        (candidate) => candidate.horaInicio === input.horaInicio,
      );
      if (!slot) {
        throw new ConflictException(
          'La franja ya no está disponible o dejó de cumplir las reglas; consulte otra vez',
        );
      }
      if (
        input.numComensales >= 8 &&
        input.lineas.length === 0
      ) {
        throw new BadRequestException(
          'Para grupos de ocho personas o más, el pedido anticipado es obligatorio',
        );
      }

      const dishes = input.lineas.length
        ? await db.dish.findMany({
            where: {
              id: { in: input.lineas.map((line) => line.platoId) },
              activo: true,
              category: { restaurantId: restaurant.id, activa: true },
            },
            select: {
              id: true,
              nombre: true,
              precio: true,
              disponible: true,
              schedules: {
                where: { fecha: calendarDate(input.fecha) },
                select: { disponible: true },
                take: 1,
              },
            },
          })
        : [];
      if (dishes.length !== input.lineas.length) {
        throw new BadRequestException(
          'Uno o más platos ya no pertenecen a la carta activa',
        );
      }
      const lineData = input.lineas.map((line) => {
        const dish = dishes.find((item) => item.id === line.platoId)!;
        const available = dish.schedules[0]?.disponible ?? dish.disponible;
        if (!available) {
          throw new BadRequestException(
            `El plato «${dish.nombre}» no está disponible para ${input.fecha}`,
          );
        }
        return {
          platoId: dish.id,
          cantidad: line.cantidad,
          precioUnitario: dish.precio,
        };
      });
      const total = lineData.reduce(
        (sum, line) =>
          sum.add(line.precioUnitario.mul(line.cantidad)),
        new Prisma.Decimal(0),
      );
      const { capacity } = await this.capacityFor(
        db,
        restaurant.id,
        input.fecha,
        slot.horaInicio,
        slot.horaFin,
        restaurant.aforoTotal,
      );
      const occupied = await db.reservation.findMany({
        where: { fecha: calendarDate(input.fecha), estado: { in: activeStatuses } },
        select: { id: true, horaInicio: true, horaFin: true, numComensales: true },
      });
      const used = occupied
        .filter(
          (row) =>
            minuteOf(slot.horaInicio) < minuteOf(row.horaFin) &&
            minuteOf(slot.horaFin) > minuteOf(row.horaInicio),
        )
        .reduce((sum, row) => sum + row.numComensales, 0);
      if (used + input.numComensales > capacity) {
        throw new ConflictException(
          'El aforo de esa franja cambió; seleccione otra hora',
        );
      }

      const codigo = `EC-${input.fecha.replaceAll('-', '')}-${randomCode()}`;
      const created = await db.reservation.create({
        data: {
          usuarioId: userId,
          codigo,
          fecha: calendarDate(input.fecha),
          horaInicio: slot.horaInicio,
          horaFin: slot.horaFin,
          numComensales: input.numComensales,
          total,
          nota: input.nota,
          estado: ReservationStatus.SOLICITADA,
          lines: { create: lineData },
        },
        include: reservationInclude,
      });
      return {
        reserva: serialize(created),
        whatsapp: restaurant.whatsapp,
        instruccionesPago: paymentInstructions(paymentConfig(restaurant)),
        pago: paymentConfig(restaurant),
      };
    });
  }

  async mine(userId: string, query: ReservationListQuery = {}) {
    return this.prisma.$transaction(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(
        db,
        restaurant.horasExpiracionSolicitud,
        userId,
      );
      const rows = await db.reservation.findMany({
        where: {
          usuarioId: userId,
          ...(query.fecha ? { fecha: calendarDate(query.fecha) } : {}),
          ...(query.estado ? { estado: query.estado } : {}),
        },
        include: reservationInclude,
        orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }, { createdAt: 'desc' }],
      });
      return rows.map(serialize);
    });
  }

  async mineDetail(userId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(db, restaurant.horasExpiracionSolicitud, userId, id);
      const row = await db.reservation.findFirst({
        where: { id, usuarioId: userId },
        include: reservationInclude,
      });
      if (!row) throw new NotFoundException('Reserva inexistente');
      return serialize(row);
    });
  }

  async cancel(userId: string, id: string) {
    return this.write(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(db, restaurant.horasExpiracionSolicitud, userId, id);
      const row = await db.reservation.findFirst({
        where: { id, usuarioId: userId },
        include: reservationInclude,
      });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.CANCELADA)) {
        throw new ConflictException('La reserva no se puede cancelar desde su estado actual');
      }
      if (
        row.estado === ReservationStatus.CONFIRMADA &&
        !canCancelConfirmedReservation(
          localInstant(dateKey(row.fecha), row.horaInicio),
          new Date(),
          restaurant.ventanaCancelacionMin,
        )
      ) {
        throw new ConflictException(
          `Las reservas confirmadas se pueden cancelar hasta ${restaurant.ventanaCancelacionMin} minutos antes`,
        );
      }
      const changed = await db.reservation.updateMany({
        where: { id, usuarioId: userId, estado: row.estado },
        data: { estado: ReservationStatus.CANCELADA },
      });
      if (changed.count !== 1)
        throw new ConflictException('La reserva cambió; vuelva a cargarla');
      await db.user.update({
        where: { id: userId },
        data: { cancelaciones: { increment: 1 } },
      });
      const updated = await db.reservation.findUniqueOrThrow({
        where: { id },
        include: reservationInclude,
      });
      return serialize(updated);
    });
  }

  async adminList(query: ReservationListQuery = {}) {
    return this.prisma.$transaction(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(db, restaurant.horasExpiracionSolicitud);
      const rows = await db.reservation.findMany({
        where: {
          ...(query.fecha ? { fecha: calendarDate(query.fecha) } : {}),
          ...(query.estado
            ? { estado: query.estado }
            : { estado: ReservationStatus.SOLICITADA }),
        },
        include: reservationAdminInclude,
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => ({
        ...serialize(row),
        cliente: row.usuario,
      }));
    });
  }

  async approve(adminId: string, id: string) {
    return this.write(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(db, restaurant.horasExpiracionSolicitud, undefined, id);
      const row = await db.reservation.findUnique({
        where: { id },
        include: reservationInclude,
      });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.CONFIRMADA)) {
        throw new ConflictException('Solo una solicitud vigente puede confirmarse');
      }
      const date = dateKey(row.fecha);
      const { capacity, day, compatible } = await this.capacityFor(
        db,
        restaurant.id,
        date,
        row.horaInicio,
        row.horaFin,
        restaurant.aforoTotal,
      );
      if (!day.abierto || !compatible || capacity < row.numComensales) {
        throw new ConflictException(
          'El calendario o el aforo ya no permiten confirmar esta reserva',
        );
      }
      const others = await db.reservation.findMany({
        where: {
          id: { not: id },
          fecha: row.fecha,
          estado: { in: activeStatuses },
        },
        select: { horaInicio: true, horaFin: true, numComensales: true },
      });
      const occupied = others
        .filter(
          (item) =>
            minuteOf(row.horaInicio) < minuteOf(item.horaFin) &&
            minuteOf(row.horaFin) > minuteOf(item.horaInicio),
        )
        .reduce((sum, item) => sum + item.numComensales, 0);
      if (occupied + row.numComensales > capacity) {
        throw new ConflictException('El aforo ya no permite confirmar esta reserva');
      }
      const changed = await db.reservation.updateMany({
        where: { id, estado: ReservationStatus.SOLICITADA },
        data: {
          estado: ReservationStatus.CONFIRMADA,
          aprobadaPorId: adminId,
          aprobadaEn: new Date(),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('La solicitud cambió; vuelva a cargarla');
      return serialize(
        await db.reservation.findUniqueOrThrow({
          where: { id },
          include: reservationInclude,
        }),
      );
    });
  }

  async reject(adminId: string, id: string, input: ReservationReject) {
    return this.write(async (db) => {
      const restaurant = await this.restaurant(db);
      await this.expirePending(db, restaurant.horasExpiracionSolicitud, undefined, id);
      const row = await db.reservation.findUnique({
        where: { id },
        include: reservationInclude,
      });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.RECHAZADA)) {
        throw new ConflictException('Solo una solicitud vigente puede rechazarse');
      }
      const changed = await db.reservation.updateMany({
        where: { id, estado: ReservationStatus.SOLICITADA },
        data: {
          estado: ReservationStatus.RECHAZADA,
          motivoRechazo: input.motivo,
          aprobadaPorId: adminId,
          aprobadaEn: new Date(),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('La solicitud cambió; vuelva a cargarla');
      return serialize(
        await db.reservation.findUniqueOrThrow({
          where: { id },
          include: reservationInclude,
        }),
      );
    });
  }

  async agenda(fecha: string) {
    return this.prisma.$transaction(async (db) => {
      const restaurant = await this.restaurant(db);
      const now = new Date();
      await this.expirePending(db, restaurant.horasExpiracionSolicitud);
      const rows = await db.reservation.findMany({
        where: {
          fecha: calendarDate(fecha),
          estado: {
            in: [
              ReservationStatus.CONFIRMADA,
              ReservationStatus.EN_CURSO,
              ReservationStatus.COMPLETADA,
              ReservationStatus.NO_ASISTIO,
            ],
          },
        },
        include: reservationAdminInclude,
        orderBy: [{ horaInicio: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => ({
        ...serialize(row),
        cliente: row.usuario,
        puedeMarcarInasistencia:
          row.estado === ReservationStatus.CONFIRMADA &&
          canMarkNoShow(
            localInstant(dateKey(row.fecha), row.horaInicio),
            now,
            restaurant.toleranciaMin,
          ),
      }));
    });
  }

  async markArrival(staffId: string, id: string) {
    return this.write(async (db) => {
      const row = await db.reservation.findUnique({
        where: { id },
        include: reservationInclude,
      });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.EN_CURSO)) {
        throw new ConflictException('Solo una reserva confirmada puede registrar llegada');
      }
      const changed = await db.reservation.updateMany({
        where: { id, estado: ReservationStatus.CONFIRMADA },
        data: {
          estado: ReservationStatus.EN_CURSO,
          llegadaPorId: staffId,
          llegadaEn: new Date(),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('La reserva cambió; vuelva a cargarla');
      return serialize(
        await db.reservation.findUniqueOrThrow({
          where: { id },
          include: reservationInclude,
        }),
      );
    });
  }

  async markNoShow(staffId: string, id: string) {
    return this.write(async (db) => {
      const restaurant = await this.restaurant(db);
      const row = await db.reservation.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.NO_ASISTIO)) {
        throw new ConflictException('Solo una reserva confirmada puede marcarse como inasistencia');
      }
      const now = new Date();
      if (
        !canMarkNoShow(
          localInstant(dateKey(row.fecha), row.horaInicio),
          now,
          restaurant.toleranciaMin,
        )
      ) {
        throw new ConflictException(
          `Solo se puede registrar inasistencia ${restaurant.toleranciaMin} minutos después de la hora de inicio`,
        );
      }
      const changed = await db.reservation.updateMany({
        where: { id, estado: ReservationStatus.CONFIRMADA },
        data: {
          estado: ReservationStatus.NO_ASISTIO,
          inasistioPorId: staffId,
          inasistioEn: now,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('La reserva cambió; vuelva a cargarla');
      await db.user.update({
        where: { id: row.usuarioId },
        data: { inasistencias: { increment: 1 } },
      });
      return serialize(
        await db.reservation.findUniqueOrThrow({
          where: { id },
          include: reservationInclude,
        }),
      );
    });
  }

  async complete(staffId: string, id: string) {
    return this.write(async (db) => {
      const row = await db.reservation.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Reserva inexistente');
      if (!canTransitionReservation(row.estado, ReservationStatus.COMPLETADA)) {
        throw new ConflictException('Solo una atención en curso puede completarse');
      }
      const now = new Date();
      const changed = await db.reservation.updateMany({
        where: { id, estado: ReservationStatus.EN_CURSO },
        data: {
          estado: ReservationStatus.COMPLETADA,
          completadaPorId: staffId,
          completadaEn: now,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('La reserva cambió; vuelva a cargarla');
      return serialize(
        await db.reservation.findUniqueOrThrow({
          where: { id },
          include: reservationInclude,
        }),
      );
    });
  }
}

function randomCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}
