import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import { DishAvailabilityModule } from './dish-availability.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter.js';

const restaurantId = '11111111-1111-4111-8111-111111111111';
const dishId = '22222222-2222-4222-8222-222222222222';
const base = `/api/v1/admin/menu/disponibilidad`;
const query = `?restauranteId=${restaurantId}`;
const row = {
  id: dishId,
  nombre: 'Prueba',
  disponible: true,
  updatedAt: new Date(0),
  category: { id: dishId, nombre: 'Categoría', orden: 0 },
  schedules: [
    { id: dishId, fecha: new Date('2031-02-23'), disponible: false, cupo: 9 },
  ],
};

describe('Disponibilidad HTTP con JWT real y Prisma simulado', () => {
  let app: INestApplication;
  let admin: string;
  let comensal: string;
  const db = {
    restaurant: { findUnique: vi.fn() },
    dish: { count: vi.fn(), findMany: vi.fn() },
    dishSchedule: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Compilo AuthModule y los guards de producción, sin desactivar permisos.
  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [JwtService], JwtAuthGuard);
    Reflect.defineMetadata('design:paramtypes', [Reflector], RolesGuard);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
        }),
        DishAvailabilityModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          JWT_ACCESS_SECRET: 'solo-ec28-test',
          JWT_ACCESS_EXPIRATION: '15m',
        }),
      )
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
    const jwt = app.get(JwtService);
    const payload = {
      sub: 'test',
      correo: 'prueba@example.test',
      sid: 'test-session',
    };
    admin = jwt.sign({ ...payload, rol: 'ADMIN' });
    comensal = jwt.sign({ ...payload, rol: 'COMENSAL' });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    db.restaurant.findUnique.mockResolvedValue({ id: restaurantId });
    db.dish.count.mockResolvedValue(1);
    db.dish.findMany.mockResolvedValue([row]);
    db.$transaction.mockImplementation(async (callback) => callback(db));
  });
  it.each(['get', 'put', 'post'] as const)(
    '%s exige 401 sin JWT y 403 para COMENSAL',
    async (method) => {
      const path = `${base}${method === 'get' ? '' : method === 'put' ? '/2031-02-23' : '/copiar'}${query}`;
      await request(app.getHttpServer())[method](path).send({}).expect(401);
      await request(app.getHttpServer())
        [method](path)
        .auth(comensal, { type: 'bearer' })
        .send({})
        .expect(403);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('expone excepción false sobre general true para ADMIN', async () => {
    const response = await request(app.getHttpServer())
      .get(`${base}${query}&fecha=2031-02-23`)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(response.body.data[0]).toMatchObject({
      disponibleGeneral: true,
      disponible: false,
      origen: 'FECHA',
    });
  });
  it.each(['2031-02-30', '2026-02-29', '2031-2-23'])(
    'rechaza fecha %s sin consultar',
    async (fecha) => {
      await request(app.getHttpServer())
        .put(`${base}/${fecha}${query}`)
        .auth(admin, { type: 'bearer' })
        .send({ cambios: [{ platoId: dishId, disponible: false }] })
        .expect(400);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    { cambios: [] },
    { cambios: [{ platoId: dishId, disponible: 'false' }] },
    {
      cambios: [
        { platoId: dishId, disponible: true },
        { platoId: dishId, disponible: false },
      ],
    },
  ])('rechaza lote inválido %j', async (body) => {
    await request(app.getHttpServer())
      .put(`${base}/2031-02-23${query}`)
      .auth(admin, { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('previsualiza sin escribir y exige confirmar la fotografía actual', async () => {
    const path = `${base}/copiar${query}`;
    const body = { origen: '2031-02-23', destino: '2031-02-24' };
    const preview = await request(app.getHttpServer())
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send(body)
      .expect(200);
    expect(preview.body).toMatchObject({
      aplicada: false,
      previsualizacion: { total: 1, cambios: 1 },
    });
    expect(db.dishSchedule.createMany).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send({ ...body, confirmacion: '0'.repeat(64) })
      .expect(409);
    await request(app.getHttpServer())
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send({
        ...body,
        confirmacion: preview.body.previsualizacion.confirmacion,
      })
      .expect(200);
    expect(db.dishSchedule.createMany).toHaveBeenCalledWith({
      data: [{ dishId, fecha: new Date('2031-02-24'), disponible: false }],
    });
  });
  it('un plato ajeno invalida el lote antes de escribir', async () => {
    db.dish.findMany.mockResolvedValue([]);
    await request(app.getHttpServer())
      .put(`${base}/2031-02-23${query}`)
      .auth(admin, { type: 'bearer' })
      .send({ cambios: [{ platoId: dishId, disponible: false }] })
      .expect(404);
    expect(db.dishSchedule.updateMany).not.toHaveBeenCalled();
  });
});
