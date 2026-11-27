import { isDemoMenuPhoto, originalMenuPhotoKey, type MenuPhoto } from '@encanto/shared';

// Devuelvo una URL absoluta del entorno, compatible con los APK que ya leen fotos por HTTPS.
export function originalMenuPhotoUrl(slug: string, nombre: string): string | null {
  const key = originalMenuPhotoKey(slug, nombre);
  if (!key || !process.env.API_URL) return null;
  try {
    const publicApi = new URL(process.env.API_URL);
    if (publicApi.protocol !== 'https:' || publicApi.username || publicApi.password) return null;
    return new URL(`/api/v1/carta-fotos/${key}-01.webp`, publicApi).href;
  } catch {
    return null;
  }
}

export function publicDishPhotos(dish: { id: string; nombre: string; slug: string; photos: MenuPhoto[] }) {
  const original = originalMenuPhotoUrl(dish.slug, dish.nombre);
  if (!original) return dish.photos;
  // Respeto la foto que cargó ADMIN y retiro solo las muestras del seed para estos platos.
  const published = dish.photos.filter(photo => !isDemoMenuPhoto(photo.path));
  if (published.length) return published;
  return [{ id: `original-${dish.id}`, path: original, pathOg: null, principal: true, orden: 0 }];
}
