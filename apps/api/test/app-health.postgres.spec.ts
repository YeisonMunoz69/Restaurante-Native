import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppService } from '../src/app.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const url = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
describe.skipIf(!url)(
  'Readiness del esquema de menú en PostgreSQL aislado',
  () => {
    let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
    let service: AppService;

    beforeAll(async () => {
      fixture = await createMenuPostgresFixture(url!);
      service = new AppService(fixture.client as PrismaService);
    }, 60000);

    afterAll(async () => {
      await fixture?.close();
    });

    it('acepta una base migrada aunque todavía no tenga platos', async () => {
      await expect(service.checkHealth()).resolves.toEqual({
        status: 'ok',
        database: 'connected',
      });
    });

    it('rechaza el esquema anterior aunque SELECT 1 funcione y se recupera al restaurarlo', async () => {
      // Solo altero el esquema aleatorio creado por el fixture local validado.
      await fixture.client
        .$executeRaw`ALTER TABLE "platos" RENAME COLUMN "activo" TO "activo_pendiente"`;
      try {
        await expect(fixture.client.$queryRaw`SELECT 1`).resolves.toHaveLength(
          1,
        );
        await expect(service.checkHealth()).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
        try {
          await service.checkHealth();
        } catch (error) {
          expect((error as Error).message).toBe('Database unavailable');
        }
      } finally {
        await fixture.client
          .$executeRaw`ALTER TABLE "platos" RENAME COLUMN "activo_pendiente" TO "activo"`;
      }
      await expect(service.checkHealth()).resolves.toMatchObject({
        status: 'ok',
      });
    });
  },
);
