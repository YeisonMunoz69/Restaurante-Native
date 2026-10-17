import { ReservationStatus as Status } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canTransitionReservation } from './reservation-state.js';

describe('canTransitionReservation', () => {
  it('permite solicitar, aprobar, rechazar, expirar y cancelar en los estados acordados', () => {
    expect(canTransitionReservation(Status.SOLICITADA, Status.CONFIRMADA)).toBe(true);
    expect(canTransitionReservation(Status.SOLICITADA, Status.RECHAZADA)).toBe(true);
    expect(canTransitionReservation(Status.SOLICITADA, Status.EXPIRADA)).toBe(true);
    expect(canTransitionReservation(Status.SOLICITADA, Status.CANCELADA)).toBe(true);
    expect(canTransitionReservation(Status.CONFIRMADA, Status.EN_CURSO)).toBe(true);
    expect(canTransitionReservation(Status.CONFIRMADA, Status.CANCELADA)).toBe(true);
    expect(canTransitionReservation(Status.CONFIRMADA, Status.NO_ASISTIO)).toBe(true);
    expect(canTransitionReservation(Status.EN_CURSO, Status.COMPLETADA)).toBe(true);
  });

  it('mantiene rechazo, expiración y cancelación como estados terminales', () => {
    for (const status of [
      Status.RECHAZADA,
      Status.EXPIRADA,
      Status.CANCELADA,
      Status.COMPLETADA,
      Status.NO_ASISTIO,
      Status.COMPLETADA,
    ]) {
      expect(canTransitionReservation(status, Status.CONFIRMADA)).toBe(false);
      expect(canTransitionReservation(status, Status.EN_CURSO)).toBe(false);
      expect(canTransitionReservation(status, Status.NO_ASISTIO)).toBe(false);
    }
  });
});
