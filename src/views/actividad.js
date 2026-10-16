import { html, setHTML, attrs } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { fmtDate } from '../ui/format.js';
import { toast } from '../ui/toast.js';
import { emptyState } from './common.js';

const F = { usuario: '', accion: '', desde: '', hasta: '' };
const ACCIONES = [['', 'Todas'], ['leads.', 'Prospectos'], ['clientes.', 'Clientes'], ['pagos.', 'Pagos'], ['comisiones.', 'Comisiones'], ['users.', 'Usuarios'], ['plantillas.', 'Plantillas'], ['config.', 'Ajustes'], ['auth.', 'Acceso']];
let items = [];
let offset = 0;
let more = false;
let seq = 0;
let pending = false;

const fila = (a) => html`<tr>
  <td data-label="Fecha" class="muted" style="white-space:nowrap">${fmtDate(a.fecha, true)}</td>
  <td data-label="Usuario">${a.usuario}</td>
  <td data-label="Acción"><code>${a.accion}</code></td>
  <td data-label="Resultado"><span class="chip ${a.resultado === 'OK' ? 'chip-ok' : a.resultado === 'DENEGADO' ? 'chip-danger' : 'chip-warn'}">${a.resultado}</span></td>
  <td data-label="Detalle" style="max-width:420px;word-break:break-word;font-size:12px" class="muted">${a.entidad ? a.entidad + ' ' + a.idEntidad + ' · ' : ''}${a.detalle}</td></tr>`;

async function load(el, ctx, reset) {
  if (!reset && pending) return;
  if (reset) { items = []; offset = 0; }
  const my = ++seq;
  pending = true;
  const btn = el.querySelector('[data-act="more"]');
  if (btn) btn.disabled = true;
  try {
    const r = await ctx.api.call('activity.list', Object.assign({}, F, { offset }));
    if (my !== seq) return;
    pending = false;
    items = items.concat(r.items);
    offset += r.items.length;
    more = r.hasMore;
    const box = el.querySelector('#actBody');
    if (box) setHTML(box, items.length ? html`<div class="table-wrap"><table class="table cards"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Resultado</th><th>Detalle</th></tr></thead>
      <tbody>${items.map(fila)}</tbody></table></div>${more ? html`<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn btn-ghost" data-act="more">Cargar más</button></div>` : ''}`
      : emptyState('Sin actividad', 'Ajusta los filtros.'));
  } catch (e) {
    if (my !== seq) return;
    pending = false;
    if (btn) btn.disabled = false;
    toast(e.message, 'error');
  }
}

export default {
  render(ctx) {
    const s = ctx.store.get();
    return html`<div class="toolbar">
      ${s.user.isAdmin ? html`<label class="field"><span class="label">Usuario</span><select class="input" data-f="usuario"><option value="">Todos</option>
        ${s.usuarios.map((u) => html`<option value="${u.email}"${attrs({ selected: F.usuario === u.email })}>${u.nombre}</option>`)}</select></label>` : ''}
      <label class="field"><span class="label">Acción</span><select class="input" data-f="accion">${ACCIONES.map(([v, l]) => html`<option value="${v}"${attrs({ selected: F.accion === v })}>${l}</option>`)}</select></label>
      <label class="field"><span class="label">Desde</span><input class="input" type="date" data-f="desde" value="${F.desde}"></label>
      <label class="field"><span class="label">Hasta</span><input class="input" type="date" data-f="hasta" value="${F.hasta}"></label>
      ${s.user.isAdmin ? '' : html`<p class="muted" style="align-self:end">${icon('eye', 14)} Ves solo tus acciones.</p>`}
    </div><div id="actBody"><div class="skeleton" style="height:200px"></div></div>`;
  },
  mount(el, ctx) {
    const onChange = (e) => { const t = e.target.closest('[data-f]'); if (t) { F[t.dataset.f] = t.value; load(el, ctx, true); } };
    const onClick = (e) => { if (e.target.closest('[data-act="more"]')) load(el, ctx, false); };
    el.addEventListener('change', onChange);
    el.addEventListener('click', onClick);
    load(el, ctx, true);
    return () => { el.removeEventListener('change', onChange); el.removeEventListener('click', onClick); };
  },
};
