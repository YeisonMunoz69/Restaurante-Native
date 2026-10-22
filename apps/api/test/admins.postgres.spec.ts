import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { AdminsService } from '../src/admins/admins.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)('Administradores en PostgreSQL aislado', () => {
  let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
  let service: AdminsService;
  const ids = Array.from({ length: 5 }, () => randomUUID());
  beforeAll(async () => {
    fixture = await createMenuPostgresFixture(url!);
    service = new AdminsService(fixture.client as unknown as PrismaService);
    await fixture.client.user.createMany({ data: ids.map((id, i) => ({ id, nombre: `QA ${i}`, correo: `${id}@example.test`, telefono: '', passwordHash: 'sin-login', rol: i < 4 ? 'ADMIN' : 'COMENSAL' })) });
  });
  afterAll(async () => fixture?.close());
  it('serializa dos retiros concurrentes, conserva tres y audita solo el retiro permitido', async () => {
    const result = await Promise.allSettled([service.change(ids[0], `${ids[1]}@example.test`, false), service.change(ids[0], `${ids[2]}@example.test`, false)]);
    expect(result.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter(row => row.status === 'rejected')).toHaveLength(1);
    expect(await fixture.client.user.count({ where: { rol: 'ADMIN', activo: true } })).toBe(3);
    expect(await fixture.client.auditLog.count()).toBe(1);
  });
  it('bloquea desactivación y borrado directos al alcanzar tres, y permite añadir antes de retirar', async () => {
    await expect(fixture.client.user.update({ where: { id: ids[0] }, data: { activo: false } })).rejects.toThrow();
    await expect(fixture.client.user.delete({ where: { id: ids[3] } })).rejects.toThrow();
    await service.change(ids[0], `${ids[4]}@example.test`, true);
    expect((await service.list(ids[0])).activos).toBe(4);
    await service.change(ids[0], `${ids[3]}@example.test`, false);
    expect((await service.list(ids[0])).activos).toBe(3);
    await expect(service.list(ids[3])).rejects.toThrow('administrador activo');
  });
});
