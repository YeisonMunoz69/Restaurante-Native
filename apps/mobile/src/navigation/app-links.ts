import type { LinkingOptions } from '@react-navigation/native';
import { CalendarDateSchema, MenuDishIdSchema, MenuDishSlugSchema } from '@encanto/shared';
import { WEB_ORIGIN } from '../config/web-links';
import type { RootTabParamList } from './BottomTabNavigator';

// Restrinjo los destinos antes de que la navegación procese el enlace recibido.
export function isAppLink(url: string, origin: string) {
  try {
    const link = new URL(url);
    if (link.origin !== origin || link.username || link.password) return false;
    const [, route, key, ...rest] = link.pathname.split('/');
    if (!key || rest.length || link.hash) return false;
    if (route === 'noticia') return !link.search && MenuDishIdSchema.safeParse(key).success;
    if (route !== 'plato' || !MenuDishSlugSchema.safeParse(key).success) return false;
    const date = link.searchParams.getAll('fecha');
    return [...link.searchParams.keys()].every(name => name === 'fecha') &&
      (date.length === 0 || date.length === 1 && CalendarDateSchema.safeParse(date[0]).success);
  } catch {
    return false;
  }
}

export function appLinks(origin: string | null): LinkingOptions<RootTabParamList> | undefined {
  if (!origin) return undefined;
  return {
    prefixes: [origin],
    filter: url => isAppLink(url, origin),
    config: { screens: { Menu: 'plato/:slug', News: 'noticia/:id' } },
  };
}

export const WEB_LINKING = appLinks(WEB_ORIGIN);
