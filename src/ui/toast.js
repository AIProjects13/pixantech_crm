import { html, setHTML } from './html.js';
import { icon } from './icons.js';

export function toast(msg, type = 'info') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  setHTML(el, html`${icon(type === 'error' ? 'alert' : type === 'ok' ? 'check' : 'bell', 16)}<div>${msg}</div>`);
  wrap.appendChild(el);
  if (type === 'error') { const a = document.getElementById('toastsAlert'); if (a) a.textContent = String(msg); }
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 6500 : 3500);
}
