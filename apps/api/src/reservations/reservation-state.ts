import { ReservationStatus } from '@prisma/client';

const transitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
  SOLICITADA: [
    ReservationStatus.CONFIRMADA,
    ReservationStatus.RECHAZADA,
    ReservationStatus.EXPIRADA,
    ReservationStatus.CANCELADA,
  ],
  CONFIRMADA: [
    ReservationStatus.CANCELADA,
    ReservationStatus.EN_CURSO,
    ReservationStatus.NO_ASISTIO,
  ],
  RECHAZADA: [],
  EXPIRADA: [],
  CANCELADA: [],
  EN_CURSO: [ReservationStatus.COMPLETADA],
  COMPLETADA: [],
  NO_ASISTIO: [],
};

// Mantengo las transiciones en un solo lugar para que no dependan del botón que las solicita.
export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus,
) {
  return transitions[from].includes(to);
}
