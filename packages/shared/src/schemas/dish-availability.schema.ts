import { z } from 'zod';
import { CalendarDateSchema } from './calendar.schema';
import { MenuDishesQuerySchema } from './menu.schema';
import type { MenuCategory, MenuPage } from './menu.schema';

export const DishAvailabilityQuerySchema = MenuDishesQuerySchema;
// Null significa quitar la excepción; no significa deshabilitar el plato general.
export const DishAvailabilityWriteSchema = z
  .object({
    cambios: z
      .array(z.object({ platoId: z.string().uuid(), disponible: z.boolean().nullable() }).strict())
      .min(1)
      .max(1000),
  })
  .strict()
  .refine(
    ({ cambios }) => new Set(cambios.map((change) => change.platoId)).size === cambios.length,
    'No repetimos platos',
  );
export const DishAvailabilityCopySchema = z
  .object({
    origen: CalendarDateSchema,
    destino: CalendarDateSchema,
    confirmacion: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict()
  .refine(
    ({ origen, destino }) => origen !== destino,
    'Origen y destino deben ser fechas diferentes',
  );
export type DishAvailabilityWrite = z.infer<typeof DishAvailabilityWriteSchema>;
export type DishAvailabilityCopy = z.infer<typeof DishAvailabilityCopySchema>;
export interface DishAvailabilityRow {
  platoId: string;
  nombre: string;
  categoria: MenuCategory;
  disponibleGeneral: boolean;
  disponible: boolean;
  origen: 'FECHA' | 'GENERAL';
  excepcion: { id: string; disponible: boolean } | null;
}
export interface DishAvailabilityPage extends MenuPage<DishAvailabilityRow> {
  fecha: string;
}
export interface DishAvailabilityCopyPreview {
  restauranteId: string;
  origen: string;
  destino: string;
  total: number;
  cambios: number;
  excepcionesDestino: number;
  confirmacion: string;
}
export type DishAvailabilityCopyResult =
  | { aplicada: false; previsualizacion: DishAvailabilityCopyPreview }
  | { aplicada: true; procesados: number };
