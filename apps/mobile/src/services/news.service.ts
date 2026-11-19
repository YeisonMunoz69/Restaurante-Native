import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NewsPostSchema, type NewsPost } from '@encanto/shared';
import { apiClient } from './api/api-client';
import { publicMenuPhotoUrl } from '../components/menu/menu-photo';

// Vinculo la copia pública al servidor y a la sede para respetar el entorno seleccionado.
export async function readNews(baseURL: string, restauranteId: string, signal: AbortSignal) {
  const key = 'encanto.news.v1:' + baseURL + ':' + restauranteId;
  try {
    const { data } = await apiClient.get<NewsPost[]>('/noticias', { baseURL, params: { restauranteId }, signal });
    const posts = NewsPostSchema.array().parse(data).filter(post => post.publicada);
    if (!signal.aborted) await AsyncStorage.setItem(key, JSON.stringify(posts)).catch(() => undefined);
    return { posts, cached: false };
  } catch (error) {
    // Solo recupero la copia si el servidor no responde o devuelve un fallo temporal.
    if (signal.aborted || !axios.isAxiosError(error) || (error.response && error.response.status < 500)) throw error;
    const saved = await AsyncStorage.getItem(key).catch(() => null);
    if (!saved) throw error;
    const posts = NewsPostSchema.array().parse(JSON.parse(saved)).filter(post => post.publicada);
    return { posts, cached: true };
  }
}

export function newsImageUrl(post: NewsPost, base: string, restauranteId: string) {
  const sameOriginPath = '/noticias/' + post.id + '/imagen';
  if (post.imagen === sameOriginPath) {
    return base + sameOriginPath + '?restauranteId=' + encodeURIComponent(restauranteId);
  }
  return publicMenuPhotoUrl(post.imagen);
}
