        // ============================================================
        // MÓDULO: DESCUENTOS POR NOVEDADES
        // (inasistencias de profesionales, reducción de cupos, etc.)
        //
        // No modifica funciones existentes: se engancha (patch) sobre
        // calcular(), initGrid(), restaurar(), cargarArchivo(),
        // guardarFirebase(), guardarLocal(), limpiarSemana(), limpiarTodo()
        // y toggleDrawer(), preservando el comportamiento original.
        // ============================================================

        const TIPOS_DESCUENTO = {
            dia_1:       { label: '1 día de inasistencia',          icono: 'fa-calendar-day',      color: '#ffb020' },
            dia_2:       { label: '2 días de inasistencia',         icono: 'fa-calendar-week',     color: '#ff8a3d' },
            dia_3mas:    { label: '3+ días de inasistencia',        icono: 'fa-calendar-xmark',    color: '#ff4655' },
            menos_ninos: { label: 'Menos niños (reducción cupos)',  icono: 'fa-user-minus',        color: '#00d1c1' },
            otro:        { label: 'Otra novedad',                  icono: 'fa-circle-exclamation', color: '#a78bfa' }
        };

        // { 1: [ {id, tipo, dias, cupos, valorRacion, nota, activo} ], 2: [...] , ... }
        let descuentosPorSemana = {};
        let descuentosGlobalActivo = true;

        let _descuentoModalSemana = null;
        let _descuentoModalEditId = null;

        // ===== HELPERS =====

        function _escapeHtmlDescuento(txt) {
            const div = document.createElement('div');
            div.textContent = txt || '';
            return div.innerHTML;
        }

        function generarIdDescuento() {
            return 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        }

        function getNumSemanasActual() {
            return parseInt(document.getElementById('num-semanas')?.value) || 4;
        }

        function getDescuentosSemana(s) {
            return descuentosPorSemana[s] || [];
        }

        function calcularValorDescuento(d) {
            const dias = parseFloat(d.dias) || 0;
            const cupos = parseFloat(d.cupos) || 0;
            const valorRacion = parseFloat(d.valorRacion) || 0;
            return dias * cupos * valorRacion;
        }

        // Total de descuentos de una semana. soloActivos=true respeta el switch individual + el maestro.
        function calcularTotalDescuentosSemana(s, soloActivos = true) {
            return getDescuentosSemana(s).reduce((acc, d) => {
                if (soloActivos && !(d.activo && descuentosGlobalActivo)) return acc;
                return acc + calcularValorDescuento(d);
            }, 0);
        }

        // ===== MODAL AGREGAR / EDITAR NOVEDAD =====

        function abrirModalDescuento(s, idEdit = null) {
            _descuentoModalSemana = s;
            _descuentoModalEditId = idEdit;

            const titulo = document.getElementById('descuento-modal-titulo');
            const existente = idEdit ? getDescuentosSemana(s).find(d => d.id === idEdit) : null;

            if (titulo) {
                titulo.innerHTML = existente
                    ? `<i class="fa-solid fa-pen"></i> EDITAR NOVEDAD — SEMANA ${s}`
                    : `<i class="fa-solid fa-user-minus"></i> NUEVA NOVEDAD — SEMANA ${s}`;
            }

            document.getElementById('descuento-input-tipo').value = existente?.tipo || 'dia_1';
            document.getElementById('descuento-input-dias').value = existente?.dias ?? '';
            document.getElementById('descuento-input-cupos').value = existente?.cupos ?? '';
            document.getElementById('descuento-input-valor-racion').value = existente?.valorRacion ?? valorCupoBase;
            document.getElementById('descuento-input-nota').value = existente?.nota || '';

            const btnEliminar = document.getElementById('descuento-btn-eliminar-modal');
            if (btnEliminar) btnEliminar.style.display = existente ? 'inline-flex' : 'none';

            actualizarPreviewDescuento();
            toggleModal('modal-descuento');

            setTimeout(() => document.getElementById('descuento-input-dias')?.focus(), 150);
        }

        function actualizarPreviewDescuento() {
            const dias = parseFloat(document.getElementById('descuento-input-dias')?.value) || 0;
            const cupos = parseFloat(document.getElementById('descuento-input-cupos')?.value) || 0;
            const valorRacion = parseFloat(document.getElementById('descuento-input-valor-racion')?.value) || 0;
            const raciones = dias * cupos;
            const valor = raciones * valorRacion;

            const previewRaciones = document.getElementById('descuento-preview-raciones');
            const previewValor = document.getElementById('descuento-preview-valor');

            if (previewRaciones) {
                previewRaciones.textContent = `${dias || 0}d × ${cupos || 0}c = ${raciones.toLocaleString()} raciones`;
            }
            if (previewValor) {
                previewValor.textContent = formatter.format(valor);
            }
        }

        function guardarDescuentoModal() {
            const s = _descuentoModalSemana;
            if (!s) return;

            const tipo = document.getElementById('descuento-input-tipo').value;
            const dias = parseFloat(document.getElementById('descuento-input-dias').value) || 0;
            const cupos = parseFloat(document.getElementById('descuento-input-cupos').value) || 0;
            const valorRacion = parseFloat(document.getElementById('descuento-input-valor-racion').value) || 0;
            const nota = document.getElementById('descuento-input-nota').value.trim();

            if (dias <= 0 || cupos <= 0) {
                Toast.warning('Ingresa días y cupos/niños afectados (mayores a 0)');
                return;
            }
            if (valorRacion <= 0) {
                Toast.warning('Ingresa un valor de ración válido');
                return;
            }

            if (!descuentosPorSemana[s]) descuentosPorSemana[s] = [];

            if (_descuentoModalEditId) {
                const item = descuentosPorSemana[s].find(d => d.id === _descuentoModalEditId);
                if (item) {
                    item.tipo = tipo;
                    item.dias = dias;
                    item.cupos = cupos;
                    item.valorRacion = valorRacion;
                    item.nota = nota;
                }
            } else {
                descuentosPorSemana[s].push({
                    id: generarIdDescuento(),
                    tipo, dias, cupos, valorRacion, nota,
                    activo: true
                });
            }

            toggleModal('modal-descuento');
            marcarCambio();
            calcular(s);
            renderizarAnalisisDescuentosSiAbierto();
            Toast.success(_descuentoModalEditId ? 'Novedad actualizada' : 'Novedad registrada');

            _descuentoModalEditId = null;
        }

        async function eliminarDescuentoDesdeModal() {
            if (!_descuentoModalEditId || !_descuentoModalSemana) return;
            const s = _descuentoModalSemana;
            const id = _descuentoModalEditId;
            toggleModal('modal-descuento');
            await eliminarDescuento(s, id);
        }

        async function eliminarDescuento(s, id) {
            if (!await zanConfirm({
                title: 'Eliminar novedad',
                msg: 'Se eliminará este registro de descuento. Esta acción no se puede deshacer.',
                tipo: 'danger',
                okLabel: 'Eliminar'
            })) return;

            if (descuentosPorSemana[s]) {
                descuentosPorSemana[s] = descuentosPorSemana[s].filter(d => d.id !== id);
            }
            marcarCambio();
            calcular(s);
            renderizarAnalisisDescuentosSiAbierto();
            Toast.info('Novedad eliminada');
        }

        function toggleDescuentoActivo(s, id) {
            const item = getDescuentosSemana(s).find(d => d.id === id);
            if (!item) return;
            item.activo = !item.activo;
            marcarCambio();
            calcular(s);
            renderizarAnalisisDescuentosSiAbierto();
        }

        function toggleDescuentosGlobal() {
            descuentosGlobalActivo = !descuentosGlobalActivo;
            marcarCambio();
            const semanas = getNumSemanasActual();
            for (let s = 1; s <= semanas; s++) calcular(s);
            renderizarAnalisisDescuentosSiAbierto();
            Toast.info(descuentosGlobalActivo
                ? 'Descuentos por novedades ACTIVADOS'
                : 'Descuentos por novedades DESACTIVADOS (no se restan de Distribuidora)');
        }

        // ===== RENDER: SECCIÓN DENTRO DE CADA PANEL DE SEMANA =====

        function renderizarDescuentosSemana(s) {
            const cont = document.getElementById(`descuentos-lista-${s}`);
            const seccion = document.getElementById(`descuentos-panel-${s}`);
            if (!cont) return;

            const items = getDescuentosSemana(s);

            if (items.length === 0) {
                cont.innerHTML = '<div class="descuentos-vacio">Sin novedades registradas en esta semana</div>';
                if (seccion) seccion.classList.add('sin-novedades');
            } else {
                if (seccion) seccion.classList.remove('sin-novedades');

                let html = items.map(d => {
                    const info = TIPOS_DESCUENTO[d.tipo] || TIPOS_DESCUENTO.otro;
                    const valor = calcularValorDescuento(d);
                    const raciones = (parseFloat(d.dias) || 0) * (parseFloat(d.cupos) || 0);
                    return `
                        <div class="descuento-item ${d.activo ? '' : 'inactivo'}" style="border-left-color:${info.color}">
                            <div class="descuento-item-main">
                                <span class="descuento-tipo-badge" style="background:${info.color}22; color:${info.color};">
                                    <i class="fa-solid ${info.icono}"></i> ${info.label}
                                </span>
                                <span class="descuento-detalle">${d.dias}d × ${d.cupos}c = ${raciones.toLocaleString()} raciones</span>
                                ${d.nota ? `<i class="fa-solid fa-note-sticky descuento-nota" title="${_escapeHtmlDescuento(d.nota)}"></i>` : ''}
                            </div>
                            <div class="descuento-item-actions">
                                <span class="descuento-valor">-${formatter.format(valor)}</span>
                                <label class="descuento-switch" title="${d.activo ? 'Se está descontando' : 'No se está descontando'}">
                                    <input type="checkbox" ${d.activo ? 'checked' : ''} ${descuentosGlobalActivo ? '' : 'disabled'}
                                        onchange="toggleDescuentoActivo(${s}, '${d.id}')">
                                    <span class="descuento-switch-slider"></span>
                                </label>
                                <button class="descuento-icon-btn" onclick="abrirModalDescuento(${s}, '${d.id}')" title="Editar">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="descuento-icon-btn danger" onclick="eliminarDescuento(${s}, '${d.id}')" title="Eliminar">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                const totalActivo = calcularTotalDescuentosSemana(s, true);
                html += `
                    <div class="descuentos-subtotal">
                        <span>${items.length} novedad${items.length !== 1 ? 'es' : ''} registrada${items.length !== 1 ? 's' : ''}${!descuentosGlobalActivo ? ' · desactivadas globalmente' : ''}</span>
                        <span>Descuento activo: <b>-${formatter.format(totalActivo)}</b></span>
                    </div>
                `;

                cont.innerHTML = html;
            }

            _actualizarBadgeTab(s);
        }

        function _actualizarBadgeTab(s) {
            const tabBtn = document.getElementById(`tab-btn-${s}`);
            if (!tabBtn) return;

            let badge = tabBtn.querySelector('.tab-descuento-badge');
            const activos = getDescuentosSemana(s).filter(d => d.activo).length;

            if (activos > 0 && descuentosGlobalActivo) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'tab-descuento-badge';
                    tabBtn.appendChild(badge);
                }
                badge.textContent = activos;
                badge.title = `${activos} novedad(es) activa(s) descontando de Distribuidora`;
            } else if (badge) {
                badge.remove();
            }
        }

        function renderizarTodosDescuentos() {
            const semanas = getNumSemanasActual();
            for (let s = 1; s <= semanas; s++) renderizarDescuentosSemana(s);
        }

        // Inyecta la sección de novedades dentro de cada panel de semana (una sola vez por panel)
        function _inyectarSeccionesDescuentos() {
            const semanas = getNumSemanasActual();
            for (let s = 1; s <= semanas; s++) {
                const panel = document.getElementById(`panel-${s}`);
                if (!panel) continue;
                if (document.getElementById(`descuentos-panel-${s}`)) continue; // ya existe

                panel.insertAdjacentHTML('beforeend', `
                    <div class="descuentos-panel-section" id="descuentos-panel-${s}">
                        <span class="badge-nuevo badge-nuevo-tl">Nuevo</span>
                        <div class="descuentos-panel-header">
                            <span class="descuentos-panel-title"><i class="fa-solid fa-user-minus"></i> Novedades / Descuentos</span>
                            <button class="btn btn-sm btn-cyan" onclick="abrirModalDescuento(${s})">
                                <i class="fa-solid fa-plus"></i> Novedad
                            </button>
                        </div>
                        <div class="descuentos-lista" id="descuentos-lista-${s}"></div>
                    </div>
                `);
            }
            renderizarTodosDescuentos();
        }

        // ===== APLICAR DESCUENTO AL VALOR DE DISTRIBUIDORA =====
        // Se ejecuta después de calcular(s): resta del campo dist-${s} (ya calculado
        // como presupuesto - compras) el total de novedades activas de esa semana.
        function aplicarDescuentoADistribuidora(s) {
            const distElem = document.getElementById(`dist-${s}`);
            if (!distElem) return;

            const base = limpiarNum(distElem.value); // pres - sumaProd, recién calculado por calcular()
            const descuento = calcularTotalDescuentosSemana(s, true);
            const nuevoDist = base - descuento;

            distElem.value = formatter.format(nuevoDist);

            const panel = document.getElementById(`panel-${s}`);
            if (panel) panel.classList.toggle('excedido', nuevoDist < 0);

            renderizarDescuentosSemana(s);
        }

        // ===== DRAWER: ANÁLISIS DE DESCUENTOS =====

        function renderizarAnalisisDescuentosSiAbierto() {
            const drawer = document.getElementById('drawer-descuentos');
            if (drawer && drawer.classList.contains('open')) renderizarAnalisisDescuentos();
        }

        function renderizarAnalisisDescuentos() {
            const cont = document.getElementById('descuentos-analisis-content');
            if (!cont) return;

            const semanas = getNumSemanasActual();
            let totalActivo = 0, totalRegistrado = 0, totalNovedades = 0, semanasConNovedades = 0;
            const porTipo = {};

            for (let s = 1; s <= semanas; s++) {
                const items = getDescuentosSemana(s);
                if (items.length > 0) semanasConNovedades++;
                items.forEach(d => {
                    const valor = calcularValorDescuento(d);
                    totalRegistrado += valor;
                    totalNovedades++;
                    if (d.activo) totalActivo += (descuentosGlobalActivo ? valor : 0);

                    if (!porTipo[d.tipo]) porTipo[d.tipo] = { count: 0, valor: 0, valorActivo: 0 };
                    porTipo[d.tipo].count++;
                    porTipo[d.tipo].valor += valor;
                    if (d.activo) porTipo[d.tipo].valorActivo += (descuentosGlobalActivo ? valor : 0);
                });
            }

            // Toggle maestro
            let html = `
                <div class="descuentos-global-toggle">
                    <div class="txt">
                        Aplicar descuentos a Distribuidora
                        <small>Al desactivar, ninguna novedad se resta (aunque queden registradas)</small>
                    </div>
                    <label class="descuento-switch">
                        <input type="checkbox" ${descuentosGlobalActivo ? 'checked' : ''} onchange="toggleDescuentosGlobal()">
                        <span class="descuento-switch-slider"></span>
                    </label>
                </div>
            `;

            if (totalNovedades === 0) {
                html += `
                    <div class="descuentos-analisis-vacio">
                        <i class="fa-solid fa-clipboard-check"></i>
                        Aún no hay novedades registradas.<br>Agrégalas desde el botón "+ Novedad" en cada semana.
                    </div>
                `;
                cont.innerHTML = html;
                return;
            }

            // Tarjetas resumen
            html += `
                <div class="descuentos-analisis-resumen">
                    <div class="descuentos-analisis-card">
                        <div class="lbl">Descuento activo total</div>
                        <div class="val">${formatter.format(totalActivo)}</div>
                    </div>
                    <div class="descuentos-analisis-card">
                        <div class="lbl">Novedades registradas</div>
                        <div class="val" style="color:var(--accent-cyan);">${totalNovedades}</div>
                    </div>
                    <div class="descuentos-analisis-card">
                        <div class="lbl">Semanas afectadas</div>
                        <div class="val" style="color:var(--primary-gold);">${semanasConNovedades} / ${semanas}</div>
                    </div>
                    <div class="descuentos-analisis-card">
                        <div class="lbl">Total registrado (activo + inactivo)</div>
                        <div class="val" style="color:var(--text-dim);">${formatter.format(totalRegistrado)}</div>
                    </div>
                </div>
            `;

            // Clasificación por tipo
            html += '<div class="descuentos-tipo-resumen">';
            Object.keys(TIPOS_DESCUENTO).forEach(tipoKey => {
                const t = porTipo[tipoKey];
                if (!t) return;
                const info = TIPOS_DESCUENTO[tipoKey];
                html += `
                    <div class="descuentos-tipo-chip" style="border-left-color:${info.color}">
                        <span class="nombre"><i class="fa-solid ${info.icono}" style="color:${info.color};"></i> ${info.label}</span>
                        <span class="cifras">${t.count} novedad${t.count !== 1 ? 'es' : ''} · <b>${formatter.format(t.valorActivo)}</b></span>
                    </div>
                `;
            });
            html += '</div>';

            // Detalle por semana
            for (let s = 1; s <= semanas; s++) {
                const items = getDescuentosSemana(s);
                if (items.length === 0) continue;

                const totalSemanaActivo = calcularTotalDescuentosSemana(s, true);

                html += `
                    <div class="descuentos-semana-grupo">
                        <div class="descuentos-semana-grupo-header">
                            <span>SEMANA ${s}</span>
                            <span style="color:var(--danger);">-${formatter.format(totalSemanaActivo)}</span>
                        </div>
                        <div class="descuentos-lista">
                            ${items.map(d => {
                                const info = TIPOS_DESCUENTO[d.tipo] || TIPOS_DESCUENTO.otro;
                                const valor = calcularValorDescuento(d);
                                const raciones = (parseFloat(d.dias) || 0) * (parseFloat(d.cupos) || 0);
                                return `
                                    <div class="descuento-item ${d.activo ? '' : 'inactivo'}" style="border-left-color:${info.color}">
                                        <div class="descuento-item-main">
                                            <span class="descuento-tipo-badge" style="background:${info.color}22; color:${info.color};">
                                                <i class="fa-solid ${info.icono}"></i> ${info.label}
                                            </span>
                                            <span class="descuento-detalle">${d.dias}d × ${d.cupos}c = ${raciones.toLocaleString()} rac.</span>
                                            ${d.nota ? `<i class="fa-solid fa-note-sticky descuento-nota" title="${_escapeHtmlDescuento(d.nota)}"></i>` : ''}
                                        </div>
                                        <div class="descuento-item-actions">
                                            <span class="descuento-valor">-${formatter.format(valor)}</span>
                                            <label class="descuento-switch">
                                                <input type="checkbox" ${d.activo ? 'checked' : ''} ${descuentosGlobalActivo ? '' : 'disabled'}
                                                    onchange="toggleDescuentoActivo(${s}, '${d.id}')">
                                                <span class="descuento-switch-slider"></span>
                                            </label>
                                            <button class="descuento-icon-btn" onclick="abrirModalDescuento(${s}, '${d.id}')" title="Editar">
                                                <i class="fa-solid fa-pen"></i>
                                            </button>
                                            <button class="descuento-icon-btn danger" onclick="eliminarDescuento(${s}, '${d.id}')" title="Eliminar">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            cont.innerHTML = html;
        }

        // ============================================================
        // PATCHES: enganchar el módulo a las funciones existentes
        // sin modificar los archivos originales.
        // ============================================================

        // 1) calcular(): tras recalcular dist-${s}, restar novedades activas
        const _origCalcularDescuentos = calcular;
        calcular = function (s, formatear = true) {
            _origCalcularDescuentos(s, formatear);
            aplicarDescuentoADistribuidora(s);
        };

        // 2) initGrid(): tras reconstruir los paneles, reinyectar secciones de novedades
        const _origInitGridDescuentos = initGrid;
        initGrid = function (preservarDatos = false) {
            _origInitGridDescuentos(preservarDatos);
            setTimeout(_inyectarSeccionesDescuentos, 0);
        };

        // 3) restaurar(): carga desde borrador local (localStorage)
        const _origRestaurarDescuentos = restaurar;
        restaurar = function (data) {
            _origRestaurarDescuentos(data);
            descuentosPorSemana = data.descuentos || {};
            descuentosGlobalActivo = (data.descuentosGlobalActivo === undefined) ? true : data.descuentosGlobalActivo;
            setTimeout(() => {
                _inyectarSeccionesDescuentos();
                const semanas = getNumSemanasActual();
                for (let s = 1; s <= semanas; s++) calcular(s);
            }, 0);
        };

        // 4) cargarArchivo(): carga desde Firebase (archivo guardado en la nube)
        const _origCargarArchivoDescuentos = cargarArchivo;
        cargarArchivo = async function (key) {
            await _origCargarArchivoDescuentos(key);
            try {
                const snap = await db.ref(`files/${currentUser}/${key}/descuentos`).once('value');
                descuentosPorSemana = snap.val() || {};
                const snapActivo = await db.ref(`files/${currentUser}/${key}/descuentosGlobalActivo`).once('value');
                const ga = snapActivo.val();
                descuentosGlobalActivo = (ga === null || ga === undefined) ? true : ga;
            } catch (e) {
                console.error('No se pudieron cargar las novedades:', e);
                descuentosPorSemana = {};
                descuentosGlobalActivo = true;
            }
            setTimeout(() => {
                _inyectarSeccionesDescuentos();
                const semanas = getNumSemanasActual();
                for (let s = 1; s <= semanas; s++) calcular(s);
            }, 0);
        };

        // 5) guardarFirebase(): persistir novedades junto al archivo (nube + borrador local)
        const _origGuardarFirebaseDescuentos = guardarFirebase;
        guardarFirebase = async function () {
            await _origGuardarFirebaseDescuentos();
            _fusionarDescuentosEnLocalStorage(`elite_draft_${currentUser}`);
            _fusionarDescuentosEnLocalStorage(`elite_pending_sync_${currentUser}`);

            if (currentFileId && typeof estaOnline === 'function' && estaOnline()) {
                try {
                    await db.ref(`files/${currentUser}/${currentFileId}/descuentos`).set(descuentosPorSemana);
                    await db.ref(`files/${currentUser}/${currentFileId}/descuentosGlobalActivo`).set(descuentosGlobalActivo);
                } catch (e) {
                    console.error('No se pudieron guardar las novedades en la nube:', e);
                }
            }
        };

        // 6) guardarLocal(): persistir novedades en el borrador local
        const _origGuardarLocalDescuentos = guardarLocal;
        guardarLocal = function () {
            _origGuardarLocalDescuentos();
            _fusionarDescuentosEnLocalStorage(`elite_draft_${currentUser}`);
        };

        function _fusionarDescuentosEnLocalStorage(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return;
                const d = JSON.parse(raw);
                d.descuentos = descuentosPorSemana;
                d.descuentosGlobalActivo = descuentosGlobalActivo;
                localStorage.setItem(key, JSON.stringify(d));
            } catch (e) { /* silencioso */ }
        }

        // 7) limpiarSemana(): se reemplaza (no se envuelve) para usar un único diálogo
        //    de confirmación que también advierta sobre las novedades registradas.
        limpiarSemana = async function (s) {
            const teniaNovedades = getDescuentosSemana(s).length > 0;
            const msg = teniaNovedades
                ? 'Se borrarán todos los datos ingresados en esta semana, incluyendo las novedades/descuentos registrados. Puedes deshacer con Ctrl+Z.'
                : 'Se borrarán todos los datos ingresados en esta semana. Puedes deshacer con Ctrl+Z.';

            if (!await zanConfirm({ title: `Limpiar Semana ${s}`, msg, tipo: 'danger', okLabel: 'Limpiar' })) return;

            // Guardar snapshot antes de limpiar (para poder deshacer)
            if (typeof UndoManager !== 'undefined') UndoManager.push();

            productosBase.forEach((p, i) => {
                const fac = document.getElementById(`fac-${s}-${i}`);
                const cant = document.getElementById(`cant-${s}-${i}`);
                const punit = document.getElementById(`punit-${s}-${i}`);
                const val = document.getElementById(`val-${s}-${i}`);

                if (fac) fac.value = "";
                if (cant) cant.value = "";
                if (punit) punit.value = p.precio;
                if (val) val.value = "";
            });

            descuentosPorSemana[s] = [];
            renderizarDescuentosSemana(s);
            renderizarAnalisisDescuentosSiAbierto();

            calcular(s);
            marcarCambio();
        };

        // 8) limpiarTodo(): se reemplaza igual, para incluir la limpieza de novedades
        //    dentro del mismo diálogo de confirmación y evitar un segundo popup.
        limpiarTodo = async function () {
            if (!await zanConfirm({
                title: 'Limpiar todo',
                msg: 'Se eliminarán todos los datos de semanas, días, cupos, contrato, novedades/descuentos y configuración. Puedes deshacer con Ctrl+Z.',
                tipo: 'danger',
                okLabel: 'Limpiar todo'
            })) return;

            // Guardar snapshot antes de limpiar todo (para poder deshacer)
            if (typeof UndoManager !== 'undefined') UndoManager.push();

            const semanas = getNumSemanasActual();

            document.getElementById('main-contrato').value = "";
            document.getElementById('main-mes').selectedIndex = 0;

            for (let s = 1; s <= semanas; s++) {
                const diasInput = document.getElementById(`dias-${s}`);
                const cuposInput = document.getElementById(`cupos-${s}`);
                if (diasInput) diasInput.value = "";
                if (cuposInput) cuposInput.value = "";

                productosBase.forEach((p, i) => {
                    const fac = document.getElementById(`fac-${s}-${i}`);
                    const cant = document.getElementById(`cant-${s}-${i}`);
                    const punit = document.getElementById(`punit-${s}-${i}`);
                    const val = document.getElementById(`val-${s}-${i}`);

                    if (fac) fac.value = "";
                    if (cant) cant.value = "";
                    if (punit) punit.value = p.precio;
                    if (val) val.value = "";
                });

                calcular(s);
            }

            proveedores = JSON.parse(JSON.stringify(PROVEEDORES_INICIALES));
            productosBase = JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
            valorCupoBase = 8094;
            descuentosPorSemana = {};
            descuentosGlobalActivo = true;

            initGrid(false);

            localStorage.removeItem(`elite_draft_${currentUser}`);

            marcarCambio();
            actualizarResumen();
            renderizarAnalisisDescuentosSiAbierto();

            Toast.success('Espacio de trabajo limpiado. Puedes empezar de nuevo.', { title: 'Limpieza completa' });
        };

        // 9) toggleDrawer(): renderizar el análisis al abrir el drawer 'descuentos'
        const _origToggleDrawerDescuentos = toggleDrawer;
        toggleDrawer = function (id) {
            _origToggleDrawerDescuentos(id);
            if (id === 'descuentos') renderizarAnalisisDescuentos();
        };

        // Primera inyección al cargar la página (por si initGrid ya corrió antes de este script)
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(_inyectarSeccionesDescuentos, 300);
        });
