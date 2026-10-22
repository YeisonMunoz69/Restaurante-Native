import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as argon2 from 'argon2';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

// Preparo usuarios ficticios y ejecuto solo el runtime Docker, nunca la API del host.
const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
const stateFile = process.env.ENCANTO_QA_STATE_FILE;
if (!url || !stateFile)
  throw new Error(
    'Defina base aislada y archivo de estado privado fuera del repositorio',
  );
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const stateRelative = relative(repository, resolve(stateFile));
if (
  !isAbsolute(stateFile) ||
  (!stateRelative.startsWith(`..${sep}`) && !isAbsolute(stateRelative))
)
  throw new Error('El archivo de estado debe quedar fuera de Git');
const fixture = await createMenuPostgresFixture(url);
const db = fixture.client;
const restaurantId = randomUUID(),
  categoryId = randomUUID(),
  dishId = randomUUID();
const password = `Qa-${randomUUID()}!`;
await db.restaurant.create({
  data: {
    id: restaurantId,
    nombre: 'QA local en Docker',
    direccion: 'Prueba',
    latitud: 0,
    longitud: 0,
    telefono: '',
    whatsapp: '',
    aforoTotal: 40,
  },
});
const users: Record<string, { id: string; correo: string }> = {};
for (const rol of ['ADMIN', 'COMENSAL', 'STAFF'] as const) {
  const id = randomUUID(),
    correo = `${rol.toLowerCase()}@mobile.example.test`;
  await db.user.create({
    data: {
      id,
      nombre: `QA ${rol}`,
      correo,
      telefono: '',
      rol,
      passwordHash: await argon2.hash(password),
    },
  });
  users[rol] = { id, correo };
}
await db.category.create({
  data: { id: categoryId, restaurantId, nombre: 'Carta de prueba Docker' },
});
await db.dish.create({
  data: {
    id: dishId,
    categoryId,
    nombre: 'Plato QA servido por Docker',
    slug: dishId,
    descripcion: 'Datos desechables para probar reservas',
    precio: 32000,
  },
});
await db.timeSlot.createMany({
  data: Array.from({ length: 7 }, (_, diaSemana) => ({
    restaurantId,
    diaSemana,
    horaApertura: '10:00',
    horaCierre: '20:00',
    abierto: true,
    aforoMaximo: 40,
  })),
});
const internalUrl = new URL(fixture.url);
internalUrl.hostname = 'db';
internalUrl.port = '5432';
const container = 'encanto-qa-api',
  image = 'encanto-api-qa:local';
await writeFile(
  stateFile,
  JSON.stringify(
    { restaurantId, dishId, users, password, databaseUrl: fixture.url },
    null,
    2,
  ),
  { mode: 0o600 },
);
const child = spawn(
  'docker',
  [
    'run',
    '--rm',
    '--name',
    container,
    '--network',
    'encanto-local-qa',
    '--publish',
    '127.0.0.1:3039:3000',
    '-e',
    `DATABASE_URL=${internalUrl}`,
    '-e',
    `DIRECT_URL=${internalUrl}`,
    '-e',
    'APP_ENV=staging',
    '-e',
    'NODE_ENV=production',
    '-e',
    'API_PREFIX=api/v1',
    '-e',
    'SWAGGER_ENABLED=false',
    '-e',
    `JWT_ACCESS_SECRET=${randomUUID()}`,
    '-e',
    `JWT_REFRESH_SECRET=${randomUUID()}`,
    '-e',
    'JWT_ACCESS_EXPIRATION=15m',
    '-e',
    'JWT_REFRESH_EXPIRATION=7d',
    image,
  ],
  { stdio: 'inherit' },
);
let closing = false;
// Detengo solamente nuestra API y borro el esquema único de esta ejecución.
const close = async () => {
  if (closing) return;
  closing = true;
  try {
    execFileSync('docker', ['stop', '--time', '5', container], {
      stdio: 'ignore',
    });
  } catch {
    /* Puede haber terminado antes. */
  }
  await fixture.close();
  process.exit(0);
};
process.on('SIGINT', () => {
  close();
});
process.on('SIGTERM', () => {
  close();
});
child.on('exit', () => {
  close();
});
