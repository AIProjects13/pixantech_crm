import { html, setHTML, attrs } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { relTime } from '../ui/format.js';
import { formModal, confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { emptyState } from './common.js';

let users = [];

const fila = (u, me) => html`<tr>
  <td data-label="Usuario"><strong>${u.nombre}</strong>${u.email === me ? html` <span class="chip">Tú</span>` : ''}<div class="muted" style="font-size:12px">${u.email}</div></td>
  <td data-label="Rol"><label class="sr-only" for="rol_${u.email}">Rol de ${u.nombre}</label>
    <select class="input" style="width:auto;height:32px" id="rol_${u.email}" data-rol="${u.email}">${['Admin', 'Usuario'].map((r) => html`<option${attrs({ selected: r === u.rol })}>${r}</option>`)}</select></td>
  <td data-label="Activo"><button type="button" class="switch" role="switch" aria-checked="${String(!!u.activo)}" aria-label="Activo: ${u.nombre}" data-act="activo" data-email="${u.email}"></button></td>
  <td data-label="Firebase">${u.uidVinculado ? html`<span class="chip chip-ok">Vinculado</span>` : html`<span class="chip chip-warn">Pendiente</span>`}</td>
  <td data-label="Último acceso" class="muted">${u.ultimoAcceso ? relTime(u.ultimoAcceso) : 'Nunca'}</td>
  <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
    <button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="reset" data-email="${u.email}" aria-label="Enviar correo de contraseña a ${u.nombre}" title="Restablecer contraseña">${icon('key', 14)}</button>
    ${u.uidVinculado ? html`<button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="unlink" data-email="${u.email}" aria-label="Desvincular cuenta de ${u.nombre}" title="Desvincular cuenta">${icon('unlink', 14)}</button>` : ''}
    <button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="del" data-email="${u.email}" aria-label="Eliminar a ${u.nombre}" title="Eliminar" style="color:var(--danger)">${icon('trash', 14)}</button>
  </div></td></tr>`;

function draw(el, ctx) {
  const box = el.querySelector('#usrBody');
  if (!box) return;
  const me = ctx.store.get().user.email;
  setHTML(box, users.length ? html`<div class="table-wrap"><table class="table cards"><thead><tr><th>Usuario</th><th>Rol</th><th>Activo</th><th>Firebase</th><th>Último acceso</th><th></th></tr></thead>
    <tbody>${users.map((u) => fila(u, me))}</tbody></table></div>` : emptyState('Sin usuarios'));
}

async function load(el, ctx) {
  try { users = await ctx.api.call('users.list'); draw(el, ctx); } catch (e) { toast(e.message, 'error'); }
}

async function update(el, ctx, email, changes, okMsg) {
  const sw = Array.from(el.querySelectorAll('[data-act="activo"]')).find((b) => b.dataset.email === email);
  if (sw) sw.disabled = true;
  try {
    const u = await ctx.api.call('users.update', Object.assign({ email }, changes));
    users = users.map((x) => (x.email === email ? u : x));
    toast(okMsg, 'ok');
    if (email === ctx.store.get().user.email && ctx.reload) ctx.reload();
  } catch (e) { toast(e.message, 'error'); }
  draw(el, ctx);
}

export default {
  render() {
    return html`<div class="row" style="margin-bottom:14px"><p class="muted" style="flex:1">Dos roles: <strong>Admin</strong> (control total) y <strong>Usuario</strong> (solo lo suyo).</p>
      <button type="button" class="btn btn-primary" data-act="new">${icon('userPlus', 16)} Nuevo usuario</button></div><div id="usrBody"><div class="skeleton" style="height:160px"></div></div>`;
  },
  async mount(el, ctx) {
    const onClick = async (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const email = a.dataset.email;
      const u = users.find((x) => x.email === email);
      if (a.dataset.act === 'new') {
        const r = await formModal({
          title: 'Nuevo usuario', submitLabel: 'Crear usuario',
          body: html`<label class="field"><span class="label">Email *</span><input class="input" name="email" type="email" required></label>
            <label class="field"><span class="label">Nombre completo *</span><input class="input" name="nombre" required maxlength="100"></label>
            <label class="field"><span class="label">Rol</span><select class="input" name="rol"><option>Usuario</option><option>Admin</option></select></label>
            <p class="muted" style="font-size:12px">Recibirá un correo para definir su contraseña.</p>`,
          onSubmit: async (fd) => {
            const data = Object.fromEntries(fd.entries());
            if (data.rol === 'Admin' && !(await confirmDialog('¿Crear administrador?', 'Tendrá control total, incluida la gestión de usuarios y finanzas.', { ok: 'Sí, crear Admin' }))) return null;
            return ctx.api.call('users.create', data, { timeoutMs: 90000 });
          },
        });
        if (r) { toast(r.mensaje, 'ok'); load(el, ctx); }
      }
      if (a.dataset.act === 'activo' && u) {
        const yo = email === ctx.store.get().user.email;
        if (u.activo && !(await confirmDialog('Desactivar usuario', yo ? 'Vas a desactivar tu propia cuenta: perderás el acceso de inmediato.' : u.nombre + ' perderá el acceso de inmediato. Sus prospectos quedan asignados.', { danger: true, ok: 'Desactivar' }))) return;
        update(el, ctx, email, { activo: !u.activo }, u.activo ? 'Usuario desactivado' : 'Usuario activado');
      }
      if (a.dataset.act === 'reset') {
        try { await ctx.api.call('users.resetPassword', { email }); toast('Correo de restablecimiento enviado', 'ok'); } catch (x) { toast(x.message, 'error'); }
      }
      if (a.dataset.act === 'unlink' && await confirmDialog('Desvincular cuenta', 'Se volverá a vincular en su próximo inicio de sesión con correo verificado.')) {
        update(el, ctx, email, { desvincularUid: true }, 'Cuenta desvinculada');
      }
      if (a.dataset.act === 'del' && await confirmDialog('Eliminar perfil', 'Se eliminará el acceso de ' + email + '.', { danger: true, ok: 'Eliminar' })) {
        try { await ctx.api.call('users.delete', { email }); users = users.filter((x) => x.email !== email); draw(el, ctx); toast('Perfil eliminado', 'ok'); }
        catch (x) { toast(x.message, 'error'); }
      }
    };
    const onChange = async (e) => {
      const t = e.target.closest('[data-rol]');
      if (!t) return;
      const u = users.find((x) => x.email === t.dataset.rol);
      const yo = u.email === ctx.store.get().user.email && t.value !== 'Admin';
      if (!(await confirmDialog('Cambiar rol', yo ? 'Vas a quitarte el rol de administrador: perderás el acceso a esta sección.' : 'Cambiar a ' + u.nombre + ' de ' + u.rol + ' a ' + t.value + '.', { ok: 'Cambiar a ' + t.value }))) { t.value = u.rol; return; }
      update(el, ctx, u.email, { rol: t.value }, 'Rol actualizado');
    };
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    await load(el, ctx);
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('change', onChange); };
  },
};
