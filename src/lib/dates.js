export const CERRADOS = ['Ganado', 'Perdido'];
export const isDue = (l, hoy) => !!l.fechaContacto && l.fechaContacto <= hoy && !CERRADOS.includes(l.estado);
export const monthKey = (ymd) => String(ymd || '').slice(0, 7);
export const yearOf = (ymd) => String(ymd || '').slice(0, 4);
export function addMonthsKey(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
