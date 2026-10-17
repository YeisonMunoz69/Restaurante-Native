import { Prisma, PrismaClient, ReservationStatus } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
const dishId = '40000000-0000-4000-8000-000000000001';
// Mantengo la fecha futura para que esta integración se pueda ejecutar cualquier día.
const fecha = dateKey(
  new Date(calendarDate(todayInBogota()).getTime() + 7 * 86400000),
);

describe.skipIf(!shouldRun)('reservas contra PostgreSQL aislado', () => {
  let prisma: PrismaClient;
  let service: ReservationsService;
  let closeFixture: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const fixture = await createMenuPostgresFixture(databaseUrl!);
    prisma = fixture.client;
    closeFixture = fixture.close;
    service = new ReservationsService(prisma as never);
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
      data: [dinerId, secondDinerId, adminId].map((id, index) => ({
        id,
        nombre: `Usuario ${index + 1}`,
        correo: `usuario${index + 1}@example.test`,
        telefono: '+573000000000',
        passwordHash: 'hash-de-prueba',
        rol: index === 2 ? 'ADMIN' : 'COMENSAL',
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
  }, 60000);

  beforeEach(async () => {
    await prisma.reservation.deleteMany();
  });

  afterAll(async () => {
    await closeFixture?.();
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
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rows = await prisma.reservation.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].numComensales).toBeLessThanOrEqual(8);
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

  it('permite cancelar una reserva confirmada con más de una hora de anticipación', async () => {
    const atSixty = await service.create(dinerId, {
      fecha,
      horaInicio: '10:00',
      numComensales: 4,
      lineas: [],
      nota: null,
    });
    await service.approve(adminId, atSixty.reserva.id);
    await expect(service.cancel(dinerId, atSixty.reserva.id)).resolves.toMatchObject({
      estado: ReservationStatus.CANCELADA,
    });
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
    await service.approve(adminId, created.reserva.id);

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
});
