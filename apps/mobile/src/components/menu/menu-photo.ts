import { menuNameSlug, type MenuDish } from '@encanto/shared';
import type { ImageSourcePropType } from 'react-native';

const originalPhotos = new Map<string, readonly ImageSourcePropType[]>([
  ['ajiaco', [require('../../assets/carta/ajiaco-01.webp')]],
  ['chicharron-crocante', [require('../../assets/carta/chicharron-crocante-01.webp')]],
  ['churrasco', [require('../../assets/carta/churrasco-01.webp')]],
  ['costilla-ahumada', [require('../../assets/carta/costilla-ahumada-01.webp')]],
  ['picada-para-compartir', [require('../../assets/carta/picada-para-compartir-01.webp')]],
  ['porcion-de-empanadas', [require('../../assets/carta/porcion-de-empanadas-01.webp')]],
  ['sancocho-de-gallina', [require('../../assets/carta/sancocho-de-gallina-01.webp')]],
  ['tilapia-ahumada', [require('../../assets/carta/tilapia-ahumada-01.webp')]],
]);
const restaurantPrefix = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}-/i;
const maxPhotos = 10;

// Solo uso una ruta pública HTTPS completa; no supongo el bucket de Storage.
export function publicMenuPhotoUrl(path: string | null | undefined) {
  if (!path || !/^https:\/\//i.test(path)) return null;
  try {
    return new URL(path).toString();
  } catch {
    return null;
  }
}

// Uso la galería de ADMIN si está publicada. Las fotos incluidas cubren platos todavía sin galería.
export function menuGallery(
  { slug = '', fotos, nombre }: Pick<MenuDish, 'slug' | 'fotos'> & Partial<Pick<MenuDish, 'nombre'>>,
  bundledOnly = false,
) {
  const published: { id: string; source: ImageSourcePropType }[] = bundledOnly ? [] : fotos.flatMap(photo => {
    const uri = publicMenuPhotoUrl(photo.path) ?? publicMenuPhotoUrl(photo.pathOg);
    return uri ? [{ id: photo.id, source: { uri } }] : [];
  });
  if (published.length) return published.slice(0, maxPhotos);

  // Quito el UUID del importador sin depender del nombre o precio que edite el dueño.
  const key = slug.replace(restaurantPrefix, '');
  const originalSlug = key === 'sancocho-de-gallina-criolla-a-la-lena' ? 'sancocho-de-gallina' : key;
  const localPhotos = originalPhotos.get(originalSlug) ?? originalPhotos.get(menuNameSlug(nombre ?? ''));
  return (localPhotos ?? []).slice(0, maxPhotos).map((source, index) => ({
    id: originalSlug + '/' + (index + 1),
    source,
  }));
}
