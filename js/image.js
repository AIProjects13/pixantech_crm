'use strict';

/* ============================ FOTOS DE COMPROBANTE ======================== */
// El comprobante se guarda como texto dentro de una celda de la hoja (límite ~50,000 caracteres),
// así que la foto se reduce en el navegador a un JPEG pequeño antes de enviarla.

/**
 * Prueba versiones cada vez más pequeñas hasta que el JPEG (en base64) cabe en maxChars.
 * encode(dim, calidad) → base64 sin el prefijo "data:". Baja primero la calidad y luego el tamaño.
 */
function fitJpeg(encode, maxChars) {
  let dim = 1100;
  let q = 0.72;
  for (let i = 0; i < 20 && dim >= 200; i++) {
    const b64 = encode(dim, q);
    if (b64.length <= maxChars) return b64;
    if (q > 0.46) q = Math.round((q - 0.08) * 100) / 100;
    else { dim = Math.round(dim * 0.8); q = 0.62; }
  }
  throw new Error('No se pudo reducir la imagen lo suficiente. Prueba con una foto o captura más pequeña.');
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    return window.createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadImg(file));
  }
  return loadImg(file);
}
function loadImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

/** Foto (File) → base64 de un JPEG que cabe en maxChars (por defecto 44,000). */
async function shrinkImage(file, maxChars) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Elige una imagen (foto o captura de pantalla).');
  const bmp = await loadBitmap(file);
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  return fitJpeg((dim, q) => {
    const s = Math.min(1, dim / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; // los PNG con transparencia no deben quedar negros
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', q);
    return url.slice(url.indexOf(',') + 1);
  }, maxChars || 44000);
}
