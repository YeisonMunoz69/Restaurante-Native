import { dishLink, newsLink, webOrigin } from '../web-links';

const origin = 'https://encanto.example.test';

it('comparte el slug y la fecha de la carta en el origen público', () => {
  expect(dishLink('tilapia-ahumada', '2026-11-22', origin))
    .toBe(origin + '/plato/tilapia-ahumada?fecha=2026-11-22');
  expect(dishLink('alguien/otro', '2026-11-22', origin)).toBeNull();
  expect(dishLink('tilapia', '2026-02-30', origin)).toBeNull();
  expect(dishLink('tilapia', '2026-11-22', null)).toBeNull();
  expect(newsLink('10000000-0000-4000-8000-000000000001', origin))
    .toBe(origin + '/noticia/10000000-0000-4000-8000-000000000001');
});

it('rechaza URL local, credenciales, puertos personalizados y subrutas', () => {
  expect(webOrigin(origin + '/')).toBe(origin);
  expect(webOrigin('http://localhost')).toBeNull();
  expect(webOrigin('https://user@encanto.example.test')).toBeNull();
  expect(webOrigin(origin + ':3040')).toBeNull();
  expect(webOrigin(origin + '/otra')).toBeNull();
});
