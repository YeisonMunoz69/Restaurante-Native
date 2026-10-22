// Calculo las fiestas nacionales de la Ley 51/1983 en fechas civiles, sin red ni zona local.
export function colombiaHolidays(year: number): Set<string> {
  const key = (month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const result = new Set([[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]].map(([m, d]) => key(m, d)));
  const monday = (date: Date) => {
    date.setUTCDate(date.getUTCDate() + (8 - date.getUTCDay()) % 7);
    return date.toISOString().slice(0, 10);
  };
  for (const [m, d] of [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]]) {
    result.add(monday(new Date(`${key(m, d)}T00:00:00Z`)));
  }
  // La Ley 2578/2026 añadió el 9 de julio, trasladable al lunes (MinTIC, circular 23/2026).
  if (year >= 2026) result.add(monday(new Date(`${key(7, 9)}T00:00:00Z`)));
  // Uso el cómputo gregoriano de Pascua; Jueves/Viernes Santos no se trasladan.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  const easter = new Date(`${key(month, day)}T00:00:00Z`);
  for (const offset of [-3, -2, 43, 64, 71]) {
    const date = new Date(easter);
    date.setUTCDate(date.getUTCDate() + offset);
    result.add(date.toISOString().slice(0, 10));
  }
  return result;
}

const cache = new Map<number, Set<string>>();
// Acoto la caché para consultas públicas de años distintos.
export function isColombianHoliday(fecha: string) {
  const year = Number(fecha.slice(0, 4));
  if (!cache.has(year)) {
    if (cache.size >= 8) cache.clear();
    cache.set(year, colombiaHolidays(year));
  }
  return cache.get(year)!.has(fecha);
}
