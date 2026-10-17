import type {
  CategoryCreate,
  CategoryUpdate,
  DishCreate,
  DishUpdate,
  MenuTag,
} from '@encanto/shared';
import { apiClient } from './api/api-client';

export interface AdminPage<T> {
  paginacion: { pagina: number; tamanoPagina: number; total: number; totalPaginas: number };
  data: T[];
}

export interface AdminCategory {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
  cantidadPlatos?: number;
}

export interface AdminDish {
  id: string;
  categoryId: string;
  nombre: string;
  slug: string;
  descripcionBreve: string | null;
  descripcion: string;
  precio: number;
  alergenos: string | null;
  disponible: boolean;
  activo: boolean;
  destacado: boolean;
  orden: number;
  category: { id: string; nombre: string; activa: boolean };
  photos: AdminDishPhoto[];
  etiquetasIds: string[];
}

export interface AdminDishPhoto {
  id: string;
  path: string;
  pathOg: string | null;
  orden: number;
  principal: boolean;
}

export interface UploadedDishPhoto extends AdminDishPhoto {
  imagenBytes: number;
  vistaPreviaBytes: number;
}

const pageParams = (
  restauranteId: string,
  pagina: number,
  incluirInactivos?: boolean,
) => ({
  restauranteId,
  pagina,
  tamanoPagina: 100,
  ...(incluirInactivos === undefined ? {} : { incluirInactivos }),
});

async function allPages<T>(
  route: string,
  restauranteId: string,
  incluirInactivos?: boolean,
): Promise<T[]> {
  const first = (
    await apiClient.get<AdminPage<T>>(route, {
      params: pageParams(restauranteId, 1, incluirInactivos),
    })
  ).data;
  const result = [...first.data];
  for (let pagina = 2; pagina <= first.paginacion.totalPaginas; pagina += 1) {
    const next = (
      await apiClient.get<AdminPage<T>>(route, {
        params: pageParams(restauranteId, pagina, incluirInactivos),
      })
    ).data;
    result.push(...next.data);
  }
  return result;
}

// Centralizo los cambios de administración para que el formulario no arme rutas ni payloads sueltos.
export const adminMenuApi = {
  categories: (restauranteId: string) =>
    allPages<AdminCategory>('/admin/menu/categorias', restauranteId, true),

  createCategory: async (restauranteId: string, body: CategoryCreate) =>
    (
      await apiClient.post<AdminCategory>('/admin/menu/categorias', body, {
        params: { restauranteId },
      })
    ).data,

  updateCategory: async (
    restauranteId: string,
    id: string,
    body: CategoryUpdate,
  ) =>
    (
      await apiClient.put<AdminCategory>(`/admin/menu/categorias/${id}`, body, {
        params: { restauranteId },
      })
    ).data,

  dishes: (restauranteId: string) =>
    allPages<AdminDish>('/admin/menu/platos', restauranteId, true),

  createDish: async (restauranteId: string, body: DishCreate) =>
    (
      await apiClient.post<AdminDish>('/admin/menu/platos', body, {
        params: { restauranteId },
      })
    ).data,

  updateDish: async (restauranteId: string, id: string, body: DishUpdate) =>
    (
      await apiClient.put<AdminDish>(`/admin/menu/platos/${id}`, body, {
        params: { restauranteId },
      })
    ).data,

  setDishActive: (restauranteId: string, id: string, activo: boolean) =>
    apiClient.put(
      `/admin/menu/platos/${id}/activo`,
      { activo },
      { params: { restauranteId } },
    ),

  setAvailability: (restauranteId: string, id: string, disponible: boolean) =>
    apiClient.put(
      `/admin/menu/platos/${id}/disponibilidad`,
      { disponible },
      { params: { restauranteId } },
    ),

  tags: (restauranteId: string) =>
    allPages<MenuTag>('/menu/etiquetas', restauranteId),

  uploadPhoto: async (
    restauranteId: string,
    dishId: string,
    asset: { uri: string; fileName?: string | null; type?: string | null },
  ) => {
    const body = new FormData();
    body.append(
      'foto',
      {
        uri: asset.uri,
        name: asset.fileName || 'plato.jpg',
        type: asset.type || 'image/jpeg',
      } as unknown as Blob,
    );
    return (
      await apiClient.post<UploadedDishPhoto>(
        `/admin/menu/platos/${dishId}/fotos`,
        body,
        {
          params: { restauranteId },
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
    ).data;
  },

  reorderPhotos: (restauranteId: string, dishId: string, photos: AdminDishPhoto[]) =>
    apiClient.put(
      `/admin/menu/platos/${dishId}/fotos/orden`,
      { fotos: photos.map(({ id }, orden) => ({ id, orden })) },
      { params: { restauranteId } },
    ),

  removePhoto: (restauranteId: string, dishId: string, photoId: string) =>
    apiClient.delete(`/admin/menu/platos/${dishId}/fotos/${photoId}`, {
      params: { restauranteId },
    }),
};
