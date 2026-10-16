import { Prisma } from '@prisma/client';
import { vi } from 'vitest';

export const menuRestaurantId = '00000000-0000-4000-8000-000000000011';
export const menuDishId = '00000000-0000-4000-8000-000000000012';
export const menuCategory = {
  id: '00000000-0000-4000-8000-000000000013',
  nombre: 'Entradas',
  orden: 0,
};
export const menuTag = {
  id: '00000000-0000-4000-8000-000000000014',
  nombre: 'Vegetariano',
  icono: null,
};

// Represento exactamente los campos seleccionados por el menú, incluido Decimal real.
export const publicDishFixture = () => ({
  id: menuDishId,
  nombre: 'Plato de prueba',
  slug: 'plato-de-prueba',
  descripcionBreve: null,
  descripcion: 'Descripción persistida',
  precio: new Prisma.Decimal('32000.50'),
  alergenos: null,
  destacado: false,
  orden: 0,
  disponible: true,
  category: menuCategory,
  photos: [],
  dietaryTags: [{ tag: menuTag }],
  schedules: [] as { disponible: boolean }[],
});

// Simulo únicamente consultas para detectar si una ruta pública intenta escribir.
export function menuPrismaMock() {
  const db = {
    restaurant: {
      findUnique: vi.fn().mockResolvedValue({ id: menuRestaurantId }),
    },
    category: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([menuCategory]),
    },
    dish: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([publicDishFixture()]),
      findFirst: vi.fn().mockResolvedValue(publicDishFixture()),
    },
    dietaryTag: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([menuTag]),
    },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (action) => action(db));
  return db;
}
