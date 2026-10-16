import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { MenuDishesQuerySchema, MenuPageQuerySchema } from '@encanto/shared';
import { MenuService } from './menu.service.js';
import {
  menuCategory,
  menuDishId,
  menuPrismaMock,
  menuRestaurantId,
  publicDishFixture,
} from '../../test/menu.fixture.js';

describe('Menú público con Prisma simulado', () => {
  let db: ReturnType<typeof menuPrismaMock>;
  let menu: MenuService;
  const query = {
    restauranteId: menuRestaurantId,
    pagina: 1,
    tamanoPagina: 20,
  };
  const dated = { ...query, fecha: '2031-02-23' };
  beforeEach(() => {
    db = menuPrismaMock();
    menu = new MenuService(db as never);
  });

  // Verifico ambas direcciones de la precedencia, incluyendo el false explícito.
  it.each([
    { general: true, override: false, expected: false, origen: 'FECHA' },
    { general: false, override: true, expected: true, origen: 'FECHA' },
    { general: true, override: undefined, expected: true, origen: 'GENERAL' },
    { general: false, override: undefined, expected: false, origen: 'GENERAL' },
  ])(
    'resuelve disponibilidad $general/$override como $expected',
    async ({ general, override, expected, origen }) => {
      const dish = publicDishFixture();
      dish.disponible = general;
      dish.schedules = override === undefined ? [] : [{ disponible: override }];
      db.dish.findMany.mockResolvedValue([dish]);
      const response = await menu.dishes(dated);
      expect(response.data[0]).toMatchObject({
        disponible: expected,
        disponibilidadOrigen: origen,
        precio: 32000.5,
        moneda: 'COP',
      });
      expect(response.fecha).toBe('2031-02-23');
      expect(dish.disponible).toBe(general);
      expect(
        db.dish.findMany.mock.calls[0][0].select.schedules.where.fecha,
      ).toEqual(new Date('2031-02-23T00:00:00Z'));
    },
  );

  it('pagina categorías activas sin exponer columnas internas', async () => {
    const response = await menu.categories({
      ...query,
      pagina: 2,
      tamanoPagina: 1,
    });
    expect(response).toMatchObject({
      data: [menuCategory],
      paginacion: { pagina: 2, total: 1, totalPaginas: 1 },
    });
    expect(db.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: menuRestaurantId, activa: true },
        skip: 1,
        take: 1,
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });

  it('conserva orden estable por categoría/plato y no filtra los no disponibles', async () => {
    await menu.dishes(dated);
    const call = db.dish.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      category: { restaurantId: menuRestaurantId, activa: true },
    });
    expect(call.orderBy).toEqual([
      { category: { orden: 'asc' } },
      { categoryId: 'asc' },
      { orden: 'asc' },
      { id: 'asc' },
    ]);
    expect(call.select.photos.take).toBe(10);
    expect(call.select.photos.orderBy).toEqual([
      { principal: 'desc' },
      { orden: 'asc' },
      { id: 'asc' },
    ]);
    expect(call.select).not.toHaveProperty('favoritedBy');
  });

  it('detalle exige la sede y una categoría activa', async () => {
    const result = await menu.dish(menuDishId, {
      restauranteId: menuRestaurantId,
      fecha: dated.fecha,
    });
    expect(result.plato).toMatchObject({
      id: menuDishId,
      precio: 32000.5,
      etiquetas: [{ nombre: 'Vegetariano' }],
    });
    expect(db.dish.findFirst.mock.calls[0][0].where).toEqual({
      id: menuDishId,
      category: { restaurantId: menuRestaurantId, activa: true },
    });
    db.dish.findFirst.mockResolvedValue(null);
    await expect(menu.dish(menuDishId, dated)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('no confunde restaurante inexistente con una lista vacía', async () => {
    db.restaurant.findUnique.mockResolvedValue(null);
    await expect(menu.dishes(dated)).rejects.toThrow(NotFoundException);
    expect(db.dish.findMany).not.toHaveBeenCalled();
  });

  it('etiquetas solo considera platos de categorías activas de la sede', async () => {
    await menu.tags(query);
    expect(db.dietaryTag.count.mock.calls[0][0].where).toEqual({
      dishes: {
        some: {
          dish: { category: { restaurantId: menuRestaurantId, activa: true } },
        },
      },
    });
  });

  it('una carta vacía conserva la fecha y totalPaginas=0', async () => {
    db.dish.count.mockResolvedValue(0);
    db.dish.findMany.mockResolvedValue([]);
    expect(await menu.dishes(dated)).toMatchObject({
      fecha: dated.fecha,
      data: [],
      paginacion: { total: 0, totalPaginas: 0 },
    });
  });
});

describe('Validaciones compartidas EC-25', () => {
  it('aplica valores de página por defecto', () => {
    expect(
      MenuPageQuerySchema.parse({ restauranteId: menuRestaurantId }),
    ).toEqual({ restauranteId: menuRestaurantId, pagina: 1, tamanoPagina: 20 });
  });
  it.each(['0', '-1', '1.5', '1e2', '01', 'Infinity', '10001'])(
    'rechaza la página %s',
    (pagina) => {
      expect(
        MenuPageQuerySchema.safeParse({
          restauranteId: menuRestaurantId,
          pagina,
        }).success,
      ).toBe(false);
    },
  );
  it.each([
    '2026-02-29',
    '2031-02-30',
    '2031-04-31',
    '2031-13-01',
    '2031-2-01',
  ])('rechaza la fecha real inválida %s', (fecha) => {
    expect(
      MenuDishesQuerySchema.safeParse({
        restauranteId: menuRestaurantId,
        fecha,
      }).success,
    ).toBe(false);
  });
});
