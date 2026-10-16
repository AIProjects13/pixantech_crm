import { html, setHTML } from '../ui/html.js';
import { icon } from '../ui/icons.js';

export function renderLogin(root, { mode = 'login', error = '', code = '', info = '' } = {}) {
  setHTML(root, html`<main style="min-height:100vh;display:grid;place-items:center;padding:16px">
    <section class="card fade-in" style="width:min(420px,100%);padding:28px">
      <div class="row" style="margin-bottom:22px"><span class="brand-logo" style="width:44px;height:44px;border-radius:12px">${icon('zap', 22)}</span>
        <div><h1 style="font-size:20px">Pixantech CRM</h1><p class="muted">${mode === 'gate' ? 'No pudimos abrir tu espacio' : 'Ingresa con tu cuenta autorizada'}</p></div></div>
      ${mode === 'gate' ? html`
        <div role="alert" class="chip-danger" style="padding:12px;border-radius:10px;margin-bottom:16px">${error}</div>
        <div class="row">
          ${code === 'EMAIL_NOT_VERIFIED' ? html`<button type="button" class="btn btn-primary" data-act="gateVerify">${icon('mail', 16)} Reenviar verificación</button>` : ''}
          <button type="button" class="btn btn-ghost" data-act="gateRetry">${icon('refresh', 16)} Reintentar</button>
          <button type="button" class="btn btn-ghost" data-act="logout">${icon('logout', 16)} Salir</button>
        </div>` : html`
        <form id="loginForm" class="stack" novalidate>
          <div class="field"><label class="label" for="lgEmail">Email</label>
            <input class="input" id="lgEmail" type="email" required autocomplete="username" placeholder="tu@empresa.com" autofocus></div>
          <div class="field"><label class="label" for="lgPass">Contraseña</label>
            <input class="input" id="lgPass" type="password" required autocomplete="current-password"></div>
          <div id="lgMsg" role="alert" ${error || info ? '' : 'hidden'} style="font-size:13px;color:${error ? 'var(--danger)' : 'var(--ok)'}">${error || info}</div>
          <button class="btn btn-primary" id="lgBtn" type="submit" style="height:44px">Ingresar</button>
          <button type="button" class="btn btn-ghost" data-act="forgot">¿Olvidaste tu contraseña?</button>
        </form>`}
      <p class="muted" style="font-size:12px;margin-top:20px;text-align:center">Las cuentas las crea el administrador.</p>
    </section></main>`);
}
