// ============================================================
// MÓDULO: RENOVACIÓN DE CONTRATOS — Desvinculación masiva
// Permite, desde el panel superadministrativo, seleccionar un
// operador/contrato/UDS y marcar como "retirados" (desvinculados)
// en bloque a todos los usuarios que están actualmente activos
// (con un ingreso vigente, sin retiro posterior) en ese alcance.
//
// Se apoya en el mismo índice de movimientos que ya usa
// DuplicadosModule (un evento por cada ingreso/retiro reportado)
// para calcular quién sigue activo, y escribe un nuevo registro
// de tipo "retiro" por cada persona seleccionada — igual que si
// un operador lo hubiera diligenciado manualmente desde el
// formulario — para conservar la trazabilidad del histórico.
// ============================================================

const RenovacionModule = (() => {

    let _operadores = {};         // cache: id -> datos de la asociación
    let _activos = [];            // resultado de la última búsqueda
    let _procesando = false;

    // ── Helpers ─────────────────────────────────────────────
    function _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function _formatearFecha(fechaStr) {
        if (!fechaStr) return '—';
        const d = new Date(fechaStr);
        if (isNaN(d)) return fechaStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
    }

    function _fechaOrden(ev) {
        return new Date(ev.fecha || ev.timestamp || 0).getTime() || 0;
    }

    function _hoyISOFecha() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }

    // Deja lista la fecha de retiro con la que se marcarán los registros:
    // por defecto hoy, sin permitir elegir una fecha futura (el retiro no
    // puede quedar registrado antes de que ocurra).
    function _prepararFechaRetiro() {
        const input = document.getElementById('renovFechaRetiro');
        if (!input) return;
        const hoy = _hoyISOFecha();
        input.max = hoy;
        if (!input.value) input.value = hoy;
    }

    // Normaliza perfil.unidades[contrato] (array u objeto Firebase) a
    // una lista simple de {nombre, codigo}, igual que hace AsociacionesModule.
    function _normalizarUDS(perfil, contrato) {
        const lista = (perfil.unidades || {})[contrato];
        if (!lista) return [];
        if (Array.isArray(lista)) {
            return lista.map(u => Array.isArray(u) ? { nombre: u[0], codigo: u[1] } : { nombre: u.nombre || '', codigo: u.codigo || '' });
        }
        if (typeof lista === 'object') {
            return Object.values(lista).map(u => ({ nombre: u.nombre || '', codigo: u.codigo || '' }));
        }
        return [];
    }

    function _log(msg) {
        const el = document.getElementById('renovLog');
        if (!el) return;
        el.style.display = 'block';
        el.textContent += (el.textContent ? '\n' : '') + msg;
        el.scrollTop = el.scrollHeight;
    }

    function _resetLog() {
        const el = document.getElementById('renovLog');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    // ── Paso 1: elegir operador ─────────────────────────────
    async function poblarOperadores() {
        const sel = document.getElementById('renovSelectOperador');
        if (!sel) return;
        const current = sel.value;
        try {
            _operadores = await AsociacionesModule.cargarAsociaciones();
        } catch (e) {
            showToast && showToast('Error al cargar operadores: ' + e.message, 'error');
            return;
        }
        const entries = Object.entries(_operadores || {});
        sel.innerHTML = '<option value="">— Selecciona un operador —</option>' +
            entries.map(([id, datos]) => `<option value="${id}">🏢 ${_esc(datos.nombre || id)}</option>`).join('');
        if (current && _operadores[current]) sel.value = current;
    }

    function onOperadorChange() {
        const operadorId = document.getElementById('renovSelectOperador')?.value;
        const selCtr = document.getElementById('renovSelectContrato');
        const selUDS = document.getElementById('renovSelectUDS');
        _ocultarResultados();

        if (!operadorId || !_operadores[operadorId]) {
            if (selCtr) { selCtr.innerHTML = '<option value="">— Primero un operador —</option>'; selCtr.disabled = true; }
            if (selUDS) { selUDS.innerHTML = '<option value="">— Todas las UDS —</option>'; selUDS.disabled = true; }
            return;
        }

        const perfil = _operadores[operadorId];
        const contratos = perfil.contratos || {};
        if (selCtr) {
            selCtr.innerHTML = '<option value="">— Selecciona un contrato —</option>' +
                Object.entries(contratos).map(([cod, label]) => `<option value="${cod}">📄 ${_esc(label || cod)}</option>`).join('');
            selCtr.disabled = Object.keys(contratos).length === 0;
        }
        if (selUDS) { selUDS.innerHTML = '<option value="">— Todas las UDS —</option>'; selUDS.disabled = true; }
    }

    function onContratoChange() {
        const operadorId = document.getElementById('renovSelectOperador')?.value;
        const contrato = document.getElementById('renovSelectContrato')?.value;
        const selUDS = document.getElementById('renovSelectUDS');
        _ocultarResultados();
        if (!selUDS) return;

        if (!operadorId || !contrato || !_operadores[operadorId]) {
            selUDS.innerHTML = '<option value="">— Todas las UDS —</option>';
            selUDS.disabled = true;
            return;
        }

        const udsLista = _normalizarUDS(_operadores[operadorId], contrato);
        selUDS.innerHTML = '<option value="">— Todas las UDS —</option>' +
            udsLista.map(u => {
                const full = `${u.nombre} - ${u.codigo}`;
                return `<option value="${_esc(full)}">${_esc(u.nombre)} (${_esc(u.codigo)})</option>`;
            }).join('');
        selUDS.disabled = udsLista.length === 0;
    }

    function _ocultarResultados() {
        const wrap = document.getElementById('renovResultadosWrap');
        if (wrap) wrap.style.display = 'none';
        _activos = [];
        _resetLog();
        const input = document.getElementById('renovConfirmInput');
        if (input) input.value = '';
    }

    // Calcula la lista de "activos" (último movimiento = ingreso, sin
    // retiro posterior) para el operador/contrato/UDS seleccionados.
    // Se usa tanto en la búsqueda inicial como para refrescar la tabla
    // justo después de aplicar una desvinculación.
    async function _calcularActivos() {
        const operadorId = document.getElementById('renovSelectOperador')?.value;
        const contrato = document.getElementById('renovSelectContrato')?.value;
        const udsFull = document.getElementById('renovSelectUDS')?.value || '';
        if (!operadorId || !contrato) { _activos = []; return; }

        // Reutiliza el índice global de movimientos (ingresos/retiros) que
        // ya mantiene DuplicadosModule; forzamos recarga para trabajar
        // siempre con el dato más reciente antes de una operación masiva.
        const eventos = await DuplicadosModule.cargarIndiceGlobal(true);

        const filtrados = eventos.filter(ev =>
            ev.origen === 'activas' &&
            ev.operadorId === operadorId &&
            ev.contrato === contrato &&
            (!udsFull || ev.udsFull === udsFull) &&
            ev.documento
        );

        // Agrupar por documento y quedarnos con el último movimiento
        // dentro de este mismo alcance (operador+contrato[+UDS]).
        const porDocumento = new Map();
        filtrados.forEach(ev => {
            const prev = porDocumento.get(ev.documento);
            if (!prev || _fechaOrden(ev) >= _fechaOrden(prev)) {
                porDocumento.set(ev.documento, ev);
            }
        });

        _activos = [...porDocumento.values()]
            .filter(ev => ev.tipo === 'ingreso')
            .sort((a, b) => (a.udsName || '').localeCompare(b.udsName || '') || (a.nombre || '').localeCompare(b.nombre || ''));
    }

    // ── Paso 2: buscar quiénes están activos en ese alcance ──
    async function buscarActivos(btn) {
        const operadorId = document.getElementById('renovSelectOperador')?.value;
        const contrato = document.getElementById('renovSelectContrato')?.value;

        if (!operadorId) { showToast('Selecciona un operador', 'warning'); return; }
        if (!contrato) { showToast('Selecciona un contrato', 'warning'); return; }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }

        try {
            await _calcularActivos();
            _resetLog();
            _renderResultados();
        } catch (e) {
            showToast && showToast('Error al buscar activos: ' + e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar activos'; }
        }
    }

    function _renderResultados(mensajeVacio) {
        const wrap = document.getElementById('renovResultadosWrap');
        const tbody = document.getElementById('renovTablaBody');
        const titulo = document.getElementById('renovResumenTitulo');
        if (!wrap || !tbody) return;

        wrap.style.display = 'block';

        if (_activos.length === 0) {
            titulo.textContent = mensajeVacio || 'No se encontraron usuarios activos en ese alcance';
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:18px">${mensajeVacio ? '✅ Ya no quedan usuarios activos en este alcance.' : 'Sin resultados. Puede que ya estén todos desvinculados.'}</td></tr>`;
        } else {
            titulo.textContent = `${_activos.length} usuario(s) activo(s) encontrado(s)`;
            tbody.innerHTML = _activos.map((u, i) => `
                <tr>
                    <td><input type="checkbox" class="renov-check" data-idx="${i}" checked onchange="RenovacionModule.actualizarContador()"></td>
                    <td>${_esc(u.udsName || '—')}</td>
                    <td><code>${_esc(u.documento)}</code></td>
                    <td>${_esc(u.nombre || '—')}</td>
                    <td>${_formatearFecha(u.fecha)}</td>
                </tr>
            `).join('');
        }

        const checkTodos = document.getElementById('renovCheckTodos');
        if (checkTodos) checkTodos.checked = true;
        actualizarContador();
    }

    function toggleTodos(checked) {
        document.querySelectorAll('.renov-check').forEach(cb => { cb.checked = checked; });
        actualizarContador();
    }

    function _seleccionados() {
        const idxs = [...document.querySelectorAll('.renov-check:checked')].map(cb => parseInt(cb.dataset.idx, 10));
        return idxs.map(i => _activos[i]).filter(Boolean);
    }

    function actualizarContador() {
        const n = _seleccionados().length;
        const span = document.getElementById('renovNumSeleccionados');
        if (span) span.textContent = n;
        toggleAplicar();
    }

    function toggleAplicar() {
        const input = document.getElementById('renovConfirmInput');
        const btn = document.getElementById('renovBtnAplicar');
        if (!input || !btn) return;
        const textoOk = input.value.trim().toUpperCase() === 'RETIRAR';
        const haySeleccion = _seleccionados().length > 0;
        const ok = textoOk && haySeleccion && !_procesando;
        btn.disabled = !ok;
        btn.style.cursor = ok ? 'pointer' : 'not-allowed';
        btn.style.opacity = ok ? '1' : '.5';
    }

    // ── Paso 3: aplicar — crea un registro de retiro por cada
    //    seleccionado, en el mismo operador/contrato/UDS ──────
    async function aplicarDesvinculacion() {
        if (_procesando) return;
        const seleccion = _seleccionados();
        if (seleccion.length === 0) return;

        const operadorId = document.getElementById('renovSelectOperador')?.value;
        const perfil = _operadores[operadorId];
        if (!operadorId || !perfil) { showToast('Selecciona un operador válido', 'warning'); return; }

        // Fecha de retiro elegida en el paso de confirmación (por defecto,
        // hoy). No se permite dejarla vacía ni en el futuro.
        const fechaInput = document.getElementById('renovFechaRetiro');
        const fechaRetiro = fechaInput?.value || _hoyISOFecha();
        if (fechaRetiro > _hoyISOFecha()) {
            showToast('La fecha de retiro no puede ser futura', 'warning');
            return;
        }

        _procesando = true;
        const btn = document.getElementById('renovBtnAplicar');
        const btnHtmlOriginal = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Aplicando...'; }

        _log(`Preparando desvinculación masiva de ${seleccion.length} usuario(s) con fecha de retiro ${_formatearFecha(fechaRetiro)}...`);

        try {
            const path = `novedades_${operadorId}`;
            // Se registra al mediodía de la fecha elegida para evitar
            // corrimientos de día por zona horaria al reconvertir a fecha.
            const hoyISO = new Date(`${fechaRetiro}T12:00:00`).toISOString();
            const hoyFecha = fechaRetiro;
            const updates = {};

            seleccion.forEach(u => {
                const key = database.ref(path).push().key;
                updates[`${path}/${key}`] = {
                    contract: u.contrato,
                    udsName: u.udsName || '',
                    udsFull: u.udsFull || '',
                    regional: u.regional || '',
                    modalidad: u.modalidad || '',
                    timestamp: hoyISO,
                    date: hoyFecha,
                    cuentameStatus: 'pendiente',
                    asociacionId: operadorId,
                    asociacionNombre: perfil.nombre || operadorId,
                    type: 'retiro',
                    hasRetiro: true,
                    hasIngreso: false,
                    retiro: {
                        docType: u.docType || '',
                        document: u.documento,
                        name: u.nombre || '',
                        retiroDate: hoyFecha,
                        gender: u.gender || ''
                    },
                    seguimiento: { estadoInterno: 'pendiente', historial: null },
                    // Trazabilidad: deja constancia de que este retiro se generó
                    // por la herramienta de renovación de contratos, y no fue
                    // diligenciado manualmente por un operador.
                    origenRenovacionMasiva: true,
                    motivo: 'Renovación de numeración de contrato'
                };
                _log(`→ ${u.nombre || u.documento} (${u.documento}) — ${u.udsName || 'UDS s/n'}`);
            });

            await database.ref().update(updates);
            if (typeof DuplicadosModule !== 'undefined') DuplicadosModule.cargarIndiceGlobal(true);

            _log(`✅ Se crearon ${seleccion.length} registro(s) de retiro en Firebase.`);
            showToast && showToast(`✅ ${seleccion.length} usuario(s) desvinculado(s)`, 'success');

            // Refrescar la búsqueda para confirmar que ya no aparecen como activos
            await buscarActivosSilencioso();

            const input = document.getElementById('renovConfirmInput');
            if (input) input.value = '';
        } catch (e) {
            _log(`❌ Error al aplicar: ${e.message}`);
            showToast && showToast('❌ Error al desvincular: ' + e.message, 'error');
        } finally {
            _procesando = false;
            if (btn) btn.innerHTML = btnHtmlOriginal || '🔴 Retirar seleccionados (<span id="renovNumSeleccionados">0</span>)';
            toggleAplicar();
            actualizarContador();
        }
    }

    // Igual que buscarActivos() pero sin tocar el botón/texto del buscador
    // (se usa para refrescar la tabla justo después de aplicar cambios).
    async function buscarActivosSilencioso() {
        await _calcularActivos();
        _renderResultados('0 usuarios activos — todos fueron desvinculados');
    }

    return {
        poblarOperadores,
        onOperadorChange,
        onContratoChange,
        buscarActivos,
        toggleTodos,
        actualizarContador,
        toggleAplicar,
        aplicarDesvinculacion,
        prepararFechaRetiro: _prepararFechaRetiro
    };
})();

// Enlace con el sidebar del Centro de Configuración (mismo patrón que
// usa Mantenimiento Nutricional en js/migracion-oms.js).
function _mostrarVistaRenovacion() {
    document.querySelectorAll('#configCenterSidebar .config-center-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === 'renovacion');
    });
    document.querySelectorAll('#configCenterBody .config-center-view').forEach(vista => {
        vista.classList.toggle('active', vista.id === 'vistaRenovacion');
    });
    RenovacionModule.poblarOperadores();
    RenovacionModule.prepararFechaRetiro();
}
