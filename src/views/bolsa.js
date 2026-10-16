import { html, attrs, safeHref } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { fmtDate } from '../ui/format.js';
import { createTable } from '../ui/table.js';
import { toast } from '../ui/toast.js';
import { upsert, removeFrom } from '../state.js';
import { emptyState } from './common.js';
import { newLeadModal } from './lead-form.js';

let table = null;
let countEl = null;
const updateCount = (ctx) => { if (countEl) countEl.textContent = ctx.store.get().bolsa.length + ' prospectos libres. Al tomar uno, desaparece para los demás.'; };

function def(ctx) {
  const s = () => ctx.store.get();
  return {
    name: 'bolsa', placeholder: 'Buscar empresa, rubro o región…', initSort: { k: 'fechaCreacion', dir: -1 },
    cols: [
      { k: 'nombre', label: 'Empresa', sort: (l) => l.nombre },
      { k: 'rubro', label: 'Rubro', sort: (l) => l.rubro },
      { k: 'region', label: 'Región', sort: (l) => [l.region, l.pais].filter(Boolean).join(', ') },
      { k: 'fechaCreacion', label: 'Ingresó', sort: (l) => l.fechaCreacion, w: '130px' },
      { k: 'acc', label: '', w: '240px' },
    ],
    filters: [{ k: 'rubro', label: 'Rubro', get: (l) => l.rubro }, { k: 'region', label: 'Región', get: (l) => l.region }],
    rows: () => s().bolsa,
    search: (l) => [l.nombre, l.rubro, l.region, l.pais, l.web].join(' '),
    empty: emptyState('La bolsa está vacía', s().user.isAdmin ? 'Importa un CSV o crea prospectos sin responsable.' : 'Cuando el administrador cargue prospectos aparecerán aquí.'),
    row: (l) => html`<tr>
      <td data-label="Empresa"><strong>${l.nombre}</strong>${l.web ? html`<div><a href="${safeHref(l.web)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">${String(l.web).replace(/^https?:\/\//, '')}</a></div>` : ''}</td>
      <td data-label="Rubro">${l.rubro || '—'}</td>
      <td data-label="Región">${[l.region, l.pais].filter(Boolean).join(', ') || '—'}</td>
      <td data-label="Ingresó" class="muted">${fmtDate(l.fechaCreacion)}</td>
      <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
        ${s().user.isAdmin ? html`<label class="sr-only" for="as_${l.id}">Asignar ${l.nombre}</label>
          <select class="input" style="width:auto;height:32px" id="as_${l.id}" data-act="assign" data-id="${l.id}"><option value="">Asignar a…</option>
          ${s().usuarios.map((u) => html`<option value="${u.email}">${u.nombre}</option>`)}</select>` : ''}
        <button type="button" class="btn btn-primary btn-sm" data-act="take" data-id="${l.id}">${icon('hand', 14)} Tomar</button></div></td></tr>`,
  };
}

async function take(id, ctx, btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await ctx.api.call('leads.take', { id });
    removeFrom('bolsa', id);
    upsert('leads', Object.assign({}, r, { bitacora: undefined }));
    toast('Lo tomaste: ahora es tuyo', 'ok');
    if (table) table.refresh();
    updateCount(ctx);
    if (ctx.openLead) ctx.openLead(id);
  } catch (e) {
    toast(e.message, 'error');
    if (e.code === 'CONFLICT' || e.code === 'NOT_FOUND') { removeFrom('bolsa', id); if (table) table.refresh(); updateCount(ctx); }
    else if (btn) btn.disabled = false;
  }
}

export default {
  render(ctx) {
    const s = ctx.store.get();
    return html`<div class="row" style="margin-bottom:14px"><p id="bolsaCount" class="muted" style="flex:1">${s.bolsa.length} prospectos libres. Al tomar uno, desaparece para los demás.</p>
      ${s.user.isAdmin ? html`<button type="button" class="btn btn-primary" data-act="newLead">${icon('plus', 16)} Nuevo prospecto</button>` : ''}</div><div id="bolsaTable"></div>`;
  },
  mount(el, ctx) {
    countEl = el.querySelector('#bolsaCount');
    table = createTable('bolsa', def(ctx));
    table.mount(el.querySelector('#bolsaTable'));
    const onClick = (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'take') take(a.dataset.id, ctx, a);
      if (a.dataset.act === 'newLead') newLeadModal(ctx);
    };
    const onChange = async (e) => {
      const t = e.target.closest('[data-act="assign"]');
      if (!t || !t.value) return;
      try {
        const r = await ctx.api.call('leads.assign', { id: t.dataset.id, asignadoA: t.value });
        removeFrom('bolsa', r.id); upsert('leads', r);
        toast('Asignado a ' + r.asignadoA, 'ok');
        table.refresh();
        updateCount(ctx);
      } catch (x) { toast(x.message, 'error'); t.value = ''; }
    };
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('change', onChange); table = null; countEl = null; };
  },
  refresh(el, ctx) { if (table) table.refresh(); if (ctx) updateCount(ctx); },
};
