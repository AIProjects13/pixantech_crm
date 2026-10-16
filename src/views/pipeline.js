import { html, setHTML, attrs } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { fmtDate, initials, norm, debounce } from '../ui/format.js';
import { isDue } from '../lib/dates.js';
import { quickActions, ESTADO_COLOR } from './common.js';
import { moveLead, quickNote } from './lead-drawer.js';
import { newLeadModal } from './lead-form.js';

const ui = { q: '', dueOnly: false, owner: '' };
const MAX = 80;

export function groupByEstado(leads, estados, { q = '', dueOnly = false, owner = '', hoy = '' } = {}) {
  const nq = norm(q);
  const out = {};
  estados.forEach((e) => { out[e] = []; });
  leads.forEach((l) => {
    if (nq && ![l.nombre, l.contacto, l.email, l.rubro].some((v) => norm(v).includes(nq))) return;
    if (dueOnly && !isDue(l, hoy)) return;
    if (owner && l.asignadoA !== owner) return;
    if (out[l.estado]) out[l.estado].push(l);
  });
  estados.forEach((e) => out[e].sort((a, b) => (isDue(b, hoy) - isDue(a, hoy)) || String(a.fechaContacto || '9').localeCompare(String(b.fechaContacto || '9'))));
  return out;
}

function card(l, s) {
  const due = isDue(l, s.hoy);
  const otro = s.user.isAdmin && l.asignadoA !== s.user.email;
  return html`<article class="lead-card ${due ? 'due' : ''}" draggable="true" data-id="${l.id}">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start">
      <button type="button" class="row-link" style="flex:1" data-act="open" data-id="${l.id}">${l.nombre}</button>
      ${otro ? html`<span class="avatar" style="width:24px;height:24px;font-size:10px" title="${l.asignadoA}">${initials(l.asignadoA)}</span>` : ''}
    </div>
    ${l.contacto ? html`<p class="muted" style="font-size:12px;margin:2px 0 8px">${l.contacto}</p>` : ''}
    <div class="row" style="gap:6px">
      ${l.rubro ? html`<span class="chip">${l.rubro}</span>` : ''}
      ${l.fechaContacto ? html`<span class="chip ${due ? 'chip-danger' : ''}">${icon('calendar', 12)} ${l.fechaContacto === s.hoy ? 'Hoy' : fmtDate(l.fechaContacto)}</span>` : ''}
      ${l.notas ? html`<span class="chip chip-muted">${icon('note', 12)} ${l.notas}</span>` : ''}
      <span class="spacer"></span>
      ${quickActions(l)}
      <button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="quickNote" data-id="${l.id}" aria-label="Agregar nota a ${l.nombre}" title="Agregar nota">${icon('plus', 14)}</button>
      <button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="moveMenu" data-id="${l.id}" aria-haspopup="menu" aria-label="Mover ${l.nombre} a otra etapa" title="Mover a…">${icon('move', 14)}</button>
    </div></article>`;
}

function columns(s) {
  const g = groupByEstado(s.leads, s.estados, { ...ui, hoy: s.hoy });
  return html`${s.estados.map((e) => {
    const items = g[e];
    return html`<section class="kcol" data-drop="${e}" aria-label="${e}: ${items.length} prospectos">
      <header class="kcol-head"><span class="dot" style="background:${ESTADO_COLOR[e]}"></span>${e}<span class="spacer"></span><span class="chip">${items.length}</span></header>
      <div class="kcol-body">${items.length ? items.slice(0, MAX).map((l) => card(l, s)) : html`<div class="empty" style="padding:18px">Sin prospectos</div>`}
        ${items.length > MAX ? html`<div class="muted" style="text-align:center;font-size:12px">+${items.length - MAX} más · usa el buscador</div>` : ''}</div></section>`;
  })}`;
}

export default {
  render(ctx) {
    const s = ctx.store.get();
    const owners = s.user.isAdmin ? Array.from(new Set(s.leads.map((l) => l.asignadoA).filter(Boolean))).sort() : [];
    return html`<div class="toolbar">
        <div class="search">${icon('search', 16)}<label class="sr-only" for="pq">Buscar</label><input id="pq" class="input" placeholder="Buscar empresa, contacto, email o rubro…" value="${ui.q}"></div>
        ${owners.length > 1 ? html`<label class="sr-only" for="powner">Responsable</label><select id="powner" class="input" style="width:auto"><option value="">Todos los responsables</option>
          ${owners.map((o) => html`<option value="${o}"${attrs({ selected: ui.owner === o })}>${o}</option>`)}</select>` : ''}
        <label class="btn btn-ghost"><input type="checkbox" id="pdue"${attrs({ checked: ui.dueOnly })}> Solo vencidos</label>
        <button type="button" class="btn btn-primary" data-act="newLead">${icon('plus', 16)} Nuevo prospecto</button>
      </div><div class="kanban" id="kanban">${columns(s)}</div>`;
  },
  refresh(el, ctx) {
    const k = el.querySelector('#kanban');
    if (!k) return;
    const f = document.activeElement;
    const had = f && k.contains(f) && f.dataset && f.dataset.act ? { act: f.dataset.act, id: f.dataset.id } : null;
    setHTML(k, columns(ctx.store.get()));
    if (had) {
      const n = [...k.querySelectorAll('[data-act]')].find((x) => x.dataset.act === had.act && x.dataset.id === had.id);
      if (n) n.focus();
    }
  },
  mount(el, ctx) {
    const redraw = () => this.refresh(el, ctx);
    const search = debounce((v) => { ui.q = v; redraw(); }, 120);
    let dragId = null;
    const onInput = (e) => { if (e.target.id === 'pq') search(e.target.value); };
    const onChange = (e) => {
      if (e.target.id === 'pdue') { ui.dueOnly = e.target.checked; redraw(); }
      if (e.target.id === 'powner') { ui.owner = e.target.value; redraw(); }
    };
    const onClick = (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'open') ctx.openLead(a.dataset.id);
      if (a.dataset.act === 'newLead') newLeadModal(ctx);
      if (a.dataset.act === 'quickNote') quickNote(a.dataset.id, ctx);
      if (a.dataset.act === 'moveMenu') openMoveMenu(a, ctx);
    };
    const onDragStart = (e) => { const c = e.target.closest('.lead-card'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; requestAnimationFrame(() => c.classList.add('dragging')); };
    const onDragEnd = () => { dragId = null; el.querySelectorAll('.dragging,.over').forEach((x) => x.classList.remove('dragging', 'over')); };
    const onDragOver = (e) => { const col = e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault(); el.querySelectorAll('.kcol.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); };
    const onDrop = (e) => { const col = e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault(); const id = dragId; onDragEnd(); moveLead(id, col.dataset.drop, ctx); };
    const pairs = [['input', onInput], ['change', onChange], ['click', onClick], ['dragstart', onDragStart], ['dragend', onDragEnd], ['dragover', onDragOver], ['drop', onDrop]];
    pairs.forEach(([t, f]) => el.addEventListener(t, f));
    return () => { closeMenu(); pairs.forEach(([t, f]) => el.removeEventListener(t, f)); };
  },
};

let menu = null;
let offHandler = null;
function closeMenu() {
  if (menu) { menu.remove(); menu = null; }
  if (offHandler) { document.removeEventListener('mousedown', offHandler); offHandler = null; }
}
function openMoveMenu(btn, ctx) {
  closeMenu();
  const s = ctx.store.get();
  const l = s.leads.find((x) => x.id === btn.dataset.id);
  if (!l) return;
  menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  setHTML(menu, html`${s.estados.filter((e) => e !== l.estado).map((e) => html`<button type="button" role="menuitem" data-act="moveTo" data-id="${l.id}" data-estado="${e}">${e}</button>`)}`);
  const r = btn.getBoundingClientRect();
  menu.style.top = (window.scrollY + r.bottom + 4) + 'px';
  menu.style.left = Math.max(8, window.scrollX + r.right - 200) + 'px';
  document.body.appendChild(menu);
  menu.addEventListener('click', (e) => { const a = e.target.closest('[data-act="moveTo"]'); if (a) {
      const id = a.dataset.id;
      closeMenu();
      const focusBtn = () => { const b = [...document.querySelectorAll('[data-act="moveMenu"]')].find((x) => x.dataset.id === id); if (b) b.focus(); };
      btn.focus();
      Promise.resolve(moveLead(id, a.dataset.estado, ctx)).then(focusBtn, focusBtn);
    } });
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); btn.focus(); }
  });
  const mine = menu;
  setTimeout(() => {
    if (menu !== mine) return;
    mine.querySelector('button').focus();
    offHandler = (ev) => { if (menu && !menu.contains(ev.target)) closeMenu(); };
    document.addEventListener('mousedown', offHandler);
  }, 0);
}
