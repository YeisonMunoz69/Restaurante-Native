import { z } from 'zod';
import { CalendarDateSchema } from './calendar.schema';

// Valido páginas escritas como enteros y acoto cada consulta pública.
const pageNumber = (maximum: number, fallback: string) =>
  z
    .string()
    .regex(/^[1-9][0-9]*$/, 'Usamos enteros positivos sin ceros iniciales')
    .default(fallback)
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value <= maximum, `El máximo es ${maximum}`);
export const MenuRestaurantQuerySchema = z.object({ restauranteId: z.string().uuid() }).strict();
export const MenuPageQuerySchema = MenuRestaurantQuerySchema.extend({
  pagina: pageNumber(10000, '1'),
  tamanoPagina: pageNumber(100, '20'),
});
export const MenuDishesQuerySchema = MenuPageQuerySchema.extend({ fecha: CalendarDateSchema });
export const MenuDishQuerySchema = MenuRestaurantQuerySchema.extend({ fecha: CalendarDateSchema });
export const MenuDishIdSchema = z.string().uuid();

export type MenuPageQuery = z.infer<typeof MenuPageQuerySchema>;
export type MenuDishesQuery = z.infer<typeof MenuDishesQuerySchema>;
export type MenuDishQuery = z.infer<typeof MenuDishQuerySchema>;
export interface MenuPagination {
  pagina: number;
  tamanoPagina: number;
  total: number;
  totalPaginas: number;
}
export interface MenuPage<T> {
  restauranteId: string;
  data: T[];
  paginacion: MenuPagination;
}
export interface MenuCategory {
  id: string;
  nombre: string;
  orden: number;
}
export interface MenuTag {
  id: string;
  nombre: string;
  icono: string | null;
}
export interface MenuPhoto {
  id: string;
  path: string;
  pathOg: string | null;
  orden: number;
  principal: boolean;
}
// Acordamos precio numérico en COP con Fabián; no calculamos pedidos en el cliente.
export interface MenuDish {
  id: string;
  categoria: MenuCategory;
  nombre: string;
  slug: string;
  descripcionBreve: string | null;
  descripcion: string;
  precio: number;
  moneda: 'COP';
  alergenos: string | null;
  destacado: boolean;
  orden: number;
  disponible: boolean;
  disponibilidadOrigen: 'FECHA' | 'GENERAL';
  fotos: MenuPhoto[];
  etiquetas: MenuTag[];
}
export interface MenuDishesPage extends MenuPage<MenuDish> {
  fecha: string;
}
export interface MenuDishResult {
  restauranteId: string;
  fecha: string;
  plato: MenuDish;
}
