import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import type { CalendarDay, TimeSlot } from '@prisma/client';
import { CALENDAR_SEARCH_DAYS, CALENDAR_TIME_ZONE } from '@encanto/shared';
import type {
  CalendarClosureWarning,
  CalendarDayResult,
  CalendarExceptionInput,
  CalendarNextResult,
  CalendarRulesInput,
} from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';

type AttentionRule = Pick<
  TimeSlot,
  'diaSemana' | 'activo' | 'abierto' | 'horaApertura' | 'horaCierre'
>;

// Represento DATE en UTC solamente para persistir y hacer aritmética de fechas civiles.
export const calendarDate = (fecha: string) =>
  new Date(`${fecha}T00:00:00.000Z`);
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);

// Tomo la fecha comercial sin depender de la zona horaria del servidor.
export function todayInBogota(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Resuelvo todas las reglas abiertas activas, salvo que exista una excepción.
export function resolveCalendarDay(
  restauranteId: string,
  fecha: string,
  rules: AttentionRule[],
  exception?: CalendarDay | null,
): CalendarDayResult {
  const weekly = rules.filter(
    (rule) => rule.diaSemana === calendarDate(fecha).getUTCDay() && rule.activo,
  );
  const horarios = exception
    ? exception.abierto
      ? [
          {
            horaApertura: exception.horaApertura!,
            horaCierre: exception.horaCierre!,
          },
        ]
      : []
    : weekly
        .filter((rule) => rule.abierto)
        .map(({ horaApertura, horaCierre }) => ({ horaApertura, horaCierre }));
  horarios.sort(
    (a, b) =>
      a.horaApertura.localeCompare(b.horaApertura) ||
      a.horaCierre.localeCompare(b.horaCierre),
  );
  return {
    restauranteId,
    fecha,
    zonaHoraria: CALENDAR_TIME_ZONE,
    abierto: horarios.length > 0,
    soloPorReserva: exception?.soloPorReserva ?? false,
    origen: exception ? 'EXCEPCION' : weekly.length ? 'SEMANAL' : 'SIN_REGLA',
    horarios,
    motivo: exception?.motivo ?? null,
  };
}

@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Distingo una sede inexistente de un día cerrado sin reglas.
  private async requireRestaurant(
    db: Prisma.TransactionClient,
    restauranteId: string,
  ) {
    if (
      !(await db.restaurant.findUnique({
        where: { id: restauranteId },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException('Restaurante inexistente');
    }
  }

  // Mientras Reservation no tenga sede, impido atribuir sus reservas a varias sedes.
  private async requireSingleRestaurant(
    db: Prisma.TransactionClient,
    restauranteId: string,
  ) {
    await this.requireRestaurant(db, restauranteId);
    if ((await db.restaurant.count()) !== 1) {
      throw new ConflictException({
        message: {
          codigo: 'SEDE_UNICA_REQUERIDA',
          detalle:
            'Debemos acordar la relación de Reservation con Restaurant antes de administrar varias sedes',
        },
      });
    }
  }

  // Consulto la excepción exacta y todas las franjas del día semanal.
  async day(restauranteId: string, fecha: string): Promise<CalendarDayResult> {
    await this.requireRestaurant(this.prisma, restauranteId);
    const [rules, exception] = await Promise.all([
      this.prisma.timeSlot.findMany({
        where: {
          restaurantId: restauranteId,
          diaSemana: calendarDate(fecha).getUTCDay(),
          activo: true,
        },
      }),
      this.prisma.calendarDay.findUnique({
        where: {
          restaurantId_fecha: {
            restaurantId: restauranteId,
            fecha: calendarDate(fecha),
          },
        },
      }),
    ]);
    return resolveCalendarDay(restauranteId, fecha, rules, exception);
  }

  // Busco como máximo 366 fechas inclusivas con dos consultas, incluso si todo está cerrado.
  async next(
    restauranteId: string,
    desde = todayInBogota(),
  ): Promise<CalendarNextResult> {
    await this.requireRestaurant(this.prisma, restauranteId);
    const start = calendarDate(desde);
    const end = new Date(
      Math.min(
        start.getTime() + (CALENDAR_SEARCH_DAYS - 1) * 86400000,
        calendarDate('9999-12-31').getTime(),
      ),
    );
    const [rules, exceptions] = await Promise.all([
      this.prisma.timeSlot.findMany({
        where: { restaurantId: restauranteId, activo: true },
      }),
      this.prisma.calendarDay.findMany({
        where: { restaurantId: restauranteId, fecha: { gte: start, lte: end } },
      }),
    ]);
    const byDate = new Map(
      exceptions.map((exception) => [dateKey(exception.fecha), exception]),
    );
    let diasBuscados = 0;
    for (let time = start.getTime(); time <= end.getTime(); time += 86400000) {
      diasBuscados++;
      const fecha = dateKey(new Date(time));
      const dia = resolveCalendarDay(
        restauranteId,
        fecha,
        rules,
        byDate.get(fecha),
      );
      if (dia.abierto) return { desde, hasta: dateKey(end), diasBuscados, dia };
    }
    return { desde, hasta: dateKey(end), diasBuscados, dia: null };
  }

  // Incluyo las reglas inactivas para que podamos editarlas desde administración.
  async rules(restauranteId: string) {
    await this.requireRestaurant(this.prisma, restauranteId);
    const rules = await this.prisma.timeSlot.findMany({
      where: { restaurantId: restauranteId },
      orderBy: [{ diaSemana: 'asc' }, { horaApertura: 'asc' }, { id: 'asc' }],
    });
    return rules.map(
      ({ id, diaSemana, horaApertura, horaCierre, abierto, activo }) => ({
        id,
        diaSemana,
        horaApertura,
        horaCierre,
        abierto,
        activo,
      }),
    );
  }

  // Consulto la excepción administrativa de una fecha sin confundirla con su horario efectivo.
  async exception(restauranteId: string, fecha: string) {
    await this.requireRestaurant(this.prisma, restauranteId);
    const day = await this.prisma.calendarDay.findUnique({
      where: {
        restaurantId_fecha: {
          restaurantId: restauranteId,
          fecha: calendarDate(fecha),
        },
      },
    });
    return day ? { ...day, fecha: dateKey(day.fecha) } : null;
  }

  // Devuelvo un 409 sin escribir hasta que el administrador reconozca la cantidad actual.
  private confirmClosure(
    fechas: CalendarClosureWarning['fechas'],
    confirmed?: number,
  ) {
    const reservasAfectadas = fechas.reduce(
      (sum, day) => sum + day.cantidad,
      0,
    );
    if (reservasAfectadas > 0 && confirmed !== reservasAfectadas) {
      const warning: CalendarClosureWarning = {
        codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS',
        reservasAfectadas,
        fechas,
        confirmacion:
          'Repita la misma petición con confirmarReservasAfectadas igual a reservasAfectadas; las reservas no se modificarán',
      };
      // El filtro global conserva message; ubico allí la advertencia estructurada.
      throw new ConflictException({ message: warning });
    }
    return reservasAfectadas;
  }

  // Mantengo juntas la comprobación y la escritura; un conflicto obliga a revisar otra vez.
  private async write<T>(
    action: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException({
          message: {
            codigo: 'CALENDARIO_CONCURRENTE',
            detalle:
              'Consulte de nuevo y repita la petición con la advertencia actual',
          },
        });
      }
      throw error;
    }
  }

  // Sustituyo solamente un día semanal, conservando los demás días y las excepciones.
  async replaceRules(
    restauranteId: string,
    diaSemana: number,
    input: CalendarRulesInput,
  ) {
    return this.write(async (db) => {
      await this.requireSingleRestaurant(db, restauranteId);
      const rules = await db.timeSlot.findMany({
        where: { restaurantId: restauranteId, diaSemana },
      });
      if (
        input.reglas.some(
          (rule) =>
            rule.id && !rules.some((existing) => existing.id === rule.id),
        )
      ) {
        throw new BadRequestException(
          'El id de cada regla debe pertenecer a esta sede y día semanal',
        );
      }
      const future = calendarDate(todayInBogota());
      const [reservations, exceptions] = await Promise.all([
        db.reservation.groupBy({
          by: ['fecha'],
          where: {
            estado: ReservationStatus.CONFIRMADA,
            fecha: { gte: future },
          },
          _count: { _all: true },
          orderBy: { fecha: 'asc' },
        }),
        db.calendarDay.findMany({
          where: { restaurantId: restauranteId, fecha: { gte: future } },
        }),
      ]);
      const nextRules = input.reglas.map((rule) => ({
        ...rule,
        diaSemana,
      }));
      const byDate = new Map(
        exceptions.map((day) => [dateKey(day.fecha), day]),
      );
      const affected = reservations
        .filter(({ fecha }) => {
          if (fecha.getUTCDay() !== diaSemana) return false;
          const key = dateKey(fecha);
          return (
            resolveCalendarDay(restauranteId, key, rules, byDate.get(key))
              .abierto &&
            !resolveCalendarDay(restauranteId, key, nextRules, byDate.get(key))
              .abierto
          );
        })
        .map(({ fecha, _count }) => ({
          fecha: dateKey(fecha),
          cantidad: _count._all,
        }));
      const reservasAfectadas = this.confirmClosure(
        affected,
        input.confirmarReservasAfectadas,
      );
      // Conservo los ids enviados y sus campos ajenos al calendario, como aforoMaximo.
      const retainedIds = input.reglas.flatMap((rule) =>
        rule.id ? [rule.id] : [],
      );
      await db.timeSlot.deleteMany({
        where: {
          restaurantId: restauranteId,
          diaSemana,
          id: { notIn: retainedIds },
        },
      });
      for (const { id, ...data } of input.reglas.filter((rule) => rule.id)) {
        await db.timeSlot.update({ where: { id }, data });
      }
      const newRules = input.reglas.filter((rule) => !rule.id);
      if (newRules.length)
        await db.timeSlot.createMany({
          data: newRules.map((rule) => ({
            ...rule,
            restaurantId: restauranteId,
            diaSemana,
          })),
        });
      return {
        restauranteId,
        diaSemana,
        reglas: input.reglas,
        reservasAfectadas,
      };
    });
  }

  // Creo o reemplazo una excepción y nunca escribo en Reservation.
  async putException(
    restauranteId: string,
    fecha: string,
    input: CalendarExceptionInput,
  ) {
    return this.write(async (db) => {
      await this.requireSingleRestaurant(db, restauranteId);
      const date = calendarDate(fecha);
      const count = input.abierto
        ? 0
        : await db.reservation.count({
            where: { fecha: date, estado: ReservationStatus.CONFIRMADA },
          });
      const reservasAfectadas = this.confirmClosure(
        count ? [{ fecha, cantidad: count }] : [],
        input.confirmarReservasAfectadas,
      );
      const { confirmarReservasAfectadas: _confirmation, ...body } = input;
      const data = {
        ...body,
        horaApertura: body.horaApertura ?? null,
        horaCierre: body.horaCierre ?? null,
        motivo: body.motivo ?? null,
      };
      const day = await db.calendarDay.upsert({
        where: {
          restaurantId_fecha: { restaurantId: restauranteId, fecha: date },
        },
        create: { ...data, restaurantId: restauranteId, fecha: date },
        update: data,
      });
      return { excepcion: { ...day, fecha }, reservasAfectadas };
    });
  }

  // Al quitar una apertura excepcional también reviso si la regla semanal deja cerrado el día.
  async deleteException(
    restauranteId: string,
    fecha: string,
    confirmed?: number,
  ) {
    return this.write(async (db) => {
      await this.requireSingleRestaurant(db, restauranteId);
      const where = { restaurantId: restauranteId, fecha: calendarDate(fecha) };
      const exception = await db.calendarDay.findUnique({
        where: { restaurantId_fecha: where },
      });
      if (!exception) throw new NotFoundException('Excepción inexistente');
      const rules = await db.timeSlot.findMany({
        where: {
          restaurantId: restauranteId,
          diaSemana: where.fecha.getUTCDay(),
          activo: true,
        },
      });
      const closes =
        exception.abierto &&
        !resolveCalendarDay(restauranteId, fecha, rules).abierto;
      const count = closes
        ? await db.reservation.count({
            where: { fecha: where.fecha, estado: ReservationStatus.CONFIRMADA },
          })
        : 0;
      const reservasAfectadas = this.confirmClosure(
        count ? [{ fecha, cantidad: count }] : [],
        confirmed,
      );
      await db.calendarDay.delete({ where: { restaurantId_fecha: where } });
      return { eliminada: true, reservasAfectadas };
    });
  }
}
