const KEY = 'pxt-theme';
const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

export function initTheme() {
  const t = read();
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
}

export function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch (e) { /* sin almacenamiento */ }
  return next;
}
