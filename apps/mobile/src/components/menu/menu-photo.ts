import { isDemoMenuPhoto, originalMenuPhotoKey, type MenuDish } from '@encanto/shared';
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

// Uso las fotos cargadas desde ADMIN, luego las originales incluidas y por último las del seed.
export function menuGallery(
  { slug = '', fotos, nombre }: Partial<Pick<MenuDish, 'slug' | 'nombre'>> & {
    fotos: readonly Pick<MenuDish['fotos'][number], 'id' | 'path' | 'pathOg'>[];
  },
  bundledOnly = false,
) {
  const published: { id: string; source: ImageSourcePropType; demo: boolean }[] = bundledOnly ? [] : fotos.flatMap(photo => {
    const uri = publicMenuPhotoUrl(photo.path) ?? publicMenuPhotoUrl(photo.pathOg);
    return uri ? [{ id: photo.id, source: { uri }, demo: isDemoMenuPhoto(uri) }] : [];
  });

  // Quito el UUID del importador sin depender del nombre o precio que edite el dueño.
  const originalSlug = originalMenuPhotoKey(slug, nombre);
  const localPhotos = originalSlug ? originalPhotos.get(originalSlug) : undefined;
  const gallery = localPhotos ? published.filter(photo => !photo.demo) : published;
  if (gallery.length) return gallery.slice(0, maxPhotos).map(({ id, source }) => ({ id, source }));
  return (localPhotos ?? []).slice(0, maxPhotos).map((source, index) => ({
    id: originalSlug + '/' + (index + 1),
    source,
  }));
}
