# Pixantech CRM — Backend (Google Apps Script)

## 1. Instalar el script en la hoja
1. Abre la hoja: https://docs.google.com/spreadsheets/d/1LCnh-XaZOeXGQKKKTcYff7DbfdXyFqk66uHCkUOru4Y
2. **Extensiones → Apps Script**.
3. ⚙️ **Configuración del proyecto** → activa *"Mostrar el archivo de manifiesto appsscript.json"*.
4. Pega `Code.gs` y `appsscript.json` (reemplaza su contenido).
5. Guarda y **recarga la hoja**. Aparece el menú **⚡ Pixantech CRM**.

## 2. Setup
**⚡ Pixantech CRM → 🛠️ Setup / Reparar estructura** (la primera vez pide autorizar permisos).

Crea o repara (sin borrar datos):

| Hoja | Uso |
|---|---|
| Leads | Prospectos + pipeline + bitácora JSON + asignación |
| Clientes | Post-venta (se crea al pasar un lead a "Ganado") |
| Usuarios | **Lista blanca**: Email, Nombre, **Nivel**, Activo, UID_Firebase… |
| Niveles | Niveles y sus permisos (casillas). Puedes crear niveles nuevos |
| Plantillas | Correos HTML con `{{nombre}}`, `{{rubro}}`, `{{contacto}}`… |
| Config | Ajustes no sensibles (código de país, remitente, reply-to) |
| Auditoria | Registro de acciones sensibles |

Además: validaciones (desplegables, casillas), formatos, **protección de todas las hojas (solo el propietario)** y te pide registrar el **primer administrador** (se crea su cuenta en Firebase y le llega un correo para definir su contraseña).

Luego: **🩺 Diagnóstico**. Si venías de la versión con búsqueda por IA, Setup también borra las API keys guardadas, las filas de IA en Config y la columna `ia_prospectar` de Niveles.

## 2b. Prospección con cualquier IA (CSV)
La app ya no llama a ninguna IA. Para conseguir prospectos usa [prospeccion/PROSPECCION.md](prospeccion/PROSPECCION.md) en Claude, ChatGPT, Gemini, Perplexity, etc.: te devuelve un CSV que cargas en **Importar CSV**. La app marca duplicados (contra la base y dentro del mismo archivo) y **tú eliges** qué filas importar.

## 3. Firebase (consola)
- **Authentication → Sign-in method → Correo electrónico/contraseña: habilitado.**
- **Authentication → Settings → Authorized domains**: agrega `script.google.com` y `googleusercontent.com`.
- Google Cloud → *APIs y servicios → Credenciales* → la API key web: restringe **por API** (Identity Toolkit API, Token Service API). No la restrinjas por referente HTTP: el backend la usa desde los servidores de Google.

## 4. Desplegar como Web App
**Implementar → Nueva implementación → Aplicación web**
- Ejecutar como: **Yo** (propietario)
- Quién tiene acceso: **Cualquier usuario** (la seguridad la hace Firebase + hoja Usuarios)

## 5. Modelo de seguridad
1. El frontend inicia sesión con Firebase y envía el **ID Token** en cada llamada.
2. El backend verifica: estructura JWT, `aud`/`iss` del proyecto `personal-32795`, expiración, y valida el token **con Google** (firma, cuenta existente, no deshabilitada, no revocada).
3. Autoriza contra **Usuarios**: el email debe existir, estar *Activo* y su **UID de Firebase debe coincidir** (un email recreado por otra persona no hereda el acceso).
4. Permisos por **Nivel** (hoja Niveles). **Solo `Admin`** crea/edita/elimina perfiles (incluidos otros Admin) y cambia la configuración. No se puede quitar al último Admin activo.
5. Rate limiting por usuario, LockService en escrituras, anti-inyección de fórmulas; la app no guarda ni usa API keys de terceros.
6. Las funciones internas terminan en `_` → no se pueden invocar desde el navegador. Las del menú exigen ser el propietario dentro de la hoja.

> ⚠️ Quien tenga permiso de **edición** sobre la hoja puede editar el script. Comparte la hoja solo con el propietario; los demás usan la app web.

## 6. API (para el frontend)
`google.script.run.api({ action, token, payload })` o `fetch(URL_WEBAPP, { method:'POST', body: JSON.stringify({action, token, payload}) })` (sin cabecera Content-Type → text/plain, evita CORS).

Respuesta: `{ ok: true, data, ms }` o `{ ok: false, error: { code, message } }`.

| Acción | Permiso | Payload |
|---|---|---|
| `auth.bootstrap` | — | — (devuelve usuario, permisos, leads, clientes, plantillas en 1 llamada) |
| `leads.list` / `leads.get` | — | `{id}` en get (incluye bitácora) |
| `leads.create` | leads_crear | `{nombre, rubro, pais, region, telefono, web, colores, contacto, email, fechaContacto, asignadoA?}` |
| `leads.update` | leads_editar | `{id, fields:{…, estado?, asignadoA?}}` |
| `leads.move` | leads_editar | `{id, estado}` → "Ganado" crea el cliente |
| `leads.addNote` | leads_editar | `{id, texto, fechaContacto?}` |
| `leads.delete` | leads_eliminar | `{id}` |
| `leads.import` | leads_crear | `{items:[…], autoEmail, plantillaId?, rubro, pais, region, extras?, origen:'csv'}` |
| `leads.sendEmail` | correo_enviar | `{id, plantillaId?}` |
| `clientes.list` / `clientes.update` | clientes_ver / clientes_editar | `{idLead, montoAnual?, estadoPago?, linkPlataforma?}` |
| `plantillas.list` / `plantillas.save` | — / plantillas_editar | `{id?, nombre, asunto, cuerpoHtml, activa}` |
| `niveles.list` | — | — |
| `config.get` / `config.save` | Admin | `{valores?:{CLAVE:valor}}` |
| `users.list` / `users.create` / `users.update` / `users.delete` / `users.resetPassword` | Admin | `{email, nombre, nivel, activo?, desvincularUid?}` |

Códigos de error: `UNAUTHENTICATED`, `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `VALIDATION`, `DUPLICATE`, `NOT_FOUND`, `RATE_LIMITED`, `BUSY`, `CONFIG`, `QUOTA`, `NOT_SETUP`, `INTERNAL`.
