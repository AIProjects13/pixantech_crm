import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { fmtDate } from '../ui/format.js';
import { createTable } from '../ui/table.js';
import { isDue } from '../lib/dates.js';
import { estadoChip, quickActions, emptyState } from './common.js';
import { newLeadModal } from './lead-form.js';

let table = null;

function def(ctx) {
  const s = () => ctx.store.get();
  const admin = s().user.isAdmin;
  const seg = (l) => (isDue(l, s().hoy) ? (l.fechaContacto === s().hoy ? 'Hoy' : 'Vencido') : l.fechaContacto ? 'Programado' : 'Sin fecha');
  const cols = [
    { k: 'nombre', label: 'Empresa', sort: (l) => l.nombre },
    { k: 'contacto', label: 'Contacto', sort: (l) => l.contacto },
    { k: 'rubro', label: 'Rubro', sort: (l) => l.rubro },
    { k: 'region', label: 'Región', sort: (l) => [l.region, l.pais].filter(Boolean).join(', ') },
    { k: 'estado', label: 'Etapa', sort: (l) => s().estados.indexOf(l.estado) },
    { k: 'fechaContacto', label: 'Próx. contacto', sort: (l) => l.fechaContacto },
  ];
  if (admin) cols.push({ k: 'asignadoA', label: 'Responsable', sort: (l) => l.asignadoA });
  cols.push({ k: 'fechaCreacion', label: 'Creado', sort: (l) => l.fechaCreacion }, { k: 'acc', label: '' });
  const filters = [
    { k: 'estado', label: 'Etapa', get: (l) => l.estado }, { k: 'seg', label: 'Seguimiento', get: seg },
    { k: 'rubro', label: 'Rubro', get: (l) => l.rubro }, { k: 'region', label: 'Región', get: (l) => l.region },
  ];
  if (admin) filters.push({ k: 'asignadoA', label: 'Responsable', get: (l) => l.asignadoA });
  return {
    name: 'prospectos', placeholder: 'Buscar empresa, contacto, email, teléfono…', initSort: { k: 'fechaCreacion', dir: -1 },
    cols, filters, rows: () => s().leads,
    search: (l) => [l.nombre, l.contacto, l.email, l.telefono, l.rubro, l.region, l.pais, l.web].join(' '),
    empty: emptyState('Aún no hay prospectos', 'Crea uno o toma prospectos de la bolsa.'),
    row: (l) => {
      const due = isDue(l, s().hoy);
      return html`<tr>
        <td data-label="Empresa"><button type="button" class="row-link" data-open="${l.id}">${l.nombre}</button><div class="muted" style="font-size:12px">${l.email || l.web || ''}</div></td>
        <td data-label="Contacto">${l.contacto || '—'}<div class="muted" style="font-size:12px">${l.telefono || ''}</div></td>
        <td data-label="Rubro">${l.rubro || '—'}</td>
        <td data-label="Región">${[l.region, l.pais].filter(Boolean).join(', ') || '—'}</td>
        <td data-label="Etapa">${estadoChip(l.estado)}</td>
        <td data-label="Próx. contacto" style="${due ? 'color:var(--danger);font-weight:700' : ''}">${l.fechaContacto ? (l.fechaContacto === s().hoy ? 'Hoy' : fmtDate(l.fechaContacto)) : '—'}</td>
        ${admin ? html`<td data-label="Responsable" class="muted">${l.asignadoA}</td>` : ''}
        <td data-label="Creado" class="muted">${fmtDate(l.fechaCreacion)}</td>
        <td>${quickActions(l)}</td></tr>`;
    },
    exp: [
      ['id', (l) => l.id], ['nombre', (l) => l.nombre], ['rubro', (l) => l.rubro], ['pais', (l) => l.pais], ['region', (l) => l.region],
      ['contacto', (l) => l.contacto], ['email', (l) => l.email], ['telefono', (l) => l.telefono], ['web', (l) => l.web], ['colores', (l) => l.colores],
      ['etapa', (l) => l.estado], ['proximo_contacto', (l) => l.fechaContacto], ['seguimiento', seg], ['responsable', (l) => l.asignadoA],
      ['creado_por', (l) => l.creadoPor], ['fecha_creacion', (l) => l.fechaCreacion], ['actualizado', (l) => l.actualizado], ['num_notas', (l) => l.notas],
    ],
  };
}

export default {
  render() {
    return html`<div class="row" style="margin-bottom:14px"><p class="muted" style="flex:1">Ordena con los encabezados; abre un prospecto con su nombre.</p>
      <button type="button" class="btn btn-primary" data-act="newLead">${icon('plus', 16)} Nuevo prospecto</button></div><div id="leadsTable"></div>`;
  },
  mount(el, ctx) {
    table = createTable('leads', def(ctx));
    table.mount(el.querySelector('#leadsTable'));
    const onClick = (e) => {
      const o = e.target.closest('[data-open]');
      if (o) ctx.openLead(o.dataset.open);
      if (e.target.closest('[data-act="newLead"]')) newLeadModal(ctx);
    };
    el.addEventListener('click', onClick);
    return () => { el.removeEventListener('click', onClick); table = null; };
  },
  refresh() { if (table) table.refresh(); },
};
