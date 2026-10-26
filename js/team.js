'use strict';

/* ============================ REGLAS DE EQUIPO ============================ */
// Espejo de las reglas del servidor, solo para ordenar la vista. El que decide es el servidor:
// si algo no está permitido, responde con error y la pantalla lo muestra.
const Team = {
  email: () => S.user.email,
  esMio: (l) => !!l.asignadoA && String(l.asignadoA).toLowerCase() === S.user.email,
  enBolsa: (l) => !l.asignadoA && !CERRADOS.includes(l.estado),
  puedoTrabajar: (l) => S.user.isAdmin || Team.esMio(l),
  ofertaParaMi: (l) => !!l.transferenciaA && String(l.transferenciaA).toLowerCase() === S.user.email,
  nombre: (email) => {
    const u = S.usuariosAsignables.find((x) => x.email === String(email || '').toLowerCase());
    return u && u.nombre ? u.nombre : email || '';
  },
  /** Leads en pipeline (con responsable, abiertos) que el usuario puede trabajar. */
  pipeline: () => S.leads.filter((l) => l.asignadoA && !['Perdido'].includes(l.estado) && Team.puedoTrabajar(l)),
  bolsa: () => S.leads.filter(Team.enBolsa),
  perdidos: () => S.leads.filter((l) => l.estado === 'Perdido'),
  ofertas: () => S.leads.filter(Team.ofertaParaMi),
};

/* --------------------------- seguimientos (agenda) ------------------------ */
const cmpSeg = (a, b) => (a.fecha + ' ' + a.hora).localeCompare(b.fecha + ' ' + b.hora);
const Seg = {
  pendientes: () => S.seguimientos.filter((s) => !s.hecho).sort(cmpSeg),
  /** Recalcula el próximo seguimiento de cada lead a partir de la agenda cargada. */
  recalc() {
    const m = {};
    Seg.pendientes().forEach((s) => { if (!m[s.idLead]) m[s.idLead] = { id: s.id, fecha: s.fecha, hora: s.hora, tipo: s.tipo }; });
    S.leads.forEach((l) => { l.proximo = m[l.id] || null; });
  },
  upsert(s) {
    const i = S.seguimientos.findIndex((x) => x.id === s.id);
    if (i >= 0) S.seguimientos[i] = s; else S.seguimientos.push(s);
    Seg.recalc();
  },
  remove(id) { S.seguimientos = S.seguimientos.filter((x) => x.id !== id); Seg.recalc(); },
  /** "Hoy 09:30", "Mañana 14:00", "28 oct 09:30". */
  texto(p) {
    if (!p) return '';
    const dia = p.fecha === S.hoy ? 'Hoy' : p.fecha === Cobros.addDays(S.hoy, 1) ? 'Mañana' : fmtDate(p.fecha);
    return dia + ' · ' + p.hora;
  },
};

/** Hay un seguimiento pendiente que ya llegó (hoy o antes). */
const isDue = (l) => !!(l.proximo && l.proximo.fecha <= S.hoy) && !CERRADOS.includes(l.estado);

function upsertLead(l) {
  const i = S.leads.findIndex((x) => x.id === l.id);
  if (i >= 0) S.leads[i] = Object.assign({}, S.leads[i], l);
  else S.leads.unshift(l);
  Seg.recalc();
}

/** Selector con búsqueda en vivo (lista corta, nunca todo a la vez). items: [{id, titulo, sub}] */
function pickerHtml(id, placeholder) {
  return '<div class="relative" data-picker="' + id + '"><input type="hidden" id="' + id + '">' +
    '<input class="input" id="' + id + 'Q" autocomplete="off" placeholder="' + esc(placeholder || 'Buscar…') + '">' +
    '<div id="' + id + 'L" class="glass mt-1 max-h-56 overflow-y-auto scroll-thin absolute left-0 right-0 z-20" hidden></div></div>';
}
function pickerMount(id, getItems, onPick) {
  const q = $('#' + id + 'Q'), list = $('#' + id + 'L'), hid = $('#' + id);
  const draw = () => {
    const t = normName(q.value);
    const items = getItems().filter((it) => !t || normName(it.titulo + ' ' + (it.sub || '')).includes(t)).slice(0, 8);
    list.innerHTML = items.length
      ? items.map((it) => '<button type="button" class="w-full text-left px-3 py-2 hover:bg-[var(--soft)] block" data-pick="' + esc(it.id) + '"><div class="text-sm font-semibold">' + esc(it.titulo) + '</div>' +
        (it.sub ? '<div class="text-xs muted">' + esc(it.sub) + '</div>' : '') + '</button>').join('')
      : '<div class="px-3 py-3 text-sm muted">Sin coincidencias</div>';
    list.hidden = false;
  };
  q.addEventListener('input', () => { hid.value = ''; draw(); });
  q.addEventListener('focus', draw);
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const it = getItems().find((x) => String(x.id) === b.dataset.pick);
    hid.value = b.dataset.pick;
    q.value = it ? it.titulo : '';
    list.hidden = true;
    if (onPick) onPick(it);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-picker="' + id + '"]')) list.hidden = true; });
}
