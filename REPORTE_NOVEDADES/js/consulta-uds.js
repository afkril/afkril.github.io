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

    // ── Estado de la última consulta (para ficha lateral y acciones) ──
    let _asocIdActual = null;
    let _udsActual = null;       // { contrato, nombre, codigo }
    let _todosEventos = [];      // todos los eventos (ingreso+retiro) enriquecidos
    let _documentoActivo = null; // documento con la ficha abierta actualmente

    // ── Helpers ─────────────────────────────────────────────
    function _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function _formatearFecha(fechaStr) {
        if (!fechaStr) return '—';
        // Fecha sola (AAAA-MM-DD): se formatea tal cual. new Date() la leería como
        // medianoche UTC y en Colombia (UTC-5) mostraría el día anterior.
        const m = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
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
        const estados = window.ESTADOS_CONTRATOS || {};
        // Una misma UDS puede existir en varios contratos (copiadas al renovar):
        // se prefiere el contrato activo sobre los inactivos.
        let inactivo = null;
        for (const [contrato, lista] of Object.entries(data)) {
            for (const [nombre, cod] of (lista || [])) {
                if (String(cod).trim() === codigo) {
                    const r = { contrato, nombre, codigo: String(cod).trim() };
                    if (estados[contrato] !== 'inactivo') return r;
                    if (!inactivo) inactivo = r;
                }
            }
        }
        return inactivo;
    }

    // ── Contratos en los que existe un código de UDS ──
    // (una misma UDS se copia a otro contrato al renovar y conserva el código)
    function _contratosDelCodigo(codigo) {
        const data = window.UDS_DATA || {};
        const contratos = new Set();
        Object.entries(data).forEach(([contrato, lista]) => {
            (lista || []).forEach(([, cod]) => {
                if (String(cod).trim() === codigo) contratos.add(contrato);
            });
        });
        return contratos;
    }

    // ── ¿El registro pertenece a la UDS consultada? ──
    // Varias UDS pueden llamarse igual y tener distinto código y contrato, así
    // que NUNCA se cruza solo por nombre: se compara el código guardado en
    // udsFull ("NOMBRE - CÓDIGO"). Solo si el registro es antiguo y no trae
    // código se acepta por nombre, y únicamente dentro de los contratos donde
    // existe ese código.
    function _pertenecePorCodigo(r, udsInfo, contratosDelCodigo) {
        const partes = String(r.udsFull || '').split(' - ');
        const codigoRegistro = partes.length > 1 ? partes[partes.length - 1].trim() : '';
        if (codigoRegistro) return codigoRegistro === udsInfo.codigo;
        return r.udsName === udsInfo.nombre && contratosDelCodigo.has(r.contract);
    }

    // ── Extraer eventos (ingreso/retiro) de un nodo, filtrados por UDS ──
    // Ahora conserva el id del registro, su origen (activas/archivadas) y el
    // detalle completo (ingreso/retiro + nutrición), necesarios para la ficha
    // lateral y para las acciones especiales (reportar retiro / reingreso).
    function _extraerEventos(registros, udsInfo, origen) {
        const eventos = [];
        const contratosDelCodigo = _contratosDelCodigo(udsInfo.codigo);
        Object.entries(registros || {}).forEach(([id, r]) => {
            if (!r || !_pertenecePorCodigo(r, udsInfo, contratosDelCodigo)) return;

            if ((r.hasIngreso || r.type === 'ingreso' || r.type === 'ambos') && r.ingreso && r.ingreso.document) {
                eventos.push({
                    id, origen,
                    documento: String(r.ingreso.document).trim(),
                    docType: r.ingreso.docType || 'RC',
                    nombre: r.ingreso.name || r.name || '',
                    tipo: 'ingreso',
                    fecha: r.ingreso.ingresoDate || r.date || '',
                    cuentameStatus: r.cuentameStatus || 'pendiente',
                    contract: r.contract || '',
                    udsFull: r.udsFull || '',
                    correoRespuesta: r.correoRespuesta || '',
                    detalle: r.ingreso,
                    nutricion: r.nutricion || null,
                    discapacidad: r.discapacidad || r.ingreso.discapacidad || null
                });
            }
            if ((r.hasRetiro || r.type === 'retiro' || r.type === 'ambos') && r.retiro && r.retiro.document) {
                eventos.push({
                    id, origen,
                    documento: String(r.retiro.document).trim(),
                    docType: r.retiro.docType || 'RC',
                    nombre: r.retiro.name || r.name || '',
                    tipo: 'retiro',
                    fecha: r.retiro.retiroDate || r.date || '',
                    cuentameStatus: r.cuentameStatus || 'pendiente',
                    contract: r.contract || '',
                    udsFull: r.udsFull || '',
                    correoRespuesta: r.correoRespuesta || '',
                    detalle: r.retiro,
                    nutricion: r.nutricion || null
                });
            }
        });
        return eventos;
    }

    // ── Historial completo (todos los eventos) de un documento, más reciente primero ──
    function _historialDe(documento) {
        return _todosEventos
            .filter(e => e.documento === documento)
            .sort((a, b) => (new Date(b.fecha || 0).getTime() || 0) - (new Date(a.fecha || 0).getTime() || 0));
    }

    // ── Recalcular las dos listas (vinculados/desvinculados) a partir del
    //    estado en memoria y volver a pintarlas, sin ir a Firebase de nuevo ──
    function _refrescarListasDesdeEstado() {
        const estados = _estadoActualPorDocumento(_todosEventos);
        const vinculados = estados.filter(e => e.tipo === 'ingreso').sort((a, b) => b._t - a._t);
        const desvinculados = estados.filter(e => e.tipo === 'retiro').sort((a, b) => b._t - a._t);
        _renderResultado(_udsActual, vinculados, desvinculados);
    }

    // ── Guardar una novedad generada desde Consulta UDS reutilizando el MISMO
    //    motor que usa el formulario principal (submitNovedad: Firebase con
    //    guardia de tiempo + Google Apps Script + cola offline idempotente),
    //    para no duplicar esa lógica ni repetir el bug de "correo sin
    //    respaldo en Firebase" en un segundo lugar del sistema ──
    async function _guardarNovedadDesdeConsulta(noveltyData, googleData) {
        const refPath = AsociacionesModule.getRef('novelties');
        const resultado = await OfflineModule.submitNovedad({
            noveltyData, googleData, refPath,
            onProgress: (estado) => {
                if (typeof EnvioProgresoUI === 'undefined') return;
                EnvioProgresoUI.setEstado(estado);
                if (estado === 'correo') {
                    EnvioProgresoUI.ocultar(500);
                    setTimeout(() => EnvioProgresoUI.miniToast('Enviando notificación por correo…'), 550);
                } else if (estado === 'correo-ok') {
                    EnvioProgresoUI.miniToast('Correo enviado correctamente', 3000);
                } else if (estado === 'correo-error') {
                    EnvioProgresoUI.miniToast('El correo tardó en salir, se reintentará solo', 4000);
                }
            }
        });
        if (typeof EnvioProgresoUI !== 'undefined') EnvioProgresoUI.ocultar(300);
        return { offline: resultado.status === 'queued' };
    }

    // ── Texto plano para el correo (REPORTE_DETALLADO), análogo a formatData()
    //    del formulario principal, pero construido desde el objeto en vez del DOM ──
    function _generarReporteTexto(n) {
        let t = `=================================\n REPORTE DE NOVEDADES (Consulta UDS)\n=================================\n\n`;
        t += `[ INFORMACIÓN GENERAL ]\n`;
        t += `> CONTRATO:      ${n.contract || ''}\n`;
        t += `> UDS:           ${n.udsFull || ''}\n`;
        t += `------------------------------------------\n\n`;

        if (n.retiro) {
            t += `[ DATOS DE RETIRO ]\n`;
            t += `  - Documento:  ${n.retiro.docType || ''} ${n.retiro.document || ''}\n`;
            t += `  - Nombre:     ${(n.retiro.name || '').toUpperCase()}\n`;
            t += `  - Fecha:      ${formatDateDMY(n.retiro.retiroDate)}\n`;
            t += `  - Género:     ${n.retiro.gender === 'M' ? 'Masculino' : n.retiro.gender === 'F' ? 'Femenino' : 'N/A'}\n`;
            t += `  - Ram Diligenciado: ${n.retiro.ramFileName || 'No adjuntado'}\n`;
            t += `  - Formato Retiro Voluntario: ${n.retiro.formatoFileName || 'No adjuntado'}\n\n`;
        }

        if (n.ingreso) {
            t += `[ DATOS DE INGRESO ]\n`;
            t += `  - Niño:       ${(n.ingreso.name || '').toUpperCase()}\n`;
            t += `  - Documento:  ${n.ingreso.docType || ''} ${n.ingreso.document || ''}\n`;
            t += `  - Edad:       ${n.ingreso.age || ''}\n`;
            t += `  - F. Ingreso: ${formatDateDMY(n.ingreso.ingresoDate)}\n`;
            t += `  - Dirección:  ${n.ingreso.address || ''}\n`;
            t += `  - Teléfono:   ${n.ingreso.phone || ''}\n\n`;
            t += `[ DATOS DEL ACUDIENTE ]\n`;
            t += `  - Nombre:     ${n.ingreso.acudiente || ''}\n`;
            t += `  - Documento:  ${n.ingreso.acudienteDoc || ''}\n\n`;

            if (n.nutricion) {
                t += `[ SEGUIMIENTO NUTRICIONAL ]\n`;
                if (n.nutricion.pendiente) {
                    t += `  - Valoración nutricional: PENDIENTE (se completará luego desde el panel)\n\n`;
                } else {
                    t += `  - F. Valoración: ${formatDateDMY(n.nutricion.fecha)}\n`;
                    t += `  - Peso:          ${n.nutricion.peso || ''} kg\n`;
                    t += `  - Talla:         ${n.nutricion.talla || ''} cm\n`;
                    t += `  - P. Braquial:   ${n.nutricion.perimetroBraquial ? n.nutricion.perimetroBraquial + ' cm' : '-'}\n`;
                    t += `  - Régimen:       ${n.nutricion.regimen || '-'}\n`;
                    t += `  - EPS:           ${n.nutricion.eps || '-'}\n`;
                    t += `  - Estado:        ${n.nutricion.estadoNutricional || 'No calculado'}\n`;
                    if (n.nutricion.antecedentePrematurez) {
                        t += `  - Antecedente prematurez: ${n.nutricion.antecedentePrematurez}${n.nutricion.edadGestacional ? ' (' + n.nutricion.edadGestacional + ' sem.)' : ''}\n`;
                    }
                    t += `\n`;
                }
            }

            const d = n.discapacidad;
            if (d && d.tiene) {
                t += `[ DISCAPACIDAD ]\n`;
                t += `  - Tiene discapacidad:             ${d.tiene === 'SI' ? 'SÍ' : 'NO'}\n`;
                if (d.tiene === 'SI') {
                    t += `  - Certificada:                     ${d.certificada || '-'}\n`;
                    t += `  - Entidad que certifica:           ${d.entidadCertifica || '-'}\n`;
                    t += `  - Inscrito registro localización:  ${d.registroLocalizacion || '-'}\n`;
                    t += `  - Requiere ayuda de otra persona:  ${d.requiereAyudaPersona || '-'}\n`;
                    t += `  - Requiere ayuda técnica:          ${d.requiereAyudaTecnica || '-'}\n`;
                    t += `  - Cuenta con ayuda técnica:        ${d.cuentaAyudaTecnica || '-'}\n`;
                    t += `  - Requiere terapia/rehab:          ${d.requiereTerapia || '-'}\n`;
                    t += `  - Recibe terapia/rehab:            ${d.recibeTerapia || '-'}\n`;
                    t += `  - Categorías:                      ${(d.categorias || []).join(', ') || 'Ninguna'}\n`;
                }
                t += `\n`;
            }
        }

        t += `------------------------------------------\n`;
        t += `Generado desde: Panel de Consulta UDS (acción especial)\n`;
        t += `Generado el: ${new Date().toLocaleString()}\n`;
        return t;
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
                ..._extraerEventos(activos, udsInfo, 'activas'),
                ..._extraerEventos(archivados, udsInfo, 'archivadas')
            ];

            // Guardar estado para la ficha lateral y las acciones especiales
            _asocIdActual = asocId;
            _udsActual = udsInfo;
            _todosEventos = eventos;

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
        const docAttr = _esc(item.documento).replace(/'/g, "\\'");

        return `
            <tr class="cuds-row-clickable" onclick="ConsultaUDSModule.abrirFicha('${docAttr}')" title="Ver ficha del participante">
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

    // ════════════════════════════════════════════════════════════
    // FICHA LATERAL DEL PARTICIPANTE
    // Se abre al hacer clic en cualquier fila (activos o inactivos).
    // Muestra info general, contacto, historial completo de
    // movimientos y da acceso a las acciones especiales.
    // ════════════════════════════════════════════════════════════
    function abrirFicha(documento) {
        const hist = _historialDe(documento);
        if (!hist.length) return;
        _documentoActivo = documento;

        const actual = hist[0];
        const esActivo = actual.tipo === 'ingreso';
        const ingresoRef = hist.find(e => e.tipo === 'ingreso') || null;
        const datosContacto = ingresoRef?.detalle || {};

        document.getElementById('consultaUdsFichaNombre').textContent = actual.nombre || '—';
        document.getElementById('consultaUdsFichaDoc').textContent = `${actual.docType} · ${actual.documento}`;

        const badge = document.getElementById('consultaUdsFichaEstadoBadge');
        badge.textContent = esActivo ? 'Vinculado activo' : 'Desvinculado';
        badge.className = `cuds-badge ${esActivo ? 'cuds-estado-activo' : 'cuds-estado-inactivo'}`;

        document.getElementById('consultaUdsFichaUDS').textContent = `${_udsActual.nombre} (${_udsActual.codigo})`;
        document.getElementById('consultaUdsFichaContrato').textContent = actual.contract || _udsActual.contrato || '—';
        document.getElementById('consultaUdsFichaFechaLabel').textContent = esActivo ? 'Fecha vinculación' : 'Fecha desvinculación';
        document.getElementById('consultaUdsFichaFecha').textContent = _formatearFecha(actual.fecha);

        const cargado = actual.cuentameStatus === 'cargado';
        const cargaBadge = document.getElementById('consultaUdsFichaCarga');
        cargaBadge.textContent = cargado ? 'Cargado' : 'Pendiente';
        cargaBadge.className = `cuds-badge ${cargado ? 'cuds-carga-cargado' : 'cuds-carga-pendiente'}`;

        document.getElementById('consultaUdsFichaTelefono').textContent = datosContacto.phone || '—';
        document.getElementById('consultaUdsFichaDireccion').textContent = datosContacto.address || '—';
        document.getElementById('consultaUdsFichaCorreo').textContent = actual.correoRespuesta || '—';

        // Botón de acción contextual: retiro si está activo, reingreso si no
        const btnAccion = document.getElementById('consultaUdsFichaBtnAccion');
        if (btnAccion) {
            if (esActivo) {
                btnAccion.innerHTML = '<i class=ic-log-out></i> Reportar retiro';
                btnAccion.className = 'cuds-ficha-btn-accion cuds-ficha-btn-accion--retiro';
                btnAccion.onclick = () => abrirModalRetiro();
            } else {
                btnAccion.innerHTML = '<i class=ic-refresh-cw></i> Reingreso';
                btnAccion.className = 'cuds-ficha-btn-accion cuds-ficha-btn-accion--reingreso';
                btnAccion.onclick = () => abrirModalReingreso();
            }
        }

        // Documentos y soportes (solo se conserva el nombre del Ram, si existe)
        const ramFile = hist.map(e => e.detalle?.ramFileName).find(Boolean);
        const formatoFile = hist.map(e => e.detalle?.formatoFileName).find(Boolean);
        const docsBox = document.getElementById('consultaUdsFichaDocumentos');
        if (docsBox) {
            const items = [];
            if (ramFile) items.push(`<div class="cuds-ficha-doc-item"><i class=ic-paperclip></i> RAM: ${_esc(ramFile)}</div>`);
            if (formatoFile) items.push(`<div class="cuds-ficha-doc-item"><i class=ic-paperclip></i> Retiro voluntario: ${_esc(formatoFile)}</div>`);
            docsBox.innerHTML = items.length
                ? items.join('')
                : `<div class="cuds-ficha-doc-empty">No hay documentos registrados en el sistema para este participante.</div>`;
        }

        // Historial de movimientos (todos los eventos, no solo el último)
        const histBox = document.getElementById('consultaUdsFichaHistorial');
        if (histBox) {
            histBox.innerHTML = hist.map(ev => `
                <div class="cuds-ficha-hist-item cuds-ficha-hist-item--${ev.tipo}">
                    <span class="cuds-ficha-hist-dot"></span>
                    <div class="cuds-ficha-hist-content">
                        <div class="cuds-ficha-hist-fecha">${_formatearFecha(ev.fecha)}</div>
                        <div class="cuds-ficha-hist-tipo">${ev.tipo === 'ingreso' ? 'Ingreso a la UDS' : 'Retiro de la UDS'}</div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('consultaUdsFicha')?.classList.add('is-open');
    }

    function cerrarFicha() {
        document.getElementById('consultaUdsFicha')?.classList.remove('is-open');
    }

    function scrollHistorialFicha() {
        document.getElementById('consultaUdsFichaHistorialSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function scrollDocumentosFicha() {
        document.getElementById('consultaUdsFichaDocsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ════════════════════════════════════════════════════════════
    // HELPERS COMPARTIDOS POR RETIRO Y REINGRESO
    // ════════════════════════════════════════════════════════════
    const _MAX_ARCHIVO = 8 * 1024 * 1024;

    function _cierreDeMesActivo() {
        try {
            if (typeof configBloqueo === 'undefined' || !configBloqueo || !configBloqueo.activo) return false;
            const dia = new Date().getDate();
            return dia >= configBloqueo.fechaInicio && dia <= configBloqueo.fechaFin;
        } catch (e) { return false; }
    }

    function _etiquetaTipoBenef(t) {
        return t === 'estandar' ? '6 meses a 5 años'
            : t === 'menor_6_meses' ? 'Menor de 6 meses'
            : t === 'gestante' ? 'Persona gestante' : '';
    }

    function _tipoBenefPrevio(hist) {
        const ing = hist.find(e => e.tipo === 'ingreso');
        return ing?.detalle?.tipoBeneficiario || '';
    }

    function _generoPrevio(hist) {
        return hist.map(e => e.detalle?.gender).find(Boolean) || '';
    }

    // Lee un archivo (comprimiendo si es foto) y lo devuelve en base64
    async function _leerArchivo(file, etiqueta) {
        if (file.size > _MAX_ARCHIVO) {
            throw new Error(`El archivo de ${etiqueta} excede 8MB. Use un archivo más pequeño.`);
        }
        if (typeof comprimirImagenSiAplica === 'function') file = await comprimirImagenSiAplica(file);
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(String(e.target.result).split(',')[1]);
            reader.onerror = () => reject(new Error(`Error al leer el archivo de ${etiqueta}.`));
            reader.readAsDataURL(file);
        });
        return { file, base64 };
    }

    function _limpiarDropzone(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = '';
        const zone = input.closest('.dropzone');
        if (zone) {
            zone.classList.remove('has-file', 'is-dragover', 'input-error');
            const nameEl = zone.querySelector('.dropzone-filename');
            if (nameEl) nameEl.textContent = '';
        }
    }

    function _valRadio(name) {
        return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
    }
    function _setRadio(name, valor) {
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => { r.checked = (r.value === valor); });
    }

    // ── Discapacidad (mismo formato que getDiscapacidadData del formulario) ──
    function _leerDiscapacidad() {
        const tiene = _valRadio('cudsDiscTiene');
        if (tiene !== 'SI') return { tiene: tiene || 'NO' };
        const cat = document.getElementById('cudsDiscCategoria')?.value || '';
        return {
            tiene: 'SI',
            certificada: _valRadio('cudsDiscCertificada'),
            entidadCertifica: document.getElementById('cudsDiscEntidad')?.value || '',
            registroLocalizacion: _valRadio('cudsDiscRegistro'),
            requiereAyudaPersona: _valRadio('cudsDiscAyudaPersona'),
            requiereAyudaTecnica: _valRadio('cudsDiscAyudaTecnica'),
            cuentaAyudaTecnica: _valRadio('cudsDiscCuentaAyuda'),
            requiereTerapia: _valRadio('cudsDiscRequiereTerapia'),
            recibeTerapia: _valRadio('cudsDiscRecibeTerapia'),
            categorias: cat ? [cat] : []
        };
    }

    function _validarDiscapacidad() {
        const tiene = _valRadio('cudsDiscTiene');
        if (!tiene) return 'Indique si el beneficiario TIENE DISCAPACIDAD.';
        if (tiene !== 'SI') return '';
        const reqs = [
            ['cudsDiscCertificada', '¿La discapacidad está certificada?'],
            ['cudsDiscRegistro', '¿Está inscrito en el registro de localización y caracterización?'],
            ['cudsDiscAyudaPersona', '¿Requiere la ayuda de otra persona?'],
            ['cudsDiscAyudaTecnica', '¿Requiere ayuda técnica / producto de apoyo?'],
            ['cudsDiscCuentaAyuda', '¿Cuenta con la ayuda técnica / producto de apoyo?'],
            ['cudsDiscRequiereTerapia', '¿Requiere terapia y/o rehabilitación?']
        ];
        if (!_valRadio('cudsDiscCertificada')) return `Responda: ${reqs[0][1]}`;
        if (!document.getElementById('cudsDiscEntidad')?.value) return 'Seleccione la ENTIDAD que certifica la discapacidad.';
        for (const [name, label] of reqs.slice(1)) {
            if (!_valRadio(name)) return `Responda: ${label}`;
        }
        if (!document.getElementById('cudsDiscCategoria')?.value) return 'Seleccione la CATEGORÍA DE DISCAPACIDAD.';
        return '';
    }

    function toggleDiscapacidad() {
        const si = _valRadio('cudsDiscTiene') === 'SI';
        document.getElementById('cudsDiscCampos')?.classList.toggle('cuds-hidden', !si);
    }

    function _prefillDiscapacidad(d) {
        _setRadio('cudsDiscTiene', d?.tiene || '');
        _setRadio('cudsDiscCertificada', d?.certificada || '');
        _setRadio('cudsDiscRegistro', d?.registroLocalizacion || '');
        _setRadio('cudsDiscAyudaPersona', d?.requiereAyudaPersona || '');
        _setRadio('cudsDiscAyudaTecnica', d?.requiereAyudaTecnica || '');
        _setRadio('cudsDiscCuentaAyuda', d?.cuentaAyudaTecnica || '');
        _setRadio('cudsDiscRequiereTerapia', d?.requiereTerapia || '');
        _setRadio('cudsDiscRecibeTerapia', d?.recibeTerapia || '');
        document.getElementById('cudsDiscEntidad').value = d?.entidadCertifica || '';
        document.getElementById('cudsDiscCategoria').value = d?.categorias?.[0] || '';
        toggleDiscapacidad();
    }

    // ── Valoración nutricional pendiente ──
    function toggleNutriPendiente() {
        const pend = document.getElementById('cudsReingresoNutriPendiente')?.checked;
        document.getElementById('cudsReingresoNutriCampos')?.classList.toggle('cuds-hidden', !!pend);
    }

    // ── Prematurez: solo aplica si al reingresar tiene menos de 24 meses ──
    function _edadEnMeses() {
        const dob = document.getElementById('cudsReingresoDOB')?.value;
        const fecha = document.getElementById('cudsReingresoFecha')?.value;
        if (!dob || !fecha || typeof calculateAge !== 'function' || typeof parseEdadAMeses !== 'function') return null;
        return parseEdadAMeses(calculateAge(dob, fecha));
    }
    function actualizarPrematurez() {
        const meses = _edadEnMeses();
        const mostrar = meses !== null && meses >= 0 && meses < 24;
        document.getElementById('cudsReingresoPrematurezBox')?.classList.toggle('cuds-hidden', !mostrar);
        if (!mostrar) {
            _setRadio('cudsReingresoPrematurez', '');
            const eg = document.getElementById('cudsReingresoEdadGest');
            if (eg) eg.value = '';
            document.getElementById('cudsReingresoEdadGestWrap')?.classList.add('cuds-hidden');
        }
    }
    function togglePrematurez() {
        const si = _valRadio('cudsReingresoPrematurez') === 'SI';
        document.getElementById('cudsReingresoEdadGestWrap')?.classList.toggle('cuds-hidden', !si);
        if (!si) { const eg = document.getElementById('cudsReingresoEdadGest'); if (eg) eg.value = ''; }
    }

    // ════════════════════════════════════════════════════════════
    // ACCIÓN ESPECIAL: REPORTAR RETIRO (desde un vinculado activo)
    // Igual que el formulario original: fecha, género, correo,
    // RAM (opcional) y Formato de Retiro Voluntario (obligatorio).
    // ════════════════════════════════════════════════════════════
    function abrirModalRetiro() {
        const documento = _documentoActivo;
        const hist = _historialDe(documento);
        const actual = hist[0];
        if (!actual || actual.tipo !== 'ingreso') {
            showToast('Este participante no figura como vinculado activo.', 'warning');
            return;
        }

        document.getElementById('cudsRetiroNombre').textContent = actual.nombre || '—';
        document.getElementById('cudsRetiroDocumento').textContent = `${actual.docType} · ${actual.documento}`;
        document.getElementById('cudsRetiroUDS').textContent = `${_udsActual.nombre} (${_udsActual.codigo})`;
        document.getElementById('cudsRetiroFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('cudsRetiroCorreo').value = actual.correoRespuesta || '';
        _setRadio('cudsRetiroGenero', _generoPrevio(hist));
        _limpiarDropzone('cudsRetiroRamFile');
        _limpiarDropzone('cudsRetiroFormatoFile');
        document.getElementById('cudsRetiroError').style.display = 'none';

        if (typeof initDropzones === 'function') initDropzones();
        document.getElementById('consultaUdsModalRetiro')?.classList.add('is-open');
    }

    function cerrarModalRetiro() {
        document.getElementById('consultaUdsModalRetiro')?.classList.remove('is-open');
    }

    async function confirmarRetiro() {
        const documento = _documentoActivo;
        const fechaInput = document.getElementById('cudsRetiroFecha');
        const correoInput = document.getElementById('cudsRetiroCorreo');
        const errorBox = document.getElementById('cudsRetiroError');
        const btn = document.getElementById('cudsRetiroBtnConfirmar');
        const ramInput = document.getElementById('cudsRetiroRamFile');
        const formatoInput = document.getElementById('cudsRetiroFormatoFile');

        const fecha = fechaInput?.value || '';
        const correo = (correoInput?.value || '').trim();
        const genero = _valRadio('cudsRetiroGenero');

        const mostrarErrorRetiro = (msg) => {
            if (errorBox) { errorBox.textContent = msg; errorBox.style.display = ''; }
        };
        if (errorBox) errorBox.style.display = 'none';

        if (_cierreDeMesActivo()) { mostrarErrorRetiro('El sistema está en periodo de cierre de mes. No se pueden registrar novedades.'); return; }
        if (!fecha) { mostrarErrorRetiro('Ingrese la fecha de retiro.'); fechaInput?.focus(); return; }
        const errFechaRet = validarFechaMovimiento(fecha, 'La fecha de retiro');
        if (errFechaRet) { mostrarErrorRetiro(errFechaRet); fechaInput?.focus(); return; }
        if (!genero) { mostrarErrorRetiro('Seleccione el género del participante.'); return; }
        if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            mostrarErrorRetiro('Ingrese un correo válido para el seguimiento.'); correoInput?.focus(); return;
        }
        if (!formatoInput?.files?.length) {
            formatoInput?.closest('.dropzone')?.classList.add('input-error');
            mostrarErrorRetiro('Debe adjuntar el FORMATO DE RETIRO VOLUNTARIO.');
            return;
        }
        formatoInput.closest('.dropzone')?.classList.remove('input-error');

        const hist = _historialDe(documento);
        const actual = hist[0];
        if (!actual || actual.tipo !== 'ingreso') {
            mostrarErrorRetiro('Este participante ya no figura como vinculado activo. Cierre y actualice la consulta.');
            return;
        }

        const perfil = AsociacionesModule.getPerfilActivo();
        const docType = actual.docType || 'RC';
        const nombre = actual.nombre;
        const tipoBenef = _tipoBenefPrevio(hist);

        const noveltyData = {
            contract: _udsActual.contrato,
            udsName: _udsActual.nombre,
            udsFull: `${_udsActual.nombre} - ${_udsActual.codigo}`,
            regional: '',
            modalidad: '',
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            cuentameStatus: 'pendiente',
            asociacionId: perfil?.id || '',
            asociacionNombre: perfil?.nombre || '',
            correoRespuesta: correo,
            seguimiento: { estadoInterno: 'pendiente', historial: null },
            origenAccion: 'consulta_uds_retiro',
            type: 'retiro',
            hasRetiro: true,
            hasIngreso: false,
            document: documento,
            name: nombre,
            retiro: { docType, document: documento, name: nombre, gender: genero, retiroDate: fecha, tipoBeneficiario: tipoBenef }
        };

        const googleData = {
            Contrato: _udsActual.contrato,
            UDS_Full: noveltyData.udsFull,
            _subject: `Novedad UDS: ${_udsActual.nombre} (Retiro desde Consulta UDS)`,
            retiro_tipo_doc: docType,
            retiro_documento: documento,
            retiro_nombre: nombre,
            retiro_fecha: fecha,
            _retiroGender: genero,
            retiro_tipo_beneficiario: _etiquetaTipoBenef(tipoBenef)
        };

        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        if (typeof EnvioProgresoUI !== 'undefined') EnvioProgresoUI.mostrar();
        try {
            // RAM (opcional)
            if (ramInput?.files?.length) {
                const { file, base64 } = await _leerArchivo(ramInput.files[0], 'el Ram');
                googleData.ram_file_base64 = base64;
                googleData.ram_file_type = file.type;
                googleData.ram_file_name = (typeof nombreArchivoNovedad === 'function')
                    ? nombreArchivoNovedad(['Ram', mesArchivo(fecha), noveltyData.udsName, documento], file)
                    : file.name;
                noveltyData.retiro.ramFileName = googleData.ram_file_name;
            }
            // Formato de retiro voluntario (obligatorio)
            {
                const { file, base64 } = await _leerArchivo(formatoInput.files[0], 'el Formato de Retiro Voluntario');
                googleData.retiro_formato_base64 = base64;
                googleData.retiro_formato_type = file.type;
                googleData.retiro_formato_name = (typeof nombreArchivoNovedad === 'function')
                    ? nombreArchivoNovedad(['Retiro', documento, fechaArchivo(fecha)], file)
                    : file.name;
                noveltyData.retiro.formatoFileName = googleData.retiro_formato_name;
            }

            googleData.REPORTE_DETALLADO = _generarReporteTexto(noveltyData);

            const r = await _guardarNovedadDesdeConsulta(noveltyData, googleData);
            _todosEventos.push({
                id: null, origen: 'activas', documento, docType, nombre, tipo: 'retiro',
                fecha, cuentameStatus: 'pendiente', contract: noveltyData.contract,
                udsFull: noveltyData.udsFull, correoRespuesta: correo, detalle: noveltyData.retiro
            });
            _refrescarListasDesdeEstado();
            cerrarModalRetiro();
            cerrarFicha();
            showToast(r.offline
                ? 'Sin conexión: el retiro se guardó en este dispositivo y se enviará cuando vuelva la señal.'
                : 'Retiro reportado correctamente.', r.offline ? 'info' : 'success');
        } catch (e) {
            console.error('[ConsultaUDS] Error al reportar retiro:', e);
            if (typeof EnvioProgresoUI !== 'undefined') EnvioProgresoUI.ocultar(0);
            mostrarErrorRetiro(e?.message ? `No se pudo guardar el retiro: ${e.message}` : 'No se pudo guardar el retiro. Intente nuevamente.');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Confirmar retiro'; }
        }
    }

    // ════════════════════════════════════════════════════════════
    // ACCIÓN ESPECIAL: REINGRESO (desde un desvinculado)
    // Valoración nutricional opcional / pendiente, discapacidad con
    // preguntas condicionales y prematurez si es menor de 24 meses.
    // ════════════════════════════════════════════════════════════
    function abrirModalReingreso() {
        const documento = _documentoActivo;
        const hist = _historialDe(documento);
        const actual = hist[0];
        if (!actual || actual.tipo !== 'retiro') {
            showToast('Este participante no figura como desvinculado.', 'warning');
            return;
        }

        const ingresoRef = hist.find(e => e.tipo === 'ingreso');
        const prev = ingresoRef?.detalle || {};

        document.getElementById('cudsReingresoNombre').textContent = actual.nombre || '—';
        document.getElementById('cudsReingresoDocumento').textContent = `${actual.docType} · ${actual.documento}`;
        document.getElementById('cudsReingresoUDS').textContent = `${_udsActual.nombre} (${_udsActual.codigo})`;

        document.getElementById('cudsReingresoDOB').value = prev.dob || '';
        document.getElementById('cudsReingresoDireccion').value = prev.address || '';
        document.getElementById('cudsReingresoTelefono').value = prev.phone || '';
        document.getElementById('cudsReingresoComuna').value = prev.comuna || '';
        document.getElementById('cudsReingresoBarrio').value = prev.barrio || '';
        document.getElementById('cudsReingresoAcudienteNombre').value = prev.acudiente || '';
        document.getElementById('cudsReingresoAcudienteDoc').value = prev.acudienteDoc || '';
        document.getElementById('cudsReingresoAcudienteDOB').value = prev.acudienteDOB || '';
        document.getElementById('cudsReingresoFecha').value = new Date().toISOString().split('T')[0];

        const generoPrev = _generoPrevio(hist);
        document.querySelectorAll('input[name="cudsReingresoGenero"]').forEach(r => { r.checked = (r.value === generoPrev); });

        ['cudsReingresoPeso', 'cudsReingresoTalla', 'cudsReingresoPerimetro', 'cudsReingresoRegimen', 'cudsReingresoEPS', 'cudsReingresoFechaValoracion', 'cudsReingresoEdadGest']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const chk = document.getElementById('cudsReingresoNutriPendiente');
        if (chk) chk.checked = false;
        toggleNutriPendiente();

        _setRadio('cudsReingresoPrematurez', '');
        document.getElementById('cudsReingresoEdadGestWrap')?.classList.add('cuds-hidden');
        actualizarPrematurez();

        // La discapacidad se precarga con lo último registrado (si existe) para confirmarla
        const discPrev = hist.map(e => e.discapacidad).find(Boolean) || null;
        _prefillDiscapacidad(discPrev);

        document.getElementById('cudsReingresoError').style.display = 'none';
        document.getElementById('consultaUdsModalReingreso')?.classList.add('is-open');
    }

    function cerrarModalReingreso() {
        document.getElementById('consultaUdsModalReingreso')?.classList.remove('is-open');
    }

    async function confirmarReingreso() {
        const documento = _documentoActivo;
        const btn = document.getElementById('cudsReingresoBtnConfirmar');
        const errorBox = document.getElementById('cudsReingresoError');
        const mostrarErrorReingreso = (msg) => {
            if (errorBox) { errorBox.textContent = msg; errorBox.style.display = ''; errorBox.scrollIntoView?.({ block: 'nearest' }); }
        };
        if (errorBox) errorBox.style.display = 'none';

        const val = (id) => (document.getElementById(id)?.value || '').trim();
        const dob = val('cudsReingresoDOB');
        const fechaIngreso = val('cudsReingresoFecha');
        const direccion = val('cudsReingresoDireccion');
        const telefono = val('cudsReingresoTelefono');
        const comuna = val('cudsReingresoComuna');
        const barrio = val('cudsReingresoBarrio');
        const acudienteNombre = val('cudsReingresoAcudienteNombre');
        const acudienteDoc = val('cudsReingresoAcudienteDoc');
        const acudienteDOB = val('cudsReingresoAcudienteDOB');
        const genero = _valRadio('cudsReingresoGenero');

        const peso = val('cudsReingresoPeso');
        const talla = val('cudsReingresoTalla');
        const perimetro = val('cudsReingresoPerimetro');
        const regimen = val('cudsReingresoRegimen');
        const eps = val('cudsReingresoEPS');
        const fechaValoracion = val('cudsReingresoFechaValoracion');
        const marcoPendiente = !!document.getElementById('cudsReingresoNutriPendiente')?.checked;

        if (_cierreDeMesActivo()) return mostrarErrorReingreso('El sistema está en periodo de cierre de mes. No se pueden registrar novedades.');
        if (!dob) return mostrarErrorReingreso('Ingrese la fecha de nacimiento.');
        if (!fechaIngreso) return mostrarErrorReingreso('Ingrese la fecha de reingreso.');
        const errFechaReing = validarFechaMovimiento(fechaIngreso, 'La fecha de reingreso');
        if (errFechaReing) return mostrarErrorReingreso(errFechaReing);
        if (!genero) return mostrarErrorReingreso('Seleccione el género.');
        if (!comuna) return mostrarErrorReingreso('Ingrese la comuna.');
        if (!barrio) return mostrarErrorReingreso('Ingrese el barrio.');
        if (!direccion || !telefono) return mostrarErrorReingreso('Complete dirección y teléfono.');
        if (!acudienteNombre || !acudienteDoc) return mostrarErrorReingreso('Complete los datos del acudiente.');
        if (!acudienteDOB) return mostrarErrorReingreso('Ingrese la fecha de nacimiento del acudiente.');

        // Valoración nutricional: opcional. Si la marcan pendiente o no la llenan, queda pendiente.
        const hayAlgunDato = !!(peso || talla || fechaValoracion || perimetro);
        const nutricionPendiente = marcoPendiente || !hayAlgunDato;
        if (!nutricionPendiente) {
            if (!peso || !talla || !fechaValoracion) {
                return mostrarErrorReingreso('Si diligencia la valoración, complete fecha, peso y talla (o márquela como dato pendiente).');
            }
            const p = parseFloat(peso), t = parseFloat(talla);
            if (isNaN(p) || p < 5 || p > 30.5) return mostrarErrorReingreso('El peso debe estar entre 5 y 30.5 kg.');
            if (isNaN(t) || t < 50 || t > 130.5) return mostrarErrorReingreso('La talla debe estar entre 50 y 130.5 cm.');
            if (perimetro) {
                const pb = parseFloat(perimetro);
                if (isNaN(pb) || pb < 6 || pb > 30) return mostrarErrorReingreso('El perímetro braquial debe estar entre 6 y 30 cm.');
            }
        }

        // Prematurez (solo si es menor de 24 meses)
        let antecedentePrematurez = '', edadGestacional = '';
        const prematurezVisible = !document.getElementById('cudsReingresoPrematurezBox')?.classList.contains('cuds-hidden');
        if (prematurezVisible) {
            antecedentePrematurez = _valRadio('cudsReingresoPrematurez');
            if (!antecedentePrematurez) return mostrarErrorReingreso('Indique el ANTECEDENTE DE PREMATUREZ.');
            if (antecedentePrematurez === 'SI') {
                const eg = parseFloat(val('cudsReingresoEdadGest'));
                if (isNaN(eg)) return mostrarErrorReingreso('Indique la EDAD GESTACIONAL AL NACER.');
                if (eg < 3 || eg > 36) return mostrarErrorReingreso('La edad gestacional debe estar entre 3 y 36 semanas.');
                edadGestacional = String(eg);
            }
        }

        const errDisc = _validarDiscapacidad();
        if (errDisc) return mostrarErrorReingreso(errDisc);

        const hist = _historialDe(documento);
        const actual = hist[0];
        if (!actual || actual.tipo !== 'retiro') {
            mostrarErrorReingreso('Este participante ya no figura como desvinculado. Cierre y actualice la consulta.');
            return;
        }

        const perfil = AsociacionesModule.getPerfilActivo();
        const edad = (typeof calculateAge === 'function') ? calculateAge(dob, fechaIngreso) : '';
        const estadoNutricional = nutricionPendiente
            ? 'Pendiente'
            : ((typeof calcularEstadoNutricionalDirecto === 'function')
                ? (calcularEstadoNutricionalDirecto(parseFloat(peso), parseFloat(talla), dob, fechaIngreso, genero) || 'No calculado')
                : 'No calculado');
        const discapacidad = _leerDiscapacidad();
        const tipoBenef = _tipoBenefPrevio(hist);

        const noveltyData = {
            contract: _udsActual.contrato,
            udsName: _udsActual.nombre,
            udsFull: `${_udsActual.nombre} - ${_udsActual.codigo}`,
            regional: '',
            modalidad: '',
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            cuentameStatus: 'pendiente',
            asociacionId: perfil?.id || '',
            asociacionNombre: perfil?.nombre || '',
            correoRespuesta: actual.correoRespuesta || '',
            seguimiento: { estadoInterno: 'pendiente', historial: null },
            origenAccion: 'consulta_uds_reingreso',
            type: 'ingreso',
            hasRetiro: false,
            hasIngreso: true,
            document: documento,
            name: actual.nombre,
            ingreso: {
                docType: actual.docType || 'RC',
                document: documento,
                name: actual.nombre,
                dob, age: edad, gender: genero,
                comuna, barrio, address: direccion, phone: telefono,
                acudiente: acudienteNombre, acudienteDoc, acudienteDOB,
                ingresoDate: fechaIngreso,
                tipoBeneficiario: tipoBenef
            },
            nutricion: {
                pendiente: nutricionPendiente,
                fecha: nutricionPendiente ? '' : fechaValoracion,
                peso: nutricionPendiente ? '' : peso,
                talla: nutricionPendiente ? '' : talla,
                perimetroBraquial: nutricionPendiente ? '' : perimetro,
                regimen: nutricionPendiente ? '' : regimen,
                eps: nutricionPendiente ? '' : eps,
                estadoNutricional,
                antecedentePrematurez,
                edadGestacional
            },
            discapacidad
        };
        if (tipoBenef) noveltyData.tipoBeneficiario = tipoBenef;

        const googleData = {
            Contrato: _udsActual.contrato,
            UDS_Full: noveltyData.udsFull,
            REPORTE_DETALLADO: _generarReporteTexto(noveltyData),
            _subject: `Novedad UDS: ${_udsActual.nombre} (Reingreso desde Consulta UDS)`,
            ingreso_tipo_doc: noveltyData.ingreso.docType,
            ingreso_documento: documento,
            ingreso_nombre: actual.nombre,
            ingreso_nacimiento: dob,
            edad_calculada: edad,
            ingreso_fecha: fechaIngreso,
            _ingresoGender: genero,
            ingreso_comuna: comuna,
            ingreso_barrio: barrio,
            ingreso_direccion: direccion,
            ingreso_telefono: telefono,
            acudiente_documento: acudienteDoc,
            acudiente_nombre: acudienteNombre,
            acudiente_nacimiento: acudienteDOB,
            nutricion_fecha: noveltyData.nutricion.fecha,
            nutricion_peso: noveltyData.nutricion.peso,
            nutricion_talla: noveltyData.nutricion.talla,
            nutricion_perimetro_braquial: noveltyData.nutricion.perimetroBraquial,
            nutricion_regimen: noveltyData.nutricion.regimen,
            nutricion_eps: noveltyData.nutricion.eps,
            antecedente_prematurez: antecedentePrematurez,
            edad_gestacional: edadGestacional,
            discapacidad_tiene: discapacidad.tiene || 'NO'
        };
        if (tipoBenef) googleData.ingreso_tipo_beneficiario = _etiquetaTipoBenef(tipoBenef);
        if (discapacidad.tiene === 'SI') {
            googleData.discapacidad_certificada = discapacidad.certificada;
            googleData.discapacidad_entidad_certifica = discapacidad.entidadCertifica;
            googleData.discapacidad_registro_localizacion = discapacidad.registroLocalizacion;
            googleData.discapacidad_requiere_ayuda_persona = discapacidad.requiereAyudaPersona;
            googleData.discapacidad_requiere_ayuda_tecnica = discapacidad.requiereAyudaTecnica;
            googleData.discapacidad_cuenta_ayuda_tecnica = discapacidad.cuentaAyudaTecnica;
            googleData.discapacidad_requiere_terapia = discapacidad.requiereTerapia;
            googleData.discapacidad_recibe_terapia = discapacidad.recibeTerapia;
            googleData.discapacidad_categorias = discapacidad.categorias.join(', ');
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        if (typeof EnvioProgresoUI !== 'undefined') EnvioProgresoUI.mostrar();
        try {
            const r = await _guardarNovedadDesdeConsulta(noveltyData, googleData);
            _todosEventos.push({
                id: null, origen: 'activas', documento, docType: noveltyData.ingreso.docType,
                nombre: actual.nombre, tipo: 'ingreso', fecha: fechaIngreso,
                cuentameStatus: 'pendiente', contract: noveltyData.contract, udsFull: noveltyData.udsFull,
                correoRespuesta: noveltyData.correoRespuesta, detalle: noveltyData.ingreso,
                nutricion: noveltyData.nutricion, discapacidad
            });
            _refrescarListasDesdeEstado();
            cerrarModalReingreso();
            cerrarFicha();
            showToast(r.offline
                ? 'Sin conexión: el reingreso se guardó en este dispositivo y se enviará cuando vuelva la señal.'
                : 'Reingreso registrado correctamente.', r.offline ? 'info' : 'success');
        } catch (e) {
            console.error('[ConsultaUDS] Error al reportar reingreso:', e);
            if (typeof EnvioProgresoUI !== 'undefined') EnvioProgresoUI.ocultar(0);
            mostrarErrorReingreso(e?.message ? `No se pudo guardar el reingreso: ${e.message}` : 'No se pudo guardar el reingreso. Intente nuevamente.');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Confirmar reingreso'; }
        }
    }

    return {
        abrirModal, cerrarModal, consultar, nuevaConsulta, manejarTecla, mostrarSeccion,
        abrirFicha, cerrarFicha, scrollHistorialFicha, scrollDocumentosFicha,
        abrirModalRetiro, cerrarModalRetiro, confirmarRetiro,
        abrirModalReingreso, cerrarModalReingreso, confirmarReingreso,
        toggleNutriPendiente, toggleDiscapacidad, togglePrematurez, actualizarPrematurez
    };
})();

window.ConsultaUDSModule = ConsultaUDSModule;
