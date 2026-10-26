import { formatCivilDate, formatCop, formatDateDdMmYyyy } from './formatters';

it('conserva la fecha civil al formatear y permite chips cortos sin año ni mes añadidos', () => {
  expect(formatDateDdMmYyyy('2028-02-29')).toBe('29/02/2028');
  expect(formatCivilDate('2028-02-29')).toContain('2028');
  const chip = formatCivilDate('2028-02-29', { weekday: 'short', day: 'numeric' });
  expect(chip).toContain('29');
  expect(chip).not.toContain('2028');
  expect(chip).not.toContain('febrero');
});

it('presenta COP sin decimales sin convertir el valor persistido', () => {
  expect(formatCop(38000.5).replace(/\s/g, '')).toBe('$38.001');
});
