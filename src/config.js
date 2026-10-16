export const CONFIG = Object.freeze({
  // Sin VITE_API_URL solo se usa el Web App de pruebas en desarrollo; el build de producción exige la variable.
  API_URL: import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'https://script.google.com/macros/s/AKfycbxtrXZHPjlWvvIOg3YcwBeEHbayh9rTAt1cbvRjiPL7Mh6TwgJDd70Fd18ePDoOKewUEw/exec' : ''),
  FIREBASE: Object.freeze({
    apiKey: 'AIzaSyD3P1zTnWwW6VonvZghgVTnb0Eokxr7AzE',
    authDomain: 'personal-32795.firebaseapp.com',
    projectId: 'personal-32795',
    appId: '1:411479894150:web:3792309bfe01b025874907',
  }),
  LOCALE: 'es-GT',
  TIMEOUT_MS: 30000,
  REFRESH_MS: 300000,
  SNAPSHOT_MAX_AGE_MS: 24 * 3600 * 1000,
});
