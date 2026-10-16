export function createStore(initial) {
  let s = initial;
  const subs = new Set();
  return {
    get: () => s,
    set(patch) {
      s = Object.assign({}, s, typeof patch === 'function' ? patch(s) : patch);
      subs.forEach((f) => f(s));
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
}

const EMPTY = () => ({
  user: null, config: { moneda: 'Q', countryCode: '502', comisionPct: 20, diasAviso: 7, diasGracia: 5 },
  estados: [], hoy: '', leads: [], bolsa: [], clientes: [], plantillas: [], usuarios: [],
  alertas: { porVencer: 0, pendiente: 0, moroso: 0, total: 0 }, comisiones: { generado: 0, pagado: 0, saldo: 0 },
  loadedAt: 0, fromCache: false,
});

export const store = createStore(EMPTY());

export function resetState() { store.set(EMPTY()); }

export function applyBootstrap(d, fromCache = false) {
  store.set({
    user: d.user, config: d.config || store.get().config, estados: d.estados || [], hoy: d.hoy || '',
    leads: d.leads || [], bolsa: d.bolsa || [], clientes: d.clientes || [], plantillas: d.plantillas || [],
    usuarios: d.usuarios || [], alertas: d.alertas || EMPTY().alertas, comisiones: d.comisiones || EMPTY().comisiones,
    loadedAt: Date.now(), fromCache,
  });
}

export function upsert(key, item, idKey = 'id') {
  store.set((s) => {
    const list = s[key].slice();
    const i = list.findIndex((x) => x[idKey] === item[idKey]);
    if (i >= 0) list[i] = Object.assign({}, list[i], item); else list.unshift(item);
    return { [key]: list };
  });
}

export function removeFrom(key, id, idKey = 'id') {
  store.set((s) => ({ [key]: s[key].filter((x) => x[idKey] !== id) }));
}
