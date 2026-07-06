// ============================================================
// OFFLINE.JS — Modo offline con IndexedDB
// ============================================================
// Qué resuelve:
//   1. LECTURAS: si no hay conexión (o Firebase tarda/falla), la
//      app muestra el último dato conocido guardado en IndexedDB
//      en vez de una tabla vacía.
//   2. ESCRITURAS: si el usuario registra una novedad sin conexión,
//      se guarda localmente con un ID temporal, se ve de inmediato
//      en la tabla, y se sincroniza sola con Firebase + Google Sheets
//      apenas vuelve la señal — sin que el usuario tenga que hacer
//      nada ni perder el registro.
//   3. INDICADOR VISUAL: banner fijo arriba que muestra "Sin conexión"
//      o "Sincronizando N registro(s) pendiente(s)".
//
// Cómo detecta conectividad real (no solo navigator.onLine, que
// puede decir "true" aunque Firebase esté bloqueado o inalcanzable):
// usamos el path especial `.info/connected` de Firebase Realtime
// Database, que refleja la conexión real al socket de Firebase.
//
// Uso desde otros módulos:
//   OfflineModule.cachedRead(cacheKey, () => ref.once('value'))
//       -> Promise<DataSnapshot | { val: () => cachedObject }>
//   OfflineModule.isOnline() -> boolean
//   OfflineModule.queueSubmission({ noveltyData, googleData, refPath })
//       -> { tempId } (guarda para sync posterior si offline)
//   OfflineModule.onStatusChange(callback) -> se dispara con {online, pendingCount}
// ============================================================

const OfflineModule = (() => {

    const DB_NAME = 'JER_OfflineDB';
    const DB_VERSION = 1;
    const STORE_CACHE = 'cache';
    const STORE_PENDING = 'pendingSubmissions';

    let _db = null;
    let _online = navigator.onLine; // valor inicial optimista, se corrige con .info/connected
    let _statusListeners = [];
    let _syncing = false;

    // ── Apertura de IndexedDB ───────────────────────────────────
    function _openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_CACHE)) {
                    db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(STORE_PENDING)) {
                    db.createObjectStore(STORE_PENDING, { keyPath: 'tempId' });
                }
            };
            req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror = (e) => {
                console.error('[Offline] No se pudo abrir IndexedDB:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    function _tx(storeName, mode) {
        return _openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
    }

    // ── Cache genérico de lecturas ───────────────────────────────
    async function _saveToCache(key, data) {
        try {
            const store = await _tx(STORE_CACHE, 'readwrite');
            store.put({ key, data, timestamp: Date.now() });
        } catch (e) {
            console.warn('[Offline] No se pudo guardar cache para', key, e);
        }
    }

    async function _readFromCache(key) {
        try {
            const store = await _tx(STORE_CACHE, 'readonly');
            return await new Promise((resolve) => {
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    // Lectura con caché: intenta Firebase con timeout corto; si falla
    // o no hay conexión real, devuelve el último dato cacheado.
    // fetchFn debe devolver una Promise que resuelve a un DataSnapshot
    // de Firebase (con método .val()).
    function cachedRead(cacheKey, fetchFn, { timeoutMs = 6000 } = {}) {
        return new Promise((resolve) => {
            let settled = false;

            const timeout = setTimeout(async () => {
                if (settled) return;
                settled = true;
                const cached = await _readFromCache(cacheKey);
                if (cached) {
                    console.warn(`[Offline] Timeout leyendo "${cacheKey}", usando cache local (${new Date(cached.timestamp).toLocaleString()})`);
                    resolve({ val: () => cached.data, fromCache: true, cachedAt: cached.timestamp });
                } else {
                    resolve({ val: () => null, fromCache: true, cachedAt: null });
                }
            }, timeoutMs);

            fetchFn().then(async (snapshot) => {
                if (settled) return; // ya se resolvió por timeout, ignorar respuesta tardía
                settled = true;
                clearTimeout(timeout);
                const data = snapshot.val();
                await _saveToCache(cacheKey, data);
                resolve(snapshot);
            }).catch(async (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                console.warn(`[Offline] Error leyendo "${cacheKey}", usando cache local:`, err.message);
                const cached = await _readFromCache(cacheKey);
                resolve({ val: () => (cached ? cached.data : null), fromCache: true, cachedAt: cached ? cached.timestamp : null });
            });
        });
    }

    // ── Cola de envíos pendientes (formulario de novedades) ─────
    async function queueSubmission({ noveltyData, googleData, refPath }) {
        const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const record = { tempId, noveltyData, googleData, refPath, timestamp: Date.now(), attempts: 0 };
        const store = await _tx(STORE_PENDING, 'readwrite');
        store.put(record);
        _notifyStatus();
        return { tempId };
    }

    async function _getPendingAll() {
        const store = await _tx(STORE_PENDING, 'readonly');
        return new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    async function _removePending(tempId) {
        const store = await _tx(STORE_PENDING, 'readwrite');
        store.delete(tempId);
    }

    async function getPendingCount() {
        const all = await _getPendingAll();
        return all.length;
    }

    // Intenta sincronizar todos los envíos pendientes, en orden.
    // Se detiene ante el primer fallo (para no perder el orden) y
    // reintentará en el próximo evento de reconexión o llamada manual.
    async function trySync() {
        if (_syncing || !_online) return;
        _syncing = true;
        try {
            const pending = await _getPendingAll();
            pending.sort((a, b) => a.timestamp - b.timestamp);

            for (const item of pending) {
                try {
                    const newRef = await database.ref(item.refPath).push(item.noveltyData);

                    // Reemplazar el registro temporal en memoria por el real,
                    // si sigue existiendo en la tabla actual.
                    if (typeof currentNovelties !== 'undefined') {
                        const idx = currentNovelties.findIndex(n => n.id === item.tempId);
                        if (idx !== -1) {
                            currentNovelties[idx] = { id: newRef.key, ...item.noveltyData };
                        }
                    }

                    // Reintentar el envío a Google Apps Script (best-effort:
                    // si falla, el dato YA está seguro en Firebase, así que
                    // no se re-encola, solo se avisa).
                    if (item.googleData && typeof enviarAGoogleSilencioso === 'function') {
                        try { await enviarAGoogleSilencioso(item.googleData); }
                        catch (e) { console.warn('[Offline] Google Sheets falló al sincronizar, se omite:', e.message); }
                    }

                    await _removePending(item.tempId);
                    if (typeof showToast === 'function') {
                        showToast('✅ Registro pendiente sincronizado', 'success');
                    }
                    if (typeof loadNoveltiesTable === 'function') loadNoveltiesTable();
                } catch (err) {
                    console.error('[Offline] Falló la sincronización de', item.tempId, err);
                    item.attempts = (item.attempts || 0) + 1;
                    const store = await _tx(STORE_PENDING, 'readwrite');
                    store.put(item);
                    break; // conservar orden: no seguir con el siguiente hasta resolver este
                }
            }
        } finally {
            _syncing = false;
            _notifyStatus();
        }
    }

    // ── Detección de conectividad real vía Firebase ─────────────
    function _initConnectivityWatcher() {
        try {
            database.ref('.info/connected').on('value', (snap) => {
                const wasOnline = _online;
                _online = snap.val() === true;
                _notifyStatus();
                if (_online && !wasOnline) {
                    console.log('[Offline] Conexión restablecida, sincronizando pendientes...');
                    trySync();
                }
            });
        } catch (e) {
            // Fallback simple si Firebase no está disponible aún
            window.addEventListener('online', () => { _online = true; _notifyStatus(); trySync(); });
            window.addEventListener('offline', () => { _online = false; _notifyStatus(); });
        }
    }

    function isOnline() { return _online; }

    function onStatusChange(cb) { _statusListeners.push(cb); }

    async function _notifyStatus() {
        const pendingCount = await getPendingCount();
        _statusListeners.forEach(cb => {
            try { cb({ online: _online, pendingCount }); } catch (e) {}
        });
        _renderBanner(_online, pendingCount);
    }

    // ── Banner visual de estado (tarjeta flotante y arrastrable) ──
    function _renderBanner(online, pendingCount) {
        let banner = document.getElementById('offlineBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offlineBanner';
            document.body.appendChild(banner); // NO usar prepend: evita que empuje el layout del formulario
            _hacerArrastrable(banner);
        }

        if (online && pendingCount === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'flex';
        if (!online) {
            banner.className = 'offline-banner offline-banner--offline';
            banner.innerHTML = `<span class="offline-banner-drag">⠿</span><span>🔴 Sin conexión — viendo datos guardados localmente${pendingCount > 0 ? ` · ${pendingCount} pendiente(s)` : ''}</span>`;
        } else if (pendingCount > 0) {
            banner.className = 'offline-banner offline-banner--syncing';
            banner.innerHTML = `<span class="offline-banner-drag">⠿</span><span>🟡 Sincronizando ${pendingCount} registro(s) pendiente(s)...</span>`;
        }
    }

    // Permite arrastrar la tarjeta con mouse o dedo, y la deja donde
    // el usuario la soltó (recordado en localStorage entre sesiones).
    // Al ser "position: fixed" y no estar en el flujo del documento,
    // nunca desplaza ni descuadra el resto del layout.
    function _hacerArrastrable(banner) {
        const guardada = localStorage.getItem('offlineBannerPos');
        if (guardada) {
            try {
                const { left, top } = JSON.parse(guardada);
                banner.style.left = left;
                banner.style.top = top;
                banner.style.right = 'auto';
                banner.style.bottom = 'auto';
            } catch (e) { /* usar posición por defecto del CSS (abajo-derecha) */ }
        }

        let arrastrando = false;
        let offsetX = 0, offsetY = 0;

        function iniciar(clientX, clientY) {
            arrastrando = true;
            const rect = banner.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            banner.classList.add('offline-banner--arrastrando');
        }

        function mover(clientX, clientY) {
            if (!arrastrando) return;
            const maxLeft = window.innerWidth - banner.offsetWidth - 4;
            const maxTop = window.innerHeight - banner.offsetHeight - 4;
            const left = Math.min(Math.max(4, clientX - offsetX), maxLeft);
            const top = Math.min(Math.max(4, clientY - offsetY), maxTop);
            banner.style.left = left + 'px';
            banner.style.top = top + 'px';
            banner.style.right = 'auto';
            banner.style.bottom = 'auto';
        }

        function soltar() {
            if (!arrastrando) return;
            arrastrando = false;
            banner.classList.remove('offline-banner--arrastrando');
            localStorage.setItem('offlineBannerPos', JSON.stringify({ left: banner.style.left, top: banner.style.top }));
        }

        banner.addEventListener('mousedown', (e) => { iniciar(e.clientX, e.clientY); e.preventDefault(); });
        window.addEventListener('mousemove', (e) => mover(e.clientX, e.clientY));
        window.addEventListener('mouseup', soltar);

        banner.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            iniciar(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (!arrastrando) return;
            const t = e.touches[0];
            mover(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchend', soltar);
    }

    // ── Inicialización ───────────────────────────────────────────
    function init() {
        _openDB().catch(() => {
            console.error('[Offline] IndexedDB no disponible en este navegador. El modo offline no funcionará.');
        });
        _initConnectivityWatcher();
        _notifyStatus();
    }

    return {
        init,
        isOnline,
        cachedRead,
        queueSubmission,
        trySync,
        getPendingCount,
        onStatusChange
    };
})();

document.addEventListener('DOMContentLoaded', () => OfflineModule.init());
