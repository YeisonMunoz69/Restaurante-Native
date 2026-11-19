import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, PrismaClient, ReservationStatus } from '@prisma/client';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ReservationsModule } from '../src/reservations/reservations.module.js';
import { ReservationsService } from '../src/reservations/reservations.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';
import { calendarDate, dateKey, todayInBogota } from '../src/calendar/calendar.service.js';

const databaseUrl = process.env.RESERVATION_TEST_DATABASE_URL;
const shouldRun = Boolean(databaseUrl);
const restaurantId = '10000000-0000-4000-8000-000000000001';
const categoryId = '20000000-0000-4000-8000-000000000001';
const dinerId = '30000000-0000-4000-8000-000000000001';
const secondDinerId = '30000000-0000-4000-8000-000000000002';
const adminId = '30000000-0000-4000-8000-000000000003';
const staffId = '30000000-0000-4000-8000-000000000004';
const dishId = '40000000-0000-4000-8000-000000000001';
// Mantengo la fecha futura para que esta integración se pueda ejecutar cualquier día.
const fecha = dateKey(
  new Date(calendarDate(todayInBogota()).getTime() + 7 * 86400000),
);

describe.skipIf(!shouldRun)('reservas contra PostgreSQL aislado', () => {
  let prisma: PrismaClient;
  let service: ReservationsService;
  let app: INestApplication;
  let closeFixture: (() => Promise<void>) | undefined;
  let receiptImage: Buffer;

  beforeAll(async () => {
    const fixture = await createMenuPostgresFixture(databaseUrl!);
    prisma = fixture.client;
    closeFixture = fixture.close;
    service = new ReservationsService(prisma as never);
    receiptImage = await sharp({ create: { width: 220, height: 490, channels: 3, background: '#bbd3a5' } }).png().toBuffer();
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        nombre: 'El Encanto de prueba',
        direccion: 'Timbío',
        latitud: new Prisma.Decimal('2.35'),
        longitud: new Prisma.Decimal('-76.68'),
        telefono: '+573000000000',
        whatsapp: '+573000000000',
        aforoTotal: 8,
        duracionReservaHasta4Min: 90,
        duracionReservaDesde5Min: 120,
        granularidadMin: 30,
        ventanaCancelacionMin: 60,
        anticipacionMaxMeses: 3,
        anticipacionMinMin: 60,
        minPersonasEntreSemana: 15,
        horasExpiracionSolicitud: 12,
      },
    });
    await prisma.user.createMany({
      data: [dinerId, secondDinerId, adminId, staffId].map((id, index) => ({
        id,
        nombre: `Usuario ${index + 1}`,
        correo: `usuario${index + 1}@example.test`,
        telefono: '+573000000000',
        passwordHash: 'hash-de-prueba',
        rol: id === adminId ? 'ADMIN' : id === staffId ? 'STAFF' : 'COMENSAL',
      })),
    });
    await prisma.category.create({
      data: { id: categoryId, restaurantId, nombre: 'Principales', activa: true },
    });
    await prisma.dish.create({
      data: {
        id: dishId,
        categoryId,
        nombre: 'Sancocho',
        slug: 'sancocho-prueba',
        descripcion: 'Plato de prueba',
        precio: new Prisma.Decimal('32000'),
      },
    });
    await prisma.timeSlot.createMany({
      data: Array.from({ length: 7 }, (_, diaSemana) => ({
        restaurantId,
        diaSemana,
        horaApertura: '10:00',
        horaCierre: '16:00',
        abierto: true,
        aforoMaximo: 8,
        activo: true,
      })),
    });
    // Uso controladores y guardias reales con JWT y base exclusivos de esta prueba.
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), ReservationsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => key === 'JWT_ACCESS_SECRET' ? 'jwt-exclusivo-qa-reservas' : undefined })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  beforeEach(async () => {
    await prisma.reservation.deleteMany();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await closeFixture?.();
    }
  });

  it('exige una captura privada y permite aprobar únicamente su revisión vigente como ADMIN', async () => {
    const jwt = app.get(JwtService);
    const diner = jwt.sign({ sub: dinerId, correo: 'usuario1@example.test', rol: 'COMENSAL', sid: 'qa-comensal' });
    const admin = jwt.sign({ sub: adminId, correo: 'usuario3@example.test', rol: 'ADMIN', sid: 'qa-admin' });
    const other = jwt.sign({ sub: secondDinerId, correo: 'usuario2@example.test', rol: 'COMENSAL', sid: 'qa-otro' });
    const staff = jwt.sign({ sub: staffId, correo: 'usuario4@example.test', rol: 'STAFF', sid: 'qa-staff' });
    const server = request(app.getHttpServer());
    const payload = { fecha, horaInicio: '10:00', numComensales: 2, lineas: [], nota: null };

    await server.post('/api/v1/reservas').send(payload).expect(401);
    const { body } = await server.post('/api/v1/reservas').auth(diner, { type: 'bearer' }).send(payload).expect(201);
    expect(body.reserva).toMatchObject({ estado: 'SOLICITADA', total: 0, lineas: [] });
    expect(body.reserva.ticket).toContain(body.reserva.codigo);

    const approval = `/api/v1/admin/reservas/${body.reserva.id}/aprobar`;
    const proof = `/api/v1/reservas/mias/${body.reserva.id}/comprobante`;
    const adminProof = `/api/v1/admin/reservas/${body.reserva.id}/comprobante`;
    const ticket = `/api/v1/reservas/mias/${body.reserva.id}/imagen`;
    const attach = (token: string, bytes = receiptImage) => server.put(proof)
      .auth(token, { type: 'bearer' }).attach('foto', bytes, 'prueba.png');
    await server.patch(approval).auth(diner, { type: 'bearer' }).expect(403);
    await server.patch(approval).auth(admin, { type: 'bearer' }).expect(409);
    await attach(other).expect(404);
    await attach(diner, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>')).expect(400);
    const first = await attach(diner).expect(200);
    expect(first.body.comprobante).toMatchObject({ ancho: 220, alto: 490 });
    expect(first.body.comprobante.imagen).toBeUndefined();
    await server.get(proof).auth(other, { type: 'bearer' }).expect(404);
    await server.get(adminProof).auth(staff, { type: 'bearer' }).expect(403);
    await server.get(ticket).auth(other, { type: 'bearer' }).expect(404);
    const consulted = await server.get(adminProof).auth(admin, { type: 'bearer' }).expect(200);
    expect(consulted.headers['cache-control']).toBe('private, no-store');
    expect(consulted.body.id).toBe(first.body.comprobante.id);
    const graphic = await server.get(ticket).auth(diner, { type: 'bearer' }).expect(200);
    const exportPng = sharp(Buffer.from(graphic.body.imagen, 'base64'));
    const graphicMeta = await exportPng.metadata();
    expect(graphicMeta).toMatchObject({ format: 'png', width: 1240, height: graphic.body.alto });
    expect(graphicMeta.height).toBeGreaterThan(490);
    const sample = await exportPng.extract({ left: 620, top: graphic.body.alto - 70, width: 1, height: 1 }).raw().toBuffer();
    expect([...sample].slice(0, 3)).toEqual([187, 211, 165]);
    const second = await attach(diner).expect(200);
    await server.patch(approval).auth(admin, { type: 'bearer' }).send({ comprobanteId: first.body.comprobante.id }).expect(409);
    await server.patch(approval).auth(admin, { type: 'bearer' }).send({ comprobanteId: second.body.comprobante.id }).expect(200);
    await server.patch(approval).auth(admin, { type: 'bearer' }).expect(409);
    await attach(diner).expect(409);
    const row = await prisma.reservation.findUniqueOrThrow({ where: { id: body.reserva.id } });
    expect(row.estado).toBe(ReservationStatus.CONFIRMADA);
  });

  it('genera solo franjas a una hora o más y deja libre el tramo ocupado', async () => {
    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 4,
      lineas: [],
      nota: null,
    });
    const options = await service.availableSlots({ fecha, numComensales: 5 });

    expect(created.reserva.horaFin).toBe('11:30');
    expect(options.franjas.some((slot) => slot.horaInicio === '10:30')).toBe(false);
    expect(options.franjas.some((slot) => slot.horaInicio === '11:30')).toBe(true);
  });

  it('recalcula el aforo en la transacción y no duplica solicitudes concurrentes', async () => {
    const results = await Promise.allSettled([
      service.create(dinerId, {
        fecha,
        horaInicio: '10:00',
        numComensales: 4,
        lineas: [],
        nota: null,
      }),
      service.create(secondDinerId, {
        fecha,
        horaInicio: '10:00',
        numComensales: 5,
        lineas: [{ platoId: dishId, cantidad: 1 }],
        nota: null,
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.getStatus()).toBe(409);
    const rows = await prisma.reservation.findMany({ include: { lines: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0].numComensales).toBeLessThanOrEqual(8);
    expect(await prisma.reservationLine.count()).toBe(rows[0].lines.length);
  });

  it('guarda el precio del pedido, y rechaza grupos de ocho sin pedido', async () => {
    await expect(
      service.create(dinerId, {
        fecha,
        horaInicio: '10:00',
        numComensales: 8,
        lineas: [],
        nota: null,
      }),
    ).rejects.toThrow('pedido anticipado es obligatorio');

    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 4,
      lineas: [{ platoId: dishId, cantidad: 2 }],
      nota: null,
    });
    await prisma.dish.update({ where: { id: dishId }, data: { precio: 1000 } });
    const detail = await service.mineDetail(dinerId, created.reserva.id);

    expect(detail.total).toBe(64000);
    expect(detail.lineas[0].precioUnitario).toBe(32000);
  });

  it('rechaza una reserva de otro usuario y hace terminal un rechazo', async () => {
    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 4,
      lineas: [],
      nota: null,
    });
    await expect(service.mineDetail(secondDinerId, created.reserva.id)).rejects.toThrow(
      'Reserva inexistente',
    );
    await service.reject(adminId, created.reserva.id, { motivo: 'No hay disponibilidad' });
    await expect(service.approve(adminId, created.reserva.id)).rejects.toThrow(
      'Solo una solicitud vigente puede confirmarse',
    );
  });

  it.each([60, 59])('aplica el límite de cancelación con %i minutos restantes', async (remaining) => {
    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 4,
      lineas: [],
      nota: null,
    });
    const id = created.reserva.id;
    const proof = await service.uploadReceipt(dinerId, id, receiptImage);
    await service.approve(adminId, id, proof.comprobante!.id);

    // Fijo únicamente Date para probar el límite sin adelantar los temporizadores de Prisma.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.parse(`${fecha}T10:00:00-05:00`) - remaining * 60_000));
    try {
      const cancellation = service.cancel(dinerId, id);
      if (remaining === 60) {
        await expect(cancellation).resolves.toMatchObject({ estado: ReservationStatus.CANCELADA });
      } else {
        await expect(cancellation).rejects.toThrow('hasta 60 minutos antes');
        const row = await prisma.reservation.findUniqueOrThrow({ where: { id } });
        expect(row.estado).toBe(ReservationStatus.CONFIRMADA);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('incrementa el contador cuando el comensal cancela una solicitud', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: dinerId } });
    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 2,
      lineas: [],
      nota: null,
    });

    await service.cancel(dinerId, created.reserva.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: dinerId } });
    expect(after.cancelaciones).toBe(before.cancelaciones + 1);
  });

  it('registra llegada y cierre de atención con sus responsables', async () => {
    const created = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 2,
      lineas: [],
      nota: null,
    });
    const proof = await service.uploadReceipt(dinerId, created.reserva.id, receiptImage);
    await service.approve(adminId, created.reserva.id, proof.comprobante!.id);

    const arrived = await service.markArrival(adminId, created.reserva.id);
    const completed = await service.complete(adminId, created.reserva.id);

    expect(arrived.estado).toBe(ReservationStatus.EN_CURSO);
    expect(arrived.llegadaPorId).toBe(adminId);
    expect(completed.estado).toBe(ReservationStatus.COMPLETADA);
    expect(completed.completadaPorId).toBe(adminId);
  });

  it('registra una inasistencia y aumenta el antecedente del comensal', async () => {
    const oldDate = dateKey(
      new Date(calendarDate(todayInBogota()).getTime() - 2 * 86400000),
    );
    const row = await prisma.reservation.create({
      data: {
        usuarioId: dinerId,
        codigo: `EC-${oldDate.replaceAll('-', '')}-MISSED001`,
        fecha: calendarDate(oldDate),
        horaInicio: '10:00',
        horaFin: '11:30',
        numComensales: 2,
        estado: ReservationStatus.CONFIRMADA,
        total: 0,
      },
    });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: dinerId } });

    const result = await service.markNoShow(adminId, row.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: dinerId } });
    expect(result.estado).toBe(ReservationStatus.NO_ASISTIO);
    expect(result.inasistioPorId).toBe(adminId);
    expect(after.inasistencias).toBe(before.inasistencias + 1);
  });

  it('expira perezosamente solicitudes con 12 horas sin revisión', async () => {
    const row = await prisma.reservation.create({
      data: {
        usuarioId: dinerId,
        codigo: 'EC-20261023-OLD12345',
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        horaInicio: '10:00',
        horaFin: '11:30',
        numComensales: 2,
        estado: ReservationStatus.SOLICITADA,
        total: 0,
        createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
      },
    });

    const list = await service.mine(dinerId);

    expect(list.find((reservation) => reservation.id === row.id)?.estado).toBe(
      ReservationStatus.EXPIRADA,
    );
  });

  it('permite grupos pequeños entre semana habilitada y rechaza días de solo pesca/motos', async () => {
    await prisma.calendarDay.upsert({
      where: { restaurantId_fecha: { restaurantId, fecha: calendarDate(fecha) } },
      create: { restaurantId, fecha: calendarDate(fecha), abierto: true, horaApertura: '10:00', horaCierre: '16:00', soloPorReserva: true, servicios: ['RESTAURANTE', 'PESCA'] },
      update: { abierto: true, horaApertura: '10:00', horaCierre: '16:00', soloPorReserva: true, servicios: ['RESTAURANTE', 'PESCA'] },
    });
    try {
      expect((await service.availableSlots({ fecha, numComensales: 2 })).franjas.length).toBeGreaterThan(0);
      await prisma.calendarDay.update({ where: { restaurantId_fecha: { restaurantId, fecha: calendarDate(fecha) } }, data: { servicios: ['PESCA', 'MOTOS'] } });
      expect((await service.availableSlots({ fecha, numComensales: 2 })).franjas).toEqual([]);
      await expect(service.create(dinerId, { fecha, horaInicio: '10:00', numComensales: 2, lineas: [], nota: null })).rejects.toThrow();
      expect(await prisma.reservation.count()).toBe(0);
    } finally {
      await prisma.calendarDay.delete({ where: { restaurantId_fecha: { restaurantId, fecha: calendarDate(fecha) } } });
    }
  });

  it('ofrece y persiste mesas en un domingo base sin reglas semanales', async () => {
    const date = calendarDate(fecha);
    date.setUTCDate(date.getUTCDate() + (7 - date.getUTCDay()) % 7);
    const sunday = dateKey(date);
    const rules = await prisma.timeSlot.findMany({ where: { restaurantId, diaSemana: 0 } });
    await prisma.timeSlot.deleteMany({ where: { restaurantId, diaSemana: 0 } });
    try {
      expect((await service.availableSlots({ fecha: sunday, numComensales: 2 })).franjas.length).toBeGreaterThan(0);
      const created = await service.create(dinerId, { fecha: sunday, horaInicio: '10:00', numComensales: 2, lineas: [], nota: null });
      expect(created.reserva.estado).toBe('SOLICITADA');
    } finally {
      await prisma.timeSlot.createMany({ data: rules });
    }
  });
});
