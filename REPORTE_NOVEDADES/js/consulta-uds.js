// ============================================================
// MÓDULO: CONSULTA POR CÓDIGO UDS
// Permite que cada UDS, digitando su código, valide su propio
// listado de vinculados activos y desvinculados/inactivos.
// Solo lee datos de la asociación activa (novedades_{id} y
// archivados_{id}), filtrados por la UDS correspondiente al
// código ingresado — nunca expone datos de otras UDS.
//
// Se muestra como un panel completo (no una ventana pequeña),
// con menú lateral izquierdo para alternar entre "Ver activos"
// y "Ver inactivos".
// ============================================================

const ConsultaUDSModule = (() => {

    let _vistaActual = 'activos';

    // ── Helpers ─────────────────────────────────────────────
    function _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function _formatearFecha(fechaStr) {
        if (!fechaStr) return '—';
        const d = new Date(fechaStr);
        if (isNaN(d)) return _esc(fechaStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }

    async function _leerNodo(path) {
        try {
            const snap = await database.ref(path).once('value');
            return snap.val() || {};
        } catch (e) {
            console.warn(`[ConsultaUDS] No se pudo leer ${path}:`, e.message);
            return {};
        }
    }

    // ── Buscar la UDS (nombre + contrato) a partir del código ──
    function _buscarUDSPorCodigo(codigo) {
        const data = window.UDS_DATA || {};
        for (const [contrato, lista] of Object.entries(data)) {
            for (const [nombre, cod] of (lista || [])) {
                if (String(cod).trim() === codigo) {
                    return { contrato, nombre, codigo: String(cod).trim() };
                }
            }
        }
        return null;
    }

    // ── Extraer eventos (ingreso/retiro) de un nodo, filtrados por UDS ──
    function _extraerEventos(registros, udsNombre) {
        const eventos = [];
        Object.values(registros || {}).forEach(r => {
            if (!r || r.udsName !== udsNombre) return;

            if ((r.hasIngreso || r.type === 'ingreso' || r.type === 'ambos') && r.ingreso && r.ingreso.document) {
                eventos.push({
                    documento: String(r.ingreso.document).trim(),
                    docType: r.ingreso.docType || 'RC',
                    nombre: r.ingreso.name || r.name || '',
                    tipo: 'ingreso',
                    fecha: r.ingreso.ingresoDate || r.date || '',
                    cuentameStatus: r.cuentameStatus || 'pendiente'
                });
            }
            if ((r.hasRetiro || r.type === 'retiro' || r.type === 'ambos') && r.retiro && r.retiro.document) {
                eventos.push({
                    documento: String(r.retiro.document).trim(),
                    docType: r.retiro.docType || 'RC',
                    nombre: r.retiro.name || r.name || '',
                    tipo: 'retiro',
                    fecha: r.retiro.retiroDate || r.date || '',
                    cuentameStatus: r.cuentameStatus || 'pendiente'
                });
            }
        });
        return eventos;
    }

    // ── Para cada documento, quedarse con el evento más reciente ──
    // (define si la persona está actualmente vinculada o desvinculada)
    function _estadoActualPorDocumento(eventos) {
        const mapa = new Map();
        eventos.forEach(ev => {
            if (!ev.documento) return;
            const t = new Date(ev.fecha || 0).getTime() || 0;
            const previo = mapa.get(ev.documento);
            if (!previo || t >= previo._t) {
                mapa.set(ev.documento, { ...ev, _t: t });
            }
        });
        return [...mapa.values()];
    }

    // ── Abrir / cerrar panel ────────────────────────────────
    function abrirModal() {
        document.getElementById('consultaUdsOverlay')?.classList.add('is-open');
        _mostrarPasoInput();
        document.body.style.overflow = 'hidden';
    }

    function cerrarModal() {
        document.getElementById('consultaUdsOverlay')?.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function _setNavHabilitado(habilitado) {
        document.querySelectorAll('.cuds-nav-item[data-view]').forEach(btn => {
            btn.disabled = !habilitado;
        });
    }

    function _mostrarPasoInput() {
        const pasoInput = document.getElementById('consultaUdsPasoInput');
        const pasoResultado = document.getElementById('consultaUdsPasoResultado');
        const input = document.getElementById('consultaUdsCodigo');
        const error = document.getElementById('consultaUdsError');
        const header = document.getElementById('consultaUdsMainHeaderSub');
        const resumenMini = document.getElementById('consultaUdsResumenMini');

        if (pasoInput) pasoInput.style.display = '';
        if (pasoResultado) pasoResultado.style.display = 'none';
        if (input) input.value = '';
        if (error) error.style.display = 'none';
        if (header) header.textContent = 'Digite el código de su UDS para ver el listado';
        if (resumenMini) resumenMini.style.display = 'none';

        _setNavHabilitado(false);
        setTimeout(() => input && input.focus(), 80);
    }

    function nuevaConsulta() {
        _mostrarPasoInput();
    }

    function _mostrarError(msg) {
        const error = document.getElementById('consultaUdsError');
        if (!error) return;
        error.textContent = msg;
        error.style.display = '';
    }

    // ── Ejecutar la consulta ────────────────────────────────
    async function consultar() {
        const input = document.getElementById('consultaUdsCodigo');
        const btn = document.getElementById('consultaUdsBtnBuscar');
        const codigo = (input?.value || '').trim();

        const error = document.getElementById('consultaUdsError');
        if (error) error.style.display = 'none';

        if (!codigo) {
            _mostrarError('Ingrese el código de su UDS para continuar.');
            return;
        }

        const udsInfo = _buscarUDSPorCodigo(codigo);
        if (!udsInfo) {
            _mostrarError('No se encontró ninguna UDS con ese código. Verifique e intente nuevamente.');
            return;
        }

        const asocId = AsociacionesModule.getPerfilActivo?.()?.id;
        if (!asocId) {
            _mostrarError('No se pudo determinar la asociación activa. Recargue la página e intente de nuevo.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="cuds-spinner"></span>Consultando...';
        }

        try {
            const [activos, archivados] = await Promise.all([
                _leerNodo(`novedades_${asocId}`),
                _leerNodo(`archivados_${asocId}`)
            ]);

            const eventos = [
                ..._extraerEventos(activos, udsInfo.nombre),
                ..._extraerEventos(archivados, udsInfo.nombre)
            ];

            const estados = _estadoActualPorDocumento(eventos);
            const vinculados = estados.filter(e => e.tipo === 'ingreso').sort((a, b) => b._t - a._t);
            const desvinculados = estados.filter(e => e.tipo === 'retiro').sort((a, b) => b._t - a._t);

            _renderResultado(udsInfo, vinculados, desvinculados);

        } catch (e) {
            console.error('[ConsultaUDS] Error al consultar:', e);
            _mostrarError('Ocurrió un error al consultar. Intente nuevamente.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Consultar información';
            }
        }
    }

    // ── Render de una fila de la tabla ──────────────────────
    function _filaHtml(item, tipo) {
        const estadoLabel = tipo === 'ingreso' ? 'Activo' : 'Retirado';
        const estadoClass = tipo === 'ingreso' ? 'cuds-estado-activo' : 'cuds-estado-inactivo';
        const cargado = item.cuentameStatus === 'cargado';
        const cargaLabel = cargado ? 'Cargado' : 'Pendiente';
        const cargaClass = cargado ? 'cuds-carga-cargado' : 'cuds-carga-pendiente';

        return `
            <tr>
                <td>${_esc(item.docType)}</td>
                <td>${_esc(item.documento)}</td>
                <td>${_esc(item.nombre) || '—'}</td>
                <td><span class="cuds-badge ${estadoClass}">${estadoLabel}</span></td>
                <td>${_formatearFecha(item.fecha)}</td>
                <td><span class="cuds-badge ${cargaClass}">${cargaLabel}</span></td>
            </tr>`;
    }

    function _renderResultado(udsInfo, vinculados, desvinculados) {
        document.getElementById('consultaUdsPasoInput').style.display = 'none';
        const pasoResultado = document.getElementById('consultaUdsPasoResultado');
        pasoResultado.style.display = '';

        document.getElementById('consultaUdsCodigoConsultado').textContent = udsInfo.codigo;
        document.getElementById('consultaUdsNombreUDS').textContent = udsInfo.nombre;

        const header = document.getElementById('consultaUdsMainHeaderSub');
        if (header) header.textContent = `Resultados para ${udsInfo.nombre}`;
        const resumenMini = document.getElementById('consultaUdsResumenMini');
        if (resumenMini) resumenMini.style.display = '';

        const bodyActivos = document.getElementById('consultaUdsTablaActivos');
        const bodyInactivos = document.getElementById('consultaUdsTablaInactivos');

        bodyActivos.innerHTML = vinculados.length
            ? vinculados.map(v => _filaHtml(v, 'ingreso')).join('')
            : `<tr><td colspan="6" class="cuds-empty">Sin vinculados activos registrados.</td></tr>`;

        bodyInactivos.innerHTML = desvinculados.length
            ? desvinculados.map(v => _filaHtml(v, 'retiro')).join('')
            : `<tr><td colspan="6" class="cuds-empty">Sin desvinculados registrados.</td></tr>`;

        document.getElementById('consultaUdsCountActivos').textContent = `(${vinculados.length})`;
        document.getElementById('consultaUdsCountInactivos').textContent = `(${desvinculados.length})`;
        document.getElementById('consultaUdsNavCountActivos').textContent = vinculados.length;
        document.getElementById('consultaUdsNavCountInactivos').textContent = desvinculados.length;

        _setNavHabilitado(true);
        mostrarSeccion('activos');

        pasoResultado.scrollIntoView?.({ block: 'nearest' });
    }

    // ── Menú lateral: alternar entre "Ver activos" / "Ver inactivos" ──
    function mostrarSeccion(vista) {
        _vistaActual = vista === 'inactivos' ? 'inactivos' : 'activos';

        document.querySelectorAll('.cuds-nav-item[data-view]').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.view === _vistaActual);
        });

        const secActivos = document.getElementById('consultaUdsSeccionActivos');
        const secInactivos = document.getElementById('consultaUdsSeccionInactivos');
        if (secActivos) secActivos.classList.toggle('is-active', _vistaActual === 'activos');
        if (secInactivos) secInactivos.classList.toggle('is-active', _vistaActual === 'inactivos');

        const body = document.querySelector('.cuds-main-body');
        if (body) body.scrollTop = 0;
    }

    function manejarTecla(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            consultar();
        }
    }

    return { abrirModal, cerrarModal, consultar, nuevaConsulta, manejarTecla, mostrarSeccion };
})();

window.ConsultaUDSModule = ConsultaUDSModule;
