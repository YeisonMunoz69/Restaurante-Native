import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// Acepto solo el contenedor local dedicado; nunca uso DATABASE_URL del proyecto.
export function isolatedMenuUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== 'postgresql:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    Number(url.port) < 1024 ||
    url.port === '5432' ||
    url.pathname !== '/encanto_ec25_test' ||
    url.username !== 'encanto_test' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'EC-25 requiere PostgreSQL aislado en 127.0.0.1, puerto distinto de 5432, usuario encanto_test y base encanto_ec25_test, sin parámetros',
    );
  }
  return url;
}

// Creo un esquema único y aplico únicamente las migraciones versionadas existentes.
export async function createMenuPostgresFixture(value: string) {
  const url = isolatedMenuUrl(value);
  const schema = `ec25_${randomUUID().replaceAll('-', '')}`;
  const owner = new PrismaClient({
    datasources: { db: { url: url.toString() } },
  });
  await owner.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set('schema', schema);
  const scopedUrl = url.toString();
  const client = new PrismaClient({ datasources: { db: { url: scopedUrl } } });
  // El nombre generado y el destino validado limitan la limpieza a nuestra propia prueba.
  const close = async () => {
    await client.$disconnect();
    try {
      await owner.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await owner.$disconnect();
    }
  };
  try {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL(
            '../../../node_modules/prisma/build/index.js',
            import.meta.url,
          ),
        ),
        'migrate',
        'deploy',
        '--schema',
        fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url)),
      ],
      {
        env: { ...process.env, DATABASE_URL: scopedUrl, DIRECT_URL: scopedUrl },
        stdio: 'pipe',
        timeout: 30000,
      },
    );
    await client.$connect();
    return { client, close, url: scopedUrl };
  } catch (error) {
    await close();
    throw error;
  }
}
