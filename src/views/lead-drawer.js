import { html, setHTML, safeHref, attrs } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { fmtDate, initials } from '../ui/format.js';
import { openDrawer, drawerLoading, closeDrawer, drawerEl, drawerOpen } from '../ui/drawer.js';
import { confirmDialog, promptDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { upsert, removeFrom } from '../state.js';
import { estadoChip, quickActions } from './common.js';
import { isDue } from '../lib/dates.js';

let current = null; // LeadDetail abierto

export function groupHistory(bitacora, estados) {
  const by = {};
  (bitacora || []).forEach((n) => { const k = n.etapa || 'Sin etapa'; (by[k] = by[k] || []).push(n); });
  const order = estados.slice().reverse().concat(Object.keys(by).filter((k) => !estados.includes(k)));
  return order.filter((k) => by[k]).map((k) => ({ etapa: k, items: by[k] }));
}

/** Movimiento optimista: cambia al instante y revierte si el servidor falla. */
export async function moveLead(id, estado, ctx, nota) {
  const s = ctx.store.get();
  let key = 'leads';
  let l = s.leads.find((x) => x.id === id);
  if (!l) { l = s.bolsa.find((x) => x.id === id); key = 'bolsa'; }
  if (!l && current && current.id === id) l = current;
  if (!l || l.estado === estado) return;
  const inStore = key === 'bolsa' ? s.bolsa.includes(l) : s.leads.includes(l);
  const prev = l.estado;
  if (inStore) upsert(key, { id, estado });
  ctx.refreshView && ctx.refreshView();
  try {
    const r = await ctx.api.call('leads.move', nota ? { id, estado, nota } : { id, estado });
    if (inStore) upsert(key, r);
    if (r.clienteCreado) {
      (ctx.toast || toast)('🎉 ' + r.nombre + ' ahora es cliente', 'ok');
      ctx.api.call('clientes.list').then((c) => ctx.store.set({ clientes: c })).catch(() => {});
    }
    if (current && current.id === id) openLead(id, ctx);
  } catch (e) {
    if (inStore) upsert(key, { id, estado: prev });
    (ctx.toast || toast)(e.message, 'error');
    if (current && current.id === id) render(ctx);
  }
  ctx.refreshView && ctx.refreshView();
}

export async function quickNote(id, ctx) {
  const l = ctx.store.get().leads.find((x) => x.id === id);
  const texto = await promptDialog('Nota en "' + (l ? l.estado : '') + '"', 'Comentario de seguimiento', { multiline: true, required: true });
  if (!texto) return;
  try {
    const r = await ctx.api.call('leads.addNote', { id, texto });
    upsert('leads', Object.assign({}, r, { bitacora: undefined }));
    toast('Nota guardada', 'ok');
    ctx.refreshView && ctx.refreshView();
  } catch (e) { toast(e.message, 'error'); }
}

function view(l, ctx) {
  const s = ctx.store.get();
  const admin = s.user.isAdmin;
  const due = isDue(l, s.hoy);
  const f = (k, label, type = 'text', full) => html`<label class="field ${full ? 'full' : ''}"><span class="label">${label}</span>
    <input class="input" name="${k}" type="${type}" value="${l[k] || ''}"></label>`;
  const groups = groupHistory(l.bitacora, s.estados);
  return html`
    <div class="drawer-head">
      <span class="avatar" style="width:44px;height:44px">${initials(l.nombre)}</span>
      <div style="flex:1;min-width:0"><h2 style="font-size:18px">${l.nombre}</h2>
        <div class="row" style="margin-top:6px">${estadoChip(l.estado)}${due ? html`<span class="chip chip-danger">${icon('bell', 12)} ${l.fechaContacto === s.hoy ? 'Contactar hoy' : 'Seguimiento vencido'}</span>` : ''}
        <span class="muted" style="font-size:12px">${l.asignadoA ? 'Responsable: ' + l.asignadoA : 'En la bolsa'}</span></div></div>
      <button type="button" class="btn btn-ghost btn-icon" data-act="closeDrawer" aria-label="Cerrar">${icon('x')}</button>
    </div>
    <div class="drawer-body">
      <div class="row">${quickActions(l)}${l.web ? html`<a class="btn btn-sm btn-ghost" href="${safeHref(l.web)}" target="_blank" rel="noopener noreferrer">${icon('globe', 16)} Sitio web</a>` : ''}</div>
      <section class="card" style="padding:14px">
        <div class="form-grid">
          <label class="field"><span class="label">Etapa</span><select class="input" data-act-change="estado">${s.estados.map((e) => html`<option${attrs({ selected: e === l.estado })}>${e}</option>`)}</select></label>
          <label class="field"><span class="label">Próximo contacto</span><input class="input" type="date" name="fechaContacto" form="leadForm" value="${l.fechaContacto || ''}"></label>
        </div>
        ${admin ? html`<div class="row" style="margin-top:12px"><span class="label">Responsable</span>
          <select class="input" style="width:auto" data-act-change="assign"><option value="">— Bolsa —</option>${s.usuarios.map((u) => html`<option value="${u.email}"${attrs({ selected: u.email === l.asignadoA })}>${u.nombre} (${u.rol})</option>`)}</select></div>` : ''}
        ${s.plantillas.length && l.email ? html`<div class="row" style="margin-top:12px"><span class="label">Enviar plantilla</span>
          <select class="input" style="width:auto;flex:1" id="dTpl">${s.plantillas.map((t) => html`<option value="${t.id}"${attrs({ selected: t.activa })}>${t.nombre}</option>`)}</select>
          <button type="button" class="btn btn-primary btn-sm" data-act="sendTpl">${icon('send', 14)} Enviar</button></div>` : ''}
      </section>
      <section>
        <h3 style="font-size:15px;margin-bottom:10px">Nota en la etapa "${l.estado}"</h3>
        <div class="row" style="flex-wrap:nowrap;align-items:flex-end"><label class="sr-only" for="dNote">Nota</label>
          <textarea id="dNote" class="input" rows="2" maxlength="2000" placeholder="Escribe una nota de seguimiento…"></textarea>
          <button type="button" class="btn btn-primary" data-act="addNote" aria-label="Guardar nota">${icon('send', 16)}</button></div>
      </section>
      <details class="card" style="padding:14px"><summary style="cursor:pointer;font-weight:700">Datos de la empresa</summary>
        <form id="leadForm" class="form-grid" style="margin-top:14px" novalidate>
          ${f('nombre', 'Empresa', 'text', true)}${f('contacto', 'Contacto')}${f('email', 'Email', 'email')}${f('telefono', 'Teléfono', 'tel')}
          ${f('web', 'Sitio web', 'url')}${f('rubro', 'Rubro')}${f('colores', 'Colores de marca')}${f('pais', 'País')}${f('region', 'Región')}
          <div class="full row"><span class="muted" style="font-size:12px">Creado ${fmtDate(l.fechaCreacion)}${l.creadoPor ? ' por ' + l.creadoPor : ''}</span><span class="spacer"></span>
            <button type="submit" class="btn btn-primary btn-sm">${icon('save', 14)} Guardar cambios</button></div>
        </form></details>
      <section><h3 style="font-size:15px;margin-bottom:10px">Historial por etapa</h3>
        ${groups.length ? html`<div class="timeline">${groups.map((g) => html`<div class="tl-group"><h5>${g.etapa}</h5>
          <div class="stack" style="gap:10px">${g.items.map((n) => html`<div class="tl-item ${n.tipo}">
            <div class="muted" style="font-size:12px"><strong>${n.nombreUsuario || n.usuario}</strong> · ${fmtDate(n.fecha, true)}</div>
            <div style="white-space:pre-wrap;word-break:break-word" class="${n.tipo === 'sistema' ? 'muted' : ''}">${n.texto}</div></div>`)}</div></div>`)}</div>`
          : html`<p class="muted">Sin notas todavía.</p>`}
      </section>
      ${admin ? html`<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-ghost btn-sm" data-act="delLead" style="color:var(--danger)">${icon('trash', 14)} Eliminar prospecto</button></div>` : ''}
    </div>`;
}

function bind(el, ctx) {
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || !current) return;
    const l = current;
    if (a.dataset.act === 'closeDrawer') closeDrawer();
    if (a.dataset.act === 'addNote') {
      const ta = el.querySelector('#dNote');
      const texto = ta.value.trim();
      if (!texto) { ta.focus(); return; }
      a.disabled = true;
      try {
        const r = await ctx.api.call('leads.addNote', { id: l.id, texto });
        current = r;
        upsert('leads', Object.assign({}, r, { bitacora: undefined }));
        render(ctx);
        ctx.refreshView && ctx.refreshView();
      } catch (x) { toast(x.message, 'error'); a.disabled = false; }
    }
    if (a.dataset.act === 'sendTpl') {
      if (!(await confirmDialog('Enviar correo', 'Se enviará la plantilla a ' + l.email + '.', { ok: 'Enviar' }))) return;
      a.disabled = true;
      try {
        const r = await ctx.api.call('leads.sendEmail', { id: l.id, plantillaId: el.querySelector('#dTpl').value });
        upsert('leads', r);
        toast('Correo enviado', 'ok');
        openLead(l.id, ctx);
        ctx.refreshView && ctx.refreshView();
      } catch (x) { toast(x.message, 'error'); a.disabled = false; }
    }
    if (a.dataset.act === 'delLead') {
      if (!(await confirmDialog('Eliminar prospecto', 'Se eliminará "' + l.nombre + '" con su historial. No se puede deshacer.', { danger: true, ok: 'Eliminar' }))) return;
      try {
        await ctx.api.call('leads.delete', { id: l.id });
        removeFrom('leads', l.id); removeFrom('bolsa', l.id);
        ctx.store.set((s) => ({ clientes: s.clientes.filter((c) => c.idLead !== l.id) }));
        closeDrawer();
        toast('Prospecto eliminado', 'ok');
        ctx.refreshView && ctx.refreshView();
      } catch (x) { toast(x.message, 'error'); }
    }
  });
  el.addEventListener('change', async (e) => {
    const t = e.target.closest('[data-act-change]');
    if (!t || !current) return;
    if (t.dataset.actChange === 'estado') moveLead(current.id, t.value, ctx);
    if (t.dataset.actChange === 'assign') {
      try {
        const r = await ctx.api.call('leads.assign', { id: current.id, asignadoA: t.value });
        if (r.asignadoA) { upsert('leads', r); removeFrom('bolsa', r.id); } else { removeFrom('leads', r.id); upsert('bolsa', r); }
        toast(r.asignadoA ? 'Asignado a ' + r.asignadoA : 'Devuelto a la bolsa', 'ok');
        openLead(current.id, ctx);
        ctx.refreshView && ctx.refreshView();
      } catch (x) { toast(x.message, 'error'); }
    }
  });
  el.addEventListener('submit', async (e) => {
    if (e.target.id !== 'leadForm' || !current) return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const fc = el.querySelector('[name="fechaContacto"]');
    const fields = {};
    ['nombre', 'contacto', 'email', 'telefono', 'web', 'rubro', 'colores', 'pais', 'region'].forEach((k) => {
      const v = String(fd.get(k) || '').trim();
      if (String(current[k] || '') !== v) fields[k] = v;
    });
    if (fc && fc.value !== (current.fechaContacto || '')) fields.fechaContacto = fc.value;
    if (!Object.keys(fields).length) { toast('No hay cambios'); return; }
    try {
      const r = await ctx.api.call('leads.update', { id: current.id, version: current.version, fields });
      upsert('leads', r);
      toast('Cambios guardados', 'ok');
      openLead(current.id, ctx);
      ctx.refreshView && ctx.refreshView();
    } catch (x) {
      toast(x.code === 'CONFLICT' ? x.message + ' (se recargó el prospecto)' : x.message, 'error');
      if (x.code === 'CONFLICT') openLead(current.id, ctx);
    }
  });
}

function render(ctx) {
  const el = drawerEl();
  if (el && current) setHTML(el, view(current, ctx));
}

export async function openLead(id, ctx) {
  const was = drawerOpen();
  const d = was ? { el: drawerEl() } : openDrawer(drawerLoading(), { label: 'Detalle del prospecto', onClose: () => { current = null; } });
  if (!was) bind(d.el, ctx);
  try {
    const l = await ctx.api.call('leads.get', { id });
    if (drawerEl() !== d.el) return;
    if (l.enBolsa && !ctx.store.get().user.isAdmin) { closeDrawer(); ctx.go('bolsa'); return; }
    current = l;
    render(ctx);
  } catch (e) {
    closeDrawer();
    toast(e.message, 'error');
    if (e.code === 'NOT_FOUND') { removeFrom('leads', id); ctx.refreshView && ctx.refreshView(); }
  }
}
