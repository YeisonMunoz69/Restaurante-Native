import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CategoryCreate,
  CategoryUpdate,
  DishCreate,
  DishUpdate,
  MenuAdminPageQuery,
} from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const dishAdminSelect = {
  id: true,
  categoryId: true,
  nombre: true,
  slug: true,
  descripcionBreve: true,
  descripcion: true,
  precio: true,
  alergenos: true,
  disponible: true,
  activo: true,
  destacado: true,
  orden: true,
  category: { select: { id: true, nombre: true, activa: true } },
  photos: {
    select: { id: true, path: true, pathOg: true, orden: true, principal: true },
    orderBy: [{ principal: 'desc' as const }, { orden: 'asc' as const }],
  },
  dietaryTags: { select: { tagId: true } },
} satisfies Prisma.DishSelect;

@Injectable()
export class MenuAdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Separo cada cambio administrativo para no dejar una etiqueta o plato a medias.
  private async write<T>(action: (db: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El slug o la relación ya existe');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La carta cambió mientras guardábamos; recárguela y vuelva a intentar',
        );
      }
      throw error;
    }
  }

  private async requireRestaurant(
    db: Prisma.TransactionClient,
    restauranteId: string,
  ) {
    if (!(await db.restaurant.findUnique({ where: { id: restauranteId }, select: { id: true } }))) {
      throw new NotFoundException('Restaurante inexistente');
    }
  }

  private async requireCategory(
    db: Prisma.TransactionClient,
    restauranteId: string,
    categoriaId: string,
    includeInactive = false,
  ) {
    const category = await db.category.findFirst({
      where: {
        id: categoriaId,
        restaurantId: restauranteId,
        ...(includeInactive ? {} : { activa: true }),
      },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Categoría inexistente o inactiva');
  }

  private async requireTags(db: Prisma.TransactionClient, ids: string[]) {
    if (!ids.length) return;
    const count = await db.dietaryTag.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new NotFoundException('Hay etiquetas inexistentes');
  }

  async categories(query: MenuAdminPageQuery) {
    return this.prisma.$transaction(
      async (db) => {
        await this.requireRestaurant(db, query.restauranteId);
        const where = {
          restaurantId: query.restauranteId,
          ...(query.incluirInactivos ? {} : { activa: true }),
        };
        const [total, data] = await Promise.all([
          db.category.count({ where }),
          db.category.findMany({
            where,
            orderBy: [{ orden: 'asc' }, { id: 'asc' }],
            skip: (query.pagina - 1) * query.tamanoPagina,
            take: query.tamanoPagina,
            include: { _count: { select: { dishes: true } } },
          }),
        ]);
        return {
          restauranteId: query.restauranteId,
          paginacion: {
            pagina: query.pagina,
            tamanoPagina: query.tamanoPagina,
            total,
            totalPaginas: Math.ceil(total / query.tamanoPagina),
          },
          data: data.map(({ _count, ...category }) => ({
            ...category,
            cantidadPlatos: _count.dishes,
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createCategory(restauranteId: string, input: CategoryCreate) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      return db.category.create({
        data: { restaurantId: restauranteId, ...input },
      });
    });
  }

  async updateCategory(
    restauranteId: string,
    id: string,
    input: CategoryUpdate,
  ) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      const exists = await db.category.findFirst({
        where: { id, restaurantId: restauranteId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Categoría inexistente');
      return db.category.update({ where: { id }, data: input });
    });
  }

  async dishes(query: MenuAdminPageQuery) {
    return this.prisma.$transaction(
      async (db) => {
        await this.requireRestaurant(db, query.restauranteId);
        const where = {
          category: { restaurantId: query.restauranteId },
          ...(!query.incluirInactivos
            ? { activo: true, category: { restaurantId: query.restauranteId, activa: true } }
            : {}),
        } satisfies Prisma.DishWhereInput;
        const [total, rows] = await Promise.all([
          db.dish.count({ where }),
          db.dish.findMany({
            where,
            select: dishAdminSelect,
            orderBy: [
              { category: { orden: 'asc' } },
              { categoryId: 'asc' },
              { orden: 'asc' },
              { id: 'asc' },
            ],
            skip: (query.pagina - 1) * query.tamanoPagina,
            take: query.tamanoPagina,
          }),
        ]);
        return {
          restauranteId: query.restauranteId,
          paginacion: {
            pagina: query.pagina,
            tamanoPagina: query.tamanoPagina,
            total,
            totalPaginas: Math.ceil(total / query.tamanoPagina),
          },
          data: rows.map((row) => ({
            ...row,
            precio: row.precio.toNumber(),
            etiquetasIds: row.dietaryTags.map(({ tagId }) => tagId),
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createDish(restauranteId: string, input: DishCreate) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      await this.requireCategory(db, restauranteId, input.categoriaId);
      await this.requireTags(db, input.etiquetasIds);
      const { etiquetasIds, ...dish } = input;
      const { categoriaId, ...fields } = dish;
      const created = await db.dish.create({
        data: {
          ...fields,
          categoryId: categoriaId,
          precio: new Prisma.Decimal(fields.precio),
        },
        select: { id: true },
      });
      if (etiquetasIds.length)
        await db.dishDietaryTag.createMany({
          data: etiquetasIds.map((tagId) => ({ dishId: created.id, tagId })),
        });
      const full = await db.dish.findUniqueOrThrow({
        where: { id: created.id },
        select: dishAdminSelect,
      });
      return {
        ...full,
        precio: full.precio.toNumber(),
        etiquetasIds: full.dietaryTags.map(({ tagId }) => tagId),
      };
    });
  }

  async updateDish(restauranteId: string, id: string, input: DishUpdate) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      const existing = await db.dish.findFirst({
        where: { id, category: { restaurantId: restauranteId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Plato inexistente');
      if (input.categoriaId)
        await this.requireCategory(db, restauranteId, input.categoriaId);
      if (input.etiquetasIds) await this.requireTags(db, input.etiquetasIds);
      const { etiquetasIds, ...fields } = input;
      const { categoriaId, ...dishFields } = fields;
      const data = {
        ...dishFields,
        ...(categoriaId !== undefined ? { categoryId: categoriaId } : {}),
        ...(dishFields.precio !== undefined
          ? { precio: new Prisma.Decimal(dishFields.precio) }
          : {}),
      };
      await db.dish.update({ where: { id }, data });
      if (etiquetasIds) {
        await db.dishDietaryTag.deleteMany({ where: { dishId: id } });
        if (etiquetasIds.length)
          await db.dishDietaryTag.createMany({
            data: etiquetasIds.map((tagId) => ({ dishId: id, tagId })),
          });
      }
      const updated = await db.dish.findUniqueOrThrow({
        where: { id },
        select: dishAdminSelect,
      });
      return {
        ...updated,
        precio: updated.precio.toNumber(),
        etiquetasIds: updated.dietaryTags.map(({ tagId }) => tagId),
      };
    });
  }

  async setDishActive(restauranteId: string, id: string, activo: boolean) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      const exists = await db.dish.findFirst({
        where: { id, category: { restaurantId: restauranteId } },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Plato inexistente');
      return db.dish.update({ where: { id }, data: { activo } });
    });
  }

  async setGeneralAvailability(
    restauranteId: string,
    id: string,
    disponible: boolean,
  ) {
    return this.write(async (db) => {
      await this.requireRestaurant(db, restauranteId);
      const exists = await db.dish.findFirst({
        where: { id, activo: true, category: { restaurantId: restauranteId, activa: true } },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Plato activo inexistente');
      return db.dish.update({ where: { id }, data: { disponible } });
    });
  }
}
