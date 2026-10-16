import { html, raw } from './html.js';

/** Dona en SVG con segmentos por stroke-dasharray (sin librerías). */
export function donut(segments, { size = 140, thickness = 18, center = '' } = {}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  let off = 0;
  const arcs = total ? segments.filter((x) => x.value > 0).map((x) => {
    const len = (x.value / total) * c;
    const a = html`<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${x.color}" stroke-width="${thickness}"
      stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    off += len;
    return a;
  }) : [];
  const label = segments.map((x) => x.label + ': ' + x.value).join(', ') || 'Sin datos';
  return html`<div style="position:relative;width:${size}px;height:${size}px;flex:none">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${thickness}"/>${arcs}
    </svg><div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">${center}</div></div>`;
}

/** Barras verticales; la última resaltada (período actual). */
export function bars(values, labels, { height = 160, highlightLast = true, format = (v) => String(v) } = {}) {
  const n = values.length || 1;
  const max = Math.max(1, ...values);
  const w = 100 / n;
  const label = labels.map((l, i) => l + ': ' + format(values[i])).join(', ');
  return html`<svg width="100%" height="${height + 22}" viewBox="0 0 100 ${height + 22}" preserveAspectRatio="none" role="img" aria-label="${label}">
    ${values.map((v, i) => {
      const h = Math.max(v ? 2 : 0, (v / max) * height);
      const fill = highlightLast && i === n - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 35%, transparent)';
      return html`<rect x="${i * w + w * 0.2}" y="${height - h}" width="${w * 0.6}" height="${h}" rx="1.2" fill="${fill}"><title>${labels[i]}: ${format(v)}</title></rect>`;
    })}
  </svg><div class="row" style="justify-content:space-between;font-size:11px;color:var(--muted)">${labels.map((l) => html`<span>${l}</span>`)}</div>`;
}

export function sparkline(values, { width = 120, height = 36 } = {}) {
  if (!values.length) return raw('');
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => (i * step).toFixed(1) + ',' + (height - (v / max) * (height - 4) - 2).toFixed(1)).join(' ');
  return html`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
