/**
 * GESTOR DE DOCUMENTOS - Google Apps Script  (v3)
 * ------------------------------------------------
 * Backend completo: autenticación por cédula/código, almacenamiento de
 * archivos en Drive, base de datos en una Hoja de Cálculo, contratos,
 * flujo de revisión (aprobar / rechazar con observación), fechas límite,
 * cierre de mes, avisos a las unidades, papelera reversible, bitácora de
 * auditoría, paneles de seguimiento y caché de lecturas.
 *
 * IMPORTANTE: antes de usar la app, ejecuta la función setup() UNA VEZ
 * desde el editor de Apps Script (menú "Ejecutar" > selecciona "setup").
 * Si ya tenías la app funcionando y solo actualizaste el código, vuelve a
 * ejecutar setup(): es segura de repetir, solo agrega lo que falte (hojas y
 * columnas nuevas) sin borrar nada de lo que ya tenías. Si se te olvida,
 * la app también lo hace sola la primera vez que se abre una página.
 */

// ---------------------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ---------------------------------------------------------------------
const MAX_FILE_BYTES = 25 * 1024 * 1024;   // 25 MB por archivo
const SESSION_SECONDS = 6 * 60 * 60;       // 6 horas (máximo de CacheService)
const VIEWAS_SECONDS = 60 * 60;            // "Ver como unidad": 1 hora, solo lectura
const UPLOADS_LOG_LIMIT = 1500;            // tope de filas del historial de cargues
const AUDIT_WINDOW = 4000;                 // filas recientes que se leen de la bitácora
const AUDIT_LIMIT = 600;                   // filas máximas que devuelve la bitácora
const AUDIT_ARCHIVE_PREFIX = 'Auditoria_'; // hojas de archivo mensual: Auditoria_AAAA-MM
const USE_TABLE_CACHE = true;              // caché de lecturas de hojas (poner false para desactivar)
const CACHE_TTL = 900;                     // 15 min: tope de "antigüedad" si se edita la hoja a mano
const CACHE_CHUNK = 90000;                 // CacheService guarda ~100 KB por clave
const CACHE_MAX_CHUNKS = 40;
const AUTO_NOMBRE_ARCHIVOS = true;         // nombra los archivos como unidad_tema_fecha
const AVISOS_KEEP = 10;                    // notificaciones que se conservan por unidad (leídas + sin leer)
const TRASH_DAYS = 30;                     // días en papelera antes de purgar (purgarPapelera)
const SCHEMA_VERSION = '6';                // sube este número si agregas columnas nuevas
// Formatos: se acepta CUALQUIER extensión (letras/números, hasta 10 caracteres). Cada tema puede restringirlos con su lista «extensiones».
function cleanExt_(e) {
  e = String(e || '').toLowerCase().replace(/^\./, '').trim();
  return /^[a-z0-9]{1,10}$/.test(e) ? e : '';
}

const SHEET_NAMES = {
  USUARIOS: 'Usuarios',
  MESES: 'Meses',
  TEMAS: 'Temas',
  UPLOADS: 'Uploads',
  CONTRATOS: 'Contratos',
  NOAPLICA: 'NoAplica',
  AUDITORIA: 'Auditoria',
  AVISOS: 'Avisos'
};

const DEL_COLS = ['eliminado', 'eliminadoAt', 'eliminadoPor', 'eliminadoLote'];
const SCHEMAS = {
  Usuarios: ['id', 'cedula', 'codigoHash', 'codigoPlano', 'nombreUnidad', 'contratoId', 'createdAt', 'nombres', 'apellidos'],
  Meses: ['id', 'nombre', 'activo', 'createdAt', 'fechaLimite', 'cerrado', 'cerradoAt', 'cerradoPor'].concat(DEL_COLS),
  Temas: ['id', 'monthId', 'nombre', 'orden', 'obligatorio', 'fechaLimite', 'extensiones', 'contratoIds'].concat(DEL_COLS),
  Uploads: ['id', 'userId', 'topicId', 'monthId', 'driveFileId', 'originalName', 'mimeType', 'size', 'uploadedAt',
    'nombreCargado', 'estado', 'observacion', 'revisadoPor', 'revisadoAt', 'tardio', 'ocultoHistorial', 'reemplazadoAt', 'reemplazadoPor'].concat(DEL_COLS),
  Contratos: ['id', 'nombre', 'activo', 'createdAt'],
  NoAplica: ['id', 'userId', 'topicId', 'monthId', 'marcadoAt', 'marcadoPor'],
  Auditoria: ['id', 'fecha', 'actorTipo', 'actor', 'accion', 'detalle', 'monthId', 'userId'],
  Avisos: ['id', 'userId', 'monthId', 'mensaje', 'tipo', 'creadoAt', 'creadoPor', 'leidoAt', 'perfil', 'observacion', 'archivo', 'tema', 'mesNombre']
};
// Columnas que deben guardarse como TEXTO (para que Sheets no convierta "2026-10-15" en fecha)
const TEXT_FIELDS = { fechaLimite: true };
// Hojas que se leen con caché (la bitácora no: solo se escribe y se lee su cola)
const CACHED_SHEETS = { Usuarios: 1, Meses: 1, Temas: 1, Uploads: 1, Contratos: 1, NoAplica: 1, Avisos: 1 };

// Memoria por ejecución (cada llamada del navegador es una ejecución nueva)
let MEMO_ = {};

// ---------------------------------------------------------------------
// SETUP INICIAL (ejecutar una sola vez manualmente; repetible sin riesgo)
// ---------------------------------------------------------------------
function setup() {
  const props = PropertiesService.getScriptProperties();

  // 1) Crear (o reutilizar) la hoja de cálculo que actúa como base de datos
  let ssId = props.getProperty('SHEET_ID');
  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('GestorDocumentos_BaseDeDatos');
    props.setProperty('SHEET_ID', ss.getId());
  }
  ensureSchema_(ss);

  // Elimina la hoja "Hoja 1" por defecto si quedó vacía y sin usar
  const defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // 2) Crear (o reutilizar) la carpeta raíz en Drive
  let rootFolderId = props.getProperty('ROOT_FOLDER_ID');
  if (!rootFolderId) {
    const folder = DriveApp.createFolder('GestorDocumentos_Archivos');
    rootFolderId = folder.getId();
    props.setProperty('ROOT_FOLDER_ID', rootFolderId);
  }

  // 3) Crear credenciales de administrador por defecto (si no existen)
  if (!props.getProperty('ADMIN_USUARIO')) {
    const salt = Utilities.getUuid();
    props.setProperty('ADMIN_USUARIO', 'admin');
    props.setProperty('ADMIN_SALT', salt);
    props.setProperty('ADMIN_HASH', sha256_('admin123', salt));
  }

  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  clearAllCaches_();

  Logger.log('Setup completo.');
  Logger.log('Hoja de datos: ' + ss.getUrl());
  Logger.log('Carpeta raíz en Drive: https://drive.google.com/drive/folders/' + rootFolderId);
  Logger.log('Usuario admin por defecto -> usuario: admin / contraseña: admin123 (cámbiala luego desde el panel).');
}

function ensureSchema_(ss) {
  ss = ss || getSS_();
  Object.keys(SCHEMAS).forEach(function (name) { ensureSheetWithHeaders_(ss, name, SCHEMAS[name]); });
  // Columnas de fecha límite como texto plano
  ['Meses', 'Temas'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    const headers = getHeaders_(sheet);
    const col = headers.indexOf('fechaLimite') + 1;
    if (col > 0) { try { sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@'); } catch (e) {} }
  });
}

// Si el código se actualizó pero no se volvió a ejecutar setup(), lo hace solo (una vez por versión).
function ensureSchemaOnce_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID')) return;
  if (props.getProperty('SCHEMA_VERSION') === SCHEMA_VERSION) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (props.getProperty('SCHEMA_VERSION') === SCHEMA_VERSION) return;
    ensureSchema_(SpreadsheetApp.openById(props.getProperty('SHEET_ID')));
    props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
    clearAllCaches_();
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
// UTILIDADES DE HOJA DE CÁLCULO
// ---------------------------------------------------------------------
// Crea la hoja si no existe. Si ya existe, agrega al final cualquier
// encabezado que falte SIN tocar ni reordenar las columnas existentes.
function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(function (h) { return h !== ''; });
  const missing = headers.filter(function (h) { return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function getSS_() {
  if (MEMO_.ss) return MEMO_.ss;
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('La app no ha sido configurada. Ejecuta la función setup() primero.');
  MEMO_.ss = SpreadsheetApp.openById(id);
  return MEMO_.ss;
}

function getSheet_(name) {
  MEMO_.sheets = MEMO_.sheets || {};
  if (MEMO_.sheets[name]) return MEMO_.sheets[name];
  let sheet = getSS_().getSheetByName(name);
  if (!sheet && SCHEMAS[name]) sheet = ensureSheetWithHeaders_(getSS_(), name, SCHEMAS[name]);
  if (!sheet) throw new Error('Falta la hoja "' + name + '". Vuelve a ejecutar setup() desde el editor.');
  MEMO_.sheets[name] = sheet;
  return sheet;
}

function getHeaders_(sheet) {
  MEMO_.headers = MEMO_.headers || {};
  const key = sheet.getName();
  if (MEMO_.headers[key]) return MEMO_.headers[key];
  const lastCol = sheet.getLastColumn();
  const h = lastCol < 1 ? [] : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  MEMO_.headers[key] = h;
  return h;
}

// Lee la hoja completa como lista de objetos (con __row = fila real en la hoja).
function readSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue; // ignora filas vacías (sin id)
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let v = row[j];
      if (v instanceof Date) v = TEXT_FIELDS[headers[j]] ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : v.toISOString();
      obj[headers[j]] = v;
    }
    obj.__row = i + 1;
    out.push(obj);
  }
  return out;
}

// ---- Caché de tablas (CacheService, comprimido y troceado) ----
function tableVersion_(name) {
  const cache = CacheService.getScriptCache();
  let v = cache.get('ver:' + name);
  if (!v) { v = Utilities.getUuid().slice(0, 8); cache.put('ver:' + name, v, CACHE_TTL); }
  return v;
}

function invalidate_(name) {
  if (MEMO_.tables) delete MEMO_.tables[name];
  if (!USE_TABLE_CACHE) return;
  try { CacheService.getScriptCache().put('ver:' + name, Utilities.getUuid().slice(0, 8), CACHE_TTL); } catch (e) {}
}

function clearAllCaches_() {
  MEMO_ = {};
  if (!USE_TABLE_CACHE) return;
  Object.keys(CACHED_SHEETS).forEach(function (n) { invalidate_(n); });
}

function cachePutTable_(name, ver, data) {
  const json = JSON.stringify(data);
  const gz = Utilities.gzip(Utilities.newBlob(json, 'application/json', 't.json'));
  const b64 = Utilities.base64Encode(gz.getBytes());
  const chunks = Math.ceil(b64.length / CACHE_CHUNK);
  if (chunks > CACHE_MAX_CHUNKS) return;
  const entries = {};
  for (let i = 0; i < chunks; i++) entries['tbl:' + name + ':' + ver + ':' + i] = b64.substr(i * CACHE_CHUNK, CACHE_CHUNK);
  entries['tbl:' + name + ':' + ver + ':n'] = String(chunks);
  CacheService.getScriptCache().putAll(entries, CACHE_TTL);
}

function cacheGetTable_(name, ver) {
  const cache = CacheService.getScriptCache();
  const n = parseInt(cache.get('tbl:' + name + ':' + ver + ':n'), 10);
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push('tbl:' + name + ':' + ver + ':' + i);
  const got = cache.getAll(keys);
  let b64 = '';
  for (let i = 0; i < n; i++) {
    const part = got[keys[i]];
    if (part === undefined || part === null) return null;
    b64 += part;
  }
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip', 't.gz');
  return JSON.parse(Utilities.ungzip(blob).getDataAsString());
}

// Todas las filas de una hoja (incluye las de la papelera). No modificar los objetos devueltos.
function rowsAll_(name) {
  MEMO_.tables = MEMO_.tables || {};
  if (MEMO_.tables[name]) return MEMO_.tables[name];
  let data = null, ver = null;
  const cacheable = USE_TABLE_CACHE && CACHED_SHEETS[name] && !MEMO_.fresh;
  if (cacheable) {
    try { ver = tableVersion_(name); data = cacheGetTable_(name, ver); } catch (e) { data = null; }
  }
  if (!data) {
    data = readSheetObjects_(getSheet_(name));
    if (cacheable && ver) { try { cachePutTable_(name, ver, data); } catch (e) {} }
  }
  MEMO_.tables[name] = data;
  return data;
}

// Filas "vivas": las que no están en la papelera.
function rows_(name) {
  return rowsAll_(name).filter(function (o) { return !truthy_(o.eliminado); });
}

// Compatibilidad: lee (con caché) una hoja recibida como objeto.
function sheetToObjects_(sheet) { return rows_(sheet.getName()); }

// Escribe una fila nueva respetando el orden REAL de columnas de la hoja.
function appendRow_(sheet, obj) {
  const headers = getHeaders_(sheet);
  const row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  const needsText = headers.some(function (h, i) { return TEXT_FIELDS[h] && row[i] !== ''; });
  if (!needsText) {
    sheet.appendRow(row);
  } else {
    const r = sheet.getLastRow() + 1;
    headers.forEach(function (h, i) { if (TEXT_FIELDS[h]) sheet.getRange(r, i + 1).setNumberFormat('@'); });
    sheet.getRange(r, 1, 1, headers.length).setValues([row]);
  }
  invalidate_(sheet.getName());
}

// Varias filas nuevas de una sola vez (mucho más rápido que una por una).
function appendRows_(sheet, objs) {
  if (!objs.length) return;
  const headers = getHeaders_(sheet);
  const rows = objs.map(function (o) { return headers.map(function (h) { return o[h] !== undefined ? o[h] : ''; }); });
  const start = sheet.getLastRow() + 1;
  headers.forEach(function (h, i) { if (TEXT_FIELDS[h]) sheet.getRange(start, i + 1, rows.length, 1).setNumberFormat('@'); });
  sheet.getRange(start, 1, rows.length, headers.length).setValues(rows);
  invalidate_(sheet.getName());
}

function updateCell_(sheet, rowNumber, field, value) {
  const headers = getHeaders_(sheet);
  const col = headers.indexOf(field) + 1;
  if (col === 0) throw new Error('Columna no encontrada: ' + field);
  const rg = sheet.getRange(rowNumber, col);
  if (TEXT_FIELDS[field]) rg.setNumberFormat('@');
  rg.setValue(value);
  invalidate_(sheet.getName());
}

// Cambia varios campos de UNA fila.
function updateRow_(sheet, rowNumber, fields) {
  const headers = getHeaders_(sheet);
  const rg = sheet.getRange(rowNumber, 1, 1, headers.length);
  const vals = rg.getValues();
  Object.keys(fields).forEach(function (f) {
    const col = headers.indexOf(f);
    if (col === -1) throw new Error('Columna no encontrada: ' + f);
    if (TEXT_FIELDS[f]) sheet.getRange(rowNumber, col + 1).setNumberFormat('@');
    vals[0][col] = fields[f];
  });
  rg.setValues(vals);
  invalidate_(sheet.getName());
}

// Cambia campos de MUCHAS filas con pocas llamadas (una lectura y una escritura por columna).
// updates = { numeroDeFila: { campo: valor, ... }, ... }
function bulkUpdateRows_(sheet, updates) {
  const rowNums = Object.keys(updates).map(Number);
  if (!rowNums.length) return;
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const fields = {};
  rowNums.forEach(function (r) { Object.keys(updates[r]).forEach(function (f) { fields[f] = true; }); });
  Object.keys(fields).forEach(function (f) {
    const col = headers.indexOf(f) + 1;
    if (!col) throw new Error('Columna no encontrada: ' + f);
    const rg = sheet.getRange(2, col, lastRow - 1, 1);
    const vals = rg.getValues();
    rowNums.forEach(function (r) {
      if (Object.prototype.hasOwnProperty.call(updates[r], f) && r >= 2 && r <= lastRow) vals[r - 2][0] = updates[r][f];
    });
    if (TEXT_FIELDS[f]) rg.setNumberFormat('@');
    rg.setValues(vals);
  });
  invalidate_(sheet.getName());
}

function deleteRow_(sheet, rowNumber) {
  sheet.deleteRow(rowNumber);
  invalidate_(sheet.getName());
}

// Borra varias filas (de abajo hacia arriba; agrupa las filas consecutivas para hacer menos llamadas).
function deleteRows_(sheet, rowNumbers) {
  if (!rowNumbers.length) return;
  const desc = rowNumbers.slice().sort(function (a, b) { return b - a; });
  let i = 0;
  while (i < desc.length) {
    let j = i;
    while (j + 1 < desc.length && desc[j + 1] === desc[j] - 1) j++;
    sheet.deleteRows(desc[j], j - i + 1);
    i = j + 1;
  }
  invalidate_(sheet.getName());
}

// Ejecuta fn con el candado del script. Dentro del candado TODAS las lecturas van directo a la hoja
// (sin caché), para que los números de fila que se usan al escribir siempre sean los reales.
function withLock_(fn, ms) {
  const lock = LockService.getScriptLock();
  lock.waitLock(ms || 20000);
  MEMO_.tables = {};
  MEMO_.fresh = true;
  try { return fn(); } finally { MEMO_.fresh = false; MEMO_.tables = {}; lock.releaseLock(); }
}

// ---------------------------------------------------------------------
// UTILIDADES GENERALES
// ---------------------------------------------------------------------
function tz_() { return Session.getScriptTimeZone() || 'America/Bogota'; }

function truthy_(v) { return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1'; }
// Booleano con valor por defecto cuando la celda está vacía (datos anteriores a la actualización)
function bool_(v, def) { return (v === '' || v === undefined || v === null) ? !!def : truthy_(v); }
function isActive_(v) { return !(v === false || v === 'FALSE' || v === 'false'); }

function csv_(v) {
  return String(v === undefined || v === null ? '' : v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function nowIso_() { return new Date().toISOString(); }
function todayStr_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function dayOf_(iso) { return iso ? Utilities.formatDate(new Date(iso), tz_(), 'yyyy-MM-dd') : ''; }

// Normaliza a 'yyyy-MM-dd' (acepta Date, texto ISO o vacío)
function normDate_(v) {
  if (v === undefined || v === null || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}

function dateToUtc_(s) {
  const p = String(s).split('-');
  return Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}
function daysBetween_(fromStr, toStr) { return Math.round((dateToUtc_(toStr) - dateToUtc_(fromStr)) / 86400000); }
function addDays_(dateStr, n) {
  const d = new Date(dateToUtc_(dateStr) + n * 86400000);
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}
function fmtDay_(s) {
  if (!s) return '';
  const p = String(s).split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return parseInt(p[2], 10) + ' de ' + meses[parseInt(p[1], 10) - 1];
}

function slug_(s, max) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 40);
}

function mapBy_(list, key) {
  const m = {};
  list.forEach(function (o) { m[o[key]] = o; });
  return m;
}

// ---------------------------------------------------------------------
// HASHING DE CONTRASEÑAS (SHA-256 con sal, Apps Script no trae bcrypt)
// ---------------------------------------------------------------------
function sha256_(text, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + text);
  return bytes.map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

// ---------------------------------------------------------------------
// SESIONES (CacheService: token temporal en vez de cookies)
// ---------------------------------------------------------------------
function createSession_(prefix, payload, ttl) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(prefix + token, JSON.stringify(payload), ttl || SESSION_SECONDS);
  return token;
}

function readSession_(prefix, token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get(prefix + token);
  return raw ? JSON.parse(raw) : null;
}

function destroySession_(prefix, token) {
  if (token) CacheService.getScriptCache().remove(prefix + token);
}

// forWrite = true: rechaza las sesiones de "Ver como unidad" (solo lectura)
function requireUserSession_(token, forWrite) {
  const session = readSession_('user_', token);
  if (!session) throw new Error('Sesión no válida o expirada. Vuelve a iniciar sesión.');
  if (forWrite && session.viewAs) throw new Error('Estás viendo como la unidad (solo lectura): no se puede modificar nada desde esta vista.');
  return session;
}

function requireAdminSession_(token) {
  const session = readSession_('admin_', token);
  if (!session) throw new Error('Sesión de administrador no válida o expirada.');
  return session;
}

// ---------------------------------------------------------------------
// BITÁCORA DE AUDITORÍA (nunca debe romper la operación principal)
// ---------------------------------------------------------------------
function auditRow_(actorTipo, actor, accion, detalle, monthId, userId) {
  return [Utilities.getUuid(), nowIso_(), actorTipo, actor, accion, String(detalle || '').slice(0, 480), monthId || '', userId || ''];
}

function audit_(actorTipo, actor, accion, detalle, monthId, userId) {
  try { getSheet_(SHEET_NAMES.AUDITORIA).appendRow(auditRow_(actorTipo, actor, accion, detalle, monthId, userId)); } catch (e) {}
}

// Varias entradas en una sola escritura
function auditMany_(entries) {
  try {
    if (!entries.length) return;
    const sheet = getSheet_(SHEET_NAMES.AUDITORIA);
    const rows = entries.map(function (e) { return auditRow_(e.tipo, e.actor, e.accion, e.detalle, e.monthId, e.userId); });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  } catch (e) {}
}

function adminActor_(session) { return session && session.usuario ? session.usuario : 'admin'; }

// ---------------------------------------------------------------------
// WEB APP - ENRUTAMIENTO DE PÁGINAS
// ---------------------------------------------------------------------
function doGet(e) {
  try { ensureSchemaOnce_(); } catch (err) { /* si falla, igual responde */ }
  const page = (e && e.parameter && e.parameter.page) || '';
  // Modo clásico (opcional): si todavía tienes los .html dentro del proyecto, siguen funcionando.
  const map = { 'login': 'Login', 'register': 'Register', 'dashboard': 'Dashboard', 'admin-login': 'AdminLogin', 'admin': 'Admin' };
  if (page && map[page]) {
    try {
      const tmpl = HtmlService.createTemplateFromFile(map[page]);
      tmpl.baseUrl = ScriptApp.getService().getUrl();
      tmpl.viewToken = (page === 'dashboard' && e.parameter.vt) ? String(e.parameter.vt) : '';
      return tmpl.evaluate()
        .setTitle('Gestor de Documentos')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) { /* sin plantillas: cae al ping */ }
  }
  return jsonOut_({ ok: true, service: 'Gestor de Documentos API', schema: SCHEMA_VERSION });
}

// API para el frontend alojado fuera de Apps Script.
// Recibe { fn: 'apiLogin', args: [...] } y ejecuta SOLO funciones públicas api*.
function doPost(e) {
  let out;
  try {
    try { ensureSchemaOnce_(); } catch (err) { /* no bloquear */ }
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = String(req.fn || '');
    if (!/^api[A-Za-z0-9]+$/.test(fn) || typeof globalThis[fn] !== 'function') {
      throw new Error('Función no permitida.');
    }
    const args = Array.isArray(req.args) ? req.args : [];
    const result = globalThis[fn].apply(null, args);
    out = { ok: true, result: result === undefined ? null : result };
  } catch (err) {
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
  }
  return jsonOut_(out);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------------------------------------------------------------------
// CONTRATOS (público: para el selector en Registro)
// ---------------------------------------------------------------------
function apiGetContratosPublic() {
  return rows_(SHEET_NAMES.CONTRATOS)
    .filter(function (c) { return isActive_(c.activo); })
    .map(function (c) { return { id: c.id, nombre: c.nombre }; })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre)); });
}

// ---------------------------------------------------------------------
// AUTENTICACIÓN - USUARIOS
// ---------------------------------------------------------------------
// Limpia un nombre de persona: quita espacios repetidos y valida el largo.
function cleanPerson_(v, msgVacio) {
  v = String(v || '').replace(/\s+/g, ' ').trim();
  if (v.length < 2) throw new Error(msgVacio);
  if (v.length > 80) throw new Error('El texto es demasiado largo (máximo 80 caracteres).');
  return v;
}

function fullName_(u) {
  return [u && u.nombres, u && u.apellidos].filter(function (x) { return x; }).join(' ').trim();
}

function userPayload_(u) {
  return { id: u.id, cedula: u.cedula, nombreUnidad: u.nombreUnidad, nombres: u.nombres || '', apellidos: u.apellidos || '', nombreCompleto: fullName_(u) };
}

function apiRegister(cedula, codigoUnidad, nombreUnidad, contratoId, nombres, apellidos) {
  cedula = String(cedula || '').trim();
  codigoUnidad = String(codigoUnidad || '').trim();
  nombreUnidad = String(nombreUnidad || '').trim();
  contratoId = String(contratoId || '').trim();
  nombres = cleanPerson_(nombres, 'Escribe tus nombres.');
  apellidos = cleanPerson_(apellidos, 'Escribe tus apellidos.');

  if (cedula.length < 4) throw new Error('La cédula no es válida.');
  if (codigoUnidad.length < 3) throw new Error('El código de unidad de servicio debe tener al menos 3 caracteres.');
  if (!nombreUnidad) throw new Error('El nombre de la unidad de servicio es obligatorio.');

  const contratos = rows_(SHEET_NAMES.CONTRATOS);
  if (contratos.length && !contratoId) {
    throw new Error('Selecciona el contrato al que pertenece tu unidad de servicio.');
  }
  if (contratoId && !contratos.some(function (c) { return c.id === contratoId; })) {
    throw new Error('El contrato seleccionado no es válido.');
  }

  return withLock_(function () {
    MEMO_.tables = {}; // lectura fresca dentro del candado
    const sheet = getSheet_(SHEET_NAMES.USUARIOS);
    const users = readSheetObjects_(sheet);
    if (users.some(function (u) { return String(u.cedula) === cedula; })) {
      throw new Error('Ya existe un usuario registrado con esa cédula.');
    }
    const salt = Utilities.getUuid();
    const user = {
      id: Utilities.getUuid(),
      cedula: cedula,
      codigoHash: salt + '$' + sha256_(codigoUnidad, salt),
      codigoPlano: codigoUnidad,
      nombreUnidad: nombreUnidad,
      contratoId: contratoId || '',
      createdAt: nowIso_(),
      nombres: nombres,
      apellidos: apellidos
    };
    appendRow_(sheet, user);
    audit_('unidad', nombreUnidad, 'unidad_registrada', 'Se registró la unidad (CC ' + cedula + ') · Responsable: ' + nombres + ' ' + apellidos, '', user.id);
    const token = createSession_('user_', { userId: user.id });
    return { ok: true, token: token, user: userPayload_(user) };
  });
}

function apiLogin(cedula, codigoUnidad) {
  cedula = String(cedula || '').trim();
  codigoUnidad = String(codigoUnidad || '').trim();
  const users = rows_(SHEET_NAMES.USUARIOS);
  const user = users.find(function (u) { return String(u.cedula) === cedula; });
  if (!user) throw new Error('Cédula o código de unidad de servicio incorrectos.');
  const parts = String(user.codigoHash).split('$');
  if (sha256_(codigoUnidad, parts[0]) !== parts[1]) {
    throw new Error('Cédula o código de unidad de servicio incorrectos.');
  }
  const token = createSession_('user_', { userId: user.id });
  return { ok: true, token: token, user: userPayload_(user) };
}

function apiLogout(token) {
  destroySession_('user_', token);
  return { ok: true };
}

function apiMe(token) {
  const session = readSession_('user_', token);
  if (!session) return { authenticated: false };
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });
  if (!user) return { authenticated: false };
  return {
    authenticated: true,
    viewAs: !!session.viewAs,
    viewAsBy: session.by || '',
    user: userPayload_(user)
  };
}

// ---------------------------------------------------------------------
// AUTENTICACIÓN - ADMIN
// ---------------------------------------------------------------------
function apiAdminLogin(usuario, password) {
  const props = PropertiesService.getScriptProperties();
  const savedUser = props.getProperty('ADMIN_USUARIO');
  const salt = props.getProperty('ADMIN_SALT');
  const hash = props.getProperty('ADMIN_HASH');
  if (usuario !== savedUser || sha256_(password, salt) !== hash) {
    audit_('sistema', String(usuario || '').slice(0, 60), 'login_fallido', 'Intento de acceso al panel de administrador', '', '');
    throw new Error('Usuario o contraseña incorrectos.');
  }
  const token = createSession_('admin_', { usuario: usuario });
  audit_('admin', usuario, 'login_admin', 'Inició sesión en el panel', '', '');
  return { ok: true, token: token, usuario: usuario };
}

function apiAdminLogout(token) {
  destroySession_('admin_', token);
  return { ok: true };
}

function apiAdminMe(token) {
  const session = readSession_('admin_', token);
  if (!session) return { authenticated: false };
  return { authenticated: true, usuario: session.usuario };
}

function apiAdminChangeCredentials(token, nuevoUsuario, nuevaPassword) {
  const session = requireAdminSession_(token);
  nuevoUsuario = String(nuevoUsuario || '').trim();
  nuevaPassword = String(nuevaPassword || '');
  if (!nuevoUsuario || nuevaPassword.length < 6) {
    throw new Error('Usuario obligatorio y contraseña de al menos 6 caracteres.');
  }
  const props = PropertiesService.getScriptProperties();
  const salt = Utilities.getUuid();
  props.setProperty('ADMIN_USUARIO', nuevoUsuario);
  props.setProperty('ADMIN_SALT', salt);
  props.setProperty('ADMIN_HASH', sha256_(nuevaPassword, salt));
  audit_('admin', adminActor_(session), 'admin_credenciales', 'Cambió el usuario/contraseña del administrador', '', '');
  return { ok: true };
}

// ---------------------------------------------------------------------
// DRIVE - CARPETAS: RootFolder / Mes / Cedula - NombreUnidad / Tema
// ---------------------------------------------------------------------
function getOrCreateSubfolder_(parentFolder, name) {
  name = String(name).trim().replace(/[\\/:*?"<>|]/g, '-');
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function getUserTopicFolder_(monthNombre, cedula, nombreUnidad, temaNombre) {
  const rootId = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  const root = DriveApp.getFolderById(rootId);
  const monthFolder = getOrCreateSubfolder_(root, monthNombre);
  const userFolder = getOrCreateSubfolder_(monthFolder, cedula + ' - ' + nombreUnidad);
  return getOrCreateSubfolder_(userFolder, temaNombre);
}

// ---------------------------------------------------------------------
// MODELO DE ESTADO (lo comparten el panel de la unidad y el del administrador)
// ---------------------------------------------------------------------
// Estados de un tema para una unidad:
//   aprobado  : tiene al menos un archivo aprobado y nada por revisar
//   pendiente : hay archivos por revisar
//   rechazado : solo tiene archivos rechazados
//   vacio     : sin archivos
//   noaplica  : la unidad (o el administrador) lo marcó como "No aplica"
//   excluido  : el tema no se exige al contrato de la unidad
// "vencido" es una marca aparte: tema exigible, vacío o rechazado, con la fecha límite ya pasada.
function fileInfo_(u) {
  return {
    id: u.id,
    originalName: u.originalName,
    nombreCargado: u.nombreCargado || '',
    mimeType: u.mimeType || '',
    size: u.size,
    uploadedAt: u.uploadedAt,
    estado: u.estado || 'pendiente',
    observacion: u.observacion || '',
    revisadoPor: u.revisadoPor || '',
    revisadoAt: u.revisadoAt || '',
    tardio: truthy_(u.tardio),
    reemplazadoAt: u.reemplazadoAt || '',
    reemplazadoPor: u.reemplazadoPor || ''
  };
}

// Contexto de un mes: temas, archivos y marcas "no aplica", ya agrupados.
function buildMonthCtx_(month, allTopics, allUploads, allNa) {
  const topics = allTopics.filter(function (t) { return t.monthId === month.id; })
    .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
  const byKey = {};
  allUploads.forEach(function (u) {
    if (u.monthId !== month.id) return;
    const key = u.userId + '::' + u.topicId;
    (byKey[key] = byKey[key] || []).push(u);
  });
  Object.keys(byKey).forEach(function (k) {
    byKey[k].sort(function (a, b) { return a.uploadedAt < b.uploadedAt ? -1 : (a.uploadedAt > b.uploadedAt ? 1 : 0); });
  });
  const na = {};
  allNa.forEach(function (n) { if (n.monthId === month.id) na[n.userId + '::' + n.topicId] = n; });
  return { month: month, topics: topics, byKey: byKey, na: na };
}

function monthCtx_(monthId) {
  const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
  if (!month) throw new Error('Mes no encontrado.');
  return buildMonthCtx_(month, rows_(SHEET_NAMES.TEMAS), rows_(SHEET_NAMES.UPLOADS), rows_(SHEET_NAMES.NOAPLICA));
}

function cellFor_(ctx, user, topic) {
  const key = user.id + '::' + topic.id;
  const files = (ctx.byKey[key] || []).map(fileInfo_);
  const naRow = ctx.na[key];
  const ids = csv_(topic.contratoIds);
  const aplica = !ids.length || files.length > 0 || (!!user.contratoId && ids.indexOf(user.contratoId) !== -1);
  const obligatorio = bool_(topic.obligatorio, true);
  const fechaLimite = normDate_(topic.fechaLimite) || normDate_(ctx.month.fechaLimite);

  let estado;
  if (!aplica) estado = 'excluido';
  else if (!files.length) estado = naRow ? 'noaplica' : 'vacio';
  else if (files.some(function (f) { return f.estado === 'pendiente'; })) estado = 'pendiente';
  else if (files.some(function (f) { return f.estado === 'aprobado'; })) estado = 'aprobado';
  else estado = 'rechazado';

  const hayAprobado = files.some(function (f) { return f.estado === 'aprobado'; });
  const cumple = aplica && (estado === 'noaplica' || hayAprobado);
  const vencido = aplica && obligatorio && (estado === 'vacio' || estado === 'rechazado') && !!fechaLimite && todayStr_() > fechaLimite;
  const rechazo = files.slice().reverse().find(function (f) { return f.estado === 'rechazado' && f.observacion; });

  return {
    topicId: topic.id,
    estado: estado,
    aplica: aplica,
    obligatorio: obligatorio,
    fechaLimite: fechaLimite,
    vencido: vencido,
    cumple: cumple,
    noAplica: estado === 'noaplica',
    marcadoAt: estado === 'noaplica' ? (naRow.marcadoAt || '') : '',
    marcadoPor: estado === 'noaplica' ? (naRow.marcadoPor || '') : '',
    observacion: rechazo ? rechazo.observacion : '',
    files: files
  };
}

function unitCells_(ctx, user) {
  return ctx.topics.map(function (t) { return cellFor_(ctx, user, t); });
}

// Resumen de avance: solo cuentan los temas exigibles (obligatorios y que aplican al contrato).
function summarize_(cells) {
  const ex = cells.filter(function (c) { return c.aplica && c.obligatorio; });
  const cnt = function (st) { return ex.filter(function (c) { return c.estado === st; }).length; };
  const resueltos = ex.filter(function (c) { return c.cumple; }).length;
  const total = ex.length;
  return {
    total: total,
    resueltos: resueltos,
    aprobados: cnt('aprobado'),
    pendientes: cnt('pendiente'),
    rechazados: cnt('rechazado'),
    vacios: cnt('vacio'),
    noAplica: cnt('noaplica'),
    vencidos: ex.filter(function (c) { return c.vencido; }).length,
    pct: total ? Math.round(resueltos / total * 100) : 0,
    completo: total > 0 && resueltos === total
  };
}

function lastUploadOf_(cells) {
  let last = '';
  cells.forEach(function (c) { c.files.forEach(function (f) { if (!last || f.uploadedAt > last) last = f.uploadedAt; }); });
  return last;
}

function assertMonthOpen_(month) {
  if (truthy_(month.cerrado)) {
    throw new Error('Este mes está cerrado y ya no admite cambios. Si necesitas cargar algo, pídele al administrador que lo reabra.');
  }
}

// ---------------------------------------------------------------------
// MESES Y TEMAS (lectura para unidades)
// ---------------------------------------------------------------------
function apiGetMonths(token) {
  requireUserSession_(token);
  const months = rows_(SHEET_NAMES.MESES).filter(function (m) { return isActive_(m.activo); });
  months.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return months.map(function (m) {
    return { id: m.id, nombre: m.nombre, cerrado: truthy_(m.cerrado), fechaLimite: normDate_(m.fechaLimite) };
  });
}

function apiGetTopics(token, monthId) {
  const session = requireUserSession_(token);
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });
  if (!user) throw new Error('Usuario no encontrado.');
  const ctx = monthCtx_(monthId);
  const today = todayStr_();

  const cells = unitCells_(ctx, user);
  const topics = [];
  ctx.topics.forEach(function (t, i) {
    const c = cells[i];
    if (!c.aplica) return; // el tema no se exige a este contrato: la unidad ni lo ve
    topics.push({
      id: t.id,
      nombre: t.nombre,
      orden: t.orden,
      files: c.files,
      estado: c.estado,
      noAplica: c.noAplica,
      noAplicaPorAdmin: c.noAplica && c.marcadoPor === 'admin',
      vacio: c.estado === 'vacio',
      obligatorio: c.obligatorio,
      fechaLimite: c.fechaLimite,
      diasRestantes: c.fechaLimite ? daysBetween_(today, c.fechaLimite) : null,
      vencido: c.vencido,
      observacion: c.observacion,
      extensiones: csv_(t.extensiones).map(function (e) { return e.toLowerCase(); })
    });
  });

  const resumen = summarize_(cells.filter(function (c) { return c.aplica; }));
  const avisos = rows_(SHEET_NAMES.AVISOS)
    .filter(function (a) { return a.userId === user.id && !a.leidoAt && (!a.monthId || a.monthId === monthId); })
    .sort(function (a, b) { return a.creadoAt < b.creadoAt ? 1 : -1; })
    .slice(0, 5)
    .map(function (a) { return { id: a.id, mensaje: a.mensaje, tipo: a.tipo || 'recordatorio', creadoAt: a.creadoAt }; });

  return {
    month: { id: ctx.month.id, nombre: ctx.month.nombre, cerrado: truthy_(ctx.month.cerrado), fechaLimite: normDate_(ctx.month.fechaLimite) },
    topics: topics,
    resumen: resumen,
    avisos: avisos
  };
}

function apiMarkAvisoLeido(token, avisoId) {
  const session = requireUserSession_(token);
  if (session.viewAs) return { ok: true };
  return withLock_(function () {
    const sheet = getSheet_(SHEET_NAMES.AVISOS);
    const a = readSheetObjects_(sheet).find(function (x) { return x.id === avisoId && x.userId === session.userId; });
    if (a && !a.leidoAt) updateCell_(sheet, a.__row, 'leidoAt', nowIso_());
    return { ok: true };
  });
}

// Conserva solo las AVISOS_KEEP notificaciones más recientes de cada unidad (nunca rompe la operación principal).
function pruneAvisos_(userIds) {
  try {
    const set = {};
    (userIds || []).forEach(function (id) { set[id] = true; });
    MEMO_.tables = {};
    const by = {};
    rows_(SHEET_NAMES.AVISOS).forEach(function (a) { if (set[a.userId]) (by[a.userId] = by[a.userId] || []).push(a); });
    const del = [];
    Object.keys(by).forEach(function (id) {
      by[id].sort(function (a, b) { return a.creadoAt < b.creadoAt ? 1 : (a.creadoAt > b.creadoAt ? -1 : 0); })
        .slice(AVISOS_KEEP).forEach(function (a) { del.push(a.__row); });
    });
    if (del.length) deleteRows_(getSheet_(SHEET_NAMES.AVISOS), del);
  } catch (e) {}
}

// Forma de una notificación para la bandeja. Los avisos antiguos (sin campos propios) se completan leyendo el texto.
function avisoPayload_(a) {
  let perfil = a.perfil || '';
  if (!perfil && a.creadoPor) { const first = String(a.creadoPor).split(' · ')[0]; if (Object.keys(PERFILES_REVISION).some(function (k) { return PERFILES_REVISION[k] === first; })) perfil = first; }
  let obs = a.observacion || '';
  if (!obs && (a.tipo === 'rechazo' || a.tipo === 'eliminacion' || a.tipo === 'reemplazo')) {
    const m = String(a.mensaje || '').match(/(?:Motivo|Ajuste realizado): (.+?)(?:\.? (?:Corrígelo|Si hace falta|El archivo quedó)|\.?$)/);
    if (m) obs = m[1];
  }
  return {
    id: a.id, tipo: a.tipo || 'recordatorio', mensaje: a.mensaje || '', perfil: perfil || 'Administración', observacion: obs,
    archivo: a.archivo || '', tema: a.tema || '', mesNombre: a.mesNombre || '', creadoAt: a.creadoAt, leidoAt: a.leidoAt || ''
  };
}

// Bandeja de la unidad: sus últimas AVISOS_KEEP notificaciones (todos los meses), nuevas e ya leídas.
function apiGetNotifications(token) {
  const session = requireUserSession_(token);
  const list = rows_(SHEET_NAMES.AVISOS).filter(function (a) { return a.userId === session.userId; })
    .sort(function (a, b) { return a.creadoAt < b.creadoAt ? 1 : -1; })
    .slice(0, AVISOS_KEEP).map(avisoPayload_);
  return { nuevas: list.filter(function (n) { return !n.leidoAt; }), anteriores: list.filter(function (n) { return !!n.leidoAt; }), max: AVISOS_KEEP };
}

function apiMarkAllAvisosLeidos(token) {
  const session = requireUserSession_(token);
  if (session.viewAs) return { ok: true };
  return withLock_(function () {
    MEMO_.tables = {};
    const sheet = getSheet_(SHEET_NAMES.AVISOS), at = nowIso_(), upd = {};
    readSheetObjects_(sheet).forEach(function (a) { if (a.userId === session.userId && !a.leidoAt) upd[a.__row] = { leidoAt: at }; });
    bulkUpdateRows_(sheet, upd);
    return { ok: true };
  });
}

// Marca o desmarca un tema como "No aplica este mes" para la unidad logueada.
function apiSetNoAplica(token, monthId, topicId, valor) {
  const session = requireUserSession_(token, true);
  const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
  const topic = rows_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === topicId && t.monthId === monthId; });
  if (!month || !topic) throw new Error('Mes o tema inválido.');
  assertMonthOpen_(month);
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });

  return withLock_(function () {
    MEMO_.tables = {};
    const sheet = getSheet_(SHEET_NAMES.NOAPLICA);
    const existente = readSheetObjects_(sheet).find(function (n) {
      return n.userId === session.userId && n.topicId === topicId && n.monthId === monthId;
    });
    if (valor) {
      const yaTieneArchivos = rows_(SHEET_NAMES.UPLOADS).some(function (u) {
        return u.userId === session.userId && u.topicId === topicId && u.monthId === monthId;
      });
      if (yaTieneArchivos) throw new Error('Este tema ya tiene archivos cargados, no se puede marcar como "No aplica".');
      if (!existente) {
        appendRow_(sheet, { id: Utilities.getUuid(), userId: session.userId, topicId: topicId, monthId: monthId, marcadoAt: nowIso_(), marcadoPor: '' });
        audit_('unidad', user.nombreUnidad, 'no_aplica_marcado', 'Marcó "No aplica": ' + topic.nombre + ' (' + month.nombre + ')', monthId, user.id);
      }
    } else if (existente) {
      if (existente.marcadoPor === 'admin') throw new Error('El administrador marcó este tema como "No aplica"; si crees que es un error, escríbele para que lo revise.');
      deleteRow_(sheet, existente.__row);
      audit_('unidad', user.nombreUnidad, 'no_aplica_quitado', 'Quitó "No aplica": ' + topic.nombre + ' (' + month.nombre + ')', monthId, user.id);
    }
    return { ok: true };
  });
}

// ---------------------------------------------------------------------
// CARGA / DESCARGA / ELIMINACIÓN DE ARCHIVOS (UNIDAD)
// ---------------------------------------------------------------------
function buildAutoName_(user, topic, ext, takenNames) {
  const stamp = Utilities.formatDate(new Date(), tz_(), 'yyyyMMdd');
  const base = slug_(user.nombreUnidad, 30) + '_' + slug_(topic.nombre, 40) + '_' + stamp;
  let name = base + '.' + ext, n = 1;
  const taken = {};
  takenNames.forEach(function (x) { taken[String(x).toLowerCase()] = true; });
  while (taken[name.toLowerCase()]) { n++; name = base + '_' + n + '.' + ext; }
  return name;
}

function apiUploadFile(token, monthId, topicId, fileObj) {
  const session = requireUserSession_(token, true);

  const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
  const topic = rows_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === topicId && t.monthId === monthId; });
  if (!month || !topic) throw new Error('Mes o tema inválido.');
  assertMonthOpen_(month);

  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });
  if (!user) throw new Error('Usuario no encontrado.');

  const ids = csv_(topic.contratoIds);
  if (ids.length && (!user.contratoId || ids.indexOf(user.contratoId) === -1)) {
    throw new Error('Este tema no se exige a tu contrato.');
  }

  if (!fileObj || !fileObj.base64Data || !fileObj.fileName) {
    throw new Error('No se recibió ningún archivo.');
  }
  const approxBytes = Math.floor(fileObj.base64Data.length * 0.75);
  if (approxBytes > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el límite de ' + (MAX_FILE_BYTES / (1024 * 1024)) + ' MB permitido.');
  }
  const ext = cleanExt_(String(fileObj.fileName).indexOf('.') === -1 ? '' : String(fileObj.fileName).split('.').pop());
  if (!ext) throw new Error('El archivo debe tener una extensión válida (por ejemplo .pdf, .docx).');
  const topicExt = csv_(topic.extensiones).map(function (e) { return e.toLowerCase(); });
  if (topicExt.length && topicExt.indexOf(ext) === -1) {
    throw new Error('En el tema "' + topic.nombre + '" solo se permiten archivos ' + topicExt.map(function (e) { return e.toUpperCase(); }).join(', ') + '.');
  }

  const takenNames = rows_(SHEET_NAMES.UPLOADS)
    .filter(function (u) { return u.userId === user.id && u.topicId === topic.id; })
    .map(function (u) { return u.originalName; });
  const finalName = AUTO_NOMBRE_ARCHIVOS ? buildAutoName_(user, topic, ext, takenNames) : String(fileObj.fileName);

  const bytes = Utilities.base64Decode(fileObj.base64Data);
  const blob = Utilities.newBlob(bytes, fileObj.mimeType || 'application/octet-stream', finalName);
  const folder = getUserTopicFolder_(month.nombre, user.cedula, user.nombreUnidad, topic.nombre);
  const driveFile = folder.createFile(blob);

  const deadline = normDate_(topic.fechaLimite) || normDate_(month.fechaLimite);

  return withLock_(function () {
    MEMO_.tables = {};
    // Re-validar el cierre del mes dentro del candado (otro administrador pudo cerrarlo mientras se subía)
    const freshMonth = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!freshMonth) { try { driveFile.setTrashed(true); } catch (e) {} throw new Error('Mes o tema inválido.'); }
    if (truthy_(freshMonth.cerrado)) { try { driveFile.setTrashed(true); } catch (e) {} assertMonthOpen_(freshMonth); }

    const record = {
      id: Utilities.getUuid(),
      userId: user.id,
      topicId: topic.id,
      monthId: month.id,
      driveFileId: driveFile.getId(),
      originalName: finalName,
      mimeType: fileObj.mimeType || '',
      size: bytes.length,
      uploadedAt: nowIso_(),
      nombreCargado: String(fileObj.fileName),
      estado: 'pendiente',
      observacion: '',
      revisadoPor: '',
      revisadoAt: '',
      tardio: !!deadline && todayStr_() > deadline
    };
    appendRow_(getSheet_(SHEET_NAMES.UPLOADS), record);

    // Si el tema estaba marcado como "No aplica", al subir un archivo se desmarca solo.
    try {
      const naSheet = getSheet_(SHEET_NAMES.NOAPLICA);
      const na = readSheetObjects_(naSheet).find(function (n) { return n.userId === user.id && n.topicId === topic.id && n.monthId === month.id; });
      if (na) deleteRow_(naSheet, na.__row);
    } catch (e) { /* no bloquea la carga del archivo */ }

    audit_('unidad', user.nombreUnidad, 'archivo_subido',
      finalName + ' · ' + topic.nombre + ' (' + month.nombre + ')' + (record.tardio ? ' · fuera de plazo' : ''), month.id, user.id);

    return { ok: true, file: fileInfo_(record) };
  });
}

function apiDownloadFile(token, uploadId) {
  const session = requireUserSession_(token);
  const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
  if (!up || up.userId !== session.userId) throw new Error('Archivo no encontrado.');
  return getFileAsBase64_(up);
}

// Borrado reversible: el archivo pasa a la papelera (el administrador puede restaurarlo).
function apiDeleteFile(token, uploadId) {
  const session = requireUserSession_(token, true);
  return withLock_(function () {
    MEMO_.tables = {};
    const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
    if (!up || up.userId !== session.userId) throw new Error('Archivo no encontrado.');
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === up.monthId; });
    if (month) assertMonthOpen_(month);
    const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });
    const topic = rows_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === up.topicId; });
    updateRow_(getSheet_(SHEET_NAMES.UPLOADS), up.__row, {
      eliminado: true, eliminadoAt: nowIso_(), eliminadoPor: user ? user.nombreUnidad : 'unidad', eliminadoLote: Utilities.getUuid()
    });
    audit_('unidad', user ? user.nombreUnidad : '', 'archivo_eliminado',
      up.originalName + ' · ' + (topic ? topic.nombre : '') + ' (' + (month ? month.nombre : '') + ') → papelera', up.monthId, session.userId);
    return { ok: true };
  });
}

// Renombra un archivo ya cargado, conservando SIEMPRE la extensión original.
function apiRenameFile(token, uploadId, nuevoNombreBase) {
  const session = requireUserSession_(token, true);
  nuevoNombreBase = String(nuevoNombreBase || '').trim();
  if (!nuevoNombreBase) throw new Error('El nombre no puede estar vacío.');
  if (nuevoNombreBase.length > 120) throw new Error('El nombre es demasiado largo.');
  nuevoNombreBase = nuevoNombreBase.replace(/[\\/:*?"<>|]/g, '-');

  return withLock_(function () {
    MEMO_.tables = {};
    const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
    if (!up || up.userId !== session.userId) throw new Error('Archivo no encontrado.');
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === up.monthId; });
    if (month) assertMonthOpen_(month);

    const nombreActual = String(up.originalName);
    const dot = nombreActual.lastIndexOf('.');
    const ext = dot > 0 ? nombreActual.slice(dot) : '';
    const nuevoNombre = nuevoNombreBase + ext;

    try { DriveApp.getFileById(up.driveFileId).setName(nuevoNombre); } catch (e) {}
    updateCell_(getSheet_(SHEET_NAMES.UPLOADS), up.__row, 'originalName', nuevoNombre);
    const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === session.userId; });
    audit_('unidad', user ? user.nombreUnidad : '', 'archivo_renombrado', nombreActual + ' → ' + nuevoNombre, up.monthId, session.userId);
    return { ok: true, originalName: nuevoNombre };
  });
}

function getFileAsBase64_(uploadRecord, withDriveUrl) {
  const driveFile = DriveApp.getFileById(uploadRecord.driveFileId);
  const blob = driveFile.getBlob();
  const out = {
    fileName: uploadRecord.originalName,
    mimeType: uploadRecord.mimeType || blob.getContentType(),
    base64Data: Utilities.base64Encode(blob.getBytes())
  };
  // Solo para administración: enlace al archivo original en Drive (el visor de Drive muestra Word/Excel fielmente)
  if (withDriveUrl) out.driveUrl = 'https://drive.google.com/file/d/' + uploadRecord.driveFileId + '/view';
  return out;
}

// ---------------------------------------------------------------------
// ADMIN - CONTRATOS
// ---------------------------------------------------------------------
function apiAdminListContratos(token) {
  requireAdminSession_(token);
  const contratos = rows_(SHEET_NAMES.CONTRATOS);
  const users = rows_(SHEET_NAMES.USUARIOS);
  return contratos
    .map(function (c) {
      return {
        id: c.id,
        nombre: c.nombre,
        activo: isActive_(c.activo),
        createdAt: c.createdAt,
        totalUnidades: users.filter(function (u) { return u.contratoId === c.id; }).length
      };
    })
    .sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre)); });
}

function apiAdminCreateContrato(token, nombre) {
  const session = requireAdminSession_(token);
  nombre = String(nombre || '').trim();
  if (!nombre) throw new Error('El nombre del contrato es obligatorio.');
  return withLock_(function () {
    MEMO_.tables = {};
    const sheet = getSheet_(SHEET_NAMES.CONTRATOS);
    const existentes = readSheetObjects_(sheet);
    if (existentes.some(function (c) { return String(c.nombre).toLowerCase() === nombre.toLowerCase(); })) {
      throw new Error('Ya existe un contrato con ese nombre.');
    }
    const contrato = { id: Utilities.getUuid(), nombre: nombre, activo: true, createdAt: nowIso_() };
    appendRow_(sheet, contrato);
    audit_('admin', adminActor_(session), 'contrato_creado', 'Creó el contrato "' + nombre + '"', '', '');
    return { ok: true, contrato: contrato };
  });
}

function apiAdminRenameContrato(token, contratoId, nuevoNombre) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    nuevoNombre = String(nuevoNombre || '').trim();
    if (!nuevoNombre) throw new Error('El nombre del contrato es obligatorio.');
    const sheet = getSheet_(SHEET_NAMES.CONTRATOS);
    const contrato = rows_(SHEET_NAMES.CONTRATOS).find(function (c) { return c.id === contratoId; });
    if (!contrato) throw new Error('Contrato no encontrado.');
    updateCell_(sheet, contrato.__row, 'nombre', nuevoNombre);
    audit_('admin', adminActor_(session), 'contrato_editado', 'Renombró el contrato "' + contrato.nombre + '" → "' + nuevoNombre + '"', '', '');
    return { ok: true };
  });
}

function apiAdminSetContratoActive(token, contratoId, activo) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const sheet = getSheet_(SHEET_NAMES.CONTRATOS);
    const contrato = rows_(SHEET_NAMES.CONTRATOS).find(function (c) { return c.id === contratoId; });
    if (!contrato) throw new Error('Contrato no encontrado.');
    updateCell_(sheet, contrato.__row, 'activo', !!activo);
    audit_('admin', adminActor_(session), 'contrato_editado', (activo ? 'Mostró' : 'Ocultó') + ' el contrato "' + contrato.nombre + '"', '', '');
    return { ok: true };
  });
}

function apiAdminDeleteContrato(token, contratoId) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const users = rows_(SHEET_NAMES.USUARIOS);
    if (users.some(function (u) { return u.contratoId === contratoId; })) {
      throw new Error('No se puede eliminar: hay unidades de servicio asignadas a este contrato. Reasígnalas u oculta el contrato en su lugar.');
    }
    const sheet = getSheet_(SHEET_NAMES.CONTRATOS);
    const contrato = rows_(SHEET_NAMES.CONTRATOS).find(function (c) { return c.id === contratoId; });
    if (!contrato) throw new Error('Contrato no encontrado.');
    deleteRow_(sheet, contrato.__row);
    audit_('admin', adminActor_(session), 'contrato_eliminado', 'Eliminó el contrato "' + contrato.nombre + '"', '', '');
    return { ok: true };
  });
}

// ---------------------------------------------------------------------
// ADMIN - USUARIOS (UNIDADES)
// ---------------------------------------------------------------------
function apiAdminListUsers(token) {
  requireAdminSession_(token);
  const users = rows_(SHEET_NAMES.USUARIOS);
  const contratoById = {};
  rows_(SHEET_NAMES.CONTRATOS).forEach(function (c) { contratoById[c.id] = c.nombre; });
  const lastBy = {}, countBy = {};
  rows_(SHEET_NAMES.UPLOADS).forEach(function (u) {
    countBy[u.userId] = (countBy[u.userId] || 0) + 1;
    if (!lastBy[u.userId] || u.uploadedAt > lastBy[u.userId]) lastBy[u.userId] = u.uploadedAt;
  });

  return users
    .map(function (u) {
      return {
        id: u.id,
        cedula: u.cedula,
        nombreUnidad: u.nombreUnidad,
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        nombreCompleto: fullName_(u),
        codigoPlano: u.codigoPlano || '',
        contratoId: u.contratoId || '',
        contratoNombre: u.contratoId ? (contratoById[u.contratoId] || 'Contrato eliminado') : '',
        createdAt: u.createdAt,
        ultimoCargue: lastBy[u.id] || '',
        totalArchivos: countBy[u.id] || 0
      };
    })
    .sort(function (a, b) { return String(a.nombreUnidad).localeCompare(String(b.nombreUnidad)); });
}

function apiAdminSetUserContrato(token, userId, contratoId) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    contratoId = String(contratoId || '').trim();
    const sheet = getSheet_(SHEET_NAMES.USUARIOS);
    const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === userId; });
    if (!user) throw new Error('Usuario no encontrado.');
    let nombre = 'Sin contrato';
    if (contratoId) {
      const c = rows_(SHEET_NAMES.CONTRATOS).find(function (x) { return x.id === contratoId; });
      if (!c) throw new Error('El contrato seleccionado no es válido.');
      nombre = c.nombre;
    }
    updateCell_(sheet, user.__row, 'contratoId', contratoId);
    audit_('admin', adminActor_(session), 'unidad_contrato', user.nombreUnidad + ' → ' + nombre, '', userId);
    return { ok: true };
  });
}

// Valida y normaliza los datos de un usuario enviados desde el panel (alta y edición).
function cleanUserForm_(f, codigoObligatorio) {
  f = f || {};
  const out = {
    nombres: cleanPerson_(f.nombres, 'Los nombres son obligatorios.'),
    apellidos: cleanPerson_(f.apellidos, 'Los apellidos son obligatorios.'),
    cedula: String(f.cedula || '').trim(),
    nombreUnidad: String(f.nombreUnidad || '').replace(/\s+/g, ' ').trim(),
    contratoId: String(f.contratoId || '').trim(),
    codigo: String(f.codigo || '').trim()
  };
  if (out.cedula.length < 4) throw new Error('La cédula no es válida.');
  if (!out.nombreUnidad) throw new Error('El nombre de la unidad de servicio es obligatorio.');
  if (codigoObligatorio && out.codigo.length < 3) throw new Error('El código de la unidad debe tener al menos 3 caracteres.');
  if (!codigoObligatorio && out.codigo && out.codigo.length < 3) throw new Error('El código de la unidad debe tener al menos 3 caracteres (o déjalo vacío para no cambiarlo).');
  if (out.contratoId && !rows_(SHEET_NAMES.CONTRATOS).some(function (c) { return c.id === out.contratoId; })) {
    throw new Error('El contrato seleccionado no es válido.');
  }
  return out;
}

// Agrega una cuenta (unidad de servicio) desde el panel de administración.
function apiAdminCreateUser(token, f) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const d = cleanUserForm_(f, true);
    const sheet = getSheet_(SHEET_NAMES.USUARIOS);
    const users = readSheetObjects_(sheet);
    if (users.some(function (u) { return String(u.cedula) === d.cedula; })) {
      throw new Error('Ya existe un usuario registrado con esa cédula.');
    }
    const salt = Utilities.getUuid();
    const user = {
      id: Utilities.getUuid(),
      cedula: d.cedula,
      codigoHash: salt + '$' + sha256_(d.codigo, salt),
      codigoPlano: d.codigo,
      nombreUnidad: d.nombreUnidad,
      contratoId: d.contratoId,
      createdAt: nowIso_(),
      nombres: d.nombres,
      apellidos: d.apellidos
    };
    appendRow_(sheet, user);
    audit_('admin', adminActor_(session), 'usuario_creado',
      'Creó la cuenta de ' + d.nombreUnidad + ' (CC ' + d.cedula + ') · Responsable: ' + d.nombres + ' ' + d.apellidos, '', user.id);
    return { ok: true, id: user.id };
  });
}

// Edita los datos de una cuenta. Si "codigo" viene vacío se conserva el código actual.
function apiAdminUpdateUser(token, userId, f) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const d = cleanUserForm_(f, false);
    const sheet = getSheet_(SHEET_NAMES.USUARIOS);
    const users = readSheetObjects_(sheet);
    const user = users.find(function (u) { return u.id === userId; });
    if (!user) throw new Error('Usuario no encontrado.');
    if (users.some(function (u) { return u.id !== userId && String(u.cedula) === d.cedula; })) {
      throw new Error('Ya existe otro usuario con esa cédula.');
    }
    const changes = { nombres: d.nombres, apellidos: d.apellidos, cedula: d.cedula, nombreUnidad: d.nombreUnidad, contratoId: d.contratoId };
    const cambios = [];
    if (String(user.nombres || '') !== d.nombres || String(user.apellidos || '') !== d.apellidos) cambios.push('nombre del responsable');
    if (String(user.cedula) !== d.cedula) cambios.push('cédula');
    if (String(user.nombreUnidad) !== d.nombreUnidad) cambios.push('unidad de servicio (' + user.nombreUnidad + ' → ' + d.nombreUnidad + ')');
    if (String(user.contratoId || '') !== d.contratoId) cambios.push('contrato');
    if (d.codigo) {
      const salt = Utilities.getUuid();
      changes.codigoHash = salt + '$' + sha256_(d.codigo, salt);
      changes.codigoPlano = d.codigo;
      cambios.push('código de acceso');
    }
    updateRow_(sheet, user.__row, changes);
    audit_('admin', adminActor_(session), 'usuario_editado',
      'Editó la cuenta de ' + d.nombreUnidad + (cambios.length ? ': ' + cambios.join(', ') : ' (sin cambios)'), '', userId);
    return { ok: true };
  });
}

// Elimina una cuenta. Sus registros de cargue, marcas "No aplica" y avisos se borran de la app.
// borrarDrive = true además manda sus archivos a la papelera de Drive; si no, quedan en Drive.
function apiAdminDeleteUser(token, userId, borrarDrive) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === userId; });
    if (!user) throw new Error('Usuario no encontrado.');
    const ups = rowsAll_(SHEET_NAMES.UPLOADS).filter(function (u) { return u.userId === userId; });
    const nas = rowsAll_(SHEET_NAMES.NOAPLICA).filter(function (n) { return n.userId === userId; });
    const avs = rowsAll_(SHEET_NAMES.AVISOS).filter(function (a) { return a.userId === userId; });

    if (borrarDrive) ups.forEach(function (u) { try { DriveApp.getFileById(u.driveFileId).setTrashed(true); } catch (e) {} });
    deleteRows_(getSheet_(SHEET_NAMES.UPLOADS), ups.map(function (r) { return r.__row; }));
    deleteRows_(getSheet_(SHEET_NAMES.NOAPLICA), nas.map(function (r) { return r.__row; }));
    deleteRows_(getSheet_(SHEET_NAMES.AVISOS), avs.map(function (r) { return r.__row; }));
    deleteRow_(getSheet_(SHEET_NAMES.USUARIOS), user.__row);

    audit_('admin', adminActor_(session), 'usuario_eliminado',
      'Eliminó la cuenta de ' + user.nombreUnidad + ' (CC ' + user.cedula + ') y ' + ups.length + ' registro(s) de archivos' +
      (ups.length ? (borrarDrive ? ' (archivos a la papelera de Drive)' : ' (los archivos siguen en Drive)') : ''), '', userId);
    return { ok: true, archivos: ups.length };
  });
}

// "Ver como unidad": sesión temporal de SOLO LECTURA con la vista que tiene la unidad.
function apiAdminViewAs(token, userId) {
  const session = requireAdminSession_(token);
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === userId; });
  if (!user) throw new Error('Usuario no encontrado.');
  const t = createSession_('user_', { userId: user.id, viewAs: true, by: adminActor_(session) }, VIEWAS_SECONDS);
  audit_('admin', adminActor_(session), 'ver_como_unidad', 'Abrió la vista de la unidad ' + user.nombreUnidad, '', user.id);
  return { ok: true, token: t, url: ScriptApp.getService().getUrl() + '?page=dashboard&vt=' + encodeURIComponent(t), nombreUnidad: user.nombreUnidad };
}

// ---------------------------------------------------------------------
// ADMIN - MESES
// ---------------------------------------------------------------------
function monthPayload_(m, topicCount) {
  return {
    id: m.id,
    nombre: m.nombre,
    activo: isActive_(m.activo),
    createdAt: m.createdAt,
    fechaLimite: normDate_(m.fechaLimite),
    cerrado: truthy_(m.cerrado),
    cerradoAt: m.cerradoAt || '',
    totalTemas: topicCount
  };
}

function cleanDate_(v, label) {
  v = String(v || '').trim();
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('La fecha ' + (label || '') + ' no es válida (usa el calendario).');
  return v;
}

function apiAdminListMonths(token) {
  requireAdminSession_(token);
  const months = rows_(SHEET_NAMES.MESES).slice();
  const topics = rows_(SHEET_NAMES.TEMAS);
  const cnt = {};
  topics.forEach(function (t) { cnt[t.monthId] = (cnt[t.monthId] || 0) + 1; });
  months.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return months.map(function (m) { return monthPayload_(m, cnt[m.id] || 0); });
}

function cleanTopicNames_(temas) {
  return (temas || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
}

function apiAdminCreateMonth(token, nombre, temas, fechaLimite) {
  const session = requireAdminSession_(token);
  nombre = String(nombre || '').trim();
  if (!nombre) throw new Error('El nombre del mes es obligatorio.');
  temas = cleanTopicNames_(temas);
  fechaLimite = cleanDate_(fechaLimite, 'límite');

  return withLock_(function () {
    MEMO_.tables = {};
    const monthSheet = getSheet_(SHEET_NAMES.MESES);
    const existentes = readSheetObjects_(monthSheet).filter(function (m) { return !truthy_(m.eliminado); });
    if (existentes.some(function (m) { return String(m.nombre).toLowerCase() === nombre.toLowerCase(); })) {
      throw new Error('Ya existe un mes con ese nombre.');
    }
    const month = { id: Utilities.getUuid(), nombre: nombre, activo: true, createdAt: nowIso_(), fechaLimite: fechaLimite, cerrado: false };
    appendRow_(monthSheet, month);
    appendRows_(getSheet_(SHEET_NAMES.TEMAS), temas.map(function (n, i) {
      return { id: Utilities.getUuid(), monthId: month.id, nombre: n, orden: i, obligatorio: true };
    }));
    audit_('admin', adminActor_(session), 'mes_creado', 'Creó el mes "' + nombre + '" con ' + temas.length + ' temas' + (fechaLimite ? ' · límite ' + fechaLimite : ''), month.id, '');
    return { ok: true, month: monthPayload_(month, temas.length) };
  });
}

// Copia el temario (con sus reglas) de un mes anterior. Las fechas límite de cada tema se
// desplazan según la diferencia entre las fechas límite de ambos meses; si no hay, se dejan en blanco.
function apiAdminDuplicateMonth(token, fromMonthId, nombre, fechaLimite) {
  const session = requireAdminSession_(token);
  nombre = String(nombre || '').trim();
  if (!nombre) throw new Error('El nombre del mes nuevo es obligatorio.');
  fechaLimite = cleanDate_(fechaLimite, 'límite');

  return withLock_(function () {
    MEMO_.tables = {};
    const monthSheet = getSheet_(SHEET_NAMES.MESES);
    const all = readSheetObjects_(monthSheet).filter(function (m) { return !truthy_(m.eliminado); });
    const from = all.find(function (m) { return m.id === fromMonthId; });
    if (!from) throw new Error('El mes de origen no existe.');
    if (all.some(function (m) { return String(m.nombre).toLowerCase() === nombre.toLowerCase(); })) {
      throw new Error('Ya existe un mes con ese nombre.');
    }
    const fromTopics = rows_(SHEET_NAMES.TEMAS).filter(function (t) { return t.monthId === fromMonthId; })
      .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });

    const oldLimit = normDate_(from.fechaLimite);
    const delta = (oldLimit && fechaLimite) ? daysBetween_(oldLimit, fechaLimite) : null;

    const month = { id: Utilities.getUuid(), nombre: nombre, activo: true, createdAt: nowIso_(), fechaLimite: fechaLimite, cerrado: false };
    appendRow_(monthSheet, month);
    appendRows_(getSheet_(SHEET_NAMES.TEMAS), fromTopics.map(function (t, i) {
      const tf = normDate_(t.fechaLimite);
      return {
        id: Utilities.getUuid(), monthId: month.id, nombre: t.nombre, orden: i,
        obligatorio: bool_(t.obligatorio, true),
        fechaLimite: (tf && delta !== null) ? addDays_(tf, delta) : '',
        extensiones: t.extensiones || '',
        contratoIds: t.contratoIds || ''
      };
    }));
    audit_('admin', adminActor_(session), 'mes_duplicado', 'Duplicó "' + from.nombre + '" → "' + nombre + '" (' + fromTopics.length + ' temas)', month.id, '');
    return { ok: true, month: monthPayload_(month, fromTopics.length) };
  });
}

function apiAdminSetMonthDates(token, monthId, fechaLimite) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    fechaLimite = cleanDate_(fechaLimite, 'límite');
    const sheet = getSheet_(SHEET_NAMES.MESES);
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!month) throw new Error('Mes no encontrado.');
    updateCell_(sheet, month.__row, 'fechaLimite', fechaLimite);
    audit_('admin', adminActor_(session), 'mes_fechas',
      month.nombre + ': fecha límite ' + (normDate_(month.fechaLimite) || 'sin fecha') + ' → ' + (fechaLimite || 'sin fecha'), monthId, '');
    return { ok: true };
  });
}

// Cierra o reabre un mes. Cerrado = nadie puede cargar, renombrar ni borrar archivos.
// Al reabrir se puede poner una fecha límite nueva (por si a alguna unidad le falta algo).
function apiAdminSetMonthClosed(token, monthId, cerrado, nuevaFechaLimite) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const sheet = getSheet_(SHEET_NAMES.MESES);
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!month) throw new Error('Mes no encontrado.');
    const fields = { cerrado: !!cerrado, cerradoAt: cerrado ? nowIso_() : '', cerradoPor: cerrado ? adminActor_(session) : '' };
    let extra = '';
    if (!cerrado && nuevaFechaLimite !== undefined && nuevaFechaLimite !== null && String(nuevaFechaLimite).trim() !== '') {
      fields.fechaLimite = cleanDate_(nuevaFechaLimite, 'límite');
      extra = ' · nueva fecha límite ' + fields.fechaLimite;
    }
    updateRow_(sheet, month.__row, fields);
    audit_('admin', adminActor_(session), cerrado ? 'mes_cerrado' : 'mes_reabierto', (cerrado ? 'Cerró' : 'Reabrió') + ' el mes "' + month.nombre + '"' + extra, monthId, '');
    return { ok: true };
  });
}

function apiAdminSetMonthActive(token, monthId, activo) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const sheet = getSheet_(SHEET_NAMES.MESES);
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!month) throw new Error('Mes no encontrado.');
    updateCell_(sheet, month.__row, 'activo', !!activo);
    audit_('admin', adminActor_(session), activo ? 'mes_visible' : 'mes_oculto', (activo ? 'Mostró' : 'Ocultó') + ' el mes "' + month.nombre + '" a las unidades', monthId, '');
    return { ok: true };
  });
}

// Eliminar un mes lo manda a la papelera junto con sus temas y archivos (se puede restaurar).
function apiAdminDeleteMonth(token, monthId) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!month) throw new Error('Mes no encontrado.');
    const lote = Utilities.getUuid(), at = nowIso_(), by = adminActor_(session);
    const mark = { eliminado: true, eliminadoAt: at, eliminadoPor: by, eliminadoLote: lote };

    const uploadSheet = getSheet_(SHEET_NAMES.UPLOADS);
    const upd = {};
    rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return u.monthId === monthId; }).forEach(function (u) { upd[u.__row] = mark; });
    const nFiles = Object.keys(upd).length;
    bulkUpdateRows_(uploadSheet, upd);

    const topicSheet = getSheet_(SHEET_NAMES.TEMAS);
    const tupd = {};
    rows_(SHEET_NAMES.TEMAS).filter(function (t) { return t.monthId === monthId; }).forEach(function (t) { tupd[t.__row] = mark; });
    const nTopics = Object.keys(tupd).length;
    bulkUpdateRows_(topicSheet, tupd);

    updateRow_(getSheet_(SHEET_NAMES.MESES), month.__row, mark);
    audit_('admin', by, 'mes_eliminado', 'Envió a la papelera el mes "' + month.nombre + '" (' + nTopics + ' temas, ' + nFiles + ' archivos)', monthId, '');
    return { ok: true };
  });
}

// ---------------------------------------------------------------------
// ADMIN - TEMAS
// ---------------------------------------------------------------------
function topicPayload_(t) {
  return {
    id: t.id,
    nombre: t.nombre,
    orden: t.orden,
    obligatorio: bool_(t.obligatorio, true),
    fechaLimite: normDate_(t.fechaLimite),
    extensiones: csv_(t.extensiones).map(function (e) { return e.toLowerCase(); }),
    contratoIds: csv_(t.contratoIds)
  };
}

function apiAdminGetMonthTopics(token, monthId) {
  requireAdminSession_(token);
  return rows_(SHEET_NAMES.TEMAS).filter(function (t) { return t.monthId === monthId; })
    .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); })
    .map(topicPayload_);
}

function apiAdminCreateTopics(token, monthId, temas) {
  const session = requireAdminSession_(token);
  temas = cleanTopicNames_(temas);
  if (!temas.length) throw new Error('Debes enviar al menos un tema.');
  return withLock_(function () {
    MEMO_.tables = {};
    const month = rows_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
    if (!month) throw new Error('Mes no encontrado.');
    const existing = rows_(SHEET_NAMES.TEMAS).filter(function (t) { return t.monthId === monthId; });
    const maxOrden = existing.reduce(function (m, t) { return Math.max(m, Number(t.orden) || 0); }, -1);
    appendRows_(getSheet_(SHEET_NAMES.TEMAS), temas.map(function (n, i) {
      return { id: Utilities.getUuid(), monthId: monthId, nombre: n, orden: maxOrden + 1 + i, obligatorio: true };
    }));
    audit_('admin', adminActor_(session), 'tema_creado', 'Agregó ' + temas.length + ' tema(s) a "' + month.nombre + '": ' + temas.join(', '), monthId, '');
    return { ok: true };
  });
}

// Edita las reglas de un tema: nombre, si es obligatorio, fecha límite propia,
// tipos de archivo permitidos y contratos a los que se les exige.
function apiAdminUpdateTopic(token, topicId, f, perfil) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    f = f || {};
    const sheet = getSheet_(SHEET_NAMES.TEMAS);
    const topic = rows_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === topicId; });
    if (!topic) throw new Error('Tema no encontrado.');
    const fields = {};
    if (f.nombre !== undefined) {
      const n = String(f.nombre || '').trim();
      if (!n) throw new Error('El nombre del tema es obligatorio.');
      fields.nombre = n;
    }
    if (f.obligatorio !== undefined) fields.obligatorio = !!f.obligatorio;
    if (f.fechaLimite !== undefined) fields.fechaLimite = cleanDate_(f.fechaLimite, 'límite del tema');
    if (f.extensiones !== undefined) {
      const raw = (Array.isArray(f.extensiones) ? f.extensiones : csv_(f.extensiones)).map(function (e) { return String(e).trim(); }).filter(Boolean);
      const list = [];
      raw.forEach(function (e) {
        const c = cleanExt_(e);
        if (!c) throw new Error('Formato no válido: «' + e + '». Usa solo letras y números (ej. pdf, docx, dwg).');
        if (list.indexOf(c) === -1) list.push(c);
      });
      fields.extensiones = list.join(',');
    }
    if (f.contratoIds !== undefined) {
      const ids = Array.isArray(f.contratoIds) ? f.contratoIds : csv_(f.contratoIds);
      const valid = rows_(SHEET_NAMES.CONTRATOS).map(function (c) { return c.id; });
      ids.forEach(function (id) { if (valid.indexOf(id) === -1) throw new Error('Uno de los contratos seleccionados ya no existe.'); });
      fields.contratoIds = ids.join(',');
    }
    updateRow_(sheet, topic.__row, fields);
    const cambios = Object.keys(fields).map(function (k) { return k; }).join(', ');
    let extra = '';
    if (fields.extensiones !== undefined) {
      const fmt = function (v) { const l = csv_(v); return l.length ? l.join(', ').toUpperCase() : 'cualquier formato'; };
      extra = ' · Formatos permitidos: ' + fmt(topic.extensiones) + ' → ' + fmt(fields.extensiones);
    }
    audit_('admin', reviewerLabel_(session, perfil), 'tema_editado', 'Editó el tema "' + topic.nombre + '" (' + cambios + ')' + extra, topic.monthId, '');
    return { ok: true };
  });
}

function apiAdminRenameTopic(token, topicId, nuevoNombre) {
  return apiAdminUpdateTopic(token, topicId, { nombre: nuevoNombre });
}

// Eliminar un tema lo manda a la papelera junto con sus archivos (se puede restaurar).
function apiAdminDeleteTopic(token, topicId) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const topic = rows_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === topicId; });
    if (!topic) throw new Error('Tema no encontrado.');
    const lote = Utilities.getUuid(), mark = { eliminado: true, eliminadoAt: nowIso_(), eliminadoPor: adminActor_(session), eliminadoLote: lote };
    const upd = {};
    rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return u.topicId === topicId; }).forEach(function (u) { upd[u.__row] = mark; });
    bulkUpdateRows_(getSheet_(SHEET_NAMES.UPLOADS), upd);
    updateRow_(getSheet_(SHEET_NAMES.TEMAS), topic.__row, mark);
    audit_('admin', adminActor_(session), 'tema_eliminado', 'Envió a la papelera el tema "' + topic.nombre + '" (' + Object.keys(upd).length + ' archivos)', topic.monthId, '');
    return { ok: true };
  });
}

// ---------------------------------------------------------------------
// ADMIN - FILAS POR UNIDAD (matriz, reportes e inicio comparten este cálculo)
// ---------------------------------------------------------------------
function contratoMap_() {
  const m = {};
  rows_(SHEET_NAMES.CONTRATOS).forEach(function (c) { m[c.id] = c.nombre; });
  return m;
}

function contratoNombre_(u, cMap) {
  return u.contratoId ? (cMap[u.contratoId] || 'Contrato eliminado') : 'Sin contrato';
}

function unitRows_(ctx, users, cMap) {
  return users.map(function (u) {
    const cells = unitCells_(ctx, u);
    const r = summarize_(cells);
    return {
      userId: u.id,
      cedula: u.cedula,
      nombreUnidad: u.nombreUnidad,
      responsable: fullName_(u),
      codigoPlano: u.codigoPlano || '',
      contratoId: u.contratoId || '',
      contratoNombre: contratoNombre_(u, cMap),
      ultimaFecha: lastUploadOf_(cells),
      resumen: r,
      completados: r.resueltos,
      total: r.total,
      completo: r.completo,
      pct: r.pct,
      cells: cells
    };
  });
}

function monthHead_(m) {
  return { id: m.id, nombre: m.nombre, fechaLimite: normDate_(m.fechaLimite), cerrado: truthy_(m.cerrado) };
}

// ---------------------------------------------------------------------
// ADMIN - MATRIZ DE ESTADO DE CARGUE
// ---------------------------------------------------------------------
function apiAdminGetStatus(token, monthId) {
  requireAdminSession_(token);
  const ctx = monthCtx_(monthId);
  const cMap = contratoMap_();
  const users = rows_(SHEET_NAMES.USUARIOS).slice()
    .sort(function (a, b) { return String(a.nombreUnidad).localeCompare(String(b.nombreUnidad)); });
  const matrix = unitRows_(ctx, users, cMap);
  const porRevisar = matrix.reduce(function (n, r) {
    return n + r.cells.reduce(function (k, c) { return k + c.files.filter(function (f) { return f.estado === 'pendiente'; }).length; }, 0);
  }, 0);
  return {
    month: monthHead_(ctx.month),
    topics: ctx.topics.map(topicPayload_),
    contratos: rows_(SHEET_NAMES.CONTRATOS).map(function (c) { return { id: c.id, nombre: c.nombre }; }),
    porRevisar: porRevisar,
    matrix: matrix
  };
}

function apiAdminDownloadFile(token, uploadId) {
  requireAdminSession_(token);
  const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
  if (!up) throw new Error('Archivo no encontrado.');
  return getFileAsBase64_(up, true);
}

// ---------------------------------------------------------------------
// ADMIN - SINCRONIZACIÓN CON DRIVE PARA EL PAQUETE ZIP
// Detecta carpetas y archivos que se agregaron directamente en Drive (dentro de la carpeta de una unidad)
// y que la plataforma no tiene registrados, para incluirlos en «Descargar paquete completo».
// ---------------------------------------------------------------------
const DRIVE_EXTRA_MAX_BYTES = 35 * 1024 * 1024;   // tope por archivo al descargarlo por la web (límite de respuesta de Apps Script)

// Carpeta de la unidad dentro del mes: primero por nombre exacto («cédula - unidad») y, si la renombraron, por la cédula.
function findUnitFolder_(monthFolder, cedula, nombreUnidad) {
  const exact = String(cedula + ' - ' + nombreUnidad).trim().replace(/[\\/:*?\"<>|]/g, '-');   // mismo saneado con que se crea la carpeta
  let it = monthFolder.getFoldersByName(exact);
  if (it.hasNext()) return it.next();
  // Si la renombraron: cualquier carpeta que empiece por la cédula
  const all = monthFolder.getFolders(), ced = String(cedula).trim();
  while (all.hasNext()) {
    const f = all.next(), n = f.getName().trim();
    if (n.indexOf(ced) === 0 && !/[0-9]/.test(n.charAt(ced.length) || ' ')) return f;
  }
  return null;
}

// Carpeta del mes bajo la raíz: nombre saneado como al crearla, o igual sin distinguir mayúsculas.
function findMonthFolder_(root, nombre) {
  const clean = String(nombre).trim().replace(/[\\/:*?\"<>|]/g, '-');
  let it = root.getFoldersByName(clean);
  if (it.hasNext()) return it.next();
  const all = root.getFolders(), low = clean.toLowerCase();
  while (all.hasNext()) { const f = all.next(); if (f.getName().trim().toLowerCase() === low) return f; }
  return null;
}

function scanFolderTree_(folder, prefix, registered, out, depth) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (registered[f.getId()]) continue;
    let size = 0; try { size = f.getSize(); } catch (e) {}
    out.files.push({ id: f.getId(), path: prefix + f.getName(), size: size, mimeType: f.getMimeType() });
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sf = subs.next(), p = prefix + sf.getName() + '/';
    out.folders.push(p);
    if (depth < 8) scanFolderTree_(sf, p, registered, out, depth + 1);
  }
}

// Revisa en Drive las carpetas de las unidades indicadas (el panel lo llama en lotes pequeños).
function apiAdminScanDriveExtras(token, monthId, userIds) {
  requireAdminSession_(token);
  const month = rowsAll_(SHEET_NAMES.MESES).find(function (m) { return m.id === monthId; });
  if (!month) throw new Error('Mes no encontrado.');
  const rootId = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  const root = DriveApp.getFolderById(rootId);
  const monthFolder = findMonthFolder_(root, month.nombre);
  // Todo archivo que la plataforma conoce (incluso los de la papelera) se excluye: solo salen los «nuevos».
  const registered = {};
  rowsAll_(SHEET_NAMES.UPLOADS).forEach(function (u) { if (u.driveFileId) registered[u.driveFileId] = true; });
  const users = rows_(SHEET_NAMES.USUARIOS);
  return (userIds || []).slice(0, 10).map(function (uid) {
    const user = users.find(function (u) { return u.id === uid; });
    const out = { userId: uid, files: [], folders: [], found: false, monthFound: !!monthFolder, folderName: '' };
    if (!user || !monthFolder) return out;
    const uf = findUnitFolder_(monthFolder, user.cedula, user.nombreUnidad);
    if (!uf) return out;
    out.found = true; out.folderName = uf.getName();
    scanFolderTree_(uf, '', registered, out, 0);
    return out;
  });
}

// ¿El archivo está dentro de la carpeta raíz de la plataforma? (evita descargar archivos ajenos a ella)
function isUnderRoot_(file, rootId) {
  let level = [file], guard = 0;
  while (level.length && guard++ < 10) {
    const next = [];
    for (let i = 0; i < level.length; i++) {
      const ps = level[i].getParents();
      while (ps.hasNext()) { const p = ps.next(); if (p.getId() === rootId) return true; next.push(p); }
    }
    level = next;
  }
  return false;
}

// Descarga un archivo de Drive detectado por el escaneo anterior (los documentos de Google se exportan a PDF).
function apiAdminDownloadDriveFile(token, fileId) {
  requireAdminSession_(token);
  const rootId = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  const file = DriveApp.getFileById(fileId);
  if (!isUnderRoot_(file, rootId)) throw new Error('Ese archivo no pertenece a la carpeta de la plataforma.');
  const mime = file.getMimeType();
  let name = file.getName(), blob;
  if (mime.indexOf('application/vnd.google-apps') === 0) {
    blob = file.getAs('application/pdf');
    if (!/\.pdf$/i.test(name)) name += '.pdf';
  } else {
    if (file.getSize() > DRIVE_EXTRA_MAX_BYTES) throw new Error('Pesa más de ' + Math.round(DRIVE_EXTRA_MAX_BYTES / 1048576) + ' MB: descárgalo directamente desde Drive.');
    blob = file.getBlob();
  }
  return { fileName: name, mimeType: blob.getContentType(), base64Data: Utilities.base64Encode(blob.getBytes()), driveUrl: 'https://drive.google.com/file/d/' + fileId + '/view' };
}

// ---------------------------------------------------------------------
// ADMIN - ELIMINAR Y REEMPLAZAR ARCHIVOS DE UNA UNIDAD
// (siempre notifican a la unidad y quedan en la bitácora)
// ---------------------------------------------------------------------
// Nombre del perfil que actúa, para hablarle a la unidad («Pedagoga», «Psicóloga»…).
function perfilNombre_(perfil) { return PERFILES_REVISION[String(perfil || '')] || 'Administración'; }

// Compara nombres de archivo ignorando extensión, mayúsculas, tildes y separadores (espacio, _ y -).
function nameKey_(name) {
  let n = String(name || '');
  const dot = n.lastIndexOf('.');
  if (dot > 0) n = n.slice(0, dot);
  n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return n.replace(/[\s_\-]+/g, ' ').trim();
}

// Elimina un archivo de una unidad. Es reversible (va a la papelera), exige el motivo y avisa a la unidad.
// La confirmación la pide el panel antes de llamar a esta función.
function apiAdminDeleteFile(token, uploadId, motivo, perfil) {
  const session = requireAdminSession_(token);
  motivo = String(motivo || '').trim().slice(0, 400);
  if (!motivo) throw new Error('Escribe el motivo de la eliminación: la unidad lo recibirá en su aviso.');
  return withLock_(function () {
    MEMO_.tables = {};
    const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
    if (!up) throw new Error('Archivo no encontrado (quizá ya fue eliminado).');
    const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === up.userId; });
    const topic = rowsAll_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === up.topicId; });
    const month = rowsAll_(SHEET_NAMES.MESES).find(function (m) { return m.id === up.monthId; });
    const by = reviewerLabel_(session, perfil), at = nowIso_();
    const tn = topic ? topic.nombre : '', mn = month ? month.nombre : '', un = user ? user.nombreUnidad : '';

    updateRow_(getSheet_(SHEET_NAMES.UPLOADS), up.__row, {
      eliminado: true, eliminadoAt: at, eliminadoPor: by, eliminadoLote: Utilities.getUuid()
    });

    if (user) {
      appendRow_(getSheet_(SHEET_NAMES.AVISOS), {
        id: Utilities.getUuid(), userId: user.id, monthId: up.monthId, tipo: 'eliminacion', creadoAt: at, creadoPor: by,
        perfil: perfilNombre_(perfil), observacion: motivo, archivo: up.originalName, tema: tn, mesNombre: mn,
        mensaje: perfilNombre_(perfil) + ' eliminó tu archivo \"' + up.originalName + '\" del tema \"' + tn + '\" (' + mn + '). Motivo: ' +
          motivo + (/[.!?]$/.test(motivo) ? '' : '.') + ' Si hace falta, vuelve a cargar el archivo en ese tema.'
      });
      pruneAvisos_([user.id]);
    }
    auditMany_([
      { tipo: 'admin', actor: by, accion: 'archivo_eliminado_admin', monthId: up.monthId, userId: up.userId,
        detalle: up.originalName + ' · ' + un + ' · ' + tn + ' (' + mn + ') → papelera · Motivo: ' + motivo },
      { tipo: 'admin', actor: by, accion: 'notificacion_unidad', monthId: up.monthId, userId: up.userId,
        detalle: 'Aviso a ' + un + ': archivo eliminado (' + up.originalName + ')' }
    ]);
    return { ok: true };
  });
}

// Reemplaza UN archivo de una unidad por una versión ajustada. El archivo nuevo debe llamarse igual que el
// que se reemplaza (sin importar la extensión), así se evita pisar otro archivo del mismo tema por error.
// El archivo reemplazado conserva su lugar y su fecha de cargue original, vuelve a «por revisar»,
// se avisa a la unidad y todo queda en la bitácora.
function apiAdminReplaceFile(token, uploadId, fileObj, ajuste, perfil) {
  const session = requireAdminSession_(token);
  ajuste = String(ajuste || '').trim().slice(0, 300);
  if (!ajuste) throw new Error('Describe brevemente el ajuste realizado: la unidad lo verá en su aviso.');
  if (!fileObj || !fileObj.base64Data || !fileObj.fileName) throw new Error('No se recibió ningún archivo.');
  if (Math.floor(fileObj.base64Data.length * 0.75) > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el límite de ' + (MAX_FILE_BYTES / (1024 * 1024)) + ' MB permitido.');
  }
  const newName = String(fileObj.fileName);
  const newExt = cleanExt_(newName.indexOf('.') === -1 ? '' : newName.split('.').pop());
  if (!newExt) throw new Error('El archivo debe tener una extensión válida (por ejemplo .pdf, .docx).');

  const up0 = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
  if (!up0) throw new Error('Archivo no encontrado (quizá ya fue eliminado).');
  const keys = [nameKey_(up0.nombreCargado), nameKey_(up0.originalName)].filter(Boolean);
  if (keys.indexOf(nameKey_(newName)) === -1) {
    const esperado = String(up0.originalName) + (up0.nombreCargado && up0.nombreCargado !== up0.originalName ? '» o «' + up0.nombreCargado : '');
    throw new Error('El nombre no coincide. Para reemplazar este archivo, el nuevo debe llamarse «' + esperado + '» (la extensión puede cambiar).');
  }
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === up0.userId; });
  const topic = rowsAll_(SHEET_NAMES.TEMAS).find(function (t) { return t.id === up0.topicId; });
  const month = rowsAll_(SHEET_NAMES.MESES).find(function (m) { return m.id === up0.monthId; });
  if (!user || !topic || !month) throw new Error('No se encontró la unidad, el tema o el mes de este archivo.');

  // Nombre guardado: el mismo del archivo reemplazado, con la extensión del nuevo.
  const oldStored = String(up0.originalName);
  const dot = oldStored.lastIndexOf('.');
  const storedName = (dot > 0 ? oldStored.slice(0, dot) : oldStored) + '.' + newExt;

  const bytes = Utilities.base64Decode(fileObj.base64Data);
  const blob = Utilities.newBlob(bytes, fileObj.mimeType || 'application/octet-stream', storedName);
  const folder = getUserTopicFolder_(month.nombre, user.cedula, user.nombreUnidad, topic.nombre);
  const driveFile = folder.createFile(blob);

  return withLock_(function () {
    MEMO_.tables = {};
    const up = rows_(SHEET_NAMES.UPLOADS).find(function (u) { return u.id === uploadId; });
    if (!up) { try { driveFile.setTrashed(true); } catch (e) {} throw new Error('El archivo fue eliminado mientras se subía el reemplazo.'); }
    const by = reviewerLabel_(session, perfil), at = nowIso_();

    updateRow_(getSheet_(SHEET_NAMES.UPLOADS), up.__row, {
      driveFileId: driveFile.getId(), originalName: storedName, mimeType: fileObj.mimeType || '', size: bytes.length,
      nombreCargado: newName, estado: 'pendiente', observacion: '', revisadoPor: '', revisadoAt: '',
      reemplazadoAt: at, reemplazadoPor: by
    });
    // La versión anterior queda en la papelera de Drive (recuperable ~30 días).
    try { DriveApp.getFileById(up.driveFileId).setTrashed(true); } catch (e) {}

    const cambioExt = storedName !== oldStored ? ' (ahora se llama \"' + storedName + '\")' : '';
    appendRow_(getSheet_(SHEET_NAMES.AVISOS), {
      id: Utilities.getUuid(), userId: user.id, monthId: up.monthId, tipo: 'reemplazo', creadoAt: at, creadoPor: by,
      perfil: perfilNombre_(perfil), observacion: ajuste, archivo: oldStored, tema: topic.nombre, mesNombre: month.nombre,
      mensaje: perfilNombre_(perfil) + ' ajustó tu archivo \"' + oldStored + '\" del tema \"' + topic.nombre + '\" (' + month.nombre + ') y lo reemplazó por una versión corregida' +
        cambioExt + '. Ajuste realizado: ' + ajuste + (/[.!?]$/.test(ajuste) ? '' : '.') + ' El archivo quedó por revisar de nuevo.'
    });
    pruneAvisos_([user.id]);
    auditMany_([
      { tipo: 'admin', actor: by, accion: 'archivo_reemplazado', monthId: up.monthId, userId: up.userId,
        detalle: oldStored + (storedName !== oldStored ? ' → ' + storedName : '') + ' · ' + user.nombreUnidad + ' · ' + topic.nombre + ' (' + month.nombre + ') · Ajuste: ' + ajuste },
      { tipo: 'admin', actor: by, accion: 'notificacion_unidad', monthId: up.monthId, userId: up.userId,
        detalle: 'Aviso a ' + user.nombreUnidad + ': archivo reemplazado (' + oldStored + ')' }
    ]);
    return { ok: true, file: fileInfo_(Object.assign({}, up, {
      driveFileId: driveFile.getId(), originalName: storedName, size: bytes.length, nombreCargado: newName, estado: 'pendiente',
      observacion: '', revisadoPor: '', revisadoAt: '', reemplazadoAt: at, reemplazadoPor: by
    })) };
  });
}

// ---------------------------------------------------------------------
// ADMIN - REVISIÓN DE ARCHIVOS (aprobar / rechazar con observación)
// ---------------------------------------------------------------------
// Perfiles de revisión que se eligen al entrar al panel (quedan escritos en «Revisado por»).
const PERFILES_REVISION = {
  pedagoga: 'Pedagoga', psicologa: 'Psicóloga', nutricionista: 'Nutricionista', administrativo: 'Administrativo'
};
// «Pedagoga · usuario»: perfil que revisó + cuenta de administrador usada. Sin perfil válido, solo la cuenta.
function reviewerLabel_(session, perfil) {
  const label = PERFILES_REVISION[String(perfil || '')];
  return label ? label + ' · ' + adminActor_(session) : adminActor_(session);
}

function reviewMany_(session, ids, estado, observacion, perfil) {
  if (['aprobado', 'rechazado', 'pendiente'].indexOf(estado) === -1) throw new Error('Estado de revisión no válido.');
  observacion = String(observacion || '').trim().slice(0, 400);
  if (estado === 'rechazado' && !observacion) throw new Error('Escribe el motivo del rechazo: la unidad lo verá para corregir y volver a subir el archivo.');
  ids = (ids || []).filter(Boolean);
  if (!ids.length) throw new Error('No hay archivos seleccionados.');
  if (ids.length > 400) throw new Error('Selecciona máximo 400 archivos por vez.');

  return withLock_(function () {
    const wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    const ups = rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return wanted[u.id]; });
    if (!ups.length) throw new Error('No se encontraron los archivos (quizá ya fueron eliminados).');

    const by = reviewerLabel_(session, perfil), at = nowIso_();
    const upd = {};
    ups.forEach(function (u) {
      upd[u.__row] = estado === 'pendiente'
        ? { estado: 'pendiente', observacion: '', revisadoPor: '', revisadoAt: '' }
        : { estado: estado, observacion: estado === 'rechazado' ? observacion : '', revisadoPor: by, revisadoAt: at };
    });
    bulkUpdateRows_(getSheet_(SHEET_NAMES.UPLOADS), upd);

    const users = mapBy_(rows_(SHEET_NAMES.USUARIOS), 'id');
    const topics = mapBy_(rowsAll_(SHEET_NAMES.TEMAS), 'id');
    const months = mapBy_(rowsAll_(SHEET_NAMES.MESES), 'id');
    const accion = estado === 'aprobado' ? 'archivo_aprobado' : (estado === 'rechazado' ? 'archivo_rechazado' : 'archivo_pendiente');
    const entries = [], avisos = [];
    ups.forEach(function (u) {
      const usr = users[u.userId] || {}, tp = topics[u.topicId] || {}, mo = months[u.monthId] || {};
      entries.push({
        tipo: 'admin', actor: by, accion: accion, monthId: u.monthId, userId: u.userId,
        detalle: u.originalName + ' · ' + (usr.nombreUnidad || '') + ' · ' + (tp.nombre || '') + (estado === 'rechazado' ? ' · Motivo: ' + observacion : '')
      });
      if (estado === 'rechazado') {
        avisos.push({
          id: Utilities.getUuid(), userId: u.userId, monthId: u.monthId, tipo: 'rechazo', creadoAt: at, creadoPor: by,
          perfil: perfilNombre_(perfil), observacion: observacion, archivo: u.originalName, tema: tp.nombre || '', mesNombre: mo.nombre || '',
          mensaje: 'Se rechazó tu archivo "' + u.originalName + '" del tema "' + (tp.nombre || '') + '" (' + (mo.nombre || '') + '). Motivo: ' + observacion + (/[.!?]$/.test(observacion) ? '' : '.') + ' Corrígelo y vuelve a subirlo.'
        });
      }
    });
    auditMany_(entries);
    appendRows_(getSheet_(SHEET_NAMES.AVISOS), avisos);
    pruneAvisos_(avisos.map(function (a) { return a.userId; }));
    return { ok: true, cambiados: ups.length };
  });
}

function apiAdminReviewFile(token, uploadId, estado, observacion, perfil) {
  const session = requireAdminSession_(token);
  return reviewMany_(session, [uploadId], estado, observacion, perfil);
}

function apiAdminBulkReview(token, uploadIds, estado, observacion, perfil) {
  const session = requireAdminSession_(token);
  return reviewMany_(session, uploadIds, estado, observacion, perfil);
}

// Aprueba de una vez todo lo que está por revisar en las unidades indicadas (útil tras actualizar o con unidades de confianza).
function apiAdminApprovePendingOfUnits(token, monthId, userIds, perfil) {
  const session = requireAdminSession_(token);
  const set = {};
  (userIds || []).forEach(function (id) { set[id] = true; });
  if (!Object.keys(set).length) throw new Error('Selecciona al menos una unidad.');
  const ids = rows_(SHEET_NAMES.UPLOADS)
    .filter(function (u) { return u.monthId === monthId && set[u.userId] && (u.estado || 'pendiente') === 'pendiente'; })
    .map(function (u) { return u.id; });
  if (!ids.length) return { ok: true, cambiados: 0 };
  return reviewMany_(session, ids, 'aprobado', '', perfil);
}

function apiAdminGetReviewQueue(token, monthId, contratoId, estado) {
  requireAdminSession_(token);
  estado = estado || 'pendiente';
  contratoId = String(contratoId || 'todos');
  const months = mapBy_(rows_(SHEET_NAMES.MESES), 'id');
  if (monthId && monthId !== 'todos' && !months[monthId]) throw new Error('Mes no encontrado.');
  const users = mapBy_(rows_(SHEET_NAMES.USUARIOS), 'id');
  const topics = mapBy_(rows_(SHEET_NAMES.TEMAS), 'id');
  const cMap = contratoMap_();

  let ups = rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return months[u.monthId] && topics[u.topicId] && users[u.userId]; });
  if (monthId && monthId !== 'todos') ups = ups.filter(function (u) { return u.monthId === monthId; });
  if (contratoId !== 'todos') ups = ups.filter(function (u) { return (users[u.userId].contratoId || '') === contratoId; });

  const counts = { pendiente: 0, rechazado: 0, aprobado: 0 };
  ups.forEach(function (u) { const e = u.estado || 'pendiente'; if (counts[e] !== undefined) counts[e]++; });

  let list = ups.filter(function (u) { return (u.estado || 'pendiente') === estado; });
  list.sort(function (a, b) {
    if (estado === 'pendiente') return a.uploadedAt < b.uploadedAt ? -1 : 1;
    return String(b.revisadoAt || b.uploadedAt) < String(a.revisadoAt || a.uploadedAt) ? -1 : 1;
  });
  const total = list.length;
  list = list.slice(0, 400);
  return {
    counts: counts,
    total: total,
    mostrados: list.length,
    rows: list.map(function (u) {
      const usr = users[u.userId], tp = topics[u.topicId];
      return {
        id: u.id, userId: u.userId, uploadedAt: u.uploadedAt, originalName: u.originalName, size: u.size,
        nombreUnidad: usr.nombreUnidad, responsable: fullName_(usr), cedula: usr.cedula, contratoNombre: contratoNombre_(usr, cMap),
        mesNombre: months[u.monthId].nombre, temaNombre: tp.nombre, tardio: truthy_(u.tardio),
        estado: u.estado || 'pendiente', observacion: u.observacion || '', revisadoPor: u.revisadoPor || '', revisadoAt: u.revisadoAt || ''
      };
    })
  };
}

// Contadores ligeros para la barra lateral
function apiAdminGetBadges(token) {
  requireAdminSession_(token);
  const monthIds = {};
  rows_(SHEET_NAMES.MESES).forEach(function (m) { monthIds[m.id] = true; });
  const porRevisar = rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return monthIds[u.monthId] && (u.estado || 'pendiente') === 'pendiente'; }).length;
  const t = trashEntries_();
  return { porRevisar: porRevisar, papelera: t.length };
}

// ---------------------------------------------------------------------
// ADMIN - ACCIONES MASIVAS (matriz): "No aplica" y recordatorios
// ---------------------------------------------------------------------
function apiAdminBulkNoAplica(token, monthId, userIds, topicIds, valor) {
  const session = requireAdminSession_(token);
  userIds = (userIds || []).filter(Boolean);
  topicIds = (topicIds || []).filter(Boolean);
  if (!userIds.length || !topicIds.length) throw new Error('Selecciona al menos una unidad y un tema.');

  return withLock_(function () {
    const ctx = monthCtx_(monthId);
    const users = mapBy_(rows_(SHEET_NAMES.USUARIOS), 'id');
    const topics = mapBy_(ctx.topics, 'id');
    const naSheet = getSheet_(SHEET_NAMES.NOAPLICA);
    const existing = {};
    readSheetObjects_(naSheet).forEach(function (n) { if (n.monthId === monthId) existing[n.userId + '::' + n.topicId] = n; });

    const toAdd = [], toDelete = [];
    let conArchivos = 0, noExigido = 0, yaMarcado = 0;
    userIds.forEach(function (uid) {
      const u = users[uid];
      if (!u) return;
      topicIds.forEach(function (tid) {
        const t = topics[tid];
        if (!t) return;
        const key = uid + '::' + tid;
        if (valor) {
          if ((ctx.byKey[key] || []).length) { conArchivos++; return; }
          const ids = csv_(t.contratoIds);
          if (ids.length && ids.indexOf(u.contratoId) === -1) { noExigido++; return; }
          if (existing[key]) { yaMarcado++; return; }
          toAdd.push({ id: Utilities.getUuid(), userId: uid, topicId: tid, monthId: monthId, marcadoAt: nowIso_(), marcadoPor: 'admin' });
        } else if (existing[key]) {
          toDelete.push(existing[key].__row);
        }
      });
    });
    appendRows_(naSheet, toAdd);
    deleteRows_(naSheet, toDelete);

    const nombres = topicIds.map(function (id) { return topics[id] ? topics[id].nombre : ''; }).filter(Boolean).join(', ');
    audit_('admin', adminActor_(session), valor ? 'no_aplica_marcado' : 'no_aplica_quitado',
      (valor ? 'Marcó' : 'Quitó') + ' "No aplica" en ' + (valor ? toAdd.length : toDelete.length) + ' casilla(s) de ' + userIds.length + ' unidad(es): ' + nombres + ' (' + ctx.month.nombre + ')', monthId, '');
    return { ok: true, marcados: toAdd.length, quitados: toDelete.length, conArchivos: conArchivos, noExigido: noExigido, yaMarcado: yaMarcado };
  });
}

function reminderText_(ctx, cells, nota) {
  const faltan = [];
  let vencidos = 0;
  cells.forEach(function (c, i) {
    if (c.aplica && c.obligatorio && (c.estado === 'vacio' || c.estado === 'rechazado')) {
      faltan.push(ctx.topics[i].nombre + (c.estado === 'rechazado' ? ' (corregir)' : ''));
      if (c.vencido) vencidos++;
    }
  });
  if (!faltan.length) return null;
  let msg = 'Recordatorio de ' + ctx.month.nombre + ': te falta' + (faltan.length === 1 ? '' : 'n') + ' ' + faltan.length + ' tema' + (faltan.length === 1 ? '' : 's') + ' por cargar o corregir: ' +
    faltan.slice(0, 6).join(', ') + (faltan.length > 6 ? ' y ' + (faltan.length - 6) + ' más' : '') + '.';
  if (vencidos) msg += ' ' + vencidos + (vencidos === 1 ? ' ya venció.' : ' ya vencieron.');
  const lim = normDate_(ctx.month.fechaLimite);
  if (lim && !vencidos) msg += ' Fecha límite del mes: ' + fmtDay_(lim) + '.';
  if (nota) msg += ' ' + nota;
  return msg;
}

// Envía un aviso (aparece como cartel en el panel de la unidad) a las unidades indicadas,
// o a todas las que tengan pendientes si no se indica ninguna. Las que no tienen nada pendiente se omiten.
function apiAdminSendReminders(token, monthId, userIds, nota) {
  const session = requireAdminSession_(token);
  nota = String(nota || '').trim().slice(0, 240);
  return withLock_(function () {
    const ctx = monthCtx_(monthId);
    let users = rows_(SHEET_NAMES.USUARIOS);
    if (userIds && userIds.length) {
      const set = {};
      userIds.forEach(function (id) { set[id] = true; });
      users = users.filter(function (u) { return set[u.id]; });
    }
    const at = nowIso_(), by = adminActor_(session);
    const nuevos = [];
    const targets = {};
    let omitidos = 0;
    users.forEach(function (u) {
      const msg = reminderText_(ctx, unitCells_(ctx, u), nota);
      if (!msg) { omitidos++; return; }
      targets[u.id] = true;
      nuevos.push({ id: Utilities.getUuid(), userId: u.id, monthId: monthId, mensaje: msg, tipo: 'recordatorio', creadoAt: at, creadoPor: by, perfil: 'Administración', observacion: nota, archivo: '', tema: '', mesNombre: ctx.month.nombre });
    });
    if (!nuevos.length) return { ok: true, enviados: 0, omitidos: omitidos };

    // Reemplaza los recordatorios anteriores sin leer del mismo mes (evita acumular avisos)
    const avSheet = getSheet_(SHEET_NAMES.AVISOS);
    const viejos = rows_(SHEET_NAMES.AVISOS)
      .filter(function (a) { return targets[a.userId] && a.monthId === monthId && a.tipo === 'recordatorio' && !a.leidoAt; })
      .map(function (a) { return a.__row; });
    deleteRows_(avSheet, viejos);
    appendRows_(avSheet, nuevos);
    pruneAvisos_(Object.keys(targets));

    audit_('admin', by, 'recordatorio', 'Envió recordatorio a ' + nuevos.length + ' unidad(es) · ' + ctx.month.nombre + (nota ? ' · Nota: ' + nota : ''), monthId, '');
    return { ok: true, enviados: nuevos.length, omitidos: omitidos };
  });
}

// ---------------------------------------------------------------------
// ADMIN - REPORTES DETALLADOS (filtrado por mes / contrato / búsqueda)
// ---------------------------------------------------------------------
function apiAdminGetReport(token, monthId, contratoId, search) {
  requireAdminSession_(token);
  const ctx = monthCtx_(monthId);
  contratoId = String(contratoId || 'todos');
  search = String(search || '').toLowerCase().trim();

  let users = rows_(SHEET_NAMES.USUARIOS);
  if (contratoId !== 'todos') users = users.filter(function (u) { return (u.contratoId || '') === contratoId; });
  if (search) {
    users = users.filter(function (u) {
      return String(u.cedula).toLowerCase().indexOf(search) !== -1 || String(u.nombreUnidad).toLowerCase().indexOf(search) !== -1;
    });
  }
  users = users.slice().sort(function (a, b) { return String(a.nombreUnidad).localeCompare(String(b.nombreUnidad)); });

  const rows = unitRows_(ctx, users, contratoMap_()).map(function (r) {
    r.temas = r.cells.map(function (c, i) {
      return {
        id: ctx.topics[i].id, nombre: ctx.topics[i].nombre, estado: c.estado, aplica: c.aplica, obligatorio: c.obligatorio,
        vencido: c.vencido, fechaLimite: c.fechaLimite, noAplica: c.noAplica, vacio: c.estado === 'vacio',
        observacion: c.observacion, files: c.files
      };
    });
    delete r.cells;
    return r;
  });
  return { month: monthHead_(ctx.month), topics: ctx.topics.map(topicPayload_), rows: rows };
}

// ---------------------------------------------------------------------
// ADMIN - HISTORIAL DE CARGUES (registro de fecha de cada archivo)
// ---------------------------------------------------------------------
// Filas del historial (ya filtradas y ordenadas). Las entradas "limpiadas" no aparecen.
function uploadsLogRows_(monthId, contratoId, search) {
  monthId = String(monthId || 'todos');
  contratoId = String(contratoId || 'todos');
  search = String(search || '').toLowerCase().trim();

  const monthById = {}, topicById = {}, userById = {};
  rowsAll_(SHEET_NAMES.MESES).forEach(function (m) { monthById[m.id] = m.nombre; });
  rowsAll_(SHEET_NAMES.TEMAS).forEach(function (t) { topicById[t.id] = t.nombre; });
  rows_(SHEET_NAMES.USUARIOS).forEach(function (u) { userById[u.id] = u; });
  const cMap = contratoMap_();

  const all = rows_(SHEET_NAMES.UPLOADS);
  const ocultos = all.filter(function (u) { return truthy_(u.ocultoHistorial); }).length;
  let uploads = all.filter(function (u) { return !truthy_(u.ocultoHistorial); });
  if (monthId !== 'todos') uploads = uploads.filter(function (u) { return u.monthId === monthId; });
  if (contratoId !== 'todos') uploads = uploads.filter(function (u) { return (userById[u.userId] || {}).contratoId === contratoId; });

  let rows = uploads.map(function (u) {
    const user = userById[u.userId] || {};
    return {
      id: u.id,
      uploadedAt: u.uploadedAt,
      cedula: user.cedula || '',
      nombreUnidad: user.nombreUnidad || 'Usuario eliminado',
      responsable: fullName_(user),
      contratoNombre: user.contratoId ? (cMap[user.contratoId] || 'Contrato eliminado') : 'Sin contrato',
      mesNombre: monthById[u.monthId] || 'Mes eliminado',
      temaNombre: topicById[u.topicId] || 'Tema eliminado',
      originalName: u.originalName,
      size: u.size,
      estado: u.estado || 'pendiente',
      tardio: truthy_(u.tardio)
    };
  });

  if (search) {
    rows = rows.filter(function (r) {
      return r.nombreUnidad.toLowerCase().indexOf(search) !== -1 ||
        String(r.responsable).toLowerCase().indexOf(search) !== -1 ||
        String(r.cedula).toLowerCase().indexOf(search) !== -1 ||
        String(r.originalName).toLowerCase().indexOf(search) !== -1 ||
        String(r.temaNombre).toLowerCase().indexOf(search) !== -1;
    });
  }
  rows.sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
  return { rows: rows, ocultos: ocultos };
}

function apiAdminGetUploadsLog(token, monthId, contratoId, search) {
  requireAdminSession_(token);
  const r = uploadsLogRows_(monthId, contratoId, search);
  let rows = r.rows;
  const total = rows.length;
  if (rows.length > UPLOADS_LOG_LIMIT) rows = rows.slice(0, UPLOADS_LOG_LIMIT);
  return { total: total, mostrados: rows.length, ocultos: r.ocultos, rows: rows };
}

// "Limpiar" el historial = ocultar esas entradas de la lista. NO borra los archivos de Drive ni
// cambia la matriz, los reportes ni la revisión. f = { ids: [...] } o los filtros { monthId, contratoId, search }.
function apiAdminClearUploadsLog(token, f) {
  const session = requireAdminSession_(token);
  f = f || {};
  return withLock_(function () {
    MEMO_.tables = {};
    let ids;
    if (Array.isArray(f.ids) && f.ids.length) ids = f.ids;
    else ids = uploadsLogRows_(f.monthId, f.contratoId, f.search).rows.map(function (r) { return r.id; });
    const set = {};
    ids.forEach(function (i) { set[i] = true; });
    const upd = {};
    rows_(SHEET_NAMES.UPLOADS).forEach(function (u) {
      if (set[u.id] && !truthy_(u.ocultoHistorial)) upd[u.__row] = { ocultoHistorial: true };
    });
    const n = Object.keys(upd).length;
    if (!n) return { ok: true, limpiados: 0 };
    bulkUpdateRows_(getSheet_(SHEET_NAMES.UPLOADS), upd);
    const mid = (f.monthId && f.monthId !== 'todos' && !(Array.isArray(f.ids) && f.ids.length)) ? f.monthId : '';
    audit_('admin', adminActor_(session), 'historial_limpiado',
      'Limpió ' + n + ' registro(s) del historial de cargues (los archivos y la matriz no se tocaron)', mid, '');
    return { ok: true, limpiados: n };
  });
}

// Vuelve a mostrar todas las entradas que se habían limpiado del historial.
function apiAdminRestoreUploadsLog(token) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    MEMO_.tables = {};
    const upd = {};
    rows_(SHEET_NAMES.UPLOADS).forEach(function (u) { if (truthy_(u.ocultoHistorial)) upd[u.__row] = { ocultoHistorial: false }; });
    const n = Object.keys(upd).length;
    if (n) {
      bulkUpdateRows_(getSheet_(SHEET_NAMES.UPLOADS), upd);
      audit_('admin', adminActor_(session), 'historial_restaurado', 'Restauró ' + n + ' registro(s) en el historial de cargues', '', '');
    }
    return { ok: true, restaurados: n };
  });
}

// ---------------------------------------------------------------------
// ADMIN - PANEL DE INICIO
// ---------------------------------------------------------------------
function weekStart_(dateStr) {
  const dow = new Date(dateToUtc_(dateStr)).getUTCDay(); // 0 = domingo
  return addDays_(dateStr, -((dow + 6) % 7));            // lunes de esa semana
}

function apiAdminGetHome(token, monthId, contratoId) {
  requireAdminSession_(token);
  const ctx = monthCtx_(monthId);
  contratoId = String(contratoId || 'todos');
  const cMap = contratoMap_();
  let users = rows_(SHEET_NAMES.USUARIOS);
  if (contratoId !== 'todos') users = users.filter(function (u) { return (u.contratoId || '') === contratoId; });
  const rowsU = unitRows_(ctx, users, cMap);

  // ---- KPIs
  let totalEx = 0, resueltos = 0, vencidas = 0, sinCargar = 0, filesPend = 0, filesRech = 0, filesAprob = 0;
  rowsU.forEach(function (r) {
    totalEx += r.total; resueltos += r.resumen.resueltos; vencidas += r.resumen.vencidos;
    let any = false;
    r.cells.forEach(function (c) {
      c.files.forEach(function (f) {
        any = true;
        if (f.estado === 'pendiente') filesPend++; else if (f.estado === 'rechazado') filesRech++; else filesAprob++;
      });
    });
    if (!any) sinCargar++;
  });
  const kpis = {
    unidades: rowsU.length,
    avance: totalEx ? Math.round(resueltos / totalEx * 100) : 0,
    completas: rowsU.filter(function (r) { return r.completo; }).length,
    archivosPorRevisar: filesPend,
    archivosRechazados: filesRech,
    archivosAprobados: filesAprob,
    temasVencidos: vencidas,
    sinCargar: sinCargar
  };

  // ---- Cumplimiento por contrato
  const groups = {};
  rowsU.forEach(function (r) {
    const key = r.contratoId || '';
    const g = groups[key] = groups[key] || { id: key, nombre: r.contratoNombre, unidades: 0, total: 0, resueltos: 0, completas: 0 };
    g.unidades++; g.total += r.total; g.resueltos += r.resumen.resueltos; if (r.completo) g.completas++;
  });
  const porContrato = Object.keys(groups).map(function (k) {
    const g = groups[k];
    return { id: g.id, nombre: g.nombre, unidades: g.unidades, completas: g.completas, pct: g.total ? Math.round(g.resueltos / g.total * 100) : 0 };
  }).sort(function (a, b) { return a.pct - b.pct; });

  // ---- Temas que más incumplen
  const temas = ctx.topics.map(function (t, i) {
    let n = 0, fail = 0, venc = 0;
    rowsU.forEach(function (r) {
      const c = r.cells[i];
      if (!c.aplica || !c.obligatorio) return;
      n++;
      if (!c.cumple) fail++;
      if (c.vencido) venc++;
    });
    return { id: t.id, nombre: t.nombre, unidades: n, incumplen: fail, vencidos: venc, pct: n ? Math.round(fail / n * 100) : 0 };
  }).filter(function (t) { return t.incumplen > 0; })
    .sort(function (a, b) { return b.incumplen - a.incumplen || b.vencidos - a.vencidos || a.nombre.localeCompare(b.nombre); })
    .slice(0, 8);

  // ---- Unidades más rezagadas
  const rezagadas = rowsU.filter(function (r) { return !r.completo && r.total > 0; })
    .sort(function (a, b) { return a.pct - b.pct || b.resumen.vencidos - a.resumen.vencidos || a.nombreUnidad.localeCompare(b.nombreUnidad); })
    .slice(0, 8)
    .map(function (r) {
      return {
        userId: r.userId, nombreUnidad: r.nombreUnidad, contratoNombre: r.contratoNombre, pct: r.pct,
        faltan: r.total - r.resumen.resueltos, vencidos: r.resumen.vencidos, ultimaFecha: r.ultimaFecha
      };
    });

  // ---- Avance semanal (archivos cargados y aprobados por semana)
  const set = {};
  users.forEach(function (u) { set[u.id] = true; });
  const ups = rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return u.monthId === monthId && set[u.userId]; });
  const today = todayStr_();
  let first = dayOf_(ctx.month.createdAt) || today;
  ups.forEach(function (u) { const d = dayOf_(u.uploadedAt); if (d && d < first) first = d; });
  let wk = weekStart_(first);
  const thisWeek = weekStart_(today);
  while (daysBetween_(wk, thisWeek) > 7 * 11) wk = addDays_(wk, 7); // máximo 12 semanas
  const buckets = {}, order = [];
  for (let w = wk; w <= thisWeek; w = addDays_(w, 7)) { buckets[w] = { semana: w, cargados: 0, aprobados: 0 }; order.push(w); }
  ups.forEach(function (u) {
    const w1 = weekStart_(dayOf_(u.uploadedAt));
    if (buckets[w1]) buckets[w1].cargados++;
    if (u.estado === 'aprobado' && u.revisadoAt) { const w2 = weekStart_(dayOf_(u.revisadoAt)); if (buckets[w2]) buckets[w2].aprobados++; }
  });

  return {
    month: monthHead_(ctx.month),
    kpis: kpis,
    porContrato: porContrato,
    temasIncumplen: temas,
    rezagadas: rezagadas,
    semanal: order.map(function (w) { return buckets[w]; })
  };
}

// ---------------------------------------------------------------------
// ADMIN - FICHA DE UNIDAD (historial completo de una unidad)
// ---------------------------------------------------------------------
function apiAdminGetUnitSheet(token, userId) {
  requireAdminSession_(token);
  const user = rows_(SHEET_NAMES.USUARIOS).find(function (u) { return u.id === userId; });
  if (!user) throw new Error('Unidad no encontrada.');
  const cMap = contratoMap_();
  const allTopics = rows_(SHEET_NAMES.TEMAS), allUps = rows_(SHEET_NAMES.UPLOADS).filter(function (u) { return u.userId === userId; });
  const allNa = rows_(SHEET_NAMES.NOAPLICA).filter(function (n) { return n.userId === userId; });
  const months = rows_(SHEET_NAMES.MESES).slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

  let ultimo = '', archivos = allUps.length;
  allUps.forEach(function (u) { if (!ultimo || u.uploadedAt > ultimo) ultimo = u.uploadedAt; });

  const meses = months.map(function (m) {
    const ctx = buildMonthCtx_(m, allTopics, allUps, allNa);
    const cells = unitCells_(ctx, user);
    return {
      id: m.id, nombre: m.nombre, activo: isActive_(m.activo), cerrado: truthy_(m.cerrado), fechaLimite: normDate_(m.fechaLimite),
      resumen: summarize_(cells),
      ultimaFecha: lastUploadOf_(cells),
      temas: ctx.topics.map(function (t, i) {
        const c = cells[i];
        return {
          id: t.id, nombre: t.nombre, estado: c.estado, aplica: c.aplica, obligatorio: c.obligatorio,
          fechaLimite: c.fechaLimite, vencido: c.vencido, marcadoPor: c.marcadoPor, observacion: c.observacion, files: c.files
        };
      })
    };
  });

  const avisos = rows_(SHEET_NAMES.AVISOS).filter(function (a) { return a.userId === userId; })
    .sort(function (a, b) { return a.creadoAt < b.creadoAt ? 1 : -1; }).slice(0, 8)
    .map(function (a) { return { mensaje: a.mensaje, tipo: a.tipo, creadoAt: a.creadoAt, leidoAt: a.leidoAt || '' }; });

  return {
    unit: {
      id: user.id, cedula: user.cedula, nombreUnidad: user.nombreUnidad, nombres: user.nombres || '', apellidos: user.apellidos || '',
      nombreCompleto: fullName_(user), codigoPlano: user.codigoPlano || '',
      contratoId: user.contratoId || '', contratoNombre: contratoNombre_(user, cMap), createdAt: user.createdAt,
      ultimoCargue: ultimo, totalArchivos: archivos
    },
    meses: meses,
    avisos: avisos
  };
}

// ---------------------------------------------------------------------
// ADMIN - PAPELERA (borrado reversible)
// ---------------------------------------------------------------------
function trashEntries_() {
  const meses = rowsAll_(SHEET_NAMES.MESES), temas = rowsAll_(SHEET_NAMES.TEMAS), ups = rowsAll_(SHEET_NAMES.UPLOADS);
  const users = mapBy_(rows_(SHEET_NAMES.USUARIOS), 'id');
  const monthsById = mapBy_(meses, 'id'), topicsById = mapBy_(temas, 'id');
  const out = [];
  const monthLotes = {}, topicLotes = {};

  meses.filter(function (m) { return truthy_(m.eliminado); }).forEach(function (m) {
    monthLotes[m.eliminadoLote] = true;
    out.push({
      tipo: 'mes', lote: m.eliminadoLote, nombre: m.nombre, eliminadoAt: m.eliminadoAt, eliminadoPor: m.eliminadoPor,
      temas: temas.filter(function (t) { return t.eliminadoLote === m.eliminadoLote; }).length,
      archivos: ups.filter(function (u) { return u.eliminadoLote === m.eliminadoLote; }).length
    });
  });
  temas.filter(function (t) { return truthy_(t.eliminado) && !monthLotes[t.eliminadoLote]; }).forEach(function (t) {
    topicLotes[t.eliminadoLote] = true;
    const mo = monthsById[t.monthId];
    out.push({
      tipo: 'tema', lote: t.eliminadoLote, nombre: t.nombre, contexto: mo ? mo.nombre : '', eliminadoAt: t.eliminadoAt, eliminadoPor: t.eliminadoPor,
      archivos: ups.filter(function (u) { return u.eliminadoLote === t.eliminadoLote; }).length
    });
  });
  ups.filter(function (u) { return truthy_(u.eliminado) && !monthLotes[u.eliminadoLote] && !topicLotes[u.eliminadoLote]; }).forEach(function (u) {
    const tp = topicsById[u.topicId], mo = monthsById[u.monthId], us = users[u.userId];
    out.push({
      tipo: 'archivo', lote: u.eliminadoLote, nombre: u.originalName, size: u.size,
      contexto: (us ? us.nombreUnidad : 'Unidad eliminada') + ' · ' + (tp ? tp.nombre : 'Tema') + ' · ' + (mo ? mo.nombre : 'Mes'),
      eliminadoAt: u.eliminadoAt, eliminadoPor: u.eliminadoPor
    });
  });
  const today = todayStr_();
  out.forEach(function (e) {
    const gone = e.eliminadoAt ? daysBetween_(dayOf_(e.eliminadoAt), today) : 0;
    e.diasRestantes = Math.max(0, TRASH_DAYS - gone);
  });
  out.sort(function (a, b) { return String(b.eliminadoAt) < String(a.eliminadoAt) ? -1 : 1; });
  return out;
}

function apiAdminListTrash(token) {
  requireAdminSession_(token);
  return { dias: TRASH_DAYS, items: trashEntries_() };
}

function apiAdminRestoreTrash(token, lote) {
  const session = requireAdminSession_(token);
  if (!lote) throw new Error('Elemento no válido.');
  return withLock_(function () {
    const meses = rowsAll_(SHEET_NAMES.MESES), temas = rowsAll_(SHEET_NAMES.TEMAS), ups = rowsAll_(SHEET_NAMES.UPLOADS);
    const mIn = meses.filter(function (m) { return m.eliminadoLote === lote; });
    const tIn = temas.filter(function (t) { return t.eliminadoLote === lote; });
    const uIn = ups.filter(function (u) { return u.eliminadoLote === lote; });
    if (!mIn.length && !tIn.length && !uIn.length) throw new Error('Ese elemento ya no está en la papelera.');

    const aliveMonth = function (id) { const m = meses.find(function (x) { return x.id === id; }); return m && !truthy_(m.eliminado); };
    const aliveTopic = function (id) { const t = temas.find(function (x) { return x.id === id; }); return t && !truthy_(t.eliminado); };
    let tipo, nombre;
    if (mIn.length) {
      tipo = 'mes'; nombre = mIn[0].nombre;
      const dup = meses.some(function (m) { return !truthy_(m.eliminado) && String(m.nombre).toLowerCase() === String(nombre).toLowerCase(); });
      if (dup) throw new Error('Ya existe otro mes llamado "' + nombre + '". Cámbiale el nombre al existente antes de restaurar este.');
    } else if (tIn.length) {
      tipo = 'tema'; nombre = tIn[0].nombre;
      if (!aliveMonth(tIn[0].monthId)) throw new Error('El mes de este tema está en la papelera. Restaura primero el mes.');
    } else {
      tipo = 'archivo'; nombre = uIn[0].originalName;
      if (!aliveMonth(uIn[0].monthId)) throw new Error('El mes de este archivo está en la papelera. Restaura primero el mes.');
      if (!aliveTopic(uIn[0].topicId)) throw new Error('El tema de este archivo está en la papelera. Restaura primero el tema.');
    }
    const clear = { eliminado: false, eliminadoAt: '', eliminadoPor: '', eliminadoLote: '' };
    const upd = function (list) { const o = {}; list.forEach(function (r) { o[r.__row] = clear; }); return o; };
    bulkUpdateRows_(getSheet_(SHEET_NAMES.MESES), upd(mIn));
    bulkUpdateRows_(getSheet_(SHEET_NAMES.TEMAS), upd(tIn));
    bulkUpdateRows_(getSheet_(SHEET_NAMES.UPLOADS), upd(uIn));
    audit_('admin', adminActor_(session), tipo === 'mes' ? 'mes_restaurado' : (tipo === 'tema' ? 'tema_restaurado' : 'archivo_restaurado'),
      'Restauró ' + tipo + ' "' + nombre + '" desde la papelera', tipo === 'mes' ? mIn[0].id : (tIn.length ? tIn[0].monthId : uIn[0].monthId), '');
    return { ok: true, tipo: tipo };
  });
}

// Borra DEFINITIVAMENTE los lotes indicados (archivos de Drive a la papelera de Drive y filas de la hoja).
function purgeLotes_(lotes, actorTipo, actor) {
  const set = {};
  lotes.forEach(function (l) { if (l) set[l] = true; });
  if (!Object.keys(set).length) return 0;
  const meses = rowsAll_(SHEET_NAMES.MESES), temas = rowsAll_(SHEET_NAMES.TEMAS), ups = rowsAll_(SHEET_NAMES.UPLOADS);
  const mDel = meses.filter(function (m) { return set[m.eliminadoLote]; });
  const tDel = temas.filter(function (t) { return set[t.eliminadoLote]; });
  const uDel = ups.filter(function (u) { return set[u.eliminadoLote]; });

  uDel.forEach(function (u) { try { DriveApp.getFileById(u.driveFileId).setTrashed(true); } catch (e) {} });
  deleteRows_(getSheet_(SHEET_NAMES.UPLOADS), uDel.map(function (r) { return r.__row; }));

  // Las marcas "No aplica" de los temas/meses eliminados ya no tienen sentido
  const tIds = {}, mIds = {};
  tDel.forEach(function (t) { tIds[t.id] = true; });
  mDel.forEach(function (m) { mIds[m.id] = true; });
  const naSheet = getSheet_(SHEET_NAMES.NOAPLICA);
  const naRows = rowsAll_(SHEET_NAMES.NOAPLICA).filter(function (n) { return tIds[n.topicId] || mIds[n.monthId]; }).map(function (n) { return n.__row; });
  deleteRows_(naSheet, naRows);
  deleteRows_(getSheet_(SHEET_NAMES.TEMAS), tDel.map(function (r) { return r.__row; }));
  deleteRows_(getSheet_(SHEET_NAMES.MESES), mDel.map(function (r) { return r.__row; }));

  audit_(actorTipo, actor, 'purga_definitiva', 'Eliminó definitivamente ' + mDel.length + ' mes(es), ' + tDel.length + ' tema(s) y ' + uDel.length + ' archivo(s) de la papelera', '', '');
  return uDel.length + tDel.length + mDel.length;
}

function apiAdminPurgeTrash(token, lote) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    purgeLotes_([lote], 'admin', adminActor_(session));
    return { ok: true };
  });
}

function apiAdminEmptyTrash(token) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const lotes = trashEntries_().map(function (e) { return e.lote; });
    purgeLotes_(lotes, 'admin', adminActor_(session));
    return { ok: true, eliminados: lotes.length };
  });
}

// Opcional: programarla con un activador diario (Activadores > Añadir) o ejecutar instalarPurgaAutomatica() una vez.
function purgarPapelera() {
  withLock_(function () {
    const viejos = trashEntries_().filter(function (e) { return e.diasRestantes <= 0; }).map(function (e) { return e.lote; });
    purgeLotes_(viejos, 'sistema', 'Purga automática');
  });
}

function instalarPurgaAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'purgarPapelera') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('purgarPapelera').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Listo: cada día a las 3 a.m. se borrarán definitivamente los elementos con más de ' + TRASH_DAYS + ' días en la papelera.');
}

// ---------------------------------------------------------------------
// ADMIN - BITÁCORA DE AUDITORÍA
// ---------------------------------------------------------------------
// Mes (AAAA-MM, en la zona horaria del script) de una fecha de la bitácora.
function auditMonthOf_(v) {
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return '';
    return Utilities.formatDate(d, tz_(), 'yyyy-MM');
  } catch (e) { return ''; }
}

// Hoja de la bitácora: la viva (archivo vacío) o la de un mes archivado ("2026-09").
function auditSheetFor_(archivo, create) {
  archivo = String(archivo || '').trim();
  if (!archivo) return getSheet_(SHEET_NAMES.AUDITORIA);
  if (!/^\d{4}-\d{2}$/.test(archivo)) throw new Error('Mes de archivo no válido.');
  const name = AUDIT_ARCHIVE_PREFIX + archivo;
  let sh = getSS_().getSheetByName(name);
  if (!sh && create) sh = ensureSheetWithHeaders_(getSS_(), name, SCHEMAS.Auditoria);
  if (!sh) throw new Error('Ese archivo mensual no existe.');
  return sh;
}

// Lee filas de una hoja de bitácora (orden de la hoja). windowRows = 0 → todas.
function auditLoad_(sheet, windowRows) {
  const last = sheet.getLastRow();
  if (last < 2) return { start: 2, rows: [] };
  const start = windowRows ? Math.max(2, last - windowRows + 1) : 2;
  const vals = sheet.getRange(start, 1, last - start + 1, SCHEMAS.Auditoria.length).getValues();
  const rows = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!r[0]) continue;
    const fecha = r[1] instanceof Date ? r[1].toISOString() : String(r[1]);
    rows.push({ id: r[0], fecha: fecha, actorTipo: r[2], actor: r[3], accion: r[4], detalle: r[5], monthId: r[6], userId: r[7], __row: start + i });
  }
  return { start: start, rows: rows };
}

// Devuelve una función que dice si un registro cumple los filtros.
function auditMatcher_(f) {
  f = f || {};
  const accion = String(f.accion || 'todas'), tipo = String(f.tipo || 'todos');
  const q = String(f.texto || '').toLowerCase().trim();
  const desde = normDate_(f.desde), hasta = normDate_(f.hasta);
  const monthId = String(f.monthId || 'todos');
  return function (o) {
    if (accion !== 'todas' && o.accion !== accion) return false;
    if (tipo !== 'todos' && o.actorTipo !== tipo) return false;
    if (monthId !== 'todos' && o.monthId !== monthId) return false;
    const day = dayOf_(o.fecha);
    if (desde && day < desde) return false;
    if (hasta && day > hasta) return false;
    if (q && (String(o.detalle) + ' ' + String(o.actor) + ' ' + String(o.accion)).toLowerCase().indexOf(q) === -1) return false;
    return true;
  };
}

// f.archivo = "AAAA-MM" para ver un mes archivado; vacío = bitácora actual.
function apiAdminGetAudit(token, f) {
  requireAdminSession_(token);
  f = f || {};
  const archivo = String(f.archivo || '').trim();
  const sheet = auditSheetFor_(archivo, false);
  const loaded = auditLoad_(sheet, archivo ? 0 : AUDIT_WINDOW);
  if (!loaded.rows.length) return { total: 0, mostrados: 0, archivo: archivo, rows: [] };
  const monthName = {};
  rowsAll_(SHEET_NAMES.MESES).forEach(function (m) { monthName[m.id] = m.nombre; });
  const match = auditMatcher_(f);

  let rows = [];
  for (let i = loaded.rows.length - 1; i >= 0; i--) {
    const o = loaded.rows[i];
    if (!match(o)) continue;
    o.mesNombre = o.monthId ? (monthName[o.monthId] || '') : '';
    rows.push({ id: o.id, fecha: o.fecha, actorTipo: o.actorTipo, actor: o.actor, accion: o.accion, detalle: o.detalle, monthId: o.monthId, userId: o.userId, mesNombre: o.mesNombre });
  }
  const total = rows.length;
  if (rows.length > AUDIT_LIMIT) rows = rows.slice(0, AUDIT_LIMIT);
  return { total: total, mostrados: rows.length, desdeFila: loaded.start, archivo: archivo, rows: rows };
}

// Meses con registros en la bitácora actual y meses ya archivados.
function apiAdminAuditMonths(token) {
  requireAdminSession_(token);
  const sheet = getSheet_(SHEET_NAMES.AUDITORIA);
  const last = sheet.getLastRow();
  const counts = {};
  if (last >= 2) {
    sheet.getRange(2, 2, last - 1, 1).getValues().forEach(function (r) {
      if (r[0] === '' || r[0] === null) return;
      const m = auditMonthOf_(r[0]);
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
  }
  const actual = auditMonthOf_(new Date());
  const vivos = Object.keys(counts).sort().reverse().map(function (m) { return { mes: m, total: counts[m], actual: m === actual }; });
  const archivos = getSS_().getSheets().filter(function (sh) {
    const n = sh.getName();
    return n.indexOf(AUDIT_ARCHIVE_PREFIX) === 0 && /^\d{4}-\d{2}$/.test(n.slice(AUDIT_ARCHIVE_PREFIX.length));
  }).map(function (sh) {
    return { mes: sh.getName().slice(AUDIT_ARCHIVE_PREFIX.length), total: Math.max(sh.getLastRow() - 1, 0) };
  }).sort(function (a, b) { return a.mes < b.mes ? 1 : -1; });
  return { mesActual: actual, vivos: vivos, archivos: archivos };
}

// Mueve a una hoja "Auditoria_AAAA-MM" los registros de los meses indicados (los quita de la bitácora actual).
function archiveAuditMonths_(meses, actorTipo, actor) {
  const wanted = {};
  meses.forEach(function (m) { if (/^\d{4}-\d{2}$/.test(m)) wanted[m] = true; });
  if (!Object.keys(wanted).length) return { registros: 0, meses: [] };
  const live = getSheet_(SHEET_NAMES.AUDITORIA);
  const loaded = auditLoad_(live, 0);
  const byMonth = {};
  loaded.rows.forEach(function (o) {
    const m = auditMonthOf_(o.fecha);
    if (wanted[m]) (byMonth[m] = byMonth[m] || []).push(o);
  });
  const done = [];
  let total = 0;
  const toDelete = [];
  Object.keys(byMonth).sort().forEach(function (m) {
    const list = byMonth[m];
    const arch = auditSheetFor_(m, true);
    const out = list.map(function (o) {
      const d = new Date(o.fecha);
      return [o.id, isNaN(d.getTime()) ? o.fecha : d, o.actorTipo, o.actor, o.accion, o.detalle, o.monthId, o.userId];
    });
    arch.getRange(arch.getLastRow() + 1, 1, out.length, SCHEMAS.Auditoria.length).setValues(out);
    list.forEach(function (o) { toDelete.push(o.__row); });
    done.push(m);
    total += list.length;
  });
  // Primero se copia todo y solo después se borra, para no perder registros si algo falla a mitad.
  deleteRows_(live, toDelete);
  if (total) {
    audit_(actorTipo, actor, 'bitacora_archivada', 'Archivó ' + total + ' registro(s) de la bitácora: ' + done.join(', '), '', '');
  }
  return { registros: total, meses: done };
}

function apiAdminArchiveAuditMonth(token, mes) {
  const session = requireAdminSession_(token);
  mes = String(mes || '').trim();
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error('Elige un mes válido.');
  return withLock_(function () {
    const r = archiveAuditMonths_([mes], 'admin', adminActor_(session));
    if (!r.registros) throw new Error('No hay registros de ese mes para archivar.');
    return { ok: true, registros: r.registros, meses: r.meses };
  });
}

// Archiva todos los meses anteriores al actual.
function apiAdminArchiveAuditPast(token) {
  const session = requireAdminSession_(token);
  return withLock_(function () {
    const actual = auditMonthOf_(new Date());
    const meses = {};
    auditLoad_(getSheet_(SHEET_NAMES.AUDITORIA), 0).rows.forEach(function (o) {
      const m = auditMonthOf_(o.fecha);
      if (m && m < actual) meses[m] = true;
    });
    const r = archiveAuditMonths_(Object.keys(meses), 'admin', adminActor_(session));
    return { ok: true, registros: r.registros, meses: r.meses };
  });
}

// Opcional: ejecuta instalarArchivadoBitacora() una vez para que el día 1 de cada mes se archive el mes anterior.
function archivarBitacoraMensual() {
  withLock_(function () {
    const actual = auditMonthOf_(new Date());
    const meses = {};
    auditLoad_(getSheet_(SHEET_NAMES.AUDITORIA), 0).rows.forEach(function (o) {
      const m = auditMonthOf_(o.fecha);
      if (m && m < actual) meses[m] = true;
    });
    archiveAuditMonths_(Object.keys(meses), 'sistema', 'Archivado automático');
  });
}

function instalarArchivadoBitacora() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'archivarBitacoraMensual') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('archivarBitacoraMensual').timeBased().onMonthDay(1).atHour(2).create();
  Logger.log('Listo: el día 1 de cada mes, a las 2 a.m., se archivará la bitácora de los meses anteriores.');
}

// Elimina registros concretos (por id) de la bitácora actual o de un mes archivado.
function apiAdminDeleteAudit(token, ids, archivo) {
  const session = requireAdminSession_(token);
  ids = Array.isArray(ids) ? ids : [];
  if (!ids.length) throw new Error('No hay registros seleccionados.');
  archivo = String(archivo || '').trim();
  return withLock_(function () {
    const sheet = auditSheetFor_(archivo, false);
    const set = {};
    ids.forEach(function (i) { set[i] = true; });
    const del = auditLoad_(sheet, 0).rows.filter(function (o) { return set[o.id]; }).map(function (o) { return o.__row; });
    deleteRows_(sheet, del);
    audit_('admin', adminActor_(session), 'bitacora_eliminada',
      'Eliminó ' + del.length + ' registro(s) de la bitácora' + (archivo ? ' (archivo ' + archivo + ')' : ''), '', '');
    return { ok: true, eliminados: del.length };
  });
}

// Elimina TODOS los registros que cumplan los filtros indicados (aunque no se vean todos en pantalla).
function apiAdminDeleteAuditByFilter(token, f, archivo) {
  const session = requireAdminSession_(token);
  archivo = String(archivo || '').trim();
  return withLock_(function () {
    const sheet = auditSheetFor_(archivo, false);
    const match = auditMatcher_(f);
    const del = auditLoad_(sheet, 0).rows.filter(match).map(function (o) { return o.__row; });
    deleteRows_(sheet, del);
    audit_('admin', adminActor_(session), 'bitacora_eliminada',
      'Eliminó ' + del.length + ' registro(s) de la bitácora según los filtros aplicados' + (archivo ? ' (archivo ' + archivo + ')' : ''), '', '');
    return { ok: true, eliminados: del.length };
  });
}

// Elimina por completo el archivo de un mes.
function apiAdminDeleteAuditArchive(token, mes) {
  const session = requireAdminSession_(token);
  mes = String(mes || '').trim();
  return withLock_(function () {
    const sheet = auditSheetFor_(mes, false);
    const n = Math.max(sheet.getLastRow() - 1, 0);
    getSS_().deleteSheet(sheet);
    audit_('admin', adminActor_(session), 'bitacora_archivo_eliminado', 'Eliminó el archivo de la bitácora de ' + mes + ' (' + n + ' registro(s))', '', '');
    return { ok: true, eliminados: n };
  });
}

// Vacía la caché de lecturas (útil si editaste la hoja de cálculo a mano y quieres verlo ya en la app).
function apiAdminClearCache(token) {
  const session = requireAdminSession_(token);
  clearAllCaches_();
  audit_('admin', adminActor_(session), 'cache_limpia', 'Actualizó los datos de la app (caché)', '', '');
  return { ok: true };
}

// Para ejecutar a mano desde el editor: aprueba todos los archivos cargados ANTES de existir la revisión.
function aprobarCargasAnteriores() {
  withLock_(function () {
    const sheet = getSheet_(SHEET_NAMES.UPLOADS);
    const upd = {};
    let n = 0;
    rows_(SHEET_NAMES.UPLOADS).forEach(function (u) {
      if (!u.estado) { upd[u.__row] = { estado: 'aprobado', revisadoPor: 'Migración', revisadoAt: nowIso_() }; n++; }
    });
    bulkUpdateRows_(sheet, upd);
    audit_('sistema', 'Migración', 'archivo_aprobado', 'Aprobó ' + n + ' archivo(s) cargados antes del flujo de revisión', '', '');
    Logger.log('Archivos aprobados: ' + n);
  });
}

// ---------------------------------------------------------------------
// MANUALES CORTOS EN PDF (se generan al vuelo desde HTML sencillo)
// ---------------------------------------------------------------------
function manualHtml_(titulo, intro, secciones) {
  const h = [];
  h.push('<html><head><meta charset="UTF-8"></head><body style="font-family:Arial,Helvetica,sans-serif;color:#1c2230;font-size:11pt;line-height:1.45;">');
  h.push('<h1 style="color:#173aa8;font-size:20pt;margin:0 0 4px;">' + titulo + '</h1>');
  h.push('<p style="color:#6b7280;margin:0 0 14px;">' + intro + '</p>');
  secciones.forEach(function (s) {
    h.push('<h2 style="color:#0f1b3d;font-size:13pt;margin:16px 0 6px;border-bottom:1px solid #e1e5ee;padding-bottom:3px;">' + s.t + '</h2>');
    if (s.p) h.push('<p style="margin:0 0 6px;">' + s.p + '</p>');
    if (s.li) h.push('<ul style="margin:0 0 6px;padding-left:20px;">' + s.li.map(function (x) { return '<li style="margin-bottom:3px;">' + x + '</li>'; }).join('') + '</ul>');
    if (s.tabla) {
      h.push('<table style="border-collapse:collapse;width:100%;margin:6px 0;">' + s.tabla.map(function (r) {
        return '<tr><td style="border:1px solid #e1e5ee;padding:5px 8px;width:26%;background:' + r[0] + ';font-weight:bold;">' + r[1] + '</td><td style="border:1px solid #e1e5ee;padding:5px 8px;">' + r[2] + '</td></tr>';
      }).join('') + '</table>');
    }
  });
  h.push('<p style="color:#9aa5b8;font-size:9pt;margin-top:22px;">Gestor de Documentos · Manual generado el ' + Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy') + '</p>');
  h.push('</body></html>');
  return h.join('');
}

function manualUnidad_() {
  return manualHtml_('Manual de la unidad de servicio',
    'Guía rápida para cargar tus documentos cada mes.',
    [
      { t: '1. Entrar y elegir el mes', p: 'Ingresa con tu cédula y el código de tu unidad. En la parte superior elige el <b>mes</b>: cada tema es una carpeta donde debes cargar tus documentos.' },
      { t: '2. Cargar un documento', li: [
        'Haz clic en la carpeta del tema (o en <b>Detalles</b>) y arrastra el archivo o pulsa <b>Seleccionar archivo</b>.',
        'Tamaño máximo por archivo: 25 MB. Puedes subir cualquier formato, salvo que el tema indique uno específico (por ejemplo, solo PDF); el panel te lo indica.',
        'El sistema le pone al archivo un nombre automático con la forma <b>unidad_tema_fecha</b>.',
        'Puedes cargar varios archivos en un mismo tema, y ver, descargar, renombrar o eliminar los tuyos.'
      ] },
      { t: '3. Qué significan los colores', tabla: [
        ['#e9f9ef', 'Verde · Aprobado', 'El administrador revisó y aceptó tu documento.'],
        ['#fff6d9', 'Amarillo · En revisión', 'Ya cargaste el archivo; falta que el administrador lo revise.'],
        ['#ffe9d6', 'Naranja · Rechazado', 'El archivo tiene un problema. Lee la observación, corrígelo y <b>vuelve a subirlo</b>.'],
        ['#fdeceb', 'Rojo · Vacío', 'Aún no has cargado nada en este tema. Si aparece <b>vencido</b>, la fecha límite ya pasó: cárgalo cuanto antes.'],
        ['#eef1f6', 'Gris · No aplica', 'Este tema no corresponde a tu unidad este mes.']
      ] },
      { t: '4. Fechas límite y temas opcionales', li: [
        'Cada tema puede tener una <b>fecha límite</b>; el panel te dice cuántos días te quedan.',
        'Los temas marcados como <b>opcionales</b> no cuentan para tu avance.',
        'Si un tema no corresponde a tu unidad este mes, pulsa <b>No aplica este mes</b> (solo disponible mientras el tema no tenga archivos).'
      ] },
      { t: '5. Avisos del administrador', p: 'Si el administrador te envía un recordatorio o rechaza un archivo, verás un aviso arriba en tu panel. Pulsa <b>Entendido</b> cuando lo hayas leído.' },
      { t: '6. Mes cerrado', p: 'Cuando un mes se cierra ya no se pueden cargar ni borrar archivos. Si te falta algo, pídele al administrador que lo reabra.' },
      { t: '7. Ayuda', p: 'Puedes repetir el recorrido guiado con el botón <b>Ayuda</b> (esquina superior) y descargar este manual cuando lo necesites.' }
    ]);
}

function manualAdmin_() {
  return manualHtml_('Manual del administrador',
    'Guía rápida del panel de seguimiento y revisión.',
    [
      { t: '1. Inicio', p: 'Muestra el cumplimiento por contrato, los temas que más se incumplen, las unidades más rezagadas y el avance semanal del mes elegido.' },
      { t: '2. Revisar archivos', li: [
        'En <b>Por revisar</b> verás los archivos recién cargados. <b>Aprueba</b> o <b>rechaza</b> cada uno; al rechazar debes escribir el motivo, que la unidad verá para corregir y volver a subir.',
        'También puedes revisar desde la <b>Matriz de estado</b>: haz clic en una casilla y revisa sus archivos.',
        'Un tema cumple cuando tiene al menos un archivo aprobado (o fue marcado como No aplica).'
      ] },
      { t: '3. Matriz de estado', tabla: [
        ['#e9f9ef', 'Verde', 'Aprobado'],
        ['#fff6d9', 'Amarillo', 'Por revisar'],
        ['#ffe9d6', 'Naranja', 'Rechazado (la unidad debe corregir)'],
        ['#fdeceb', 'Rojo', 'Vacío; con signo de exclamación si ya venció'],
        ['#eef1f6', 'Gris', 'No aplica']
      ] },
      { t: '4. Acciones masivas y recordatorios', li: [
        'Marca casillas de unidades y usa <b>No aplica</b> para varias a la vez, o <b>Aprobar pendientes</b>.',
        '<b>Recordar a las que tienen pendientes</b> envía un aviso que la unidad ve en su panel.',
        'Filtra y ordena por avance, por tema o solo las unidades con pendientes.'
      ] },
      { t: '5. Meses y temario', li: [
        'Crea un mes desde cero o <b>duplica el temario del mes anterior</b>.',
        'Cada tema puede ser obligatorio u opcional, tener fecha límite propia, aceptar solo ciertos tipos de archivo y exigirse solo a algunos contratos.',
        '<b>Cerrar mes</b> bloquea las cargas y lo deja archivado; puedes reabrirlo (y cambiar la fecha límite) si a alguna unidad le falta algo.'
      ] },
      { t: '6. Ficha de unidad y "Ver como unidad"', p: 'Desde la matriz o la lista de usuarios abre la ficha de una unidad: historial de todos los meses, archivos, observaciones y último cargue. <b>Ver como unidad</b> abre su panel en modo solo lectura para dar soporte.' },
      { t: '7. Papelera y bitácora', li: [
        'Todo lo que se elimina (archivos, temas, meses) va a la <b>Papelera</b>, desde donde se puede restaurar. Pasados ' + TRASH_DAYS + ' días puede borrarse definitivamente.',
        'La <b>Bitácora</b> registra quién cargó, borró, renombró, aprobó o cambió qué, y cuándo.'
      ] }
    ]);
}

function pdfPayload_(html, fileName) {
  const blob = Utilities.newBlob(html, 'text/html', 'manual.html').getAs('application/pdf');
  return { fileName: fileName, mimeType: 'application/pdf', base64Data: Utilities.base64Encode(blob.getBytes()) };
}

function apiGetManualPdf(token) {
  requireUserSession_(token);
  return pdfPayload_(manualUnidad_(), 'Manual_unidad_de_servicio.pdf');
}

function apiAdminGetManualPdf(token) {
  requireAdminSession_(token);
  return pdfPayload_(manualAdmin_(), 'Manual_administrador.pdf');
}
