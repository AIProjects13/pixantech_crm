'use strict';

Object.assign(Views, {
  config() {
    const admin = S.user.isAdmin;
    return '<div class="grid gap-4 xl:grid-cols-[380px_1fr]">' +
      '<div class="space-y-4">' +
      (admin ? '<div id="cfgBox" class="glass p-5"><div class="skeleton h-5 w-1/2 mb-4"></div><div class="skeleton h-10 w-full mb-3"></div><div class="skeleton h-10 w-full"></div></div>' : '') +
      '<div class="glass p-5"><div class="flex items-center justify-between mb-3"><h3 class="font-bold">Plantillas</h3>' +
      '<button class="btn btn-ghost btn-sm" data-act="tplNew"><i class="fa-solid fa-plus"></i> Nueva</button></div><div id="tplList" class="space-y-2">' + Views.tplList() + '</div></div>' +
      '</div><div id="tplEditor" class="glass p-5">' + Views.tplEditor() + '</div></div>';
  },
  async configMount() {
    if (!S.tplSel && S.plantillas.length) S.tplSel = (S.plantillas.find((t) => t.activa) || S.plantillas[0]).id;
    $('#tplList').innerHTML = Views.tplList();
    $('#tplEditor').innerHTML = Views.tplEditor();
    mountQuill();
    if (S.user.isAdmin) {
      try { renderCfg(await Api.call('config.get')); }
      catch (e) { $('#cfgBox').innerHTML = '<p class="text-sm text-rose-500">' + esc(e.message) + '</p>'; }
    }
  },
  tplList() {
    if (!S.plantillas.length) return '<p class="text-sm muted">Aún no hay plantillas.</p>';
    return S.plantillas.map((t) =>
      '<button class="w-full text-left glass-soft px-3 py-2.5 flex items-center gap-3 transition ' + (S.tplSel === t.id ? 'ring-2 ring-indigo-400' : '') + '" data-act="tplSel" data-id="' + esc(t.id) + '">' +
      '<i class="fa-solid fa-envelope-open-text muted"></i><div class="min-w-0 flex-1"><div class="text-sm font-semibold truncate">' + esc(t.nombre) + '</div><div class="text-xs muted truncate">' + esc(t.asunto) + '</div></div>' +
      (t.activa ? '<span class="chip text-emerald-500">Activa</span>' : '') + '</button>').join('');
  },
  tplEditor() {
    const t = S.plantillas.find((x) => x.id === S.tplSel) || { id: '', nombre: '', asunto: '', cuerpoHtml: '', activa: !S.plantillas.length };
    const vars = ['nombre', 'contacto', 'rubro', 'pais', 'region', 'web'];
    return '<div class="flex items-center justify-between mb-4"><h3 class="font-bold">' + (t.id ? 'Editar plantilla' : 'Nueva plantilla') + '</h3>' +
      '<label class="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input id="tplActiva" type="checkbox" class="w-4 h-4 accent-emerald-500" ' + (t.activa ? 'checked' : '') + '> Plantilla activa</label></div>' +
      '<input type="hidden" id="tplId" value="' + esc(t.id) + '">' +
      '<div class="grid sm:grid-cols-2 gap-3 mb-3"><div><label class="label">Nombre interno</label><input id="tplNombre" class="input" maxlength="100" value="' + esc(t.nombre) + '"></div>' +
      '<div><label class="label">Asunto</label><input id="tplAsunto" class="input" maxlength="200" value="' + esc(t.asunto) + '"></div></div>' +
      '<div class="flex flex-wrap items-center gap-2 mb-3"><span class="text-xs muted font-semibold">Insertar variable:</span>' +
      vars.map((v) => '<button class="chip hover:border-indigo-400" data-act="tplVar" data-v="' + v + '">{{' + v + '}}</button>').join('') + '</div>' +
      '<div id="quillBox"><div class="skeleton h-64 w-full"></div></div>' +
      '<textarea id="tplHtml" hidden>' + esc(t.cuerpoHtml) + '</textarea>' +
      '<div class="flex justify-end gap-2 mt-4"><button class="btn btn-primary" data-act="tplSave"><i class="fa-solid fa-floppy-disk"></i> Guardar plantilla</button></div>';
  },

  /* ------------------------------- USUARIOS ------------------------------ */
  usuarios() {
    return '<div class="flex flex-wrap items-center gap-3 mb-4"><p class="text-sm muted flex-1">Solo los administradores crean perfiles y asignan niveles. Los permisos de cada nivel se editan en la hoja <b>Niveles</b>.</p>' +
      '<button class="btn btn-primary" data-act="userNew"><i class="fa-solid fa-user-plus"></i> Nuevo usuario</button></div>' +
      '<details class="glass p-4 mb-4"><summary class="font-bold cursor-pointer select-none">' + ic('trophy', 'text-amber-500') + ' Reglas de comisión (se explican a cada persona al crear su perfil)</summary><div class="mt-3">' + Comision.reglasHtml() + '</div></details>' +
      '<div id="usrTable" class="mb-4"><div class="glass p-5"><div class="skeleton h-10 w-full"></div></div></div>' +
      '<div id="nivBox" class="glass p-5"></div>';
  },
  async usuariosMount() {
    try {
      const [users, niv] = await Promise.all([Api.call('users.list'), Api.call('niveles.list')]);
      S.users = users; S.niveles = niv;
      renderUsers();
    } catch (e) {
      $('#usrTable').innerHTML = '<div class="glass p-5 text-rose-500 text-sm">' + esc(e.message) + '</div>';
    }
  },
});

function renderCfg(cfg) {
  const box = $('#cfgBox');
  if (!box) return;
  box.innerHTML = '<div class="flex items-center gap-3 mb-4"><span class="kpi-icon" style="background:linear-gradient(135deg,#6366f1,#06b6d4)"><i class="fa-solid fa-sliders"></i></span>' +
    '<div><h3 class="font-bold">Ajustes</h3><p class="text-xs muted">Correo y WhatsApp</p></div></div>' +
    '<div class="space-y-3">' +
    cfg.valores.map((v) => '<div><label class="label" title="' + esc(v.descripcion) + '">' + esc(v.clave.replace(/_/g, ' ')) + '</label><input class="input" data-cfg="' + esc(v.clave) + '" value="' + esc(v.valor) + '"><p class="text-[11px] muted mt-1">' + esc(v.descripcion) + '</p></div>').join('') +
    '</div><button class="btn btn-ghost btn-sm w-full mt-4" data-act="cfgSave"><i class="fa-solid fa-floppy-disk"></i> Guardar ajustes</button>' +
    '<p class="text-xs muted mt-4"><i class="fa-solid fa-envelope mr-1"></i>Cuota de correo restante hoy: <b>' + num(cfg.cuotaCorreo) + '</b></p>';
}

function loadAsset(tag, attrs) {
  return new Promise((res, rej) => {
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload = res; el.onerror = rej;
    document.head.appendChild(el);
  });
}
let quillReady = null;
function ensureQuill() {
  if (!quillReady) {
    quillReady = Promise.all([
      loadAsset('link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css' }),
      loadAsset('script', { src: 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js' }),
    ]);
  }
  return quillReady;
}
async function mountQuill() {
  try { await ensureQuill(); } catch (e) { UI.toast('No se pudo cargar el editor.', 'error'); return; }
  const box = $('#quillBox');
  if (!box) return;
  box.innerHTML = '<div id="quill"></div>';
  S.quill = new Quill('#quill', {
    theme: 'snow',
    placeholder: 'Redacta el correo…',
    modules: {
      toolbar: {
        container: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }], ['link', 'image'], ['clean']],
        handlers: {
          // Imágenes por URL (pegar base64 excede el límite de la celda).
          image: async function () {
            const url = await UI.prompt('Insertar imagen', 'URL pública de la imagen (https://…)');
            if (!url) return;
            if (!/^https:\/\//i.test(url)) { UI.toast('La imagen debe ser una URL https.', 'error'); return; }
            const r = this.quill.getSelection(true);
            this.quill.insertEmbed(r.index, 'image', url, 'user');
          },
        },
      },
    },
  });
  S.quill.clipboard.dangerouslyPasteHTML($('#tplHtml').value || '');
}

function renderUsers() {
  const box = $('#usrTable');
  if (!box) return;
  const niveles = S.niveles.niveles.map((n) => n.nivel);
  const acceso = (u) => (u.ultimoAcceso ? 'Con acceso' : 'Nunca ha ingresado');
  box.innerHTML = Table.html('usr', {
    name: 'usuarios', minW: 900, placeholder: 'Buscar nombre o email…',
    initSort: { k: 'nombre', dir: 1 },
    cols: [
      { k: 'nombre', label: 'Usuario', sort: (u) => u.nombre },
      { k: 'nivel', label: 'Nivel', sort: (u) => u.nivel, w: '180px' },
      { k: 'activo', label: 'Activo', sort: (u) => (u.activo ? 0 : 1), w: '90px' },
      { k: 'uid', label: 'Firebase', sort: (u) => (u.uidVinculado ? 0 : 1), w: '140px' },
      { k: 'ultimoAcceso', label: 'Último acceso', sort: (u) => u.ultimoAcceso, w: '150px' },
      { k: 'acc', label: '', w: '140px' },
    ],
    filters: [
      { k: 'nivel', label: 'Nivel', get: (u) => u.nivel },
      { k: 'activo', label: 'Estado', get: (u) => (u.activo ? 'Activo' : 'Inactivo') },
      { k: 'acceso', label: 'Acceso', get: acceso },
    ],
    rows: () => S.users || [],
    search: (u) => [u.nombre, u.email, u.nivel].join(' '),
    empty: UI.empty('fa-users', 'Sin usuarios'),
    row: (u) => {
      const me = u.email === S.user.email;
      return '<tr><td><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-xl grid place-items-center text-xs font-bold text-white flex-none" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)">' + esc(initials(u.nombre)) + '</div>' +
        '<div class="min-w-0"><div class="font-semibold truncate">' + esc(u.nombre) + (me ? ' <span class="chip">Tú</span>' : '') + '</div><div class="text-xs muted truncate">' + esc(u.email) + '</div></div></div></td>' +
        '<td><select class="input !py-1.5 font-semibold" data-usr="' + esc(u.email) + '" data-f="nivel">' + niveles.map((n) => '<option ' + (n === u.nivel ? 'selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></td>' +
        '<td><button class="switch ' + (u.activo ? 'on' : '') + '" data-act="usrActivo" data-email="' + esc(u.email) + '" aria-label="Activo"></button></td>' +
        '<td>' + (u.uidVinculado ? '<span class="chip text-emerald-500"><i class="fa-solid fa-link"></i> Vinculado</span>' : '<span class="chip text-amber-500"><i class="fa-solid fa-hourglass-half"></i> Pendiente</span>') + '</td>' +
        '<td class="text-sm muted">' + (u.ultimoAcceso ? esc(relTime(u.ultimoAcceso)) : 'Nunca') + '</td>' +
        '<td><div class="flex justify-end gap-1.5">' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="usrReset" data-email="' + esc(u.email) + '" title="Enviar correo para restablecer contraseña"><i class="fa-solid fa-key"></i></button>' +
        (u.uidVinculado ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="usrUnlink" data-email="' + esc(u.email) + '" title="Desvincular cuenta de Firebase"><i class="fa-solid fa-link-slash"></i></button>' : '') +
        '<button class="btn btn-ghost btn-icon btn-sm text-rose-500" data-act="usrDel" data-email="' + esc(u.email) + '" title="Eliminar perfil"><i class="fa-solid fa-trash"></i></button>' +
        '</div></td></tr>';
    },
    exp: [
      ['nombre', (u) => u.nombre], ['email', (u) => u.email], ['nivel', (u) => u.nivel], ['activo', (u) => (u.activo ? 'Sí' : 'No')],
      ['firebase_vinculado', (u) => (u.uidVinculado ? 'Sí' : 'No')], ['creado_por', (u) => u.creadoPor], ['fecha_creacion', (u) => u.fechaCreacion],
      ['ultimo_acceso', (u) => u.ultimoAcceso],
    ],
  });
  Table.body('usr');

  const P = S.niveles.permisos;
  const keys = Object.keys(P);
  $('#nivBox').innerHTML = '<h3 class="font-bold mb-1">Niveles y permisos</h3><p class="text-xs muted mb-4">Gestión de usuarios y configuración: exclusivo del nivel Admin.</p>' +
    '<div class="overflow-x-auto scroll-thin"><table class="table min-w-[720px]"><thead><tr><th>Permiso</th>' + S.niveles.niveles.map((n) => '<th class="text-center">' + esc(n.nivel) + '</th>').join('') + '</tr></thead><tbody>' +
    keys.map((k) => '<tr><td class="text-sm">' + esc(P[k]) + '</td>' + S.niveles.niveles.map((n) => '<td class="text-center">' + (n.perms[k] ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>' : '<i class="fa-regular fa-circle muted"></i>') + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

async function updateUser(email, changes, okMsg) {
  try {
    const u = await Api.call('users.update', Object.assign({ email }, changes));
    const i = S.users.findIndex((x) => x.email === email);
    if (i >= 0) S.users[i] = u;
    UI.toast(okMsg || 'Usuario actualizado', 'ok');
  } catch (e) {
    UI.toast(e.message, 'error');
  }
  renderUsers();
}

function userFormModal() {
  const niveles = S.niveles.niveles.map((n) => n.nivel);
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-extrabold">Nuevo usuario</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<form id="nuForm" class="space-y-3"><div><label class="label">Email *</label><input name="email" type="email" class="input" required></div>' +
    '<div><label class="label">Nombre completo *</label><input name="nombre" class="input" required maxlength="100"></div>' +
    '<div><label class="label">Nivel *</label><select name="nivel" class="input">' + niveles.map((n) => '<option ' + (n === 'Agente' ? 'selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
    '<p class="text-xs muted">Se crea su cuenta y recibirá un correo para definir su contraseña.</p>' +
    '<div class="glass-soft p-3"><div class="font-bold text-sm mb-2">' + ic('trophy', 'text-amber-500') + ' Comisiones: lo que debe saber esta persona</div>' + Comision.reglasHtml() +
    '<p class="text-xs muted mt-2">Al crear el perfil se le envía un correo con estas reglas, y siempre las tiene en la pantalla «Comisiones».</p></div>' +
    '<div id="nuErr" class="text-sm text-rose-500" hidden></div>' +
    '<div class="flex justify-end gap-2 pt-2"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="nuBtn"><i class="fa-solid fa-user-plus"></i> Crear usuario</button></div></form>');
  $('#nuForm', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (data.nivel === 'Admin' && !(await UI.confirm('¿Crear administrador?', 'Este usuario tendrá control total, incluida la gestión de usuarios.'))) return;
    UI.busy($('#nuBtn', m.el), true, 'Creando…');
    try {
      const r = await Api.call('users.create', data);
      m.close();
      UI.toast(r.mensaje, 'ok');
      S.users = await Api.call('users.list');
      renderUsers();
    } catch (err) {
      const b = $('#nuErr', m.el); b.textContent = err.message; b.hidden = false;
      UI.busy($('#nuBtn', m.el), false);
    }
  });
}

Object.assign(Actions, {
  tplSel(el) { S.tplSel = el.dataset.id; $('#tplList').innerHTML = Views.tplList(); $('#tplEditor').innerHTML = Views.tplEditor(); mountQuill(); },
  tplNew() { S.tplSel = '__new'; $('#tplList').innerHTML = Views.tplList(); $('#tplEditor').innerHTML = Views.tplEditor(); mountQuill(); },
  tplVar(el) {
    if (!S.quill) return;
    const r = S.quill.getSelection(true);
    S.quill.insertText(r.index, '{{' + el.dataset.v + '}}', 'user');
    S.quill.setSelection(r.index + el.dataset.v.length + 4);
  },
  async tplSave(el) {
    if (!S.quill) return;
    const payload = {
      id: $('#tplId').value || undefined, nombre: $('#tplNombre').value.trim(), asunto: $('#tplAsunto').value.trim(),
      cuerpoHtml: S.quill.root.innerHTML, activa: $('#tplActiva').checked,
    };
    UI.busy(el, true, 'Guardando…');
    try {
      S.plantillas = await Api.call('plantillas.save', payload);
      if (!payload.id) S.tplSel = (S.plantillas.find((t) => t.nombre === payload.nombre && t.asunto === payload.asunto) || {}).id || null;
      $('#tplList').innerHTML = Views.tplList();
      $('#tplId').value = S.tplSel || '';
      UI.toast('Plantilla guardada', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); }
    UI.busy(el, false);
  },
  async cfgSave(el) {
    const valores = {};
    $$('[data-cfg]').forEach((i) => { valores[i.dataset.cfg] = i.value.trim(); });
    UI.busy(el, true, 'Guardando…');
    try { renderCfg(await Api.call('config.save', { valores })); UI.toast('Ajustes guardados', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },

  userNew: () => userFormModal(),
  usrActivo(el) {
    const u = S.users.find((x) => x.email === el.dataset.email);
    updateUser(u.email, { activo: !u.activo }, u.activo ? 'Usuario desactivado' : 'Usuario activado');
  },
  async usrReset(el) {
    try { await Api.call('users.resetPassword', { email: el.dataset.email }); UI.toast('Correo de restablecimiento enviado', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  async usrUnlink(el) {
    if (!(await UI.confirm('Desvincular cuenta', 'El perfil se volverá a vincular en su próximo inicio de sesión con el correo verificado. Úsalo si el usuario recreó su cuenta.'))) return;
    updateUser(el.dataset.email, { desvincularUid: true }, 'Cuenta desvinculada');
  },
  async usrDel(el) {
    const email = el.dataset.email;
    if (!(await UI.confirm('Eliminar perfil', 'Se eliminará el acceso de ' + email + ' al CRM.', { danger: true, ok: 'Eliminar' }))) return;
    try {
      await Api.call('users.delete', { email });
      S.users = S.users.filter((u) => u.email !== email);
      renderUsers();
      UI.toast('Perfil eliminado', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); }
  },
});
