// ============================================================
// DUPLICADOS.JS v2.0 — Vista horizontal tipo línea de tiempo
// con acordeón, filtros integrados y modal desde Novedades Activas
// ============================================================

const DuplicadosModule = (function () {

    const CACHE_MS = 3 * 60 * 1000;

    let _indiceGlobal = [];
    let _ultimaCarga = 0;
    let _cargando = false;
    let _promesaCarga = null;
    let _casosCache = [];
    const _debounceTimers = {};
    let _casoExpandido = null; // ID del caso actualmente expandido
    let _ultimoCaso = { retiro: null, ingreso: null }; // último caso encontrado por campo, para "Autocompletar"

    // ── Helpers ─────────────────────────────────────────────
    function _esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function _fechaOrden(ev) {
        return new Date(ev.fecha || ev.timestamp || 0).getTime() || 0;
    }

    function _formatearFechaCorta(fechaStr) {
        if (!fechaStr) return '—';
        const d = new Date(fechaStr);
        if (isNaN(d)) return fechaStr;
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
    }

    function _formatearFechaDMY(fechaStr) {
        if (!fechaStr) return '—';
        const d = new Date(fechaStr);
        if (isNaN(d)) return fechaStr;
        const dd = String(d.getDate()).padStart(2,'0');
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }

    async function _leerNodo(path) {
        try {
            const snap = await database.ref(path).once('value');
            return snap.val() || {};
        } catch (e) {
            console.warn(`[Duplicados] No se pudo leer ${path}:`, e.message);
            return {};
        }
    }

    function _extraerMovimientos(registros, operadorId, operadorNombre, origen) {
        const eventos = [];
        Object.entries(registros || {}).forEach(([id, r]) => {
            if (!r) return;
            const base = {
                contrato: r.contract || '',
                udsName: r.udsName || '',
                udsFull: r.udsFull || '',
                regional: r.regional || '',
                modalidad: r.modalidad || '',
                operadorId, operadorNombre, origen,
                noveltyId: id,
                timestamp: r.timestamp || r.date || ''
            };

            if ((r.hasIngreso || r.type === 'ingreso' || r.type === 'ambos') && r.ingreso && r.ingreso.document) {
                eventos.push({
                    ...base,
                    documento: String(r.ingreso.document).trim(),
                    nombre: r.ingreso.name || r.name || '',
                    tipo: 'ingreso',
                    fecha: r.ingreso.ingresoDate || r.date || '',
                    // Datos adicionales para autocompletar (todo menos lo nutricional)
                    docType: r.ingreso.docType || '',
                    gender: r.ingreso.gender || '',
                    dob: r.ingreso.dob || '',
                    comuna: r.ingreso.comuna || '',
                    barrio: r.ingreso.barrio || '',
                    address: r.ingreso.address || '',
                    phone: r.ingreso.phone || '',
                    acudiente: r.ingreso.acudiente || '',
                    acudienteDoc: r.ingreso.acudienteDoc || '',
                    acudienteDOB: r.ingreso.acudienteDOB || ''
                });
            }
            if ((r.hasRetiro || r.type === 'retiro' || r.type === 'ambos') && r.retiro && r.retiro.document) {
                eventos.push({
                    ...base,
                    documento: String(r.retiro.document).trim(),
                    nombre: r.retiro.name || r.name || '',
                    tipo: 'retiro',
                    fecha: r.retiro.retiroDate || r.date || '',
                    // Datos adicionales para autocompletar
                    docType: r.retiro.docType || '',
                    gender: r.retiro.gender || ''
                });
            }
        });
        return eventos;
    }

    // ── Índice global ────────────────────────────────────────
    async function cargarIndiceGlobal(forzar = false) {
        const ahora = Date.now();
        if (!forzar && _ultimaCarga && (ahora - _ultimaCarga) < CACHE_MS && _indiceGlobal.length) {
            return _indiceGlobal;
        }
        if (_cargando) return _promesaCarga;

        _cargando = true;
        _promesaCarga = (async () => {
            try {
                const asociaciones = await AsociacionesModule.cargarAsociaciones();
                const entradas = Object.entries(asociaciones || {});
                let eventos = [];

                await Promise.all(entradas.map(async ([id, datos]) => {
                    const nombre = (datos && datos.nombre) || id;
                    const [activos, archivados] = await Promise.all([
                        _leerNodo(`novedades_${id}`),
                        _leerNodo(`archivados_${id}`)
                    ]);
                    eventos = eventos.concat(_extraerMovimientos(activos, id, nombre, 'activas'));
                    eventos = eventos.concat(_extraerMovimientos(archivados, id, nombre, 'archivadas'));
                }));

                _indiceGlobal = eventos;
                _ultimaCarga = Date.now();
                return _indiceGlobal;
            } finally {
                _cargando = false;
            }
        })();

        return _promesaCarga;
    }

    // ── Agrupación y análisis ───────────────────────────────
    function _agruparPorDocumento(eventos) {
        const mapa = new Map();
        eventos.forEach(ev => {
            if (!ev.documento) return;
            if (!mapa.has(ev.documento)) mapa.set(ev.documento, []);
            mapa.get(ev.documento).push(ev);
        });
        return mapa;
    }

    function _analizarCaso(eventos) {
        const ordenados = [...eventos].sort((a, b) => _fechaOrden(a) - _fechaOrden(b));
        const operadores = [...new Set(ordenados.map(e => e.operadorNombre).filter(Boolean))];
        const udsSet = new Set(ordenados.map(e => e.udsName).filter(Boolean));
        const contratosSet = new Set(ordenados.map(e => e.contrato).filter(Boolean));

        let categoria = 'multiple';
        if (operadores.length > 1) categoria = 'operador';
        else if (udsSet.size > 1 && contratosSet.size === 1) categoria = 'uds_mismo_contrato';
        else if (udsSet.size > 1) categoria = 'uds_distinto_contrato';

        const ingresos = ordenados.filter(e => e.tipo === 'ingreso');
        const retiros = ordenados.filter(e => e.tipo === 'retiro');
        const ultimoIngreso = ingresos.length ? ingresos[ingresos.length - 1] : null;
        const ultimoRetiro = retiros.length ? retiros[retiros.length - 1] : null;

        const nombre = (ordenados.slice().reverse().find(e => e.nombre) || {}).nombre || '';

        // Detectar si hay traslado (cambio de UDS sin retiro previo en la misma UDS)
        const movimientosConTipo = ordenados.map((ev, idx) => {
            let tipoMov = ev.tipo === 'ingreso' ? 'Ingreso' : 'Retiro';
            if (idx > 0 && ev.tipo === 'ingreso' && ordenados[idx-1].tipo === 'retiro' && 
                ordenados[idx-1].udsName !== ev.udsName) {
                tipoMov = 'Reingreso';
            }
            if (idx > 0 && ev.tipo === 'ingreso' && ordenados[idx-1].tipo === 'ingreso' &&
                ordenados[idx-1].udsName !== ev.udsName) {
                tipoMov = 'Cambio de UDS';
            }
            if (idx > 0 && ev.tipo === 'ingreso' && ordenados[idx-1].tipo === 'retiro' &&
                ordenados[idx-1].udsName === ev.udsName) {
                tipoMov = 'Reingreso';
            }
            if (ev.tipo === 'retiro' && idx < ordenados.length - 1 && 
                ordenados[idx+1].tipo === 'ingreso' && ordenados[idx+1].udsName !== ev.udsName) {
                tipoMov = 'Traslado';
            }
            return { ...ev, tipoMovimiento: tipoMov };
        });

        return {
            id: ordenados[0].documento,
            documento: ordenados[0].documento,
            nombre,
            eventos: movimientosConTipo,
            operadores,
            udsDistintas: [...udsSet],
            contratosDistintos: [...contratosSet],
            categoria,
            ultimoIngreso,
            ultimoRetiro,
            totalMovimientos: ordenados.length
        };
    }

    async function obtenerCasosDuplicados(forzar = false) {
        const eventos = await cargarIndiceGlobal(forzar);
        const mapa = _agruparPorDocumento(eventos);
        const casos = [];
        mapa.forEach(evs => {
            if (evs.length > 1) casos.push(_analizarCaso(evs));
        });
        casos.sort((a, b) => b.eventos.length - a.eventos.length);
        _casosCache = casos;
        return casos;
    }

    async function buscarPorDocumento(documento) {
        const doc = String(documento || '').trim();
        if (!doc || doc.length < 5) return null;
        const eventos = await cargarIndiceGlobal(false);
        const coincidencias = eventos.filter(e => e.documento === doc);
        if (!coincidencias.length) return null;
        return _analizarCaso(coincidencias);
    }

    // ── Validación en tiempo real ──────────────────────────
    function limpiarAviso(tipoCampo) {
        const box = document.getElementById(tipoCampo === 'retiro' ? 'retiroDupWarning' : 'ingresoDupWarning');
        if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
        _ultimoCaso[tipoCampo] = null;
    }

    function limpiarAvisos() {
        limpiarAviso('retiro');
        limpiarAviso('ingreso');
    }

    function _renderCajaAdvertencia(caso, tipoCampo) {
        const linea = (ev, etiqueta) => ev
            ? `<div class="dup-line"><strong>${etiqueta}:</strong> ${_formatearFechaDMY(ev.fecha)} — ${_esc(ev.udsName || 'UDS N/A')} (${_esc(ev.operadorNombre)})</div>`
            : `<div class="dup-line dup-line--muted"><strong>${etiqueta}:</strong> sin registro</div>`;

        const activo = tipoCampo === 'ingreso'
            && caso.ultimoIngreso
            && (!caso.ultimoRetiro || _fechaOrden(caso.ultimoRetiro) < _fechaOrden(caso.ultimoIngreso));

        // ¿El movimiento más reciente de este documento es un RETIRO? (útil sobre todo al ingresar)
        const retiradoRecientemente = caso.ultimoRetiro
            && (!caso.ultimoIngreso || _fechaOrden(caso.ultimoRetiro) >= _fechaOrden(caso.ultimoIngreso));

        return `
            <div class="dup-warning-header">⚠️ Participante Duplicado${caso.nombre ? ' — ' + _esc(caso.nombre) : ''}</div>
            ${linea(caso.ultimoIngreso, 'Último Ingreso')}
            ${linea(caso.ultimoRetiro, 'Último Retiro')}
            ${activo ? '<div class="dup-line dup-line--danger">🔴 Este participante tiene un INGRESO ACTIVO registrado, sin retiro posterior.</div>' : ''}
            ${tipoCampo === 'ingreso' && retiradoRecientemente ? '<div class="dup-line dup-line--muted">🟠 Este documento figura como <strong>RETIRADO</strong> en su último movimiento. Al autocompletar se cargará al menos el nombre y el género.</div>' : ''}
            <div class="dup-line dup-line--muted">Operador(es): ${caso.operadores.map(_esc).join(', ') || 'N/A'} · ${caso.eventos.length} movimiento(s)</div>
            <div class="dup-warning-actions">
                <button type="button" onclick="DuplicadosModule.abrirModalCaso('${caso.documento}')" class="dup-warning-btn dup-warning-btn-blue">
                    📋 Ver Línea de Tiempo
                </button>
                <button type="button" onclick="DuplicadosModule.autocompletar('${tipoCampo}')" class="dup-warning-btn dup-warning-btn-purple">
                    🧩 Autocompletar
                </button>
            </div>
        `;
    }

    function verificarCampo(documento, tipoCampo) {
        const boxId = tipoCampo === 'retiro' ? 'retiroDupWarning' : 'ingresoDupWarning';
        const box = document.getElementById(boxId);
        const doc = String(documento || '').trim();

        if (!doc || doc.length < 5) {
            if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
            return;
        }

        clearTimeout(_debounceTimers[tipoCampo]);
        _debounceTimers[tipoCampo] = setTimeout(async () => {
            if (box) {
                box.classList.remove('hidden');
                box.innerHTML = '<span class="dup-loading">🔎 Verificando en toda la base de datos…</span>';
            }
            let caso = null;
            try {
                caso = await buscarPorDocumento(doc);
            } catch (e) {
                console.warn('[Duplicados] Error verificando documento:', e.message);
            }

            const inputId = tipoCampo === 'retiro' ? 'retiroDocNumber' : 'ingresoDocNumber';
            const inputActual = document.getElementById(inputId);
            if (inputActual && inputActual.value.trim() !== doc) return;
            if (!box) return;

            _ultimoCaso[tipoCampo] = caso;

            if (!caso) {
                box.classList.add('hidden');
                box.innerHTML = '';
                return;
            }

            box.classList.remove('hidden');
            box.innerHTML = _renderCajaAdvertencia(caso, tipoCampo);
            if (typeof showToast === 'function') {
                showToast(`⚠️ Participante Duplicado — ${caso.eventos.length} movimiento(s) encontrados`, 'warning', 3500);
            }
        }, 450);
    }

    // ── Autocompletar con datos de un registro existente ───
    // (nunca toca los campos de nutrición: peso, talla, PB, EPS, régimen)
    function _mejorFuenteDatos(caso, tipoCampo) {
        if (!caso || !caso.eventos || !caso.eventos.length) return null;
        const eventos = [...caso.eventos].sort((a, b) => _fechaOrden(b) - _fechaOrden(a)); // más reciente primero

        if (tipoCampo === 'ingreso') {
            // Preferir el ingreso más reciente que tenga datos de contacto/ubicación
            const conDatos = eventos.find(e => e.tipo === 'ingreso' && (e.address || e.phone || e.dob || e.comuna));
            if (conDatos) return conDatos;
            // Si no hay un ingreso con datos completos, usar cualquier evento con nombre/género (p.ej. un retiro)
            return eventos.find(e => e.nombre || e.gender) || eventos[0];
        }

        // tipoCampo === 'retiro': preferir el último retiro conocido
        const conRetiro = eventos.find(e => e.tipo === 'retiro');
        if (conRetiro) return conRetiro;
        return eventos.find(e => e.nombre || e.gender) || eventos[0];
    }

    function autocompletar(tipoCampo) {
        const caso = _ultimoCaso[tipoCampo];
        if (!caso) {
            if (typeof showToast === 'function') showToast('No hay un registro anterior disponible para autocompletar.', 'warning');
            return;
        }
        const fuente = _mejorFuenteDatos(caso, tipoCampo);
        if (!fuente) {
            if (typeof showToast === 'function') showToast('No se encontraron datos para autocompletar.', 'info');
            return;
        }

        let llenados = 0;
        const flash = (el) => {
            el.classList.add('dup-autofilled');
            setTimeout(() => el.classList.remove('dup-autofilled'), 1200);
        };
        const setVal = (id, val) => {
            if (val === undefined || val === null || val === '') return;
            const el = document.getElementById(id);
            if (!el) return;
            el.value = val;
            flash(el);
            llenados++;
        };
        const setRadio = (name, val) => {
            if (!val) return;
            const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
            if (!radio) return;
            radio.checked = true;
            const wrap = radio.closest('label') || radio;
            flash(wrap);
            llenados++;
        };

        if (tipoCampo === 'retiro') {
            setVal('retiroDocType', fuente.docType);
            setVal('retiroFullName', fuente.nombre);
            setRadio('_retiroGender', fuente.gender);
        } else {
            setVal('ingresoDocType', fuente.docType);
            setVal('ingresoFullName', fuente.nombre);
            setRadio('_ingresoGender', fuente.gender);
            setVal('ingresoDOB', fuente.dob);
            setVal('ingresoComuna', fuente.comuna);
            setVal('ingresoBarrio', fuente.barrio);
            setVal('ingresoAddress', fuente.address);
            setVal('ingresoPhone', fuente.phone);
            setVal('acudienteName', fuente.acudiente);
            setVal('acudienteDoc', fuente.acudienteDoc);
            setVal('acudienteDOB', fuente.acudienteDOB);
            if (typeof updateAgeDisplay === 'function') updateAgeDisplay();
            if (typeof calcularEstadoNutricional === 'function') calcularEstadoNutricional();
        }

        if (typeof showToast === 'function') {
            showToast(
                llenados > 0
                    ? `✅ ${llenados} campo(s) autocompletado(s) desde un registro anterior. Verifica que la dirección y demás datos sigan siendo correctos.`
                    : 'El registro encontrado no tenía datos adicionales para autocompletar.',
                llenados > 0 ? 'success' : 'info',
                4500
            );
        }
    }

    // ── Badges de categoría ─────────────────────────────────
    function _badgeCategoria(cat) {
        switch (cat) {
            case 'operador': return '<span class="dup-badge dup-badge--purple">🔁 Cambio de Operador</span>';
            case 'uds_mismo_contrato': return '<span class="dup-badge dup-badge--blue">📍 Cambio de UDS</span>';
            case 'uds_distinto_contrato': return '<span class="dup-badge dup-badge--orange">📄 UDS + Contrato</span>';
            default: return '<span class="dup-badge dup-badge--gray">🔄 Múltiples</span>';
        }
    }

    function _colorPorTipoMovimiento(tipo) {
        switch(tipo) {
            case 'Ingreso': return '#22c55e';
            case 'Retiro': return '#ef4444';
            case 'Traslado': return '#f59e0b';
            case 'Cambio de UDS': return '#3b82f6';
            case 'Reingreso': return '#10b981';
            default: return '#6b7280';
        }
    }

    function _iconoPorTipoMovimiento(tipo) {
        switch(tipo) {
            case 'Ingreso': return '➕';
            case 'Retiro': return '➖';
            case 'Traslado': return '↔️';
            case 'Cambio de UDS': return '🔄';
            case 'Reingreso': return '🔁';
            default: return '●';
        }
    }

    // ── Renderizado horizontal tipo imagen de referencia ─────
    function _renderTimelineHorizontal(eventos) {
        if (!eventos || eventos.length === 0) return '';

        const items = eventos.map((ev, idx) => {
            const color = _colorPorTipoMovimiento(ev.tipoMovimiento);
            const icono = _iconoPorTipoMovimiento(ev.tipoMovimiento);
            const fecha = _formatearFechaCorta(ev.fecha);
            const isLast = idx === eventos.length - 1;

            return `
                <div class="dup-h-item" onclick="DuplicadosModule.toggleDetalleMovimiento('${ev.documento}', ${idx})">
                    <div class="dup-h-dot-wrapper">
                        <div class="dup-h-dot" style="background:${color};box-shadow:0 0 0 4px ${color}33,0 0 0 8px ${color}11;">
                            <span>${icono}</span>
                        </div>
                        ${!isLast ? `<div class="dup-h-line" style="background:linear-gradient(90deg,${color},${_colorPorTipoMovimiento(eventos[idx+1]?.tipoMovimiento || color)});"></div>` : ''}
                    </div>
                    <div class="dup-h-meta">
                        <div class="dup-h-fecha">${fecha}</div>
                        <div class="dup-h-tipo" style="color:${color}">${ev.tipoMovimiento}</div>
                        <div class="dup-h-uds">${_esc(ev.udsName || 'UDS N/A')}</div>
                        <div class="dup-h-contrato">Contrato ${_esc(ev.contrato || 'N/A')}</div>
                    </div>

                    <!-- Tooltip de detalle -->
                    <div class="dup-h-tooltip" id="dup-tooltip-${ev.documento}-${idx}">
                        <div class="dup-h-tooltip-header" style="border-left-color:${color}">
                            <strong>${icono} ${ev.tipoMovimiento}</strong>
                            <span>${_formatearFechaDMY(ev.fecha)}</span>
                        </div>
                        <div class="dup-h-tooltip-body">
                            <div class="dup-h-tooltip-row">
                                <span class="dup-h-tooltip-label">👤 Nombre</span>
                                <span class="dup-h-tooltip-val">${_esc(ev.nombre || 'Sin nombre')}</span>
                            </div>
                            <div class="dup-h-tooltip-row">
                                <span class="dup-h-tooltip-label">🏢 UDS</span>
                                <span class="dup-h-tooltip-val">${_esc(ev.udsName || 'N/A')}</span>
                            </div>
                            <div class="dup-h-tooltip-row">
                                <span class="dup-h-tooltip-label">📄 Contrato</span>
                                <span class="dup-h-tooltip-val">${_esc(ev.contrato || 'N/A')}</span>
                            </div>
                            <div class="dup-h-tooltip-row">
                                <span class="dup-h-tooltip-label">🌐 Operador</span>
                                <span class="dup-h-tooltip-val">${_esc(ev.operadorNombre)} ${ev.origen === 'archivadas' ? '(Archivado)' : ''}</span>
                            </div>
                            <div class="dup-h-tooltip-row">
                                <span class="dup-h-tooltip-label">📍 Regional</span>
                                <span class="dup-h-tooltip-val">${_esc(ev.regional || 'N/A')} / ${_esc(ev.modalidad || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="dup-h-timeline">${items}</div>`;
    }

    function _renderCasoCard(caso, index) {
        const isExpanded = _casoExpandido === caso.id;
        const timeline = _renderTimelineHorizontal(caso.eventos);

        // Mini timeline para el header (solo puntos)
        const miniDots = caso.eventos.map(ev => {
            const color = _colorPorTipoMovimiento(ev.tipoMovimiento);
            return `<div class="dup-mini-dot" style="background:${color}" title="${ev.tipoMovimiento}: ${_formatearFechaCorta(ev.fecha)}"></div>`;
        }).join('<div class="dup-mini-line"></div>');

        return `
            <div class="dup-case-card ${isExpanded ? 'expanded' : ''}" data-doc="${caso.id}">
                <div class="dup-case-header" onclick="DuplicadosModule.toggleCaso('${caso.id}')">
                    <div class="dup-case-main">
                        <div class="dup-case-avatar">
                            <span>👤</span>
                        </div>
                        <div class="dup-case-info">
                            <div class="dup-case-nombre">${_esc(caso.nombre) || 'Sin nombre registrado'}</div>
                            <div class="dup-case-doc">Documento: <code>${_esc(caso.documento)}</code></div>
                            <div class="dup-case-mini-timeline">${miniDots}</div>
                        </div>
                    </div>
                    <div class="dup-case-badges">
                        ${_badgeCategoria(caso.categoria)}
                        <span class="dup-count-badge">${caso.totalMovimientos} movimientos</span>
                    </div>
                    <div class="dup-case-toggle">
                        <svg class="dup-arrow ${isExpanded ? 'rotated' : ''}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>

                <div class="dup-case-body" style="${isExpanded ? 'max-height:800px;opacity:1;' : 'max-height:0;opacity:0;'}"">
                    <div class="dup-case-body-inner">
                        ${timeline}
                        <div class="dup-case-resumen">
                            <div class="dup-resumen-grid">
                                <div class="dup-resumen-item">
                                    <span class="dup-resumen-label">Operadores</span>
                                    <span class="dup-resumen-val">${caso.operadores.map(_esc).join(', ')}</span>
                                </div>
                                <div class="dup-resumen-item">
                                    <span class="dup-resumen-label">UDS Distintas</span>
                                    <span class="dup-resumen-val">${caso.udsDistintas.length}</span>
                                </div>
                                <div class="dup-resumen-item">
                                    <span class="dup-resumen-label">Contratos</span>
                                    <span class="dup-resumen-val">${caso.contratosDistintos.length}</span>
                                </div>
                                <div class="dup-resumen-item">
                                    <span class="dup-resumen-label">Último movimiento</span>
                                    <span class="dup-resumen-val">${caso.ultimoIngreso ? _formatearFechaCorta(caso.ultimoIngreso.fecha) : (caso.ultimoRetiro ? _formatearFechaCorta(caso.ultimoRetiro.fecha) : '—')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Toggle de caso ───────────────────────────────────────
    function toggleCaso(docId) {
        if (_casoExpandido === docId) {
            _casoExpandido = null;
        } else {
            _casoExpandido = docId;
        }
        aplicarFiltros();
    }

    function toggleDetalleMovimiento(docId, idx) {
        const tooltip = document.getElementById(`dup-tooltip-${docId}-${idx}`);
        if (!tooltip) return;

        // Cerrar otros tooltips abiertos
        document.querySelectorAll('.dup-h-tooltip.active').forEach(t => {
            if (t.id !== `dup-tooltip-${docId}-${idx}`) t.classList.remove('active');
        });

        tooltip.classList.toggle('active');
    }

    // ── Panel principal ────────────────────────────────────
    function _pintarLista(casos) {
        const container = document.getElementById('duplicadosContainer');
        if (!container) return;
        if (!casos.length) {
            container.innerHTML = `
                <div class="dup-empty">
                    <div style="font-size:3rem;margin-bottom:12px;">✅</div>
                    <div style="font-size:1.1rem;font-weight:700;color:#1e293b;margin-bottom:6px;">No hay duplicados</div>
                    <div style="color:#64748b;font-size:0.9rem;">No se encontraron participantes duplicados en la base de datos.</div>
                </div>
            `;
            return;
        }
        container.innerHTML = `<div class="dup-casos-list">${casos.map((c, i) => _renderCasoCard(c, i)).join('')}</div>`;
    }

    function _pintarResumen(casos) {
        const totalCasos = casos.length;
        const totalOperador = casos.filter(c => c.categoria === 'operador').length;
        const totalUdsMismoContrato = casos.filter(c => c.categoria === 'uds_mismo_contrato').length;
        const totalMovimientos = casos.reduce((sum, c) => sum + c.eventos.length, 0);

        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setTxt('statDupCasos', totalCasos);
        setTxt('statDupOperadores', totalOperador);
        setTxt('statDupUDS', totalUdsMismoContrato);
        setTxt('statDupMovimientos', totalMovimientos);
        setTxt('countDuplicadosGlobal', totalCasos);
    }

    function aplicarFiltros() {
        const searchInput = document.getElementById('duplicadosSearch');
        const catSelect = document.getElementById('duplicadosCategoria');
        const t = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const cat = catSelect ? catSelect.value : '';

        let filtrados = _casosCache;
        if (t) {
            filtrados = filtrados.filter(c =>
                (c.nombre || '').toLowerCase().includes(t) ||
                (c.documento || '').includes(t) ||
                c.operadores.some(o => (o || '').toLowerCase().includes(t)) ||
                c.udsDistintas.some(u => (u || '').toLowerCase().includes(t))
            );
        }
        if (cat) {
            filtrados = filtrados.filter(c => c.categoria === cat);
        }
        _pintarLista(filtrados);
    }

    async function renderPanel(forzar = false) {
        const container = document.getElementById('duplicadosContainer');
        if (container) {
            container.innerHTML = `
                <div class="dup-loading-panel">
                    <div style="font-size:2rem;margin-bottom:12px;">⏳</div>
                    <div>Cruzando información de todos los operadores…</div>
                </div>
            `;
        }

        try {
            const casos = await obtenerCasosDuplicados(forzar);
            _pintarResumen(casos);
            _pintarLista(casos);
        } catch (e) {
            console.error('[Duplicados] Error generando panel:', e);
            if (container) {
                container.innerHTML = `<div class="dup-empty">❌ Error al cargar: ${_esc(e.message)}</div>`;
            }
        }
    }

    // ── Modal desde Novedades Activas ──────────────────────
    async function abrirModalCaso(documento) {
        const caso = await buscarPorDocumento(documento);
        if (!caso) {
            showToast('No se encontró información del participante', 'error');
            return;
        }

        // Crear modal si no existe
        let modal = document.getElementById('dupModalOverlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dupModalOverlay';
            modal.className = 'dup-modal-overlay';
            modal.innerHTML = `
                <div class="dup-modal-box" onclick="event.stopPropagation()">
                    <div class="dup-modal-header">
                        <div class="dup-modal-header-info">
                            <div class="dup-modal-avatar">👤</div>
                            <div>
                                <h3 class="dup-modal-title" id="dupModalNombre">Cargando...</h3>
                                <p class="dup-modal-subtitle" id="dupModalDoc">Documento: —</p>
                            </div>
                        </div>
                        <button class="dup-modal-close" onclick="DuplicadosModule.cerrarModalCaso()">&times;</button>
                    </div>
                    <div class="dup-modal-body" id="dupModalBody"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('dupModalNombre').textContent = caso.nombre || 'Sin nombre registrado';
        document.getElementById('dupModalDoc').textContent = `Documento: ${caso.documento}`;
        document.getElementById('dupModalBody').innerHTML = `
            <div class="dup-modal-stats">
                <div class="dup-modal-stat">
                    <span class="dup-modal-stat-val">${caso.totalMovimientos}</span>
                    <span class="dup-modal-stat-label">Movimientos</span>
                </div>
                <div class="dup-modal-stat">
                    <span class="dup-modal-stat-val">${caso.udsDistintas.length}</span>
                    <span class="dup-modal-stat-label">UDS</span>
                </div>
                <div class="dup-modal-stat">
                    <span class="dup-modal-stat-val">${caso.contratosDistintos.length}</span>
                    <span class="dup-modal-stat-label">Contratos</span>
                </div>
                <div class="dup-modal-stat">
                    <span class="dup-modal-stat-val">${caso.operadores.length}</span>
                    <span class="dup-modal-stat-label">Operadores</span>
                </div>
            </div>
            ${_renderTimelineHorizontal(caso.eventos)}
            <div class="dup-modal-operadores">
                <strong>Operadores involucrados:</strong> ${caso.operadores.map(o => `<span class="dup-op-badge">${_esc(o)}</span>`).join('')}
            </div>
        `;

        modal.style.display = 'flex';
        document.body.classList.add('dup-modal-open');
    }

    function cerrarModalCaso() {
        const modal = document.getElementById('dupModalOverlay');
        if (modal) modal.style.display = 'none';
        document.body.classList.remove('dup-modal-open');
    }

    // ── Badge en tabla de activas ───────────────────────────
    function renderBadgeDuplicado(documento) {
        return `<span class="duplicado-badge" onclick="event.stopPropagation();DuplicadosModule.abrirModalCaso('${documento}')" title="Ver historial de movimientos">DUP</span>`;
    }

    async function actualizarBadgeTab() {
        try {
            const casos = await obtenerCasosDuplicados(false);
            const el = document.getElementById('countDuplicadosGlobal');
            if (el) el.textContent = casos.length;
        } catch (e) { /* silencioso */ }
    }

    // Cerrar modal al hacer click fuera
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('dupModalOverlay');
        if (modal && e.target === modal) {
            cerrarModalCaso();
        }
    });

    // Cerrar tooltips al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dup-h-item')) {
            document.querySelectorAll('.dup-h-tooltip.active').forEach(t => t.classList.remove('active'));
        }
    });

    return {
        cargarIndiceGlobal,
        obtenerCasosDuplicados,
        buscarPorDocumento,
        verificarCampo,
        autocompletar,
        limpiarAviso,
        limpiarAvisos,
        renderPanel,
        aplicarFiltros,
        actualizarBadgeTab,
        toggleCaso,
        toggleDetalleMovimiento,
        abrirModalCaso,
        cerrarModalCaso,
        renderBadgeDuplicado
    };
})();
