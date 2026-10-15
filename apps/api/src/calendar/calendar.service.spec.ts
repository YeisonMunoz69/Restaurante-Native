import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CalendarDateSchema,
  CalendarExceptionInputSchema,
  CalendarRuleSchema,
  CalendarRulesInputSchema,
} from '@encanto/shared';
import {
  CalendarService,
  resolveCalendarDay,
  todayInBogota,
} from './calendar.service.js';
import {
  exception,
  prismaMock,
  restaurantId,
  rule,
  ruleId,
} from '../../test/calendar.fixture.js';

describe('CalendarService con Prisma simulado', () => {
  let db: ReturnType<typeof prismaMock>;
  let service: CalendarService;
  beforeEach(() => {
    db = prismaMock();
    service = new CalendarService(db as never);
  });

  // Pruebo que ni la fecha comercial ni el día semanal dependan del reloj local.
  it('usa el día anterior en Bogotá durante la madrugada UTC', () => {
    expect(todayInBogota(new Date('2026-10-09T02:00:00Z'))).toBe('2026-10-08');
    expect(todayInBogota(new Date('2026-10-09T05:00:00Z'))).toBe('2026-10-09');
  });

  it('omitir desde usa hoy en Bogotá, aunque UTC ya tenga otra fecha', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
    try {
      expect(await service.next(restaurantId)).toMatchObject({
        desde: '2026-10-08',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('entrega múltiples franjas activas ordenadas y omite reglas cerradas/inactivas', async () => {
    db.timeSlot.findMany.mockResolvedValue([
      rule({ horaApertura: '18:00', horaCierre: '21:00' }),
      rule(),
      rule({ abierto: false }),
      rule({ activo: false }),
      rule({ diaSemana: 1 }),
    ]);
    expect(await service.day(restaurantId, '2026-10-11')).toMatchObject({
      abierto: true,
      soloPorReserva: false,
      origen: 'SEMANAL',
      horarios: [
        { horaApertura: '12:00', horaCierre: '17:00' },
        { horaApertura: '18:00', horaCierre: '21:00' },
      ],
    });
  });

  it('una excepción cerrada prevalece sobre varias aperturas semanales', async () => {
    db.timeSlot.findMany.mockResolvedValue([
      rule(),
      rule({ horaApertura: '18:00', horaCierre: '21:00' }),
    ]);
    db.calendarDay.findUnique.mockResolvedValue(
      exception({
        abierto: false,
        horaApertura: null,
        horaCierre: null,
        soloPorReserva: false,
      }),
    );
    expect(await service.day(restaurantId, '2026-10-11')).toMatchObject({
      abierto: false,
      origen: 'EXCEPCION',
      horarios: [],
    });
  });

  it('una excepción abre un día sin reglas y conserva soloPorReserva', async () => {
    db.calendarDay.findUnique.mockResolvedValue(exception());
    expect(await service.day(restaurantId, '2026-10-11')).toMatchObject({
      abierto: true,
      origen: 'EXCEPCION',
      soloPorReserva: true,
      horarios: [{ horaApertura: '09:00', horaCierre: '11:00' }],
    });
    db.timeSlot.findMany.mockResolvedValue([rule({ abierto: false })]);
    expect(await service.day(restaurantId, '2026-10-11')).toMatchObject({
      abierto: true,
      origen: 'EXCEPCION',
      soloPorReserva: true,
    });
  });

  it('sin reglas queda cerrado y no confunde la sede con un día inexistente', async () => {
    expect(await service.day(restaurantId, '2026-10-11')).toMatchObject({
      abierto: false,
      origen: 'SIN_REGLA',
    });
    db.restaurant.findUnique.mockResolvedValue(null);
    await expect(service.day(restaurantId, '2026-10-11')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('una regla cerrada no cancela otra franja abierta', () => {
    expect(
      resolveCalendarDay(restaurantId, '2026-10-11', [
        rule({ abierto: false }),
        rule(),
      ]).abierto,
    ).toBe(true);
  });

  it('la próxima apertura respeta el cierre excepcional y desde inclusivo', async () => {
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    db.calendarDay.findMany.mockResolvedValue([
      exception({ abierto: false, soloPorReserva: false }),
    ]);
    expect(await service.next(restaurantId, '2026-10-11')).toMatchObject({
      diasBuscados: 8,
      dia: { fecha: '2026-10-18' },
    });
    db.calendarDay.findMany.mockResolvedValue([exception()]);
    expect(await service.next(restaurantId, '2026-10-11')).toMatchObject({
      diasBuscados: 1,
      dia: { fecha: '2026-10-11', soloPorReserva: true },
    });
  });

  it('termina tras 366 fechas sin aperturas y usa dos consultas de horarios', async () => {
    expect(await service.next(restaurantId, '2026-10-08')).toEqual({
      desde: '2026-10-08',
      hasta: '2027-10-08',
      diasBuscados: 366,
      dia: null,
    });
    expect(db.timeSlot.findMany).toHaveBeenCalledTimes(1);
    expect(db.calendarDay.findMany).toHaveBeenCalledTimes(1);
  });

  it('encuentra la apertura en el último día permitido', async () => {
    db.calendarDay.findMany.mockResolvedValue([
      exception({ fecha: new Date('2027-10-08T00:00:00Z') }),
    ]);
    expect(await service.next(restaurantId, '2026-10-08')).toMatchObject({
      diasBuscados: 366,
      dia: { fecha: '2027-10-08' },
    });
  });

  it('trunca el intervalo para no exceder el año 9999', async () => {
    expect(await service.next(restaurantId, '9999-12-31')).toMatchObject({
      hasta: '9999-12-31',
      diasBuscados: 1,
      dia: null,
    });
  });

  it('advierte antes de cerrar, revalida el conteo y guarda solo al confirmar', async () => {
    db.reservation.count.mockResolvedValue(2);
    const input = CalendarExceptionInputSchema.parse({
      abierto: false,
      motivo: 'Mantenimiento',
    });
    await expect(
      service.putException(restaurantId, '2026-10-11', input),
    ).rejects.toMatchObject({
      response: {
        message: {
          codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS',
          reservasAfectadas: 2,
          fechas: [{ fecha: '2026-10-11', cantidad: 2 }],
        },
      },
    });
    expect(db.calendarDay.upsert).not.toHaveBeenCalled();
    await expect(
      service.putException(restaurantId, '2026-10-11', {
        ...input,
        confirmarReservasAfectadas: 1,
      }),
    ).rejects.toThrow(ConflictException);
    expect(
      await service.putException(restaurantId, '2026-10-11', {
        ...input,
        confirmarReservasAfectadas: 2,
      }),
    ).toMatchObject({ reservasAfectadas: 2 });
    expect(db.reservation.count).toHaveBeenCalledWith({
      where: { fecha: new Date('2026-10-11T00:00:00Z'), estado: 'CONFIRMADA' },
    });
    expect(db.calendarDay.upsert.mock.calls[0][0].update).toEqual({
      abierto: false,
      soloPorReserva: false,
      motivo: 'Mantenimiento',
      horaApertura: null,
      horaCierre: null,
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('guarda una apertura solo por reserva sin consultar reservas', async () => {
    const input = CalendarExceptionInputSchema.parse({
      abierto: true,
      horaApertura: '09:00',
      horaCierre: '11:00',
      soloPorReserva: true,
    });
    expect(
      await service.putException(restaurantId, '2026-10-11', input),
    ).toMatchObject({
      excepcion: { soloPorReserva: true },
      reservasAfectadas: 0,
    });
    expect(db.reservation.count).not.toHaveBeenCalled();
  });

  it('rechaza escrituras multisede sin inventar un filtro en Reservation', async () => {
    db.restaurant.count.mockResolvedValue(2);
    await expect(
      service.putException(
        restaurantId,
        '2026-10-11',
        CalendarExceptionInputSchema.parse({ abierto: false }),
      ),
    ).rejects.toMatchObject({
      response: { message: { codigo: 'SEDE_UNICA_REQUERIDA' } },
    });
    expect(db.reservation.count).not.toHaveBeenCalled();
    expect(db.calendarDay.upsert).not.toHaveBeenCalled();
  });

  // Reviso los cierres por regla semanal para no permitir eludir la advertencia por otra ruta.
  it('advierte al quitar reglas semanales y respeta excepciones abiertas', async () => {
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    db.reservation.groupBy.mockResolvedValue([
      { fecha: new Date('2026-10-11T00:00:00Z'), _count: { _all: 2 } },
      { fecha: new Date('2026-10-18T00:00:00Z'), _count: { _all: 3 } },
      { fecha: new Date('2026-10-19T00:00:00Z'), _count: { _all: 4 } },
    ]);
    db.calendarDay.findMany.mockResolvedValue([
      exception({ fecha: new Date('2026-10-18T00:00:00Z') }),
    ]);
    await expect(
      service.replaceRules(restaurantId, 0, { reglas: [] }),
    ).rejects.toMatchObject({
      response: {
        message: {
          reservasAfectadas: 2,
          fechas: [{ fecha: '2026-10-11', cantidad: 2 }],
        },
      },
    });
    expect(db.timeSlot.deleteMany).not.toHaveBeenCalled();
    expect(
      await service.replaceRules(restaurantId, 0, {
        reglas: [],
        confirmarReservasAfectadas: 2,
      }),
    ).toMatchObject({ reservasAfectadas: 2 });
    expect(db.reservation.groupBy.mock.calls[0][0].where).toEqual({
      estado: 'CONFIRMADA',
      fecha: { gte: expect.any(Date) },
    });
  });

  it('conserva varias reglas e ids existentes sin escribir aforoMaximo', async () => {
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    const input = CalendarRulesInputSchema.parse({
      reglas: [
        { id: ruleId, horaApertura: '10:00', horaCierre: '12:00' },
        { horaApertura: '14:00', horaCierre: '18:00' },
      ],
    });
    await service.replaceRules(restaurantId, 0, input);
    expect(db.timeSlot.update).toHaveBeenCalledWith({
      where: { id: ruleId },
      data: {
        horaApertura: '10:00',
        horaCierre: '12:00',
        abierto: true,
        activo: true,
      },
    });
    expect(db.timeSlot.deleteMany).toHaveBeenCalledWith({
      where: { restaurantId, diaSemana: 0, id: { notIn: [ruleId] } },
    });
    expect(db.timeSlot.createMany).toHaveBeenCalledWith({
      data: [
        {
          restaurantId,
          diaSemana: 0,
          horaApertura: '14:00',
          horaCierre: '18:00',
          abierto: true,
          activo: true,
        },
      ],
    });
  });

  it('rechaza ids de reglas ajenas al día y sede', async () => {
    await expect(
      service.replaceRules(restaurantId, 0, {
        reglas: [
          CalendarRuleSchema.parse({
            id: ruleId,
            horaApertura: '12:00',
            horaCierre: '17:00',
          }),
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.timeSlot.deleteMany).not.toHaveBeenCalled();
  });

  it('advierte al borrar una excepción que abría un día semanal cerrado', async () => {
    db.calendarDay.findUnique.mockResolvedValue(exception());
    db.reservation.count.mockResolvedValue(3);
    await expect(
      service.deleteException(restaurantId, '2026-10-11'),
    ).rejects.toThrow(ConflictException);
    expect(db.calendarDay.delete).not.toHaveBeenCalled();
    expect(
      await service.deleteException(restaurantId, '2026-10-11', 3),
    ).toEqual({ eliminada: true, reservasAfectadas: 3 });
  });

  it('eliminar un cierre restaura la apertura semanal sin advertencia', async () => {
    db.calendarDay.findUnique.mockResolvedValue(exception({ abierto: false }));
    db.timeSlot.findMany.mockResolvedValue([rule()]);
    expect(await service.deleteException(restaurantId, '2026-10-11')).toEqual({
      eliminada: true,
      reservasAfectadas: 0,
    });
    expect(db.reservation.count).not.toHaveBeenCalled();
  });

  it('no elimina una excepción inexistente', async () => {
    await expect(
      service.deleteException(restaurantId, '2026-10-11'),
    ).rejects.toThrow(NotFoundException);
  });

  it('traduce los conflictos serializables a un 409 recuperable', async () => {
    db.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflicto', {
        code: 'P2034',
        clientVersion: '5.22.0',
      }),
    );
    await expect(
      service.putException(
        restaurantId,
        '2026-10-11',
        CalendarExceptionInputSchema.parse({ abierto: false }),
      ),
    ).rejects.toMatchObject({
      response: { message: { codigo: 'CALENDARIO_CONCURRENTE' } },
    });
  });
});

describe('validaciones compartidas del calendario', () => {
  it.each([
    '2026-02-29',
    '2026-02-31',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-01',
    '0000-01-01',
    '2026-10-11T00:00:00Z',
  ])('rechaza la fecha inválida %s', (fecha) => {
    expect(CalendarDateSchema.safeParse(fecha).success).toBe(false);
  });
  it.each(['2024-02-29', '0001-01-01', '9999-12-31'])(
    'acepta la fecha real %s',
    (fecha) => {
      expect(CalendarDateSchema.safeParse(fecha).success).toBe(true);
    },
  );
  it.each(['24:00', '9:00', '12:60', '09:00:00', 'ab:cd'])(
    'rechaza la hora inválida %s',
    (horaApertura) => {
      expect(
        CalendarRuleSchema.safeParse({ horaApertura, horaCierre: '23:00' })
          .success,
      ).toBe(false);
    },
  );
  it('rechaza intervalos invertidos, apertura sin horas, cadenas booleanas y campos de aforo', () => {
    expect(
      CalendarRuleSchema.safeParse({
        horaApertura: '17:00',
        horaCierre: '12:00',
      }).success,
    ).toBe(false);
    expect(
      CalendarExceptionInputSchema.safeParse({ abierto: true }).success,
    ).toBe(false);
    expect(
      CalendarExceptionInputSchema.safeParse({ abierto: 'false' }).success,
    ).toBe(false);
    expect(
      CalendarExceptionInputSchema.safeParse({
        abierto: false,
        soloPorReserva: true,
      }).success,
    ).toBe(false);
    expect(
      CalendarRuleSchema.safeParse({
        horaApertura: '12:00',
        horaCierre: '17:00',
        aforoMaximo: 10,
      }).success,
    ).toBe(false);
  });
  it('rechaza identificadores de reglas repetidos', () => {
    const same = { id: ruleId, horaApertura: '12:00', horaCierre: '17:00' };
    expect(
      CalendarRulesInputSchema.safeParse({ reglas: [same, same] }).success,
    ).toBe(false);
  });
});
