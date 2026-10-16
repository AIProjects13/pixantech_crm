import { isDue, monthKey, addMonthsKey, CERRADOS } from './dates.js';

const COBRO_COLORS = { 'Al día': 'var(--ok)', 'Por vencer': 'var(--amber)', 'Pendiente': 'var(--warn)', 'Moroso': 'var(--danger)', 'Sin configurar': 'var(--muted)' };

export function dashboardData(s) {
  const hoy = s.hoy;
  const mes = monthKey(hoy);
  const mesPrev = addMonthsKey(mes, -1);
  const L = s.leads;
  const C = s.clientes.filter((c) => c.estado !== 'Baja');
  const activos = L.filter((l) => !CERRADOS.includes(l.estado));
  const d30 = Date.parse(hoy + 'T12:00:00') - 30 * 864e5;
  const ganados = L.filter((l) => l.estado === 'Ganado').length;
  const perdidos = L.filter((l) => l.estado === 'Perdido').length;
  const altaMes = (k) => s.clientes.filter((c) => monthKey(String(c.fechaAlta || '').slice(0, 10)) === k).length;
  const cobradoEn = (k) => C.reduce((t, c) => t + (c.cobro.ultimoPago && monthKey(c.cobro.ultimoPago.fecha) === k ? Number(c.cobro.ultimoPago.monto || 0) : 0), 0);

  const months = [];
  for (let i = 5; i >= 0; i--) months.push(addMonthsKey(mes, -i));
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const rank = {};
  if (s.user && s.user.isAdmin) {
    C.forEach((c) => {
      const k = c.vendedor || '—';
      const r = rank[k] || (rank[k] = { email: k, nombre: c.vendedorNombre || k, ganados: 0, monto: 0 });
      r.ganados += 1;
      r.monto += c.plan === 'Anual' ? Number(c.monto || 0) / 12 : Number(c.monto || 0);
    });
  }

  return {
    kpis: {
      activos: activos.length,
      nuevos30: L.filter((l) => l.fechaCreacion && Date.parse(l.fechaCreacion) >= d30).length,
      ganadosMes: altaMes(mes), ganadosMesPrev: altaMes(mesPrev),
      cobradoMes: cobradoEn(mes), cobradoMesPrev: cobradoEn(mesPrev),
      porCobrar: C.reduce((t, c) => t + Number(c.cobro.montoAdeudado || 0), 0),
      morosos: C.filter((c) => c.cobro.estado === 'Moroso').length,
      tasaCierre: ganados + perdidos ? ganados / (ganados + perdidos) : 0,
      comisionSaldo: Number((s.comisiones && s.comisiones.saldo) || 0),
    },
    funnel: s.estados.map((e) => ({ estado: e, n: L.filter((l) => l.estado === e).length })),
    cobros: Object.keys(COBRO_COLORS).map((k) => ({ label: k, value: C.filter((c) => c.cobro.estado === k).length, color: COBRO_COLORS[k] })),
    ventasMes: { labels: months.map((m) => MES[Number(m.slice(5)) - 1]), values: months.map(altaMes) },
    ranking: Object.values(rank).sort((a, b) => b.monto - a.monto).slice(0, 5),
    seguimientos: activos.filter((l) => isDue(l, hoy)).sort((a, b) => a.fechaContacto.localeCompare(b.fechaContacto)).slice(0, 6),
    proximosCobros: C.filter((c) => c.cobro.proximoCobro).sort((a, b) => a.cobro.proximoCobro.vence.localeCompare(b.cobro.proximoCobro.vence)).slice(0, 6),
  };
}
