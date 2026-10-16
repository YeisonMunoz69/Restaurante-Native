import { describe, expect, it } from 'vitest';
import { isolatedMenuUrl } from './menu-postgres.fixture.js';

describe('Destino aislado de las pruebas EC-25', () => {
  // Rechazo destinos ambiguos antes de construir Prisma o ejecutar migraciones.
  it.each([
    'postgresql://encanto_test:test@database.supabase.co:6543/encanto_ec25_test',
    'postgresql://encanto_test:test@127.0.0.1:5432/encanto_ec25_test',
    'postgresql://encanto_test:test@127.0.0.1:55432/restaurante',
    'postgresql://postgres:test@127.0.0.1:55432/encanto_ec25_test',
    'postgresql://encanto_test:test@127.0.0.1:55432/encanto_ec25_test?host=remote.example',
    'postgresql://encanto_test:test@localhost:55432/encanto_ec25_test',
  ])('rechaza %s', (url) => {
    expect(() => isolatedMenuUrl(url)).toThrow('PostgreSQL aislado');
  });
  it('acepta el contenedor dedicado con puerto local explícito', () => {
    expect(
      isolatedMenuUrl(
        'postgresql://encanto_test:local@127.0.0.1:55432/encanto_ec25_test',
      ).hostname,
    ).toBe('127.0.0.1');
  });
});
