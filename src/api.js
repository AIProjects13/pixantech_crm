export class ApiError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

/** Cliente del Web App. text/plain evita el preflight CORS de Apps Script. */
export function createApi({ url, getToken, fetchImpl = (...a) => fetch(...a), timeoutMs = 30000 }) {
  async function post(body, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms || timeoutMs);
    try {
      const r = await fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(body),
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      if (!r.ok) throw new ApiError('NETWORK', 'El servidor respondió con un error (' + r.status + ').');
      try {
        return await r.json();
      } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        throw new ApiError('BAD_RESPONSE', 'El servidor devolvió una respuesta inesperada. Revisa la implementación del Web App.');
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e && e.name === 'AbortError') throw new ApiError('TIMEOUT', 'El servidor tardó demasiado. Intenta de nuevo.');
      throw new ApiError('NETWORK', 'No se pudo conectar con el servidor. Revisa tu internet.');
    } finally {
      clearTimeout(timer);
    }
  }

  async function call(action, payload = {}, opts = {}, retried = false) {
    const token = await getToken(retried);
    const res = await post({ action, token, payload }, opts && opts.timeoutMs);
    if (res && res.ok) return res.data;
    const err = (res && res.error) || {};
    if (err.code === 'UNAUTHENTICATED' && !retried) return call(action, payload, opts, true);
    throw new ApiError(err.code || 'UNKNOWN', err.message || 'Error inesperado.', err.data);
  }

  return { call: (action, payload, opts) => call(action, payload, opts || {}, false) };
}
