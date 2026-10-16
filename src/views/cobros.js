import { html, setHTML } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { money, fmtDate } from '../ui/format.js';
import { cobroChip, quickActions, emptyState } from './common.js';
import { pagoModal, historialPagosModal } from './cliente-modals.js';
import { toast } from '../ui/toast.js';

export function bucketsCobro(clientes) {
  const act = clientes.filter((c) => c.estado !== 'Baja');
  const atraso = (c) => (c.cobro.adeudados.length ? c.cobro.adeudados[0].diasAtraso : 0);
  const vencidos = act.filter((c) => c.cobro.estado === 'Moroso' || c.cobro.estado === 'Pendiente').sort((a, b) => atraso(b) - atraso(a));
  return {
    vencidos,
    porVencer: act.filter((c) => c.cobro.estado === 'Por vencer').sort((a, b) => a.cobro.proximoCobro.vence.localeCompare(b.cobro.proximoCobro.vence)),
    anuales: vencidos.filter((c) => c.plan === 'Anual'),
  };
}

const lista = (title, items, m, kind) => html`<section class="card"><div class="card-title">${title}<span class="spacer"></span><span class="chip">${items.length}</span></div>
  ${items.length ? html`<div class="stack" style="gap:10px">${items.map((c) => html`<div class="row" style="flex-wrap:nowrap">
    <div style="flex:1;min-width:0"><button type="button" class="row-link" data-act="hist" data-id="${c.idLead}">${c.nombre}</button>
      <div class="muted" style="font-size:12px">${c.plan} · ${kind === 'vencido' ? c.cobro.adeudados.map((a) => a.periodo).join(', ') + ' · ' + c.cobro.adeudados[0].diasAtraso + ' días' : 'vence ' + fmtDate(c.cobro.proximoCobro.vence)} · ${c.vendedorNombre || ''}</div></div>
    ${cobroChip(c.cobro.estado)}<strong>${money(kind === 'vencido' ? c.cobro.montoAdeudado : c.monto, m)}</strong>${quickActions(c)}
    <button type="button" class="btn btn-primary btn-sm" data-act="pago" data-id="${c.idLead}">${icon('dollar', 14)} Pago</button></div>`)}</div>`
    : emptyState('Nada por aquí')}</section>`;

const LISTS = [['vencidos', 'vencido', () => 'Vencidos'], ['porVencer', 'prox', (s) => 'Por vencer (' + s.config.diasAviso + ' días)'], ['anuales', 'vencido', () => 'Anuales pendientes de pago']];
const listHtml = (ctx, key) => {
  const s = ctx.store.get();
  const [, kind, title] = LISTS.find((l) => l[0] === key);
  return lista(title(s), bucketsCobro(s.clientes)[key], s.config.moneda, kind);
};

export default {
  render(ctx) {
    return html`<div class="grid grid-2"><div id="cobVencidos">${listHtml(ctx, 'vencidos')}</div><div id="cobPorVencer">${listHtml(ctx, 'porVencer')}</div></div>
      <div class="grid grid-2" style="margin-top:16px"><div id="cobAnuales">${listHtml(ctx, 'anuales')}</div>
        <section class="card"><div class="card-title">${icon('receipt', 16)} Pagos recientes</div><div id="recientes"><div class="skeleton" style="height:120px"></div></div></section></div>`;
  },
  refresh(el, ctx) {
    [['#cobVencidos', 'vencidos'], ['#cobPorVencer', 'porVencer'], ['#cobAnuales', 'anuales']].forEach(([sel, key]) => {
      const box = el.querySelector(sel);
      if (box) setHTML(box, listHtml(ctx, key));
    });
  },
  mount(el, ctx) {
    const m = ctx.cfg().moneda;
    ctx.api.call('pagos.list', {}).then((list) => {
      const box = el.querySelector('#recientes');
      if (box) setHTML(box, list.length ? html`<div class="stack" style="gap:8px">${list.slice(0, 12).map((p) => html`<div class="row" style="flex-wrap:nowrap">
        <span style="flex:1;min-width:0">${p.cliente} <span class="muted">· ${p.periodo}</span></span><span class="muted">${fmtDate(p.fechaPago)}</span>
        <strong>${money(p.monto, m)}</strong>${p.estado === 'Anulado' ? html`<span class="chip chip-muted">Anulado</span>` : ''}</div>`)}</div>` : emptyState('Sin pagos registrados'));
    }).catch((e) => toast(e.message, 'error'));
    const onClick = (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const c = ctx.store.get().clientes.find((x) => x.idLead === a.dataset.id);
      if (!c) return;
      if (a.dataset.act === 'pago') pagoModal(c, ctx);
      if (a.dataset.act === 'hist') historialPagosModal(c, ctx);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  },
};
