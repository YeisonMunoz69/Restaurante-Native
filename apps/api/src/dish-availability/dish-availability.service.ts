import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type {
  DishAvailabilityCopy,
  DishAvailabilityCopyResult,
  DishAvailabilityPage,
  DishAvailabilityWrite,
  MenuDishesQuery,
} from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dayKey = (value: Date) => value.toISOString().slice(0, 10);
const availabilitySelect = (dates: string[]) =>
  ({
    id: true,
    nombre: true,
    disponible: true,
    updatedAt: true,
    category: { select: { id: true, nombre: true, orden: true } },
    schedules: {
      where: { fecha: { in: dates.map(date) } },
      select: { id: true, fecha: true, disponible: true, cupo: true },
      orderBy: { fecha: 'asc' },
    },
  }) satisfies Prisma.DishSelect;
type Row = Prisma.DishGetPayload<{
  select: ReturnType<typeof availabilitySelect>;
}>;

@Injectable()
export class DishAvailabilityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Distingo una sede inexistente de una carta vacía.
  private async restaurant(
    db: Prisma.TransactionClient,
    restauranteId: string,
  ) {
    if (
      !(await db.restaurant.findUnique({
        where: { id: restauranteId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Restaurante inexistente');
  }

  // Una escritura concurrente obliga a recargar; no reintento una decisión administrativa a ciegas.
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
        ['P2034', 'P2002', 'P2028'].includes(error.code)
      ) {
        throw new ConflictException({
          message: {
            codigo: 'DISPONIBILIDAD_CONCURRENTE',
            detalle: 'Recargue la fecha y revise los cambios antes de repetir',
          },
        });
      }
      throw error;
    }
  }

  // Devuelvo tanto la regla general como la excepción para que el panel no las confunda.
  async list(query: MenuDishesQuery): Promise<DishAvailabilityPage> {
    return this.prisma.$transaction(
      async (db) => {
        await this.restaurant(db, query.restauranteId);
        const where = {
          activo: true,
          category: { restaurantId: query.restauranteId, activa: true },
        };
        const total = await db.dish.count({ where });
        const rows = await db.dish.findMany({
          where,
          select: availabilitySelect([query.fecha]),
          orderBy: [
            { category: { orden: 'asc' } },
            { categoryId: 'asc' },
            { orden: 'asc' },
            { id: 'asc' },
          ],
          skip: (query.pagina - 1) * query.tamanoPagina,
          take: query.tamanoPagina,
        });
        return {
          restauranteId: query.restauranteId,
          fecha: query.fecha,
          paginacion: {
            pagina: query.pagina,
            tamanoPagina: query.tamanoPagina,
            total,
            totalPaginas: Math.ceil(total / query.tamanoPagina),
          },
          data: rows.map((row) => {
            const exception = row.schedules[0];
            return {
              platoId: row.id,
              nombre: row.nombre,
              categoria: row.category,
              disponibleGeneral: row.disponible,
              disponible: exception?.disponible ?? row.disponible,
              origen: exception ? ('FECHA' as const) : ('GENERAL' as const),
              excepcion: exception
                ? { id: exception.id, disponible: exception.disponible }
                : null,
            };
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  // Actualizo solo el booleano de filas existentes y conservo sus IDs y cupos ajenos a esta entrega.
  private async apply(
    db: Prisma.TransactionClient,
    fecha: string,
    rows: Row[],
    cambios: DishAvailabilityWrite['cambios'],
  ) {
    const remove = cambios
      .filter((item) => item.disponible === null)
      .map((item) => item.platoId);
    if (remove.length)
      await db.dishSchedule.deleteMany({
        where: { fecha: date(fecha), dishId: { in: remove } },
      });
    for (const disponible of [false, true]) {
      const ids = cambios
        .filter((item) => item.disponible === disponible)
        .map((item) => item.platoId);
      if (ids.length)
        await db.dishSchedule.updateMany({
          where: { fecha: date(fecha), dishId: { in: ids } },
          data: { disponible },
        });
    }
    const newRows = cambios.filter(
      (item) =>
        item.disponible !== null &&
        !rows
          .find((row) => row.id === item.platoId)
          ?.schedules.some((schedule) => dayKey(schedule.fecha) === fecha),
    );
    if (newRows.length)
      await db.dishSchedule.createMany({
        data: newRows.map((item) => ({
          dishId: item.platoId,
          fecha: date(fecha),
          disponible: item.disponible!,
        })),
      });
  }

  // Un lote inválido falla completo; no cambio Dish.disponible ni fechas distintas.
  async save(
    restauranteId: string,
    fecha: string,
    input: DishAvailabilityWrite,
  ) {
    return this.write(async (db) => {
      await this.restaurant(db, restauranteId);
      const rows = await db.dish.findMany({
        where: {
          activo: true,
          id: { in: input.cambios.map((item) => item.platoId) },
          category: { restaurantId: restauranteId, activa: true },
        },
        select: availabilitySelect([fecha]),
      });
      if (rows.length !== input.cambios.length)
        throw new NotFoundException(
          'Hay platos ajenos a la sede, inexistentes o de categorías inactivas',
        );
      await this.apply(db, fecha, rows, input.cambios);
      return { restauranteId, fecha, procesados: input.cambios.length };
    });
  }

  // Previsualizo y vuelvo a comprobar el estado del origen/destino al confirmar la copia.
  async copy(
    restauranteId: string,
    input: DishAvailabilityCopy,
  ): Promise<DishAvailabilityCopyResult> {
    return this.write(async (db) => {
      await this.restaurant(db, restauranteId);
      const rows = await db.dish.findMany({
        where: {
          activo: true,
          category: { restaurantId: restauranteId, activa: true },
        },
        select: availabilitySelect([input.origen, input.destino]),
        orderBy: { id: 'asc' },
        take: 1001,
      });
      if (rows.length > 1000)
        throw new BadRequestException(
          'La copia atómica admite hasta 1000 platos de categorías activas',
        );
      const effective = (row: Row, fecha: string) =>
        row.schedules.find((schedule) => dayKey(schedule.fecha) === fecha)
          ?.disponible ?? row.disponible;
      const confirmacion = createHash('sha256')
        .update(
          JSON.stringify({
            restauranteId,
            origen: input.origen,
            destino: input.destino,
            rows,
          }),
        )
        .digest('hex');
      const previsualizacion = {
        restauranteId,
        origen: input.origen,
        destino: input.destino,
        total: rows.length,
        cambios: rows.filter(
          (row) =>
            effective(row, input.origen) !== effective(row, input.destino),
        ).length,
        excepcionesDestino: rows.filter((row) =>
          row.schedules.some(
            (schedule) => dayKey(schedule.fecha) === input.destino,
          ),
        ).length,
        confirmacion,
      };
      if (!input.confirmacion) return { aplicada: false, previsualizacion };
      if (input.confirmacion !== confirmacion)
        throw new ConflictException({
          message: {
            codigo: 'COPIA_DESACTUALIZADA',
            detalle:
              'Cambió el origen, destino o carta; previsualice y confirme nuevamente',
          },
        });
      await this.apply(
        db,
        input.destino,
        rows,
        rows.map((row) => ({
          platoId: row.id,
          disponible: effective(row, input.origen),
        })),
      );
      return { aplicada: true, procesados: rows.length };
    });
  }
}
