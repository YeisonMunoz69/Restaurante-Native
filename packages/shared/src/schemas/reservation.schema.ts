import { z } from 'zod';
import { CalendarDateSchema, CalendarTimeSchema } from './calendar.schema';

export const RESERVATION_STATUSES = [
  'SOLICITADA',
  'CONFIRMADA',
  'RECHAZADA',
  'EXPIRADA',
  'CANCELADA',
  'EN_CURSO',
  'COMPLETADA',
  'NO_ASISTIO',
] as const;

export const ReservationStatusSchema = z.enum(RESERVATION_STATUSES);
export const ReservationIdSchema = z.string().uuid();

export const ReservationSlotsQuerySchema = z
  .object({
    fecha: CalendarDateSchema,
    numComensales: z.coerce.number().int().min(1).max(120),
  })
  .strict();

export const ReservationLineInputSchema = z
  .object({
    platoId: z.string().uuid(),
    cantidad: z.number().int().min(1).max(99),
  })
  .strict();

export const ReservationCreateSchema = z
  .object({
    fecha: CalendarDateSchema,
    horaInicio: CalendarTimeSchema,
    numComensales: z.number().int().min(1).max(120),
    lineas: z.array(ReservationLineInputSchema).max(50).default([]),
    nota: z.string().trim().max(500).nullable().default(null),
  })
  .strict()
  .refine(
    ({ lineas }) =>
      lineas.length === new Set(lineas.map((line) => line.platoId)).size,
    'Agrupe las cantidades de un mismo plato en una sola línea',
  );

export const ReservationRejectSchema = z
  .object({ motivo: z.string().trim().min(3).max(500) })
  .strict();

export const ReservationListQuerySchema = z
  .object({
    fecha: CalendarDateSchema.optional(),
    estado: ReservationStatusSchema.optional(),
  })
  .strict();

export type ReservationSlotsQuery = z.infer<typeof ReservationSlotsQuerySchema>;
export type ReservationCreate = z.infer<typeof ReservationCreateSchema>;
export type ReservationReject = z.infer<typeof ReservationRejectSchema>;
export type ReservationListQuery = z.infer<typeof ReservationListQuerySchema>;

export interface ReservationSlot {
  horaInicio: string;
  horaFin: string;
  duracionMin: number;
  aforoDisponible: number;
}

export interface ReservationLineResult {
  platoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ReservationResult {
  id: string;
  codigo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  numComensales: number;
  estado: (typeof RESERVATION_STATUSES)[number];
  total: number;
  nota: string | null;
  motivoRechazo: string | null;
  creadaEn: string;
  llegadaPorId: string | null;
  llegadaEn: string | null;
  inasistioPorId: string | null;
  inasistioEn: string | null;
  completadaPorId: string | null;
  completadaEn: string | null;
  lineas: ReservationLineResult[];
  ticket: string;
}
