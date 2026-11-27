import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicDishPhotos } from './original-menu-photos.js';

const dish = { id: '10000000-0000-4000-8000-000000000001', nombre: 'Sancocho de gallina', slug: 'sancocho-de-gallina-criolla-a-la-lena' };
const demo = {
  id: '20000000-0000-4000-8000-000000000001',
  path: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  pathOg: null, principal: true, orden: 0,
};

describe('portadas originales servidas por la API', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('prefiere el origen de fotos de dev al dominio anterior del equipo', () => {
    vi.stubEnv('PUBLIC_MENU_ORIGIN', 'https://encanto.example.test');
    vi.stubEnv('API_URL', 'https://equipo.example.test/api/v1');
    expect(publicDishPhotos({ ...dish, photos: [demo] })[0].path)
      .toBe('https://encanto.example.test/api/v1/carta-fotos/sancocho-de-gallina-01.webp');
  });

  it('reemplaza la muestra sin cambiar el formato de ID ni introducir metadatos sociales', () => {
    vi.stubEnv('PUBLIC_MENU_ORIGIN', '');
    vi.stubEnv('API_URL', 'https://api.example.test/api/v1');
    expect(publicDishPhotos({ ...dish, photos: [demo] })).toEqual([{
      ...demo, path: 'https://api.example.test/api/v1/carta-fotos/sancocho-de-gallina-01.webp',
    }]);
  });

  it('conserva las galerías del panel y las muestras de otros platos', () => {
    vi.stubEnv('PUBLIC_MENU_ORIGIN', '');
    vi.stubEnv('API_URL', 'https://api.example.test/api/v1');
    const uploaded = { ...demo, path: 'https://storage.example.test/plato.webp' };
    expect(publicDishPhotos({ ...dish, photos: [demo, uploaded] })).toEqual([uploaded]);
    expect(publicDishPhotos({ ...dish, slug: 'cafe', nombre: 'Café', photos: [demo] })).toEqual([demo]);
  });
});
