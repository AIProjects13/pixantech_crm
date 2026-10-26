'use strict';

/* ============================== NAVEGACIÓN =============================== */
const VIEWS = {
  dashboard: { t: 'Panel', s: 'Tu día, tus prospectos y tus cobros', i: 'dash', can: () => true },
  bolsa: { t: 'Bolsa de leads', s: 'Prospectos libres: toma los que vayas a trabajar', i: 'inbox', can: () => true, badge: () => Team.bolsa().length },
  pipeline: { t: 'Mi pipeline', s: 'Arrastra las tarjetas para cambiar de paso', i: 'kanban', can: () => true,
    badge: () => Team.pipeline().filter((l) => !CERRADOS.includes(l.estado) && (S.user.isAdmin || Team.esMio(l))).length },
  agenda: { t: 'Agenda', s: 'Seguimientos con fecha y hora, y fechas de cobro', i: 'cal', can: () => true, badge: () => Seg.pendientes().filter((s) => s.fecha <= S.hoy).length },
  prospectos: { t: 'Prospectos', s: 'Tabla completa: ordena, filtra y exporta', i: 'table', can: () => true },
  clientes: { t: 'Clientes', s: 'Cobros, pagos y recibos', i: 'wallet', can: (u) => u.perms.clientes_ver, red: true,
    badge: () => S.clientes.filter((c) => c.cobro && c.cobro.estado === 'Vencido').length },
  perdidos: { t: 'Perdidos', s: 'No se contactan hasta su fecha de revisión', i: 'archive', can: () => true },
  importar: { t: 'Importar CSV', s: 'Carga prospectos desde un archivo, sin duplicados', i: 'upload', can: (u) => u.perms.leads_crear },
  config: { t: 'Configuración', s: 'Ajustes y plantillas de correo', i: 'gear', can: (u) => u.isAdmin || u.perms.plantillas_editar },
  usuarios: { t: 'Equipo', s: 'Perfiles y niveles de acceso', i: 'shield', can: (u) => u.isAdmin },
};
const NAV_GROUPS = [['dashboard', 'bolsa', 'pipeline', 'agenda', 'prospectos', 'clientes', 'perdidos'], ['importar', 'config', 'usuarios']];

const Nav = {
  collapsed: store.get('pxt-rail') === 'mini', // preferencia en escritorio
  mOpen: false,                                 // menú desplegado en celular
  isMobile: () => window.matchMedia('(max-width: 1023px)').matches,
  render() {
    const grupos = NAV_GROUPS.map((g) => g.filter((k) => VIEWS[k].can(S.user))).filter((g) => g.length);
    $('#nav').innerHTML = grupos.map((g) => g.map((k) => {
      const v = VIEWS[k], n = v.badge ? v.badge() : 0;
      return '<a class="nav-item ' + (S.view === k ? 'active' : '') + '" data-act="go" data-v="' + k + '" title="' + esc(v.t) + '" aria-label="' + esc(v.t) + '">' +
        ic(v.i) + '<span class="rail-label">' + esc(v.t) + '</span>' + (n ? '<span class="nav-badge ' + (v.red ? 'red' : '') + '">' + n + '</span>' : '') + '</a>';
    }).join('')).join('<div class="rail-sep"></div>');
  },
  apply() {
    const mini = Nav.isMobile() ? !Nav.mOpen : Nav.collapsed;
    $('#rail').classList.toggle('is-mini', mini);
    $('#railScrim').classList.toggle('show', Nav.isMobile() && Nav.mOpen);
    $('#railBtn').innerHTML = ic(mini ? 'menu' : 'panel');
    $('#railBtn').title = mini ? 'Mostrar el menú' : 'Ocultar el menú';
  },
  toggle() {
    if (Nav.isMobile()) Nav.mOpen = !Nav.mOpen;
    else { Nav.collapsed = !Nav.collapsed; store.set('pxt-rail', Nav.collapsed ? 'mini' : 'open'); }
    Nav.apply();
  },
  close() { if (Nav.mOpen) { Nav.mOpen = false; Nav.apply(); } },
};

function go(view, keepScroll) {
  if (!VIEWS[view] || !VIEWS[view].can(S.user)) view = 'dashboard';
  S.view = view;
  store.set('pxt-view', view);
  $('#viewTitle').textContent = VIEWS[view].t;
  $('#viewSub').textContent = VIEWS[view].s;
  Nav.render();
  Nav.close();
  const v = $('#view');
  v.className = keepScroll ? '' : 'fade-in';
  const y = window.scrollY;
  v.innerHTML = Views[view]();
  if (Views[view + 'Mount']) Views[view + 'Mount']();
  window.scrollTo(0, keepScroll ? y : 0);
  renderBell();
}

/** Re-pintado ligero tras cambios de datos (sin perder el foco del buscador). */
function refreshView() {
  Seg.recalc();
  if (S.view === 'pipeline') { const k = $('#kanban'); if (k) k.innerHTML = Views.kanbanColumns(); Nav.render(); renderBell(); }
  else if (S.view === 'prospectos') { Table.body('leads'); Nav.render(); renderBell(); }
  else if (S.view === 'bolsa') { Table.body('bolsa'); Nav.render(); renderBell(); }
  else if (S.view === 'perdidos') { Table.body('perd'); Nav.render(); renderBell(); }
  else go(S.view, true);
  updateSync();
}

function updateSync() {
  $('#syncInfo').textContent = S.loadedAt ? 'Actualizado ' + new Date(S.loadedAt).toLocaleTimeString(CONFIG.LOCALE, { hour: '2-digit', minute: '2-digit' }) : '';
}

/** Campana: avisa si hay ofertas de prospectos o seguimientos atrasados. */
function renderBell() {
  const b = $('#bellBtn');
  if (!b || !S.user) return;
  const n = Team.ofertas().length + Seg.pendientes().filter((s) => s.fecha < S.hoy).length;
  b.hidden = !n;
  b.innerHTML = ic('bell') + (n ? '<span class="pip"></span>' : '');
  b.title = n ? n + ' aviso' + (n > 1 ? 's' : '') + ' pendiente' + (n > 1 ? 's' : '') : 'Avisos';
}

function setThemeIcon() {
  $('#themeBtn').innerHTML = ic(document.documentElement.classList.contains('dark') ? 'sun' : 'moon');
}

/* ================================ ACCIONES =============================== */
Object.assign(Actions, {
  go: (el) => go(el.dataset.v),
  railToggle: () => Nav.toggle(),
  logout: async () => { if (await UI.confirm('Cerrar sesión', '¿Deseas salir del CRM?', { ok: 'Salir' })) App.logout(); },
  theme: () => {
    const d = document.documentElement.classList.toggle('dark');
    store.set('pxt-theme', d ? 'dark' : 'light');
    setThemeIcon();
  },
  refresh: async (el) => {
    const i = el.querySelector('svg'); if (i) i.classList.add('ic-spin');
    await App.load();
    if (i) i.classList.remove('ic-spin');
  },
});

/* ============================== EVENTOS ================================== */
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href]:not([data-act])')) return; // enlaces externos (WhatsApp, email, web)
  const a = e.target.closest('[data-act]');
  if (a && Actions[a.dataset.act]) { e.preventDefault(); Actions[a.dataset.act](a, e); return; }
  const card = e.target.closest('.lead-card');
  if (card && !e.target.closest('a,button')) openLead(card.dataset.id);
});
$('#scrim').addEventListener('click', () => Drawer.close());
$('#railScrim').addEventListener('click', () => Nav.close());
window.matchMedia('(max-width: 1023px)').addEventListener('change', () => { Nav.mOpen = false; Nav.apply(); });
const tableSearch = debounce((t) => { Table.state(t.dataset.tq).q = t.value; Table.body(t.dataset.tq); }, 120);
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.tq) tableSearch(e.target); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const m = $('#modalRoot').lastElementChild;
  if (m) m.remove(); else if (Drawer.isOpen()) Drawer.close(); else Nav.close();
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.tf) { Table.state(t.dataset.tf).f[t.dataset.k] = t.value; Table.body(t.dataset.tf); return; }
  if (t.id === 'dEstado' && S.cur) { moveLead(S.cur.id, t.value); return; }
  if (t.dataset.usr) updateUser(t.dataset.usr, { [t.dataset.f]: t.value }, 'Nivel actualizado');
});

/* ================================= APP =================================== */
const App = {
  /** Cierra sesión y vuelve al login sin depender de que Firebase notifique el cambio. */
  async logout() {
    $('#boot').hidden = false; $('#app').hidden = true; $('#bootMsg').textContent = 'Cerrando sesión…';
    try { await Promise.race([Auth.logout(), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* se limpia igual */ }
    Object.assign(S, { user: null, leads: [], clientes: [], plantillas: [], seguimientos: [], usuariosAsignables: [], cur: null, users: null, niveles: null, quill: null, sel: new Set() });
    S.imp = Object.assign({}, S.imp, { rows: [], selected: new Set(), file: '', error: '', extraLabels: [], truncated: false, open: false });
    Cli.cur = null;
    $('#modalRoot').innerHTML = '';
    $('#view').innerHTML = '';
    $('#lgPass').value = '';
    $('#lgMsg').hidden = true;
    App.showLogin();
  },
  showLogin(msg) {
    $('#boot').hidden = true; $('#app').hidden = true; $('#login').hidden = false;
    $('#loginForm').hidden = false; $('#gate').hidden = true;
    Drawer.close();
    if (msg) showLoginMsg(msg, 'error');
  },
  showGate(err) {
    $('#boot').hidden = true; $('#app').hidden = true; $('#login').hidden = false;
    $('#loginForm').hidden = true; $('#gate').hidden = false;
    const g = $('#gateMsg');
    g.textContent = err.message;
    g.style.background = 'rgba(239,68,68,.1)'; g.style.color = '#e11d48';
    $('#gateVerify').hidden = err.code !== 'EMAIL_NOT_VERIFIED';
  },
  async start() {
    $('#login').hidden = true; $('#boot').hidden = false; $('#bootMsg').textContent = 'Cargando tu espacio…';
    try {
      await App.load(true);
      $('#boot').hidden = true; $('#app').hidden = false;
      const me = S.user;
      $('#meAvatar').textContent = initials(me.nombre || me.email);
      $('#meName').textContent = me.nombre || me.email;
      $('#meLevel').textContent = me.nivel;
      setThemeIcon();
      Nav.apply();
      go(store.get('pxt-view') || 'dashboard');
    } catch (e) {
      if (['FORBIDDEN', 'EMAIL_NOT_VERIFIED', 'NOT_SETUP'].includes(e.code)) App.showGate(e);
      else App.showGate(Object.assign(new Error(e.message || 'No se pudo cargar el CRM.'), { code: e.code }));
    }
  },
  async load(first) {
    try {
      const d = await Api.call('auth.bootstrap');
      Object.assign(S, {
        user: d.user, estados: d.estados, estadosPago: d.estadosPago, hoy: d.hoy, leads: d.leads, seguimientos: d.seguimientos || [],
        clientes: d.clientes, plantillas: d.plantillas, usuariosAsignables: d.usuariosAsignables, loadedAt: Date.now(),
      });
      Seg.recalc();
      if (!first) { refreshView(); UI.toast('Datos actualizados', 'ok'); }
      updateSync();
    } catch (e) {
      if (first) throw e;
      UI.toast(e.message, 'error');
    }
  },
};

function showLoginMsg(text, type) {
  const b = $('#lgMsg');
  b.hidden = false;
  b.textContent = text;
  b.style.background = type === 'ok' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.1)';
  b.style.color = type === 'ok' ? '#059669' : '#e11d48';
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  UI.busy($('#lgBtn'), true, 'Ingresando…');
  try {
    await Auth.login($('#lgEmail').value.trim(), $('#lgPass').value);
  } catch (err) {
    showLoginMsg(Auth.message(err), 'error');
  }
  UI.busy($('#lgBtn'), false);
});
$('#lgShowIc').innerHTML = ic('eye');
$('#lgShow').addEventListener('click', () => {
  const p = $('#lgPass');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('#lgShowIc').innerHTML = ic(p.type === 'password' ? 'eye' : 'eyeoff');
});
$('#lgForgot').addEventListener('click', async () => {
  const email = $('#lgEmail').value.trim();
  if (!email) { showLoginMsg('Escribe tu email arriba y vuelve a pulsar aquí.', 'error'); return; }
  try { await Auth.reset(email); } catch (err) { /* no revelar si el email existe */ }
  showLoginMsg('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.', 'ok');
});
$('#gateOut').addEventListener('click', () => App.logout());
$('#gateRetry').addEventListener('click', async () => {
  const u = Auth.fb.currentUser;
  if (!u) { App.showLogin(); return; }
  try { await u.reload(); await u.getIdToken(true); } catch (e) { /* se reintenta igual */ }
  App.start();
});
$('#gateVerify').addEventListener('click', async (e) => {
  try { await Auth.verify(); UI.toast('Te enviamos el correo de verificación. Después pulsa "Reintentar".', 'ok'); e.target.disabled = true; }
  catch (err) { UI.toast(Auth.message(err), 'error'); }
});

/* ================================ ARRANQUE =============================== */
Icons.watch();
DnD.init();
if (typeof DEV_USER !== 'undefined') {
  // Solo para pruebas locales (tests/dev.html): entra como ese usuario sin pasar por el servicio de acceso.
  Auth.fb = { currentUser: { getIdToken: () => Promise.resolve(DEV_USER) } };
  App.start();
} else {
  Auth.init();
}
// Refresco silencioso cada 5 min si la pestaña está visible y nada está abierto.
setInterval(() => {
  if (S.user && document.visibilityState === 'visible' && !Drawer.isOpen() && !$('#modalRoot').children.length) {
    Api.call('auth.bootstrap').then((d) => {
      Object.assign(S, { leads: d.leads, seguimientos: d.seguimientos || [], clientes: d.clientes, plantillas: d.plantillas, hoy: d.hoy, loadedAt: Date.now() });
      refreshView();
    }).catch(() => {});
  }
}, 300000);
