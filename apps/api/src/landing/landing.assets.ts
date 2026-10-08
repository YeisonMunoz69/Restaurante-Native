import type { NestExpressApplication } from '@nestjs/platform-express';
import { fileURLToPath } from 'node:url';

// Busco los archivos junto a src o dist para no depender de dónde ejecuto Node.
export const LANDING_ASSETS_PATH = fileURLToPath(
  new URL('../../public/', import.meta.url),
);

// Sirvo solamente la carpeta pública; las rutas que no existen siguen hacia Nest.
export function configureLanding(app: NestExpressApplication) {
  app.useStaticAssets(LANDING_ASSETS_PATH, {
    index: 'index.html',
    dotfiles: 'deny',
    redirect: false,
    maxAge: 0,
  });
}
