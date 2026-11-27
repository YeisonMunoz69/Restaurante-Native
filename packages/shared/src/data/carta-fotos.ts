import { menuNameSlug } from './carta-original';

const originals = new Set([
  'ajiaco', 'chicharron-crocante', 'churrasco', 'costilla-ahumada',
  'picada-para-compartir', 'porcion-de-empanadas', 'sancocho-de-gallina', 'tilapia-ahumada',
]);
const restaurantPrefix = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}-/i;

// Reconozco los platos originales sin confundir variantes que tienen otro nombre.
export function originalMenuPhotoKey(slug = '', nombre = '') {
  const key = slug.replace(restaurantPrefix, '');
  const original = key === 'sancocho-de-gallina-criolla-a-la-lena' ? 'sancocho-de-gallina' : key;
  if (originals.has(original)) return original;
  const byName = menuNameSlug(nombre);
  return originals.has(byName) ? byName : null;
}

export function isDemoMenuPhoto(path: string | null | undefined) {
  if (!path) return false;
  try {
    const url = new URL(path);
    // Identifico el formato exacto de muestra del seed; ADMIN publica en rutas de Storage.
    return url.protocol === 'https:' && url.hostname === 'images.unsplash.com' &&
      url.pathname.startsWith('/photo-') && url.search === '?auto=format&fit=crop&w=800&q=80';
  } catch {
    return false;
  }
}
