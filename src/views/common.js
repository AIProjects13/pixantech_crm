import { html, safeHref } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { waUrl, mailUrl } from '../lib/phone.js';

export const ESTADO_COLOR = {
  'Lead': 'var(--muted)', 'Primer Contacto': 'var(--cyan)', 'Correo Enviado': 'var(--info)', 'Demo/Reunión': 'var(--violet)',
  'Negociación': 'var(--amber)', 'Ganado': 'var(--ok)', 'Perdido': 'var(--danger)',
};
const COBRO_CLS = { 'Al día': 'chip-ok', 'Por vencer': 'chip-warn', 'Pendiente': 'chip-warn', 'Moroso': 'chip-danger', 'Baja': 'chip-muted', 'Sin configurar': 'chip-muted' };

export const estadoChip = (e) => html`<span class="chip"><span class="dot" style="background:${ESTADO_COLOR[e] || 'var(--muted)'}"></span>${e}</span>`;
export const cobroChip = (e) => html`<span class="chip ${COBRO_CLS[e] || 'chip-muted'}">${e}</span>`;

export function quickActions(x) {
  return html`<span class="row" style="gap:6px;flex-wrap:nowrap">
    ${x.whatsapp ? html`<a class="btn btn-sm btn-icon btn-wa" href="${safeHref(waUrl(x.whatsapp))}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp a ${x.nombre}" title="WhatsApp">${icon('whatsapp', 16)}</a>` : ''}
    ${x.email ? html`<a class="btn btn-sm btn-icon btn-ghost" href="${safeHref(mailUrl(x.email))}" aria-label="Email a ${x.nombre}" title="Email">${icon('mail', 16)}</a>` : ''}
  </span>`;
}

export const emptyState = (title, text) => html`<div class="empty"><strong>${title}</strong>${text || ''}</div>`;
