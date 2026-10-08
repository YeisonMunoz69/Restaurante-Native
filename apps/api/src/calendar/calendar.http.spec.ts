import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { CalendarModule } from './calendar.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter.js';
import {
  exception,
  prismaMock,
  restaurantId,
  rule,
} from '../../test/calendar.fixture.js';

describe('Calendario HTTP con módulo real y Prisma simulado', () => {
  let app: INestApplication;
  let db: ReturnType<typeof prismaMock>;
  let admin: string;
  let comensal: string;
  let staff: string;
  let expired: string;
  const query = `?restauranteId=${restaurantId}`;

  // Compilo el módulo de producción con su AuthModule y JWT; no sustituyo guardias.
  beforeAll(async () => {
    db = prismaMock();
    // Vitest/esbuild no emite design:paramtypes: restauro solo esos metadatos existentes.
    Reflect.defineMetadata('design:paramtypes', [JwtService], JwtAuthGuard);
    Reflect.defineMetadata('design:paramtypes', [Reflector], RolesGuard);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
        }),
        CalendarModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          JWT_ACCESS_SECRET: 'solo-para-pruebas-calendario',
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
      sub: 'usuario-prueba',
      correo: 'prueba@example.test',
      sid: 'sesion-prueba',
    };
    admin = jwt.sign({ ...payload, rol: 'ADMIN' });
    comensal = jwt.sign({ ...payload, rol: 'COMENSAL' });
    staff = jwt.sign({ ...payload, rol: 'STAFF' });
    expired = jwt.sign({ ...payload, rol: 'ADMIN' }, { expiresIn: -1 });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    const fresh = prismaMock();
    Object.assign(db, fresh);
    // La transacción usa el mismo doble que reciben los servicios del módulo.
    db.$transaction.mockImplementation(async (callback) => callback(db));
  });

  it('consulta públicamente un día con varias franjas sin autenticación', async () => {
    db.timeSlot.findMany.mockResolvedValue([
      rule(),
      rule({ horaApertura: '18:00', horaCierre: '21:00' }),
    ]);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/calendario/dia${query}&fecha=2026-10-11`)
      .expect(200);
    expect(response.body.horarios).toHaveLength(2);
    expect(response.body).toMatchObject({
      fecha: '2026-10-11',
      zonaHoraria: 'America/Bogota',
      soloPorReserva: false,
    });
  });

  it('la excepción HTTP cierra una apertura semanal y luego abre solo por reserva', async () => {
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    db.calendarDay.findUnique.mockResolvedValue(
      exception({ abierto: false, soloPorReserva: false }),
    );
    const closed = await request(app.getHttpServer())
      .get(`/api/v1/calendario/dia${query}&fecha=2026-10-11`)
      .expect(200);
    expect(closed.body).toMatchObject({
      abierto: false,
      origen: 'EXCEPCION',
      horarios: [],
    });
    db.calendarDay.findUnique.mockResolvedValue(exception());
    const open = await request(app.getHttpServer())
      .get(`/api/v1/calendario/dia${query}&fecha=2026-10-11`)
      .expect(200);
    expect(open.body).toMatchObject({
      abierto: true,
      soloPorReserva: true,
      origen: 'EXCEPCION',
    });
  });

  it('devuelve null cuando no hay apertura en el intervalo', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/calendario/proximo${query}&desde=2026-10-08`)
      .expect(200);
    expect(response.body).toMatchObject({
      dia: null,
      diasBuscados: 366,
      hasta: '2027-10-08',
    });
  });

  it.each(['2026-02-30', '2026-13-01', 'fecha'])(
    'rechaza la fecha HTTP inválida %s antes de consultar Prisma',
    async (fecha) => {
      await request(app.getHttpServer())
        .get(`/api/v1/calendario/dia${query}&fecha=${fecha}`)
        .expect(400);
      expect(db.restaurant.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rechaza UUID y parámetros ausentes y fechas inválidas en próximo', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/calendario/dia?restauranteId=invalido&fecha=2026-10-11')
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/calendario/dia${query}`)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/calendario/proximo${query}&desde=2026-02-29`)
      .expect(400);
  });

  // Pruebo cada escritura con los guards reales y tokens firmados, no con roles inyectados.
  const writes = [
    { method: 'put', path: 'reglas/0', body: { reglas: [] } },
    { method: 'put', path: 'excepciones/2026-10-11', body: { abierto: false } },
    { method: 'delete', path: 'excepciones/2026-10-11', body: {} },
  ] as const;
  for (const write of writes) {
    it(`${write.method} ${write.path}: 401 anónimo y token inválido/expirado, 403 COMENSAL/STAFF`, async () => {
      const call = (token?: string) => {
        const pending = request(app.getHttpServer())
          [write.method](`/api/v1/admin/calendario/${write.path}${query}`)
          .send(write.body);
        return token ? pending.auth(token, { type: 'bearer' }) : pending;
      };
      await call().expect(401);
      await call('token-invalido').expect(401);
      await call(expired).expect(401);
      await call(comensal).expect(403);
      await call(staff).expect(403);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  }

  it('un ADMIN guarda múltiples franjas y consulta reglas', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/calendario/reglas/0${query}`)
      .auth(admin, { type: 'bearer' })
      .send({
        reglas: [
          { horaApertura: '09:00', horaCierre: '12:00' },
          { horaApertura: '14:00', horaCierre: '18:00' },
        ],
      })
      .expect(200);
    expect(db.timeSlot.createMany.mock.calls[0][0].data).toHaveLength(2);
    db.timeSlot.findMany.mockResolvedValue([rule({ activo: false })]);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/calendario/reglas${query}`)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(response.body[0]).toMatchObject({ activo: false });
    expect(response.body[0]).not.toHaveProperty('aforoMaximo');
  });

  it.each([
    { reglas: [{ horaApertura: '24:00', horaCierre: '25:00' }] },
    { reglas: [{ horaApertura: '12:60', horaCierre: '17:00' }] },
    { reglas: [{ horaApertura: '17:00', horaCierre: '12:00' }] },
    { reglas: [{ horaApertura: '12:00', horaCierre: '12:00' }] },
    {
      reglas: [{ horaApertura: '12:00', horaCierre: '17:00', activo: 'false' }],
    },
    {
      reglas: [{ horaApertura: '12:00', horaCierre: '17:00', aforoMaximo: 50 }],
    },
  ])('rechaza reglas inválidas por HTTP: %j', async (body) => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/calendario/reglas/0${query}`)
      .auth(admin, { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza día semanal fuera de rango y una apertura sin horas', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/admin/calendario/reglas/7${query}`)
      .auth(admin, { type: 'bearer' })
      .send({ reglas: [] })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/calendario/excepciones/2026-02-30${query}`)
      .auth(admin, { type: 'bearer' })
      .send({ abierto: false })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/calendario/excepciones/2026-10-11${query}`)
      .auth(admin, { type: 'bearer' })
      .send({ abierto: true })
      .expect(400);
  });

  it('devuelve advertencia estructurada, revalida y permite confirmar sin modificar reservas', async () => {
    db.reservation.count.mockResolvedValue(2);
    const path = `/api/v1/admin/calendario/excepciones/2026-10-11${query}`;
    const response = await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({ abierto: false })
      .expect(409);
    expect(response.body).toMatchObject({
      statusCode: 409,
      path,
      message: {
        codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS',
        reservasAfectadas: 2,
        fechas: [{ fecha: '2026-10-11', cantidad: 2 }],
      },
    });
    expect(db.calendarDay.upsert).not.toHaveBeenCalled();
    db.reservation.count.mockResolvedValue(3);
    await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({ abierto: false, confirmarReservasAfectadas: 2 })
      .expect(409);
    const confirmed = await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({ abierto: false, confirmarReservasAfectadas: 3 })
      .expect(200);
    expect(confirmed.body).toMatchObject({
      reservasAfectadas: 3,
      excepcion: { abierto: false, fecha: '2026-10-11' },
    });
    expect(Object.keys(db.reservation).sort()).toEqual(['count', 'groupBy']);
  });

  it('confirma por HTTP un cierre al eliminar una excepción abierta', async () => {
    db.calendarDay.findUnique.mockResolvedValue(exception());
    db.reservation.count.mockResolvedValue(2);
    const path = `/api/v1/admin/calendario/excepciones/2026-10-11${query}`;
    const warning = await request(app.getHttpServer())
      .delete(path)
      .auth(admin, { type: 'bearer' })
      .expect(409);
    expect(warning.body.message.reservasAfectadas).toBe(2);
    expect(db.calendarDay.delete).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .delete(path)
      .auth(admin, { type: 'bearer' })
      .send({ confirmarReservasAfectadas: 2 })
      .expect(200);
    expect(db.calendarDay.delete).toHaveBeenCalledTimes(1);
  });

  it('confirma por HTTP un cierre de reglas semanales', async () => {
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    db.reservation.groupBy.mockResolvedValue([
      { fecha: new Date('2026-10-11T00:00:00Z'), _count: { _all: 2 } },
    ]);
    const path = `/api/v1/admin/calendario/reglas/0${query}`;
    const warning = await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({ reglas: [] })
      .expect(409);
    expect(warning.body.message).toMatchObject({
      reservasAfectadas: 2,
      fechas: [{ fecha: '2026-10-11', cantidad: 2 }],
    });
    expect(db.timeSlot.deleteMany).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({ reglas: [], confirmarReservasAfectadas: 2 })
      .expect(200);
    expect(db.timeSlot.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('guarda soloPorReserva, consulta y elimina la excepción con ADMIN', async () => {
    const path = `/api/v1/admin/calendario/excepciones/2026-10-11${query}`;
    const response = await request(app.getHttpServer())
      .put(path)
      .auth(admin, { type: 'bearer' })
      .send({
        abierto: true,
        horaApertura: '09:00',
        horaCierre: '11:00',
        soloPorReserva: true,
      })
      .expect(200);
    expect(response.body.excepcion.soloPorReserva).toBe(true);
    db.calendarDay.findUnique.mockResolvedValue(exception());
    const saved = await request(app.getHttpServer())
      .get(`/api/v1/admin/calendario/excepciones${query}&fecha=2026-10-11`)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(saved.body).toMatchObject({
      soloPorReserva: true,
      fecha: '2026-10-11',
    });
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    await request(app.getHttpServer())
      .delete(path)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(db.calendarDay.delete).toHaveBeenCalledTimes(1);
  });

  it('expone el 404 de sede inexistente y excepción inexistente', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/calendario/excepciones/2026-10-11${query}`)
      .auth(admin, { type: 'bearer' })
      .expect(404);
    db.restaurant.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/api/v1/calendario/dia${query}&fecha=2026-10-11`)
      .expect(404);
  });

  it('Swagger registra las rutas, JWT, cuerpos, respuestas y advertencia de cierre', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(
      doc.paths['/api/v1/calendario/dia'].get.responses['200'],
    ).toHaveProperty('content');
    const write = doc.paths['/api/v1/admin/calendario/excepciones/{fecha}'].put;
    expect(write.security).toEqual([{ bearer: [] }]);
    expect(write.requestBody).toHaveProperty('content');
    for (const status of ['200', '400', '401', '403', '404', '409'])
      expect(write.responses[status]).toBeDefined();
    expect(JSON.stringify(write.responses['409'])).toContain(
      'reservasAfectadas',
    );
    expect(
      doc.paths['/api/v1/admin/calendario/reglas/{diaSemana}'].put,
    ).toBeDefined();
  });
});
