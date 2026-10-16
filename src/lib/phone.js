// Misma normalización que backend/util.gs normPhone_
export function normPhone(s, cc) {
  const rawS = String(s || '').trim();
  const d = rawS.replace(/\D/g, '');
  if (!d) return '';
  if (rawS.charAt(0) === '+') return d;
  if (d.indexOf('00') === 0) return d.slice(2);
  if (d.length <= 8 && cc) return String(cc) + d;
  return d;
}
export const waUrl = (digits) => (digits ? 'https://wa.me/' + encodeURIComponent(digits) : '');
export const mailUrl = (e) => (e ? 'mailto:' + encodeURIComponent(e) : '');
export const telUrl = (s) => (s ? 'tel:' + String(s).replace(/[^\d+]/g, '') : '');
