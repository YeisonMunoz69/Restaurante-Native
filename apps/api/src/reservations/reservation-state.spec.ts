import { ReservationStatus as Status } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canTransitionReservation } from './reservation-state.js';

// Compruebo el diagrama acordado para todos los pares, incluso si origen y destino son iguales.
const allowed = new Set([
  'SOLICITADA:CONFIRMADA',
  'SOLICITADA:RECHAZADA',
  'SOLICITADA:EXPIRADA',
  'SOLICITADA:CANCELADA',
  'CONFIRMADA:CANCELADA',
  'CONFIRMADA:EN_CURSO',
  'CONFIRMADA:NO_ASISTIO',
  'EN_CURSO:COMPLETADA',
]);

describe('canTransitionReservation', () => {
  const states = Object.values(Status);
  const pairs = states.flatMap((from) => states.map((to) => [from, to] as const));

  it.each(pairs)('valida %s → %s según el diagrama', (from, to) => {
    expect(canTransitionReservation(from, to)).toBe(allowed.has(`${from}:${to}`));
  });
});
