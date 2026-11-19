import { CalendarDateSchema, MenuDishIdSchema, MenuDishSlugSchema } from '@encanto/shared';
import { BUILD_WEB_ORIGIN } from './build-variant';

// Construyo enlaces solo para el origen público HTTPS que configuramos al compilar.
export function webOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.pathname === '/' && !url.search && !url.hash ? url.origin : null;
  } catch {
    return null;
  }
}

export const WEB_ORIGIN = webOrigin(BUILD_WEB_ORIGIN);

export function dishLink(slug: string, fecha: string, origin = WEB_ORIGIN) {
  if (!origin || !MenuDishSlugSchema.safeParse(slug).success || !CalendarDateSchema.safeParse(fecha).success) return null;
  const url = new URL('/plato/' + slug, origin);
  url.searchParams.set('fecha', fecha);
  return url.href;
}

export function newsLink(id: string, origin = WEB_ORIGIN) {
  return origin && MenuDishIdSchema.safeParse(id).success ? new URL('/noticia/' + id, origin).href : null;
}
