import { html, setHTML, attrs, safeHref } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { norm } from '../ui/format.js';
import { Csv, decodeFile } from '../lib/csv.js';
import { normPhone } from '../lib/phone.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { downloadFile } from '../ui/table.js';
import { upsert } from '../state.js';

const S = { rows: [], selected: new Set(), file: '', error: '', extraLabels: [], truncated: false, open: false, defaults: { rubro: '', pais: 'Guatemala', region: '' }, asignadoA: '' };

/** Marca duplicados (contra leads + bolsa + el propio archivo) con la normalización del backend. */
export function markRows(rows, leads, bolsa, cc) {
  const emails = new Set(); const phones = new Set(); const names = new Set();
  leads.concat(bolsa).forEach((l) => {
    if (l.email) emails.add(String(l.email).toLowerCase());
    const p = normPhone(l.telefono, cc); if (p.length >= 7) phones.add(p);
    names.add(norm(l.nombre));
  });
  const fe = new Set(); const fp = new Set(); const fn = new Set();
  rows.forEach((r) => {
    if (r.importado) return;
    r.duplicado = false; r.motivo = ''; r.invalido = '';
    if (!r.nombre) { r.invalido = 'Falta el nombre'; return; }
    const e = String(r.email || '').toLowerCase();
    const p = normPhone(r.telefono, cc);
    const n = norm(r.nombre);
    const anon = !e && p.length < 7;
    if (e && emails.has(e)) { r.duplicado = true; r.motivo = 'El email ya existe en el CRM.'; }
    else if (p.length >= 7 && phones.has(p)) { r.duplicado = true; r.motivo = 'El teléfono ya existe en el CRM.'; }
    else if (anon && names.has(n)) { r.duplicado = true; r.motivo = 'Ya existe una empresa con ese nombre.'; }
    else if ((e && fe.has(e)) || (p.length >= 7 && fp.has(p)) || (anon && fn.has(n))) { r.duplicado = true; r.motivo = 'Repetido dentro del archivo.'; }
    if (!r.duplicado) { if (e) fe.add(e); if (p.length >= 7) fp.add(p); if (anon) fn.add(n); }
  });
  return rows;
}

const ok = (r) => !r.duplicado && !r.invalido && !r.importado;

function results(ctx) {
  const s = ctx.store.get();
  if (S.error) return html`<div class="card" role="alert">${icon('alert', 16)} ${S.error}</div>`;
  if (!S.rows.length) return html`<div class="card empty"><strong>Sin archivo cargado</strong>Sube el CSV de la búsqueda.</div>`;
  const sel = S.rows.filter((r) => S.selected.has(r._k) && ok(r)).length;
  const warn = [];
  if (S.truncated) warn.push('El archivo trae más de ' + Csv.MAX_ROWS + ' filas: solo se leyeron las primeras.');
  if (S.open) warn.push('Hay comillas sin cerrar; revisa las últimas filas.');
  if (S.extraLabels.length) warn.push('Columnas que se guardarán en el historial: ' + S.extraLabels.join(', ') + '.');
  return html`<div class="card" style="margin-bottom:12px"><div class="row">
      <span class="chip">${S.rows.length} filas</span><span class="chip chip-warn">${S.rows.filter((r) => r.duplicado).length} duplicadas</span>
      <span class="chip chip-danger">${S.rows.filter((r) => r.invalido).length} sin nombre</span><span class="chip chip-ok">${S.rows.filter((r) => r.importado).length} importadas</span>
      <span class="spacer"></span><button type="button" class="btn btn-ghost btn-sm" data-act="all">Seleccionar todo</button><strong>${sel} seleccionadas</strong></div>
      ${warn.map((w) => html`<p class="muted" style="font-size:12px;margin-top:6px">${w}</p>`)}
      <div class="row" style="margin-top:12px">
        <label class="field" style="min-width:220px"><span class="label">Asignar a</span><select class="input" id="impAsig"><option value="">— Bolsa —</option>
          ${s.usuarios.map((u) => html`<option value="${u.email}"${attrs({ selected: S.asignadoA === u.email })}>${u.nombre}</option>`)}</select></label>
        ${s.plantillas.length ? html`<label class="row" style="margin-top:20px"><input type="checkbox" id="impAuto"> Auto-enviar correo</label>
          <select class="input" id="impTpl" style="width:auto;margin-top:20px" aria-label="Plantilla">${s.plantillas.map((t) => html`<option value="${t.id}"${attrs({ selected: t.activa })}>${t.nombre}</option>`)}</select>` : ''}
        <span class="spacer"></span><button type="button" class="btn btn-primary" data-act="import" style="margin-top:20px"${attrs({ disabled: !sel })}>${icon('upload', 16)} Importar ${sel}</button>
      </div></div>
    <div class="table-wrap"><table class="table cards"><thead><tr><th style="width:44px"><span class="sr-only">Seleccionar</span></th><th>Empresa</th><th>Contacto</th><th>Web</th><th>Estado</th></tr></thead>
      <tbody>${S.rows.slice(0, 300).map((r) => {
        const off = !ok(r);
        const w = r.web && !/^https?:\/\//i.test(r.web) ? 'https://' + r.web : r.web;
        return html`<tr><td>${off ? '' : html`<input type="checkbox" data-k="${r._k}" aria-label="Seleccionar ${r.nombre}"${attrs({ checked: S.selected.has(r._k) })}>`}</td>
          <td data-label="Empresa"><strong>${r.nombre || '—'}</strong><div class="muted" style="font-size:12px">${[r.rubro, r.region, r.pais].filter(Boolean).join(' · ')}</div></td>
          <td data-label="Contacto">${r.contacto || ''}<div class="muted" style="font-size:12px">${r.email} ${r.telefono}</div></td>
          <td data-label="Web">${w ? html`<a href="${safeHref(w)}" target="_blank" rel="noopener noreferrer">${String(w).replace(/^https?:\/\//i, '').slice(0, 40)}</a>` : ''}</td>
          <td data-label="Estado">${r.importado ? html`<span class="chip chip-ok">Importado</span>` : r.invalido ? html`<span class="chip chip-danger">${r.invalido}</span>`
            : r.duplicado ? html`<span class="chip chip-warn" title="${r.motivo}">Duplicado</span>` : html`<span class="chip chip-info">Nuevo</span>`}</td></tr>`;
      })}</tbody></table></div>
    ${S.rows.length > 300 ? html`<p class="muted" style="text-align:center;margin-top:8px">Mostrando 300 de ${S.rows.length}; las demás también se importan si están seleccionadas.</p>` : ''}`;
}

function load(file, ctx, el) {
  if (!/\.(csv|txt)$/i.test(file.name)) { toast('Selecciona un archivo .csv', 'error'); return; }
  if (file.size > Csv.MAX_BYTES) { toast('El archivo supera los 2 MB. Divídelo en partes.', 'error'); return; }
  const rd = new FileReader();
  rd.onerror = () => toast('No se pudo leer el archivo.', 'error');
  rd.onload = () => {
    const r = Csv.toRows(decodeFile(rd.result));
    Object.assign(S, { file: file.name, rows: r.rows, error: r.error, extraLabels: r.extraLabels || [], truncated: !!r.truncated, open: !!r.open });
    const s = ctx.store.get();
    markRows(S.rows, s.leads, s.bolsa, s.config.countryCode);
    S.selected = new Set(S.rows.filter(ok).map((x) => x._k));
    el.querySelector('#impName').textContent = file.name;
    setHTML(el.querySelector('#impResults'), results(ctx));
    if (!r.error) toast(S.rows.length + ' filas leídas · ' + S.selected.size + ' nuevas', 'ok');
  };
  rd.readAsArrayBuffer(file);
}

async function doImport(ctx, el) {
  const items = S.rows.filter((r) => S.selected.has(r._k) && ok(r));
  const auto = !!(el.querySelector('#impAuto') && el.querySelector('#impAuto').checked);
  if (!items.length || !(await confirmDialog(auto ? 'Importar y enviar' : 'Importar prospectos',
    'Se importarán ' + items.length + ' prospectos' + (auto ? ' y se enviará el correo a los que tengan email.' : '.'), { ok: 'Importar' }))) return;
  const btn = el.querySelector('[data-act="import"]');
  const d = S.defaults;
  let ins = 0, rej = 0, mails = 0;
  try {
    const size = auto ? 10 : 50; // con envío de correos cada lote tarda mucho más
    for (let o = 0; o < items.length; o += size) {
      const chunk = items.slice(o, o + size);
      btn.disabled = true; btn.textContent = 'Importando ' + Math.min(o + size, items.length) + '/' + items.length + '…';
      const r = await ctx.api.call('leads.import', {
        items: chunk.map((x) => ({ nombre: x.nombre, telefono: x.telefono, web: x.web, colores: x.colores, contacto: x.contacto, email: x.email,
          rubro: x.rubro || d.rubro, pais: x.pais || d.pais, region: x.region || d.region, extras: x.extras })),
        asignadoA: S.asignadoA, autoEmail: auto, plantillaId: auto ? el.querySelector('#impTpl').value : undefined,
        rubro: d.rubro, pais: d.pais, region: d.region, origen: 'csv',
      }, { timeoutMs: 330000 });
      r.leads.forEach((l) => upsert(l.asignadoA ? 'leads' : 'bolsa', l));
      r.resultados.forEach((res) => { const it = chunk[res.i]; if (!it) return; if (res.ok) it.importado = true; else { it.duplicado = true; it.motivo = res.motivo; } });
      ins += r.insertados; rej += r.rechazados; mails += r.correosEnviados;
    }
    toast(ins + ' importados' + (mails ? ' · ' + mails + ' correos' : '') + (rej ? ' · ' + rej + ' rechazados' : ''), ins ? 'ok' : 'error');
  } catch (e) {
    toast(e.message + (ins ? ' (antes del error se importaron ' + ins + ')' : ''), 'error');
  }
  S.selected = new Set();
  setHTML(el.querySelector('#impResults'), results(ctx));
}

export default {
  render(ctx) {
    const d = S.defaults;
    return html`<div class="grid" style="grid-template-columns:minmax(260px,340px) 1fr;align-items:start">
      <section class="card stack">
        <div class="card-title">${icon('csv', 18)} Importar desde CSV</div>
        <label class="field" id="impDrop" style="border:2px dashed var(--line-strong);border-radius:14px;padding:22px;text-align:center;cursor:pointer">
          <span>${icon('upload', 22)}</span><strong>Arrastra el .csv o haz clic</strong><span class="muted" id="impName" style="font-size:12px">${S.file || 'Máx. 2 MB · hasta ' + Csv.MAX_ROWS + ' filas'}</span>
          <input id="impFile" type="file" accept=".csv,.txt,text/csv,text/plain" class="sr-only"></label>
        <label class="field"><span class="label">Rubro por defecto</span><input class="input" data-def="rubro" value="${d.rubro}"></label>
        <div class="form-grid"><label class="field"><span class="label">País</span><input class="input" data-def="pais" value="${d.pais}"></label>
          <label class="field"><span class="label">Región</span><input class="input" data-def="region" value="${d.region}"></label></div>
        <button type="button" class="btn btn-ghost btn-sm" data-act="tpl">${icon('download', 14)} Descargar plantilla CSV</button>
        <p class="muted" style="font-size:12px">Solo <strong>nombre</strong> es obligatorio; otras columnas se guardan en el historial.</p>
      </section>
      <section id="impResults" style="min-width:0">${results(ctx)}</section></div>`;
  },
  mount(el, ctx) {
    const onChange = (e) => {
      if (e.target.id === 'impFile' && e.target.files[0]) { load(e.target.files[0], ctx, el); e.target.value = ''; }
      if (e.target.matches('[data-k]')) { const k = Number(e.target.dataset.k); if (e.target.checked) S.selected.add(k); else S.selected.delete(k); setHTML(el.querySelector('#impResults'), results(ctx)); }
      if (e.target.id === 'impAsig') S.asignadoA = e.target.value;
    };
    const onInput = (e) => { if (e.target.dataset.def) S.defaults[e.target.dataset.def] = e.target.value.trim(); };
    const onClick = (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'tpl') downloadFile('plantilla_prospectos.csv', '\uFEFF' + Csv.TEMPLATE_HEAD + '\r\n');
      if (a.dataset.act === 'all') { const av = S.rows.filter(ok); const all = av.every((r) => S.selected.has(r._k)); av.forEach((r) => (all ? S.selected.delete(r._k) : S.selected.add(r._k))); setHTML(el.querySelector('#impResults'), results(ctx)); }
      if (a.dataset.act === 'import') doImport(ctx, el);
    };
    const dz = el.querySelector('#impDrop');
    const over = (e) => { e.preventDefault(); dz.style.borderColor = 'var(--accent)'; };
    const leave = (e) => { e.preventDefault(); dz.style.borderColor = ''; };
    const drop = (e) => { leave(e); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) load(f, ctx, el); };
    const pairs = [[el, 'change', onChange], [el, 'input', onInput], [el, 'click', onClick], [dz, 'dragover', over], [dz, 'dragleave', leave], [dz, 'drop', drop]];
    pairs.forEach(([t, ev, f]) => t.addEventListener(ev, f));
    return () => pairs.forEach(([t, ev, f]) => t.removeEventListener(ev, f));
  },
};
