'use strict';

/* ======================= CLIENTES, COBROS Y PAGOS ========================= */
// Un cliente ganado tiene un plan (pago inicial opcional + mensualidad o anualidad). Cada pago cubre UNA cuota.
// Quien registra un pago decide si enviar el recibo por correo o por WhatsApp.

const Cli = { cur: null }; // cliente abierto: { idLead, plan, pagos, status }

const cobroPill = (st) => '<span class="pill" style="--c:' + COBRO_META[st.estado] + '">' +
  (st.estado === 'Vencido' ? 'Vencido hace ' + st.dias + (st.dias === 1 ? ' día' : ' días')
    : st.estado === 'Por vencer' ? (st.dias === 0 ? 'Vence hoy' : 'Vence en ' + st.dias + (st.dias === 1 ? ' día' : ' días'))
    : st.estado === 'Al día' ? 'Al día' : st.estado === 'Inactivo' ? 'Inactivo' : 'Sin plan') + '</span>';

Object.assign(Views, {
  clientes() {
    const C = S.clientes, admin = S.user.isAdmin;
    const por = (e) => C.filter((c) => c.cobro && c.cobro.estado === e);
    const deuda = por('Vencido').reduce((s, c) => s + c.cobro.siguiente.monto * c.cobro.vencidas, 0);
    const cur = Table.state('cli', { k: 'estado', dir: 1 }).f.estadoCobro || '';
    const mini = (e, label, extra) =>
      '<button class="glass p-4 text-left transition hover:-translate-y-0.5 ' + (cur === e ? 'ring-2 ring-indigo-400' : '') + '" data-act="cliFiltro" data-f="' + esc(e) + '">' +
      '<div class="flex items-center gap-2 text-xs font-bold muted uppercase tracking-wide"><span class="dot" style="background:' + COBRO_META[e] + '"></span>' + label + '</div>' +
      '<div class="text-2xl font-extrabold mt-2">' + por(e).length + '</div><div class="text-xs muted">' + extra + '</div></button>';
    const filters = [
      { k: 'estadoCobro', label: 'Cobro', get: (c) => c.cobro.estado },
      { k: 'rubro', label: 'Rubro', get: (c) => c.rubro },
      { k: 'plan', label: 'Plan', get: (c) => c.frecuencia || 'Sin plan' },
    ];
    if (admin) filters.push({ k: 'asignadoA', label: 'Responsable', get: (c) => Team.nombre(c.asignadoA) });
    return '<div class="grid gap-4 grid-cols-2 xl:grid-cols-4 mb-5">' +
      mini('Vencido', 'Vencidos', deuda ? esc(money(deuda)) + ' por cobrar' : 'Nada vencido') +
      mini('Por vencer', 'Por vencer (7 días)', 'Cobros próximos') +
      mini('Al día', 'Al día', 'Sin pendientes por ahora') +
      mini('Sin plan', 'Sin plan de cobro', 'Define monto y fecha') + '</div>' +
      Table.html('cli', {
        name: 'clientes', minW: 1040, placeholder: 'Buscar cliente, contacto o email…',
        initSort: { k: 'estado', dir: 1 },
        cols: [
          { k: 'nombre', label: 'Cliente', sort: (c) => c.nombre },
          { k: 'plan', label: 'Plan', sort: (c) => Number(c.montoCobro || 0), w: '170px' },
          { k: 'siguiente', label: 'Próxima cuota', sort: (c) => (c.cobro.siguiente ? c.cobro.siguiente.key : ''), w: '170px' },
          { k: 'estado', label: 'Estado de cobro', sort: (c) => ['Vencido', 'Por vencer', 'Al día', 'Sin plan', 'Inactivo'].indexOf(c.cobro.estado) * 100000 - c.cobro.dias, w: '190px' },
          { k: 'contacto', label: 'Contacto', sort: (c) => c.contacto },
          { k: 'owner', label: 'Responsable', sort: (c) => Team.nombre(c.asignadoA), w: '140px' },
          { k: 'acc', label: '', w: '90px' },
        ],
        filters: filters,
        rows: () => S.clientes,
        search: (c) => [c.nombre, c.contacto, c.email, c.telefono, c.rubro].join(' '),
        empty: UI.empty('fa-building-circle-check', 'Sin clientes', 'Los prospectos que pasan a «Ganado» aparecen aquí.'),
        row: (c) => '<tr class="cursor-pointer" data-act="openCobros" data-id="' + esc(c.idLead) + '">' +
          '<td><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-xl grid place-items-center text-xs font-bold text-white flex-none" style="background:linear-gradient(135deg,#10b981,#06b6d4)">' + esc(initials(c.nombre)) + '</div>' +
          '<div class="min-w-0"><div class="font-semibold truncate">' + esc(c.nombre) + '</div><div class="text-xs muted truncate">' + esc(c.rubro) + '</div></div></div></td>' +
          '<td class="text-sm">' + (c.frecuencia ? '<b>' + esc(money(c.montoCobro)) + '</b> <span class="muted">' + esc(c.frecuencia.toLowerCase()) + '</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td class="text-sm">' + (c.cobro.siguiente ? esc(c.cobro.siguiente.concepto) + '<div class="text-xs muted">' + esc(fmtDate(c.cobro.siguiente.key)) + '</div>' : '<span class="muted">—</span>') + '</td>' +
          '<td>' + cobroPill(c.cobro) + '</td>' +
          '<td><div class="truncate">' + esc(c.contacto || '—') + '</div><div class="text-xs muted truncate">' + esc(c.email) + '</div></td>' +
          '<td class="text-xs muted">' + esc(Team.nombre(c.asignadoA)) + '</td>' +
          '<td>' + quickActions(c) + '</td></tr>',
        exp: [
          ['id_lead', (c) => c.idLead], ['cliente', (c) => c.nombre], ['rubro', (c) => c.rubro], ['contacto', (c) => c.contacto], ['email', (c) => c.email], ['telefono', (c) => c.telefono],
          ['frecuencia', (c) => c.frecuencia], ['monto_cuota', (c) => Number(c.montoCobro || 0)], ['inicio_cobro', (c) => c.inicioCobro],
          ['estado_cobro', (c) => c.cobro.estado], ['dias', (c) => c.cobro.dias], ['proxima_cuota', (c) => (c.cobro.siguiente ? c.cobro.siguiente.key : '')],
          ['cliente_desde', (c) => c.fechaAlta], ['responsable', (c) => c.asignadoA],
        ],
      });
  },
  clientesMount() { Table.body('cli'); },
});

/* ============================ PANEL DEL CLIENTE =========================== */
async function openCliente(id) {
  Drawer.open('<div class="p-6 space-y-4"><div class="skeleton h-7 w-2/3"></div><div class="skeleton h-4 w-1/3"></div><div class="skeleton h-40 w-full"></div><div class="skeleton h-48 w-full"></div></div>');
  try {
    Cli.cur = Object.assign({ idLead: id }, await Api.call('pagos.list', { idLead: id }));
    S.cur = null;
    Drawer.set(clienteHtml());
  } catch (e) { Drawer.close(); UI.toast(e.message, 'error'); }
}

/** Recarga pagos y estado del cliente abierto y la lista de clientes. */
async function reloadCliente() {
  if (!Cli.cur) return;
  try {
    const [d, c] = await Promise.all([Api.call('pagos.list', { idLead: Cli.cur.idLead }), Api.call('clientes.list')]);
    Cli.cur = Object.assign({ idLead: Cli.cur.idLead }, d);
    S.clientes = c;
    if (Drawer.isOpen() && Cli.cur) Drawer.set(clienteHtml());
    refreshView();
  } catch (e) { UI.toast(e.message, 'error'); }
}

const clienteDe = (id) => S.clientes.find((c) => c.idLead === id) || {};

/** Cuotas del plan con su estado (pagada / vencida / pendiente), listas para mostrar. */
function cuotasView(d) {
  const plan = Cobros.planDe(d.plan);
  const pagos = d.pagos.filter((p) => !p.anulado);
  const porKey = {};
  pagos.forEach((p) => { porKey[p.cubre] = p; });
  const items = Cobros.schedule(plan, S.hoy, 120);
  const pagadas = items.filter((x) => porKey[x.key]);
  const pend = items.filter((x) => !porKey[x.key]);
  return { items, pagadas, pend, porKey };
}

function clienteHtml() {
  const d = Cli.cur, c = clienteDe(d.idLead), P = d.plan || {};
  const plan = Cobros.planDe(P);
  const inactivo = P.activo === false;
  const st = inactivo ? { estado: 'Inactivo', dias: 0, siguiente: null, vencidas: 0 } : Cobros.status(plan, d.pagos, S.hoy);
  const tiene = Cobros.schedule(plan, S.hoy, 0).length > 0;
  const cv = cuotasView(d);
  const fld = (label, inner, span) => '<div class="' + (span || '') + '"><label class="label">' + label + '</label>' + inner + '</div>';

  const planForm = '<div class="glass-soft p-4"><div class="flex items-center justify-between mb-3"><h4 class="font-bold">Plan de cobro</h4>' +
    (tiene ? cobroPill(st) : '<span class="chip text-amber-500">' + ic('alert') + ' Sin definir</span>') + '</div>' +
    '<div class="grid grid-cols-2 gap-3">' +
    fld('Frecuencia', '<select class="input" id="pnFrec">' + '<option value="">Elige…</option>' + FRECUENCIAS.map((f) => '<option ' + (P.frecuencia === f ? 'selected' : '') + '>' + f + '</option>').join('') + '</select>') +
    fld('Monto de la cuota (Q)', '<input class="input" id="pnMonto" type="number" min="0" step="0.01" value="' + esc(P.montoCobro || '') + '">') +
    fld('Primera cuota vence el', '<input class="input" id="pnInicio" type="date" value="' + esc(P.inicioCobro || '') + '">') +
    fld('Pago inicial (opcional)', '<input class="input" id="pnIniMonto" type="number" min="0" step="0.01" placeholder="Q 0.00" value="' + esc(P.pagoInicialMonto || '') + '">') +
    fld('Fecha del pago inicial', '<input class="input" id="pnIniFecha" type="date" value="' + esc(P.pagoInicialFecha || '') + '">') +
    fld('Notas', '<input class="input" id="pnNotas" maxlength="500" value="' + esc(P.notasCobro || '') + '">') +
    '</div>' + (d.pagos.some((p) => !p.anulado) && tiene ? '<p class="text-xs muted mt-2">Si cambias fechas, los pagos ya registrados siguen en el historial pero solo cubren cuotas que coincidan con la nueva fecha.</p>' : '') +
    '<div class="flex justify-end mt-3"><button class="btn btn-primary btn-sm" data-act="planSave">' + ic('save') + ' Guardar plan</button></div></div>';

  // Comisión del cliente: quién la cobra y cuánto sale por cuota; el administrador la ajusta y activa o desactiva al cliente.
  const admin = S.user.isAdmin, pct = c.comisionPct == null ? S.comisionDefecto : c.comisionPct;
  const porCuota = Math.round((plan.monto || 0) * pct) / 100;
  const acred = Comision.porAcreditar(Object.assign({}, c, { cobro: st, activo: !inactivo }));
  const inactBanner = inactivo
    ? '<div class="banner danger">' + ic('ban', 'mt-0.5') + '<div class="flex-1"><b>Cliente inactivo (cancelado).</b> No cobra ni genera comisión' + (P.motivoInactivo ? ': ' + esc(P.motivoInactivo) : '') + '.' +
      (admin ? '<div class="mt-2"><button class="btn btn-primary btn-sm" data-act="cliActive">' + ic('undo') + ' Reactivar cliente</button></div>' : '') + '</div></div>' : '';
  const comCard = '<div class="glass-soft p-4"><div class="flex items-center justify-between mb-2"><h4 class="font-bold">' + ic('trophy') + ' Comisión</h4>' +
    '<span class="chip">' + esc(pct) + ' %</span></div>' +
    '<p class="text-sm">La cobra <b>' + esc(Team.nombre(c.comisionPara) || 'nadie (sin responsable)') + '</b>' + (tiene ? ': ' + esc(money2(porCuota)) + ' por cada cuota pagada' : '') + '.</p>' +
    (acred ? '<p class="text-xs text-amber-600 mt-1">' + ic('clock') + ' Por acreditar: ' + esc(money2(acred)) + ' (cuotas vencidas). Se acredita cuando su pago quede registrado.</p>' : '') +
    (admin ? '<div class="flex flex-wrap items-end gap-2 mt-3"><div class="flex-1 min-w-[130px]"><label class="label">Cambiar % (vacío = ' + esc(S.comisionDefecto) + ' % por defecto)</label>' +
      '<input class="input" id="cmCli" type="number" min="0" max="100" step="0.5" value="' + esc(c.comisionPct == null ? '' : c.comisionPct) + '"></div>' +
      '<button class="btn btn-primary btn-sm" data-act="cmSaveCli">' + ic('save') + ' Guardar</button>' +
      (inactivo ? '' : '<button class="btn btn-ghost btn-sm text-rose-500" data-act="cliInactive">' + ic('ban') + ' Marcar inactivo</button>') + '</div>' : '') + '</div>';

  const cuotas = !tiene || inactivo ? '' :
    '<div class="glass-soft p-4"><div class="flex items-center justify-between mb-2"><h4 class="font-bold">Cuotas</h4>' +
    '<button class="btn btn-primary btn-sm" data-act="payNew">' + ic('plus') + ' Registrar pago</button></div>' +
    cv.pend.slice(0, 14).map((x) => {
      const venc = x.key < S.hoy, dias = Cobros.dias(x.key, S.hoy);
      return '<div class="ev-row"><div class="min-w-0 flex-1"><div class="text-sm font-bold">' + esc(x.concepto) + ' · ' + esc(money2(x.monto)) + '</div>' +
        '<div class="text-xs ' + (venc ? 'text-rose-500 font-semibold' : 'muted') + '">' + esc(fechaLarga(x.key)) + (venc ? ' · vencida hace ' + dias + (dias === 1 ? ' día' : ' días') : x.key === S.hoy ? ' · vence hoy' : ' · faltan ' + Cobros.dias(S.hoy, x.key) + ' días') + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="payNew" data-k="' + esc(x.key) + '">Cobrar</button></div>';
    }).join('') +
    (cv.pagadas.length ? '<p class="text-xs muted pt-2">' + cv.pagadas.length + (cv.pagadas.length === 1 ? ' cuota pagada' : ' cuotas pagadas') + ' (ver historial abajo).</p>' : '') + '</div>';

  const hist = '<div><h4 class="font-bold mb-3">Historial de pagos</h4>' +
    (d.pagos.length ? d.pagos.map((p) => '<div class="glass-soft p-3 mb-2 ' + (p.anulado ? 'opacity-60' : '') + '">' +
      '<div class="flex items-start gap-3"><div class="min-w-0 flex-1"><div class="text-sm font-bold ' + (p.anulado ? 'line-through' : '') + '">' + esc(p.reciboNo) + ' · ' + esc(money2(p.monto)) + '</div>' +
      '<div class="text-xs muted">' + esc(p.concepto) + ' del ' + esc(fmtDate(p.cubre)) + ' · pagado el ' + esc(fmtDate(p.fechaPago)) + ' · ' + esc(p.metodo) + (p.referencia ? ' · ' + esc(p.referencia) : '') + '</div>' +
      '<div class="text-xs muted">Registró ' + esc(Team.nombre(p.registradoPor)) + (p.anulado ? ' · <b class="text-rose-500">ANULADO</b>' : '') + '</div>' +
      (!p.anulado && Number(p.comisionMonto) > 0 ? '<div class="text-xs text-emerald-600">' + ic('trophy') + ' Comisión ' + esc(money2(p.comisionMonto)) + ' (' + esc(p.comisionPct) + ' %) para ' + esc(Team.nombre(p.comisionPara)) + '</div>' : '') +
      (p.reciboEnviado ? '<div class="text-xs text-emerald-500 mt-1">' + ic('check') + ' Recibo enviado: ' + esc(p.reciboEnviado) + '</div>' : '') +
      (p.nota ? '<div class="text-xs mt-1 break-words">' + esc(p.nota) + '</div>' : '') + '</div>' +
      '<div class="flex flex-col gap-1.5 flex-none">' +
      (p.tieneComprobante ? '<button class="btn btn-ghost btn-sm" data-act="payProof" data-id="' + esc(p.id) + '">' + ic('image') + ' Comprobante</button>' : '') +
      (!p.anulado ? '<button class="btn btn-ghost btn-sm" data-act="payView" data-id="' + esc(p.id) + '">' + ic('receipt') + ' Ver recibo</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="payReceipt" data-id="' + esc(p.id) + '">' + ic('send') + ' Enviar</button>' +
        '<button class="btn btn-ghost btn-sm text-rose-500" data-act="payVoid" data-id="' + esc(p.id) + '">Anular</button>' : '') + '</div></div></div>').join('')
      : '<p class="text-sm muted">Aún no hay pagos registrados.</p>') + '</div>';

  return '<div class="flex items-start gap-3 p-5 border-b hairline">' +
    '<div class="w-12 h-12 rounded-2xl grid place-items-center font-bold text-white flex-none" style="background:linear-gradient(135deg,#10b981,#06b6d4)">' + esc(initials(c.nombre)) + '</div>' +
    '<div class="min-w-0 flex-1"><h3 class="text-lg font-extrabold leading-tight break-words">' + esc(c.nombre || 'Cliente') + '</h3>' +
    '<div class="flex items-center gap-2 mt-1 flex-wrap">' + (tiene ? cobroPill(st) : '') + '<span class="chip">' + ic('user') + ' ' + esc(Team.nombre(c.asignadoA)) + '</span></div></div>' +
    '<button class="btn btn-ghost btn-icon" data-act="closeDrawer" aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<div class="flex-1 overflow-y-auto scroll-thin p-5 space-y-4">' +
    '<div class="flex flex-wrap gap-2">' + (c.whatsapp ? '<a class="btn btn-sm wa" href="' + esc(waUrl(c.whatsapp)) + '" target="_blank" rel="noopener">' + ic('whatsapp') + ' WhatsApp</a>' : '') +
    (c.email ? '<a class="btn btn-sm ml" href="' + esc(mailUrl(c.email)) + '" target="_blank" rel="noopener">' + ic('mail') + ' Email</a>' : '') +
    '<button class="btn btn-sm btn-ghost" data-act="openLead" data-id="' + esc(d.idLead) + '">' + ic('file') + ' Ver prospecto y bitácora</button></div>' +
    inactBanner + comCard + planForm + cuotas + hist + '</div>';
}

/* ============================= REGISTRAR PAGO ============================= */
function pagoModal(preK) {
  const d = Cli.cur, c = clienteDe(d.idLead);
  const cv = cuotasView(d);
  if (!cv.pend.length) { UI.toast('Este cliente no tiene cuotas pendientes. Revisa el plan de cobro.', 'error'); return; }
  const sel = preK && cv.pend.some((x) => x.key === preK) ? preK : cv.pend[0].key;
  const opts = cv.pend.slice(0, 18).map((x) => '<option value="' + esc(x.key) + '" data-m="' + x.monto + '" ' + (x.key === sel ? 'selected' : '') + '>' + esc(x.concepto + ' · ' + fechaLarga(x.key) + ' · ' + money2(x.monto) + (x.key < S.hoy ? ' (vencida)' : '')) + '</option>').join('');
  const first = cv.pend.find((x) => x.key === sel);
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold">Registrar pago</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<p class="text-sm muted mb-4"><b>' + esc(c.nombre || '') + '</b></p>' +
    '<form id="pgForm" class="grid grid-cols-2 gap-3">' +
    '<div class="col-span-2"><label class="label">Cuota que paga *</label><select class="input" id="pgCubre">' + opts + '</select></div>' +
    '<div><label class="label">Fecha de pago *</label><input type="date" class="input" id="pgFecha" required max="' + esc(S.hoy) + '" value="' + esc(S.hoy) + '"></div>' +
    '<div><label class="label">Monto recibido (Q) *</label><input type="number" class="input" id="pgMonto" required min="0.01" step="0.01" value="' + esc(first ? first.monto : '') + '"></div>' +
    '<div><label class="label">Método *</label><select class="input" id="pgMetodo">' + METODOS_PAGO.map((x) => '<option>' + esc(x) + '</option>').join('') + '</select></div>' +
    '<div><label class="label">Referencia</label><input class="input" id="pgRef" maxlength="100" placeholder="N.º de boleta o transferencia"></div>' +
    '<div class="col-span-2"><label class="label">Nota</label><input class="input" id="pgNota" maxlength="500"></div>' +
    '<div class="col-span-2"><label class="label">Foto del comprobante (opcional)</label>' +
    '<label class="block rounded-2xl border-2 border-dashed hairline p-4 text-center cursor-pointer" id="pgDrop"><span id="pgFileTxt" class="text-sm muted">' + ic('camera') + ' Toca para elegir una foto o captura</span>' +
    '<input type="file" id="pgFile" accept="image/*" class="sr-only"></label><img id="pgPrev" class="mt-2 max-h-40 rounded-xl mx-auto" hidden alt="Vista previa del comprobante"></div>' +
    '<div id="pgErr" class="col-span-2 text-sm text-rose-500" hidden></div>' +
    '<div class="col-span-2 flex justify-end gap-2 mt-1"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="pgBtn">' + ic('check') + ' Registrar pago</button></div></form>', { wide: true });

  let foto = '';
  const err = (t) => { const b = $('#pgErr', m.el); b.textContent = t; b.hidden = !t; };
  $('#pgCubre', m.el).addEventListener('change', (e) => { const o = e.target.selectedOptions[0]; if (o) $('#pgMonto', m.el).value = o.dataset.m; });
  $('#pgFile', m.el).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    $('#pgFileTxt', m.el).textContent = 'Reduciendo la foto…';
    try {
      foto = await shrinkImage(f, 44000);
      const img = $('#pgPrev', m.el);
      img.src = 'data:image/jpeg;base64,' + foto; img.hidden = false;
      $('#pgFileTxt', m.el).textContent = 'Foto lista (' + Math.round(foto.length / 1024) + ' KB). Toca para cambiarla.';
      err('');
    } catch (ex) { foto = ''; $('#pgFileTxt', m.el).textContent = 'Toca para elegir una foto o captura'; $('#pgPrev', m.el).hidden = true; err(ex.message); }
  });
  $('#pgForm', m.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    err('');
    UI.busy($('#pgBtn', m.el), true, 'Registrando…');
    try {
      const p = await Api.call('pagos.create', {
        idLead: d.idLead, cubre: $('#pgCubre', m.el).value, fechaPago: $('#pgFecha', m.el).value, monto: $('#pgMonto', m.el).value,
        metodo: $('#pgMetodo', m.el).value, referencia: $('#pgRef', m.el).value.trim(), nota: $('#pgNota', m.el).value.trim(), comprobante: foto || undefined,
      });
      m.close();
      await reloadCliente();
      UI.toast('Pago ' + p.reciboNo + ' registrado', 'ok');
      reciboModal(p.id);
    } catch (ex) { err(ex.message); UI.busy($('#pgBtn', m.el), false); }
  });
}

/* ============================== RECIBO DEL PAGO =========================== */
function reciboTexto(p) {
  const d = Cli.cur, c = clienteDe(d.idLead);
  const st = Cobros.status(Cobros.planDe(d.plan), d.pagos, S.hoy);
  const prox = st.siguiente ? (st.siguiente.key < S.hoy ? 'Cuota pendiente: ' : 'Próxima cuota: ') + money2(st.siguiente.monto) + ' el ' + fechaLarga(st.siguiente.key) + '.' : '';
  return 'Hola ' + (c.contacto || c.nombre) + ', recibimos tu pago de ' + money2(p.monto) + ' (' + (p.concepto === 'Inicial' ? 'pago inicial' : p.concepto.toLowerCase() + ' del ' + fechaLarga(p.cubre)) + ') el ' + fechaLarga(p.fechaPago) +
    '. Recibo ' + p.reciboNo + '. ' + prox + ' ¡Gracias por tu confianza! — Pixan Tech';
}

/** Pregunta cómo enviar el recibo: correo, WhatsApp o no enviarlo ahora. */
function reciboModal(idPago) {
  const d = Cli.cur, c = clienteDe(d.idLead);
  const p = d.pagos.find((x) => x.id === idPago);
  if (!p) return;
  const tel = c.whatsapp || '';
  const m = UI.modal(
    '<div class="flex items-center justify-between mb-2"><h3 class="text-lg font-extrabold">Recibo ' + esc(p.reciboNo) + '</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
    '<p class="text-sm muted mb-4">' + esc(money2(p.monto)) + ' · ' + esc(p.concepto) + ' del ' + esc(fmtDate(p.cubre)) + '. ¿Cómo quieres enviárselo a <b>' + esc(c.nombre || 'el cliente') + '</b>?</p>' +
    (p.reciboEnviado ? '<div class="banner info mb-3">' + ic('check', 'mt-0.5') + '<div>Ya se envió: ' + esc(p.reciboEnviado) + '. Puedes enviarlo de nuevo.</div></div>' : '') +
    '<div class="glass-soft p-4 mb-3"><div class="font-bold mb-2">' + ic('mail') + ' Por correo</div>' +
    '<div class="flex gap-2"><input class="input" id="rcMail" type="email" placeholder="correo@cliente.com" value="' + esc(c.email || '') + '"><button class="btn btn-primary" id="rcSend">Enviar</button></div>' +
    '<p class="text-xs muted mt-2">Sale con el logo, los datos del pago y la próxima fecha de cobro.</p></div>' +
    '<div class="glass-soft p-4 mb-3"><div class="font-bold mb-2">' + ic('whatsapp') + ' Por WhatsApp</div>' +
    '<div class="flex gap-2"><input class="input" id="rcTel" placeholder="Número con código de país" value="' + esc(tel) + '"><button class="btn wa" id="rcWa">Abrir WhatsApp</button></div>' +
    '<p class="text-xs muted mt-2">Se abre WhatsApp con el mensaje ya escrito; solo pulsa enviar.</p></div>' +
    '<div id="rcErr" class="text-sm text-rose-500 mb-2" hidden></div>' +
    '<div class="flex justify-end"><button class="btn btn-ghost" data-close>No enviar ahora</button></div>');
  const err = (t) => { const b = $('#rcErr', m.el); b.textContent = t; b.hidden = !t; };
  $('#rcSend', m.el).addEventListener('click', async (e) => {
    const email = $('#rcMail', m.el).value.trim();
    if (!email) { err('Escribe el correo del cliente.'); return; }
    UI.busy(e.currentTarget, true, 'Enviando…');
    try { await Api.call('pagos.sendReceipt', { id: idPago, email }); m.close(); await reloadCliente(); UI.toast('Recibo enviado a ' + email, 'ok'); }
    catch (ex) { err(ex.message); UI.busy(e.currentTarget, false); }
  });
  $('#rcWa', m.el).addEventListener('click', async () => {
    const num = $('#rcTel', m.el).value.replace(/\D/g, '');
    if (num.length < 8) { err('Escribe el número con código de país (ej. 502 5555 1234).'); return; }
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(reciboTexto(p)), '_blank', 'noopener');
    try { await Api.call('pagos.logReceipt', { id: idPago, canal: 'WhatsApp' }); m.close(); await reloadCliente(); UI.toast('Quedó anotado que se envió por WhatsApp', 'ok'); }
    catch (ex) { err(ex.message); }
  });
}

/** Muestra el recibo tal como lo recibe el cliente; se puede imprimir o guardar como PDF desde el navegador. */
async function verRecibo(idPago) {
  try {
    const r = await Api.call('pagos.receipt', { id: idPago });
    const m = UI.modal('<div class="flex items-center justify-between mb-3"><h3 class="text-lg font-extrabold">Recibo ' + esc(r.reciboNo) + '</h3>' +
      '<button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
      // El recibo ya viene con todo escapado desde el servidor; se muestra aislado, sin scripts.
      '<iframe id="rcFrame" class="w-full rounded-xl border hairline" style="height:min(70vh,560px);background:#fff" sandbox="allow-same-origin allow-modals" title="Recibo"></iframe>' +
      '<div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="payReceipt" data-id="' + esc(idPago) + '">' + ic('send') + ' Enviar</button>' +
      '<button class="btn btn-primary" id="rcPrint">' + ic('receipt') + ' Imprimir / guardar PDF</button></div>', { wide: true });
    $('#rcFrame', m.el).srcdoc = r.html;
    $('#rcPrint', m.el).addEventListener('click', () => { const w = $('#rcFrame', m.el).contentWindow; w.focus(); w.print(); });
  } catch (e) { UI.toast(e.message, 'error'); }
}

Object.assign(Actions, {
  payView: (el) => verRecibo(el.dataset.id),
  cliFiltro: (el) => { const st = Table.state('cli'); st.f.estadoCobro = st.f.estadoCobro === el.dataset.f ? '' : el.dataset.f; go('clientes'); },
  openCobros: (el) => openCliente(el.dataset.id),
  async planSave(el) {
    const v = (id) => $('#' + id).value.trim();
    UI.busy(el, true, 'Guardando…');
    try {
      await Api.call('cobros.save', { idLead: Cli.cur.idLead, frecuencia: v('pnFrec'), montoCobro: v('pnMonto'), inicioCobro: v('pnInicio'), pagoInicialMonto: v('pnIniMonto'), pagoInicialFecha: v('pnIniFecha'), notas: v('pnNotas') });
      await reloadCliente();
      UI.toast('Plan de cobro guardado', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },
  payNew: (el) => pagoModal(el && el.dataset ? el.dataset.k : ''),
  async cmSaveCli(el) {
    UI.busy(el, true, 'Guardando…');
    try {
      await Api.call('leads.setCommission', { id: Cli.cur.idLead, pct: $('#cmCli').value });
      const l = await Api.call('leads.get', { id: Cli.cur.idLead }); upsertLead(l);
      await reloadCliente();
      UI.toast('Comisión guardada', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); UI.busy(el, false); }
  },
  async cliInactive() {
    if (!(await UI.confirm('Marcar cliente como inactivo', 'Deja de cobrar, no se podrán registrar pagos y ya no genera comisión. Puedes reactivarlo cuando quieras.', { danger: true, ok: 'Marcar inactivo' }))) return;
    const motivo = await UI.prompt('Motivo', 'Por ejemplo: canceló el servicio', '');
    if (motivo === null) return;
    try { await Api.call('clientes.setActive', { idLead: Cli.cur.idLead, activo: false, motivo }); await reloadCliente(); UI.toast('Cliente marcado como inactivo', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  async cliActive() {
    try { await Api.call('clientes.setActive', { idLead: Cli.cur.idLead, activo: true }); await reloadCliente(); UI.toast('Cliente reactivado', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  payReceipt: (el) => reciboModal(el.dataset.id),
  async payProof(el) {
    try {
      const c = await Api.call('pagos.comprobante', { id: el.dataset.id });
      UI.modal('<div class="flex items-center justify-between mb-3"><h3 class="text-lg font-extrabold">Comprobante</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
        '<img class="w-full rounded-xl" alt="Comprobante de pago" src="data:' + esc(/^image\/(jpeg|png)$/.test(c.mime) ? c.mime : 'image/jpeg') + ';base64,' + esc(c.datos) + '">');
    } catch (e) { UI.toast(e.message, 'error'); }
  },
  async payVoid(el) {
    const p = Cli.cur.pagos.find((x) => x.id === el.dataset.id);
    if (!(await UI.confirm('Anular pago', 'El pago ' + p.reciboNo + ' quedará anulado y la cuota volverá a estar pendiente. No se puede deshacer.', { danger: true, ok: 'Anular pago' }))) return;
    const motivo = await UI.prompt('Motivo de la anulación', 'Por ejemplo: se registró dos veces', '');
    if (motivo === null) return;
    try { await Api.call('pagos.void', { id: p.id, motivo }); await reloadCliente(); UI.toast('Pago anulado', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
});
