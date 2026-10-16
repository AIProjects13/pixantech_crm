import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

// CSP solo en el build (en desarrollo Vite necesita websockets para HMR).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com",
  "frame-src https://personal-32795.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const cspPlugin = {
  name: 'pxt-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<!--CSP-->', '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">'),
};

/** Un build sin la URL del Web App v2 acabaría apuntando a ninguna parte (o al backend equivocado). */
function requireApiUrlPlugin(env) {
  return {
    name: 'pxt-require-api-url',
    apply: 'build',
    buildStart() {
      if (!String(env.VITE_API_URL || '').trim()) {
        throw new Error('Falta VITE_API_URL (URL /exec del Web App v2). Defínela en .env o en las variables del repositorio.');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: 'frontend',
  base: './',
  envDir: '..',
  plugins: [cspPlugin, requireApiUrlPlugin(loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), 'VITE_'))],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    manifest: true,
    rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth'] } } },
  },
}));
