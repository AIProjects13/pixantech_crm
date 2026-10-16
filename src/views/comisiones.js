import { html, setHTML } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { money, fmtDate } from '../ui/format.js';
import { formModal, promptDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { emptyState } from './common.js';

let data = null;

function body(ctx) {
  const s = ctx.store.get();
  const m = s.config.moneda;
  const admin = s.user.isAdmin;
  if (!data) return html`<div class="skeleton" style="height:180px"></div>`;
  const tot = data.resumen.reduce((t, r) => ({ g: t.g + r.generado, p: t.p + r.pagado, s: t.s + r.saldo }), { g: 0, p: 0, s: 0 });
  const k = (label, v, ico) => html`<div class="card kpi"><div class="kpi-head"><span>${label}</span><span class="kpi-ico">${icon(ico)}</span></div><div class="kpi-value">${money(v, m)}</div></div>`;
  return html`<section class="grid grid-kpi">${k('Generado', tot.g, 'up')}${k('Pagado', tot.p, 'check')}${k('Saldo pendiente', tot.s, 'coins')}</section>
    ${admin ? html`<section class="card" style="margin-top:16px"><div class="card-title">${icon('users', 16)} Saldos por usuario</div>
      <div class="table-wrap"><table class="table cards"><thead><tr><th>Usuario</th><th>Generado</th><th>Pagado</th><th>Saldo</th><th></th></tr></thead>
      <tbody>${data.resumen.map((r) => html`<tr><td data-label="Usuario"><strong>${r.nombre}</strong><div class="muted" style="font-size:12px">${r.email}</div></td>
        <td data-label="Generado">${money(r.generado, m)}</td><td data-label="Pagado">${money(r.pagado, m)}</td><td data-label="Saldo"><strong>${money(r.saldo, m)}</strong></td>
        <td>${r.saldo > 0 ? html`<button type="button" class="btn btn-primary btn-sm" data-act="payout" data-email="${r.email}">${icon('dollar', 14)} Registrar pago</button>` : ''}</td></tr>`)}</tbody></table></div></section>` : ''}
    <div class="grid grid-2" style="margin-top:16px">
      <section class="card"><div class="card-title">${icon('receipt', 16)} Comisiones por pago de cliente</div>
        ${data.comisiones.length ? html`<div class="stack" style="gap:8px">${data.comisiones.slice(0, 100).map((p) => html`<div class="row" style="flex-wrap:nowrap">
          <span style="flex:1;min-width:0">${p.cliente} <span class="muted">· ${p.periodo}${admin ? ' · ' + p.vendedor : ''}</span></span><span class="muted">${fmtDate(p.fechaPago)}</span>
          <span class="muted">${p.comisionPct}% de ${money(p.monto, m)}</span><strong>${money(p.comisionMonto, m)}</strong></div>`)}</div>` : emptyState('Aún no hay comisiones', 'Se generan cuando el administrador registra pagos de tus clientes.')}</section>
      <section class="card"><div class="card-title">${icon('coins', 16)} ${admin ? 'Pagos a vendedores' : 'Pagos recibidos'}</div>
        ${data.payouts.length ? html`<div class="stack" style="gap:8px">${data.payouts.map((x) => html`<div class="row" style="flex-wrap:nowrap">
          <span style="flex:1;min-width:0">${admin ? x.usuarioNombre : x.metodo || 'Pago'} <span class="muted">${x.referencia ? '· ' + x.referencia : ''}</span></span>
          <span class="muted">${fmtDate(x.fecha)}</span><strong>${money(x.monto, m)}</strong>
          ${x.estado === 'Anulado' ? html`<span class="chip chip-muted" title="${x.motivoAnulacion}">Anulado</span>`
            : admin ? html`<button type="button" class="btn btn-ghost btn-sm" data-act="voidPayout" data-id="${x.id}">Anular</button>` : ''}</div>`)}</div>` : emptyState('Sin pagos registrados')}</section>
    </div>`;
}

async function load(el, ctx) {
  try {
    data = await ctx.api.call('comisiones.summary', {});
    const box = el.querySelector('#comBody');
    if (box) setHTML(box, body(ctx));
  } catch (e) { toast(e.message, 'error'); }
}

export default {
  render(ctx) { data = null; return html`<div id="comBody">${body(ctx)}</div>`; },
  refresh(el, ctx) { return load(el, ctx); },
  async mount(el, ctx) {
    const onClick = async (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'payout') {
        const r = data.resumen.find((x) => x.email === a.dataset.email);
        const m = ctx.cfg().moneda;
        const ok = await formModal({
          title: 'Pagar comisión a ' + r.nombre, submitLabel: 'Registrar pago',
          body: html`<p class="muted">Saldo pendiente: <strong>${money(r.saldo, m)}</strong></p><div class="form-grid">
            <label class="field"><span class="label">Monto</span><input class="input" name="monto" type="number" min="0.01" step="0.01" max="${r.saldo}" required value="${r.saldo}"></label>
            <label class="field"><span class="label">Fecha</span><input class="input" name="fecha" type="date" required value="${ctx.store.get().hoy}"></label>
            <label class="field"><span class="label">Método</span><input class="input" name="metodo" placeholder="Transferencia"></label>
            <label class="field"><span class="label">Referencia</span><input class="input" name="referencia" maxlength="100"></label>
            <label class="field full"><span class="label">Nota</span><input class="input" name="nota" maxlength="300"></label></div>`,
          onSubmit: (fd) => ctx.api.call('comisiones.payout.create', Object.assign({ usuario: r.email }, Object.fromEntries(fd.entries()))),
        });
        if (ok) { toast('Pago de comisión registrado', 'ok'); load(el, ctx); ctx.reload && ctx.reload({ silent: true }); }
      }
      if (a.dataset.act === 'voidPayout') {
        const motivo = await promptDialog('Anular pago de comisión', 'Motivo', { required: true });
        if (!motivo) return;
        try { await ctx.api.call('comisiones.payout.void', { id: a.dataset.id, motivo }); toast('Pago anulado', 'ok'); load(el, ctx); ctx.reload && ctx.reload({ silent: true }); }
        catch (x) { toast(x.message, 'error'); }
      }
    };
    el.addEventListener('click', onClick);
    await load(el, ctx);
    return () => el.removeEventListener('click', onClick);
  },
};
