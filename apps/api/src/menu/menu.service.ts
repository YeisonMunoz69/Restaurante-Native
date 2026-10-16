import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  MenuDish,
  MenuDishQuery,
  MenuDishResult,
  MenuDishesPage,
  MenuDishesQuery,
  MenuPage,
  MenuPageQuery,
  MenuCategory,
  MenuTag,
} from '@encanto/shared';
import { PrismaService } from '../prisma/prisma.service.js';

// Selecciono solo datos públicos y limito las fotos sin cargar relaciones de reservas.
const dishSelect = (fecha: string) =>
  ({
    id: true,
    nombre: true,
    slug: true,
    descripcionBreve: true,
    descripcion: true,
    precio: true,
    alergenos: true,
    destacado: true,
    orden: true,
    disponible: true,
    category: { select: { id: true, nombre: true, orden: true } },
    photos: {
      select: {
        id: true,
        path: true,
        pathOg: true,
        orden: true,
        principal: true,
      },
      orderBy: [{ principal: 'desc' }, { orden: 'asc' }, { id: 'asc' }],
      take: 10,
    },
    dietaryTags: {
      select: { tag: { select: { id: true, nombre: true, icono: true } } },
      orderBy: [{ tag: { nombre: 'asc' } }, { tagId: 'asc' }],
    },
    schedules: {
      where: { fecha: new Date(`${fecha}T00:00:00.000Z`) },
      select: { disponible: true },
      take: 1,
    },
  }) satisfies Prisma.DishSelect;
type PublicDish = Prisma.DishGetPayload<{
  select: ReturnType<typeof dishSelect>;
}>;

// Un false por fecha también prevalece; no uso || ni cambio el valor general.
function serializeDish(dish: PublicDish): MenuDish {
  const override = dish.schedules[0];
  return {
    id: dish.id,
    categoria: dish.category,
    nombre: dish.nombre,
    slug: dish.slug,
    descripcionBreve: dish.descripcionBreve,
    descripcion: dish.descripcion,
    precio: dish.precio.toNumber(),
    moneda: 'COP',
    alergenos: dish.alergenos,
    destacado: dish.destacado,
    orden: dish.orden,
    disponible: override?.disponible ?? dish.disponible,
    disponibilidadOrigen: override ? 'FECHA' : 'GENERAL',
    fotos: dish.photos,
    etiquetas: dish.dietaryTags.map(({ tag }) => tag),
  };
}

@Injectable()
export class MenuService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Mantengo conteo y página en una misma fotografía de PostgreSQL.
  private async read<T>(
    restauranteId: string,
    action: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (db) => {
        const restaurant = await db.restaurant.findUnique({
          where: { id: restauranteId },
          select: { id: true },
        });
        if (!restaurant) throw new NotFoundException('Restaurante inexistente');
        return action(db);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  // Devuelvo metadatos uniformes, incluso para una página vacía o fuera del total.
  private page<T>(query: MenuPageQuery, data: T[], total: number): MenuPage<T> {
    return {
      restauranteId: query.restauranteId,
      data,
      paginacion: {
        pagina: query.pagina,
        tamanoPagina: query.tamanoPagina,
        total,
        totalPaginas: Math.ceil(total / query.tamanoPagina),
      },
    };
  }

  // Las categorías inactivas y sus platos quedan fuera de toda lectura pública.
  async categories(query: MenuPageQuery): Promise<MenuPage<MenuCategory>> {
    return this.read(query.restauranteId, async (db) => {
      const where = { restaurantId: query.restauranteId, activa: true };
      const total = await db.category.count({ where });
      const data = await db.category.findMany({
        where,
        select: { id: true, nombre: true, orden: true },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
        skip: (query.pagina - 1) * query.tamanoPagina,
        take: query.tamanoPagina,
      });
      return this.page(query, data, total);
    });
  }

  // Ordeno también por categoría e IDs para conservar la agrupación entre páginas.
  async dishes(query: MenuDishesQuery): Promise<MenuDishesPage> {
    return this.read(query.restauranteId, async (db) => {
      const where = {
        category: { restaurantId: query.restauranteId, activa: true },
      };
      const total = await db.dish.count({ where });
      const dishes = await db.dish.findMany({
        where,
        select: dishSelect(query.fecha),
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
        ...this.page(query, dishes.map(serializeDish), total),
        fecha: query.fecha,
      };
    });
  }

  // La sede y la categoría activa también delimitan el acceso por ID.
  async dish(id: string, query: MenuDishQuery): Promise<MenuDishResult> {
    return this.read(query.restauranteId, async (db) => {
      const dish = await db.dish.findFirst({
        where: {
          id,
          category: { restaurantId: query.restauranteId, activa: true },
        },
        select: dishSelect(query.fecha),
      });
      if (!dish)
        throw new NotFoundException(
          'Plato inexistente en la carta pública de este restaurante',
        );
      return {
        restauranteId: query.restauranteId,
        fecha: query.fecha,
        plato: serializeDish(dish),
      };
    });
  }

  // Expongo solo etiquetas usadas en la carta pública de la sede consultada.
  async tags(query: MenuPageQuery): Promise<MenuPage<MenuTag>> {
    return this.read(query.restauranteId, async (db) => {
      const where = {
        dishes: {
          some: {
            dish: {
              category: { restaurantId: query.restauranteId, activa: true },
            },
          },
        },
      };
      const total = await db.dietaryTag.count({ where });
      const data = await db.dietaryTag.findMany({
        where,
        select: { id: true, nombre: true, icono: true },
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        skip: (query.pagina - 1) * query.tamanoPagina,
        take: query.tamanoPagina,
      });
      return this.page(query, data, total);
    });
  }
}
