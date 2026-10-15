import { z } from 'zod';

export const CALENDAR_TIME_ZONE = 'America/Bogota';
export const CALENDAR_SEARCH_DAYS = 366;

// Compruebo el calendario real para rechazar, por ejemplo, el 31 de febrero.
export const CalendarDateSchema = z.string().refine((value) => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'La fecha debe ser real y tener formato YYYY-MM-DD (años 0001 a 9999)');

export const CalendarTimeSchema = z
  .string()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'La hora debe tener formato HH:mm entre 00:00 y 23:59');
export const CalendarRestaurantSchema = z.object({ restauranteId: z.string().uuid() }).strict();
export const CalendarDayQuerySchema = CalendarRestaurantSchema.extend({
  fecha: CalendarDateSchema,
});
export const CalendarNextQuerySchema = CalendarRestaurantSchema.extend({
  desde: CalendarDateSchema.optional(),
});
export const CalendarWeekdaySchema = z
  .string()
  .regex(/^[0-6]$/)
  .transform(Number);

// No convierto cadenas en booleanos ni acepto propiedades de aforo o reservas.
export const CalendarRuleSchema = z
  .object({
    id: z.string().uuid().optional(),
    horaApertura: CalendarTimeSchema,
    horaCierre: CalendarTimeSchema,
    abierto: z.boolean().default(true),
    activo: z.boolean().default(true),
  })
  .strict()
  .refine((rule) => rule.horaApertura < rule.horaCierre, {
    message: 'La apertura debe ser anterior al cierre; no admitimos horarios nocturnos',
    path: ['horaCierre'],
  });
export const CalendarConfirmationSchema = z
  .object({
    confirmarReservasAfectadas: z.number().int().nonnegative().optional(),
  })
  .strict();
export const CalendarRulesInputSchema = CalendarConfirmationSchema.extend({
  reglas: z.array(CalendarRuleSchema).max(48),
}).refine(({ reglas }) => {
  const ids = reglas.flatMap((rule) => (rule.id ? [rule.id] : []));
  return ids.length === new Set(ids).size;
}, 'No repetimos el identificador de una regla');
export const CalendarExceptionInputSchema = CalendarConfirmationSchema.extend({
  abierto: z.boolean(),
  horaApertura: CalendarTimeSchema.nullable().optional(),
  horaCierre: CalendarTimeSchema.nullable().optional(),
  soloPorReserva: z.boolean().default(false),
  motivo: z.string().trim().max(500).nullable().optional(),
}).superRefine((day, ctx) => {
  if (day.abierto && (!day.horaApertura || !day.horaCierre || day.horaApertura >= day.horaCierre)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['horaCierre'],
      message: 'Un día abierto necesita apertura anterior al cierre',
    });
  }
  if (!day.abierto && (day.horaApertura != null || day.horaCierre != null || day.soloPorReserva)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Un día cerrado no lleva horas ni soloPorReserva',
    });
  }
});

export type CalendarRuleInput = z.infer<typeof CalendarRuleSchema>;
export type CalendarRulesInput = z.infer<typeof CalendarRulesInputSchema>;
export type CalendarExceptionInput = z.infer<typeof CalendarExceptionInputSchema>;
export type CalendarConfirmation = z.infer<typeof CalendarConfirmationSchema>;
export interface CalendarDayResult {
  restauranteId: string;
  fecha: string;
  zonaHoraria: typeof CALENDAR_TIME_ZONE;
  abierto: boolean;
  soloPorReserva: boolean;
  origen: 'EXCEPCION' | 'SEMANAL' | 'SIN_REGLA';
  horarios: { horaApertura: string; horaCierre: string }[];
  motivo: string | null;
}
export interface CalendarNextResult {
  desde: string;
  hasta: string;
  diasBuscados: number;
  dia: CalendarDayResult | null;
}
export interface CalendarClosureWarning {
  codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS';
  reservasAfectadas: number;
  fechas: { fecha: string; cantidad: number }[];
  confirmacion: string;
}
