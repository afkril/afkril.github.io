// ============================================================
// ADMIN-UI.JS — Lógica de la nueva interfaz visual del panel
// administrativo: menú de usuario del topbar, tarjetas de
// estadísticas rápidas y widgets laterales (Resumen de Hoy,
// Última Novedad, Consejo del día).
//
// No sustituye la lógica de datos existente (novedades.js,
// charts.js, papelera.js): sólo LEE los arrays que esos módulos
// ya mantienen (currentNovelties, archivedNovelties,
// todosLosDatosNovelties) para pintar la cabecera nueva.
// ============================================================

const AdminUI = (() => {

    const CONSEJOS_DEL_DIA = [
        'Verifica diariamente las novedades pendientes para mantener la información actualizada.',
        'Revisa la Papelera de vez en cuando: los registros eliminados se purgan solos a los 7 días.',
        'Usa los filtros por Regional, Contrato o UDS para encontrar novedades más rápido.',
        'Marca como "cargado al CUENTAME" apenas proceses una novedad, para no perder el orden.',
        'Los registros con el badge "DUP" pueden indicar un documento repetido: revísalos antes de archivar.',
        'Exporta un respaldo en Excel al cierre de cada mes para tener siempre una copia local.'
    ];

    function _el(id) { return document.getElementById(id); }

    function _setText(id, value) {
        const node = _el(id);
        if (node) node.textContent = value;
    }

    function toggleUserMenu(event) {
        if (event) event.stopPropagation();
        const dropdown = _el('adminUserDropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('open');
    }

    function _cerrarUserMenuAlClickFuera() {
        document.addEventListener('click', (e) => {
            const dropdown = _el('adminUserDropdown');
            const btn = _el('adminUserMenuBtn');
            if (!dropdown || !dropdown.classList.contains('open')) return;
            if (dropdown.contains(e.target) || (btn && btn.contains(e.target))) return;
            dropdown.classList.remove('open');
        });
    }

    // ── Menú "Exportar" (dropdown) ─────────────────────────────────
    function toggleExportMenu(event) {
        if (event) event.stopPropagation();
        const menu = _el('exportMenu');
        if (!menu) return;
        const wasOpen = menu.classList.contains('open');
        closeExportMenu();
        if (!wasOpen) menu.classList.add('open');
    }

    function closeExportMenu() {
        const menu = _el('exportMenu');
        const sub = _el('exportExcelSub');
        if (menu) menu.classList.remove('open');
        if (sub) sub.classList.remove('open');
    }

    function toggleExportExcelSub(event) {
        if (event) event.stopPropagation();
        const sub = _el('exportExcelSub');
        if (!sub) return;
        sub.classList.toggle('open');
    }

    function _cerrarExportMenuAlClickFuera() {
        document.addEventListener('click', (e) => {
            const menu = _el('exportMenu');
            const btn = _el('exportMenuBtn');
            if (!menu || !menu.classList.contains('open')) return;
            if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
            closeExportMenu();
        });
    }

    // ── Sidebar admin colapsable ──────────────────────────────────
    function toggleAdminSidebar() {
        const sidebar = _el('adminSidebar');
        const icon = _el('adminSidebarToggleIcon');
        if (!sidebar) return;
        const collapsed = sidebar.classList.toggle('collapsed');
        if (icon) icon.textContent = collapsed ? '»' : '«';
        try { localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0'); } catch (e) {}
    }

    function _restaurarSidebarColapsada() {
        try {
            if (localStorage.getItem('adminSidebarCollapsed') === '1') {
                const sidebar = _el('adminSidebar');
                const icon = _el('adminSidebarToggleIcon');
                if (sidebar) sidebar.classList.add('collapsed');
                if (icon) icon.textContent = '»';
            }
        } catch (e) {}
    }

    function _esHoy(timestamp) {
        if (!timestamp) return false;
        const hoy = new Date();
        const fecha = new Date(timestamp);
        return fecha.getFullYear() === hoy.getFullYear() &&
               fecha.getMonth() === hoy.getMonth() &&
               fecha.getDate() === hoy.getDate();
    }

    function _documentosDe(n) {
        const docs = [];
        if (n.document) docs.push(n.document);
        if (n.retiro && n.retiro.document) docs.push(n.retiro.document);
        if (n.ingreso && n.ingreso.document) docs.push(n.ingreso.document);
        return docs;
    }

    function _esDuplicado(n) {
        if (typeof checkDuplicate !== 'function') return false;
        return _documentosDe(n).some(doc => !!checkDuplicate(doc, n.id));
    }

    // ── Tarjetas de estadísticas del topbar ──────────────────────
    function _actualizarStatsTop() {
        const base = (typeof todosLosDatosNovelties !== 'undefined' && todosLosDatosNovelties.length)
            ? todosLosDatosNovelties
            : (typeof currentNovelties !== 'undefined' ? currentNovelties : []);

        let pendientes = 0, pendHoy = 0;
        let ingresos = 0, ingHoy = 0;
        let retiros = 0, retHoy = 0;
        let duplicados = 0, dupHoy = 0;

        base.forEach(n => {
            const hoy = _esHoy(n.timestamp);

            if (n.cuentameStatus !== 'cargado') { pendientes++; if (hoy) pendHoy++; }

            const esIngreso = n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso;
            const esRetiro = n.type === 'retiro' || n.type === 'ambos' || n.hasRetiro;
            if (esIngreso) { ingresos++; if (hoy) ingHoy++; }
            if (esRetiro) { retiros++; if (hoy) retHoy++; }

            if (_esDuplicado(n)) { duplicados++; if (hoy) dupHoy++; }
        });

        _setText('statPendientesTop', pendientes);
        _setText('statPendientesDelta', `+${pendHoy} hoy`);
        _setText('statIngresosTop', ingresos);
        _setText('statIngresosDelta', `+${ingHoy} hoy`);
        _setText('statRetirosTop', retiros);
        _setText('statRetirosDelta', `+${retHoy} hoy`);
        _setText('statDuplicadosTop', duplicados);
        _setText('statDuplicadosDelta', `+${dupHoy} hoy`);
        _setText('statTotalTop', base.length);

        // Contadores del menú lateral
        if (typeof currentNovelties !== 'undefined') _setText('countActivas', currentNovelties.length);
        if (typeof archivedNovelties !== 'undefined') _setText('countArchivadas', archivedNovelties.length);
        const pendientesNutricion = base.filter(n => (n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente).length;
        _setText('countNutricional', pendientesNutricion);

        return { pendientes, pendHoy, ingresos, ingHoy, retiros, retHoy, duplicados, dupHoy, base };
    }

    // ── Widget: Resumen de Hoy ────────────────────────────────────
    function _actualizarWidgetHoy(stats) {
        const hoy = new Date();
        _setText('widgetFechaHoy', hoy.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }));
        _setText('widgetHoyIngresos', stats.ingHoy);
        _setText('widgetHoyRetiros', stats.retHoy);
        _setText('widgetHoyDuplicados', stats.dupHoy);
        _setText('widgetHoyPendientes', stats.pendHoy);
    }

    // ── Widget: Última Novedad ─────────────────────────────────────
    function _actualizarWidgetUltima(stats) {
        const cont = _el('widgetUltimaNovedad');
        if (!cont) return;

        const lista = stats.base.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const ultima = lista[0];

        if (!ultima) {
            cont.innerHTML = '<p class="admin-widget-empty">Sin registros aún</p>';
            return;
        }

        const nombre = ultima.name || ultima.ingreso?.name || ultima.retiro?.name || 'Sin nombre';
        const tipo = (ultima.type === 'ambos') ? 'AMBOS' : (ultima.type || '').toUpperCase();
        const badgeClase = ultima.type === 'retiro' ? 'badge-retiro' : (ultima.type === 'ingreso' ? 'badge-ingreso' : 'badge-ambos');
        const fecha = new Date(ultima.timestamp);
        const fechaTxt = isNaN(fecha) ? '' : fecha.toLocaleDateString('es-CO');
        const horaTxt = isNaN(fecha) ? '' : fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        cont.innerHTML = `
            <div class="aw-name">${nombre}</div>
            <span class="badge ${badgeClase}">${tipo || 'N/A'}</span>
            <p class="aw-meta">${fechaTxt}${horaTxt ? ' · ' + horaTxt : ''}</p>
            <button class="aw-link" onclick="switchTab('activas'); setTimeout(() => viewNovelty('${ultima.id}'), 50);">Ver detalle →</button>
        `;
    }

    // ── Widget: Consejo del día ────────────────────────────────────
    function _actualizarConsejoDia() {
        const dia = new Date().getDate();
        const consejo = CONSEJOS_DEL_DIA[dia % CONSEJOS_DEL_DIA.length];
        _setText('widgetConsejoDia', consejo);
    }

    // ── Punto de entrada: refresca toda la cabecera nueva ─────────
    function refrescarPanel() {
        try {
            const stats = _actualizarStatsTop();
            _actualizarWidgetHoy(stats);
            _actualizarWidgetUltima(stats);
            _actualizarConsejoDia();
        } catch (e) {
            console.warn('[AdminUI] No se pudo refrescar la cabecera:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', _cerrarUserMenuAlClickFuera);
    document.addEventListener('DOMContentLoaded', _cerrarExportMenuAlClickFuera);
    document.addEventListener('DOMContentLoaded', _restaurarSidebarColapsada);

    return { toggleUserMenu, refrescarPanel, toggleExportMenu, closeExportMenu, toggleExportExcelSub, toggleAdminSidebar };
})();

// Exponer como funciones globales (se usan con onclick="..." directo en el HTML)
function toggleExportMenu(event) { AdminUI.toggleExportMenu(event); }
function closeExportMenu() { AdminUI.closeExportMenu(); }
function toggleExportExcelSub(event) { AdminUI.toggleExportExcelSub(event); }
function toggleAdminSidebar() { AdminUI.toggleAdminSidebar(); }
