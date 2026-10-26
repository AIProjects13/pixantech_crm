'use strict';

/* ================================= UTILS ================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => CONFIG.CURRENCY + ' ' + Number(n || 0).toLocaleString(CONFIG.LOCALE, { maximumFractionDigits: 0 });
const num = (n) => Number(n || 0).toLocaleString(CONFIG.LOCALE);
const pct = (n) => Math.round(n * 100) + '%';
const initials = (s) => String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* almacenamiento no disponible */ } },
};

function fmtDate(v, withTime) {
  if (!v) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v);
  if (isNaN(d)) return '';
  const o = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(CONFIG.LOCALE, o);
}
function relTime(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'hace un momento';
  if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
  if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
  if (s < 86400 * 30) return 'hace ' + Math.floor(s / 86400) + ' d';
  return fmtDate(iso);
}
const waUrl = (num) => num ? 'https://wa.me/' + encodeURIComponent(num) : '';
const mailUrl = (e) => e ? 'mailto:' + encodeURIComponent(e) : '';
const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : '';

const normName = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const phoneKey = (s) => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-8) : ''; };

/** Descarga un archivo de texto generado en el navegador. */
function downloadFile(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** 2026-10-26 → "26 de octubre de 2026" */
function fechaLarga(s) {
  const p = String(s || '').split('-').map(Number);
  return p.length === 3 && p[0] ? p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0] : '';
}
/** Q 1,250.00 (con centavos: para pagos y recibos). */
const money2 = (n) => CONFIG.CURRENCY + ' ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Primera letra en mayúscula (sin tocar el resto: «lunes, 26 de octubre» → «Lunes, 26 de octubre»). */
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
