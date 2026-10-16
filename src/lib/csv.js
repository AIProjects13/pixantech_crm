const Csv = {
  MAX_BYTES: 2 * 1024 * 1024,
  MAX_ROWS: 1000,
  TEMPLATE_HEAD: 'nombre,rubro,pais,region,direccion,telefono,email,web,contacto,colores,redes,fuente,notas',
  // Encabezados aceptados (sin tildes, en minúsculas) → campo del CRM. Cualquier otra columna se guarda como dato adicional en la bitácora.
  ALIASES: {
    nombre: ['nombre', 'name', 'empresa', 'razon_social', 'negocio', 'colegio', 'institucion', 'establecimiento'],
    rubro: ['rubro', 'giro', 'categoria', 'tipo_de_negocio', 'industria', 'sector'],
    pais: ['pais', 'country'],
    region: ['region', 'zona', 'municipio', 'departamento', 'provincia'],
    telefono: ['telefono', 'telefonos', 'tel', 'phone', 'celular', 'movil', 'whatsapp'],
    email: ['email', 'correo', 'e_mail', 'correo_electronico', 'mail', 'email_contacto'],
    web: ['web', 'sitio_web', 'website', 'sitio', 'url', 'pagina_web', 'pagina'],
    contacto: ['contacto', 'contacto_principal', 'persona_de_contacto', 'responsable', 'encargado', 'director'],
    colores: ['colores', 'colores_marca', 'colores_de_marca', 'color'],
  },
  key(h) {
    return String(h == null ? '' : h).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  },
  canon(h) {
    const k = Csv.key(h);
    for (const c in Csv.ALIASES) if (Csv.ALIASES[c].indexOf(k) >= 0) return c;
    return '';
  },
  clean(v, max) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 300);
  },
  /** Texto CSV → matriz de celdas. Soporta comillas, "" escapadas, saltos de línea dentro de comillas y los delimitadores , ; y tabulador. */
  parse(text) {
    const s = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    const head = s.split(/\r\n|\n|\r/, 1)[0] || '';
    const n = (ch) => head.split(ch).length - 1;
    const delim = n(';') > n(',') && n(';') >= n('\t') ? ';' : n('\t') > n(',') ? '\t' : ',';
    const rows = [];
    let row = [];
    let f = '';
    let q = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) {
        if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
      } else if (ch === '"' && f === '') {
        q = true;
      } else if (ch === delim) {
        row.push(f); f = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && s[i + 1] === '\n') i++;
        row.push(f); f = '';
        if (row.some((c) => c.trim() !== '')) rows.push(row);
        row = [];
      } else {
        f += ch;
      }
    }
    row.push(f);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    return { rows: rows, open: q };
  },
  /** Texto CSV → filas listas para mostrar/importar. */
  toRows(text) {
    const p = Csv.parse(text);
    if (p.rows.length < 2) return { rows: [], extraLabels: [], error: 'El archivo no tiene filas de datos (está vacío o solo trae el encabezado).' };
    const header = p.rows[0];
    const col = {};
    const extraCols = [];
    header.forEach((h, i) => {
      const k = Csv.canon(h);
      if (k && !(k in col)) col[k] = i;
      else if (Csv.clean(h)) extraCols.push(i);
    });
    if (!('nombre' in col)) return { rows: [], extraLabels: [], error: 'No encontré la columna "nombre" en la primera fila. Descarga la plantilla para ver el formato.' };
    const labels = extraCols.map((i) => Csv.clean(header[i], 40));
    const body = p.rows.slice(1);
    const rows = body.slice(0, Csv.MAX_ROWS).map((cells, n) => {
      const get = (k, max) => (k in col ? Csv.clean(cells[col[k]], max) : '');
      const extras = [];
      const mails = (get('email', 500).match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/g) || []).map((m) => m.toLowerCase());
      if (mails.length > 1) extras.push(['Otros correos', mails.slice(1, 4).join(', ')]);
      extraCols.forEach((i, j) => {
        const v = Csv.clean(cells[i], 300);
        if (labels[j] && v) extras.push([labels[j], v]);
      });
      return {
        _k: n, linea: n + 2,
        nombre: get('nombre', 150), rubro: get('rubro', 100), pais: get('pais', 80), region: get('region', 100),
        telefono: get('telefono', 60), email: mails[0] || '', web: get('web', 500), contacto: get('contacto', 150), colores: get('colores', 200),
        extras: extras.slice(0, 15),
      };
    });
    return { rows: rows, extraLabels: labels.filter(Boolean), truncated: body.length > Csv.MAX_ROWS, open: p.open, error: '' };
  },
};

export { Csv };

/** ArrayBuffer → texto. UTF-8 estricto; si falla, Windows-1252 (Excel en español guarda en ANSI). */
export function decodeFile(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch (e) {
    return new TextDecoder("windows-1252").decode(buf);
  }
}
