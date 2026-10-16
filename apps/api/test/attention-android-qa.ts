import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import * as argon2 from 'argon2';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

// Arranco datos y API reales solo contra el destino local validado; nunca cargo el seed del proyecto.
const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
const stateFile = process.env.ENCANTO_QA_STATE_FILE;
if (!url || !stateFile)
  throw new Error(
    'Defina ENCANTO_MENU_TEST_DATABASE_URL aislada y ENCANTO_QA_STATE_FILE fuera de Git',
  );
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const stateRelative = relative(repository, resolve(stateFile));
if (
  !isAbsolute(stateFile) ||
  (!stateRelative.startsWith(`..${sep}`) && !isAbsolute(stateRelative))
) {
  throw new Error('ENCANTO_QA_STATE_FILE debe estar fuera del repositorio');
}
const fixture = await createMenuPostgresFixture(url);
const db = fixture.client;
const restaurantId = randomUUID(),
  categoryId = randomUUID(),
  adminId = randomUUID();
const password = `Qa-${randomUUID()}!`;
const correo = 'admin.android@example.test';
await db.restaurant.create({
  data: {
    id: restaurantId,
    nombre: 'Android QA aislado',
    direccion: 'Prueba',
    latitud: 0,
    longitud: 0,
    telefono: '0',
    whatsapp: '0',
    aforoTotal: 10,
  },
});
await db.user.create({
  data: {
    id: adminId,
    nombre: 'QA ADMIN',
    correo,
    telefono: '0',
    rol: 'ADMIN',
    passwordHash: await argon2.hash(password),
  },
});
await db.category.create({
  data: { id: categoryId, restaurantId, nombre: 'Pruebas Android' },
});
const dishA = randomUUID(),
  dishB = randomUUID();
await db.dish.createMany({
  data: [
    {
      id: dishA,
      categoryId,
      nombre: 'Plato general habilitado',
      slug: dishA,
      descripcion: 'Prueba aislada',
      precio: 32000,
      disponible: true,
    },
    {
      id: dishB,
      categoryId,
      nombre: 'Plato general deshabilitado',
      slug: dishB,
      descripcion: 'Prueba aislada',
      precio: 18000,
      disponible: false,
    },
  ],
});
const rule = await db.timeSlot.create({
  data: {
    restaurantId,
    diaSemana: 0,
    horaApertura: '10:00',
    horaCierre: '18:00',
    aforoMaximo: 17,
  },
});
await db.reservation.createMany({
  data: [0, 1].map((i) => ({
    usuarioId: adminId,
    codigo: `ANDROID-QA-${i}`,
    fecha: new Date('2031-02-23'),
    horaInicio: '12:00',
    horaFin: '13:30',
    numComensales: 2,
    estado: 'CONFIRMADA',
  })),
});
await writeFile(
  stateFile,
  JSON.stringify(
    {
      restaurantId,
      correo,
      password,
      ruleId: rule.id,
      dishA,
      dishB,
      databaseUrl: fixture.url,
    },
    null,
    2,
  ),
);
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
  {
    env: {
      ...process.env,
      DATABASE_URL: fixture.url,
      DIRECT_URL: fixture.url,
      PORT: '3038',
      JWT_ACCESS_SECRET: randomUUID(),
      JWT_REFRESH_SECRET: randomUUID(),
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
    },
    stdio: 'inherit',
  },
);
// Al terminar borro únicamente nuestro esquema desechable, después de detener su API.
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  child.kill();
  await fixture.close();
  process.exit(0);
};
process.on('SIGINT', () => {
  void close();
});
process.on('SIGTERM', () => {
  void close();
});
child.on('exit', () => {
  void close();
});
