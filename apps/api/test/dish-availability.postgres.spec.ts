import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DishAvailabilityService } from '../src/dish-availability/dish-availability.service.js';
import { MenuService } from '../src/menu/menu.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)(
  'EC-28 persistencia y atomicidad en PostgreSQL aislado',
  () => {
    let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
    let db: PrismaClient;
    let service: DishAvailabilityService;
    const restaurantId = randomUUID(),
      categoryId = randomUUID(),
      hiddenCategory = randomUUID();
    const a = randomUUID(),
      b = randomUUID(),
      hidden = randomUUID();
    const source = '2031-02-23',
      target = '2031-02-24',
      other = '2031-02-25';
    const day = (value: string) => new Date(value);
    const copyInput = { origen: source, destino: target };
    beforeAll(async () => {
      fixture = await createMenuPostgresFixture(url!);
      db = fixture.client;
      service = new DishAvailabilityService(db as PrismaService);
      await db.restaurant.create({
        data: {
          id: restaurantId,
          nombre: 'EC28 aislado',
          direccion: 'Prueba',
          latitud: 0,
          longitud: 0,
          telefono: '0',
          whatsapp: '0',
          aforoTotal: 1,
        },
      });
      await db.category.createMany({
        data: [
          { id: categoryId, restaurantId, nombre: 'Activa' },
          { id: hiddenCategory, restaurantId, nombre: 'Oculta', activa: false },
        ],
      });
      await db.dish.createMany({
        data: [
          {
            id: a,
            categoryId,
            nombre: 'A',
            slug: a,
            descripcion: 'Prueba',
            precio: 1,
            disponible: true,
          },
          {
            id: b,
            categoryId,
            nombre: 'B',
            slug: b,
            descripcion: 'Prueba',
            precio: 1,
            disponible: false,
          },
          {
            id: hidden,
            categoryId: hiddenCategory,
            nombre: 'Oculto',
            slug: hidden,
            descripcion: 'Prueba',
            precio: 1,
          },
        ],
      });
    }, 60000);
    afterAll(async () => {
      await fixture?.close();
    });
    // Solo restauro filas del esquema desechable creado por esta suite.
    beforeEach(async () => {
      await db.dishSchedule.deleteMany();
      await db.dishSchedule.createMany({
        data: [
          { dishId: a, fecha: day(source), disponible: false, cupo: 7 },
          { dishId: b, fecha: day(source), disponible: true },
          { dishId: a, fecha: day(target), disponible: true, cupo: 9 },
          { dishId: a, fecha: day(other), disponible: true },
          { dishId: hidden, fecha: day(target), disponible: false },
        ],
      });
    });
    it('guarda, conserva ID/cupo y persiste en otra conexión sin alterar generales u otras fechas', async () => {
      const old = await db.dishSchedule.findUniqueOrThrow({
        where: { dishId_fecha: { dishId: a, fecha: day(target) } },
      });
      await service.save(restaurantId, target, {
        cambios: [
          { platoId: a, disponible: false },
          { platoId: b, disponible: true },
        ],
      });
      const reader = new PrismaClient({
        datasources: { db: { url: fixture.url } },
      });
      try {
        const current = await reader.dishSchedule.findUniqueOrThrow({
          where: { id: old.id },
        });
        expect(current).toMatchObject({ disponible: false, cupo: 9 });
        expect(
          (await reader.dish.findUniqueOrThrow({ where: { id: a } }))
            .disponible,
        ).toBe(true);
        expect(
          (
            await reader.dishSchedule.findMany({
              where: { dishId: a, fecha: { not: day(target) } },
              orderBy: { fecha: 'asc' },
            })
          ).map((row) => row.disponible),
        ).toEqual([false, true]);
        const menu = await new MenuService(reader as PrismaService).dishes({
          restauranteId: restaurantId,
          fecha: target,
          pagina: 1,
          tamanoPagina: 20,
        });
        expect(menu.data.find((row) => row.id === a)).toMatchObject({
          disponible: false,
          disponibilidadOrigen: 'FECHA',
        });
      } finally {
        await reader.$disconnect();
      }
    });
    it('eliminar excepción vuelve a general sin cambiar otra fecha', async () => {
      await service.save(restaurantId, source, {
        cambios: [{ platoId: a, disponible: null }],
      });
      const result = await service.list({
        restauranteId: restaurantId,
        fecha: source,
        pagina: 1,
        tamanoPagina: 20,
      });
      expect(result.data.find((row) => row.platoId === a)).toMatchObject({
        origen: 'GENERAL',
        disponible: true,
        excepcion: null,
      });
      expect(await db.dishSchedule.count({ where: { dishId: a } })).toBe(2);
    });
    it('previsualizar no escribe y confirmar copia el origen efectivo solo a destino activo', async () => {
      const before = await db.dishSchedule.findMany({ orderBy: { id: 'asc' } });
      const preview = await service.copy(restaurantId, copyInput);
      if (preview.aplicada) throw new Error('La previsualización escribió');
      expect(
        await db.dishSchedule.findMany({ orderBy: { id: 'asc' } }),
      ).toEqual(before);
      expect(preview.previsualizacion).toMatchObject({ total: 2, cambios: 2 });
      await service.copy(restaurantId, {
        ...copyInput,
        confirmacion: preview.previsualizacion.confirmacion,
      });
      const result = await service.list({
        restauranteId: restaurantId,
        fecha: target,
        pagina: 1,
        tamanoPagina: 20,
      });
      expect(result.data.find((row) => row.platoId === a)).toMatchObject({
        disponible: false,
        origen: 'FECHA',
      });
      expect(result.data.find((row) => row.platoId === b)).toMatchObject({
        disponible: true,
        origen: 'FECHA',
      });
      expect(
        await db.dishSchedule.findMany({
          where: { OR: [{ fecha: { not: day(target) } }, { dishId: hidden }] },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(
        before.filter(
          (row) =>
            row.fecha.getTime() !== day(target).getTime() ||
            row.dishId === hidden,
        ),
      );
      expect(
        (await db.dish.findUniqueOrThrow({ where: { id: b } })).disponible,
      ).toBe(false);
    });
    it('rechaza previsualización vencida sin sobrescribir el cambio posterior', async () => {
      const preview = await service.copy(restaurantId, copyInput);
      if (preview.aplicada) throw new Error('Prueba inválida');
      await service.save(restaurantId, target, {
        cambios: [{ platoId: b, disponible: true }],
      });
      const before = await db.dishSchedule.findMany({ orderBy: { id: 'asc' } });
      await expect(
        service.copy(restaurantId, {
          ...copyInput,
          confirmacion: preview.previsualizacion.confirmacion,
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        await db.dishSchedule.findMany({ orderBy: { id: 'asc' } }),
      ).toEqual(before);
    });
    it('un plato inactivo o inexistente invalida el lote completo', async () => {
      for (const invalid of [hidden, randomUUID()]) {
        await expect(
          service.save(restaurantId, target, {
            cambios: [
              { platoId: a, disponible: false },
              { platoId: invalid, disponible: true },
            ],
          }),
        ).rejects.toMatchObject({ status: 404 });
        expect(
          (
            await db.dishSchedule.findUniqueOrThrow({
              where: { dishId_fecha: { dishId: a, fecha: day(target) } },
            })
          ).disponible,
        ).toBe(true);
      }
    });
    it('revierte la primera actualización si falla la segunda dentro de PostgreSQL', async () => {
      const failing = db.$extends({
        query: {
          dishSchedule: {
            async createMany() {
              throw new Error('Fallo después de updateMany');
            },
          },
        },
      });
      await expect(
        new DishAvailabilityService(failing as unknown as PrismaService).save(
          restaurantId,
          target,
          {
            cambios: [
              { platoId: a, disponible: false },
              { platoId: b, disponible: true },
            ],
          },
        ),
      ).rejects.toThrow('Fallo después');
      expect(
        (
          await db.dishSchedule.findUniqueOrThrow({
            where: { dishId_fecha: { dishId: a, fecha: day(target) } },
          })
        ).disponible,
      ).toBe(true);
    });
    it('una escritura intercalada real devuelve 409 y conserva al escritor ganador', async () => {
      const writer = new PrismaClient({
        datasources: { db: { url: fixture.url } },
      });
      const concurrent = db.$extends({
        query: {
          dish: {
            async findMany({ args, query: execute }) {
              const result = await execute(args);
              await writer.dishSchedule.update({
                where: { dishId_fecha: { dishId: a, fecha: day(target) } },
                data: { cupo: 17 },
              });
              return result;
            },
          },
        },
      });
      try {
        await expect(
          new DishAvailabilityService(
            concurrent as unknown as PrismaService,
          ).save(restaurantId, target, {
            cambios: [{ platoId: a, disponible: false }],
          }),
        ).rejects.toMatchObject({ status: 409 });
        expect(
          await writer.dishSchedule.findUniqueOrThrow({
            where: { dishId_fecha: { dishId: a, fecha: day(target) } },
          }),
        ).toMatchObject({ disponible: true, cupo: 17 });
      } finally {
        await writer.$disconnect();
      }
    });
  },
);
