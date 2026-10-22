import { describe, expect, it } from 'vitest';
import { CalendarRangeQuerySchema, CalendarRuleSchema } from '@encanto/shared';
import { colombiaHolidays } from './colombia-holidays.js';
import { CalendarService, canReserveRestaurant, resolveCalendarDay } from './calendar.service.js';
import { exception, prismaMock, restaurantId, rule } from '../../test/calendar.fixture.js';

describe('Calendario acordado el 22 de octubre', () => {
  it('calcula los 19 festivos nacionales de 2026 con Chiquinquirá, traslados y Semana Santa', () => {
    const days = colombiaHolidays(2026);
    expect(days.size).toBe(19);
    expect(days.has('2026-07-13')).toBe(true);
    expect(days.has('2026-07-09')).toBe(false);
    expect(colombiaHolidays(2025).has('2025-07-14')).toBe(false);
    for (const day of ['2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-18', '2026-06-08', '2026-06-15', '2026-10-12', '2026-12-25']) expect(days.has(day)).toBe(true);
    expect(days.has('2026-01-06')).toBe(false);
    expect(days.has('2026-07-04')).toBe(false);
  });
  it('abre domingos y festivos, no sábados ni fechas ordinarias sin configuración', () => {
    expect(resolveCalendarDay(restaurantId, '2026-10-25', []).origen).toBe('BASE_DOMINGO');
    expect(resolveCalendarDay(restaurantId, '2026-11-02', []).origen).toBe('BASE_FESTIVO');
    expect(resolveCalendarDay(restaurantId, '2026-10-24', []).abierto).toBe(false);
    expect(resolveCalendarDay(restaurantId, '2026-10-26', []).abierto).toBe(false);
  });
  it('una regla cerrada/inactiva o excepción cerrada impide reabrir por defecto', () => {
    expect(resolveCalendarDay(restaurantId, '2026-10-25', [rule({ abierto: false })]).abierto).toBe(false);
    expect(resolveCalendarDay(restaurantId, '2026-10-25', [rule({ activo: false })]).abierto).toBe(false);
    expect(resolveCalendarDay(restaurantId, '2026-10-25', [], exception({ abierto: false })).abierto).toBe(false);
  });
  it('pesca y motos combinan etiquetas sin habilitar mesas; la nota permanece pública', () => {
    const day = resolveCalendarDay(restaurantId, '2026-10-25', [], exception({ servicios: ['PESCA', 'MOTOS'], motivo: 'Torneo informativo' }));
    expect(day).toMatchObject({ abierto: true, servicios: ['PESCA', 'MOTOS'], motivo: 'Torneo informativo' });
    expect(canReserveRestaurant(day)).toBe(false);
    expect(canReserveRestaurant({ ...day, servicios: ['RESTAURANTE', 'PESCA', 'MOTOS'] })).toBe(true);
  });
  it('rechaza etiquetas repetidas, desconocidas y rangos superiores a 42 días', () => {
    expect(CalendarRuleSchema.safeParse({ horaApertura: '10:00', horaCierre: '18:00', servicios: ['PESCA', 'PESCA'] }).success).toBe(false);
    expect(CalendarRangeQuerySchema.safeParse({ restauranteId: restaurantId, desde: '2026-10-01', hasta: '2026-12-01' }).success).toBe(false);
  });
  it('consulta el mes en dos consultas y aplica notas y excepciones', async () => {
    const db = prismaMock();
    db.calendarDay.findMany.mockResolvedValue([exception({ fecha: new Date('2026-10-25T00:00:00Z'), servicios: ['PESCA'], motivo: 'Solo pesca' })]);
    const result = await new CalendarService(db as never).range(restaurantId, '2026-10-24', '2026-10-26');
    expect(result.dias).toHaveLength(3);
    expect(result.dias[1]).toMatchObject({ servicios: ['PESCA'], motivo: 'Solo pesca' });
    expect(db.timeSlot.findMany).toHaveBeenCalledTimes(1);
    expect(db.calendarDay.findMany).toHaveBeenCalledTimes(1);
  });
});
