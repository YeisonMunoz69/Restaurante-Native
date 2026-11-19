import { type NewsContent, type NewsPost, type NewsUpdate } from '@encanto/shared';
import { apiClient } from './api/api-client';

// Uso la revisión de la noticia para proteger edición y carga aunque haya dos administradores.
export const adminNewsApi = {
  list: async (restauranteId: string, signal: AbortSignal) =>
    (await apiClient.get<NewsPost[]>('/admin/noticias', { params: { restauranteId }, signal })).data,
  create: async (restauranteId: string, body: NewsContent) =>
    (await apiClient.post<NewsPost>('/admin/noticias', body, { params: { restauranteId } })).data,
  update: async (restauranteId: string, id: string, body: NewsUpdate) =>
    (await apiClient.put<NewsPost>('/admin/noticias/' + id, body, { params: { restauranteId } })).data,
  upload: async (
    restauranteId: string, id: string, version: string,
    asset: { uri: string; fileName?: string | null; type?: string | null },
  ) => {
    const body = new FormData();
    body.append('version', version);
    body.append('foto', {
      uri: asset.uri, name: asset.fileName || 'noticia.jpg', type: asset.type || 'image/jpeg',
    } as unknown as Blob);
    return (await apiClient.put<NewsPost>('/admin/noticias/' + id + '/imagen', body, {
      params: { restauranteId }, headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
};
