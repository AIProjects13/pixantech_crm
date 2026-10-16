// Snapshot por usuario para pintar al instante en la siguiente visita. Se borra al cerrar sesión.
const PREFIX = 'pxt:snap:';
const ls = () => { try { return window.localStorage; } catch (e) { return null; } };

export function saveSnapshot(uid, data, storage = ls()) {
  try { if (storage && uid) storage.setItem(PREFIX + uid, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* lleno o bloqueado */ }
}

export function loadSnapshot(uid, maxAgeMs, storage = ls()) {
  try {
    const rawS = storage && uid ? storage.getItem(PREFIX + uid) : null;
    if (!rawS) return null;
    const o = JSON.parse(rawS);
    if (!o || Date.now() - o.t > maxAgeMs) return null;
    return o.d;
  } catch (e) {
    return null;
  }
}

export function clearSnapshots(storage = ls()) {
  try {
    if (!storage) return;
    const keys = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
    keys.forEach((k) => storage.removeItem(k));
  } catch (e) { /* nada */ }
}
