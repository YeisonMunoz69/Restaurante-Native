import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';
const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)('Importación de carta sin seed destructivo', () => {
  let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
  const id = randomUUID();
  beforeAll(async () => {
    fixture = await createMenuPostgresFixture(url!);
    await fixture.client.restaurant.create({ data: { id, nombre: 'QA carta', direccion: '', latitud: 0, longitud: 0, telefono: '', whatsapp: '', aforoTotal: 40 } });
  });
  afterAll(async () => fixture?.close());
  const run = (apply: boolean) => JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)), fileURLToPath(new URL('../prisma/importar-carta.ts', import.meta.url)), ...(apply ? ['--apply'] : [])], { env: { ...process.env, DATABASE_URL: fixture.url, DIRECT_URL: fixture.url, CATALOG_RESTAURANT_ID: id }, encoding: 'utf8' }));
  it('previsualiza, crea 44 productos sin fotos y preserva edición posterior al repetir', async () => {
    expect(run(false)).toMatchObject({ nuevos: 44, fotosCreadas: 0 });
    expect(await fixture.client.dish.count()).toBe(0);
    expect(run(true).nuevos).toBe(44);
    const dish = await fixture.client.dish.findFirstOrThrow();
    await fixture.client.dish.update({ where: { id: dish.id }, data: { precio: 12345, disponible: false, descripcion: 'Edición del dueño' } });
    expect(run(true)).toMatchObject({ nuevos: 0, conservados: 44 });
    expect(await fixture.client.dish.findUnique({ where: { id: dish.id } })).toMatchObject({ disponible: false, descripcion: 'Edición del dueño' });
    expect(await fixture.client.dishPhoto.count()).toBe(0);
  }, 30000);
});
