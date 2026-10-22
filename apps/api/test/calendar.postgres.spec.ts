import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CalendarService,
  calendarDate,
} from '../src/calendar/calendar.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

describe.skipIf(!process.env.ENCANTO_MENU_TEST_DATABASE_URL)(
  'EC-29 transacciones en PostgreSQL aislado',
  () => {
    let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
    let db: PrismaClient;
    let service: CalendarService;
    const restaurantId = randomUUID(),
      userId = randomUUID(),
      ruleId = randomUUID();
    const fecha = '2031-02-23'; // Domingo futuro de la base desechable.
    beforeAll(async () => {
      fixture = await createMenuPostgresFixture(
        process.env.ENCANTO_MENU_TEST_DATABASE_URL!,
      );
      db = fixture.client;
      service = new CalendarService(db as PrismaService);
      await db.restaurant.create({
        data: {
          id: restaurantId,
          nombre: 'Calendario aislado',
          direccion: 'Prueba',
          latitud: 0,
          longitud: 0,
          telefono: '0',
          whatsapp: '0',
          aforoTotal: 1,
        },
      });
      await db.user.create({
        data: {
          id: userId,
          nombre: 'Prueba',
          correo: 'calendar@example.test',
          telefono: '0',
          passwordHash: 'sin-login',
        },
      });
      await db.reservation.createMany({
        data: [0, 1].map((i) => ({
          usuarioId: userId,
          codigo: `CAL-${i}`,
          fecha: calendarDate(fecha),
          horaInicio: '12:00',
          horaFin: '13:30',
          numComensales: 2,
          estado: 'CONFIRMADA',
        })),
      });
    }, 60000);
    afterAll(async () => {
      await fixture?.close();
    });
    beforeEach(async () => {
      await db.calendarDay.deleteMany();
      await db.timeSlot.deleteMany();
      await db.timeSlot.createMany({
        data: [
          {
            id: ruleId,
            restaurantId,
            diaSemana: 0,
            horaApertura: '10:00',
            horaCierre: '14:00',
            aforoMaximo: 17,
          },
          {
            restaurantId,
            diaSemana: 1,
            horaApertura: '10:00',
            horaCierre: '18:00',
          },
        ],
      });
    });
    it('conserva IDs/aforo al reemplazar varias reglas, sin alterar otro día', async () => {
      await service.replaceRules(restaurantId, 0, {
        reglas: [
          {
            id: ruleId,
            horaApertura: '11:00',
            horaCierre: '14:00',
            abierto: true,
            activo: true,
          },
          {
            horaApertura: '15:00',
            horaCierre: '18:00',
            abierto: true,
            activo: true,
          },
        ],
      });
      const reader = new PrismaClient({
        datasources: { db: { url: fixture.url } },
      });
      try {
        expect(
          await reader.timeSlot.findUniqueOrThrow({ where: { id: ruleId } }),
        ).toMatchObject({ aforoMaximo: 17, horaApertura: '11:00' });
        expect(await reader.timeSlot.count({ where: { diaSemana: 1 } })).toBe(
          1,
        );
        expect(
          (
            await new CalendarService(reader as PrismaService).day(
              restaurantId,
              fecha,
            )
          ).horarios,
        ).toHaveLength(2);
      } finally {
        await reader.$disconnect();
      }
    });
    it('abrir/cerrar excepcionalmente persiste y quitar excepción restaura semana', async () => {
      await service.putException(restaurantId, '2031-02-25', {
        abierto: true,
        horaApertura: '09:00',
        horaCierre: '12:00',
        soloPorReserva: true,
        motivo: 'Apertura especial',
      });
      expect(await service.day(restaurantId, '2031-02-25')).toMatchObject({
        abierto: true,
        soloPorReserva: false,
        origen: 'EXCEPCION',
      });
      await service.deleteException(restaurantId, '2031-02-25');
      expect(await service.day(restaurantId, '2031-02-25')).toMatchObject({
        abierto: false,
        origen: 'SIN_REGLA',
      });
      await service.putException(restaurantId, fecha, {
        abierto: false,
        soloPorReserva: false,
        confirmarReservasAfectadas: 2,
      });
      expect(await service.day(restaurantId, fecha)).toMatchObject({
        abierto: false,
        origen: 'EXCEPCION',
      });
      await service.deleteException(restaurantId, fecha);
      expect(await service.day(restaurantId, fecha)).toMatchObject({
        abierto: true,
        origen: 'SEMANAL',
      });
    });
    it('409 advierte cantidad real, no escribe al cancelar ni modifica reservas al confirmar', async () => {
      const before = await db.reservation.findMany({ orderBy: { id: 'asc' } });
      await expect(
        service.putException(restaurantId, fecha, {
          abierto: false,
          soloPorReserva: false,
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          message: {
            codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS',
            reservasAfectadas: 2,
          },
        },
      });
      expect(await db.calendarDay.count()).toBe(0);
      await expect(
        service.putException(restaurantId, fecha, {
          abierto: false,
          soloPorReserva: false,
          confirmarReservasAfectadas: 1,
        }),
      ).rejects.toMatchObject({ status: 409 });
      await service.putException(restaurantId, fecha, {
        abierto: false,
        soloPorReserva: false,
        confirmarReservasAfectadas: 2,
      });
      expect(await db.reservation.findMany({ orderBy: { id: 'asc' } })).toEqual(
        before,
      );
    });
    it('un cierre semanal respeta excepciones abiertas y exige confirmación cuando corresponde', async () => {
      await expect(
        service.replaceRules(restaurantId, 0, { reglas: [] }),
      ).rejects.toMatchObject({ status: 409 });
      expect(await db.timeSlot.count({ where: { diaSemana: 0 } })).toBe(1);
      await service.putException(restaurantId, fecha, {
        abierto: true,
        horaApertura: '10:00',
        horaCierre: '18:00',
        soloPorReserva: false,
      });
      expect(
        (await service.replaceRules(restaurantId, 0, { reglas: [] }))
          .reservasAfectadas,
      ).toBe(0);
      await expect(
        service.deleteException(restaurantId, fecha),
      ).rejects.toMatchObject({ status: 409 });
      expect(await db.calendarDay.count()).toBe(1);
    });
    it('revierte eliminación previa si falla una actualización del reemplazo', async () => {
      await db.timeSlot.create({
        data: {
          restaurantId,
          diaSemana: 0,
          horaApertura: '15:00',
          horaCierre: '18:00',
        },
      });
      const before = await db.timeSlot.findMany({ orderBy: { id: 'asc' } });
      const failing = db.$extends({
        query: {
          timeSlot: {
            async update() {
              throw new Error('Fallo de prueba después de borrar');
            },
          },
        },
      });
      await expect(
        new CalendarService(failing as unknown as PrismaService).replaceRules(
          restaurantId,
          0,
          {
            reglas: [
              {
                id: ruleId,
                horaApertura: '11:00',
                horaCierre: '14:00',
                abierto: true,
                activo: true,
              },
            ],
          },
        ),
      ).rejects.toThrow('Fallo de prueba');
      expect(await db.timeSlot.findMany({ orderBy: { id: 'asc' } })).toEqual(
        before,
      );
    });
    it('una modificación concurrente real no deja reemplazo parcial', async () => {
      const writer = new PrismaClient({
        datasources: { db: { url: fixture.url } },
      });
      const concurrent = db.$extends({
        query: {
          timeSlot: {
            async findMany({ args, query: execute }) {
              const result = await execute(args);
              await writer.timeSlot.update({
                where: { id: ruleId },
                data: { aforoMaximo: 23 },
              });
              return result;
            },
          },
        },
      });
      try {
        await expect(
          new CalendarService(
            concurrent as unknown as PrismaService,
          ).replaceRules(restaurantId, 0, {
            reglas: [
              {
                id: ruleId,
                horaApertura: '11:00',
                horaCierre: '14:00',
                abierto: true,
                activo: true,
              },
            ],
          }),
        ).rejects.toMatchObject({ status: 409 });
        expect(
          await writer.timeSlot.findUniqueOrThrow({ where: { id: ruleId } }),
        ).toMatchObject({ horaApertura: '10:00', aforoMaximo: 23 });
      } finally {
        await writer.$disconnect();
      }
    });
  },
);
