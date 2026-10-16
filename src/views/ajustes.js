import { html, setHTML, attrs } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

const GRUPOS = [
  ['Correo', ['REMITENTE_NOMBRE', 'REPLY_TO']],
  ['WhatsApp y duplicados', ['DEFAULT_COUNTRY_CODE']],
  ['Cobros', ['MONEDA', 'DIAS_AVISO_COBRO', 'DIAS_GRACIA']],
  ['Comisiones', ['COMISION_PCT']],
  ['Resumen diario por correo', ['RESUMEN_ACTIVO', 'RESUMEN_DESTINATARIOS', 'RESUMEN_HORA']],
];
const LABELS = {
  REMITENTE_NOMBRE: 'Nombre del remitente', REPLY_TO: 'Responder a (email)', DEFAULT_COUNTRY_CODE: 'Código de país',
  MONEDA: 'Símbolo de moneda', DIAS_AVISO_COBRO: 'Días de aviso antes de vencer', DIAS_GRACIA: 'Días de gracia antes de "Moroso"',
  COMISION_PCT: 'Comisión por pago (%)', RESUMEN_ACTIVO: 'Enviar resumen diario', RESUMEN_DESTINATARIOS: 'Destinatarios', RESUMEN_HORA: 'Hora de envío',
};

function campo(v) {
  const id = 'cfg_' + v.clave;
  let input;
  if (v.clave === 'RESUMEN_ACTIVO') {
    const on = /^(true|1|si|sí)$/i.test(v.valor);
    input = html`<button type="button" class="switch" role="switch" id="${id}" aria-checked="${String(on)}" data-switch="${v.clave}" aria-label="${LABELS[v.clave]}"></button>`;
  } else if (v.clave === 'RESUMEN_DESTINATARIOS') {
    input = html`<textarea class="input" id="${id}" name="${v.clave}" rows="3" placeholder="Vacío = administradores activos">${String(v.valor || '').split(/\s*,\s*/).filter(Boolean).join('\n')}</textarea>`;
  } else if (v.clave === 'RESUMEN_HORA') {
    input = html`<select class="input" id="${id}" name="${v.clave}">${Array.from({ length: 24 }, (_, h) => html`<option value="${h}"${attrs({ selected: String(h) === String(v.valor) })}>${String(h).padStart(2, '0')}:00</option>`)}</select>`;
  } else {
    input = html`<input class="input" id="${id}" name="${v.clave}" value="${v.valor}">`;
  }
  return html`<div class="field"><label class="label" for="${id}">${LABELS[v.clave] || v.clave}</label>${input}<span class="muted" style="font-size:12px">${v.descripcion}</span></div>`;
}

function draw(el, cfg) {
  const by = {};
  cfg.valores.forEach((v) => { by[v.clave] = v; });
  setHTML(el.querySelector('#cfgBody'), html`<form id="cfgForm" class="stack">${GRUPOS.map(([g, keys]) => {
    const vs = keys.map((k) => by[k]).filter(Boolean);
    return vs.length ? html`<section class="card"><div class="card-title">${g}</div><div class="form-grid">${vs.map(campo)}</div></section>` : '';
  })}<div class="row"><span class="muted">${icon('mail', 14)} Cuota de correo restante hoy: <strong>${cfg.cuotaCorreo}</strong></span><span class="spacer"></span>
    <button type="submit" class="btn btn-primary">${icon('save', 16)} Guardar ajustes</button></div></form>`);
}

export default {
  render() { return html`<div id="cfgBody"><div class="skeleton" style="height:300px"></div></div>`; },
  async mount(el, ctx) {
    const onClick = (e) => {
      const s = e.target.closest('[data-switch]');
      if (s) s.setAttribute('aria-checked', String(s.getAttribute('aria-checked') !== 'true'));
    };
    const onSubmit = async (e) => {
      if (e.target.id !== 'cfgForm') return;
      e.preventDefault();
      const valores = {};
      new FormData(e.target).forEach((v, k) => { valores[k] = k === 'RESUMEN_DESTINATARIOS' ? String(v).split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean).join(', ') : String(v).trim(); });
      el.querySelectorAll('[data-switch]').forEach((s) => { valores[s.dataset.switch] = s.getAttribute('aria-checked') === 'true' ? 'TRUE' : 'FALSE'; });
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        draw(el, await ctx.api.call('config.save', { valores }));
        toast('Ajustes guardados', 'ok');
        ctx.reload && ctx.reload({ silent: true });
      } catch (x) { toast(x.message, 'error'); btn.disabled = false; }
    };
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    try { draw(el, await ctx.api.call('config.get')); } catch (e) { toast(e.message, 'error'); }
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); };
  },
};
