import { html, setHTML } from './html.js';
import { trapFocus } from './focus-trap.js';

let seq = 0;
const stack = [];

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) { e.stopPropagation(); stack[stack.length - 1].close(undefined); }
}, true);

export function openModal({ title, body, actions, wide }) {
  const id = 'mt' + (++seq);
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  setHTML(wrap, html`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
    <h2 id="${id}">${title}</h2>${body}${actions ? html`<div class="modal-actions">${actions}</div>` : ''}</div>`);
  (document.getElementById('modalRoot') || document.body).appendChild(wrap);
  const release = trapFocus(wrap);
  let resolve;
  const result = new Promise((r) => { resolve = r; });
  const m = {
    el: wrap,
    result,
    close(value) {
      const i = stack.indexOf(m);
      if (i < 0) return;
      stack.splice(i, 1);
      wrap.remove();
      release();
      resolve(value);
    },
  };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) m.close(undefined); });
  stack.push(m);
  return m;
}

export function confirmDialog(title, text, { ok = 'Confirmar', danger = false } = {}) {
  const m = openModal({
    title,
    body: html`<p class="muted">${text}</p>`,
    actions: html`<button type="button" class="btn btn-ghost" data-r="0">Cancelar</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1" autofocus>${ok}</button>`,
  });
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) m.close(b.dataset.r === '1'); });
  return m.result.then((v) => v === true);
}

export function promptDialog(title, label, { value = '', required = false, multiline = false, placeholder = '' } = {}) {
  return formModal({
    title,
    submitLabel: 'Aceptar',
    body: html`<label class="field"><span class="label">${label}</span>${multiline
      ? html`<textarea class="input" name="v" rows="3" placeholder="${placeholder}" ${required ? 'required' : ''}>${value}</textarea>`
      : html`<input class="input" name="v" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>`}</label>`,
    onSubmit: async (fd) => String(fd.get('v') || '').trim(),
  });
}

/** Formulario en modal: onSubmit puede lanzar; el mensaje se muestra dentro y el modal sigue abierto. */
export function formModal({ title, body, submitLabel = 'Guardar', wide = false, onSubmit }) {
  const m = openModal({
    title, wide,
    body: html`<form novalidate class="stack">${body}<div class="muted" role="alert" hidden></div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>
      <button type="submit" class="btn btn-primary">${submitLabel}</button></div></form>`,
  });
  const form = m.el.querySelector('form');
  const alertEl = form.querySelector('[role="alert"]');
  const submit = form.querySelector('[type="submit"]');
  m.el.querySelector('[data-cancel]').addEventListener('click', () => m.close(null));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    submit.disabled = true;
    alertEl.hidden = true;
    try {
      const v = await onSubmit(new FormData(form), m);
      m.close(v === undefined ? true : v);
    } catch (err) {
      alertEl.textContent = err && err.message ? err.message : 'No se pudo guardar.';
      alertEl.style.color = 'var(--danger)';
      alertEl.hidden = false;
      submit.disabled = false;
    }
  });
  return m.result.then((v) => (v === undefined ? null : v));
}
