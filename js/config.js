'use strict';

/* ================================ CONFIG ================================= */
const CONFIG = {
  // URL del Web App (/exec). Solo se usa si el HTML se aloja fuera de Apps Script.
  API_URL: 'https://script.google.com/macros/s/AKfycbxtrXZHPjlWvvIOg3YcwBeEHbayh9rTAt1cbvRjiPL7Mh6TwgJDd70Fd18ePDoOKewUEw/exec',
  FIREBASE: {
    apiKey: 'AIzaSyD3P1zTnWwW6VonvZghgVTnb0Eokxr7AzE',
    authDomain: 'personal-32795.firebaseapp.com',
    projectId: 'personal-32795',
    storageBucket: 'personal-32795.firebasestorage.app',
    messagingSenderId: '411479894150',
    appId: '1:411479894150:web:3792309bfe01b025874907',
  },
  CURRENCY: 'Q',
  LOCALE: 'es-GT',
  MAX_CARDS_PER_COLUMN: 80,
};

// Pasos del pipeline: color e icono (nombres de js/icons.js).
const ESTADO_META = {
  'Lead':            { c: '#64748b', i: 'sprout' },
  'Primer Contacto': { c: '#0ea5e9', i: 'phone' },
  'Correo Enviado':  { c: '#6366f1', i: 'send' },
  'Demo/Reunión':    { c: '#8b5cf6', i: 'video' },
  'Negociación':     { c: '#f59e0b', i: 'briefcase' },
  'Ganado':          { c: '#10b981', i: 'trophy' },
  'Perdido':         { c: '#f43f5e', i: 'circleX' },
};
const PAGO_META = { 'Al día': '#10b981', 'Pendiente': '#f59e0b', 'Moroso': '#f43f5e' };
// Estado de cobro calculado por plan y pagos (Cobros.status).
const COBRO_META = { 'Al día': '#22b573', 'Por vencer': '#f6b73c', 'Vencido': '#ef5b6b', 'Sin plan': '#94a3b8', 'Inactivo': '#64748b' };
const CERRADOS = ['Ganado', 'Perdido'];
const TIPOS_SEGUIMIENTO = ['Llamada', 'WhatsApp', 'Reunión', 'Correo', 'Otro'];
const TIPO_ICON = { 'Llamada': 'phone', 'WhatsApp': 'whatsapp', 'Reunión': 'video', 'Correo': 'mail', 'Otro': 'clock' };
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta', 'Cheque', 'Otro'];
const FRECUENCIAS = ['Mensual', 'Anual'];
// Logo (sobre fondo azul marino, para el menú) y emblema.
const LOGO = { emblem: 'assets/pixan-emblem-sm.png', full: 'assets/pixan-logo.png' };
