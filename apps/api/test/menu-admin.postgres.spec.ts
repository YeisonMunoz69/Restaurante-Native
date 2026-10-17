import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DishCreateSchema } from '@encanto/shared';
import { MenuAdminService } from '../src/menu-admin/menu-admin.service.js';
import { MenuService } from '../src/menu/menu.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)(
  'EC-26/30 administración y carta pública en PostgreSQL aislado',
  () => {
    let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
    let admin: MenuAdminService;
    let menu: MenuService;
    const restaurantId = randomUUID();
    const otherRestaurantId = randomUUID();
    const query = {
      restauranteId: restaurantId,
      pagina: 1,
      tamanoPagina: 100,
      fecha: '2031-02-23',
    };

    beforeAll(async () => {
      fixture = await createMenuPostgresFixture(url!);
      admin = new MenuAdminService(fixture.client as PrismaService);
      menu = new MenuService(fixture.client as PrismaService);
      for (const id of [restaurantId, otherRestaurantId]) {
        await fixture.client.restaurant.create({
          data: {
            id,
            nombre: 'Administración aislada',
            direccion: 'Prueba',
            latitud: 0,
            longitud: 0,
            telefono: '0',
            whatsapp: '0',
            aforoTotal: 30,
          },
        });
      }
    }, 60000);
    afterAll(async () => {
      await fixture?.close();
    });

    // Cada caso crea su propio plato; ninguna escritura toca el restaurante de Supabase.
    async function createDish() {
      const category = await admin.createCategory(restaurantId, {
        nombre: randomUUID(),
        orden: 0,
      });
      const dish = await admin.createDish(
        restaurantId,
        DishCreateSchema.parse({
          categoriaId: category.id,
          nombre: 'Plato de integración',
          slug: randomUUID(),
          descripcion: 'Persistencia real',
          precio: 38000,
        }),
      );
      return { category, dish };
    }

    it('guarda precio y cambios, y el menú público lee la versión persistida', async () => {
      const { dish } = await createDish();
      await admin.updateDish(restaurantId, dish.id, {
        nombre: 'Plato editado',
        precio: 42000,
      });
      await admin.setGeneralAvailability(restaurantId, dish.id, false);
      const result = await menu.dish(dish.id, query);
      expect(result.plato).toMatchObject({
        nombre: 'Plato editado',
        precio: 42000,
        disponible: false,
      });
      expect(
        await fixture.client.dish.findUnique({ where: { id: dish.id } }),
      ).toMatchObject({ disponible: false });
    });

    it('la baja lógica oculta el plato, conserva sus datos y admite reactivación', async () => {
      const { dish } = await createDish();
      await admin.setDishActive(restaurantId, dish.id, false);
      await expect(menu.dish(dish.id, query)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        await fixture.client.dish.findUnique({ where: { id: dish.id } }),
      ).toMatchObject({ activo: false });
      const rows = await admin.dishes({ ...query, incluirInactivos: true });
      expect(rows.data.some((row) => row.id === dish.id)).toBe(true);
      await admin.setDishActive(restaurantId, dish.id, true);
      await expect(menu.dish(dish.id, query)).resolves.toMatchObject({
        plato: { id: dish.id },
      });
    });

    it('desactivar una categoría retira sus platos sin eliminarlos', async () => {
      const { category, dish } = await createDish();
      await admin.updateCategory(restaurantId, category.id, {
        activa: false,
        orden: 2,
      });
      await expect(menu.dish(dish.id, query)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        await fixture.client.dish.findUnique({ where: { id: dish.id } }),
      ).not.toBeNull();
      await admin.updateCategory(restaurantId, category.id, { activa: true });
      await expect(menu.dish(dish.id, query)).resolves.toMatchObject({
        plato: { id: dish.id },
      });
    });

    it('rechaza ediciones desde otra sede y conserva los datos originales', async () => {
      const { category, dish } = await createDish();
      await expect(
        admin.updateDish(otherRestaurantId, dish.id, { precio: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        admin.updateCategory(otherRestaurantId, category.id, { activa: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect((await menu.dish(dish.id, query)).plato.precio).toBe(38000);
    });

    it('revierte una edición con etiquetas inexistentes y traduce el slug duplicado a 409', async () => {
      const { dish, category } = await createDish();
      await expect(
        admin.updateDish(restaurantId, dish.id, {
          precio: 1,
          etiquetasIds: [randomUUID()],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect((await menu.dish(dish.id, query)).plato.precio).toBe(38000);
      await expect(
        admin.createDish(
          restaurantId,
          DishCreateSchema.parse({
            categoriaId: category.id,
            nombre: 'Duplicado',
            slug: dish.slug,
            descripcion: 'No debe guardarse',
            precio: 1,
          }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        await fixture.client.dish.count({ where: { categoryId: category.id } }),
      ).toBe(1);
    });
  },
);
