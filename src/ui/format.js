const LOCALE = 'es-GT';

export const money = (n, moneda = 'Q') =>
  moneda + ' ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n) => Number(n || 0).toLocaleString('en-US');
export const pct = (x) => Math.round(Number(x || 0) * 100) + '%';

export function fmtDate(v, withTime) {
  if (!v) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v);
  if (isNaN(d)) return '';
  const o = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(LOCALE, o);
}

export function relTime(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'hace un momento';
  if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
  if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
  if (s < 86400 * 30) return 'hace ' + Math.floor(s / 86400) + ' d';
  return fmtDate(iso);
}

export const initials = (s) =>
  String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
