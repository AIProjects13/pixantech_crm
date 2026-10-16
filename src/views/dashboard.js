import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { money, num, pct, fmtDate } from '../ui/format.js';
import { donut, bars } from '../ui/chart.js';
import { dashboardData } from '../lib/dashboard-data.js';
import { cobroChip } from './common.js';

const delta = (a, b) => {
  if (!b) return a ? html`<span class="kpi-delta up">▲ nuevo</span>` : '';
  const p = (a - b) / b;
  return html`<span class="kpi-delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(p * 100))}%</span>`;
};

const kpi = (ico, label, value, foot, href) => html`<a class="card kpi" href="${href}" style="text-decoration:none;color:inherit">
  <div class="kpi-head"><span>${label}</span><span class="kpi-ico">${icon(ico)}</span></div>
  <div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></a>`;

export default {
  render(ctx) {
    const s = ctx.store.get();
    const m = s.config.moneda;
    const d = dashboardData(s);
    const k = d.kpis;
    const isAdmin = s.user.isAdmin;
    const maxF = Math.max(1, ...d.funnel.map((x) => x.n));
    const totalCli = d.cobros.reduce((t, x) => t + x.value, 0);
    return html`
      <section class="grid grid-kpi" aria-label="Indicadores">
        ${kpi('pipeline', 'En pipeline', num(k.activos), html`+${num(k.nuevos30)} nuevos en 30 días`, '#/pipeline')}
        ${kpi('check', 'Ganados este mes', num(k.ganadosMes), html`${delta(k.ganadosMes, k.ganadosMesPrev)} vs. mes anterior`, '#/cartera')}
        ${kpi('dollar', 'Cobrado este mes', money(k.cobradoMes, m), html`${delta(k.cobradoMes, k.cobradoMesPrev)} vs. mes anterior`, isAdmin ? '#/cobros' : '#/cartera')}
        ${kpi('receipt', 'Por cobrar', money(k.porCobrar, m), k.morosos ? html`<span class="kpi-delta down">${k.morosos} moroso${k.morosos > 1 ? 's' : ''}</span>` : 'Sin morosos', isAdmin ? '#/cobros' : '#/cartera')}
        ${kpi('coins', isAdmin ? 'Comisiones por pagar' : 'Mis comisiones (saldo)', money(k.comisionSaldo, m), 'Tasa de cierre ' + pct(k.tasaCierre), '#/comisiones')}
      </section>
      <section class="grid grid-3" style="margin-top:16px">
        <div class="card span-2"><div class="card-title">${icon('upload', 16)} Clientes ganados por mes</div>
          ${bars(d.ventasMes.values, d.ventasMes.labels, { height: 150 })}</div>
        <div class="card"><div class="card-title">${icon('wallet', 16)} Estado de cobro</div>
          <div class="row" style="gap:18px;align-items:center">
            ${donut(d.cobros, { size: 132, center: html`<div><div class="kpi-value" style="font-size:22px">${totalCli}</div><div class="muted" style="font-size:11px">clientes</div></div>` })}
            <div class="stack" style="gap:6px;flex:1;min-width:120px">${d.cobros.filter((x) => x.value).map((x) => html`
              <div class="row" style="gap:8px"><span class="dot" style="background:${x.color}"></span><span style="flex:1">${x.label}</span><strong>${x.value}</strong></div>`)}</div>
          </div></div>
      </section>
      <section class="grid grid-3" style="margin-top:16px">
        <div class="card"><div class="card-title">${icon('filter', 16)} Embudo</div>
          <div class="stack" style="gap:8px">${d.funnel.map((f) => html`<div class="row" style="gap:10px;flex-wrap:nowrap">
            <span style="width:120px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.estado}</span>
            <span style="flex:1;height:8px;border-radius:8px;background:var(--surface-2)"><span style="display:block;height:8px;border-radius:8px;background:var(--accent);width:${(f.n / maxF) * 100}%"></span></span>
            <strong style="width:28px;text-align:right">${f.n}</strong></div>`)}</div></div>
        <div class="card"><div class="card-title">${icon('bell', 16)} Seguimientos pendientes</div>
          ${d.seguimientos.length ? html`<div class="stack" style="gap:8px">${d.seguimientos.map((l) => html`
            <button type="button" class="row-link row" style="justify-content:space-between;width:100%" data-lead="${l.id}">
              <span>${l.nombre}</span><span class="chip ${l.fechaContacto < s.hoy ? 'chip-danger' : 'chip-warn'}">${l.fechaContacto === s.hoy ? 'Hoy' : fmtDate(l.fechaContacto)}</span></button>`)}</div>`
            : html`<div class="empty"><strong>Todo al día</strong>No hay seguimientos para hoy.</div>`}</div>
        <div class="card"><div class="card-title">${icon('calendar', 16)} Próximos cobros</div>
          ${d.proximosCobros.length ? html`<div class="stack" style="gap:8px">${d.proximosCobros.map((c) => html`
            <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${c.nombre}</span>
              <span class="row" style="gap:6px;flex-wrap:nowrap"><span class="muted">${fmtDate(c.cobro.proximoCobro.vence)}</span>${cobroChip(c.cobro.estado)}</span></div>`)}</div>`
            : html`<div class="empty"><strong>Sin cobros próximos</strong></div>`}</div>
      </section>
      ${isAdmin && d.ranking.length ? html`<section class="card" style="margin-top:16px"><div class="card-title">${icon('users', 16)} Ranking de vendedores (ingreso mensual)</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Vendedor</th><th>Clientes</th><th>Ingreso mensual</th></tr></thead>
        <tbody>${d.ranking.map((r) => html`<tr><td>${r.nombre}</td><td>${r.ganados}</td><td>${money(r.monto, m)}</td></tr>`)}</tbody></table></div></section>` : ''}`;
  },
  mount(el, ctx) {
    const onClick = (e) => { const b = e.target.closest('[data-lead]'); if (b) ctx.openLead(b.dataset.lead); };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  },
};
