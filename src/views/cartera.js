import { html, setHTML } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { money, fmtDate } from '../ui/format.js';
import { createTable } from '../ui/table.js';
import { cobroChip, quickActions, emptyState } from './common.js';
import { editClienteModal, pagoModal, bajaModal, reactivar, historialPagosModal } from './cliente-modals.js';

let table = null;
const ESTADOS = ['Moroso', 'Pendiente', 'Por vencer', 'Al día', 'Sin configurar', 'Baja'];

function def(ctx) {
  const s = () => ctx.store.get();
  const m = () => s().config.moneda;
  const admin = s().user.isAdmin;
  return {
    name: 'cartera', placeholder: 'Buscar cliente, contacto o email…', initSort: { k: 'prox', dir: 1 },
    cols: [
      { k: 'nombre', label: 'Cliente', sort: (c) => c.nombre },
      { k: 'plan', label: 'Plan', sort: (c) => c.plan },
      { k: 'monto', label: 'Monto', sort: (c) => Number(c.monto || 0) },
      { k: 'prox', label: 'Próximo cobro', sort: (c) => (c.cobro.proximoCobro ? c.cobro.proximoCobro.vence : '') },
      { k: 'estado', label: 'Estado', sort: (c) => ESTADOS.indexOf(c.cobro.estado) },
      { k: 'ultimo', label: 'Último pago', sort: (c) => (c.cobro.ultimoPago ? c.cobro.ultimoPago.fecha : '') },
      { k: 'vendedor', label: 'Vendedor', sort: (c) => c.vendedorNombre },
      { k: 'acc', label: '' },
    ],
    filters: [{ k: 'estado', label: 'Estado', get: (c) => c.cobro.estado }, { k: 'plan', label: 'Plan', get: (c) => c.plan }, { k: 'vendedor', label: 'Vendedor', get: (c) => c.vendedorNombre }],
    rows: () => s().clientes,
    search: (c) => [c.nombre, c.contacto, c.email, c.telefono, c.rubro].join(' '),
    empty: emptyState('Sin clientes', 'Los prospectos que pasan a "Ganado" aparecen aquí.'),
    row: (c) => html`<tr>
      <td data-label="Cliente"><button type="button" class="row-link" data-act="hist" data-id="${c.idLead}">${c.nombre}</button><div class="muted" style="font-size:12px">${c.contacto || c.email || ''}</div></td>
      <td data-label="Plan">${c.plan}</td>
      <td data-label="Monto">${money(c.monto, m())}${c.cobro.montoAdeudado ? html`<div style="font-size:12px;color:var(--danger)">Debe ${money(c.cobro.montoAdeudado, m())}</div>` : ''}</td>
      <td data-label="Próximo cobro">${c.cobro.proximoCobro ? html`${fmtDate(c.cobro.proximoCobro.vence)} <span class="muted">(${c.cobro.proximoCobro.periodo})</span>` : '—'}</td>
      <td data-label="Estado">${cobroChip(c.cobro.estado)}</td>
      <td data-label="Último pago" class="muted">${c.cobro.ultimoPago ? fmtDate(c.cobro.ultimoPago.fecha) + ' · ' + money(c.cobro.ultimoPago.monto, m()) : '—'}</td>
      <td data-label="Vendedor">${c.vendedorNombre || '—'}</td>
      <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">${quickActions(c)}
        ${admin ? html`
          ${c.estado !== 'Baja' ? html`<button type="button" class="btn btn-primary btn-sm" data-act="pago" data-id="${c.idLead}">${icon('dollar', 14)} Pago</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="edit" data-id="${c.idLead}" aria-label="Editar plan de ${c.nombre}" title="Editar plan">${icon('settings', 14)}</button>
          ${c.estado === 'Baja'
            ? html`<button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="reactivar" data-id="${c.idLead}" aria-label="Reactivar ${c.nombre}" title="Reactivar">${icon('undo', 14)}</button>`
            : html`<button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="baja" data-id="${c.idLead}" aria-label="Dar de baja a ${c.nombre}" title="Dar de baja">${icon('ban', 14)}</button>`}` : ''}
      </div></td></tr>`,
  };
}

function kpis(ctx) {
  const s = ctx.store.get();
  const m = s.config.moneda;
  const C = s.clientes;
  const sum = (f) => C.filter(f).reduce((t, c) => t + Number(c.cobro.montoAdeudado || 0), 0);
  const mini = (estado, extra) => html`<button type="button" class="card kpi" data-filter="${estado}" style="text-align:left;cursor:pointer">
    <span class="kpi-head"><span>${estado}</span><span class="chip">${C.filter((c) => c.cobro.estado === estado).length}</span></span>
    <span class="kpi-foot">${extra}</span></button>`;
  return html`${mini('Moroso', money(sum((c) => c.cobro.estado === 'Moroso'), m) + ' adeudado')}
    ${mini('Pendiente', money(sum((c) => c.cobro.estado === 'Pendiente'), m) + ' adeudado')}
    ${mini('Por vencer', 'próximos ' + s.config.diasAviso + ' días')}
    ${mini('Al día', C.filter((c) => c.estado !== 'Baja').length + ' clientes activos')}`;
}

export default {
  render(ctx) {
    return html`<section class="grid grid-kpi" id="carteraKpis" style="margin-bottom:16px">${kpis(ctx)}</section><div id="carteraTable"></div>`;
  },
  mount(el, ctx) {
    table = createTable('cartera', def(ctx));
    table.mount(el.querySelector('#carteraTable'));
    const find = (id) => ctx.store.get().clientes.find((c) => c.idLead === id);
    const onClick = (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) {
        table.state.f.estado = table.state.f.estado === f.dataset.filter ? '' : f.dataset.filter;
        const sel = el.querySelector('[data-tf="estado"]');
        if (sel) sel.value = table.state.f.estado;
        table.refresh();
        return;
      }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const c = find(a.dataset.id);
      if (!c) return;
      if (a.dataset.act === 'pago') pagoModal(c, ctx);
      if (a.dataset.act === 'edit') editClienteModal(c, ctx);
      if (a.dataset.act === 'baja') bajaModal(c, ctx);
      if (a.dataset.act === 'reactivar') reactivar(c, ctx);
      if (a.dataset.act === 'hist') historialPagosModal(c, ctx);
    };
    el.addEventListener('click', onClick);
    return () => { el.removeEventListener('click', onClick); table = null; };
  },
  refresh(el, ctx) {
    const k = el && el.querySelector('#carteraKpis');
    if (k && ctx) setHTML(k, kpis(ctx));
    if (table) table.refresh();
  },
};
