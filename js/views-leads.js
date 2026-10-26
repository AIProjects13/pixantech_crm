'use strict';

/* ==================== BOLSA, MI PIPELINE Y PROSPECTOS ===================== */
Object.assign(Views, {
  /* -------------------------------- BOLSA -------------------------------- */
  bolsa() {
    const P = S.user.perms;
    const head = '<div class="flex flex-wrap items-center gap-3 mb-4"><p class="text-sm muted flex-1 min-w-[220px]">Prospectos que nadie está trabajando. <b>Toma</b> los que vayas a llevar: desde ese momento solo tú y el administrador los ven.</p>' +
      (P.leads_crear ? '<button class="btn btn-ghost" data-act="go" data-v="importar">' + ic('upload') + ' Importar CSV</button>' +
        '<button class="btn btn-primary" data-act="newLead">' + ic('plus') + ' Nuevo prospecto</button>' : '') + '</div>';
    return head + Table.html('bolsa', {
      name: 'bolsa', minW: 900, placeholder: 'Buscar empresa, contacto, rubro o zona…',
      initSort: { k: 'creado', dir: -1 },
      cols: [
        { k: 'acc', label: '', w: '118px' },
        { k: 'nombre', label: 'Empresa', sort: (l) => l.nombre },
        { k: 'contacto', label: 'Contacto', sort: (l) => l.contacto },
        { k: 'rubro', label: 'Rubro', sort: (l) => l.rubro },
        { k: 'region', label: 'Zona', sort: (l) => [l.pais, l.region].filter(Boolean).join(' · ') },
        { k: 'estado', label: 'Paso', sort: (l) => S.estados.indexOf(l.estado), w: '150px' },
        { k: 'creado', label: 'Entró', sort: (l) => l.fechaCreacion, w: '110px' },
      ],
      filters: [
        { k: 'rubro', label: 'Rubro', get: (l) => l.rubro },
        { k: 'region', label: 'Zona', get: (l) => l.region },
        { k: 'estado', label: 'Paso', get: (l) => l.estado },
      ],
      rows: () => Team.bolsa(),
      search: (l) => [l.nombre, l.contacto, l.email, l.telefono, l.rubro, l.region, l.pais, l.web].join(' '),
      empty: UI.empty('fa-inbox', 'La bolsa está vacía', 'Importa un CSV o crea un prospecto para empezar.'),
      row: (l) => '<tr class="cursor-pointer" data-act="openLead" data-id="' + esc(l.id) + '">' +
        '<td>' + (S.user.perms.leads_editar ? '<button class="btn btn-primary btn-sm" data-act="take" data-id="' + esc(l.id) + '">' + ic('hand') + ' Tomar</button>' : '') + '</td>' +
        '<td><div class="font-semibold">' + esc(l.nombre) + '</div><div class="text-xs muted truncate max-w-[240px]">' + esc(l.email || l.web || '') + '</div></td>' +
        '<td><div class="truncate max-w-[180px]">' + esc(l.contacto || '—') + '</div><div class="text-xs muted">' + esc(l.telefono || '') + '</div></td>' +
        '<td class="text-sm">' + esc(l.rubro || '—') + '</td>' +
        '<td class="text-sm">' + esc([l.region, l.pais].filter(Boolean).join(', ') || '—') + '</td>' +
        '<td>' + UI.estadoChip(l.estado) + '</td>' +
        '<td class="text-xs muted">' + esc(fmtDate(l.fechaCreacion)) + '</td></tr>',
      exp: [['id', (l) => l.id], ['nombre', (l) => l.nombre], ['rubro', (l) => l.rubro], ['pais', (l) => l.pais], ['region', (l) => l.region],
        ['contacto', (l) => l.contacto], ['email', (l) => l.email], ['telefono', (l) => l.telefono], ['web', (l) => l.web], ['paso', (l) => l.estado], ['entro', (l) => l.fechaCreacion]],
    });
  },
  bolsaMount() { Table.body('bolsa'); },

  /* ----------------------------- MI PIPELINE ----------------------------- */
  pipeline() {
    const P = S.user.perms, admin = S.user.isAdmin;
    const owners = admin ? Array.from(new Set(S.leads.filter((l) => l.asignadoA && l.estado !== 'Perdido').map((l) => l.asignadoA))).sort() : [];
    const ofertas = Team.ofertas();
    return (ofertas.length ? '<div class="banner info mb-4">' + ic('swap', 'mt-0.5') + '<div class="flex-1"><b>Te ofrecieron ' + ofertas.length + (ofertas.length > 1 ? ' prospectos' : ' prospecto') + '.</b> Ábrelos para aceptarlos o rechazarlos: ' +
      ofertas.map((l) => '<a class="font-bold underline cursor-pointer" data-act="openLead" data-id="' + esc(l.id) + '">' + esc(l.nombre) + '</a>').join(', ') + '.</div></div>' : '') +
      '<div class="glass p-3 mb-5 flex flex-wrap items-center gap-3">' +
      '<div class="relative flex-1 min-w-[220px]"><span class="absolute left-3.5 top-1/2 -translate-y-1/2 muted text-sm">' + ic('search') + '</span>' +
      '<input id="pq" class="input pl-10" placeholder="Buscar por empresa, contacto, email o rubro…" value="' + esc(S.ui.q) + '"></div>' +
      (owners.length ? '<select id="powner" class="input !w-auto"><option value="">Todo el equipo</option><option value="__yo" ' + (S.ui.owner === '__yo' ? 'selected' : '') + '>Solo los míos</option>' +
        owners.map((o) => '<option ' + (S.ui.owner === o ? 'selected' : '') + ' value="' + esc(o) + '">' + esc(Team.nombre(o)) + '</option>').join('') + '</select>' : '') +
      '<label class="btn btn-ghost cursor-pointer"><input type="checkbox" id="pdue" class="accent-rose-500" ' + (S.ui.dueOnly ? 'checked' : '') + '> ' + ic('bell', 'text-rose-500') + ' Con seguimiento pendiente</label>' +
      (P.leads_crear ? '<button class="btn btn-primary" data-act="newLead">' + ic('plus') + ' Nuevo prospecto</button>' : '') +
      '</div><div id="kanban" class="kanban">' + Views.kanbanColumns() + '</div>' +
      (P.leads_editar ? '<div class="drop-lost mt-4" data-drop="Perdido">' + ic('archive') + ' Arrastra aquí un prospecto para marcarlo como perdido</div>' : '');
  },
  pipelineMount() {
    const redraw = () => { $('#kanban').innerHTML = Views.kanbanColumns(); };
    $('#pq').addEventListener('input', debounce((e) => { S.ui.q = e.target.value; redraw(); }, 120));
    $('#pdue').addEventListener('change', (e) => { S.ui.dueOnly = e.target.checked; redraw(); });
    const o = $('#powner');
    if (o) o.addEventListener('change', (e) => { S.ui.owner = e.target.value; redraw(); });
  },
  kanbanColumns() {
    const q = S.ui.q.trim().toLowerCase();
    const list = Team.pipeline().filter((l) =>
      (!q || [l.nombre, l.contacto, l.email, l.rubro].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (!S.ui.dueOnly || isDue(l)) &&
      (!S.ui.owner || (S.ui.owner === '__yo' ? Team.esMio(l) : l.asignadoA === S.ui.owner)));
    return S.estados.filter((e) => e !== 'Perdido').map((e) => {
      const m = ESTADO_META[e] || ESTADO_META.Lead;
      const items = list.filter((l) => l.estado === e)
        .sort((a, b) => (isDue(b) - isDue(a)) || String((a.proximo || {}).fecha || '9').localeCompare(String((b.proximo || {}).fecha || '9')));
      const shown = items.slice(0, CONFIG.MAX_CARDS_PER_COLUMN);
      return '<section class="kcol glass" data-drop="' + esc(e) + '">' +
        '<header class="flex items-center gap-2 px-4 pt-4 pb-3"><span class="w-7 h-7 rounded-lg grid place-items-center text-xs text-white" style="background:' + m.c + '">' + ic(m.i) + '</span>' +
        '<h3 class="font-bold text-sm flex-1 truncate">' + esc(e) + '</h3><span class="chip">' + items.length + '</span></header>' +
        '<div class="kcol-body scroll-thin">' +
        (shown.length ? shown.map((l) => leadCard(l, S.user.perms.leads_editar)).join('') : '<div class="text-center text-xs muted py-8 rounded-xl border border-dashed hairline">' + (S.user.perms.leads_editar ? 'Suelta aquí' : 'Sin prospectos') + '</div>') +
        (items.length > shown.length ? '<div class="text-center text-xs muted py-2">+' + (items.length - shown.length) + ' más · usa el buscador</div>' : '') +
        '</div></section>';
    }).join('');
  },

  /* ------------------------------ PROSPECTOS ----------------------------- */
  prospectos() {
    const P = S.user.perms, admin = S.user.isAdmin;
    const seg = (l) => (l.proximo ? (isDue(l) ? (l.proximo.fecha === S.hoy ? 'Hoy' : 'Vencido') : 'Programado') : 'Sin seguimiento');
    const cols = [];
    if (admin) cols.push({ k: 'sel', label: '', w: '44px' });
    cols.push(
      { k: 'nombre', label: 'Empresa', sort: (l) => l.nombre },
      { k: 'contacto', label: 'Contacto', sort: (l) => l.contacto },
      { k: 'rubro', label: 'Rubro', sort: (l) => l.rubro },
      { k: 'region', label: 'Zona', sort: (l) => [l.pais, l.region].filter(Boolean).join(' · ') },
      { k: 'estado', label: 'Paso', sort: (l) => S.estados.indexOf(l.estado), w: '150px' },
      { k: 'owner', label: 'Responsable', sort: (l) => Team.nombre(l.asignadoA) },
      { k: 'proximo', label: 'Próx. seguimiento', sort: (l) => (l.proximo ? l.proximo.fecha + ' ' + l.proximo.hora : ''), w: '150px' },
      { k: 'creado', label: 'Creado', sort: (l) => l.fechaCreacion, w: '110px' },
      { k: 'acc', label: '', w: '90px' });
    const filters = [
      { k: 'estado', label: 'Paso', get: (l) => l.estado },
      { k: 'owner', label: 'Responsable', get: (l) => (l.asignadoA ? Team.nombre(l.asignadoA) : 'En la bolsa') },
      { k: 'seg', label: 'Seguimiento', get: seg },
      { k: 'rubro', label: 'Rubro', get: (l) => l.rubro },
      { k: 'region', label: 'Zona', get: (l) => l.region },
    ];
    const head = '<div class="flex flex-wrap items-center gap-2 mb-4"><p class="text-sm muted flex-1 min-w-[200px]">Todo lo que puedes ver: la bolsa, lo tuyo y los perdidos' + (admin ? ' (y lo de todo el equipo)' : '') + '.</p>' +
      (admin ? '<span id="selInfo" class="text-sm font-semibold"></span>' +
        '<button class="btn btn-ghost btn-sm" data-act="selAll">Seleccionar visibles</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="selNone">Quitar selección</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="selAssign">' + ic('users') + ' Reasignar…</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="selBolsa">' + ic('inbox') + ' Pasar a la bolsa</button>' : '') +
      (P.leads_crear ? '<button class="btn btn-ghost" data-act="go" data-v="importar">' + ic('upload') + ' Importar CSV</button><button class="btn btn-primary" data-act="newLead">' + ic('plus') + ' Nuevo prospecto</button>' : '') + '</div>';
    return head + Table.html('leads', {
      name: 'prospectos', minW: admin ? 1240 : 1100, placeholder: 'Buscar empresa, contacto, email, teléfono…',
      initSort: { k: 'creado', dir: -1 },
      cols: cols, filters: filters,
      rows: () => S.leads,
      search: (l) => [l.nombre, l.contacto, l.email, l.telefono, l.rubro, l.region, l.pais, l.web].join(' '),
      empty: UI.empty('fa-table-list', 'Aún no hay prospectos', 'Importa un CSV o crea uno manualmente.'),
      row: (l) => {
        const due = isDue(l);
        return '<tr class="cursor-pointer" data-act="openLead" data-id="' + esc(l.id) + '">' +
          (admin ? '<td data-act="selToggle" data-id="' + esc(l.id) + '"><span class="w-5 h-5 rounded-md grid place-items-center ' + (S.sel.has(l.id) ? 'text-white' : '') + '" style="' + (S.sel.has(l.id) ? 'background:var(--accent)' : 'border:1.5px solid var(--line)') + '">' + (S.sel.has(l.id) ? ic('check', 'text-xs') : '') + '</span></td>' : '') +
          '<td><div class="font-semibold">' + esc(l.nombre) + '</div><div class="text-xs muted truncate max-w-[240px]">' + esc(l.email || l.web || '') + '</div></td>' +
          '<td><div class="truncate max-w-[180px]">' + esc(l.contacto || '—') + '</div><div class="text-xs muted">' + esc(l.telefono || '') + '</div></td>' +
          '<td class="text-sm">' + esc(l.rubro || '—') + '</td>' +
          '<td class="text-sm">' + esc([l.region, l.pais].filter(Boolean).join(', ') || '—') + '</td>' +
          '<td>' + UI.estadoChip(l.estado) + '</td>' +
          '<td class="text-sm">' + (l.asignadoA ? esc(Team.nombre(l.asignadoA)) : '<span class="muted">En la bolsa</span>') + '</td>' +
          '<td class="text-sm ' + (due ? 'text-rose-500 font-semibold' : '') + '">' + (l.proximo ? esc(Seg.texto(l.proximo)) : '<span class="muted">—</span>') + '</td>' +
          '<td class="text-xs muted">' + esc(fmtDate(l.fechaCreacion)) + '</td>' +
          '<td>' + quickActions(l) + '</td></tr>';
      },
      exp: [
        ['id', (l) => l.id], ['nombre', (l) => l.nombre], ['rubro', (l) => l.rubro], ['pais', (l) => l.pais], ['region', (l) => l.region],
        ['contacto', (l) => l.contacto], ['email', (l) => l.email], ['telefono', (l) => l.telefono], ['web', (l) => l.web],
        ['paso', (l) => l.estado], ['responsable', (l) => l.asignadoA], ['proximo_seguimiento', (l) => (l.proximo ? l.proximo.fecha + ' ' + l.proximo.hora : '')],
        ['creado_por', (l) => l.creadoPor], ['fecha_creacion', (l) => l.fechaCreacion], ['num_notas', (l) => l.notas],
      ],
    });
  },
  prospectosMount() { Table.body('leads'); Actions.selInfo(); },
});

Object.assign(Actions, {
  selInfo() { const i = $('#selInfo'); if (i) i.textContent = S.sel.size ? S.sel.size + ' seleccionados' : ''; },
  selToggle(el, e) {
    if (e) e.stopPropagation();
    const id = el.dataset.id;
    S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id);
    Table.body('leads'); Actions.selInfo();
  },
  selAll() { Table.view('leads').forEach((l) => S.sel.add(l.id)); Table.body('leads'); Actions.selInfo(); },
  selNone() { S.sel = new Set(); Table.body('leads'); Actions.selInfo(); },
  selAssign() {
    const ids = Array.from(S.sel).filter((id) => { const l = S.leads.find((x) => x.id === id); return l && !['Perdido'].includes(l.estado); });
    if (!ids.length) { UI.toast('Selecciona primero uno o más prospectos (que no estén perdidos).'); return; }
    assignModal(ids.slice(0, 100));
  },
  async selBolsa() {
    const ids = Array.from(S.sel).filter((id) => { const l = S.leads.find((x) => x.id === id); return l && l.asignadoA && !['Ganado', 'Perdido'].includes(l.estado); });
    if (!ids.length) { UI.toast('Selecciona prospectos que tengan responsable (y no sean clientes ni perdidos).'); return; }
    if (!(await UI.confirm('Pasar a la bolsa', ids.length + ' prospectos quedarán sin responsable y cualquiera del equipo podrá tomarlos.', { ok: 'Pasar a la bolsa' }))) return;
    try {
      const r = await Api.call('leads.assign', { ids: ids.slice(0, 100), email: '' });
      r.forEach(upsertLead); S.sel = new Set(); refreshView();
      UI.toast(r.length + ' prospectos regresaron a la bolsa', 'ok');
    } catch (e) { UI.toast(e.message, 'error'); }
  },
});
