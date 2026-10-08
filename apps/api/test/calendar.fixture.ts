import { vi } from 'vitest';
import type { CalendarDay, TimeSlot } from '@prisma/client';

export const restaurantId = '00000000-0000-4000-8000-000000000001';
export const ruleId = '00000000-0000-4000-8000-000000000002';

// Creo registros completos del esquema para que nuestros dobles no oculten campos reales.
export const rule = (changes: Partial<TimeSlot> = {}): TimeSlot => ({
  id: ruleId,
  restaurantId,
  diaSemana: 0,
  horaApertura: '12:00',
  horaCierre: '17:00',
  abierto: true,
  activo: true,
  aforoMaximo: 30,
  ...changes,
});
export const exception = (changes: Partial<CalendarDay> = {}): CalendarDay => ({
  id: '00000000-0000-4000-8000-000000000003',
  restaurantId,
  fecha: new Date('2026-10-11T00:00:00.000Z'),
  abierto: true,
  horaApertura: '09:00',
  horaCierre: '11:00',
  soloPorReserva: true,
  motivo: 'Evento',
  ...changes,
});

// Simulo Prisma, incluidas las transacciones, sin construir un cliente ni conectarnos.
export function prismaMock() {
  const db = {
    restaurant: {
      findUnique: vi.fn().mockResolvedValue({ id: restaurantId }),
      count: vi.fn().mockResolvedValue(1),
    },
    timeSlot: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue(rule()),
    },
    calendarDay: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({
        id: 'exception-1',
        ...create,
      })),
      delete: vi.fn().mockResolvedValue(exception()),
    },
    reservation: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return db;
}
