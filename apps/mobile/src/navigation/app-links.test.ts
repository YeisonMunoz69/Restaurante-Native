import { getStateFromPath } from '@react-navigation/native';
import { appLinks, isAppLink } from './app-links';

const origin = 'https://encanto.example.test';
const id = '10000000-0000-4000-8000-000000000001';

it('dirige URLs frías a la pestaña y al detalle exactos', () => {
  const config = appLinks(origin)?.config;
  const dish = '/plato/tilapia?fecha=2026-11-22';
  const news = '/noticia/' + id;
  expect(isAppLink(origin + dish, origin)).toBe(true);
  expect(getStateFromPath(dish, config)?.routes).toMatchObject([
    { name: 'Menu', params: { slug: 'tilapia', fecha: '2026-11-22' } },
  ]);
  expect(isAppLink(origin + news, origin)).toBe(true);
  expect(getStateFromPath(news, config)?.routes).toMatchObject([{ name: 'News', params: { id } }]);
});

it('ignora sitios ajenos y URLs alteradas', () => {
  for (const url of [
    origin + '.otro.test/plato/tilapia',
    origin + '/plato/tilapia?fecha=2026-02-30',
    origin + '/plato/tilapia?fecha=2026-11-22&fecha=2026-11-23',
    origin + '/plato/tilapia?restauranteId=' + id,
    origin + '/noticia/no-es-un-uuid',
  ]) expect(isAppLink(url, origin)).toBe(false);
});
