import { CONFIG } from './config.js';
import { createApi } from './api.js';
import * as auth from './auth.js';
import { store, applyBootstrap, resetState } from './state.js';
import { saveSnapshot, loadSnapshot, clearSnapshots } from './cache-local.js';
import { VIEWS, allowedViews, currentRoute, go } from './router.js';
import { renderShell } from './views/shell.js';
import { renderLogin } from './views/login.js';
import { toast } from './ui/toast.js';
import { confirmDialog } from './ui/modal.js';
import { closeDrawer, drawerOpen } from './ui/drawer.js';
import { setHTML, html } from './ui/html.js';
import { toggleTheme } from './ui/theme.js';

const api = createApi({ url: CONFIG.API_URL, getToken: auth.getToken, timeoutMs: CONFIG.TIMEOUT_MS });
const root = () => document.getElementById('root');
let shell = null;
let cleanup = null;
let started = false;
let session = 0; // se incrementa en teardown(): descarta respuestas de sesiones ya cerradas

export const ctx = {
  store, api, go, toast,
  cfg: () => store.get().config,
  reload: (o) => reload(o),
  openLead: (id) => import('./views/lead-drawer.js').then((m) => m.openLead(id, ctx)),
  rerender: () => renderRoute(),
};

export const openLead = (id) => ctx.openLead(id);

function hideSplash() {
  const s = document.getElementById('splash');
  if (s) { s.classList.add('hide'); setTimeout(() => s.remove(), 400); }
}

function syncText() {
  const t = store.get().loadedAt;
  if (!shell || !t) return;
  shell.setSync((store.get().fromCache ? 'Sincronizando… · ' : 'Actualizado ') + new Date(t).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }));
}

async function renderRoute() {
  if (!shell) return;
  const s = session;
  const user = store.get().user;
  let key = currentRoute();
  if (!allowedViews(user).includes(key)) {
    key = 'dashboard';
    history.replaceState(null, '', '#/dashboard');
  }
  const v = VIEWS[key];
  shell.setTitle(v.title, v.sub);
  shell.setActive(key);
  if (cleanup) { try { cleanup(); } catch (e) { /* nada */ } cleanup = null; }
  const el = shell.contentEl;
  delete el.dataset.view;
  setHTML(el, html`<div class="grid grid-kpi"><div class="skeleton" style="height:110px"></div><div class="skeleton" style="height:110px"></div><div class="skeleton" style="height:110px"></div></div>`);
  try {
    const mod = (await v.load()).default;
    if (s !== session) return; // la sesión se cerró mientras cargaba la vista
    if (currentRoute() !== key && allowedViews(user).includes(currentRoute())) return; // el usuario ya navegó
    el.className = 'content fade-in';
    setHTML(el, mod.render(ctx));
    el.dataset.view = key;
    // mount puede devolver cleanup o una Promise<cleanup> (vistas que cargan datos propios).
    const c = mod.mount ? mod.mount(el, ctx) : null;
    if (c && typeof c.then === 'function') {
      c.then((f) => {
        if (el.dataset.view === key) cleanup = f || null;
        else if (typeof f === 'function') { try { f(); } catch (x) { /* nada */ } }
      }).catch((x) => console.error(x));
    }
    else cleanup = c || null;
  } catch (e) {
    console.error(e);
    setHTML(el, html`<div class="card empty"><strong>No se pudo abrir esta sección</strong>${e.message || ''}</div>`);
  }
}

/** Refresca datos. silent=true no interrumpe ediciones en curso. */
async function reload({ silent = false } = {}) {
  const s = session;
  try {
    const d = await api.call('auth.bootstrap');
    if (s !== session) return;
    applyBootstrap(d);
    saveSnapshot(auth.currentUid(), d);
    if (shell) shell.setBell(d.alertas.total);
    syncText();
    if (!silent || !isEditing()) refreshView();
    if (!silent) toast('Datos actualizados', 'ok');
  } catch (e) {
    if (!silent && s === session) toast(e.message, 'error');
  }
}

function isEditing() {
  return !!(drawerOpen() || document.querySelector('.modal-wrap') || isTyping());
}

function isTyping() {
  const a = document.activeElement;
  return !!a && a.closest && a.closest('#view') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
}

/** Re-render ligero de la vista actual (las vistas con refresh() conservan foco y filtros). */
async function refreshView() {
  const el = shell && shell.contentEl;
  if (!el || !el.dataset.view) return;
  const mod = (await VIEWS[el.dataset.view].load()).default;
  if (mod.refresh) mod.refresh(el, ctx); else renderRoute();
}
ctx.refreshView = refreshView;

async function enter(firebaseUser) {
  const s = session;
  const snap = loadSnapshot(firebaseUser.uid, CONFIG.SNAPSHOT_MAX_AGE_MS);
  if (snap) {
    applyBootstrap(snap, true);           // pinta al instante con la última visita
    mountApp();
    hideSplash();
  } else {
    document.getElementById('splashMsg') && (document.getElementById('splashMsg').textContent = 'Preparando tu espacio…');
  }
  try {
    const d = await api.call('auth.bootstrap');
    if (s !== session) return;
    const prev = store.get().user;
    applyBootstrap(d);
    saveSnapshot(firebaseUser.uid, d);
    if (!shell) mountApp();
    else {
      shell.setBell(d.alertas.total);
      const u = d.user || {};
      const changed = !prev || prev.isAdmin !== u.isAdmin || prev.rol !== u.rol || prev.nombre !== u.nombre;
      if (changed) mountApp(); else if (!isEditing()) refreshView();
    }
    syncText();
    hideSplash();
  } catch (e) {
    if (s !== session) return;
    teardown();
    renderLogin(root(), { mode: 'gate', error: e.message || 'No se pudo cargar el CRM.', code: e.code });
    hideSplash();
  }
}

function mountApp() {
  shell = renderShell(root(), store.get().user);
  shell.setBell(store.get().alertas.total);
  syncText();
  renderRoute();
}

/** Descarta todo rastro de la sesión actual (vista, drawer, snapshot, estado) e invalida peticiones en vuelo. */
function teardown() {
  if (cleanup) { try { cleanup(); } catch (e) { /* nada */ } cleanup = null; }
  closeDrawer();
  clearSnapshots();
  resetState();
  shell = null;
  session++;
}

async function doLogout() {
  teardown();
  try { await Promise.race([auth.logout(), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* se limpia igual */ }
  renderLogin(root(), { mode: 'login' });
}

function bindGlobalEvents() {
  window.addEventListener('hashchange', () => renderRoute());
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'logout') { if (!shell || await confirmDialog('Cerrar sesión', '¿Deseas salir del CRM?', { ok: 'Salir' })) doLogout(); }
    else if (act === 'theme') { toggleTheme(); }
    else if (act === 'menu') { shell && shell.toggleMenu(); }
    else if (act === 'refresh') { a.disabled = true; await reload(); a.disabled = false; }
    else if (act === 'bell') { go(store.get().user && store.get().user.isAdmin ? 'cobros' : 'cartera'); }
    else if (act === 'gateRetry') { try { await auth.reloadUser(); } catch (x) { /* igual */ } const u = { uid: auth.currentUid() }; if (u.uid) enter(u); else renderLogin(root(), { mode: 'login' }); }
    else if (act === 'gateVerify') { try { await auth.resendVerification(); toast('Te enviamos el correo de verificación. Después pulsa "Reintentar".', 'ok'); a.disabled = true; } catch (x) { toast(auth.authMessage(x), 'error'); } }
    else if (act === 'forgot') {
      const email = document.getElementById('lgEmail').value.trim();
      const msg = document.getElementById('lgMsg');
      if (!email) { msg.hidden = false; msg.style.color = 'var(--danger)'; msg.textContent = 'Escribe tu email arriba y vuelve a pulsar aquí.'; return; }
      try { await auth.resetPassword(email); } catch (x) { /* no revelar si el email existe */ }
      msg.hidden = false; msg.style.color = 'var(--ok)'; msg.textContent = 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.';
    }
  });
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'loginForm') return;
    e.preventDefault();
    const btn = document.getElementById('lgBtn');
    const msg = document.getElementById('lgMsg');
    btn.disabled = true; btn.textContent = 'Ingresando…';
    try { await auth.login(document.getElementById('lgEmail').value.trim(), document.getElementById('lgPass').value); }
    catch (x) { msg.hidden = false; msg.style.color = 'var(--danger)'; msg.textContent = auth.authMessage(x); btn.disabled = false; btn.textContent = 'Ingresar'; }
  });
  setInterval(() => { if (shell && store.get().user && document.visibilityState === 'visible') reload({ silent: true }); }, CONFIG.REFRESH_MS);
}

export function start() {
  if (started) return;
  started = true;
  bindGlobalEvents();
  auth.initAuth(CONFIG.FIREBASE, (u) => {
    if (u) enter(u);
    else { teardown(); renderLogin(root(), { mode: 'login' }); hideSplash(); }
  });
}

