import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification,
} from 'firebase/auth';
import { ApiError } from './api.js';

let auth = null;

/** Sin popupRedirectResolver: el bundle de Auth queda mínimo (solo email/contraseña). */
export function initAuth(firebaseConfig, onChange) {
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  auth.languageCode = 'es';
  return onAuthStateChanged(auth, onChange);
}

export function getToken(force) {
  const u = auth && auth.currentUser;
  if (!u) return Promise.reject(new ApiError('UNAUTHENTICATED', 'Sesión cerrada.'));
  return u.getIdToken(!!force);
}

export const login = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const resendVerification = () => sendEmailVerification(auth.currentUser);
export async function reloadUser() {
  if (!auth.currentUser) return;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
}
export const currentUid = () => (auth && auth.currentUser ? auth.currentUser.uid : '');

const MSG = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/invalid-login-credentials': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
};
export const authMessage = (err) => MSG[err && err.code] || 'No se pudo completar la operación.';
