// ============================================================
// NOTIFICACIONES.JS — Campanita de notificaciones
// ============================================================
// Alcance (según lo acordado): notificaciones SOLO mientras el
// panel está abierto en el navegador. No usa Service Worker ni
// Firebase Cloud Messaging, así que no llegan con la pestaña
// cerrada — pero si el usuario minimiza la ventana o cambia de
// pestaña, sí llega como notificación nativa del sistema gracias
// a la Notification API estándar del navegador.
//
// Dispara notificación cuando detecta:
//   1. Una novedad con datos nutricionales marcados "pendiente"
//      (novelty.nutricion.pendiente === true)
//   2. Una novedad sin resolver (cuentameStatus pendiente/vacío)
//      que lleva más de UMBRAL_DIAS_SIN_RESOLVER días desde su
//      registro (novelty.timestamp)
//
// No requiere backend ni cambios en Firebase: escanea el array
// `currentNovelties` que ya mantiene novedades.js cada vez que
// se recarga la tabla.
//
// Comportamiento de la lista:
//   - Al ver/abrir una notificación, o al pulsar "Limpiar todas",
//     esa(s) notificación(es) se BORRAN del panel — queda limpio.
//   - Si al día siguiente la condición sigue pendiente (no se
//     resolvió), se vuelve a avisar automáticamente aunque ya se
//     haya leído antes (recordatorio cada 24h mientras siga pendiente).
//   - Si la condición se resuelve, se olvida por completo: si en el
//     futuro vuelve a quedar pendiente, avisa de inmediato sin
//     esperar el ciclo de 24h.
// ============================================================

const NotificacionesModule = (() => {

    const UMBRAL_DIAS_SIN_RESOLVER = 5; // ajustable a gusto
    const INTERVALO_ESCANEO_MS = 60 * 1000; // revisa cada 1 minuto
    const REPETIR_AVISO_MS = 24 * 60 * 60 * 1000; // si sigue pendiente, vuelve a avisar cada 24h

    let _notificaciones = [];   // notificaciones activas SIN LEER (se eliminan al leerlas)
    let _ultimoAviso = new Map(); // clave "tipo:id" -> timestamp del último aviso emitido
    let _dropdownAbierto = false;

    // ── Helpers ──────────────────────────────────────────────────
    function _nombreDe(n) {
        return n.name || n.ingreso?.name || n.retiro?.name || 'Beneficiario sin nombre';
    }

    function _diasDesde(fechaISO) {
        const ms = Date.now() - new Date(fechaISO).getTime();
        return Math.floor(ms / 86400000);
    }

    // ── Permiso de notificaciones del navegador ─────────────────
    function _permisoDisponible() {
        return typeof Notification !== 'undefined';
    }

    function solicitarPermiso() {
        if (!_permisoDisponible()) {
            if (typeof showToast === 'function') {
                showToast('Este navegador no soporta notificaciones nativas, pero la campanita seguirá funcionando dentro de la app.', 'info');
            }
            return;
        }
        if (Notification.permission === 'default') {
            Notification.requestPermission().then((perm) => {
                if (typeof showToast === 'function') {
                    showToast(perm === 'granted'
                        ? '🔔 Notificaciones activadas'
                        : '🔕 No se activaron las notificaciones del sistema (puedes seguir viéndolas en la campanita)', 'info');
                }
            });
        }
    }

    // ── Escaneo periódico de novedades ──────────────────────────
    // Vuelve a avisar sobre lo mismo si:
    //   - nunca se ha avisado de esta condición, o
    //   - ya pasó REPETIR_AVISO_MS (24h) desde el último aviso y
    //     la condición sigue vigente (sigue pendiente).
    // Si la condición ya se resolvió (se completó el dato nutricional,
    // se resolvió la novedad), se olvida el registro para que, si en
    // el futuro vuelve a quedar pendiente, avise de inmediato.
    function escanear() {
        if (typeof currentNovelties === 'undefined' || !Array.isArray(currentNovelties)) return;
        const ahora = Date.now();
        const idsVigentes = new Set(currentNovelties.map(n => n.id));

        // Limpiar del mapa cualquier novedad que ya no exista (fue eliminada)
        for (const clave of _ultimoAviso.keys()) {
            const id = clave.split(':').slice(1).join(':');
            if (!idsVigentes.has(id)) _ultimoAviso.delete(clave);
        }

        currentNovelties.forEach(n => {
            if (!n || !n.id) return;

            // 1. Dato nutricional pendiente
            const claveNutricion = 'nutricion:' + n.id;
            if (n.nutricion?.pendiente === true) {
                _evaluarYAvisar(claveNutricion, ahora, () => ({
                    tipo: 'nutricion',
                    icono: '🍎',
                    titulo: 'Dato nutricional pendiente',
                    mensaje: `${_nombreDe(n)} necesita completar sus datos nutricionales.`,
                    novedadId: n.id
                }));
            } else {
                _ultimoAviso.delete(claveNutricion); // se resolvió, olvidar para avisar de inmediato si vuelve a pasar
            }

            // 2. Novedad sin resolver hace más de X días
            const claveSinResolver = 'sinresolver:' + n.id;
            const sinResolver = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
            const fechaRef = n.timestamp || n.date;
            if (sinResolver && fechaRef && _diasDesde(fechaRef) >= UMBRAL_DIAS_SIN_RESOLVER) {
                const dias = _diasDesde(fechaRef);
                _evaluarYAvisar(claveSinResolver, ahora, () => ({
                    tipo: 'sinresolver',
                    icono: '⏳',
                    titulo: 'Novedad sin resolver',
                    mensaje: `${_nombreDe(n)} lleva ${dias} días sin resolver.`,
                    novedadId: n.id
                }));
            } else {
                _ultimoAviso.delete(claveSinResolver); // se resolvió, olvidar
            }
        });
    }

    function _evaluarYAvisar(clave, ahora, construirNotificacion) {
        const ultimo = _ultimoAviso.get(clave);
        if (ultimo !== undefined && (ahora - ultimo) < REPETIR_AVISO_MS) return; // ya se avisó recientemente
        _ultimoAviso.set(clave, ahora);
        _agregar(construirNotificacion());
    }

    // ── Registrar y disparar una notificación ───────────────────
    function _agregar({ tipo, icono, titulo, mensaje, novedadId }) {
        const registro = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            tipo, icono, titulo, mensaje, novedadId,
            fecha: Date.now()
        };
        _notificaciones.unshift(registro);
        if (_notificaciones.length > 50) _notificaciones.length = 50; // límite de seguridad

        _actualizarBadge();
        if (_dropdownAbierto) _renderDropdown();

        // Toast dentro de la app (siempre)
        if (typeof showToast === 'function') {
            showToast(`${icono} ${titulo}`, 'warning');
        }

        // Notificación nativa del sistema — solo si el usuario cambió de
        // pestaña o minimizó (si está mirando la app, el toast ya basta)
        _dispararNotificacionNativa(registro);
    }

    function _dispararNotificacionNativa(registro) {
        if (!_permisoDisponible() || Notification.permission !== 'granted') return;
        if (!document.hidden) return; // el toast ya es suficiente si está visible

        try {
            const notif = new Notification(registro.titulo, {
                body: registro.mensaje,
                tag: registro.tipo + ':' + registro.novedadId, // evita duplicados nativos
                icon: 'LOGOJER.png'
            });
            notif.onclick = () => {
                window.focus();
                marcarLeida(registro.id);
                abrirDesdeNotificacion(registro.novedadId);
                notif.close();
            };
        } catch (e) {
            console.warn('[Notificaciones] No se pudo mostrar notificación nativa:', e);
        }
    }

    // ── Interacción: abrir la novedad referida por una notificación ──
    async function abrirDesdeNotificacion(novedadId) {
        if (!novedadId) return;
        if (!AsociacionesModule.isAdminAutenticado()) {
            await promptAdminAccess();
            if (!AsociacionesModule.isAdminAutenticado()) return;
        }
        openAdminPanel();
        cerrarDropdown();
        if (typeof viewNovelty === 'function') viewNovelty(novedadId);
    }

    function marcarLeida(id) {
        const idx = _notificaciones.findIndex(x => x.id === id);
        if (idx !== -1) _notificaciones.splice(idx, 1);
        _actualizarBadge();
        if (_dropdownAbierto) _renderDropdown();
    }

    function marcarTodasLeidas() {
        _notificaciones = [];
        _actualizarBadge();
        if (_dropdownAbierto) _renderDropdown();
    }

    function _contarNoLeidas() {
        return _notificaciones.length;
    }

    // ── UI: campanita + badge + dropdown ─────────────────────────
    function _actualizarBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const count = _contarNoLeidas();
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    function toggleDropdown() {
        _dropdownAbierto = !_dropdownAbierto;
        const dropdown = document.getElementById('notifDropdown');
        if (!dropdown) return;
        dropdown.style.display = _dropdownAbierto ? 'block' : 'none';
        if (_dropdownAbierto) {
            _renderDropdown();
            solicitarPermiso(); // primer clic del usuario = buen momento para pedir permiso
        }
    }

    function cerrarDropdown() {
        _dropdownAbierto = false;
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    function _renderDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        if (!dropdown) return;

        if (_notificaciones.length === 0) {
            dropdown.innerHTML = `
                <div class="notif-dropdown-header">
                    <span>Notificaciones</span>
                </div>
                <div class="notif-empty">🔕 Sin notificaciones por ahora</div>`;
            return;
        }

        const items = _notificaciones.map(n => `
            <div class="notif-item"
                 onclick="NotificacionesModule.marcarLeida('${n.id}'); NotificacionesModule.abrirDesdeNotificacion('${n.novedadId}');">
                <span class="notif-item-icono">${n.icono}</span>
                <div class="notif-item-texto">
                    <div class="notif-item-titulo">${n.titulo}</div>
                    <div class="notif-item-mensaje">${n.mensaje}</div>
                    <div class="notif-item-fecha">${new Date(n.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        `).join('');

        dropdown.innerHTML = `
            <div class="notif-dropdown-header">
                <span>Notificaciones</span>
                <button onclick="NotificacionesModule.marcarTodasLeidas()">Limpiar todas</button>
            </div>
            <div class="notif-list">${items}</div>`;
    }

    function _inyectarUI() {
        if (document.getElementById('notifBellBtn')) return; // ya existe

        const contenedor = document.createElement('div');
        contenedor.className = 'notif-bell-container';
        contenedor.innerHTML = `
            <button id="notifBellBtn" class="notif-bell-btn" title="Notificaciones" onclick="NotificacionesModule.toggleDropdown()">
                🔔<span id="notifBadge" class="notif-badge" style="display:none">0</span>
            </button>
            <div id="notifDropdown" class="notif-dropdown" style="display:none"></div>
        `;

        // Se inserta dentro del encabezado del panel admin, junto a los
        // demás botones (Ajustes / Cambiar Asociación / Cerrar Sesión)
        const anclaje = document.querySelector('#adminPanel .flex.gap-3.flex-wrap');
        if (anclaje) {
            anclaje.prepend(contenedor);
        } else {
            // Fallback: flotante fija si no se encuentra el encabezado esperado
            contenedor.classList.add('notif-bell-container--flotante');
            document.body.appendChild(contenedor);
        }

        // Cerrar el dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!_dropdownAbierto) return;
            const dropdown = document.getElementById('notifDropdown');
            const btn = document.getElementById('notifBellBtn');
            if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
                cerrarDropdown();
            }
        });
    }

    // ── Inicialización ───────────────────────────────────────────
    function init() {
        _inyectarUI();
        escanear(); // primer escaneo inmediato si ya hay datos cargados
        setInterval(escanear, INTERVALO_ESCANEO_MS);
    }

    return {
        init,
        escanear,
        solicitarPermiso,
        toggleDropdown,
        cerrarDropdown,
        marcarLeida,
        marcarTodasLeidas,
        abrirDesdeNotificacion
    };
})();

document.addEventListener('DOMContentLoaded', () => NotificacionesModule.init());
