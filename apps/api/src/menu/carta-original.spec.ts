import { describe, expect, it } from 'vitest';
import { cartaOriginal, cartaSlug, platosHabituales } from '../../prisma/carta-original.js';

describe('Carta original transcrita', () => {
  it('conserva categorías, precios COP y las ocho referencias habituales sin hacerlas inmutables', () => {
    const rows = cartaOriginal.flatMap(category => [...category.platos]);
    expect(cartaOriginal).toHaveLength(9);
    expect(rows).toHaveLength(44);
    expect(new Set(rows.map(row => cartaSlug('sede', row[0]))).size).toBe(rows.length);
    expect(rows.every(row => row[1] > 0 && Number.isInteger(row[1]) && row[2].length > 0)).toBe(true);
    expect([...platosHabituales].every(name => rows.some(row => row[0] === name))).toBe(true);
    expect(rows.find(row => row[0] === 'Empanada')?.[1]).toBe(1000);
    expect(rows.find(row => row[0] === 'Porción de Empanadas')?.[1]).toBe(6000);
    expect(cartaSlug('sede', 'Porción de Arroz')).toBe('sede-porcion-de-arroz');
  });
});
