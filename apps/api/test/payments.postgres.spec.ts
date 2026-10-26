import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PaymentConfigSchema } from '@encanto/shared';
import { PaymentsModule } from '../src/payments/payments.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { ReservationsService } from '../src/reservations/reservations.service.js';
import {
  calendarDate,
  dateKey,
  todayInBogota,
} from '../src/calendar/calendar.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)(
  'pagos editables con HTTP/JWT y PostgreSQL aislado',
  () => {
    let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
    let app: INestApplication;
    let admin: string, diner: string, staff: string;
    const adminId = randomUUID(),
      dinerId = randomUUID(),
      restaurantId = randomUUID();
    const values = {
      whatsapp: '+573000000001',
      mediosPago:
        'Efectivo en caja\nNequi: dato de prueba\nLlave: dato de prueba',
      instruccionesPago:
        'Datos ficticios: no pagar. Enviar comprobante para revisión.',
    };
    beforeAll(async () => {
      fixture = await createMenuPostgresFixture(url!);
      await fixture.client.restaurant.create({
        data: {
          id: restaurantId,
          nombre: 'QA pagos',
          direccion: 'Prueba',
          latitud: 0,
          longitud: 0,
          telefono: '',
          whatsapp: '',
          aforoTotal: 30,
        },
      });
      await fixture.client.user.createMany({
        data: [adminId, dinerId].map((id, i) => ({
          id,
          nombre: 'QA',
          correo: `${id}@example.test`,
          telefono: '',
          passwordHash: 'no-login',
          rol: i ? 'COMENSAL' : 'ADMIN',
        })),
      });
      await fixture.client.timeSlot.createMany({
        data: Array.from({ length: 7 }, (_, diaSemana) => ({
          restaurantId,
          diaSemana,
          horaApertura: '10:00',
          horaCierre: '18:00',
          abierto: true,
        })),
      });
      Reflect.defineMetadata('design:paramtypes', [JwtService], JwtAuthGuard);
      Reflect.defineMetadata('design:paramtypes', [Reflector], RolesGuard);
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            ignoreEnvVars: true,
          }),
          PaymentsModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(fixture.client)
        .overrideProvider(ConfigService)
        .useValue(
          new ConfigService({ JWT_ACCESS_SECRET: 'pagos-aislados-solo-test' }),
        )
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
      await app.init();
      const jwt = app.get(JwtService);
      admin = jwt.sign({
        sub: adminId,
        correo: 'admin@example.test',
        sid: 'qa',
        rol: 'ADMIN',
      });
      diner = jwt.sign({
        sub: dinerId,
        correo: 'cliente@example.test',
        sid: 'qa',
        rol: 'COMENSAL',
      });
      staff = jwt.sign({
        sub: dinerId,
        correo: 'staff@example.test',
        sid: 'qa',
        rol: 'STAFF',
      });
    }, 60000);
    afterAll(async () => {
      await app?.close();
      await fixture?.close();
    });
    const get = (token: string) =>
      request(app.getHttpServer())
        .get('/api/v1/reservas/datos-pago')
        .auth(token, { type: 'bearer' });
    const save = (token: string, body: unknown) =>
      request(app.getHttpServer())
        .put('/api/v1/admin/configuracion/pagos')
        .auth(token, { type: 'bearer' })
        .send(body);

    it('no publica instrucciones inventadas en una sede recién migrada', async () => {
      const response = await get(diner).expect(200);
      expect(response.body).toMatchObject({
        configurada: false,
        mediosPago: '',
        instruccionesPago: '',
        whatsapp: '',
        version: 0,
      });
    });
    it('exige JWT y rechaza escrituras de comensal y STAFF', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reservas/datos-pago')
        .expect(401);
      await request(app.getHttpServer())
        .put('/api/v1/admin/configuracion/pagos')
        .send({ ...values, version: 0 })
        .expect(401);
      for (const token of [diner, staff]) {
        await save(token, { ...values, version: 0 }).expect(403);
        await request(app.getHttpServer())
          .get('/api/v1/admin/configuracion/pagos')
          .auth(token, { type: 'bearer' })
          .expect(403);
      }
      expect(await fixture.client.auditLog.count()).toBe(0);
    });
    it('valida tamaño, teléfono internacional, versión y campos desconocidos', async () => {
      for (const extra of [
        { whatsapp: '3001234567' },
        { mediosPago: 'x'.repeat(4001) },
        { version: -1 },
        { rol: 'ADMIN' },
      ]) {
        await save(admin, { ...values, version: 0, ...extra }).expect(400);
      }
      expect(
        PaymentConfigSchema.safeParse({ ...values, version: 0 }).success,
      ).toBe(true);
    });
    it('guarda texto libre, persiste sin reiniciar y registra al dueño', async () => {
      const response = await save(admin, { ...values, version: 0 }).expect(200);
      expect(response.body).toMatchObject({
        ...values,
        version: 1,
        configurada: true,
      });
      expect((await get(diner).expect(200)).body).toEqual(response.body);
      expect(await fixture.client.auditLog.findFirst()).toMatchObject({
        usuarioId: adminId,
        accion: 'CONFIGURAR_PAGOS',
      });
      // Una instancia nueva lee los mismos datos de la base, no de memoria o de .env.
      expect(
        await fixture.client.restaurant.findUnique({
          where: { id: restaurantId },
        }),
      ).toMatchObject({ ...values, pagoVersion: 1 });
    });
    it('rechaza versión vieja sin perder datos ni generar auditoría falsa', async () => {
      await save(admin, {
        ...values,
        mediosPago: 'Cambio viejo',
        version: 0,
      }).expect(409);
      expect((await get(diner)).body.mediosPago).toBe(values.mediosPago);
      expect(await fixture.client.auditLog.count()).toBe(1);
    });
    it('una solicitud nueva usa los datos editados y permanece SOLICITADA', async () => {
      const current = (await get(diner)).body;
      await save(admin, {
        ...values,
        mediosPago: 'Efectivo o llave nueva de prueba',
        version: current.version,
      }).expect(200);
      const service = new ReservationsService(fixture.client as never);
      const fecha = dateKey(
        new Date(calendarDate(todayInBogota()).getTime() + 7 * 86400000),
      );
      const result = await service.create(dinerId, {
        fecha,
        horaInicio: '12:00',
        numComensales: 2,
        lineas: [],
        nota: null,
      });
      expect(result).toMatchObject({
        reserva: { estado: 'SOLICITADA', total: 0 },
        pago: { mediosPago: 'Efectivo o llave nueva de prueba', version: 2 },
      });
      expect(result.instruccionesPago).toContain('llave nueva');
    });
    it('permite retirar instrucciones publicadas sin borrar las reservas', async () => {
      const current = (await get(diner)).body;
      const response = await save(admin, {
        whatsapp: '',
        mediosPago: '',
        instruccionesPago: '',
        version: current.version,
      }).expect(200);
      expect(response.body.configurada).toBe(false);
      expect(await fixture.client.reservation.count()).toBe(1);
    });
  },
);
