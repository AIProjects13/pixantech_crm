import { html, setHTML, attrs } from './html.js';
import { icon } from './icons.js';
import { norm, num, debounce } from './format.js';
import { toast } from './toast.js';

const LIMIT = 300;
const state = {};

const isEmpty = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v));

/** Filtra (búsqueda sin tildes + filtros exactos) y ordena; vacíos siempre al final. */
export function filterSort(rows, def, st) {
  const q = norm(st.q);
  let out = rows.filter((r) => (!q || norm(def.search(r)).includes(q)) &&
    (def.filters || []).every((f) => !st.f[f.k] || String(f.get(r) == null ? '' : f.get(r)).trim() === st.f[f.k]));
  const col = st.sort && def.cols.find((c) => c.k === st.sort.k);
  if (col && col.sort) {
    const d = st.sort.dir;
    out = out.map((r) => [col.sort(r), r]).sort((a, b) => {
      if (isEmpty(a[0]) || isEmpty(b[0])) return isEmpty(a[0]) - isEmpty(b[0]);
      const c = typeof a[0] === 'number' && typeof b[0] === 'number' ? a[0] - b[0]
        : String(a[0]).localeCompare(String(b[0]), 'es', { numeric: true, sensitivity: 'base' });
      return c * d;
    }).map((x) => x[1]);
  }
  return out;
}

export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (typeof v !== 'number' && !/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadFile(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const bound = new WeakMap();
const BOM = String.fromCharCode(0xFEFF);

export function createTable(id, def) {
  const st = state[id] || (state[id] = { q: '', f: {}, sort: def.initSort || null });
  let root = null;

  const sortIcon = (k) => (!st.sort || st.sort.k !== k ? '↕' : st.sort.dir > 0 ? '↑' : '↓');

  function html_() {
    const all = def.rows();
    const filters = (def.filters || []).map((f) => {
      const vals = Array.from(new Set(all.map((r) => String(f.get(r) == null ? '' : f.get(r)).trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      if (!vals.length) return '';
      return html`<label class="sr-only" for="tf_${id}_${f.k}">${f.label}</label>
        <select class="input" style="width:auto" id="tf_${id}_${f.k}" data-tf="${f.k}">
        <option value="">${f.label}: todos</option>${vals.map((v) => html`<option value="${v}"${attrs({ selected: st.f[f.k] === v })}>${v}</option>`)}</select>`;
    });
    return html`<div class="toolbar">
        <div class="search">${icon('search', 16)}<label class="sr-only" for="tq_${id}">Buscar</label>
          <input class="input" id="tq_${id}" data-tq placeholder="${def.placeholder || 'Buscar…'}" value="${st.q}"></div>
        ${filters}
        <button type="button" class="btn btn-ghost btn-sm" data-tclear title="Quitar búsqueda y filtros">${icon('filter', 16)} Limpiar</button>
        ${def.exp ? html`<button type="button" class="btn btn-ghost btn-sm" data-texport>${icon('download', 16)} Exportar CSV</button>` : ''}
        <span class="muted" data-tcount></span>
      </div>
      <div class="table-wrap"><table class="table ${def.cards === false ? '' : 'cards'}">
        <thead><tr>${def.cols.map((c) => html`<th scope="col"${attrs({ style: c.w ? 'width:' + c.w : null })}>${c.sort
          ? html`<button type="button" class="sort" data-tsort="${c.k}" aria-label="Ordenar por ${c.label}">${c.label} <span aria-hidden="true">${sortIcon(c.k)}</span></button>`
          : c.label}</th>`)}</tr></thead>
        <tbody data-tbody></tbody></table></div>`;
  }

  function refresh() {
    if (!root || !root.querySelector('[data-tbody]')) return;
    const rows = filterSort(def.rows(), def, st);
    const total = def.rows().length;
    const body = root.querySelector('[data-tbody]');
    setHTML(body, rows.length
      ? html`${rows.slice(0, LIMIT).map(def.row)}${rows.length > LIMIT
        ? html`<tr><td colspan="${def.cols.length}" class="muted">Mostrando ${LIMIT} de ${rows.length}. Filtra para acotar; "Exportar CSV" incluye todos.</td></tr>` : ''}`
      : html`<tr><td colspan="${def.cols.length}">${total ? html`<div class="empty"><strong>Sin coincidencias</strong>Ajusta la búsqueda o los filtros.</div>` : def.empty}</td></tr>`);
    root.querySelector('[data-tcount]').textContent = rows.length === total ? num(total) + ' registros' : num(rows.length) + ' de ' + num(total);
    root.querySelectorAll('[data-tsort]').forEach((b) => { b.querySelector('span').textContent = sortIcon(b.dataset.tsort); });
  }

  function mount(el) {
    root = el;
    const prevH = bound.get(el);
    if (prevH) { el.removeEventListener('input', prevH.input); el.removeEventListener('change', prevH.change); el.removeEventListener('click', prevH.click); }
    setHTML(el, html_());
    const search = debounce((v) => { st.q = v; refresh(); }, 120);
    const onInput = (e) => { if (e.target.matches('[data-tq]')) search(e.target.value); };
    const onChange = (e) => { if (e.target.matches('[data-tf]')) { st.f[e.target.dataset.tf] = e.target.value; refresh(); } };
    const onClick = (e) => {
      const s = e.target.closest('[data-tsort]');
      if (s) {
        const k = s.dataset.tsort;
        if (!st.sort || st.sort.k !== k) st.sort = { k, dir: 1 }; else if (st.sort.dir > 0) st.sort.dir = -1; else st.sort = null;
        refresh();
      }
      if (e.target.closest('[data-tclear]')) {
        st.q = ''; st.f = {};
        el.querySelector('[data-tq]').value = '';
        el.querySelectorAll('[data-tf]').forEach((x) => { x.value = ''; });
        refresh();
      }
      if (e.target.closest('[data-texport]')) {
        const rows = filterSort(def.rows(), def, st);
        if (!rows.length) { toast('No hay registros para exportar.'); return; }
        const lines = [def.exp.map((x) => csvCell(x[0])).join(',')].concat(rows.map((r) => def.exp.map((x) => csvCell(x[1](r))).join(',')));
        downloadFile(def.name + '_' + new Date().toISOString().slice(0, 10) + '.csv', BOM + lines.join('\r\n'));
        toast(rows.length + ' registros exportados', 'ok');
      }
    };
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    el.addEventListener('click', onClick);
    bound.set(el, { input: onInput, change: onChange, click: onClick });
    refresh();
  }

  return { html: html_, mount, refresh, state: st };
}
