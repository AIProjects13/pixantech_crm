'use strict';

/* ============================ PIEZAS DE LEAD ============================= */
function quickActions(x) {
  return '<div class="flex gap-1.5 flex-none">' +
    (x.whatsapp ? '<a class="btn btn-icon btn-sm wa" href="' + esc(waUrl(x.whatsapp)) + '" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp">' + ic('whatsapp') + '</a>' : '') +
    (x.email ? '<a class="btn btn-icon btn-sm ml" href="' + esc(mailUrl(x.email)) + '" target="_blank" rel="noopener" title="Enviar email" aria-label="Email">' + ic('mail') + '</a>' : '') +
    '</div>';
}

function ownerChip(l) {
  if (!l.asignadoA) return '<span class="chip">' + ic('inbox') + ' En la bolsa</span>';
  return '<span class="chip" title="' + esc(l.asignadoA) + '">' + ic('user') + ' ' + esc(Team.nombre(l.asignadoA)) + '</span>';
}

function leadCard(l, canDrag) {
  const due = isDue(l);
  const otro = S.user.isAdmin && l.asignadoA && !Team.esMio(l);
  return '<article class="lead-card glass-soft ' + (due ? 'due' : '') + '" ' + (canDrag ? 'draggable="true"' : '') + ' data-id="' + esc(l.id) + '">' +
    '<div class="flex items-start gap-2 mb-1.5"><h4 class="font-bold text-sm leading-snug flex-1">' + esc(l.nombre) + '</h4>' +
    (otro ? '<span class="w-6 h-6 rounded-lg grid place-items-center text-[10px] font-bold flex-none" style="background:var(--line)" title="' + esc(Team.nombre(l.asignadoA)) + '">' + esc(initials(Team.nombre(l.asignadoA))) + '</span>' : '') +
    (Team.ofertaParaMi(l) || l.transferenciaA ? '<span class="chip text-amber-500" title="Oferta pendiente">' + ic('swap') + '</span>' : '') + '</div>' +
    (l.contacto ? '<p class="text-xs muted truncate mb-2">' + ic('user') + ' ' + esc(l.contacto) + '</p>' : '') +
    '<div class="flex items-center gap-1.5 flex-wrap">' +
    (l.rubro ? '<span class="chip">' + esc(l.rubro) + '</span>' : '') +
    (l.proximo ? '<span class="chip ' + (due ? 'text-rose-500' : '') + '">' + ic('clock') + ' ' + esc(Seg.texto(l.proximo)) + '</span>' : '') +
    (l.notas ? '<span class="chip muted">' + ic('comment') + ' ' + l.notas + '</span>' : '') +
    '<span class="flex-1"></span>' + quickActions(l) + '</div></article>';
}

/* ============================ PANEL DE DETALLE =========================== */
async function openLead(id) {
  Drawer.open('<div class="p-6 space-y-4"><div class="skeleton h-7 w-2/3"></div><div class="skeleton h-4 w-1/3"></div><div class="skeleton h-32 w-full"></div><div class="skeleton h-48 w-full"></div></div>');
  try {
    S.cur = await Api.call('leads.get', { id });
    Drawer.set(drawerHtml(S.cur));
  } catch (e) {
    Drawer.close();
    UI.toast(e.message, 'error');
  }
}

/** Recarga el panel abierto con los datos más recientes del servidor. */
async function reloadDrawer() {
  if (!S.cur) return;
  try { S.cur = await Api.call('leads.get', { id: S.cur.id }); Drawer.set(drawerHtml(S.cur)); }
  catch (e) { Drawer.close(); }
}

function drawerHtml(l) {
  const P = S.user.perms, admin = S.user.isAdmin;
  const puedo = Team.puedoTrabajar(l);
  const bolsa = Team.enBolsa(l), perdido = l.estado === 'Perdido', ganado = l.estado === 'Ganado';
  const ed = P.leads_editar && puedo && !perdido;
  const dis = ed ? '' : 'disabled';
  const due = isDue(l);
  const field = (k, label, type, extra) => '<div class="' + (extra || '') + '"><label class="label">' + label + '</label><input class="input" data-lf="' + k + '" type="' + (type || 'text') + '" value="' + esc(l[k]) + '" ' + dis + '></div>';

  const tl = (l.bitacora || []).slice().reverse().map((n) => {
    const c = n.tipo === 'correo' ? '#6366f1' : n.tipo === 'sistema' ? '#94a3b8' : '#10b981';
    return '<div class="timeline-item pb-4"><span class="tdot" style="background:' + c + '"></span>' +
      '<div class="text-xs muted mb-0.5"><b>' + esc(n.n || n.u) + '</b> · ' + esc(fmtDate(n.t, true)) + '</div>' +
      '<div class="text-sm ' + (n.tipo === 'sistema' ? 'muted' : '') + ' whitespace-pre-wrap break-words">' + esc(n.txt) + '</div></div>';
  }).join('');

  // Avisos según la situación del prospecto
  const avisos = [];
  if (Team.ofertaParaMi(l)) {
    avisos.push('<div class="banner info">' + ic('swap', 'mt-0.5') + '<div class="flex-1"><b>' + esc(Team.nombre(l.transferenciaDe || l.asignadoA)) + '</b> te ofrece este prospecto (va en «' + esc(l.estado) + '»). ¿Lo aceptas?' +
      '<div class="flex gap-2 mt-2"><button class="btn btn-primary btn-sm" data-act="offerYes">' + ic('check') + ' Aceptar</button><button class="btn btn-ghost btn-sm" data-act="offerNo">Rechazar</button></div></div></div>');
  }
  if (bolsa && P.leads_editar) {
    avisos.push('<div class="banner info">' + ic('inbox', 'mt-0.5') + '<div class="flex-1">Este prospecto está <b>en la bolsa</b>: nadie lo trabaja todavía.' +
      '<div class="mt-2"><button class="btn btn-primary btn-sm" data-act="take">' + ic('hand') + ' Tomar este prospecto</button></div></div></div>');
  }
  if (l.transferenciaA && puedo) {
    avisos.push('<div class="banner warn">' + ic('swap', 'mt-0.5') + '<div class="flex-1">Ofrecido a <b>' + esc(Team.nombre(l.transferenciaA)) + '</b>, esperando respuesta.' +
      '<div class="mt-2"><button class="btn btn-ghost btn-sm" data-act="offerCancel">Cancelar oferta</button></div></div></div>');
  }
  if (perdido) {
    const puedeRev = admin || String(l.perdidoPor || '').toLowerCase() === S.user.email;
    avisos.push('<div class="banner danger">' + ic('archive', 'mt-0.5') + '<div class="flex-1"><b>Perdido</b>' + (l.perdidoMotivo ? ': ' + esc(l.perdidoMotivo) : '') +
      '<div class="text-xs muted mt-1">Lo perdió ' + esc(Team.nombre(l.perdidoPor)) + (l.perdidoFecha ? ' el ' + esc(fmtDate(l.perdidoFecha)) : '') +
      '. No se contacta hasta el <b>' + esc(fmtDate(l.revisarEn)) + '</b>; ese día vuelve a la bolsa.</div>' +
      (puedeRev ? '<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-primary btn-sm" data-act="reactivate">' + ic('undo') + ' Reactivar ahora</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="reviewDate">' + ic('cal') + ' Cambiar fecha de revisión</button></div>' : '') + '</div></div>');
  }
  if (ganado) {
    avisos.push('<div class="banner info">' + ic('trophy', 'mt-0.5') + '<div class="flex-1"><b>Cliente ganado.</b> Aquí se llevan sus pagos y recibos.' +
      (P.clientes_ver && puedo ? '<div class="mt-2"><button class="btn btn-primary btn-sm" data-act="openCobros" data-id="' + esc(l.id) + '">' + ic('wallet') + ' Ver cobros y pagos</button></div>' : '') + '</div></div>');
  }

  // Acciones de equipo
  const acciones = [];
  if (puedo && P.leads_editar && !perdido) {
    if (l.asignadoA && !ganado) acciones.push('<button class="btn btn-ghost btn-sm" data-act="release">' + ic('inbox') + ' Soltar a la bolsa</button>');
    if (l.asignadoA) acciones.push('<button class="btn btn-ghost btn-sm" data-act="offer">' + ic('swap') + ' Ofrecer a…</button>');
    if (admin) acciones.push('<button class="btn btn-ghost btn-sm" data-act="assign" data-id="' + esc(l.id) + '">' + ic('users') + ' Reasignar</button>');
    if (!ganado && l.asignadoA) acciones.push('<button class="btn btn-ghost btn-sm text-rose-500" data-act="lose">' + ic('archive') + ' Marcar como perdido</button>');
  }

  // Seguimientos de este prospecto
  const segs = S.seguimientos.filter((s) => s.idLead === l.id && !s.hecho).sort(cmpSeg);
  const segHtml = !puedo || perdido ? '' :
    '<div class="glass-soft p-4"><div class="flex items-center justify-between mb-2"><h4 class="font-bold">Seguimientos</h4>' +
    '<button class="btn btn-ghost btn-sm" data-act="segNew" data-id="' + esc(l.id) + '">' + ic('plus') + ' Agendar</button></div>' +
    (segs.length ? segs.map((s) => '<div class="ev-row"><div class="ev-time">' + esc(s.hora) + '</div><div class="min-w-0 flex-1">' +
      '<div class="text-sm font-semibold ' + (s.fecha < S.hoy ? 'text-rose-500' : '') + '">' + ic(TIPO_ICON[s.tipo] || 'clock') + ' ' + esc(s.tipo) + ' · ' + esc(s.fecha === S.hoy ? 'Hoy' : fmtDate(s.fecha)) + '</div>' +
      (s.nota ? '<div class="text-xs muted break-words">' + esc(s.nota) + '</div>' : '') + '</div>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-act="segDone" data-id="' + esc(s.id) + '" title="Marcar como hecho" aria-label="Hecho">' + ic('check') + '</button></div>').join('')
      : '<p class="text-sm muted">Sin seguimientos pendientes.</p>') + '</div>';

  const tplOpts = S.plantillas.map((t) => '<option value="' + esc(t.id) + '" ' + (t.activa ? 'selected' : '') + '>' + esc(t.nombre) + '</option>').join('');

  return '<div class="flex items-start gap-3 p-5 border-b hairline">' +
    '<div class="w-12 h-12 rounded-2xl grid place-items-center font-bold text-white flex-none" style="background:linear-gradient(135deg,var(--rail),var(--accent))">' + esc(initials(l.nombre)) + '</div>' +
    '<div class="min-w-0 flex-1"><h3 class="text-lg font-extrabold leading-tight break-words">' + esc(l.nombre) + '</h3>' +
    '<div class="flex items-center gap-2 mt-1 flex-wrap">' + UI.estadoChip(l.estado) + ownerChip(l) +
    (due ? '<span class="chip text-rose-500">' + ic('bell') + ' Seguimiento pendiente</span>' : '') + '</div></div>' +
    '<button class="btn btn-ghost btn-icon" data-act="closeDrawer" aria-label="Cerrar">' + ic('x') + '</button></div>' +

    '<div class="flex-1 overflow-y-auto scroll-thin p-5 space-y-4">' + avisos.join('') +
    '<div class="flex flex-wrap gap-2">' +
    (l.whatsapp ? '<a class="btn btn-sm wa" href="' + esc(waUrl(l.whatsapp)) + '" target="_blank" rel="noopener">' + ic('whatsapp') + ' WhatsApp</a>' : '') +
    (l.email ? '<a class="btn btn-sm ml" href="' + esc(mailUrl(l.email)) + '" target="_blank" rel="noopener">' + ic('mail') + ' Email</a>' : '') +
    (safeUrl(l.web) ? '<a class="btn btn-sm btn-ghost" href="' + esc(l.web) + '" target="_blank" rel="noopener">' + ic('globe') + ' Sitio web</a>' : '') +
    acciones.join('') + '</div>' +

    (ed && !ganado ? '<div><label class="label">Paso del proceso</label><select class="input font-semibold" id="dEstado">' +
      S.estados.filter((e) => e !== 'Perdido' && e !== 'Ganado' || e === l.estado).map((e) => '<option ' + (e === l.estado ? 'selected' : '') + '>' + esc(e) + '</option>').join('') +
      '<option value="Ganado">Ganado (pasa a Clientes)</option></select></div>' : '') +

    segHtml +

    (P.correo_enviar && l.email && ed && S.plantillas.length ? '<div class="glass-soft p-3 flex flex-wrap items-center gap-2">' + ic('send', 'text-indigo-500') + '<span class="text-sm font-semibold">Enviar plantilla</span>' +
      '<select id="dTpl" class="input !w-auto flex-1 !py-1.5 text-sm">' + tplOpts + '</select><button class="btn btn-primary btn-sm" data-act="sendTpl">Enviar</button></div>' : '') +

    '<details ' + (bolsa ? '' : 'open') + ' class="glass-soft p-4"><summary class="font-bold cursor-pointer select-none">Datos de la empresa</summary><div class="grid grid-cols-2 gap-3 mt-4">' +
    field('nombre', 'Empresa', 'text', 'col-span-2') + field('contacto', 'Contacto') + field('email', 'Email', 'email') + field('telefono', 'Teléfono', 'tel') + field('web', 'Sitio web', 'url') +
    field('rubro', 'Rubro') + field('colores', 'Colores de marca') + field('pais', 'País') + field('region', 'Región') +
    '<div class="text-xs muted col-span-2">Creado ' + esc(fmtDate(l.fechaCreacion)) + (l.creadoPor ? ' por ' + esc(Team.nombre(l.creadoPor)) : '') +
    (l.tomadoEn ? ' · tomado el ' + esc(fmtDate(l.tomadoEn)) : '') + '</div></div>' +
    (ed ? '<div class="flex justify-end mt-4"><button class="btn btn-primary btn-sm" data-act="saveLead">' + ic('save') + ' Guardar cambios</button></div>' : '') + '</details>' +

    '<div><h4 class="font-bold mb-3">Bitácora</h4>' +
    ((ed || (perdido && P.leads_editar)) ? '<div class="flex gap-2 mb-5"><textarea id="dNote" class="input" rows="2" maxlength="2000" placeholder="' + (perdido ? 'Deja una nota sobre este prospecto perdido…' : 'Escribe una nota de seguimiento…') + '"></textarea>' +
      '<button class="btn btn-primary self-end" data-act="addNote" aria-label="Agregar nota">' + ic('send') + '</button></div>' : '') +
    (tl || '<p class="text-sm muted">Sin notas todavía.</p>') + '</div>' +
    '</div>' +
    (P.leads_eliminar && puedo ? '<div class="p-4 border-t hairline flex justify-end"><button class="btn btn-ghost btn-sm text-rose-500" data-act="delLead">' + ic('trash') + ' Eliminar prospecto</button></div>' : '');
}

/* ============================ NUEVO PROSPECTO ============================ */
function leadFormModal() {
  const f = (k, label, type, req, span) => '<div class="' + (span || '') + '"><label class="label">' + label + (req ? ' *' : '') + '</label><input class="input" name="' + k + '" type="' + (type || 'text') + '" ' + (req ? 'required' : '') + '></div>';
  const admin = S.user.isAdmin;
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-extrabold">Nuevo prospecto</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<form id="nlForm" class="grid grid-cols-2 gap-3">' +
    f('nombre', 'Empresa', 'text', true, 'col-span-2') + f('contacto', 'Contacto') + f('email', 'Email', 'email') + f('telefono', 'Teléfono', 'tel') + f('web', 'Sitio web') +
    f('rubro', 'Rubro') + f('colores', 'Colores de marca') + f('pais', 'País') + f('region', 'Región') +
    (admin ? '<div class="col-span-2"><label class="label">Quién lo lleva</label><select class="input" name="asignadoA"><option value="">Yo</option><option value="__bolsa">Dejarlo en la bolsa (sin responsable)</option>' +
      S.usuariosAsignables.filter((u) => u.email !== S.user.email).map((u) => '<option value="' + esc(u.email) + '">' + esc(u.nombre || u.email) + '</option>').join('') + '</select></div>' : '') +
    '<p class="col-span-2 text-xs muted">Se registra a tu nombre y empieza en «Primer Contacto». Si ya existe uno con el mismo email o teléfono, no se crea (evita duplicados).</p>' +
    '<div id="nlErr" class="col-span-2 text-sm text-rose-500" hidden></div>' +
    '<div class="col-span-2 flex justify-end gap-2 mt-2"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="nlBtn">' + ic('plus') + ' Crear</button></div></form>',
    { wide: true });
  $('#nlForm', m.el).pais.value = 'Guatemala';
  $('#nlForm', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    UI.busy($('#nlBtn', m.el), true, 'Creando…');
    try {
      const l = await Api.call('leads.create', data);
      upsertLead(l); m.close(); refreshView();
      UI.toast('Prospecto creado', 'ok');
    } catch (err) {
      const box = $('#nlErr', m.el); box.textContent = err.message; box.hidden = false;
      UI.busy($('#nlBtn', m.el), false);
    }
  });
}

/* ============================ MODALES DE EQUIPO ========================== */
const MOTIVOS_PERDIDA = ['Precio muy alto', 'No le interesa', 'Ya tiene proveedor', 'Sin presupuesto por ahora', 'No contestó / sin respuesta', 'Cerró el negocio', 'Otro'];

function loseModal(id) {
  const l = S.leads.find((x) => x.id === id) || S.cur;
  const hoy = S.hoy;
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold">Marcar como perdido</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<p class="text-sm muted mb-4"><b>' + esc(l ? l.nombre : '') + '</b> pasa a Perdidos y no se vuelve a contactar hasta la fecha de revisión; ese día regresa a la bolsa para que cualquiera lo tome.</p>' +
    '<form id="lsForm" class="space-y-3">' +
    '<div><label class="label">Motivo *</label><select class="input" id="lsMot">' + MOTIVOS_PERDIDA.map((x) => '<option>' + esc(x) + '</option>').join('') + '</select></div>' +
    '<div id="lsOtroBox" hidden><label class="label">Escribe el motivo *</label><input class="input" id="lsOtro" maxlength="200"></div>' +
    '<div><label class="label">Volver a considerarlo el *</label><input type="date" class="input" id="lsFecha" min="' + esc(Cobros.addDays(hoy, 1)) + '" value="' + esc(Cobros.addDays(hoy, 90)) + '">' +
    '<div class="flex gap-2 mt-2">' + [30, 60, 90, 180, 365].map((d) => '<button type="button" class="chip hover:border-indigo-400" data-plus="' + d + '">+' + d + ' días</button>').join('') + '</div></div>' +
    '<div><label class="label">Nota (qué pasó, qué pidió)</label><textarea class="input" id="lsNota" rows="3" maxlength="1000"></textarea></div>' +
    '<div id="lsErr" class="text-sm text-rose-500" hidden></div>' +
    '<div class="flex justify-end gap-2 pt-1"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="lsBtn">' + ic('archive') + ' Pasar a Perdidos</button></div></form>');
  const mot = $('#lsMot', m.el);
  mot.addEventListener('change', () => { $('#lsOtroBox', m.el).hidden = mot.value !== 'Otro'; });
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-plus]'); if (b) $('#lsFecha', m.el).value = Cobros.addDays(hoy, Number(b.dataset.plus)); });
  $('#lsForm', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivo = mot.value === 'Otro' ? $('#lsOtro', m.el).value.trim() : mot.value;
    const err = $('#lsErr', m.el);
    if (!motivo) { err.textContent = 'Escribe el motivo.'; err.hidden = false; return; }
    UI.busy($('#lsBtn', m.el), true, 'Guardando…');
    try {
      const r = await Api.call('leads.lose', { id, motivo, revisarEn: $('#lsFecha', m.el).value, nota: $('#lsNota', m.el).value.trim() });
      upsertLead(r); m.close(); Drawer.close(); refreshView();
      UI.toast('Pasó a Perdidos. Volverá a la bolsa el ' + fmtDate(r.revisarEn), 'ok');
    } catch (ex) { err.textContent = ex.message; err.hidden = false; UI.busy($('#lsBtn', m.el), false); }
  });
}

function offerModal(id) {
  const l = S.leads.find((x) => x.id === id) || S.cur;
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold">Ofrecer prospecto</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<p class="text-sm muted mb-4">Se lo ofreces a otra persona del equipo. <b>Sigue siendo tuyo</b> hasta que acepte, y si lo acepta lo trabaja desde el paso donde va («' + esc(l ? l.estado : '') + '»).</p>' +
    '<div class="mb-4"><label class="label">¿A quién?</label>' + pickerHtml('ofTo', 'Buscar persona…') + '</div>' +
    '<div id="ofErr" class="text-sm text-rose-500 mb-2" hidden></div>' +
    '<div class="flex justify-end gap-2"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ofBtn">' + ic('swap') + ' Ofrecer</button></div>');
  pickerMount('ofTo', () => S.usuariosAsignables.filter((u) => u.email !== String(l.asignadoA || '').toLowerCase()).map((u) => ({ id: u.email, titulo: u.nombre || u.email, sub: u.email })));
  $('#ofBtn', m.el).addEventListener('click', async () => {
    const to = $('#ofTo', m.el).value;
    const err = $('#ofErr', m.el);
    if (!to) { err.textContent = 'Elige a una persona de la lista.'; err.hidden = false; return; }
    UI.busy($('#ofBtn', m.el), true, 'Ofreciendo…');
    try {
      upsertLead(await Api.call('leads.offer', { id, to }));
      m.close(); refreshView(); await reloadDrawer();
      UI.toast('Oferta enviada a ' + Team.nombre(to), 'ok');
    } catch (ex) { err.textContent = ex.message; err.hidden = false; UI.busy($('#ofBtn', m.el), false); }
  });
}

/** Solo el administrador: pasa uno o varios prospectos a una persona o a la bolsa. */
function assignModal(ids) {
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold">Reasignar ' + (ids.length > 1 ? ids.length + ' prospectos' : 'prospecto') + '</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<div class="mb-4"><label class="label">Pasar a</label><select class="input" id="asTo"><option value="">Bolsa (sin responsable)</option>' +
    S.usuariosAsignables.map((u) => '<option value="' + esc(u.email) + '">' + esc(u.nombre || u.email) + '</option>').join('') + '</select></div>' +
    '<div id="asErr" class="text-sm text-rose-500 mb-2" hidden></div>' +
    '<div class="flex justify-end gap-2"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="asBtn">' + ic('users') + ' Reasignar</button></div>');
  $('#asBtn', m.el).addEventListener('click', async () => {
    const email = $('#asTo', m.el).value;
    UI.busy($('#asBtn', m.el), true, 'Guardando…');
    try {
      const r = await Api.call('leads.assign', { ids, email });
      r.forEach(upsertLead);
      m.close(); Drawer.close(); S.sel = new Set(); refreshView();
      UI.toast(ids.length + (ids.length > 1 ? ' prospectos pasaron' : ' prospecto pasó') + ' a ' + (email ? Team.nombre(email) : 'la bolsa'), 'ok');
    } catch (ex) { const b = $('#asErr', m.el); b.textContent = ex.message; b.hidden = false; UI.busy($('#asBtn', m.el), false); }
  });
}

/** Alta o edición de un seguimiento con fecha y hora. opts: {idLead?, seg?, fecha?} */
function segModal(opts) {
  opts = opts || {};
  const seg = opts.seg || null;
  const mias = () => S.leads.filter((l) => Team.puedoTrabajar(l) && l.asignadoA && !CERRADOS.includes(l.estado) || (l.estado === 'Ganado' && Team.puedoTrabajar(l)));
  const fijo = opts.idLead ? S.leads.find((l) => l.id === opts.idLead) : null;
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold">' + (seg ? 'Editar seguimiento' : 'Agendar seguimiento') + '</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<form id="sgForm" class="space-y-3">' +
    '<div><label class="label">Prospecto *</label>' + (fijo || seg ? '<div class="input" style="opacity:.85">' + esc((fijo || S.leads.find((l) => l.id === seg.idLead) || {}).nombre || seg.nombreLead || '') + '</div>' : pickerHtml('sgLead', 'Buscar por nombre…')) + '</div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="label">Fecha *</label><input type="date" class="input" id="sgFecha" required value="' + esc(seg ? seg.fecha : opts.fecha || S.hoy) + '"></div>' +
    '<div><label class="label">Hora *</label><input type="time" class="input" id="sgHora" required value="' + esc(seg ? seg.hora : '09:00') + '"></div></div>' +
    '<div><label class="label">Tipo *</label><select class="input" id="sgTipo">' + TIPOS_SEGUIMIENTO.map((t) => '<option ' + (seg && seg.tipo === t ? 'selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></div>' +
    '<div><label class="label">Nota</label><textarea class="input" id="sgNota" rows="2" maxlength="500" placeholder="¿Qué se va a tratar?">' + esc(seg ? seg.nota : '') + '</textarea></div>' +
    '<div id="sgErr" class="text-sm text-rose-500" hidden></div>' +
    '<div class="flex justify-end gap-2 pt-1"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="sgBtn">' + ic('save') + ' Guardar</button></div></form>');
  if (!fijo && !seg) pickerMount('sgLead', () => mias().map((l) => ({ id: l.id, titulo: l.nombre, sub: [l.rubro, l.estado].filter(Boolean).join(' · ') })));
  $('#sgForm', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#sgErr', m.el);
    const idLead = seg ? seg.idLead : fijo ? fijo.id : $('#sgLead', m.el).value;
    if (!idLead) { err.textContent = 'Elige un prospecto de la lista.'; err.hidden = false; return; }
    const data = { fecha: $('#sgFecha', m.el).value, hora: $('#sgHora', m.el).value, tipo: $('#sgTipo', m.el).value, nota: $('#sgNota', m.el).value.trim() };
    UI.busy($('#sgBtn', m.el), true, 'Guardando…');
    try {
      const r = seg ? await Api.call('seguimientos.update', Object.assign({ id: seg.id }, data)) : await Api.call('seguimientos.create', Object.assign({ idLead }, data));
      Seg.upsert(r); m.close(); refreshView();
      if (S.cur && S.cur.id === idLead) reloadDrawer();
      UI.toast(seg ? 'Seguimiento actualizado' : 'Seguimiento agendado para ' + Seg.texto(r).toLowerCase(), 'ok');
    } catch (ex) { err.textContent = ex.message; err.hidden = false; UI.busy($('#sgBtn', m.el), false); }
  });
}

/* ============================ DRAG & DROP ================================ */
const DnD = {
  id: null,
  init() {
    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest && e.target.closest('.lead-card[draggable]');
      if (!card) return;
      DnD.id = card.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', DnD.id);
      requestAnimationFrame(() => card.classList.add('dragging'));
    });
    document.addEventListener('dragend', () => { $$('.dragging').forEach((c) => c.classList.remove('dragging')); $$('[data-drop].over').forEach((c) => c.classList.remove('over')); DnD.id = null; });
    document.addEventListener('dragover', (e) => {
      const col = e.target.closest && e.target.closest('[data-drop]');
      if (!col || !DnD.id) return;
      e.preventDefault();
      if (!col.classList.contains('over')) { $$('[data-drop].over').forEach((c) => c.classList.remove('over')); col.classList.add('over'); }
    });
    document.addEventListener('drop', (e) => {
      const col = e.target.closest && e.target.closest('[data-drop]');
      if (!col || !DnD.id) return;
      e.preventDefault();
      const id = DnD.id; DnD.id = null;
      col.classList.remove('over');
      moveLead(id, col.dataset.drop);
    });
  },
};

/** Movimiento optimista: la pantalla cambia al instante y se revierte si el servidor no lo permite. */
async function moveLead(id, estado) {
  const l = S.leads.find((x) => x.id === id);
  if (!l || l.estado === estado) return;
  if (estado === 'Perdido') { loseModal(id); return; }
  const prev = l.estado;
  l.estado = estado;
  refreshView();
  try {
    const r = await Api.call('leads.move', { id, estado });
    upsertLead(r);
    if (r.clienteCreado) {
      UI.toast('🎉 ' + r.nombre + ' ahora es cliente. Define su plan de cobro en Clientes.', 'ok');
      Api.call('clientes.list').then((c) => { S.clientes = c; refreshView(); }).catch(() => {});
    }
    if (S.cur && S.cur.id === id) reloadDrawer();
    refreshView();
  } catch (e) {
    l.estado = prev;
    refreshView();
    UI.toast(e.message, 'error');
  }
}

/* ================================ ACCIONES =============================== */
Object.assign(Actions, {
  closeDrawer: () => Drawer.close(),
  newLead: () => leadFormModal(),
  openLead: (el) => openLead(el.dataset.id),

  async take(el) {
    const id = (el && el.dataset && el.dataset.id) || (S.cur && S.cur.id);
    UI.busy(el, true, 'Tomando…');
    try {
      const r = await Api.call('leads.take', { id });
      upsertLead(r); refreshView();
      if (S.cur && S.cur.id === id) await reloadDrawer();
      UI.toast('Ahora este prospecto es tuyo. Lo ves en Mi pipeline.', 'ok');
    } catch (e) {
      UI.toast(e.message, 'error');
      UI.busy(el, false);
      if (e.code === 'CONFLICT') { await App.load(); if (S.cur) reloadDrawer(); }
    }
  },
  async release(el) {
    if (!(await UI.confirm('Soltar a la bolsa', 'El prospecto queda sin responsable y cualquiera del equipo podrá tomarlo, en el paso donde va.', { ok: 'Soltar' }))) return;
    try { upsertLead(await Api.call('leads.release', { id: S.cur.id })); refreshView(); await reloadDrawer(); UI.toast('Devuelto a la bolsa', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  offer: () => offerModal(S.cur.id),
  async offerCancel() {
    try { upsertLead(await Api.call('leads.offer', { id: S.cur.id, to: '' })); refreshView(); await reloadDrawer(); UI.toast('Oferta cancelada', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  offerYes: () => respondOffer(true),
  offerNo: () => respondOffer(false),
  assign: (el) => assignModal([el.dataset.id || S.cur.id]),
  lose: () => loseModal(S.cur.id),
  async reactivate() {
    if (!(await UI.confirm('Reactivar prospecto', 'Vuelve a la bolsa, libre para que cualquiera lo tome.', { ok: 'Reactivar' }))) return;
    try { upsertLead(await Api.call('leads.reactivate', { id: S.cur.id })); refreshView(); await reloadDrawer(); UI.toast('Regresó a la bolsa', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  async reviewDate() {
    const v = await UI.prompt('Fecha de revisión', 'Nueva fecha (AAAA-MM-DD)', S.cur.revisarEn || '');
    if (!v) return;
    try { upsertLead(await Api.call('leads.setReview', { id: S.cur.id, revisarEn: v })); refreshView(); await reloadDrawer(); UI.toast('Fecha de revisión actualizada', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },

  segNew: (el) => segModal({ idLead: el && el.dataset.id }),
  async segDone(el) {
    try { Seg.upsert(await Api.call('seguimientos.done', { id: el.dataset.id, hecho: true })); refreshView(); if (S.cur) reloadDrawer(); UI.toast('Seguimiento completado', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },

  async saveLead(el) {
    const l = S.cur, fields = {};
    $$('[data-lf]', $('#drawer')).forEach((i) => { const k = i.dataset.lf; const v = i.value.trim(); if (String(l[k] || '') !== v) fields[k] = v; });
    if (!Object.keys(fields).length) { UI.toast('No hay cambios'); return; }
    UI.busy(el, true, 'Guardando…');
    try {
      const r = await Api.call('leads.update', { id: l.id, fields });
      upsertLead(r); refreshView(); openLead(l.id);
      UI.toast('Cambios guardados', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },
  async addNote(el) {
    const ta = $('#dNote');
    const texto = ta.value.trim();
    if (!texto) return;
    UI.busy(el, true, '');
    try {
      const r = await Api.call('leads.addNote', { id: S.cur.id, texto });
      S.cur = r;
      upsertLead(Object.assign({}, r, { notas: r.bitacora.length, bitacora: undefined }));
      Drawer.set(drawerHtml(r)); refreshView();
    } catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },
  async sendTpl(el) {
    const tpl = $('#dTpl').value;
    if (!(await UI.confirm('Enviar correo', 'Se enviará la plantilla a ' + S.cur.email + '.', { ok: 'Enviar' }))) return;
    UI.busy(el, true, 'Enviando…');
    try {
      const r = await Api.call('leads.sendEmail', { id: S.cur.id, plantillaId: tpl });
      upsertLead(r); refreshView(); openLead(r.id);
      UI.toast('Correo enviado', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },
  async delLead() {
    const l = S.cur;
    if (!(await UI.confirm('Eliminar prospecto', 'Se eliminará "' + l.nombre + '" y su registro de cliente si existe. Esta acción no se puede deshacer.', { danger: true, ok: 'Eliminar' }))) return;
    try {
      await Api.call('leads.delete', { id: l.id });
      S.leads = S.leads.filter((x) => x.id !== l.id);
      S.clientes = S.clientes.filter((c) => c.idLead !== l.id);
      S.seguimientos = S.seguimientos.filter((s) => s.idLead !== l.id);
      Drawer.close(); refreshView();
      UI.toast('Prospecto eliminado', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); }
  },
});

async function respondOffer(accept) {
  try {
    const r = await Api.call('leads.respond', { id: S.cur.id, accept });
    upsertLead(r); refreshView();
    if (accept) { await reloadDrawer(); UI.toast('Aceptaste el prospecto. Está en tu pipeline.', 'ok'); }
    else { Drawer.close(); S.leads = S.leads.filter((l) => l.id !== r.id || Team.puedoTrabajar(l) || Team.enBolsa(l)); refreshView(); UI.toast('Rechazaste la oferta', 'ok'); }
  } catch (e) { UI.toast(e.message, 'error'); }
}
