import { html, setHTML } from './html.js';
import { trapFocus } from './focus-trap.js';

let cur = null;

export function openDrawer(content, { label = 'Detalle', onClose } = {}) {
  closeDrawer();
  const scrim = document.createElement('div');
  scrim.className = 'drawer-scrim';
  const el = document.createElement('aside');
  el.className = 'drawer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', label);
  setHTML(el, content);
  document.body.append(scrim, el);
  const release = trapFocus(el);
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-wrap')) closeDrawer(); };
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', () => closeDrawer());
  let closed = false;
  const handle = {
    el,
    set(c) { setHTML(el, c); },
    close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      scrim.remove(); el.remove(); release();
      if (cur === handle) cur = null;
      if (onClose) onClose();
    },
  };
  cur = handle;
  return handle;
}

export const closeDrawer = () => { if (cur) cur.close(); };
export const drawerOpen = () => !!cur;
export const drawerEl = () => (cur ? cur.el : null);
export const drawerLoading = () => html`<div class="drawer-body"><div class="skeleton" style="height:28px;width:60%"></div>
  <div class="skeleton" style="height:16px;width:35%"></div><div class="skeleton" style="height:140px"></div><div class="skeleton" style="height:220px"></div></div>`;
