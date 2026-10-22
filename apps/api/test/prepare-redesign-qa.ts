import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';

// Solo preparo el esquema desechable que generó mobile-docker-qa; no acepto Supabase ni VPS.
const state = JSON.parse(await readFile(process.env.ENCANTO_QA_STATE_FILE!, 'utf8'));
const url = new URL(state.databaseUrl);
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55439');
assert.match(url.searchParams.get('schema') ?? '', /^ec25_[a-f0-9]+$/);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const base = 'http://127.0.0.1:3039/api/v1';
async function call(path: string, status: number, token?: string, body?: unknown) {
  const result = await fetch(`${base}${path}`, { method: body ? 'PUT' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(result.status, status, `${path}: ${result.status}`);
  return result.json();
}
try {
  const admin = await db.user.findUniqueOrThrow({ where: { id: state.users.ADMIN.id } });
  for (const n of [2, 3]) await db.user.upsert({ where: { correo: `qa-admin-${n}@example.test` }, update: {}, create: { nombre: `Administrador QA ${n}`, correo: `qa-admin-${n}@example.test`, telefono: '', passwordHash: admin.passwordHash, rol: 'ADMIN' } });
  // Retiro únicamente el producto sintético de esta ejecución; no borro registros ni fotos.
  await db.dish.update({ where: { id: state.dishId }, data: { activo: false } });
  const synthetic = await db.dish.findUniqueOrThrow({ where: { id: state.dishId }, select: { categoryId: true } });
  await db.category.update({ where: { id: synthetic.categoryId }, data: { activa: false } });
  await db.timeSlot.deleteMany({ where: { restaurantId: state.restaurantId } });
  await db.timeSlot.createMany({ data: [{ restaurantId: state.restaurantId, diaSemana: 0, horaApertura: '10:00', horaCierre: '18:00', abierto: true, servicios: ['RESTAURANTE', 'PESCA'] }, { restaurantId: state.restaurantId, diaSemana: 1, horaApertura: '10:00', horaCierre: '18:00', abierto: true, servicios: ['RESTAURANTE'] }] });
  await db.calendarDay.upsert({ where: { restaurantId_fecha: { restaurantId: state.restaurantId, fecha: new Date('2026-10-24') } }, update: {}, create: { restaurantId: state.restaurantId, fecha: new Date('2026-10-24'), abierto: true, horaApertura: '08:00', horaCierre: '16:00', servicios: ['PESCA', 'MOTOS'], motivo: 'Jornada informativa de pesca y motos; cocina cerrada.' } });
  execFileSync(process.execPath, [fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)), fileURLToPath(new URL('../prisma/importar-carta.ts', import.meta.url)), '--apply'], { env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), CATALOG_RESTAURANT_ID: state.restaurantId }, stdio: 'ignore' });
  const login = async (role: 'ADMIN' | 'COMENSAL') => {
    const result = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: state.users[role].correo, password: state.password }) });
    assert.equal(result.status, 200); return (await result.json()).accessToken as string;
  };
  const adminToken = await login('ADMIN'), dinerToken = await login('COMENSAL');
  assert.equal((await call('/health', 200)).database, 'connected');
  await call('/admin/administradores', 401);
  await call('/admin/administradores', 403, dinerToken);
  assert.equal((await call('/admin/administradores', 200, adminToken)).activos, 3);
  await call('/admin/administradores', 409, adminToken, { correo: 'qa-admin-2@example.test', administrador: false });
  await call('/admin/administradores', 400, adminToken, { correo: 'invalido', administrador: true });
  await call('/admin/administradores', 404, adminToken, { correo: 'no-existe@example.test', administrador: true });
  const menu = await call(`/menu/platos?restauranteId=${state.restaurantId}&fecha=2026-10-26&tamanoPagina=100`, 200);
  assert.equal(menu.paginacion.total, 44);
  assert(menu.data.every((dish: { fotos: unknown[] }) => dish.fotos.length === 0));
  const range = await call(`/calendario/rango?restauranteId=${state.restaurantId}&desde=2026-10-24&hasta=2026-10-26`, 200);
  assert.deepEqual(range.dias[0].servicios, ['PESCA', 'MOTOS']);
  const slots = await call('/reservas/franjas?fecha=2026-10-24&numComensales=2', 200, dinerToken);
  assert.equal(slots.franjas.length, 0);
  assert((await call('/reservas/franjas?fecha=2026-10-26&numComensales=2', 200, dinerToken)).franjas.length > 0);
  console.log('QA Docker: 44 productos sin fotos; calendario mixto; lunes para dos; pesca sin mesas; ADMIN 401/403/200, mínimo 409, correo 400/404: PASS');
} finally { await db.$disconnect(); }
