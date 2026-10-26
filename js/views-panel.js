'use strict';

/* ================================= PANEL ================================= */
Object.assign(Views, {
  dashboard() {
    const P = S.user.perms, admin = S.user.isAdmin;
    const bolsa = Team.bolsa();
    const trabajo = Team.pipeline().filter((l) => !CERRADOS.includes(l.estado));
    const pend = Seg.pendientes();
    const hoy = pend.filter((s) => s.fecha <= S.hoy);
    const atrasados = pend.filter((s) => s.fecha < S.hoy).length;
    const venc = S.clientes.filter((c) => c.cobro && c.cobro.estado === 'Vencido');
    const porCobrar = venc.reduce((s, c) => s + c.cobro.siguiente.monto * c.cobro.vencidas, 0);
    const ofertas = Team.ofertas();

    const kpi = (icon, color, label, value, foot, act) =>
      '<div class="glass p-4 flex items-center gap-3 ' + (act ? 'cursor-pointer hover:-translate-y-0.5 transition' : '') + '" ' + (act || '') + '>' +
      '<span class="kpi-icon" style="background:' + color + '">' + ic(icon) + '</span>' +
      '<div class="min-w-0"><div class="text-xs font-semibold muted">' + label + '</div><div class="text-2xl font-extrabold leading-tight">' + value + '</div>' +
      '<div class="text-xs muted truncate">' + foot + '</div></div></div>';
    const cards = [
      kpi('inbox', 'var(--accent)', 'En la bolsa', num(bolsa.length), 'Toma los que vayas a trabajar', 'data-act="go" data-v="bolsa"'),
      kpi('hand', 'var(--ok)', admin ? 'En trabajo (equipo)' : 'Mis prospectos', num(trabajo.length), 'En pipeline ahora mismo', 'data-act="go" data-v="pipeline"'),
      kpi('clock', 'var(--warn)', 'Seguimientos de hoy', num(hoy.length), atrasados ? '<span class="text-rose-500 font-bold">' + atrasados + ' atrasado' + (atrasados > 1 ? 's' : '') + '</span>' : 'Todo al día', 'data-act="go" data-v="agenda"'),
    ];
    cards.push(P.clientes_ver
      ? kpi('alert', venc.length ? 'var(--danger)' : '#94a3b8', 'Pagos vencidos', num(venc.length), venc.length ? esc(money(porCobrar)) + ' por cobrar' : 'Nada vencido', 'data-act="go" data-v="clientes"')
      : kpi('archive', '#94a3b8', 'Perdidos', num(Team.perdidos().length), 'Esperando su fecha de revisión', 'data-act="go" data-v="perdidos"'));

    const card = (title, icon, body, extra, link) => '<div class="glass p-5 ' + (extra || '') + '"><div class="flex items-center gap-2 mb-3">' + ic(icon, 'muted') + '<h3 class="font-bold flex-1">' + title + '</h3>' + (link || '') + '</div>' + body + '</div>';

    // Mi día
    const dia = hoy.slice(0, 6).map(segRowHtml).join('');
    // Mi pipeline
    const pasos = S.estados.filter((e) => !['Perdido', 'Ganado'].includes(e));
    const cnt = pasos.map((e) => ({ e, n: trabajo.filter((l) => l.estado === e).length }));
    const max = Math.max(1, ...cnt.map((c) => c.n));
    const barras = cnt.map((c) => {
      const m = ESTADO_META[c.e] || ESTADO_META.Lead;
      return '<div class="mb-3"><div class="flex justify-between text-xs font-bold mb-1"><span>' + esc(c.e) + '</span><span class="muted">' + c.n + '</span></div>' +
        '<div class="h-2 rounded-full" style="background:var(--soft)"><div class="h-2 rounded-full" style="width:' + (c.n ? Math.max(6, (c.n / max) * 100) : 0) + '%;background:' + m.c + '"></div></div></div>';
    }).join('');
    // Mini calendario
    const mes = S.hoy.slice(0, 7), pp = mes.split('-').map(Number);
    const offset = (new Date(pp[0], pp[1] - 1, 1).getDay() + 6) % 7;
    const nd = new Date(pp[0], pp[1], 0).getDate();
    const datos = Agenda.porDia();
    let cal = '<div class="cal-grid">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => '<div class="cal-dow">' + x + '</div>').join('');
    for (let i = 0; i < offset; i++) cal += '<div></div>';
    for (let d = 1; d <= nd; d++) {
      const key = mes + '-' + String(d).padStart(2, '0');
      const x = datos[key] || { segs: [], cobros: [] };
      const pips = [];
      if (x.segs.some((s) => !s.hecho)) pips.push('<i class="' + (key < S.hoy ? 'red' : '') + '"></i>');
      if (x.cobros.length) pips.push('<i class="' + (x.cobros.some((c) => c.cobro.estado === 'Vencido') ? 'red' : 'amber') + '"></i>');
      cal += '<button class="cal-day ' + (key === S.hoy ? 'today' : '') + '" data-act="calDay" data-d="' + key + '">' + d + (pips.length ? '<span class="pips">' + pips.join('') + '</span>' : '') + '</button>';
    }
    cal += '</div>';

    // Cobros con atención
    const orden = (c) => ({ Vencido: 0, 'Por vencer': 1 }[c.cobro.estado]);
    const atencion = S.clientes.filter((c) => orden(c) !== undefined)
      .sort((a, b) => orden(a) - orden(b) || (a.cobro.estado === 'Vencido' ? b.cobro.dias - a.cobro.dias : a.cobro.dias - b.cobro.dias)).slice(0, 6);
    const cobros = atencion.length
      ? '<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">' + atencion.map((c) =>
        '<div class="glass-soft pay-card p-3 cursor-pointer hover:-translate-y-0.5 transition" style="--c:' + COBRO_META[c.cobro.estado] + '" data-act="openCobros" data-id="' + esc(c.idLead) + '">' +
        '<div class="mb-1">' + cobroPill(c.cobro) + '</div><div class="font-bold truncate">' + esc(c.nombre) + '</div>' +
        '<div class="text-xs muted">' + esc(c.cobro.siguiente.concepto) + ' · ' + esc(money2(c.cobro.siguiente.monto)) + '</div>' +
        '<div class="text-xs muted">' + esc(fmtDate(c.cobro.siguiente.key)) + (admin ? ' · lo lleva ' + esc(Team.nombre(c.asignadoA)) : '') + '</div></div>').join('') + '</div>'
      : UI.empty('fa-wallet', 'Sin cobros por atender', 'Aquí aparecen los pagos vencidos y los que vencen en 7 días.');

    // Equipo (solo admin)
    let equipo = '';
    if (admin) {
      const rows = S.usuariosAsignables.map((u) => {
        const mine = S.leads.filter((l) => String(l.asignadoA || '').toLowerCase() === u.email);
        const abiertos = mine.filter((l) => !CERRADOS.includes(l.estado)).length;
        const ganados = mine.filter((l) => l.estado === 'Ganado').length;
        const segs = pend.filter((s) => (S.leads.find((l) => l.id === s.idLead) || {}).asignadoA === u.email);
        const vv = S.clientes.filter((c) => String(c.asignadoA || '').toLowerCase() === u.email && c.cobro.estado === 'Vencido').length;
        return '<tr><td><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white" style="background:linear-gradient(135deg,#f6b73c,#ef5b6b)">' + esc(initials(u.nombre || u.email)) + '</div>' +
          '<div class="min-w-0"><div class="font-semibold truncate">' + esc(u.nombre || u.email) + '</div><div class="text-xs muted truncate">' + esc(u.nivel) + '</div></div></div></td>' +
          '<td class="text-center font-bold">' + abiertos + '</td><td class="text-center">' + segs.length + (segs.some((s) => s.fecha < S.hoy) ? ' <span class="text-rose-500">•</span>' : '') + '</td>' +
          '<td class="text-center">' + ganados + '</td><td class="text-center ' + (vv ? 'text-rose-500 font-bold' : '') + '">' + vv + '</td></tr>';
      }).join('');
      equipo = card('Equipo', 'users', '<div class="overflow-x-auto scroll-thin"><table class="table min-w-[480px]"><thead><tr><th>Persona</th><th class="text-center">En trabajo</th><th class="text-center">Seguim.</th><th class="text-center">Ganados</th><th class="text-center">Vencidos</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'xl:col-span-3');
    }

    return '<div class="mb-5"><h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Hola, ' + esc((S.user.nombre || '').split(' ')[0] || 'equipo') + '</h1>' +
      '<p class="muted text-sm mt-1">' + esc(cap(new Date(S.hoy + 'T12:00:00').toLocaleDateString(CONFIG.LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }))) + '</p></div>' +
      (ofertas.length ? '<div class="banner info mb-4">' + ic('swap', 'mt-0.5') + '<div class="flex-1"><b>Te ofrecieron ' + ofertas.length + (ofertas.length > 1 ? ' prospectos' : ' prospecto') + ':</b> ' +
        ofertas.map((l) => '<a class="font-bold underline cursor-pointer" data-act="openLead" data-id="' + esc(l.id) + '">' + esc(l.nombre) + '</a> (de ' + esc(Team.nombre(l.transferenciaDe || l.asignadoA)) + ')').join(', ') + '</div></div>' : '') +
      '<div class="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-4">' + cards.join('') + '</div>' +
      '<div class="grid gap-4 grid-cols-1 xl:grid-cols-3 mb-4">' +
      card('Mi día', 'clock', dia || UI.empty('fa-mug-hot', 'Sin seguimientos para hoy', 'Agenda tu próximo contacto con fecha y hora.'), '', '<button class="text-xs font-bold text-indigo-500" data-act="go" data-v="agenda">Ver agenda</button>') +
      card(admin ? 'Pipeline del equipo' : 'Mi pipeline', 'kanban', barras, '', '<button class="text-xs font-bold text-indigo-500" data-act="go" data-v="pipeline">Abrir</button>') +
      card(Agenda.titulo(mes), 'cal', cal, '', '<button class="text-xs font-bold text-indigo-500" data-act="go" data-v="agenda">Agenda</button>') + '</div>' +
      (P.clientes_ver ? '<div class="mb-4">' + card('Cobros que requieren atención', 'wallet', cobros, '', '<button class="text-xs font-bold text-indigo-500" data-act="go" data-v="clientes">Ver clientes</button>') + '</div>' : '') +
      (equipo ? '<div class="grid gap-4 grid-cols-1 xl:grid-cols-3">' + equipo + '</div>' : '');
  },
});
