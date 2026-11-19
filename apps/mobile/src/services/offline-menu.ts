import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartaOriginal, menuNameSlug, type MenuCategory, type MenuDish } from '@encanto/shared';

interface OfflineCatalog {
  categories: MenuCategory[];
  dishes: MenuDish[];
}

const categories = cartaOriginal.map(({ categoria }, orden) => ({
  id: menuNameSlug(categoria),
  nombre: categoria,
  orden,
}));

// Uso la transcripción original como copia de consulta para la primera visita.
export const bundledMenu: OfflineCatalog = {
  categories,
  dishes: cartaOriginal.flatMap(({ platos }, index) => platos.map(([nombre, precio, descripcion], orden): MenuDish => {
    const slug = menuNameSlug(nombre);
    return {
      id: slug,
      slug,
      categoria: categories[index],
      nombre,
      descripcion,
      descripcionBreve: descripcion,
      precio,
      moneda: 'COP',
      alergenos: null,
      destacado: false,
      orden,
      disponible: false,
      disponibilidadOrigen: 'GENERAL',
      fotos: [],
      etiquetas: [],
    };
  })),
};

export const offlineMenuKey = (url: string, restaurant: string) =>
  `encanto.menu.v1/${encodeURIComponent(url)}/${restaurant}`;

export async function readOfflineMenu(key: string): Promise<OfflineCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const catalog: OfflineCatalog = JSON.parse(raw);
    return Array.isArray(catalog?.categories) && Array.isArray(catalog?.dishes) ? catalog : null;
  } catch {
    return null;
  }
}

export function saveOfflineMenu(key: string, catalog: OfflineCatalog) {
  const dishes = catalog.dishes.map(dish => ({ ...dish, disponible: false, fotos: [] }));
  return AsyncStorage.setItem(key, JSON.stringify({ categories: catalog.categories, dishes }));
}
