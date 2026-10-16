import { html, attrs, setHTML } from '../ui/html.js';
import { formModal, promptDialog, openModal, confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { money, fmtDate } from '../ui/format.js';
import { upsert } from '../state.js';

export function periodoSugerido(c, hoy) {
  if (c.cobro && c.cobro.adeudados && c.cobro.adeudados.length) return c.cobro.adeudados[0].periodo;
  if (c.cobro && c.cobro.proximoCobro) return c.cobro.proximoCobro.periodo;
  return c.plan === 'Anual' ? hoy.slice(0, 4) : hoy.slice(0, 7);
}

const refreshCliente = (ctx, c) => { upsert('clientes', c, 'idLead'); ctx.refreshView && ctx.refreshView(); };

export async function editClienteModal(c, ctx) {
  const r = await formModal({
    title: 'Plan de ' + c.nombre, submitLabel: 'Guardar',
    body: html`<div class="form-grid">
      <label class="field"><span class="label">Plan</span><select class="input" name="plan">${['Mensual', 'Anual'].map((p) => html`<option${attrs({ selected: p === c.plan })}>${p}</option>`)}</select></label>
      <label class="field"><span class="label">Monto por período (${ctx.cfg().moneda})</span><input class="input" name="monto" type="number" min="0" step="0.01" required value="${c.monto}"></label>
      <label class="field"><span class="label">Fecha de inicio</span><input class="input" name="fechaInicio" type="date" required value="${c.fechaInicio}"></label>
      <label class="field"><span class="label">Día de cobro (mensual)</span><input class="input" name="diaCobro" type="number" min="1" max="31" value="${c.diaCobro}"></label>
      <label class="field full"><span class="label">Link de la plataforma</span><input class="input" name="linkPlataforma" type="url" placeholder="https://…" value="${c.linkPlataforma || ''}"></label>
    </div>`,
    onSubmit: (fd) => ctx.api.call('clientes.update', Object.assign({ idLead: c.idLead }, Object.fromEntries([...fd.entries()].filter(([k, v]) => k === 'linkPlataforma' || String(v).trim() !== '')))),
  });
  if (r) { refreshCliente(ctx, r); toast('Cliente actualizado', 'ok'); }
}

export async function pagoModal(c, ctx) {
  const hoy = ctx.store.get().hoy;
  const r = await formModal({
    title: 'Registrar pago · ' + c.nombre, submitLabel: 'Registrar pago',
    body: html`<p class="muted">Plan ${c.plan} · ${money(c.monto, ctx.cfg().moneda)} · comisión ${ctx.cfg().comisionPct}% para ${c.vendedorNombre || c.vendedor || 'nadie'}</p>
      <div class="form-grid">
        <label class="field"><span class="label">Período (${c.plan === 'Anual' ? 'AAAA' : 'AAAA-MM'})</span><input class="input" name="periodo" required value="${periodoSugerido(c, hoy)}"
          pattern="${c.plan === 'Anual' ? '\\d{4}' : '\\d{4}-\\d{2}'}"></label>
        <label class="field"><span class="label">Fecha de pago</span><input class="input" name="fechaPago" type="date" required value="${hoy}"></label>
        <label class="field"><span class="label">Monto</span><input class="input" name="monto" type="number" min="0.01" step="0.01" required value="${c.monto || ''}"></label>
        <label class="field"><span class="label">Método</span><input class="input" name="metodo" list="metodos" placeholder="Transferencia"></label>
        <datalist id="metodos"><option>Transferencia</option><option>Depósito</option><option>Tarjeta</option><option>Efectivo</option></datalist>
        <label class="field full"><span class="label">Nota</span><input class="input" name="nota" maxlength="300"></label>
      </div>`,
    onSubmit: (fd) => ctx.api.call('pagos.create', Object.assign({ idLead: c.idLead }, Object.fromEntries(fd.entries()))),
  });
  if (r) {
    refreshCliente(ctx, r.cliente);
    toast('Pago registrado · comisión ' + money(r.pago.comisionMonto, ctx.cfg().moneda), 'ok');
    ctx.reload && ctx.reload({ silent: true });
  }
}

export async function bajaModal(c, ctx) {
  const motivo = await promptDialog('Dar de baja a ' + c.nombre, 'Motivo (queda en el historial)', { required: true, multiline: true });
  if (!motivo) return;
  try { refreshCliente(ctx, await ctx.api.call('clientes.baja', { idLead: c.idLead, motivo })); toast('Cliente dado de baja', 'ok'); }
  catch (e) { toast(e.message, 'error'); }
}

export async function reactivar(c, ctx) {
  if (!(await confirmDialog('Reactivar cliente', 'Volverán a esperarse cobros y comisiones para ' + c.nombre + '.', { ok: 'Reactivar' }))) return;
  try { refreshCliente(ctx, await ctx.api.call('clientes.reactivar', { idLead: c.idLead })); toast('Cliente reactivado', 'ok'); }
  catch (e) { toast(e.message, 'error'); }
}

export async function historialPagosModal(c, ctx) {
  const admin = ctx.store.get().user.isAdmin;
  const m = openModal({ title: 'Pagos de ' + c.nombre, wide: true, body: html`<div id="hp"><div class="skeleton" style="height:120px"></div></div>`,
    actions: html`<button type="button" class="btn btn-ghost" data-close>Cerrar</button>` });
  m.el.querySelector('[data-close]').addEventListener('click', () => m.close());
  const draw = async () => {
    const list = await ctx.api.call('pagos.list', { idLead: c.idLead });
    const box = m.el.querySelector('#hp');
    if (!box) return;
    setHTML(box, list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Período</th><th>Fecha</th><th>Monto</th><th>Comisión</th><th>Estado</th><th>Registró</th>${admin ? html`<th></th>` : ''}</tr></thead>
      <tbody>${list.map((p) => html`<tr><td>${p.periodo}</td><td>${fmtDate(p.fechaPago)}</td><td>${money(p.monto, ctx.cfg().moneda)}</td><td>${money(p.comisionMonto, ctx.cfg().moneda)}</td>
        <td>${p.estado === 'Anulado' ? html`<span class="chip chip-muted" title="${p.motivoAnulacion}">Anulado</span>` : html`<span class="chip chip-ok">Válido</span>`}</td>
        <td class="muted">${p.registradoPor}</td>${admin ? html`<td>${p.estado !== 'Anulado' ? html`<button type="button" class="btn btn-ghost btn-sm" data-void="${p.id}">Anular</button>` : ''}</td>` : ''}</tr>`)}</tbody></table></div>`
      : html`<p class="muted">Sin pagos registrados.</p>`);
  };
  m.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-void]');
    if (!b) return;
    const motivo = await promptDialog('Anular pago', 'Motivo de la anulación', { required: true });
    if (!motivo) return;
    try { await ctx.api.call('pagos.void', { id: b.dataset.void, motivo }); toast('Pago anulado', 'ok'); draw().catch((err) => toast(err.message, 'error')); ctx.reload && ctx.reload({ silent: true }); }
    catch (x) { toast(x.message, 'error'); }
  });
  draw().catch((e) => toast(e.message, 'error'));
}
