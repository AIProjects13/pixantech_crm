'use strict';

/* ================================= STATE ================================= */
const S = {
  user: null, estados: [], estadosPago: [], hoy: '', leads: [], clientes: [], plantillas: [], seguimientos: [],
  usuariosAsignables: [], view: 'dashboard', loadedAt: 0,
  ui: { q: '', owner: '', dueOnly: false, segDia: '', calMes: '' },
  sel: new Set(), // prospectos marcados en la tabla (acciones del administrador)
  imp: { rows: [], selected: new Set(), file: '', error: '', extraLabels: [], truncated: false, open: false, defaults: { rubro: '', pais: 'Guatemala', region: '' } },
  cur: null, tplSel: null, quill: null,
};
const Views = {};   // cada js/views-*.js agrega las suyas con Object.assign(Views, {...})
const Actions = {}; // acciones de data-act="…" (ver js/app.js)

/* ================================= AUTH ================================== */
const Auth = {
  fb: null,
  init() {
    firebase.initializeApp(CONFIG.FIREBASE);
    this.fb = firebase.auth();
    this.fb.languageCode = 'es';
    this.fb.onAuthStateChanged((u) => (u ? App.start() : App.showLogin()));
  },
  token(force) {
    const u = this.fb.currentUser;
    if (!u) return Promise.reject(Object.assign(new Error('Sesión cerrada.'), { code: 'UNAUTHENTICATED' }));
    return u.getIdToken(!!force);
  },
  login: (e, p) => Auth.fb.signInWithEmailAndPassword(e, p),
  logout: () => Auth.fb.signOut(),
  reset: (e) => Auth.fb.sendPasswordResetEmail(e),
  verify: () => Auth.fb.currentUser.sendEmailVerification(),
  message(err) {
    const m = {
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
      'auth/invalid-login-credentials': 'Email o contraseña incorrectos.',
      'auth/wrong-password': 'Email o contraseña incorrectos.',
      'auth/user-not-found': 'Email o contraseña incorrectos.',
      'auth/invalid-email': 'El email no es válido.',
      'auth/user-disabled': 'Esta cuenta está deshabilitada.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    };
    return m[err && err.code] || 'No se pudo completar la operación.';
  },
};

/* ================================== API ================================== */
const Api = {
  viaGsr: typeof google !== 'undefined' && google.script && google.script.run,
  raw(req) {
    if (this.viaGsr) {
      return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej).api(req));
    }
    return fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(req), redirect: 'follow' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  },
  async call(action, payload = {}, retried = false) {
    const token = await Auth.token(retried);
    let res;
    try {
      res = await this.raw({ action, token, payload });
    } catch (e) {
      throw Object.assign(new Error('No se pudo conectar con el servidor.'), { code: 'NETWORK' });
    }
    if (res && res.ok) return res.data;
    const err = (res && res.error) || {};
    if (err.code === 'UNAUTHENTICATED' && !retried) return this.call(action, payload, true);
    throw Object.assign(new Error(err.message || 'Error inesperado.'), { code: err.code || 'UNKNOWN' });
  },
};

/* ================================== UI =================================== */
const UI = {
  toast(msg, type = 'info') {
    const icon = { info: 'fa-circle-info text-indigo-500', ok: 'fa-circle-check text-emerald-500', error: 'fa-triangle-exclamation text-rose-500' }[type];
    const el = document.createElement('div');
    el.className = 'toast glass';
    el.innerHTML = '<i class="fa-solid ' + icon + ' mt-0.5"></i><div>' + esc(msg) + '</div>';
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 6000 : 3500);
  },
  modal(html, opts = {}) {
    const root = document.createElement('div');
    root.className = 'modal-wrap';
    root.innerHTML = '<div class="scrim show" data-close></div><div class="modal glass p-6 relative z-10 scroll-thin ' + (opts.wide ? 'wide' : '') + '">' + html + '</div>';
    $('#modalRoot').appendChild(root);
    const close = () => root.remove();
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const first = root.querySelector('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 50);
    return { el: root, close };
  },
  confirm(title, text, opts = {}) {
    return new Promise((resolve) => {
      const m = UI.modal(
        '<h3 class="text-lg font-extrabold mb-2">' + esc(title) + '</h3><p class="muted text-sm mb-6">' + esc(text) + '</p>' +
        '<div class="flex justify-end gap-2"><button class="btn btn-ghost" data-r="0">Cancelar</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-r="1">' + esc(opts.ok || 'Confirmar') + '</button></div>'
      );
      m.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (b) { m.close(); resolve(b.dataset.r === '1'); } else if (e.target.closest('[data-close]')) resolve(false);
      });
    });
  },
  prompt(title, label, value = '') {
    return new Promise((resolve) => {
      const m = UI.modal(
        '<h3 class="text-lg font-extrabold mb-4">' + esc(title) + '</h3><label class="label">' + esc(label) + '</label>' +
        '<input class="input mb-6" id="pmIn" value="' + esc(value) + '">' +
        '<div class="flex justify-end gap-2"><button class="btn btn-ghost" data-r="0">Cancelar</button><button class="btn btn-primary" data-r="1">Aceptar</button></div>'
      );
      m.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (b) { const v = $('#pmIn', m.el).value.trim(); m.close(); resolve(b.dataset.r === '1' ? v : null); }
        else if (e.target.closest('[data-close]')) resolve(null);
      });
    });
  },
  busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(label || 'Procesando…'); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  },
  estadoChip(e) {
    const m = ESTADO_META[e] || ESTADO_META.Lead;
    return '<span class="chip" style="color:' + m.c + '"><span class="dot" style="background:' + m.c + '"></span>' + esc(e) + '</span>';
  },
  pagoChip(e) {
    const c = PAGO_META[e] || '#64748b';
    return '<span class="chip" style="color:' + c + '"><span class="dot" style="background:' + c + '"></span>' + esc(e || '—') + '</span>';
  },
  empty(icon, title, text) {
    return '<div class="text-center py-10 px-4"><div class="w-12 h-12 mx-auto rounded-2xl glass-soft grid place-items-center muted mb-3"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="font-bold">' + esc(title) + '</div><div class="text-sm muted mt-1">' + esc(text || '') + '</div></div>';
  },
};

const Drawer = {
  open(html) { $('#drawer').innerHTML = html; $('#drawer').classList.add('show'); $('#scrim').classList.add('show'); },
  set(html) { $('#drawer').innerHTML = html; },
  close() { $('#drawer').classList.remove('show'); $('#scrim').classList.remove('show'); S.cur = null; },
  isOpen: () => $('#drawer').classList.contains('show'),
};

/* ================================ TABLAS ================================= */
/**
 * Tabla genérica: búsqueda, filtros por columna, orden por columna (asc → desc → sin orden)
 * y exportación a CSV de exactamente lo que se ve (filtrado + ordenado).
 * def: { cols:[{k,label,sort?(row),w?}], rows(), row(r)→<tr>, search(r)→texto,
 *        filters:[{k,label,get(r)}], exp:[[encabezado, get(r)]], name, empty, minW, placeholder }
 */
const Table = {
  LIMIT: 500,
  defs: {},
  st: {},
  state(id, initSort) {
    if (!this.st[id]) this.st[id] = { q: '', sort: initSort || null, f: {} };
    return this.st[id];
  },
  html(id, def) {
    this.defs[id] = def;
    const st = this.state(id, def.initSort);
    const all = def.rows();
    const filters = (def.filters || []).map((f) => {
      const vals = Array.from(new Set(all.map((r) => String(f.get(r) == null ? '' : f.get(r)).trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      if (!vals.length) return '';
      return '<select class="input !w-auto !py-1.5 text-sm max-w-[200px]" data-tf="' + id + '" data-k="' + f.k + '">' +
        '<option value="">' + esc(f.label) + ': todos</option>' +
        vals.map((v) => '<option value="' + esc(v) + '" ' + (st.f[f.k] === v ? 'selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>';
    }).join('');
    return '<div class="glass p-3 mb-4 flex flex-wrap items-center gap-2">' +
      '<div class="relative flex-1 min-w-[200px]"><i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 muted text-sm"></i>' +
      '<input class="input pl-10 !py-2" data-tq="' + id + '" placeholder="' + esc(def.placeholder || 'Buscar…') + '" value="' + esc(st.q) + '"></div>' +
      (filters ? '<button class="btn btn-ghost btn-sm sm:hidden" data-act="tFilters" data-t="' + id + '"><i class="fa-solid fa-sliders"></i> Filtros<span id="tFn_' + id + '"></span></button>' : '') +
      '<div class="tfilters" id="tF_' + id + '">' + filters + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-act="tClear" data-t="' + id + '" title="Quitar búsqueda y filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>' +
      '<button class="btn btn-ghost btn-sm" data-act="tExport" data-t="' + id + '" title="Exporta lo que ves (con filtros y orden)"><i class="fa-solid fa-file-arrow-down"></i> Exportar CSV</button>' +
      '<span class="text-xs muted font-semibold" id="tCount_' + id + '"></span></div>' +
      '<div class="glass overflow-hidden"><div class="overflow-x-auto scroll-thin"><table class="table" style="min-width:' + (def.minW || 760) + 'px"><thead><tr>' +
      def.cols.map((c) => '<th' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + (c.sort
        ? '<button class="inline-flex items-center gap-1.5 uppercase hover:text-indigo-500" data-act="tSort" data-t="' + id + '" data-k="' + c.k + '">' + esc(c.label) + ' <span class="sort-ic">' + Table.icon(st, c.k) + '</span></button>'
        : esc(c.label || '')) + '</th>').join('') +
      '</tr></thead><tbody id="tBody_' + id + '"></tbody></table></div></div>';
  },
  icon(st, k) {
    if (!st.sort || st.sort.k !== k) return ic('sort', 'opacity-30');
    return ic(st.sort.dir > 0 ? 'sortUp' : 'sortDown', 'text-indigo-500');
  },
  /** Filas filtradas y ordenadas. Los vacíos siempre quedan al final. */
  view(id) {
    const def = this.defs[id], st = this.state(id);
    const q = normName(st.q);
    let rows = def.rows().filter((r) => (!q || normName(def.search(r)).includes(q)) &&
      (def.filters || []).every((f) => !st.f[f.k] || String(f.get(r) == null ? '' : f.get(r)).trim() === st.f[f.k]));
    const col = st.sort && def.cols.find((c) => c.k === st.sort.k);
    if (col && col.sort) {
      const d = st.sort.dir;
      const empty = (v) => v == null || v === '' || (typeof v === 'number' && isNaN(v));
      rows = rows.map((r) => [col.sort(r), r]).sort((a, b) => {
        if (empty(a[0]) || empty(b[0])) return empty(a[0]) - empty(b[0]);
        const c = typeof a[0] === 'number' && typeof b[0] === 'number' ? a[0] - b[0]
          : String(a[0]).localeCompare(String(b[0]), 'es', { numeric: true, sensitivity: 'base' });
        return c * d;
      }).map((x) => x[1]);
    }
    return rows;
  },
  body(id) {
    const def = this.defs[id];
    const tb = $('#tBody_' + id);
    if (!def || !tb) return;
    const rows = this.view(id);
    const total = def.rows().length;
    tb.innerHTML = rows.length
      ? rows.slice(0, this.LIMIT).map(def.row).join('') +
        (rows.length > this.LIMIT ? '<tr><td colspan="' + def.cols.length + '" class="text-center text-xs muted">Mostrando ' + this.LIMIT + ' de ' + rows.length + '. Filtra para acotar; "Exportar CSV" incluye todos.</td></tr>' : '')
      : '<tr><td colspan="' + def.cols.length + '">' + (total ? UI.empty('fa-filter', 'Sin coincidencias', 'Ajusta la búsqueda o los filtros.') : def.empty) + '</td></tr>';
    const c = $('#tCount_' + id);
    if (c) c.textContent = rows.length === total ? num(total) + ' registros' : num(rows.length) + ' de ' + num(total);
    const nf = Object.keys(this.state(id).f).filter((k) => this.state(id).f[k]).length;
    const fn = $('#tFn_' + id);
    if (fn) fn.textContent = nf ? ' (' + nf + ')' : '';
    $$('[data-act="tSort"][data-t="' + id + '"]').forEach((b) => { b.querySelector('.sort-ic').innerHTML = Table.icon(this.state(id), b.dataset.k); });
  },
  sort(id, k) {
    const st = this.state(id);
    if (!st.sort || st.sort.k !== k) st.sort = { k: k, dir: 1 };
    else if (st.sort.dir > 0) st.sort.dir = -1;
    else st.sort = null;
    this.body(id);
  },
  clear(id) {
    const st = this.state(id);
    st.q = ''; st.f = {};
    $$('[data-tq="' + id + '"]').forEach((i) => { i.value = ''; });
    $$('[data-tf="' + id + '"]').forEach((s) => { s.value = ''; });
    this.body(id);
  },
  exportCsv(id) {
    const def = this.defs[id];
    const rows = this.view(id);
    if (!rows.length) { UI.toast('No hay registros para exportar.'); return; }
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel/Sheets
      return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [def.exp.map((e) => cell(e[0])).join(',')].concat(rows.map((r) => def.exp.map((e) => cell(e[1](r))).join(',')));
    downloadFile(def.name + '_' + S.hoy + '.csv', '﻿' + lines.join('\r\n'));
    UI.toast(rows.length + ' registros exportados', 'ok');
  },
};
