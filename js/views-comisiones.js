'use strict';

/* =============================== COMISIONES ============================== */
// Reglas (las mismas del servidor, del correo de bienvenida y del formulario de nuevo usuario):
//  • 20 % por defecto de cada pago; solo el administrador la ajusta por prospecto.
//  • De por vida mientras el cliente esté activo y pagando; se genera al REGISTRAR cada pago.
//  • Es para quien tiene el cliente; si el administrador lo reasigna, los pagos siguientes son de quien lo recibe.
//  • Un cliente vencido también genera comisión, pero se acredita hasta que su pago queda registrado.
const Comision = {
  reglas() {
    const p = S.comisionDefecto == null ? 20 : S.comisionDefecto;
    return [
      'La comisión por defecto es ' + p + ' % de cada pago que haga tu cliente. El administrador puede ajustarla por cliente.',
      'Es de por vida mientras el cliente esté activo y pagando: se genera cada vez que se registra un pago en el sistema.',
      'Es solo para quien logró la venta y sigue trabajando y llevando el registro del cliente. Si el administrador pasa el cliente a otra persona, la comisión de los pagos siguientes es para quien lo recibe; lo ya generado se queda con quien lo generó.',
      'Un cliente vencido también genera comisión, pero se acredita hasta que su pago queda registrado.',
      'Si un pago se anula, su comisión también se anula. Un cliente marcado como inactivo (cancelado) deja de generar comisión.',
    ];
  },
  reglasHtml() {
    return '<ul class="space-y-2 text-sm">' + Comision.reglas().map((t) => '<li class="flex gap-2">' + ic('check', 'text-emerald-500 mt-0.5') + '<span>' + esc(t) + '</span></li>').join('') + '</ul>';
  },
  /** Comisión estimada que se acreditará cuando un cliente vencido pague lo que debe. */
  porAcreditar(c) {
    if (!c.cobro || c.cobro.estado !== 'Vencido' || c.activo === false || !c.cobro.siguiente) return 0;
    return Math.round(c.cobro.siguiente.monto * c.cobro.vencidas * (c.comisionPct || 0)) / 100;
  },
  mes: '',
  data: [],
  /** AAAA-MM de un instante, en la hora local. */
  mesDe(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
};

Object.assign(Views, {
  comisiones() {
    return '<div class="glass p-5 mb-4"><div class="flex items-center gap-2 mb-3">' + ic('trophy', 'text-amber-500') + '<h3 class="font-bold">Cómo funcionan las comisiones</h3></div>' + Comision.reglasHtml() + '</div>' +
      '<div id="comBody">' + '<div class="glass p-5"><div class="skeleton h-5 w-1/3 mb-3"></div><div class="skeleton h-24 w-full"></div></div></div>';
  },
  async comisionesMount() {
    try {
      Comision.data = await Api.call('comisiones.list');
      Views.comisionesRender();
    } catch (e) { $('#comBody').innerHTML = '<div class="glass p-5 text-rose-500 text-sm">' + esc(e.message) + '</div>'; }
  },
  comisionesRender() {
    const admin = S.user.isAdmin;
    const D = Comision.data;
    const mesAct = S.hoy.slice(0, 7);
    const meses = Array.from(new Set(D.map((x) => Comision.mesDe(x.fechaRegistro)).concat([mesAct]))).sort().reverse();
    const filas = D.filter((x) => !Comision.mes || Comision.mesDe(x.fechaRegistro) === Comision.mes);
    const total = (arr) => Math.round(arr.reduce((s, x) => s + x.comision, 0) * 100) / 100;
    const esteMes = total(D.filter((x) => Comision.mesDe(x.fechaRegistro) === mesAct));
    const pend = S.clientes.reduce((s, c) => s + Comision.porAcreditar(c), 0);
    const kpi = (icon, color, label, value, foot) => '<div class="glass p-4 flex items-center gap-3"><span class="kpi-icon" style="background:' + color + '">' + ic(icon) + '</span>' +
      '<div class="min-w-0"><div class="text-xs font-semibold muted">' + label + '</div><div class="text-2xl font-extrabold leading-tight">' + money2(value) + '</div><div class="text-xs muted">' + foot + '</div></div></div>';

    // Resumen por persona (solo administrador)
    let porPersona = '';
    if (admin) {
      const m = {};
      D.forEach((x) => { (m[x.para] = m[x.para] || { nombre: x.paraNombre, acred: 0, n: 0 }); m[x.para].acred += x.comision; m[x.para].n++; });
      S.clientes.forEach((c) => { const p = Comision.porAcreditar(c); if (p && c.comisionPara) { (m[c.comisionPara] = m[c.comisionPara] || { nombre: Team.nombre(c.comisionPara), acred: 0, n: 0 }); m[c.comisionPara].pend = (m[c.comisionPara].pend || 0) + p; } });
      const rows = Object.keys(m).sort((a, b) => m[b].acred - m[a].acred).map((k) =>
        '<tr><td class="font-semibold">' + esc(m[k].nombre || k) + '</td><td class="text-right">' + m[k].n + '</td><td class="text-right font-bold">' + esc(money2(m[k].acred)) + '</td><td class="text-right muted">' + esc(money2(m[k].pend || 0)) + '</td></tr>').join('');
      porPersona = '<div class="glass p-5 mb-4"><h3 class="font-bold mb-3">' + ic('users') + ' Por persona</h3><div class="overflow-x-auto scroll-thin"><table class="table min-w-[420px]"><thead><tr><th>Persona</th><th class="text-right">Pagos</th><th class="text-right">Acreditado</th><th class="text-right">Por acreditar*</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="4" class="muted text-sm">Aún no hay comisiones.</td></tr>') + '</tbody></table></div><p class="text-xs muted mt-2">*Clientes vencidos: se acredita cuando su pago quede registrado.</p></div>';
    }

    const tabla = filas.length
      ? '<div class="overflow-x-auto scroll-thin"><table class="table min-w-[760px]"><thead><tr><th>Registrado</th><th>Cliente</th><th>Recibo</th><th class="text-right">Pago</th><th class="text-right">%</th><th class="text-right">Comisión</th>' + (admin ? '<th>Para</th>' : '') + '</tr></thead><tbody>' +
        filas.map((x) => '<tr><td class="text-sm">' + esc(fmtDate(x.fechaRegistro)) + '</td><td><div class="font-semibold">' + esc(x.cliente) + '</div><div class="text-xs muted">' + esc(x.concepto) + ' del ' + esc(fmtDate(x.cubre)) + '</div></td>' +
          '<td class="text-sm">' + esc(x.reciboNo) + '</td><td class="text-right text-sm">' + esc(money2(x.monto)) + '</td><td class="text-right text-sm">' + x.comisionPct + ' %</td>' +
          '<td class="text-right font-bold text-emerald-600">' + esc(money2(x.comision)) + '</td>' + (admin ? '<td class="text-sm">' + esc(x.paraNombre || x.para) + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>'
      : UI.empty('fa-wallet', 'Sin comisiones en este periodo', 'Se generan cuando se registra un pago de tus clientes.');

    $('#comBody').innerHTML = '<div class="grid gap-3 sm:grid-cols-3 mb-4">' +
      kpi('trophy', 'var(--ok)', admin ? 'Acreditado este mes (equipo)' : 'Acreditado este mes', esteMes, 'Pagos registrados en ' + Agenda.titulo(mesAct)) +
      kpi('wallet', 'var(--accent)', admin ? 'Acreditado en total (equipo)' : 'Acreditado en total', total(D), D.length + (D.length === 1 ? ' pago' : ' pagos')) +
      kpi('clock', 'var(--warn)', 'Por acreditar', pend, 'Clientes vencidos: se acredita al registrarse su pago') + '</div>' +
      porPersona +
      '<div class="glass p-5"><div class="flex flex-wrap items-center gap-3 mb-3"><h3 class="font-bold flex-1">' + (admin ? 'Comisiones del equipo' : 'Mis comisiones') + '</h3>' +
      '<select id="comMes" class="input !w-auto"><option value="">Todo el tiempo</option>' + meses.map((m) => '<option value="' + m + '" ' + (Comision.mes === m ? 'selected' : '') + '>' + esc(Agenda.titulo(m)) + '</option>').join('') + '</select>' +
      '<span class="font-extrabold">' + esc(money2(total(filas))) + '</span></div>' + tabla + '</div>';
    $('#comMes').addEventListener('change', (e) => { Comision.mes = e.target.value; Views.comisionesRender(); });
  },
});
