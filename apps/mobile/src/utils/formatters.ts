// Centralizo los formatos compartidos para que todas las pantallas usen COP sin decimales.
export function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// Interpreto YYYY-MM-DD como fecha civil para que la zona horaria no cambie el día.
export function formatCivilDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC', ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatDateDdMmYyyy(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
const TIME_ZONE = 'America/Bogota';


export function todayInBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '01';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
