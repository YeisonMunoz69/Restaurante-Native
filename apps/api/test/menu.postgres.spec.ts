import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MenuModule } from '../src/menu/menu.module.js';
import { MenuService } from '../src/menu/menu.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const databaseUrl = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
// Las pruebas normales no intentan conectarse: se habilita solo el destino dedicado explícito.
const integration = databaseUrl ? describe : describe.skip;
integration('EC-25: HTTP y persistencia en PostgreSQL aislado real', () => {
  let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
  let app: INestApplication;
  const restaurantId = randomUUID();
  const otherRestaurantId = randomUUID();
  const categoryId = randomUUID();
  const categoryB = randomUUID();
  const hiddenCategory = randomUUID();
  const otherCategory = randomUUID();
  const dishA = '00000000-0000-4000-8000-000000000101';
  const dishB = '00000000-0000-4000-8000-000000000102';
  const dishC = randomUUID();
  const hiddenDish = randomUUID();
  const otherDish = randomUUID();
  const tag = randomUUID();
  const unusedTag = randomUUID();
  const hiddenTag = randomUUID();
  const foreignTag = randomUUID();
  const fecha = '2031-02-23';
  const query = {
    restauranteId: restaurantId,
    fecha,
    pagina: 1,
    tamanoPagina: 100,
  };
  const path = (route: string, extra = '') =>
    `/api/v1/menu/${route}?restauranteId=${restaurantId}${extra}`;

  // Preparo datos propios con el esquema real, sin ejecutar el seed del proyecto.
  beforeAll(async () => {
    fixture = await createMenuPostgresFixture(databaseUrl!);
    const db = fixture.client;
    for (const id of [restaurantId, otherRestaurantId])
      await db.restaurant.create({
        data: {
          id,
          nombre: 'Restaurante de integración',
          direccion: 'Dirección de prueba',
          latitud: 2.4,
          longitud: -76.6,
          telefono: '3000000000',
          whatsapp: '3000000000',
          aforoTotal: 30,
        },
      });
    await db.category.createMany({
      data: [
        { id: categoryId, restaurantId, nombre: 'Primera', orden: 0 },
        { id: categoryB, restaurantId, nombre: 'Segunda', orden: 1 },
        {
          id: hiddenCategory,
          restaurantId,
          nombre: 'Oculta',
          orden: 2,
          activa: false,
        },
        {
          id: otherCategory,
          restaurantId: otherRestaurantId,
          nombre: 'Otra sede',
          orden: 0,
        },
      ],
    });
    await db.dish.createMany({
      data: [
        {
          id: dishA,
          categoryId,
          nombre: 'A',
          slug: 'a',
          descripcion: 'Persistida A',
          precio: '32000.50',
          disponible: true,
          orden: 0,
        },
        {
          id: dishB,
          categoryId,
          nombre: 'B',
          slug: 'b',
          descripcion: 'Persistida B',
          precio: '9999999999.99',
          disponible: false,
          orden: 0,
        },
        {
          id: dishC,
          categoryId: categoryB,
          nombre: 'C',
          slug: 'c',
          descripcion: 'Persistida C',
          precio: '5000',
          disponible: false,
          orden: 0,
        },
        {
          id: hiddenDish,
          categoryId: hiddenCategory,
          nombre: 'Oculto',
          slug: 'oculto',
          descripcion: 'No pública',
          precio: '1000',
        },
        {
          id: otherDish,
          categoryId: otherCategory,
          nombre: 'Ajeno',
          slug: 'ajeno',
          descripcion: 'Otra sede',
          precio: '1000',
        },
      ],
    });
    await db.dishSchedule.createMany({
      data: [
        {
          dishId: dishA,
          fecha: new Date(`${fecha}T00:00:00Z`),
          disponible: false,
        },
        {
          dishId: dishB,
          fecha: new Date(`${fecha}T00:00:00Z`),
          disponible: true,
        },
        {
          dishId: dishA,
          fecha: new Date('2031-02-24T00:00:00Z'),
          disponible: true,
        },
      ],
    });
    await db.dietaryTag.createMany({
      data: [
        { id: tag, nombre: 'Vegetariano' },
        { id: unusedTag, nombre: 'Sin uso' },
        { id: hiddenTag, nombre: 'Solo oculta' },
        { id: foreignTag, nombre: 'Solo otra sede' },
      ],
    });
    await db.dishDietaryTag.createMany({
      data: [
        { dishId: dishA, tagId: tag },
        { dishId: dishB, tagId: tag },
        { dishId: hiddenDish, tagId: hiddenTag },
        { dishId: otherDish, tagId: foreignTag },
      ],
    });
    await db.dishPhoto.createMany({
      data: Array.from({ length: 12 }, (_, i) => ({
        dishId: dishA,
        path: `platos/prueba-${i}.webp`,
        orden: i,
        principal: i === 11,
      })),
    });
    const module = await Test.createTestingModule({ imports: [MenuModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  it('resuelve ambas excepciones, mantiene no disponibles y entrega COP numérico', async () => {
    const response = await request(app.getHttpServer())
      .get(path('platos', `&fecha=${fecha}`))
      .expect(200);
    expect(response.body.data.map((dish) => dish.id)).toEqual([
      dishA,
      dishB,
      dishC,
    ]);
    expect(response.body.data[0]).toMatchObject({
      disponible: false,
      disponibilidadOrigen: 'FECHA',
      precio: 32000.5,
    });
    expect(response.body.data[1]).toMatchObject({
      disponible: true,
      disponibilidadOrigen: 'FECHA',
      precio: 9999999999.99,
    });
    expect(response.body.data[2]).toMatchObject({
      disponible: false,
      disponibilidadOrigen: 'GENERAL',
    });
  });

  it('consultar otra fecha no modifica ni excepciones ni disponibilidad general', async () => {
    const response = await request(app.getHttpServer())
      .get(path('platos', '&fecha=2031-02-24'))
      .expect(200);
    expect(response.body.data.find((dish) => dish.id === dishA)).toMatchObject({
      disponible: true,
      disponibilidadOrigen: 'FECHA',
    });
    expect(response.body.data.find((dish) => dish.id === dishB)).toMatchObject({
      disponible: false,
      disponibilidadOrigen: 'GENERAL',
    });
    const persisted = await fixture.client.dish.findUniqueOrThrow({
      where: { id: dishA },
      include: { schedules: { orderBy: { fecha: 'asc' } } },
    });
    expect(persisted.disponible).toBe(true);
    expect(persisted.schedules.map((day) => day.disponible)).toEqual([
      false,
      true,
    ]);
  });

  it('página tras página conserva categorías e IDs sin perder o duplicar platos', async () => {
    const ids: string[] = [];
    for (let pagina = 1; pagina <= 3; pagina++) {
      const response = await request(app.getHttpServer())
        .get(path('platos', `&fecha=${fecha}&pagina=${pagina}&tamanoPagina=1`))
        .expect(200);
      expect(response.body.paginacion).toMatchObject({
        pagina,
        total: 3,
        totalPaginas: 3,
      });
      ids.push(response.body.data[0].id);
    }
    expect(ids).toEqual([dishA, dishB, dishC]);
    const empty = await request(app.getHttpServer())
      .get(path('platos', `&fecha=${fecha}&pagina=4&tamanoPagina=1`))
      .expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.paginacion.total).toBe(3);
  });

  it('filtra categorías y etiquetas por sede/visibilidad y pagina ambas', async () => {
    const categories = await request(app.getHttpServer())
      .get(path('categorias', '&tamanoPagina=1&pagina=2'))
      .expect(200);
    expect(categories.body.data.map((category) => category.id)).toEqual([
      categoryB,
    ]);
    expect(categories.body.paginacion.total).toBe(2);
    const tags = await request(app.getHttpServer())
      .get(path('etiquetas'))
      .expect(200);
    expect(tags.body.data.map((item) => item.id)).toEqual([tag]);
    expect(tags.body.paginacion.total).toBe(1);
    const empty = await request(app.getHttpServer())
      .get(path('etiquetas', '&pagina=2&tamanoPagina=1'))
      .expect(200);
    expect(empty.body.data).toEqual([]);
  });

  it('detalle ordena hasta diez fotos y rechaza platos ocultos o de otra sede', async () => {
    const response = await request(app.getHttpServer())
      .get(path(`platos/${dishA}`, `&fecha=${fecha}`))
      .expect(200);
    expect(response.body.plato.fotos).toHaveLength(10);
    expect(response.body.plato.fotos[0]).toMatchObject({
      principal: true,
      path: 'platos/prueba-11.webp',
    });
    expect(response.body.plato.etiquetas.map((item) => item.id)).toEqual([tag]);
    for (const id of [hiddenDish, otherDish, randomUUID()])
      await request(app.getHttpServer())
        .get(path(`platos/${id}`, `&fecha=${fecha}`))
        .expect(404);
  });

  it('rechaza entradas inválidas y devuelve 404 para una sede inexistente', async () => {
    await request(app.getHttpServer())
      .get(path('platos', '&fecha=2031-02-30'))
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/menu/platos?restauranteId=${randomUUID()}&fecha=${fecha}`)
      .expect(404);
  });

  it('los datos y las excepciones sobreviven a una conexión nueva', async () => {
    const reloaded = new PrismaClient({
      datasources: { db: { url: fixture.url } },
    });
    try {
      const response = await new MenuService(reloaded as PrismaService).dish(
        dishA,
        { restauranteId: restaurantId, fecha },
      );
      expect(response.plato).toMatchObject({
        disponible: false,
        disponibilidadOrigen: 'FECHA',
        descripcion: 'Persistida A',
      });
    } finally {
      await reloaded.$disconnect();
    }
  });

  // Intercalo una escritura real desde otra conexión entre count y findMany.
  it('una escritura concurrente no mezcla total viejo con filas nuevas dentro de la página', async () => {
    const insertedId = randomUUID();
    const writer = new PrismaClient({
      datasources: { db: { url: fixture.url } },
    });
    const before = await fixture.client.dish.count({
      where: { categoryId: { in: [categoryId, categoryB] } },
    });
    const concurrentReader = fixture.client.$extends({
      query: {
        dish: {
          async count({ args, query: execute }) {
            const total = await execute(args);
            await writer.dish.create({
              data: {
                id: insertedId,
                categoryId: categoryB,
                nombre: 'Concurrente',
                slug: 'concurrente',
                descripcion: 'Escritura de prueba',
                precio: 1,
              },
            });
            return total;
          },
        },
      },
    });
    try {
      const result = await new MenuService(
        concurrentReader as unknown as PrismaService,
      ).dishes(query);
      expect(result.paginacion.total).toBe(before);
      expect(result.data).toHaveLength(before);
      expect(result.data.some((dish) => dish.id === insertedId)).toBe(false);
      expect(
        await writer.dish.count({
          where: { categoryId: { in: [categoryId, categoryB] } },
        }),
      ).toBe(before + 1);
    } finally {
      await writer.dish.deleteMany({ where: { id: insertedId } });
      await writer.$disconnect();
    }
  });
});
