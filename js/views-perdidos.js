'use strict';

/* =============================== PERDIDOS ================================ */
// Prospectos que no se concretaron: se guardan con motivo y notas, no se contactan hasta su fecha de revisión
// y ese día regresan solos a la bolsa para que cualquiera los tome.
Object.assign(Views, {
  perdidos() {
    const hoy = S.hoy;
    const dias = (l) => (l.revisarEn ? Cobros.dias(hoy, l.revisarEn) : null);
    const filters = [
      { k: 'motivo', label: 'Motivo', get: (l) => l.perdidoMotivo },
      { k: 'por', label: 'Lo perdió', get: (l) => Team.nombre(l.perdidoPor) },
      { k: 'rubro', label: 'Rubro', get: (l) => l.rubro },
    ];
    return '<div class="banner info mb-4">' + ic('info', 'mt-0.5') + '<div>Estos prospectos <b>no se contactan</b> hasta su fecha de revisión. Ese día regresan solos a la bolsa. Cualquiera puede dejar notas; solo quien lo perdió o el administrador cambia la fecha o lo reactiva.</div></div>' +
      Table.html('perd', {
        name: 'perdidos', minW: 1000, placeholder: 'Buscar empresa, motivo o persona…',
        initSort: { k: 'revisar', dir: 1 },
        cols: [
          { k: 'nombre', label: 'Empresa', sort: (l) => l.nombre },
          { k: 'motivo', label: 'Motivo', sort: (l) => l.perdidoMotivo },
          { k: 'por', label: 'Lo perdió', sort: (l) => Team.nombre(l.perdidoPor), w: '140px' },
          { k: 'fecha', label: 'Perdido el', sort: (l) => l.perdidoFecha, w: '120px' },
          { k: 'revisar', label: 'Vuelve a la bolsa', sort: (l) => l.revisarEn || '9999', w: '170px' },
          { k: 'notas', label: 'Notas', sort: (l) => Number(l.notas || 0), w: '80px' },
          { k: 'acc', label: '', w: '150px' },
        ],
        filters: filters,
        rows: () => Team.perdidos(),
        search: (l) => [l.nombre, l.perdidoMotivo, Team.nombre(l.perdidoPor), l.rubro, l.region, l.contacto].join(' '),
        empty: UI.empty('fa-archive', 'No hay perdidos', 'Cuando un prospecto no se concreta, aquí queda su registro.'),
        row: (l) => {
          const d = dias(l);
          const puede = S.user.isAdmin || String(l.perdidoPor || '').toLowerCase() === S.user.email;
          return '<tr class="cursor-pointer" data-act="openLead" data-id="' + esc(l.id) + '">' +
            '<td><div class="font-semibold">' + esc(l.nombre) + '</div><div class="text-xs muted">' + esc([l.rubro, l.region].filter(Boolean).join(' · ')) + '</div></td>' +
            '<td class="text-sm">' + esc(l.perdidoMotivo || '—') + '</td>' +
            '<td class="text-sm">' + esc(Team.nombre(l.perdidoPor) || '—') + '</td>' +
            '<td class="text-xs muted">' + esc(fmtDate(l.perdidoFecha)) + '</td>' +
            '<td>' + (l.revisarEn ? '<div class="text-sm font-semibold ' + (d <= 7 ? 'text-amber-500' : '') + '">' + esc(fmtDate(l.revisarEn)) + '</div><div class="text-xs muted">' + (d <= 0 ? 'hoy' : 'en ' + d + (d === 1 ? ' día' : ' días')) + '</div>' : '<span class="muted text-sm">Sin fecha</span>') + '</td>' +
            '<td class="text-sm">' + (l.notas ? ic('comment') + ' ' + l.notas : '<span class="muted">—</span>') + '</td>' +
            '<td><div class="flex justify-end gap-1.5">' + (puede ? '<button class="btn btn-ghost btn-sm" data-act="perdReactivar" data-id="' + esc(l.id) + '">' + ic('undo') + ' Reactivar</button>' : '') + '</div></td></tr>';
        },
        exp: [['id', (l) => l.id], ['empresa', (l) => l.nombre], ['rubro', (l) => l.rubro], ['contacto', (l) => l.contacto], ['email', (l) => l.email], ['telefono', (l) => l.telefono],
          ['motivo', (l) => l.perdidoMotivo], ['lo_perdio', (l) => l.perdidoPor], ['perdido_el', (l) => l.perdidoFecha], ['vuelve_a_la_bolsa', (l) => l.revisarEn], ['num_notas', (l) => l.notas]],
      });
  },
  perdidosMount() { Table.body('perd'); },
});

Object.assign(Actions, {
  async perdReactivar(el, e) {
    if (e) e.stopPropagation();
    if (!(await UI.confirm('Reactivar prospecto', 'Vuelve a la bolsa, libre para que cualquiera lo tome.', { ok: 'Reactivar' }))) return;
    try { upsertLead(await Api.call('leads.reactivate', { id: el.dataset.id })); refreshView(); UI.toast('Regresó a la bolsa', 'ok'); }
    catch (err) { UI.toast(err.message, 'error'); }
  },
});
