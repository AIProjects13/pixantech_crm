const SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const active = [];

export function trapFocus(container) {
  const prev = document.activeElement;
  active.push(container);
  const onKey = (e) => {
    if (e.key !== 'Tab' || active[active.length - 1] !== container) return;
    const f = Array.from(container.querySelectorAll(SEL)).filter((x) => !x.closest('[hidden]'));
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey);
  setTimeout(() => { const f = container.querySelector('[autofocus]') || container.querySelector(SEL); if (f) f.focus(); }, 0);
  return () => {
    document.removeEventListener('keydown', onKey);
    const i = active.indexOf(container);
    if (i >= 0) active.splice(i, 1);
    if (prev && prev.focus && document.contains(prev)) prev.focus();
  };
}
