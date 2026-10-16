import { html, attrs } from '../ui/html.js';
import { formModal, confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { upsert, removeFrom } from '../state.js';

export async function newLeadModal(ctx) {
  const s = ctx.store.get();
  const admin = s.user.isAdmin;
  const f = (k, label, type = 'text', req, full) => html`<label class="field ${full ? 'full' : ''}"><span class="label">${label}${req ? ' *' : ''}</span>
    <input class="input" name="${k}" type="${type}"${attrs({ required: !!req })}></label>`;
  let dupData = null;
  const lead = await formModal({
    title: 'Nuevo prospecto', wide: true, submitLabel: 'Crear',
    body: html`<div class="form-grid">
      ${f('nombre', 'Empresa', 'text', true, true)}${f('contacto', 'Contacto')}${f('email', 'Email', 'email')}${f('telefono', 'Teléfono', 'tel')}
      ${f('web', 'Sitio web')}${f('rubro', 'Rubro')}${f('colores', 'Colores de marca')}
      <label class="field"><span class="label">País</span><input class="input" name="pais" value="Guatemala"></label>
      ${f('region', 'Región')}${f('fechaContacto', 'Próximo contacto', 'date')}
      ${admin ? html`<label class="field full"><span class="label">Responsable</span><select class="input" name="asignadoA">
        <option value="">— Dejar en la bolsa —</option>${s.usuarios.map((u) => html`<option value="${u.email}">${u.nombre} (${u.rol})</option>`)}</select></label>`
        : html`<p class="muted full" style="font-size:12px">Quedará asignado a ti.</p>`}
    </div>`,
    onSubmit: async (fd) => {
      try {
        return await ctx.api.call('leads.create', Object.fromEntries(fd.entries()));
      } catch (e) {
        if (e.code === 'DUPLICATE' && e.data && e.data.enBolsa) { dupData = e.data; return null; }
        throw e;
      }
    },
  });
  if (lead) {
    if (lead.asignadoA) upsert('leads', lead); else upsert('bolsa', lead);
    toast('Prospecto creado', 'ok');
    ctx.refreshView && ctx.refreshView();
    return;
  }
  if (dupData && await confirmDialog('Ya está en la bolsa', 'Este prospecto ya está registrado y nadie lo trabaja todavía. ¿Quieres tomarlo?', { ok: 'Tomarlo' })) {
    try {
      const r = await ctx.api.call('leads.take', { id: dupData.id });
      removeFrom('bolsa', r.id);
      upsert('leads', Object.assign({}, r, { bitacora: undefined }));
      toast('Ahora es tuyo', 'ok');
      ctx.openLead(r.id);
      ctx.refreshView && ctx.refreshView();
    } catch (e) { toast(e.message, 'error'); }
  }
}
