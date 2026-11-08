function showAlert(el, message, type) {
  el.textContent = message;
  el.className = 'alert alert-' + (type === 'ok' ? 'ok' : 'error');
  el.style.display = 'block';
}
function hideAlert(el) { el.style.display = 'none'; }

function formatBytes(bytes) {
  bytes = Number(bytes) || 0;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Lee un <input type="file"> como { fileName, mimeType, base64Data }
function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const result = e.target.result; // "data:<mime>;base64,<data>"
      const commaIdx = result.indexOf(',');
      const meta = result.substring(5, result.indexOf(';'));
      resolve({
        fileName: file.name,
        mimeType: meta || file.type || 'application/octet-stream',
        base64Data: result.substring(commaIdx + 1)
      });
    };
    reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
    reader.readAsDataURL(file);
  });
}

// Dispara la descarga de un archivo recibido como { fileName, mimeType, base64Data }
function triggerDownload(fileResult, mode) {
  const byteChars = atob(fileResult.base64Data);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: fileResult.mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  if (mode === 'view') {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileResult.fileName || 'archivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
}

// ---- Indicador de carga global (barra superior) ----
let busyCount_ = 0;
function topLoader_() {
  let el = document.getElementById('topLoader');
  if (!el) { el = document.createElement('div'); el.id = 'topLoader'; document.body.appendChild(el); }
  return el;
}
function setBusy_(delta) {
  busyCount_ = Math.max(0, busyCount_ + delta);
  topLoader_().classList.toggle('on', busyCount_ > 0);
}

// Envuelve google.script.run en una Promesa para usar async/await.
// Cada llamada enciende la barra de carga superior mientras espera la respuesta.
function gsRun(fnName) {
  const args = Array.prototype.slice.call(arguments, 1);
  setBusy_(1);
  // text/plain evita el preflight CORS (Apps Script no responde OPTIONS)
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn: fnName, args: args }),
    redirect: 'follow'
  })
    .then(function (res) { return res.json(); })
    .then(function (d) {
      setBusy_(-1);
      if (!d.ok) throw new Error(d.error || 'Error del servidor.');
      return d.result;
    })
    .catch(function (err) {
      if (busyCount_ > 0 && !(err && err._counted)) setBusy_(-1);
      if (err instanceof TypeError) err = new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      err._counted = true;
      throw err;
    });
}

// Atenúa un contenedor y muestra un spinner mientras dura fn() (cambio de mes, filtros, etc.)
async function withLoading(el, fn) {
  if (el) el.classList.add('is-loading');
  try { return await fn(); }
  finally { if (el) el.classList.remove('is-loading'); }
}

// Bloques "esqueleto" para la primera carga de una lista o tabla
function skeletonHtml(rows) {
  let h = '';
  for (let i = 0; i < (rows || 5); i++) h += '<div class="skel skel-row" style="opacity:' + (1 - i * 0.12).toFixed(2) + ';"></div>';
  return h;
}

// Deshabilita un botón y le pone estado "ocupado" mientras corre fn()
async function withBusyBtn(btn, fn) {
  if (btn) btn.classList.add('is-busy');
  try { return await fn(); }
  finally { if (btn) btn.classList.remove('is-busy'); }
}

// '2026-10-15' -> '15 oct 2026'
function fmtDay(s) {
  if (!s) return '';
  const p = String(s).slice(0, 10).split('-');
  const m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return parseInt(p[2], 10) + ' ' + m[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

// ---- Recorrido guiado ----
// steps: [{ sel: '#idDelElemento', title, text }]. Los pasos cuyo elemento no existe se omiten.
function startTour(steps, onEnd) {
  const list = steps.filter(function (s) { return document.querySelector(s.sel); });
  if (!list.length) { if (onEnd) onEnd(); return; }
  let i = 0;
  const block = document.createElement('div'); block.className = 'tour-block';
  const hole = document.createElement('div'); hole.className = 'tour-hole';
  const tip = document.createElement('div'); tip.className = 'tour-tip';
  document.body.appendChild(block); document.body.appendChild(hole); document.body.appendChild(tip);
  function end() {
    block.remove(); hole.remove(); tip.remove();
    window.removeEventListener('resize', place);
    document.removeEventListener('keydown', onKey);
    if (onEnd) onEnd();
  }
  function onKey(e) { if (e.key === 'Escape') end(); }
  function place() {
    const st = list[i];
    const el = document.querySelector(st.sel);
    if (!el) { end(); return; }
    const r = el.getBoundingClientRect();
    const pad = 6;
    hole.style.left = (r.left - pad) + 'px'; hole.style.top = (r.top - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px'; hole.style.height = (r.height + pad * 2) + 'px';
    const tw = Math.min(330, window.innerWidth - 24);
    let top = r.bottom + 14;
    if (top + tip.offsetHeight > window.innerHeight - 10) top = Math.max(10, r.top - tip.offsetHeight - 14);
    let left = Math.min(Math.max(12, r.left), window.innerWidth - tw - 12);
    tip.style.top = top + 'px'; tip.style.left = left + 'px';
  }
  function show() {
    const st = list[i];
    const el = document.querySelector(st.sel);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    tip.innerHTML = '<h3>' + escapeHtml(st.title) + '</h3><p>' + escapeHtml(st.text) + '</p>' +
      '<div class="tt-foot"><span class="tt-step">' + (i + 1) + ' de ' + list.length + '</span>' +
      (i > 0 ? '<button class="btn btn-secondary btn-sm" data-prev type="button">Anterior</button>' : '<button class="btn btn-ghost btn-sm" data-skip type="button">Saltar</button>') +
      '<button class="btn btn-primary btn-sm" data-next type="button">' + (i === list.length - 1 ? 'Terminar' : 'Siguiente') + '</button></div>';
    tip.querySelector('[data-next]').addEventListener('click', function () { if (i >= list.length - 1) end(); else { i++; show(); } });
    const pv = tip.querySelector('[data-prev]'); if (pv) pv.addEventListener('click', function () { i--; show(); });
    const sk = tip.querySelector('[data-skip]'); if (sk) sk.addEventListener('click', end);
    place();
    setTimeout(place, 60);
  }
  window.addEventListener('resize', place);
  document.addEventListener('keydown', onKey);
  show();
}

const MAX_FILE_MB = 25;

// Iniciales para el avatar circular a partir del nombre de la unidad
function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Icono SVG segun la extension del archivo (como texto, listo para insertar con innerHTML)
function fileTypeIcon(fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  const S = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) {
    return '<svg ' + S + '><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  }
  if (ext === 'pdf') {
    return '<svg ' + S + '><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v6M13 12v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1zM19 12h-2v6"/></svg>';
  }
  if (['zip', 'rar', '7z'].indexOf(ext) !== -1) {
    return '<svg ' + S + '><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v2M12 8v2M12 12v2M12 16v2"/></svg>';
  }
  if (['doc', 'docx'].indexOf(ext) !== -1) {
    return '<svg ' + S + '><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/></svg>';
  }
  if (['xls', 'xlsx'].indexOf(ext) !== -1) {
    return '<svg ' + S + '><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13l6 6M15 13l-6 6"/></svg>';
  }
  return '<svg ' + S + '><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/></svg>';
}

// Escapa un valor para insertarlo como celda CSV (comillas dobles si hace falta)
function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Descarga un string de texto como archivo (usado para exportar CSV/Excel)
function downloadTextFile(filename, content, mime) {
  const blob = new Blob(['\uFEFF' + content], { type: (mime || 'text/csv') + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
}

// Separa "archivo.pdf" en { base: 'archivo', ext: '.pdf' } (ext incluye el
// punto; ext es '' si el archivo no tiene extensión)
function splitFileName(name) {
  const str = String(name || '');
  const idx = str.lastIndexOf('.');
  if (idx <= 0) return { base: str, ext: '' };
  return { base: str.slice(0, idx), ext: str.slice(idx) };
}

// ---- Toasts de progreso de carga ----
// la subida no expone el avance real en bytes de una subida, así que
// el porcentaje se simula suavemente mientras se espera la respuesta del
// servidor y salta a 100% (éxito) o se detiene y marca error si falla.
function getToastContainer_() {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    document.body.appendChild(c);
  }
  return c;
}

const TOAST_ICON_SPIN = '<svg class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg>';
const TOAST_ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const TOAST_ICON_X = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

// Crea un toast de carga para un archivo. Devuelve { success(msg), error(msg) }
// para que quien lo use actualice el estado final cuando termine la llamada.
function showUploadToast(fileName) {
  const container = getToastContainer_();
  const el = document.createElement('div');
  el.className = 'toast toast-uploading';
  el.innerHTML =
    '<div class="toast-icon">' + TOAST_ICON_SPIN + '</div>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + escapeHtml(fileName) + '</div>' +
      '<div class="toast-track"><div class="toast-fill" style="width:0%"></div></div>' +
      '<div class="toast-sub">Subiendo... 0%</div>' +
    '</div>' +
    '<button class="toast-close" title="Cerrar">&times;</button>';
  container.appendChild(el);
  el.querySelector('.toast-close').addEventListener('click', function () { el.remove(); });

  let pct = 0;
  const fill = el.querySelector('.toast-fill');
  const sub = el.querySelector('.toast-sub');
  function setPct(p) {
    pct = p;
    fill.style.width = pct + '%';
    sub.textContent = 'Subiendo... ' + Math.round(pct) + '%';
  }
  const timer = setInterval(function () {
    setPct(Math.min(90, pct + (90 - pct) * 0.1 + 0.5));
  }, 180);

  return {
    success: function (msg) {
      clearInterval(timer);
      setPct(100);
      el.className = 'toast toast-success';
      el.querySelector('.toast-icon').innerHTML = TOAST_ICON_CHECK;
      sub.textContent = msg || 'Cargado correctamente.';
      setTimeout(function () { el.remove(); }, 4000);
    },
    error: function (msg) {
      clearInterval(timer);
      el.className = 'toast toast-error';
      el.querySelector('.toast-icon').innerHTML = TOAST_ICON_X;
      sub.textContent = msg || 'No se pudo subir el archivo.';
    }
  };
}

// Habilita arrastrar-y-soltar sobre un elemento .dropzone que contiene un <input type=file>
function enableDropzone(zoneEl, onFile) {
  const input = zoneEl.querySelector('input[type=file]');
  input.addEventListener('change', function () {
    if (input.files.length) onFile(input.files[0]);
  });
  ['dragenter', 'dragover'].forEach(function (evt) {
    zoneEl.addEventListener(evt, function (e) { e.preventDefault(); zoneEl.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    zoneEl.addEventListener(evt, function (e) { e.preventDefault(); zoneEl.classList.remove('dragover'); });
  });
  zoneEl.addEventListener('drop', function (e) {
    if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
  });
}

// ---- Navegación entre páginas (sitio estático) ----
const PAGE_FILES = { 'login': 'index.html', 'register': 'register.html', 'dashboard': 'dashboard.html', 'admin-login': 'admin-login.html', 'admin': 'admin.html' };
function pageUrl(name, query) { return PAGE_FILES[name] + (query ? '?' + query : ''); }
function goTo(name, query) { window.location.href = pageUrl(name, query); }

// ---- Aviso "Deshacer" (borrado diferido de 10 s) ----
// El elemento se oculta de inmediato en pantalla, pero la llamada al servidor (que lo manda a la
// papelera) solo se hace cuando termina la cuenta regresiva. Si la persona pulsa "Deshacer" antes,
// no se llama al servidor y el elemento vuelve a mostrarse.
//
// opts: {
//   title:   'Archivo eliminado',
//   detail:  'nombre del archivo',
//   seconds: 10,                          (opcional)
//   call:    ['apiDeleteFile', token, id], (función del backend + argumentos)
//   onHide():            oculta el elemento en la interfaz (se ejecuta al instante)
//   onUndo():            lo vuelve a mostrar (Deshacer, o si el servidor falla)
//   onCommitted(result): se ejecuta cuando el servidor confirmó el borrado
//   onError(err):        se ejecuta si el servidor falló
// }
const UNDO_SECONDS = 10;
const undoPending_ = new Set();

function getUndoContainer_() {
  let c = document.getElementById('undoContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'undoContainer';
    document.body.appendChild(c);
  }
  return c;
}

function deleteWithUndo(opts) {
  const seconds = opts.seconds || UNDO_SECONDS;
  const el = document.createElement('div');
  el.className = 'undo-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML =
    '<div class="undo-main">' +
      '<div class="undo-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7"/></svg></div>' +
      '<div class="undo-body">' +
        '<div class="undo-title">' + escapeHtml(opts.title || 'Elemento eliminado') + '</div>' +
        '<div class="undo-detail" title="' + escapeHtml(opts.detail || '') + '">' + escapeHtml(opts.detail || '') + '</div>' +
        '<div class="undo-sub"></div>' +
      '</div>' +
      '<button type="button" class="undo-btn">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>Deshacer' +
      '</button>' +
    '</div>' +
    '<div class="undo-bar"><i style="animation-duration:' + seconds + 's"></i></div>';
  getUndoContainer_().appendChild(el);

  const item = { call: opts.call, done: false };
  undoPending_.add(item);
  if (opts.onHide) opts.onHide();

  const sub = el.querySelector('.undo-sub');
  const deadline = Date.now() + seconds * 1000;
  function paint() {
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    sub.textContent = 'Se enviará a la papelera en ' + left + ' s';
  }
  paint();
  const tick = setInterval(paint, 250);
  const timer = setTimeout(commit, seconds * 1000);

  function close() {
    clearInterval(tick); clearTimeout(timer);
    undoPending_.delete(item);
    el.classList.add('out');
    setTimeout(function () { el.remove(); }, 220);
  }
  function undo() {
    if (item.done) return;
    item.done = true; close();
    if (opts.onUndo) opts.onUndo();
  }
  function commit() {
    if (item.done) return;
    item.done = true; close();
    gsRun.apply(null, opts.call).then(function (r) {
      if (opts.onCommitted) opts.onCommitted(r);
    }).catch(function (err) {
      if (opts.onUndo) opts.onUndo();
      if (opts.onError) opts.onError(err);
    });
  }
  el.querySelector('.undo-btn').addEventListener('click', undo);
  return { undo: undo, commit: commit };
}

// Si la persona cierra la pestaña o cambia de página antes de los 10 s, el borrado se confirma
// de todos modos (fetch con keepalive sobrevive a la navegación).
window.addEventListener('pagehide', function () {
  undoPending_.forEach(function (item) {
    if (item.done) return;
    item.done = true;
    try {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: item.call[0], args: item.call.slice(1) }),
        keepalive: true
      });
    } catch (e) {}
  });
});
