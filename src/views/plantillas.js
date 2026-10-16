import { html, setHTML, attrs, esc } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { promptDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { emptyState } from './common.js';

const VARS = ['nombre', 'contacto', 'rubro', 'pais', 'region', 'web'];
const EJEMPLO = { nombre: 'Colegio Ejemplo', contacto: 'Ana López', rubro: 'Colegios', pais: 'Guatemala', region: 'Mixco', web: 'https://ejemplo.edu.gt' };
let list = [];
let sel = null;
let quill = null;
let libs = null;

/** Documento para <iframe sandbox srcdoc>: sin scripts, variables de ejemplo escapadas. */
export function previewDoc(cuerpo, vars = EJEMPLO) {
  const body = String(cuerpo || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? esc(vars[k]) : m));
  return '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:16px;line-height:1.5}img{max-width:100%}</style></head><body>' + body + '</body></html>';
}

const loadLibs = () => libs || (libs = Promise.all([import('quill'), import('quill/dist/quill.snow.css'), import('dompurify')])
  .then(([q, , d]) => ({ Quill: q.default, DOMPurify: d.default }))
  .catch((e) => { libs = null; throw e; }));

/** Normaliza el HTML semántico de Quill (sin marcado interno): &nbsp; -> espacio. */
export const cleanSemantic = (h) => String(h || '').replace(/&nbsp;/g, ' ');
/** HTML semántico del editor (listas <ul>/<ol> reales, sin data-list). */
export const semanticHtml = (q) => cleanSemantic(q.getSemanticHTML());

function editor(t) {
  return html`<div class="row" style="margin-bottom:12px"><h3 style="flex:1">${t.id ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
      <label class="row"><input type="checkbox" id="tplActiva"${attrs({ checked: !!t.activa })}> Plantilla activa</label></div>
    <div class="form-grid"><label class="field"><span class="label">Nombre interno</span><input class="input" id="tplNombre" maxlength="100" value="${t.nombre || ''}"></label>
      <label class="field"><span class="label">Asunto</span><input class="input" id="tplAsunto" maxlength="200" value="${t.asunto || ''}"></label></div>
    <div class="row" style="margin:12px 0"><span class="muted" style="font-size:12px">Insertar variable:</span>${VARS.map((v) => html`<button type="button" class="chip" data-var="${v}">{{${v}}}</button>`)}</div>
    <div id="quillBox"><div class="skeleton" style="height:240px"></div></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px">
      <button type="button" class="btn btn-ghost" data-act="preview">${icon('eye', 16)} Vista previa</button>
      <button type="button" class="btn btn-primary" data-act="save">${icon('save', 16)} Guardar plantilla</button></div>
    <iframe class="preview-frame" id="tplPreview" title="Vista previa del correo" sandbox="" hidden></iframe>`;
}

async function mountEditor(el, t) {
  const box = el.querySelector('#quillBox');
  try {
    const { Quill, DOMPurify } = await loadLibs();
    if (!box.isConnected) return;
    setHTML(box, html`<div id="quill"></div>`);
    quill = new Quill(el.querySelector('#quill'), {
      theme: 'snow', placeholder: 'Redacta el correo…',
      modules: { toolbar: { container: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }], ['link', 'image'], ['clean']],
        handlers: { image: async function () {
          const url = await promptDialog('Insertar imagen', 'URL pública de la imagen (https://…)', { required: true });
          if (!url) return;
          if (!/^https:\/\//i.test(url)) { toast('La imagen debe ser una URL https.', 'error'); return; }
          const r = this.quill.getSelection(true);
          this.quill.insertEmbed(r.index, 'image', url, 'user');
        } } } },
    });
    const clean = DOMPurify.sanitize(t.cuerpoHtml || '', { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'iframe'], FORBID_ATTR: ['onerror', 'onclick', 'onload'] });
    quill.clipboard.dangerouslyPasteHTML(clean);
    quill.history.clear();
  } catch (e) {
    toast('No se pudo cargar el editor.', 'error');
  }
}

function draw(el) {
  setHTML(el.querySelector('#tplList'), list.length ? html`${list.map((t) => html`<button type="button" class="nav-item" data-sel="${t.id}"${attrs({ 'aria-current': sel === t.id ? 'true' : null })}>
    ${icon('mail', 16)}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${t.nombre}</span>${t.activa ? html`<span class="chip chip-ok">Activa</span>` : ''}</button>`)}` : emptyState('Sin plantillas'));
  const t = list.find((x) => x.id === sel) || { activa: !list.length };
  setHTML(el.querySelector('#tplEditor'), editor(t));
  mountEditor(el, t);
}

export default {
  render() {
    return html`<div class="grid" style="grid-template-columns:minmax(220px,300px) 1fr;align-items:start">
      <section class="card"><div class="card-title">Plantillas<span class="spacer"></span><button type="button" class="btn btn-ghost btn-sm" data-act="new">${icon('plus', 14)} Nueva</button></div><div id="tplList" class="stack" style="gap:4px"></div></section>
      <section class="card" id="tplEditor"><div class="skeleton" style="height:300px"></div></section></div>`;
  },
  async mount(el, ctx) {
    const onClick = async (e) => {
      const s = e.target.closest('[data-sel]');
      if (s) { sel = s.dataset.sel; draw(el); return; }
      const v = e.target.closest('[data-var]');
      if (v && quill) { const r = quill.getSelection(true); quill.insertText(r.index, '{{' + v.dataset.var + '}}', 'user'); return; }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'new') { sel = null; draw(el); }
      if (a.dataset.act === 'preview' && quill) {
        const f = el.querySelector('#tplPreview');
        f.srcdoc = previewDoc(semanticHtml(quill));
        f.hidden = false;
      }
      if (a.dataset.act === 'save' && quill) {
        a.disabled = true;
        try {
          const r = await ctx.api.call('plantillas.save', {
            id: sel || undefined, nombre: el.querySelector('#tplNombre').value.trim(), asunto: el.querySelector('#tplAsunto').value.trim(),
            cuerpoHtml: semanticHtml(quill), activa: el.querySelector('#tplActiva').checked,
          });
          list = r.plantillas;
          sel = r.id;
          ctx.store.set({ plantillas: list.map((t) => ({ id: t.id, nombre: t.nombre, asunto: t.asunto, activa: t.activa })) });
          toast('Plantilla guardada', 'ok');
          draw(el);
        } catch (x) { toast(x.message, 'error'); a.disabled = false; }
      }
    };
    el.addEventListener('click', onClick);
    try {
      list = await ctx.api.call('plantillas.list');
      sel = sel || (list.find((t) => t.activa) || list[0] || {}).id || null;
      draw(el);
    } catch (e) { toast(e.message, 'error'); }
    return () => { el.removeEventListener('click', onClick); quill = null; };
  },
};
