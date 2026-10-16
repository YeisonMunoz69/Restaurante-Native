import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MenuModule } from './menu.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter.js';
import {
  menuDishId,
  menuPrismaMock,
  menuRestaurantId,
} from '../../test/menu.fixture.js';

describe('HTTP público de menú con Prisma simulado', () => {
  let app: INestApplication;
  const db = menuPrismaMock();
  const query = `?restauranteId=${menuRestaurantId}`;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [MenuModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    Object.assign(db, menuPrismaMock());
    db.$transaction.mockImplementation(async (callback) => callback(db));
  });

  // Las cuatro consultas funcionan sin sesión; no añadimos escrituras de administración.
  it.each(['categorias', 'etiquetas', 'platos', `platos/${menuDishId}`])(
    'GET %s es público y documentado',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/menu/${path}${query}${path.startsWith('platos') ? '&fecha=2031-02-23' : ''}`,
        )
        .expect(200);
      expect(response.body.restauranteId).toBe(menuRestaurantId);
      if (response.body.data)
        expect(response.body.paginacion).toMatchObject({
          pagina: 1,
          tamanoPagina: 20,
          total: 1,
        });
      if (response.body.plato)
        expect(typeof response.body.plato.precio).toBe('number');
    },
  );

  it.each([
    'platos',
    'platos&fecha=2031-02-30',
    'platos&fecha=2026-02-29',
    'platos&fecha=2031-02-23&pagina=0',
    'platos&fecha=2031-02-23&tamanoPagina=101',
    'platos&fecha=2031-02-23&pagina=1&pagina=2',
    'platos&fecha=2031-02-23&buscar=plato',
  ])('rechaza query inválida antes de Prisma: %s', async (value) => {
    const [path, ...params] = value.split('&');
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/menu/${path}${query}${params.length ? '&' + params.join('&') : ''}`,
      )
      .expect(400);
    expect(Array.isArray(response.body.message)).toBe(true);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza UUID inválidos, fecha ausente en detalle y restaurante ausente', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/menu/platos/no-uuid${query}&fecha=2031-02-23`)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/menu/platos/${menuDishId}${query}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/menu/categorias?restauranteId=invalido')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/menu/categorias')
      .expect(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('admite el 29 de febrero en año bisiesto y pagina las tres listas', async () => {
    for (const path of ['categorias', 'etiquetas', 'platos']) {
      await request(app.getHttpServer())
        .get(
          `/api/v1/menu/${path}${query}&pagina=2&tamanoPagina=1${path === 'platos' ? '&fecha=2028-02-29' : ''}`,
        )
        .expect(200);
    }
  });

  it('devuelve 404 para sede y plato inexistentes, sin respuestas de muestra', async () => {
    db.dish.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/api/v1/menu/platos/${menuDishId}${query}&fecha=2031-02-23`)
      .expect(404);
    db.restaurant.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/api/v1/menu/categorias${query}`)
      .expect(404);
  });

  it('no convierte un fallo de Prisma en carta vacía', async () => {
    db.dish.findMany.mockRejectedValue(new Error('Error de base de prueba'));
    const response = await request(app.getHttpServer())
      .get(`/api/v1/menu/platos${query}&fecha=2031-02-23`)
      .expect(500);
    expect(response.body).not.toHaveProperty('data');
  });

  it('las rutas de menú de este PR no aceptan POST', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/menu/platos${query}`)
      .send({ nombre: 'No escribir' })
      .expect(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('Swagger publica paginación, fecha, precio numérico y respuestas tipadas', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    for (const path of [
      '/api/v1/menu/categorias',
      '/api/v1/menu/platos',
      '/api/v1/menu/etiquetas',
      '/api/v1/menu/platos/{id}',
    ]) {
      expect(doc.paths[path].get.responses['200']).toHaveProperty('content');
      expect(doc.paths[path].get.responses['400']).toBeDefined();
      expect(doc.paths[path].get.responses['404']).toBeDefined();
    }
    const serialized = JSON.stringify(doc.paths['/api/v1/menu/platos'].get);
    expect(serialized).toContain('disponibilidadOrigen');
    expect(serialized).toContain('tamanoPagina');
    expect(serialized).toContain('"precio":{"type":"number"');
    expect(doc.paths['/api/v1/menu/platos'].get.security).toBeUndefined();
  });
});
