'use strict';

/** Marca duplicados contra los prospectos ya cargados y dentro del mismo archivo (el servidor vuelve a validar al importar). */
function impMark() {
  const emails = new Set(), phones = new Set(), names = new Set();
  S.leads.forEach((l) => {
    if (l.email) emails.add(String(l.email).toLowerCase());
    const pk = phoneKey(l.telefono);
    if (pk) phones.add(pk);
    names.add(normName(l.nombre));
  });
  const inFile = { e: new Set(), p: new Set(), n: new Set() };
  S.imp.rows.forEach((r) => {
    if (r.importado) return;
    r.duplicado = false; r.motivo = ''; r.invalido = '';
    if (!r.nombre) { r.invalido = 'Falta el nombre'; return; }
    const pk = phoneKey(r.telefono);
    const nk = normName(r.nombre);
    const anon = !r.email && !pk;
    if (r.email && emails.has(r.email)) { r.duplicado = true; r.motivo = 'El email ya existe en la base de prospectos.'; }
    else if (pk && phones.has(pk)) { r.duplicado = true; r.motivo = 'El teléfono ya existe en la base de prospectos.'; }
    else if (anon && names.has(nk)) { r.duplicado = true; r.motivo = 'Ya existe una empresa con ese nombre.'; }
    else if ((r.email && inFile.e.has(r.email)) || (pk && inFile.p.has(pk)) || (anon && inFile.n.has(nk))) { r.duplicado = true; r.motivo = 'Repetido dentro del mismo archivo.'; }
    if (!r.duplicado) { if (r.email) inFile.e.add(r.email); if (pk) inFile.p.add(pk); if (anon) inFile.n.add(nk); }
  });
}

function impLoadFile(file) {
  if (!/\.(csv|txt)$/i.test(file.name)) { UI.toast('Selecciona un archivo .csv', 'error'); return; }
  if (file.size > Csv.MAX_BYTES) { UI.toast('El archivo supera los 2 MB. Divídelo en partes más pequeñas.', 'error'); return; }
  const rd = new FileReader();
  rd.onerror = () => UI.toast('No se pudo leer el archivo.', 'error');
  rd.onload = () => {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(rd.result); }
    catch (e) { text = new TextDecoder('windows-1252').decode(rd.result); } // Excel suele guardar en ANSI
    const r = Csv.toRows(text);
    Object.assign(S.imp, { file: file.name, rows: r.rows, error: r.error, extraLabels: r.extraLabels || [], truncated: !!r.truncated, open: !!r.open });
    impMark();
    S.imp.selected = new Set(S.imp.rows.filter((x) => !x.duplicado && !x.invalido).map((x) => x._k));
    if (S.view === 'importar') {
      $('#impFileName').textContent = file.name;
      $('#impResults').innerHTML = Views.importarResults();
    }
    if (r.error) UI.toast(r.error, 'error');
    else {
      const nd = S.imp.rows.filter((x) => x.duplicado).length;
      UI.toast(S.imp.rows.length + ' filas leídas · ' + S.imp.selected.size + ' nuevas' + (nd ? ' · ' + nd + ' ya existen y no se importarán' : ''), 'ok');
    }
  };
  rd.readAsArrayBuffer(file);
}

Object.assign(Views, {
  importar() {
    const d = S.imp.defaults;
    const P = S.user.perms;
    return '<div class="grid gap-4 xl:grid-cols-[360px_1fr]">' +
      '<div class="glass p-5 space-y-4 self-start xl:sticky xl:top-28">' +
      '<div class="flex items-center gap-3 mb-1"><span class="kpi-icon" style="background:linear-gradient(135deg,#6366f1,#06b6d4)"><i class="fa-solid fa-file-csv"></i></span>' +
      '<div><h3 class="font-bold">Importar desde CSV</h3><p class="text-xs muted">Carga el archivo de la búsqueda, sin duplicados</p></div></div>' +
      '<label id="impDrop" class="block rounded-2xl border-2 border-dashed hairline p-6 text-center cursor-pointer transition">' +
      '<i class="fa-solid fa-cloud-arrow-up text-2xl muted"></i>' +
      '<div class="font-semibold mt-2 text-sm">Arrastra tu archivo .csv o haz clic</div>' +
      '<div class="text-xs muted mt-1 break-all" id="impFileName">' + (S.imp.file ? esc(S.imp.file) : 'Máx. 2 MB · hasta ' + Csv.MAX_ROWS + ' filas') + '</div>' +
      '<input id="impFile" type="file" accept=".csv,.txt,text/csv,text/plain" class="sr-only"></label>' +
      '<div><label class="label">Rubro por defecto</label><input id="impRubro" class="input" maxlength="100" placeholder="Si el archivo no trae la columna rubro" value="' + esc(d.rubro) + '"></div>' +
      '<div class="grid grid-cols-2 gap-3"><div><label class="label">País por defecto</label><input id="impPais" class="input" maxlength="80" value="' + esc(d.pais) + '"></div>' +
      '<div><label class="label">Región por defecto</label><input id="impRegion" class="input" maxlength="100" value="' + esc(d.region) + '"></div></div>' +
      '<button class="btn btn-ghost btn-sm w-full" data-act="impTemplate"><i class="fa-solid fa-download"></i> Descargar plantilla CSV</button>' +
      (P.leads_crear ? '<button class="btn btn-ghost btn-sm w-full" data-act="newLead"><i class="fa-solid fa-plus"></i> Agregar prospecto manualmente</button>' : '') +
      '<p class="text-xs muted">Columnas: <code class="break-all">' + esc(Csv.TEMPLATE_HEAD) + '</code>. Solo <b>nombre</b> es obligatorio; cualquier otra columna se guarda en las notas del prospecto.</p></div>' +
      '<div id="impResults" class="min-w-0">' + Views.importarResults() + '</div></div>';
  },
  importarMount() {
    const fi = $('#impFile'), dz = $('#impDrop');
    fi.addEventListener('change', () => { if (fi.files[0]) impLoadFile(fi.files[0]); fi.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.style.borderColor = 'var(--accent)'; }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.style.borderColor = ''; }));
    dz.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) impLoadFile(f); });
    [['impRubro', 'rubro'], ['impPais', 'pais'], ['impRegion', 'region']].forEach((p) =>
      $('#' + p[0]).addEventListener('input', (e) => { S.imp.defaults[p[1]] = e.target.value.trim(); }));
  },
  importarResults() {
    const I = S.imp, R = I.rows, P = S.user.perms;
    if (I.error) return '<div class="glass p-5 text-sm flex gap-3"><i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5"></i><div>' + esc(I.error) + '</div></div>';
    if (!R.length) return '<div class="glass">' + UI.empty('fa-file-csv', 'Sin archivo cargado', 'Sube el CSV que generó la búsqueda o agrega prospectos manualmente.') + '</div>';
    const ok = (r) => !r.duplicado && !r.invalido && !r.importado;
    const sel = R.filter((r) => I.selected.has(r._k) && ok(r)).length;
    const nDup = R.filter((r) => r.duplicado).length;
    const nBad = R.filter((r) => r.invalido).length;
    const nDone = R.filter((r) => r.importado).length;
    const tplOpts = S.plantillas.map((t) => '<option value="' + esc(t.id) + '" ' + (t.activa ? 'selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const warn = [];
    if (I.truncated) warn.push('El archivo trae más de ' + Csv.MAX_ROWS + ' filas: solo se leyeron las primeras ' + Csv.MAX_ROWS + '. Importa y vuelve a cargar el resto.');
    if (I.open) warn.push('Hay comillas sin cerrar en el archivo; revisa que las últimas filas se vean bien.');
    if (I.extraLabels.length) warn.push('Columnas adicionales que se guardarán en las notas: ' + I.extraLabels.join(', ') + '.');
    const dupAviso = nDup ? (() => {
      const enFile = R.filter((r) => r.duplicado && /^Repetido/.test(r.motivo)).length;
      const enBase = nDup - enFile;
      const partes = [];
      if (enBase) partes.push(enBase + ' ya ' + (enBase === 1 ? 'está' : 'están') + ' en tu pipeline');
      if (enFile) partes.push(enFile + ' ' + (enFile === 1 ? 'está repetido' : 'están repetidos') + ' dentro del archivo');
      return '<div class="glass p-4 mb-4 text-sm flex gap-3" style="border-left:4px solid #f59e0b"><i class="fa-solid fa-clone text-amber-500 mt-0.5"></i><div>' +
        '<div class="font-bold">' + esc(partes.join(' y ')) + ': no se importarán.</div>' +
        '<div class="text-xs muted mt-1">Se comparan por email, teléfono y, si no tienen ninguno, por nombre. Aparecen en la tabla solo para que los veas; no se pueden seleccionar.</div></div></div>';
    })() : '';
    const info = dupAviso + '<div class="glass p-3 mb-4 text-sm flex flex-wrap items-center gap-2">' +
      '<span class="chip">' + R.length + ' filas</span>' +
      (nDup ? '<span class="chip text-amber-500">' + nDup + ' duplicadas</span>' : '') +
      (nBad ? '<span class="chip text-rose-500">' + nBad + ' sin nombre</span>' : '') +
      (nDone ? '<span class="chip text-emerald-500">' + nDone + ' importadas</span>' : '') +
      (warn.length ? '<div class="basis-full text-xs muted space-y-1 pt-1">' + warn.map((w) => '<div>' + esc(w) + '</div>').join('') + '</div>' : '') + '</div>';
    const bar = '<div class="glass p-3 mb-4 flex flex-wrap items-center gap-3 sticky top-28 z-[5]">' +
      '<button class="btn btn-ghost btn-sm" data-act="impAll">Seleccionar todo</button>' +
      (nDup || nBad ? '<button class="btn btn-ghost btn-sm" data-act="impHide"><i class="fa-solid ' + (I.hideOff ? 'fa-eye' : 'fa-eye-slash') + '"></i> ' + (I.hideOff ? 'Mostrar' : 'Ocultar') + ' duplicados</button>' : '') + '<span class="text-sm font-semibold">' + sel + ' seleccionados</span>' +
      '<div class="flex-1"></div>' +
      (P.correo_enviar && S.plantillas.length ? '<label class="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input id="impAuto" type="checkbox" class="w-4 h-4 accent-indigo-500"> Auto-enviar correo</label>' +
        '<select id="impTpl" class="input !w-auto !py-1.5 text-sm">' + tplOpts + '</select>' : '') +
      (P.leads_crear ? '<button id="impImport" class="btn btn-primary" data-act="impImport" ' + (sel ? '' : 'disabled') + '><i class="fa-solid fa-file-import"></i> Importar a la bolsa</button>' : '') +
      '</div>';
    const SHOW = 300;
    const rows = R.filter((r) => !I.hideOff || ok(r) || r.importado).slice(0, SHOW).map((r) => {
      const off = !ok(r);
      const on = I.selected.has(r._k) && !off;
      const w = r.web && !/^https?:\/\//i.test(r.web) ? 'https://' + r.web : r.web;
      const extras = r.extras.length ? '<span class="chip" title="' + esc(r.extras.map((x) => x[0] + ': ' + x[1]).join(' · ').slice(0, 400)) + '">+' + r.extras.length + ' datos</span>' : '';
      const estado = r.importado ? '<span class="chip text-emerald-500"><i class="fa-solid fa-check"></i> Importado</span>'
        : r.invalido ? '<span class="chip text-rose-500"><i class="fa-solid fa-ban"></i> ' + esc(r.invalido) + '</span>'
        : r.duplicado ? '<span class="chip text-amber-500" title="' + esc(r.motivo) + '"><i class="fa-solid fa-clone"></i> No se importa</span><div class="text-[11px] muted mt-1 leading-snug">' + esc(r.motivo) + '</div>'
        : '<span class="chip text-indigo-500">Nuevo</span>';
      return '<tr class="' + (off ? 'opacity-60' : 'cursor-pointer') + '" ' + (off ? '' : 'data-act="impToggle" data-k="' + r._k + '"') + '>' +
        '<td><span class="w-6 h-6 rounded-lg grid place-items-center ' + (on ? 'text-white' : '') + '" style="' + (on ? 'background:var(--accent)' : 'border:1.5px solid var(--line)') + '">' + (on ? '<i class="fa-solid fa-check text-xs"></i>' : '') + '</span></td>' +
        '<td><div class="font-semibold">' + esc(r.nombre || '—') + '</div><div class="text-xs muted">' + esc([r.rubro, r.region, r.pais].filter(Boolean).join(' · ')) + '</div></td>' +
        '<td><div class="text-sm">' + esc(r.contacto || '') + '</div><div class="text-xs muted">' + esc(r.email) + '</div><div class="text-xs muted">' + esc(r.telefono) + '</div></td>' +
        '<td>' + (safeUrl(w) ? '<a href="' + esc(w) + '" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:underline text-xs break-all">' + esc(w.replace(/^https?:\/\//i, '').slice(0, 40)) + '</a>' : '') + ' ' + extras + '</td>' +
        '<td>' + estado + '</td></tr>';
    }).join('');
    return info + bar + '<div class="glass overflow-hidden"><div class="overflow-x-auto scroll-thin"><table class="table min-w-[760px]"><thead><tr>' +
      '<th style="width:44px"></th><th>Empresa</th><th>Contacto</th><th>Web</th><th style="width:200px">Estado</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      (R.length > SHOW ? '<div class="text-center text-xs muted py-3">Mostrando las primeras ' + SHOW + ' de ' + R.length + ' filas. Las demás también se importan si están seleccionadas.</div>' : '');
  },
});

Object.assign(Actions, {
  impToggle(el) {
    const k = Number(el.dataset.k);
    S.imp.selected.has(k) ? S.imp.selected.delete(k) : S.imp.selected.add(k);
    $('#impResults').innerHTML = Views.importarResults();
  },
  impHide() { S.imp.hideOff = !S.imp.hideOff; $('#impResults').innerHTML = Views.importarResults(); },
  impAll() {
    const avail = S.imp.rows.filter((r) => !r.duplicado && !r.invalido && !r.importado);
    const all = avail.every((r) => S.imp.selected.has(r._k));
    avail.forEach((r) => (all ? S.imp.selected.delete(r._k) : S.imp.selected.add(r._k)));
    $('#impResults').innerHTML = Views.importarResults();
  },
  impTemplate() { downloadFile('plantilla_prospectos.csv', '﻿' + Csv.TEMPLATE_HEAD + '\r\n'); },
  async impImport(el) {
    const items = S.imp.rows.filter((r) => S.imp.selected.has(r._k) && !r.duplicado && !r.invalido && !r.importado);
    if (!items.length) return;
    const auto = $('#impAuto') && $('#impAuto').checked;
    const msg = 'Se importarán ' + items.length + ' prospectos' + (auto ? ' y se enviará el correo a los que tengan email.' : '.');
    if (!(await UI.confirm(auto ? 'Importar y enviar' : 'Importar prospectos', msg, { ok: auto ? 'Importar y enviar' : 'Importar' }))) return;
    const tpl = auto ? $('#impTpl').value : undefined;
    const d = S.imp.defaults;
    let ins = 0, rej = 0, mails = 0;
    try {
      for (let o = 0; o < items.length; o += 50) {
        const chunk = items.slice(o, o + 50);
        UI.busy(el, true, 'Importando ' + Math.min(o + 50, items.length) + '/' + items.length + '…');
        const r = await Api.call('leads.import', {
          items: chunk.map((x) => ({
            nombre: x.nombre, telefono: x.telefono, web: x.web, colores: x.colores, contacto: x.contacto, email: x.email,
            rubro: x.rubro || d.rubro, pais: x.pais || d.pais, region: x.region || d.region, extras: x.extras,
          })),
          autoEmail: !!auto, plantillaId: tpl, rubro: d.rubro, pais: d.pais, region: d.region, origen: 'csv',
        });
        r.leads.forEach(upsertLead);
        r.resultados.forEach((res) => {
          const it = chunk[res.i];
          if (!it) return;
          if (res.ok) it.importado = true; else { it.duplicado = true; it.motivo = res.motivo; }
        });
        ins += r.insertados; rej += r.rechazados; mails += r.correosEnviados;
      }
      UI.toast(ins + ' importados' + (mails ? ' · ' + mails + ' correos enviados' : '') + (rej ? ' · ' + rej + ' no se importaron por ya existir en el pipeline' : ''), ins ? 'ok' : 'error');
    } catch (e) {
      UI.toast(e.message + (ins ? ' (antes del error se importaron ' + ins + ')' : ''), 'error');
    }
    S.imp.selected = new Set();
    updateSync();
    if (S.view === 'importar') $('#impResults').innerHTML = Views.importarResults();
  },
});
