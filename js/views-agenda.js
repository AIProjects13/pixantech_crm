'use strict';

/* ================================ AGENDA ================================= */
// Calendario del mes con los seguimientos (con hora) y las fechas de cobro, y la lista del día elegido.
const Agenda = {
  mes: () => S.ui.calMes || S.hoy.slice(0, 7),
  dia: () => S.ui.segDia || S.hoy,
  titulo(ym) {
    const p = ym.split('-').map(Number);
    const t = new Date(p[0], p[1] - 1, 1).toLocaleDateString(CONFIG.LOCALE, { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  },
  /** Seguimientos pendientes y cobros por fecha: { 'AAAA-MM-DD': { segs, cobros } } */
  porDia() {
    const m = {};
    const at = (k) => (m[k] = m[k] || { segs: [], cobros: [] });
    S.seguimientos.forEach((s) => at(s.fecha).segs.push(s));
    S.clientes.forEach((c) => { if (c.cobro && c.cobro.siguiente) at(c.cobro.siguiente.key).cobros.push(c); });
    return m;
  },
};

function segRowHtml(s) {
  const late = !s.hecho && s.fecha < S.hoy;
  return '<div class="ev-row"><div class="ev-time ' + (s.hecho ? 'opacity-50' : '') + '">' + esc(s.hora) + '</div>' +
    '<div class="min-w-0 flex-1 ' + (s.hecho ? 'opacity-60' : '') + '">' +
    '<div class="text-sm font-bold cursor-pointer hover:underline ' + (s.hecho ? 'line-through' : '') + '" data-act="openLead" data-id="' + esc(s.idLead) + '">' + esc(s.nombreLead || 'Prospecto') + '</div>' +
    '<div class="text-xs muted">' + ic(TIPO_ICON[s.tipo] || 'clock') + ' ' + esc(s.tipo) + (late ? ' · <span class="text-rose-500 font-semibold">atrasado (' + esc(fmtDate(s.fecha)) + ')</span>' : '') + '</div>' +
    (s.nota ? '<div class="text-xs mt-1 break-words">' + esc(s.nota) + '</div>' : '') + '</div>' +
    '<div class="flex gap-1.5 flex-none">' +
    (s.hecho ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="segReopen" data-id="' + esc(s.id) + '" title="Volver a pendiente" aria-label="Reabrir">' + ic('undo') + '</button>'
      : '<button class="btn btn-ghost btn-icon btn-sm" data-act="segDone" data-id="' + esc(s.id) + '" title="Marcar como hecho" aria-label="Hecho">' + ic('check') + '</button>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="segEdit" data-id="' + esc(s.id) + '" title="Editar" aria-label="Editar">' + ic('edit') + '</button>') +
    '<button class="btn btn-ghost btn-icon btn-sm text-rose-500" data-act="segDel" data-id="' + esc(s.id) + '" title="Eliminar" aria-label="Eliminar">' + ic('trash') + '</button></div></div>';
}

function cobroRowHtml(c) {
  const st = c.cobro, vencido = st.estado === 'Vencido';
  const col = COBRO_META[st.estado];
  return '<div class="ev-row"><div class="ev-time" style="color:' + col + '">' + ic('wallet') + '</div><div class="min-w-0 flex-1">' +
    '<div class="text-sm font-bold cursor-pointer hover:underline" data-act="openCobros" data-id="' + esc(c.idLead) + '">' + esc(c.nombre) + '</div>' +
    '<div class="text-xs muted">' + esc(st.siguiente.concepto) + ' · ' + esc(money(st.siguiente.monto)) + '</div></div>' +
    '<span class="pill" style="--c:' + col + '">' + (vencido ? 'Vencido hace ' + st.dias + ' d' : st.dias === 0 ? 'Vence hoy' : 'En ' + st.dias + ' d') + '</span></div>';
}

Object.assign(Views, {
  agenda() {
    const mes = Agenda.mes(), dia = Agenda.dia();
    const p = mes.split('-').map(Number);
    const primero = new Date(p[0], p[1] - 1, 1);
    const offset = (primero.getDay() + 6) % 7; // semana desde lunes
    const dias = new Date(p[0], p[1], 0).getDate();
    const datos = Agenda.porDia();
    const celdas = [];
    for (let i = 0; i < 42; i++) {
      const dn = i - offset + 1;
      const d = new Date(p[0], p[1] - 1, dn);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const out = dn < 1 || dn > dias;
      const x = datos[key] || { segs: [], cobros: [] };
      const pend = x.segs.filter((s) => !s.hecho);
      const pips = [];
      if (pend.length) pips.push('<i class="' + (key < S.hoy ? 'red' : '') + '"></i>');
      if (x.cobros.length) pips.push('<i class="' + (x.cobros.some((c) => c.cobro.estado === 'Vencido') ? 'red' : 'amber') + '"></i>');
      celdas.push('<button class="cal-day ' + (out ? 'out ' : '') + (key === S.hoy ? 'today ' : '') + (key === dia ? 'sel' : '') + '" data-act="calDay" data-d="' + key + '" aria-label="' + key + '">' + d.getDate() +
        (pips.length ? '<span class="pips">' + pips.join('') + '</span>' : '') + '</button>');
    }
    const dow = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => '<div class="cal-dow">' + x + '</div>').join('');
    const hoyDatos = datos[dia] || { segs: [], cobros: [] };
    const segsDia = hoyDatos.segs.slice().sort(cmpSeg);
    const atrasados = S.seguimientos.filter((s) => !s.hecho && s.fecha < S.hoy).sort(cmpSeg);
    const proximos = S.seguimientos.filter((s) => !s.hecho && s.fecha > S.hoy && s.fecha <= Cobros.addDays(S.hoy, 7)).sort(cmpSeg);
    const diaTxt = dia === S.hoy ? 'Hoy' : cap(new Date(dia + 'T12:00:00').toLocaleDateString(CONFIG.LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }));
    return '<div class="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(320px,430px)_minmax(0,1fr)]">' +
      '<div class="space-y-4 min-w-0"><div class="glass p-4">' +
      '<div class="flex items-center gap-2 mb-3"><h3 class="font-extrabold flex-1">' + esc(Agenda.titulo(mes)) + '</h3>' +
      '<button class="icon-btn" data-act="calPrev" aria-label="Mes anterior">' + ic('left') + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="calHoy">Hoy</button>' +
      '<button class="icon-btn" data-act="calNext" aria-label="Mes siguiente">' + ic('right') + '</button></div>' +
      '<div class="cal-grid">' + dow + celdas.join('') + '</div>' +
      '<div class="flex flex-wrap gap-3 mt-3 text-xs muted"><span><span class="dot" style="background:var(--accent)"></span> Seguimiento</span><span><span class="dot" style="background:var(--warn)"></span> Cobro</span><span><span class="dot" style="background:var(--danger)"></span> Atrasado o vencido</span></div></div>' +
      (atrasados.length ? '<div class="glass p-4"><h3 class="font-bold mb-2 text-rose-500">' + ic('alert') + ' Atrasados (' + atrasados.length + ')</h3>' + atrasados.slice(0, 8).map(segRowHtml).join('') +
        (atrasados.length > 8 ? '<p class="text-xs muted pt-2">+' + (atrasados.length - 8) + ' más</p>' : '') + '</div>' : '') +
      '</div><div class="space-y-4 min-w-0">' +
      '<div class="glass p-5"><div class="flex flex-wrap items-center gap-3 mb-3"><h3 class="font-extrabold text-lg flex-1">' + esc(diaTxt) + '</h3>' +
      (S.user.perms.leads_editar ? '<button class="btn btn-primary" data-act="segNewDay">' + ic('plus') + ' Agendar seguimiento</button>' : '') + '</div>' +
      (segsDia.length || hoyDatos.cobros.length
        ? (segsDia.length ? '<h4 class="label mt-2">Seguimientos</h4>' + segsDia.map(segRowHtml).join('') : '') +
          (hoyDatos.cobros.length ? '<h4 class="label mt-4">Cobros que vencen</h4>' + hoyDatos.cobros.map(cobroRowHtml).join('') : '')
        : UI.empty('fa-calendar', 'Nada para este día', 'Agenda un seguimiento con fecha y hora.')) + '</div>' +
      '<div class="glass p-5"><h3 class="font-bold mb-2">' + ic('clock') + ' Próximos 7 días</h3>' +
      (proximos.length ? proximos.map((s) => segRowHtml(s).replace('<div class="ev-time', '<div class="ev-time')).join('') : '<p class="text-sm muted">No tienes seguimientos en los próximos 7 días.</p>') + '</div>' +
      '</div></div>';
  },
});

Object.assign(Actions, {
  calDay: (el) => { S.ui.segDia = el.dataset.d; const mes = el.dataset.d.slice(0, 7); S.ui.calMes = mes; go('agenda'); },
  calPrev() { const p = Agenda.mes().split('-').map(Number); S.ui.calMes = Cobros.addMonths(p[0] + '-' + String(p[1]).padStart(2, '0') + '-01', -1).slice(0, 7); go('agenda'); },
  calNext() { const p = Agenda.mes().split('-').map(Number); S.ui.calMes = Cobros.addMonths(p[0] + '-' + String(p[1]).padStart(2, '0') + '-01', 1).slice(0, 7); go('agenda'); },
  calHoy() { S.ui.calMes = S.hoy.slice(0, 7); S.ui.segDia = S.hoy; go('agenda'); },
  segNewDay: () => segModal({ fecha: Agenda.dia() }),
  segEdit(el) { const s = S.seguimientos.find((x) => x.id === el.dataset.id); if (s) segModal({ seg: s }); },
  async segReopen(el) {
    try { Seg.upsert(await Api.call('seguimientos.done', { id: el.dataset.id, hecho: false })); refreshView(); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
  async segDel(el) {
    if (!(await UI.confirm('Eliminar seguimiento', 'Se quitará de la agenda.', { danger: true, ok: 'Eliminar' }))) return;
    try { await Api.call('seguimientos.delete', { id: el.dataset.id }); Seg.remove(el.dataset.id); refreshView(); if (S.cur) reloadDrawer(); UI.toast('Seguimiento eliminado', 'ok'); }
    catch (e) { UI.toast(e.message, 'error'); }
  },
});
