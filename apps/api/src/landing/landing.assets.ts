import type { NestExpressApplication } from '@nestjs/platform-express';
import { fileURLToPath } from 'node:url';

// Busco los archivos junto a src o dist para no depender de dónde ejecuto Node.
export const LANDING_ASSETS_PATH = fileURLToPath(
  new URL('../../public/', import.meta.url),
);

// Docker conserva esta misma ruta para servir las fotos que también incluimos en Android.
const ORIGINAL_PHOTOS_PATH = fileURLToPath(new URL('../../../mobile/src/assets/carta/', import.meta.url));

// Sirvo solamente archivos públicos; las rutas que no existen siguen hacia Nest.
export function configureLanding(app: NestExpressApplication) {
  app.useStaticAssets(LANDING_ASSETS_PATH, {
    index: 'index.html',
    dotfiles: 'deny',
    redirect: false,
    maxAge: 0,
  });
  app.useStaticAssets(ORIGINAL_PHOTOS_PATH, {
    prefix: '/api/v1/carta-fotos', index: false, dotfiles: 'deny', redirect: false, maxAge: 0,
  });
}
