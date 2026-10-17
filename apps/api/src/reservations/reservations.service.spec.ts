import { Prisma, ReservationStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  addCalendarMonths,
  buildReservationTicket,
  canCancelConfirmedReservation,
  canMarkNoShow,
  hasMinimumNotice,
} from './reservations.service.js';

describe('reglas compartidas de reservas', () => {
  it('calcula tres meses calendario y ajusta el día al final del mes', () => {
    expect(addCalendarMonths('2026-01-31', 3)).toBe('2026-04-30');
    expect(addCalendarMonths('2028-02-29', 12)).toBe('2029-02-28');
    expect(addCalendarMonths('2026-10-16', 3)).toBe('2027-01-16');
  });

  it('aplica el límite inclusivo de una hora para solicitar o cancelar', () => {
    const now = new Date('2026-10-16T14:00:00.000Z');
    const exactlyOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const fiftyNineMinutes = new Date(now.getTime() + 59 * 60 * 1000);

    expect(hasMinimumNotice(exactlyOneHour, now, 60)).toBe(true);
    expect(hasMinimumNotice(fiftyNineMinutes, now, 60)).toBe(false);
    expect(canCancelConfirmedReservation(exactlyOneHour, now, 60)).toBe(true);
    expect(canCancelConfirmedReservation(fiftyNineMinutes, now, 60)).toBe(false);
  });

  it('exige que pase la tolerancia completa antes de registrar una inasistencia', () => {
    const startsAt = new Date('2026-10-16T14:00:00.000Z');
    expect(canMarkNoShow(startsAt, new Date('2026-10-16T14:29:59.999Z'), 30)).toBe(false);
    expect(canMarkNoShow(startsAt, new Date('2026-10-16T14:30:00.000Z'), 30)).toBe(true);
  });

  it('genera un ticket copiable con total y estado actuales', () => {
    const ticket = buildReservationTicket({
      codigo: 'EC-20261023-A1B2C3D4',
      fecha: new Date('2026-10-23T00:00:00.000Z'),
      horaInicio: '10:00',
      horaFin: '11:30',
      numComensales: 4,
      total: new Prisma.Decimal('64000'),
      estado: ReservationStatus.CONFIRMADA,
      lines: [
        {
          cantidad: 2,
          precioUnitario: new Prisma.Decimal('32000'),
          plato: { nombre: 'Sancocho' },
        },
      ],
    });

    expect(ticket).toContain('Reserva EC-20261023-A1B2C3D4');
    expect(ticket).toContain('2 x Sancocho');
    expect(ticket).toContain('Estado: Confirmada');
  });
});
