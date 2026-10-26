/* Cobros — calendario de cuotas y estado de pago.
 * Funciones puras, sin DOM. El MISMO algoritmo vive en Code.gs (cobroSchedule_ / cobroStatus_):
 * tests/test-cobros.js comprueba que ambos den siempre lo mismo. Si cambias uno, cambia el otro.
 * Fechas siempre como texto AAAA-MM-DD. */
const Cobros = {
  PRONTO: 7, // una cuota que vence en 7 días o menos está "por vencer"

  pad(n) { return (n < 10 ? '0' : '') + n; },

  /** Días entre dos fechas AAAA-MM-DD (b − a). */
  dias(a, b) {
    const pa = String(a).split('-').map(Number);
    const pb = String(b).split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
  },

  /** Fecha + n días. */
  addDays(s, n) {
    const p = String(s).split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + '-' + Cobros.pad(d.getUTCMonth() + 1) + '-' + Cobros.pad(d.getUTCDate());
  },

  /** Fecha + n meses; si el día no existe en ese mes cae en el último (31 ene → 28 feb). */
  addMonths(s, n) {
    const p = String(s).split('-').map(Number);
    const total = p[1] - 1 + n;
    const y = p[0] + Math.floor(total / 12);
    const m = (total % 12) + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return y + '-' + Cobros.pad(m) + '-' + Cobros.pad(Math.min(p[2], last));
  },

  /** Plan de cobro de una fila de cliente. */
  planDe(c) {
    if (!c) return null;
    return {
      frecuencia: c.frecuencia, monto: Number(c.montoCobro) || 0, inicio: c.inicioCobro || '',
      inicialMonto: Number(c.pagoInicialMonto) || 0, inicialFecha: c.pagoInicialFecha || '',
    };
  },

  /**
   * Cuotas del plan hasta hoy (+ aheadDays) y la siguiente después de ese límite.
   * plan: {frecuencia:'Mensual'|'Anual', monto, inicio, inicialMonto?, inicialFecha?}
   * Devuelve [{key:'AAAA-MM-DD', concepto:'Inicial'|'Mensualidad'|'Anualidad', monto}] ordenado por fecha.
   */
  schedule(plan, today, aheadDays) {
    const out = [];
    if (!plan) return out;
    const limite = aheadDays ? Cobros.addDays(today, aheadDays) : today;
    if (Number(plan.inicialMonto) > 0 && plan.inicialFecha) out.push({ key: plan.inicialFecha, concepto: 'Inicial', monto: Number(plan.inicialMonto) });
    const monto = Number(plan.monto) || 0;
    const mensual = plan.frecuencia === 'Mensual';
    if (monto > 0 && plan.inicio && (mensual || plan.frecuencia === 'Anual')) {
      for (let k = 0; k < 600; k++) {
        const key = Cobros.addMonths(plan.inicio, mensual ? k : 12 * k);
        out.push({ key: key, concepto: mensual ? 'Mensualidad' : 'Anualidad', monto: monto });
        if (key > limite) break;
      }
    }
    return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.concepto === 'Inicial' ? -1 : b.concepto === 'Inicial' ? 1 : 0));
  },

  /**
   * Estado de cobro: 'Vencido' (dias = desde la cuota vencida más antigua), 'Por vencer' o 'Al día'
   * (dias = hasta la siguiente cuota), 'Sin plan'. pagos: [{cubre, anulado?}]; un pago anulado no cubre.
   */
  status(plan, pagos, today) {
    let items = Cobros.schedule(plan, today, 0);
    if (!items.length) return { estado: 'Sin plan', dias: 0, siguiente: null, vencidas: 0 };
    const cubiertas = {};
    (pagos || []).forEach((p) => { if (p && !p.anulado && p.cubre) cubiertas[p.cubre] = true; });
    let pend = items.filter((x) => !cubiertas[x.key]);
    if (!pend.some((x) => x.key >= today)) {
      // Pagó por adelantado la siguiente: se busca la próxima cuota sin pagar más adelante.
      items = Cobros.schedule(plan, today, 800);
      pend = items.filter((x) => !cubiertas[x.key]);
    }
    const vencidas = pend.filter((x) => x.key < today);
    if (vencidas.length) return { estado: 'Vencido', dias: Cobros.dias(vencidas[0].key, today), siguiente: vencidas[0], vencidas: vencidas.length };
    const sig = pend[0] || null;
    if (!sig) return { estado: 'Al día', dias: 0, siguiente: null, vencidas: 0 };
    const d = Cobros.dias(today, sig.key);
    return { estado: d <= Cobros.PRONTO ? 'Por vencer' : 'Al día', dias: d, siguiente: sig, vencidas: 0 };
  },
};
