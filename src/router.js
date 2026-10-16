export const VIEWS = {
  dashboard:  { title: 'Dashboard', sub: 'Resumen de ventas y cobros', icon: 'dashboard', group: 'Ventas', load: () => import('./views/dashboard.js') },
  pipeline:   { title: 'Pipeline', sub: 'Arrastra o usa "Mover a…" para cambiar de etapa', icon: 'pipeline', group: 'Ventas', load: () => import('./views/pipeline.js') },
  bolsa:      { title: 'Bolsa', sub: 'Prospectos libres: tómalos para trabajarlos', icon: 'bolsa', group: 'Ventas', load: () => import('./views/bolsa.js') },
  prospectos: { title: 'Prospectos', sub: 'Tabla completa: ordena, filtra y exporta', icon: 'tabla', group: 'Ventas', load: () => import('./views/prospectos.js') },
  cartera:    { title: 'Cartera', sub: 'Clientes, próximos cobros y estado de pago', icon: 'building', group: 'Finanzas', load: () => import('./views/cartera.js') },
  cobros:     { title: 'Cobros', sub: 'Registrar pagos y dar seguimiento a vencidos', icon: 'receipt', group: 'Finanzas', admin: true, load: () => import('./views/cobros.js') },
  comisiones: { title: 'Comisiones', sub: 'Generadas, pagadas y saldo pendiente', icon: 'coins', group: 'Finanzas', load: () => import('./views/comisiones.js') },
  actividad:  { title: 'Actividad', sub: 'Registro de acciones', icon: 'history', group: 'Finanzas', load: () => import('./views/actividad.js') },
  importar:   { title: 'Importar CSV', sub: 'Carga masiva de prospectos sin duplicados', icon: 'upload', group: 'Admin', admin: true, load: () => import('./views/importar.js') },
  usuarios:   { title: 'Usuarios', sub: 'Perfiles y roles', icon: 'users', group: 'Admin', admin: true, load: () => import('./views/usuarios.js') },
  plantillas: { title: 'Plantillas', sub: 'Correos para prospectos', icon: 'mail', group: 'Admin', admin: true, load: () => import('./views/plantillas.js') },
  ajustes:    { title: 'Ajustes', sub: 'Cobros, comisiones y resumen diario', icon: 'settings', group: 'Admin', admin: true, load: () => import('./views/ajustes.js') },
};

export const allowedViews = (user) => Object.keys(VIEWS).filter((k) => !VIEWS[k].admin || (user && user.isAdmin));

export function currentRoute() {
  const k = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return VIEWS[k] ? k : 'dashboard';
}

export function go(key) {
  if (location.hash !== '#/' + key) location.hash = '#/' + key;
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}
