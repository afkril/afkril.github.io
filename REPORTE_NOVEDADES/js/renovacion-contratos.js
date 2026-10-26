// ============================================================
// MÓDULO: RENOVACIÓN DE CONTRATOS — Desvinculación masiva
// Centro de Configuración del Sistema (index.html)
//
// Cuando unos contratos terminan y arrancan otros (casi siempre con
// las mismas UDS), este módulo desvincula en bloque a todos los
// participantes que siguen activos en los contratos elegidos.
//
//  · Se elige un operador y se calculan los participantes ACTIVOS
//    revisando novedades activas Y archivadas (activo = su último
//    movimiento es un ingreso, sin retiro posterior).
//  · Cada contrato se marca por separado y tiene SU PROPIA fecha de
//    retiro (también existe un atajo para aplicar una misma fecha).
//  · Por cada participante se crea un registro de tipo "retiro"
//    (igual que si el operador lo hubiera diligenciado), pendiente de
//    cargar a Cuéntame. El histórico existente no se modifica.
//  · Quien ingresó DESPUÉS de la fecha elegida se omite (un retiro no
//    puede quedar antes del ingreso) y se avisa en pantalla.
// ============================================================

const RenovacionModule = (() => {

    let _operadorId = '';
    let _perfil = null;
    let _porContrato = {};      // código de contrato -> [participantes activos]
    let _sinContrato = 0;       // activos cuyo registro no trae contrato
    let _procesando = false;
    const BLOQUE = 400;         // máx. de registros por escritura a Firebase

    // ── Helpers ─────────────────────────────────────────────
    function _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    const _$ = id => document.getElementById(id);

    function _hoyISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // 'YYYY-MM-DD…' -> 'YYYY-MM-DD' (o '' si no es una fecha reconocible)
    function _soloFecha(v) {
        const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const d = new Date(v);
        if (!v || isNaN(d)) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function _dmy(iso) {
        const f = _soloFecha(iso);
        return f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '—';
    }

    function _log(msg) {
        const el = _$('renovLog');
        if (!el) return;
        el.style.display = 'block';
        el.textContent += (el.textContent ? '\n' : '') + msg;
        el.scrollTop = el.scrollHeight;
    }
    function _resetLog() {
        const el = _$('renovLog');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    async function _leerNodo(path) {
        const snap = await database.ref(path).once('value');
        return snap.val() || {};
    }

    // ── Lectura y cálculo de activos ────────────────────────
    // Convierte los registros de un nodo (novedades o archivados) en una
    // lista de movimientos (un ingreso y/o un retiro por registro).
    function _movimientos(registros, origen) {
        const out = [];
        Object.entries(registros || {}).forEach(([id, r]) => {
            if (!r) return;
            const ts = new Date(r.timestamp || r.date || 0).getTime() || 0;
            const base = {
                noveltyId: id, origen, ts,
                contrato: String(r.contract || ''),
                udsName: r.udsName || '', udsFull: r.udsFull || '',
                regional: r.regional || '', modalidad: r.modalidad || ''
            };
            if ((r.hasIngreso || r.type === 'ingreso' || r.type === 'ambos') && r.ingreso && r.ingreso.document) {
                out.push({
                    ...base, tipo: 'ingreso', ord: 1,
                    documento: String(r.ingreso.document).trim(),
                    nombre: r.ingreso.name || r.name || '',
                    docType: r.ingreso.docType || '', gender: r.ingreso.gender || '',
                    fecha: _soloFecha(r.ingreso.ingresoDate || r.date || r.timestamp)
                });
            }
            if ((r.hasRetiro || r.type === 'retiro' || r.type === 'ambos') && r.retiro && r.retiro.document) {
                out.push({
                    ...base, tipo: 'retiro', ord: 0,
                    documento: String(r.retiro.document).trim(),
                    nombre: r.retiro.name || r.name || '',
                    docType: r.retiro.docType || '', gender: r.retiro.gender || '',
                    fecha: _soloFecha(r.retiro.retiroDate || r.date || r.timestamp)
                });
            }
        });
        return out;
    }

    // Último movimiento por documento (fecha → hora de registro → ingreso
    // gana a retiro si es el mismo día y el mismo registro "ambos").
    function _calcularActivos(eventos) {
        const ultimo = new Map();
        eventos.forEach(ev => {
            if (!ev.documento) return;
            const prev = ultimo.get(ev.documento);
            if (!prev || _cmp(ev, prev) >= 0) ultimo.set(ev.documento, ev);
        });
        const porContrato = {};
        let sinContrato = 0;
        ultimo.forEach(ev => {
            if (ev.tipo !== 'ingreso') return;
            if (!ev.contrato) { sinContrato++; return; }
            (porContrato[ev.contrato] = porContrato[ev.contrato] || []).push(ev);
        });
        Object.values(porContrato).forEach(l => l.sort((a, b) =>
            (a.udsName || '').localeCompare(b.udsName || '') || (a.nombre || '').localeCompare(b.nombre || '')));
        return { porContrato, sinContrato };
    }
    function _cmp(a, b) {
        return (a.fecha || '').localeCompare(b.fecha || '') || (a.ts - b.ts) || (a.ord - b.ord);
    }

    async function _cargarActivos() {
        const [activas, archivadas] = await Promise.all([
            _leerNodo(`novedades_${_operadorId}`),
            _leerNodo(`archivados_${_operadorId}`)
        ]);
        const eventos = _movimientos(activas, 'activas').concat(_movimientos(archivadas, 'archivadas'));
        const r = _calcularActivos(eventos);
        _porContrato = r.porContrato;
        _sinContrato = r.sinContrato;
    }

    // ── Paso 1: operador ────────────────────────────────────
    async function poblarOperadores() {
        const sel = _$('renovSelectOperador');
        if (!sel) return;
        const actual = sel.value;
        try {
            const todos = await AsociacionesModule.cargarAsociaciones();
            RenovacionModule._operadores = todos || {};
        } catch (e) {
            showToast('Error al cargar operadores: ' + e.message, 'error');
            return;
        }
        const entradas = Object.entries(RenovacionModule._operadores);
        sel.innerHTML = '<option value="">— Selecciona un operador —</option>' +
            entradas.map(([id, d]) => `<option value="${_esc(id)}">🏢 ${_esc(d.nombre || id)}</option>`).join('');
        if (actual && RenovacionModule._operadores[actual]) sel.value = actual;
    }

    function onOperadorChange() {
        _ocultarResultados();
    }

    function _ocultarResultados() {
        const wrap = _$('renovResultadosWrap');
        if (wrap) wrap.style.display = 'none';
        _porContrato = {}; _sinContrato = 0;
        _resetLog();
        const input = _$('renovConfirmInput');
        if (input) input.value = '';
    }

    // ── Paso 2: buscar activos ──────────────────────────────
    async function buscarActivos(btn) {
        const id = _$('renovSelectOperador')?.value;
        if (!id) { showToast('Selecciona un operador', 'warning'); return; }
        const perfil = (RenovacionModule._operadores || {})[id];
        if (!perfil) { showToast('Operador no encontrado', 'error'); return; }

        _operadorId = id;
        _perfil = perfil;
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }
        try {
            await _cargarActivos();
            _resetLog();
            _render();
        } catch (e) {
            showToast('Error al buscar activos: ' + e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar activos'; }
        }
    }

    // Contratos a mostrar: los del perfil + cualquiera con activos que ya no esté en él
    function _codigosContratos() {
        const cods = new Set(Object.keys((_perfil && _perfil.contratos) || {}));
        Object.keys(_porContrato).forEach(c => cods.add(c));
        return [...cods];
    }

    function _estadoFilas() {
        const est = {};
        document.querySelectorAll('.renov-fila').forEach(f => {
            const cod = f.dataset.cod;
            est[cod] = {
                marcado: !!f.querySelector('.renov-check-contrato')?.checked,
                fecha: f.querySelector('input[type=date]')?.value || ''
            };
        });
        return est;
    }

    function _render() {
        const wrap = _$('renovResultadosWrap');
        const lista = _$('renovContratosLista');
        const titulo = _$('renovResumenTitulo');
        if (!wrap || !lista) return;
        wrap.style.display = 'block';

        const previo = _estadoFilas();
        const hoy = _hoyISO();
        const cods = _codigosContratos();
        const total = cods.reduce((n, c) => n + (_porContrato[c] || []).length, 0);

        titulo.textContent = `${total} participante(s) activo(s) en ${cods.filter(c => (_porContrato[c] || []).length).length} contrato(s)` +
            (_sinContrato ? ` · ${_sinContrato} sin contrato asignado (no incluidos)` : '');

        // Con activos primero
        cods.sort((a, b) => ((_porContrato[b] || []).length > 0) - ((_porContrato[a] || []).length > 0) || a.localeCompare(b));

        lista.innerHTML = cods.map(cod => {
            const act = _porContrato[cod] || [];
            const nAct = act.filter(p => p.origen === 'activas').length;
            const nArc = act.length - nAct;
            const label = (_perfil.contratos || {})[cod] || `Contrato ${cod}`;
            const color = (_perfil.colores_contratos || {})[cod] || '#94a3b8';
            const reg = (_perfil.regionales_contratos || {})[cod] || '—';
            const mod = (_perfil.modalidades_contratos || {})[cod] || '—';
            const inactivo = ((_perfil.estados_contratos || {})[cod] === 'inactivo');
            const enPerfil = !!(_perfil.contratos || {})[cod];
            const p = previo[cod] || {};
            const vacio = act.length === 0;
            return `
            <div class="renov-fila${vacio ? ' is-vacio' : ''}${p.marcado ? ' is-marcado' : ''}" data-cod="${_esc(cod)}">
                <div class="renov-fila-top">
                    <input type="checkbox" class="renov-check-contrato" ${vacio ? 'disabled' : ''} ${p.marcado && !vacio ? 'checked' : ''}
                        onchange="RenovacionModule.onCambio()" title="Desvincular este contrato">
                    <div class="renov-fila-info">
                        <div class="renov-fila-nombre"><span class="renov-dot" style="background:${_esc(color)}"></span>
                            📄 ${_esc(label)}
                            ${inactivo ? '<span class="contract-estado-badge is-inactivo">Inactivo</span>' : ''}
                            ${enPerfil ? '' : '<span class="contract-estado-badge is-inactivo">No está en el operador</span>'}
                        </div>
                        <div class="renov-fila-meta">${_esc(cod)} · ${_esc(reg)} · ${_esc(mod)}${vacio ? ' · sin participantes activos' : ` · ${nAct} en activas, ${nArc} en archivadas`}</div>
                    </div>
                    <div class="renov-count"><b>${act.length}</b><span>activos</span></div>
                    <label class="renov-fila-fecha">Fecha de retiro
                        <input type="date" value="${_esc(p.fecha || hoy)}" ${vacio ? 'disabled' : ''} onchange="RenovacionModule.onCambio()">
                    </label>
                </div>
                <div class="renov-aviso" style="display:none"></div>
                ${vacio ? '' : `
                <details class="renov-detalle">
                    <summary>Ver participantes (${act.length})</summary>
                    <div class="renov-detalle-tabla"><table>
                        <thead><tr><th>UDS</th><th>Documento</th><th>Nombre</th><th>Ingreso</th><th>Origen</th></tr></thead>
                        <tbody>${act.map(a => `<tr>
                            <td>${_esc(a.udsName || '—')}</td><td><code>${_esc(a.documento)}</code></td>
                            <td>${_esc(a.nombre || '—')}</td><td>${_dmy(a.fecha)}</td>
                            <td><span class="renov-tag ${a.origen === 'activas' ? 'act' : 'arc'}">${a.origen === 'activas' ? 'Activa' : 'Archivada'}</span></td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                </details>`}
            </div>`;
        }).join('') || '<div style="text-align:center;color:#94a3b8;padding:18px">Este operador no tiene contratos.</div>';

        const gl = _$('renovFechaGlobal');
        if (gl) { gl.value = gl.value || hoy; }
        onCambio();
    }

    // Participantes de un contrato que SÍ se pueden retirar en esa fecha
    function _elegibles(cod, fecha) {
        const todos = _porContrato[cod] || [];
        return {
            ok: todos.filter(p => !p.fecha || p.fecha <= fecha),
            omitidos: todos.filter(p => p.fecha && p.fecha > fecha)
        };
    }

    function onCambio() {
        const hoy = _hoyISO();
        let totalPersonas = 0, totalContratos = 0, hayError = false;
        const partes = [];

        document.querySelectorAll('.renov-fila').forEach(fila => {
            const cod = fila.dataset.cod;
            const marcado = !!fila.querySelector('.renov-check-contrato')?.checked;
            const fecha = fila.querySelector('input[type=date]')?.value || '';
            const aviso = fila.querySelector('.renov-aviso');
            fila.classList.toggle('is-marcado', marcado);

            let msg = '', esError = false;
            if (marcado) {
                if (!fecha) { msg = '⛔ Define la fecha de retiro de este contrato.'; esError = true; hayError = true; }
                else {
                    const { ok, omitidos } = _elegibles(cod, fecha);
                    if (omitidos.length) msg += `⚠️ ${omitidos.length} participante(s) ingresaron después del ${_dmy(fecha)} y se omitirán. `;
                    if (fecha > hoy) msg += 'ℹ️ La fecha es futura. ';
                    if (ok.length === 0) { msg += '⛔ Ningún participante se puede retirar con esa fecha: este contrato se omitirá.'; esError = true; }
                    else {
                        totalPersonas += ok.length; totalContratos++;
                        partes.push(`<b>${_esc((_perfil.contratos || {})[cod] || cod)}</b>: ${ok.length} con retiro al ${_dmy(fecha)}`);
                    }
                }
            }
            if (aviso) {
                aviso.style.display = msg ? 'block' : 'none';
                aviso.textContent = msg;
                aviso.classList.toggle('is-error', esError);
            }
        });

        const resumen = _$('renovResumenAccion');
        if (resumen) {
            resumen.innerHTML = totalContratos
                ? `Se desvincularán <b>${totalPersonas}</b> participante(s) de <b>${totalContratos}</b> contrato(s):<br>• ${partes.join('<br>• ')}`
                : 'Marca al menos un contrato con participantes activos.';
        }
        RenovacionModule._pendientes = { totalPersonas, hayError };
        toggleAplicar();
    }

    function aplicarFechaGlobal() {
        const f = _$('renovFechaGlobal')?.value;
        if (!f) { showToast('Elige la fecha que quieres aplicar', 'warning'); return; }
        const filas = [...document.querySelectorAll('.renov-fila')];
        const marcadas = filas.filter(fl => fl.querySelector('.renov-check-contrato')?.checked);
        (marcadas.length ? marcadas : filas).forEach(fl => {
            const inp = fl.querySelector('input[type=date]');
            if (inp && !inp.disabled) inp.value = f;
        });
        onCambio();
    }

    function toggleAplicar() {
        const input = _$('renovConfirmInput');
        const btn = _$('renovBtnAplicar');
        if (!input || !btn) return;
        const p = RenovacionModule._pendientes || { totalPersonas: 0, hayError: false };
        const textoOk = input.value.trim().toUpperCase() === 'RETIRAR';
        btn.disabled = !(textoOk && p.totalPersonas > 0 && !p.hayError && !_procesando);
    }

    // ── Paso 3: aplicar ─────────────────────────────────────
    function _construirRegistro(p, cod, fecha, lote) {
        const perfil = _perfil || {};
        return {
            contract: cod,
            udsName: p.udsName || '',
            udsFull: p.udsFull || '',
            regional: p.regional || (perfil.regionales_contratos || {})[cod] || '',
            modalidad: p.modalidad || (perfil.modalidades_contratos || {})[cod] || '',
            // Mediodía de la fecha elegida: evita corrimientos de día por zona horaria
            timestamp: new Date(`${fecha}T12:00:00`).toISOString(),
            date: fecha,
            registradoEn: new Date().toISOString(),
            cuentameStatus: 'pendiente',
            asociacionId: _operadorId,
            asociacionNombre: perfil.nombre || _operadorId,
            type: 'retiro',
            hasRetiro: true,
            hasIngreso: false,
            document: p.documento,
            name: p.nombre || '',
            retiro: {
                docType: p.docType || '',
                document: p.documento,
                name: p.nombre || '',
                retiroDate: fecha,
                gender: p.gender || ''
            },
            seguimiento: { estadoInterno: 'pendiente', historial: null },
            // Trazabilidad: generado por la renovación de contratos, no por un operador
            origenRenovacionMasiva: true,
            loteRenovacion: lote,
            motivo: 'Renovación de contratos'
        };
    }

    async function aplicarDesvinculacion() {
        if (_procesando) return;

        // Foto de lo marcado en este momento
        const tareas = [];
        let total = 0;
        document.querySelectorAll('.renov-fila').forEach(fila => {
            if (!fila.querySelector('.renov-check-contrato')?.checked) return;
            const cod = fila.dataset.cod;
            const fecha = fila.querySelector('input[type=date]')?.value || '';
            if (!fecha) return;
            const { ok, omitidos } = _elegibles(cod, fecha);
            if (ok.length) { tareas.push({ cod, fecha, ok, omitidos: omitidos.length }); total += ok.length; }
        });
        if (!tareas.length) return;

        const detalle = tareas.map(t => `• ${(_perfil.contratos || {})[t.cod] || t.cod}: ${t.ok.length} → retiro ${_dmy(t.fecha)}`).join('\n');
        if (!confirm(`⚠️ Se crearán ${total} registros de RETIRO en "${_perfil.nombre || _operadorId}":\n\n${detalle}\n\nQuedarán pendientes de cargar a Cuéntame. ¿Continuar?`)) return;

        _procesando = true;
        const btn = _$('renovBtnAplicar');
        const textoOriginal = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Aplicando...'; }
        _resetLog();

        const lote = `renov_${Date.now()}`;
        const path = `novedades_${_operadorId}`;
        let creados = 0, fallidos = 0;

        try {
            for (const t of tareas) {
                _log(`📄 ${(_perfil.contratos || {})[t.cod] || t.cod} — ${t.ok.length} retiro(s) con fecha ${_dmy(t.fecha)}` +
                     (t.omitidos ? ` (${t.omitidos} omitido(s) por ingresar después)` : ''));
                for (let i = 0; i < t.ok.length; i += BLOQUE) {
                    const trozo = t.ok.slice(i, i + BLOQUE);
                    const updates = {};
                    trozo.forEach(p => {
                        const key = database.ref(path).push().key;
                        updates[`${path}/${key}`] = _construirRegistro(p, t.cod, t.fecha, lote);
                    });
                    try {
                        await database.ref().update(updates);
                        creados += trozo.length;
                        _log(`   ✔ ${Math.min(i + BLOQUE, t.ok.length)}/${t.ok.length}`);
                    } catch (e) {
                        fallidos += trozo.length;
                        _log(`   ❌ Falló un bloque de ${trozo.length}: ${e.message}`);
                    }
                }
            }

            _log(fallidos
                ? `⚠️ Terminó con errores: ${creados} retiro(s) creados, ${fallidos} fallidos. Vuelve a buscar y repite solo lo pendiente.`
                : `✅ Listo: ${creados} retiro(s) creados (lote ${lote}).`);
            showToast(fallidos ? `⚠️ ${creados} desvinculados, ${fallidos} con error` : `✅ ${creados} participante(s) desvinculado(s)`,
                      fallidos ? 'warning' : 'success', 4000);

            if (typeof DuplicadosModule !== 'undefined' && DuplicadosModule.cargarIndiceGlobal) {
                DuplicadosModule.cargarIndiceGlobal(true).catch(() => {});
            }
            // Releer para confirmar que ya no aparecen como activos
            await _cargarActivos();
            _render();
            const input = _$('renovConfirmInput');
            if (input) input.value = '';
        } catch (e) {
            _log(`❌ Error al aplicar: ${e.message}`);
            showToast('❌ Error al desvincular: ' + e.message, 'error');
        } finally {
            _procesando = false;
            if (btn) btn.textContent = textoOriginal || '🔴 Desvincular participantes';
            toggleAplicar();
        }
    }

    // Se exponen para pruebas y para el sidebar
    return {
        _operadores: {},
        _pendientes: { totalPersonas: 0, hayError: false },
        poblarOperadores,
        onOperadorChange,
        buscarActivos,
        onCambio,
        aplicarFechaGlobal,
        toggleAplicar,
        aplicarDesvinculacion,
        // internos expuestos solo para pruebas
        _t: { calcularActivos: _calcularActivos, movimientos: _movimientos }
    };
})();

// Enlace con el sidebar del Centro de Configuración (mismo patrón que
// Mantenimiento Nutricional en js/migracion-oms.js).
function _mostrarVistaRenovacion() {
    document.querySelectorAll('#configCenterSidebar .config-center-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === 'renovacion');
    });
    document.querySelectorAll('#configCenterBody .config-center-view').forEach(vista => {
        vista.classList.toggle('active', vista.id === 'vistaRenovacion');
    });
    const acciones = document.getElementById('wizardActions');
    if (acciones) acciones.style.display = 'none';
    RenovacionModule.poblarOperadores();
}
