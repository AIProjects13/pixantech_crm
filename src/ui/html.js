// Plantillas HTML con escape automático. Todo valor interpolado se escapa salvo que sea Safe.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/[&<>"'`]/g, (c) => MAP[c]);

export class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Safe(String(s === null || s === undefined ? '' : s));

const render = (v) => {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
};

export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += render(vals[i]) + strings[i + 1];
  return new Safe(out);
}

export function setHTML(el, safe) {
  if (!(safe instanceof Safe)) throw new TypeError('setHTML requiere un valor creado con html``');
  el.innerHTML = safe.s;
}

export function safeHref(u) {
  const s = String(u || '').trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : '#';
}

export function attrs(obj) {
  let out = '';
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === true) out += ' ' + k;
    else if (v !== false && v !== null && v !== undefined) out += ' ' + k + '="' + esc(v) + '"';
  });
  return new Safe(out);
}
