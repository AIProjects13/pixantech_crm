import { html, setHTML } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { initials } from '../ui/format.js';
import { VIEWS, allowedViews } from '../router.js';

export function renderShell(root, user) {
  const keys = allowedViews(user);
  const groups = ['Ventas', 'Finanzas', 'Admin'].map((g) => ({ g, items: keys.filter((k) => VIEWS[k].group === g) })).filter((x) => x.items.length);
  setHTML(root, html`<div class="app" id="app">
    <nav class="sidebar" aria-label="Navegación principal">
      <div class="brand"><span class="brand-logo">${icon('zap', 18)}</span>Pixantech</div>
      ${groups.map((x) => html`<div class="nav-group">${x.g}</div>${x.items.map((k) => html`
        <a class="nav-item" href="#/${k}" data-nav="${k}">${icon(VIEWS[k].icon)}<span>${VIEWS[k].title}</span></a>`)}`)}
      <div class="sidebar-foot">
        <span class="avatar" aria-hidden="true">${initials(user.nombre || user.email)}</span>
        <div style="min-width:0;flex:1"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.nombre || user.email}</div>
          <div class="muted" style="font-size:12px">${user.rol}</div></div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${icon('logout', 16)}</button>
      </div>
    </nav>
    <div class="main">
      <header class="topbar">
        <button type="button" class="btn btn-ghost btn-icon menu-btn" data-act="menu" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
        <div style="min-width:0"><h1 id="viewTitle"></h1><p class="muted" id="viewSub" style="font-size:12px"></p></div>
        <div class="spacer"></div>
        <span class="muted" id="syncInfo" style="font-size:12px"></span>
        <button type="button" class="btn btn-ghost btn-icon" data-act="refresh" aria-label="Actualizar datos" title="Actualizar">${icon('refresh')}</button>
        <button type="button" class="btn btn-ghost btn-icon" data-act="bell" aria-label="Alertas de cobro" title="Alertas de cobro" style="position:relative">${icon('bell')}<span class="badge" hidden style="position:absolute;top:-4px;right:-4px"></span></button>
        <button type="button" class="btn btn-ghost btn-icon" data-act="theme" aria-label="Cambiar tema claro/oscuro" title="Tema">${icon('moon')}</button>
      </header>
      <main class="content" id="view" tabindex="-1"></main>
    </div></div>`);
  const app = root.querySelector('#app');
  return {
    contentEl: root.querySelector('#view'),
    setTitle(t, s) { root.querySelector('#viewTitle').textContent = t; root.querySelector('#viewSub').textContent = s || ''; document.title = t + ' · Pixantech CRM'; },
    setActive(k) {
      root.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === k) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      app.classList.remove('nav-open');
    },
    setBell(n) { const b = root.querySelector('[data-act="bell"] .badge'); b.hidden = !n; b.textContent = String(n || ''); },
    setSync(txt) { root.querySelector('#syncInfo').textContent = txt; },
    toggleMenu() { const open = app.classList.toggle('nav-open'); root.querySelector('[data-act="menu"]').setAttribute('aria-expanded', String(open)); },
  };
}
