import type {
  CalendarNextResult,
  CalendarDayResult,
  MenuCategory,
  MenuDish,
  MenuDishResult,
  MenuDishesPage,
  MenuPage,
  MenuTag,
} from '@encanto/shared';
import { apiClient } from './api/api-client';

const CATEGORY_PAGE_SIZE = 100;

// Traigo las categorías activas completas para conservar también las vacías.
async function allCategories(restauranteId: string): Promise<MenuCategory[]> {
  const first = (
    await apiClient.get<MenuPage<MenuCategory>>('/menu/categorias', {
      params: { restauranteId, pagina: 1, tamanoPagina: CATEGORY_PAGE_SIZE },
    })
  ).data;
  const categories = [...first.data];

  for (let pagina = 2; pagina <= first.paginacion.totalPaginas; pagina += 1) {
    const next = (
      await apiClient.get<MenuPage<MenuCategory>>('/menu/categorias', {
        params: { restauranteId, pagina, tamanoPagina: CATEGORY_PAGE_SIZE },
      })
    ).data;
    categories.push(...next.data);
  }

  return categories;
}

// Mantengo juntas las rutas públicas y envío siempre la sede y la fecha pedida.
export const menuApi = {
  day: async (restauranteId: string, fecha: string) =>
    (
      await apiClient.get<CalendarDayResult>('/calendario/dia', {
        params: { restauranteId, fecha },
      })
    ).data,

  nextOpenDay: async (restauranteId: string) =>
    (
      await apiClient.get<CalendarNextResult>('/calendario/proximo', {
        params: { restauranteId },
      })
    ).data,

  categories: allCategories,

  dishes: async (restauranteId: string, fecha: string, pagina = 1) =>
    (
      await apiClient.get<MenuDishesPage>('/menu/platos', {
        params: { restauranteId, fecha, pagina, tamanoPagina: 20 },
      })
    ).data,

  dish: async (restauranteId: string, fecha: string, id: string) =>
    (
      await apiClient.get<MenuDishResult>(`/menu/platos/${id}`, {
        params: { restauranteId, fecha },
      })
    ).data.plato,

  tags: async (restauranteId: string, pagina = 1) =>
    (
      await apiClient.get<MenuPage<MenuTag>>('/menu/etiquetas', {
        params: { restauranteId, pagina },
      })
    ).data,
};

export type { MenuDish };
