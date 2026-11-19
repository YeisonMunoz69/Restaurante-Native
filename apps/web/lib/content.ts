import { cache } from 'react';
import { notFound } from 'next/navigation';
import { CalendarDateSchema, MenuDishIdSchema, MenuDishSlugSchema, NewsPostSchema, type MenuDishResult } from '@encanto/shared';

// Acepto solo URLs web, sin credenciales, para las portadas y los enlaces públicos.
export function webUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function apiUrl(path: string) {
  const base = webUrl(process.env.ENCANTO_API_URL);
  const restaurant = process.env.ENCANTO_RESTAURANTE_ID;
  if (!base || base.pathname.replace(/\/$/, '') !== '/api/v1' || base.search || base.hash ||
      !MenuDishIdSchema.safeParse(restaurant).success) {
    throw new Error('Configura ENCANTO_API_URL y ENCANTO_RESTAURANTE_ID para leer el contenido');
  }
  const url = new URL(base.href.replace(/\/$/, '') + path);
  url.searchParams.set('restauranteId', restaurant!);
  return url;
}

async function read(url: URL) {
  // Renderizo el estado actual y no guardo noticias despublicadas en la web.
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('No pudimos consultar el contenido del restaurante');
  return response.json();
}

export const readDish = cache(async (slug: string, requestedDate?: string) => {
  if (!MenuDishSlugSchema.safeParse(slug).success) notFound();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = CalendarDateSchema.safeParse(requestedDate ?? today);
  if (!date.success) notFound();
  const url = apiUrl('/menu/platos/slug/' + encodeURIComponent(slug));
  url.searchParams.set('fecha', date.data);
  return (await read(url)) as MenuDishResult;
});

export const readNews = cache(async (id: string) => {
  if (!MenuDishIdSchema.safeParse(id).success) notFound();
  const post = NewsPostSchema.parse(await read(apiUrl('/noticias/' + id)));
  if (!post.publicada) notFound();
  return post;
});

export function publicPage(path: string) {
  const origin = webUrl(process.env.ENCANTO_WEB_URL);
  return origin ? new URL(path, origin).href : undefined;
}

export function newsCover(id: string, path: string | null) {
  if (path !== '/noticias/' + id + '/imagen') return webUrl(path)?.href;
  return apiUrl(path).href;
}
