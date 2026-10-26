// ============================================================
// MÓDULO DE AJUSTES DE ASOCIACIONES v2.0
// Centro de Configuración del Sistema — Wizard de 5 pasos
// ============================================================

const AjustesModule = (() => {

    let _asociacionEditando = null;
    let _contratosTemp = {};
    let _unidadesTemp = {};
    let _coloresTemp = {};
    let _modalidadesTemp = {};
    let _regionalesTemp = {};
    let _estadosTemp = {};      // { codigo: 'inactivo' } — sin entrada = contrato activo
    let _currentStep = 1;
    let _clavesExistentes = { admin: null, formulario: null }; // claves guardadas (el wizard ya no tiene esos campos)
    let _idEditadoManualmente = false;
    const TOTAL_STEPS = 4;

    const REGIONALES  = ['Regional Neiva', 'Regional Gaitana'];
    const MODALIDADES = ['HCB', 'FAMI', 'HI', 'CDI', 'FAMIBIENVENIR'];
    const FALLBACK_COLORS = ['#D97706','#2563EB','#059669','#E91E63','#9C27B0','#FF5722'];
    const CONTRACT_PALETTE = ['#D97706','#2563EB','#059669','#E91E63','#9C27B0','#FF5722','#0891B2','#65A30D','#DC2626','#4F46E5','#0D9488','#78716C'];

    // Palabras que se ignoran al generar el ID sugerido a partir del nombre
    const ID_STOPWORDS = [
        'asociacion','asoc','fundacion','fundac','corporacion','organizacion',
        'operador','de','del','la','el','los','las','y',
        'hogares','comunitarios','comunitario',
        'hcb','fami','hi','cdi','famibienvenir'
    ];

    // ═══════════════════════════════════════════
    // ID ÚNICO — sugerencia automática desde el nombre
    // ═══════════════════════════════════════════

    function slugificarNombre(nombre) {
        if (!nombre) return '';
        const palabras = nombre.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w && !ID_STOPWORDS.includes(w));
        let slug = palabras.join('');
        if (!slug) {
            // fallback: no descartar nada si todas las palabras eran "stopwords"
            slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        }
        return 'asoc_' + slug;
    }

    function onNombreInput(el) {
        if (_asociacionEditando) return;      // no tocar el ID al editar una org existente
        if (_idEditadoManualmente) return;     // el usuario ya personalizó el ID, no lo pisamos
        const idField = document.getElementById('ajustesInputId');
        if (idField) idField.value = slugificarNombre(el.value);
    }

    function onIdInput() {
        _idEditadoManualmente = true;
    }

    // ═══════════════════════════════════════════
    // NAVEGACIÓN GENERAL
    // ═══════════════════════════════════════════

    function abrirPanelAjustes() {
        ClaveModal.mostrar({
            icono: '<i class=ic-settings></i>',
            titulo: 'Panel de Configuración del Sistema',
            subtitulo: 'Gestión de organizaciones y seguridad',
            onSubmit: async (password) => {
                const passwordCorrecta = await AsociacionesModule.obtenerPasswordAjustes();
                if (password !== passwordCorrecta) return false;

                const selector = document.getElementById('modalSelectorAsociacion');
                if (selector) selector.style.display = 'none';

                const panel = document.getElementById('panelAjustes');
                if (panel) {
                    panel.style.display = 'flex';
                    setNav('organizaciones');
                    cargarListaAsociaciones();
                }
                return true;
            }
        });
    }

    function cerrarPanelAjustes() {
        const panel = document.getElementById('panelAjustes');
        if (panel) panel.style.display = 'none';
        if (!AsociacionesModule.getPerfilActivo()) {
            AsociacionesModule.mostrarSelectorAsociaciones();
        }
    }

    // Tecla Esc: si hay un popover de color abierto lo cierra primero;
    // si no, cierra el panel completo de configuración (solo si está visible).
    function _escGlobalHandler(e) {
        if (e.key !== 'Escape') return;

        const colorPop = document.getElementById('colorPopover');
        if (colorPop) { cerrarColorPicker(); return; }

        const panel = document.getElementById('panelAjustes');
        if (panel && getComputedStyle(panel).display !== 'none') {
            cerrarPanelAjustes();
        }
    }
    document.addEventListener('keydown', _escGlobalHandler);

    function setNav(vista) {
        document.querySelectorAll('.config-center-nav-item').forEach(n => n.classList.remove('active'));
        const btn = document.querySelector(`.config-center-nav-item[data-nav="${vista}"]`);
        if (btn) btn.classList.add('active');

        document.querySelectorAll('.config-center-view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById('vista' + vista.charAt(0).toUpperCase() + vista.slice(1));
        if (view) view.classList.add('active');

        const actions = document.getElementById('wizardActions');
        if (actions) actions.style.display = 'none';

        if (vista === 'organizaciones') cargarListaAsociaciones();
    }

    // ═══════════════════════════════════════════
    // WIZARD — 5 PASOS
    // ═══════════════════════════════════════════

    function nuevaAsociacion() {
        _asociacionEditando = null;
        _clavesExistentes = { admin: null, formulario: null };
        _contratosTemp = {}; _unidadesTemp = {}; _coloresTemp = {};
        _modalidadesTemp = {}; _regionalesTemp = {}; _estadosTemp = {};
        _currentStep = 1;
        _idEditadoManualmente = false;

        // Resetear inputs
        ['ajustesInputId','ajustesInputNombre','ajustesInputSubtitulo','ajustesInputLogo','ajustesInputGoogle',
         'ajustesInputPasswordFormulario','ajustesInputPasswordAdmin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        // El campo ID puede haber quedado bloqueado por una edición anterior: liberarlo
        const idField = document.getElementById('ajustesInputId');
        if (idField) idField.disabled = false;

        // Resetear strength bars
        resetStrength('strengthForm'); resetStrength('strengthAdmin');

        document.getElementById('wizardTitulo').textContent = 'Nueva organización';
        _mostrarVistaWizard();
        updateWizardUI();
    }

    async function editarAsociacion(id) {
        try {
            const snap = await database.ref(`sistema/asociaciones/${id}`).once('value');
            const datos = snap.val();
            if (!datos) { showToast('Organización no encontrada', 'error'); return; }

            _asociacionEditando = id;
            _contratosTemp = { ...(datos.contratos || {}) };
            _unidadesTemp  = {};
            Object.entries(datos.unidades || {}).forEach(([cod, lista]) => {
                // Firebase puede devolver arreglos como objetos: se normaliza a arreglo
                _unidadesTemp[cod] = Object.values(lista || {})
                    .filter(u => u && (u.nombre || u.codigo))
                    .map(u => ({ nombre: String(u.nombre || ''), codigo: String(u.codigo || '') }));
            });
            _coloresTemp      = { ...(datos.colores_contratos || {}) };
            _modalidadesTemp  = { ...(datos.modalidades_contratos || {}) };
            _regionalesTemp   = { ...(datos.regionales_contratos || {}) };
            _estadosTemp      = { ...(datos.estados_contratos || {}) };
            _currentStep = 1;
            _idEditadoManualmente = true;

            const _set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
            _set('ajustesInputId', id);
            const idEl = document.getElementById('ajustesInputId');
            if (idEl) idEl.disabled = true;
            _set('ajustesInputNombre', datos.nombre || '');
            _set('ajustesInputSubtitulo', datos.subtitulo || '');
            _set('ajustesInputLogo', datos.logo_url || '');
            _set('ajustesInputGoogle', datos.google_url || '');
            _set('ajustesInputPasswordAdmin', datos.password_admin || 'ZAN');
            _set('ajustesInputPasswordFormulario', datos.password_formulario || '');

            // Conservar las claves actuales: si el wizard no tiene esos campos, no se deben pisar al guardar
            _clavesExistentes = {
                admin: datos.password_admin || 'ZAN',
                formulario: datos.password_formulario || ''
            };

            const _pf = document.getElementById('ajustesInputPasswordFormulario');
            const _pa = document.getElementById('ajustesInputPasswordAdmin');
            if (_pf) checkStrength(_pf, 'strengthForm');
            if (_pa) checkStrength(_pa, 'strengthAdmin');

            document.getElementById('wizardTitulo').textContent = 'Editar: ' + (datos.nombre || id);
            _mostrarVistaWizard();
            updateWizardUI();
        } catch(e) {
            showToast('Error al cargar: ' + e.message, 'error');
        }
    }

    function _mostrarVistaWizard() {
        document.querySelectorAll('.config-center-view').forEach(v => v.classList.remove('active'));
        document.getElementById('vistaWizard').classList.add('active');
        document.getElementById('wizardActions').style.display = 'flex';
    }

    function volverALista() {
        cerrarFormularioAsociacion();
        setNav('organizaciones');
    }

    function nextStep() {
        if (!validarPaso(_currentStep)) return;
        if (_currentStep < TOTAL_STEPS) {
            _currentStep++;
            updateWizardUI();
        } else {
            guardarAsociacion();
        }
    }

    function prevStep() {
        if (_currentStep > 1) {
            _currentStep--;
            updateWizardUI();
        }
    }

    function goToStep(n) {
        if (n < 1 || n > TOTAL_STEPS || n > _currentStep) return;
        _currentStep = n;
        updateWizardUI();
    }

    function validarPaso(step) {
        if (step === 1) {
            const id = document.getElementById('ajustesInputId')?.value?.trim();
            const nombre = document.getElementById('ajustesInputNombre')?.value?.trim();
            if (!id) { showToast('El ID es obligatorio', 'warning'); return false; }
            if (!nombre) { showToast('El nombre es obligatorio', 'warning'); return false; }
        }
        return true;
    }

    function updateWizardUI() {
        // Título de paso
        const titles = ['Información', 'Contratos', 'UDS', 'Finalizar'];
        document.getElementById('wizardSubtitulo').textContent = `Paso ${_currentStep} de ${TOTAL_STEPS}: ${titles[_currentStep - 1]}`;

        // Wizard dots
        document.querySelectorAll('.cw-step-wrap').forEach((wrap, idx) => {
            const step = idx + 1;
            const dot = wrap.querySelector('.cw-step-dot');
            const conn = wrap.querySelector('.cw-connector');
            wrap.classList.remove('done', 'active');
            if (step < _currentStep) {
                wrap.classList.add('done');
                dot.innerHTML = '<i class=ic-check></i>'; dot.className = 'cw-step-dot done';
                if (conn) conn.classList.add('done');
            } else if (step === _currentStep) {
                wrap.classList.add('active');
                dot.textContent = step; dot.className = 'cw-step-dot active';
                if (conn) conn.classList.remove('done');
            } else {
                dot.textContent = step; dot.className = 'cw-step-dot';
                if (conn) conn.classList.remove('done');
            }
        });

        // Panels
        document.querySelectorAll('.cw-panel').forEach((panel, idx) => {
            panel.classList.toggle('active', idx + 1 === _currentStep);
        });

        // Botones
        const btnAtras = document.getElementById('btnWizardAtras');
        const btnCont = document.getElementById('btnWizardContinuar');
        if (btnAtras) btnAtras.style.visibility = _currentStep === 1 ? 'hidden' : 'visible';
        if (btnCont) btnCont.innerHTML = _currentStep === TOTAL_STEPS ? '<i class=ic-save></i> Guardar Organización' : 'Continuar →';

        // Si es paso 2, renderizar contratos
        if (_currentStep === 2) renderContratos();
        // Si es paso 3, poblar select de contratos
        if (_currentStep === 3) poblarSelectContratosUDS();
        // Si es paso 4, generar resumen
        if (_currentStep === 4) generarResumen();
    }

    // ═══════════════════════════════════════════
    // LISTADO DE ORGANIZACIONES
    // ═══════════════════════════════════════════

    async function cargarListaAsociaciones() {
        const lista = document.getElementById('listaAsociaciones');
        if (!lista) return;
        lista.innerHTML = '<div class="ajustes-loading"><i class=ic-hourglass></i> Cargando organizaciones...</div>';

        try {
            const asociaciones = await AsociacionesModule.cargarAsociaciones();
            const entries = Object.entries(asociaciones);

            if (entries.length === 0) {
                lista.innerHTML = `<div class="ajustes-empty">No hay organizaciones registradas. Crea la primera.</div>`;
                return;
            }

            lista.innerHTML = entries.map(([id, datos]) => {
                const numContratos = Object.keys(datos.contratos || {}).length;
                const numInactivos = Object.keys(datos.contratos || {}).filter(c => (datos.estados_contratos || {})[c] === 'inactivo').length;
                let numUDS = 0;
                Object.values(datos.unidades || {}).forEach(arr => numUDS += (arr || []).length);
                return `
                <div class="config-org-item" id="item-asoc-${id}">
                    <div class="config-org-logo">
                        ${datos.logo_url
                            ? `<img src="${datos.logo_url}" alt="${datos.nombre}" onerror="this.outerHTML='<i class=ic-building-2></i>'">`
                            : '<i class=ic-building-2></i>'}
                    </div>
                    <div class="config-org-info">
                        <div class="config-org-name">${datos.nombre || id}</div>
                        <div class="config-org-meta">
                            ID: <code>${id}</code> · ${numContratos} contrato(s)${numInactivos ? ` (${numInactivos} inactivo${numInactivos > 1 ? 's' : ''})` : ''} · ${numUDS} UDS
                            ${datos.google_url ? '· <i class=ic-circle-check></i> Google URL' : '· <i class=ic-triangle-alert></i> Sin Google URL'}
                        </div>
                    </div>
                    <div class="config-org-actions">
                        <button class="config-center-btn-primary" style="padding:7px 14px;font-size:12px" onclick="AjustesModule.editarAsociacion('${id}')"><i class=ic-pencil></i> Editar</button>
                        <button class="config-center-btn-secondary" style="padding:7px 12px;font-size:12px;color:#ef4444;border-color:#fecaca" onclick="AjustesModule.confirmarEliminarAsociacion('${id}', '${(datos.nombre||'').replace(/'/g,"\'")}')"><i class=ic-trash-2></i></button>
                    </div>
                </div>
                `;
            }).join('');
        } catch(e) {
            lista.innerHTML = `<div class="ajustes-empty"><i class=ic-circle-x></i> Error: ${e.message}</div>`;
        }
    }

    // ═══════════════════════════════════════════
    // PASO 3 — CONTRATOS
    // ═══════════════════════════════════════════

    function renderContratos() {
        const container = document.getElementById('ajustesContratos');
        if (!container) return;
        const entries = Object.entries(_contratosTemp);
        if (entries.length === 0) {
            container.innerHTML = '<div class="ajustes-empty-contratos" style="text-align:center;padding:24px;color:#94a3b8">Sin contratos. Agrega uno arriba.</div>';
            return;
        }
        container.innerHTML = entries.map(([codigo, label]) => {
            const color = _coloresTemp[codigo] || '#94a3b8';
            const modal = _modalidadesTemp[codigo] || '—';
            const regional = _regionalesTemp[codigo] || '—';
            const numUDS = _listaUDS(codigo).length;
            const activo = _contratoActivo(codigo);
            return `
            <div class="contract-item${activo ? '' : ' contract-item--inactivo'}" id="ctr-row-${codigo}">
                <div class="contract-info">
                    <button type="button" class="contract-color" title="Cambiar color" style="background:${color};border-color:${color}" onclick="AjustesModule.toggleColorPicker('${codigo}', this)"></button>
                    <div>
                        <div class="contract-name"><i class=ic-file-text></i> ${label || codigo}
                            <span class="contract-estado-badge ${activo ? 'is-activo' : 'is-inactivo'}">${activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div class="contract-meta">${codigo} · ${regional} · ${modal}</div>
                    </div>
                </div>
                <div class="contract-actions">
                    <button type="button" class="contract-toggle-btn ${activo ? 'is-activo' : 'is-inactivo'}"
                        title="${activo ? 'Desactivar: deja de aparecer en el formulario de novedades (el historial se conserva)' : 'Activar: vuelve a aparecer en el formulario de novedades'}"
                        onclick="AjustesModule.toggleEstadoContrato('${codigo}')">${activo ? '<i class=ic-pause></i> Desactivar' : '<i class=ic-play></i> Activar'}</button>
                    <button onclick="AjustesModule.toggleColorPicker('${codigo}', this)"><i class=ic-palette></i> Color</button>
                    <button onclick="AjustesModule.irAUnidades('${codigo}')"><i class=ic-package></i> UDS (${numUDS})</button>
                    <button onclick="AjustesModule.quitarContrato('${codigo}')" style="color:#ef4444"><i class=ic-trash-2></i></button>
                </div>
            </div>
            `;
        }).join('');
    }

    // ═══════════════════════════════════════════
    // ACTIVAR / DESACTIVAR CONTRATO
    // Un contrato inactivo deja de ofrecerse en el formulario de novedades
    // de los operadores, pero conserva UDS e historial (activas/archivadas).
    // ═══════════════════════════════════════════

    function _contratoActivo(codigo) {
        return _estadosTemp[codigo] !== 'inactivo';
    }

    function toggleEstadoContrato(codigo) {
        if (!_contratosTemp[codigo]) return;
        if (_contratoActivo(codigo)) {
            _estadosTemp[codigo] = 'inactivo';
            showToast(`Contrato ${codigo} desactivado (guarda la organización para aplicar)`, 'info', 3200);
        } else {
            delete _estadosTemp[codigo];
            showToast(`Contrato ${codigo} activado (guarda la organización para aplicar)`, 'success', 3200);
        }
        renderContratos();
    }

    // ═══════════════════════════════════════════
    // PASO 3 — SELECTOR DE COLOR DE CONTRATO
    // ═══════════════════════════════════════════

    function _cerrarColorPopoverListener(e) {
        const pop = document.getElementById('colorPopover');
        if (pop && !pop.contains(e.target)) {
            cerrarColorPicker();
        }
    }

    function cerrarColorPicker() {
        const pop = document.getElementById('colorPopover');
        if (pop) pop.remove();
        document.removeEventListener('click', _cerrarColorPopoverListener, true);
    }

    function toggleColorPicker(codigo, anclaEl) {
        const existente = document.getElementById('colorPopover');
        if (existente) {
            const eraDeEsteContrato = existente.dataset.codigo === codigo;
            cerrarColorPicker();
            if (eraDeEsteContrato) return; // el usuario volvió a pulsar el mismo: solo cerrar
        }

        const actual = (_coloresTemp[codigo] || '#94a3b8').toLowerCase();

        const popover = document.createElement('div');
        popover.id = 'colorPopover';
        popover.className = 'color-popover';
        popover.dataset.codigo = codigo;
        popover.innerHTML = `
            <div class="color-popover-header">
                <div class="color-popover-title">Color del contrato</div>
                <button type="button" class="color-popover-close" title="Cerrar" onclick="AjustesModule.cerrarColorPicker()"><i class=ic-x></i></button>
            </div>
            <div class="color-popover-grid">
                ${CONTRACT_PALETTE.map(c => `
                    <button type="button" class="color-swatch${c.toLowerCase() === actual ? ' selected' : ''}"
                        style="background:${c};color:${c}" title="${c}"
                        onclick="AjustesModule.elegirColorContrato('${codigo}', '${c}')"></button>
                `).join('')}
            </div>
            <div class="color-popover-custom">
                <label for="colorPopoverCustomInput">Personalizado</label>
                <input type="color" id="colorPopoverCustomInput" value="${/^#([0-9a-f]{6})$/i.test(actual) ? actual : '#94a3b8'}"
                    onchange="AjustesModule.elegirColorContrato('${codigo}', this.value)">
            </div>
        `;
        document.body.appendChild(popover);

        // Posicionar cerca del elemento que abrió el selector, dentro del viewport
        const rect = anclaEl.getBoundingClientRect();
        const popW = 208;
        let left = rect.left;
        if (left + popW > window.innerWidth - 12) left = window.innerWidth - popW - 12;
        if (left < 12) left = 12;
        let top = rect.bottom + 8;
        popover.style.position = 'fixed';
        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
        // Si se sale por abajo, mostrarlo arriba del ancla
        requestAnimationFrame(() => {
            const popRect = popover.getBoundingClientRect();
            if (popRect.bottom > window.innerHeight - 8) {
                popover.style.top = Math.max(8, rect.top - popRect.height - 8) + 'px';
            }
        });

        setTimeout(() => {
            document.addEventListener('click', _cerrarColorPopoverListener, true);
        }, 0);
    }

    function elegirColorContrato(codigo, color) {
        _coloresTemp[codigo] = color;
        cerrarColorPicker();
        renderContratos();
    }

    function agregarContrato() {
        const codigoInput = document.getElementById('ajustesNuevoCodigoContrato');
        const labelInput  = document.getElementById('ajustesNuevoLabelContrato');
        const regionalSel = document.getElementById('ajustesNuevaRegionalContrato');
        const modalidadSel = document.getElementById('ajustesNuevaModalidadContrato');
        const codigo = (codigoInput?.value || '').trim();
        const label  = (labelInput?.value  || '').trim();
        const regional = regionalSel?.value || '';
        const modalidad = modalidadSel?.value || '';

        if (!codigo) { showToast('Ingresa un código de contrato', 'warning'); return; }
        if (_contratosTemp[codigo]) { showToast('Ese contrato ya existe', 'warning'); return; }

        _contratosTemp[codigo] = label || `Contrato ${codigo}`;
        if (regional) _regionalesTemp[codigo] = regional;
        if (modalidad) _modalidadesTemp[codigo] = modalidad;
        if (!_unidadesTemp[codigo]) _unidadesTemp[codigo] = [];
        if (!_coloresTemp[codigo]) {
            _coloresTemp[codigo] = FALLBACK_COLORS[Object.keys(_contratosTemp).length % FALLBACK_COLORS.length];
        }

        if (codigoInput) codigoInput.value = '';
        if (labelInput)  labelInput.value  = '';
        if (regionalSel) regionalSel.value = '';
        if (modalidadSel) modalidadSel.value = '';
        renderContratos();
        showToast('Contrato agregado', 'success');
    }

    function quitarContrato(codigo) {
        if (!confirm(`¿Eliminar el contrato "${_contratosTemp[codigo] || codigo}" y todas sus UDS?`)) return;
        delete _contratosTemp[codigo];
        delete _unidadesTemp[codigo];
        delete _coloresTemp[codigo];
        delete _modalidadesTemp[codigo];
        delete _regionalesTemp[codigo];
        delete _estadosTemp[codigo];
        renderContratos();
    }

    function irAUnidades(codigo) {
        _currentStep = 3;
        updateWizardUI();
        setTimeout(() => {
            const sel = document.getElementById('ajustesSelectContratoUDS');
            if (sel) { sel.value = codigo; cambiarContratoUDS(); }
        }, 50);
    }

    // ═══════════════════════════════════════════
    // PASO 4 — UDS
    // ═══════════════════════════════════════════

    function _listaUDS(codigo) {
        const l = _unidadesTemp[codigo];
        if (!l) return [];
        return Array.isArray(l) ? l : Object.values(l);
    }

    function poblarSelectContratosUDS() {
        const sel = document.getElementById('ajustesSelectContratoUDS');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">— Selecciona un contrato —</option>' +
            Object.entries(_contratosTemp).map(([codigo, label]) =>
                `<option value="${codigo}"><i class=ic-file-text></i> ${label || codigo} — ${_regionalesTemp[codigo]||'—'} · ${_modalidadesTemp[codigo]||'—'}</option>`
            ).join('');
        if (current && _contratosTemp[current]) sel.value = current;
        cambiarContratoUDS();
        renderCopiarUDS();
    }

    function cambiarContratoUDS() {
        const codigo = document.getElementById('ajustesSelectContratoUDS')?.value;
        const wrapper = document.getElementById('panelUDSWrapper');
        const tbody = document.querySelector('#tablaUDS tbody');
        if (!wrapper || !tbody) return;
        if (!codigo || !_contratosTemp[codigo]) {
            wrapper.style.display = 'none';
            tbody.innerHTML = '';
            return;
        }
        wrapper.style.display = 'block';
        renderTablaUDS(codigo);
    }

    function renderTablaUDS(codigo) {
        const tbody = document.querySelector('#tablaUDS tbody');
        const lista = _listaUDS(codigo);
        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:16px">Sin unidades. Agrega una arriba.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map((u, i) => `
            <tr>
                <td>${u.nombre}</td>
                <td><code>${u.codigo}</code></td>
                <td><button onclick="AjustesModule.quitarUnidad('${codigo}', ${i})" style="background:transparent;border:none;cursor:pointer;color:#ef4444;font-size:13px"><i class=ic-trash-2></i></button></td>
            </tr>
        `).join('');
    }

    function agregarUnidad() {
        const codigo = document.getElementById('ajustesSelectContratoUDS')?.value;
        const nombreInput = document.getElementById('ajustesNombreUDS');
        const codigoInput = document.getElementById('ajustesCodigoUDS');
        if (!codigo || !_contratosTemp[codigo]) { showToast('Selecciona un contrato primero', 'warning'); return; }

        const nombre = (nombreInput?.value || '').trim().toUpperCase();
        const codigoUDS = (codigoInput?.value || '').trim();
        if (!nombre) { showToast('Ingresa el nombre de la UDS', 'warning'); return; }
        if (!codigoUDS) { showToast('Ingresa el código de la UDS', 'warning'); return; }

        if (!Array.isArray(_unidadesTemp[codigo])) _unidadesTemp[codigo] = _listaUDS(codigo).slice();
        _unidadesTemp[codigo].push({ nombre, codigo: codigoUDS });

        if (nombreInput) nombreInput.value = '';
        if (codigoInput) codigoInput.value = '';
        renderTablaUDS(codigo);
        showToast('UDS agregada', 'success');
    }

    function quitarUnidad(codigo, index) {
        if (!_unidadesTemp[codigo]) return;
        if (!Array.isArray(_unidadesTemp[codigo])) _unidadesTemp[codigo] = _listaUDS(codigo).slice();
        _unidadesTemp[codigo].splice(index, 1);
        renderTablaUDS(codigo);
    }

    // ═══════════════════════════════════════════
    // COPIAR UDS ENTRE CONTRATOS
    // Se elige un contrato origen y uno o varios contratos destino.
    // Modo "agregar": suma solo las UDS cuyo código aún no existe en el
    // destino. Modo "reemplazar": deja el destino idéntico al origen.
    // ═══════════════════════════════════════════

    function _etiquetaContrato(cod) {
        return _contratosTemp[cod] || `Contrato ${cod}`;
    }

    function renderCopiarUDS() {
        const panel = document.getElementById('panelCopiarUDS');
        const selOrigen = document.getElementById('ajustesSelectContratoOrigenUDS');
        const cont = document.getElementById('ajustesDestinosUDS');
        if (!panel || !selOrigen || !cont) return;

        const codigos = Object.keys(_contratosTemp);
        if (codigos.length < 2) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';

        // Conservar selecciones previas mientras sigan siendo válidas
        const origenPrevio = selOrigen.value;
        const destinosPrevios = new Set([...cont.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value));

        selOrigen.innerHTML = '<option value="">— Selecciona contrato origen —</option>' +
            codigos.map(c => `<option value="${c}"><i class=ic-file-text></i> ${_etiquetaContrato(c)} · ${_listaUDS(c).length} UDS</option>`).join('');
        if (origenPrevio && _contratosTemp[origenPrevio]) selOrigen.value = origenPrevio;

        _renderDestinosUDS(destinosPrevios);
    }

    function _renderDestinosUDS(seleccionPrevia) {
        const cont = document.getElementById('ajustesDestinosUDS');
        const origen = document.getElementById('ajustesSelectContratoOrigenUDS')?.value || '';
        if (!cont) return;
        const previa = seleccionPrevia || new Set([...cont.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value));
        const actual = document.getElementById('ajustesSelectContratoUDS')?.value || '';
        const candidatos = Object.keys(_contratosTemp).filter(c => c !== origen);

        if (candidatos.length === 0) { cont.innerHTML = '<span class="copy-uds-empty">No hay otros contratos.</span>'; return; }

        cont.innerHTML = candidatos.map(c => {
            // Por defecto se marca el contrato que se está editando (si no es el origen)
            const marcado = previa.size ? previa.has(c) : (c === actual);
            return `<label class="copy-uds-chip">
                <input type="checkbox" value="${c}" ${marcado ? 'checked' : ''}>
                <span>${_etiquetaContrato(c)} <small>(${_listaUDS(c).length} UDS)</small></span>
            </label>`;
        }).join('');
    }

    function onOrigenCopiarUDS() { _renderDestinosUDS(); }

    function seleccionarTodosDestinosUDS(marcar) {
        document.querySelectorAll('#ajustesDestinosUDS input[type=checkbox]').forEach(c => { c.checked = marcar; });
    }

    function copiarUnidadesDesdeContrato() {
        const origen = document.getElementById('ajustesSelectContratoOrigenUDS')?.value || '';
        const modo = document.getElementById('ajustesModoCopiaUDS')?.value || 'agregar';
        const destinos = [...document.querySelectorAll('#ajustesDestinosUDS input[type=checkbox]:checked')].map(c => c.value)
            .filter(c => c !== origen && _contratosTemp[c]);

        if (!origen || !_contratosTemp[origen]) { showToast('Selecciona el contrato origen', 'warning'); return; }
        const fuente = _listaUDS(origen);
        if (fuente.length === 0) { showToast('El contrato origen no tiene UDS para copiar', 'warning'); return; }
        if (destinos.length === 0) { showToast('Marca al menos un contrato destino', 'warning'); return; }

        if (modo === 'reemplazar') {
            const nombres = destinos.map(c => `• ${_etiquetaContrato(c)} (${_listaUDS(c).length} UDS)`).join('\n');
            if (!confirm(`Se REEMPLAZARÁN todas las UDS de:\n${nombres}\n\npor las ${fuente.length} UDS de "${_etiquetaContrato(origen)}".\n\n¿Continuar?`)) return;
        }

        let agregadas = 0, omitidas = 0;
        destinos.forEach(dest => {
            if (modo === 'reemplazar') {
                _unidadesTemp[dest] = fuente.map(u => ({ nombre: u.nombre, codigo: u.codigo }));
                agregadas += fuente.length;
            } else {
                const lista = _listaUDS(dest).slice();
                const codigos = new Set(lista.map(u => String(u.codigo).trim()));
                fuente.forEach(u => {
                    const cod = String(u.codigo).trim();
                    if (codigos.has(cod)) { omitidas++; return; }
                    lista.push({ nombre: u.nombre, codigo: u.codigo });
                    codigos.add(cod);
                    agregadas++;
                });
                _unidadesTemp[dest] = lista;
            }
        });

        // Refrescar todo lo que muestra UDS
        poblarSelectContratosUDS();
        const sel = document.getElementById('ajustesSelectContratoUDS');
        if (sel && sel.value) renderTablaUDS(sel.value);
        showToast(`${agregadas} UDS copiadas a ${destinos.length} contrato(s)` + (omitidas ? ` · ${omitidas} ya existían` : '') + '. Recuerda guardar la organización.', 'success', 4500);
    }

    // ═══════════════════════════════════════════
    // PASO 5 — RESUMEN
    // ═══════════════════════════════════════════

    function generarResumen() {
        const nombre = document.getElementById('ajustesInputNombre')?.value || '—';
        const numContratos = Object.keys(_contratosTemp).length;
        let numUDS = 0;
        Object.values(_unidadesTemp).forEach(arr => numUDS += (arr || []).length);

        document.getElementById('resNombre').textContent = nombre;
        document.getElementById('resContratos').textContent = numContratos;
        document.getElementById('resUDS').textContent = numUDS;

        const detalle = document.getElementById('resumenDetalle');
        const id = document.getElementById('ajustesInputId')?.value || '—';
        const ciudad = document.getElementById('ajustesInputSubtitulo')?.value || '—';
        const _vF = document.getElementById('ajustesInputPasswordFormulario')?.value ?? (_asociacionEditando ? _clavesExistentes.formulario : '');
        const passForm = _vF ? 'Configurado' : 'Sin clave (acceso libre)';
        const _vA = document.getElementById('ajustesInputPasswordAdmin')?.value ?? (_asociacionEditando ? _clavesExistentes.admin : 'ZAN');
        const passAdmin = _vA ? 'Configurado' : 'Sin clave';

        let contratosText = Object.entries(_contratosTemp).map(([cod, label]) => {
            const reg = _regionalesTemp[cod] || '—';
            const mod = _modalidadesTemp[cod] || '—';
            return `${label || cod} (${reg}, ${mod}${_contratoActivo(cod) ? '' : ', INACTIVO'})`;
        }).join(', ') || 'Ninguno';

        detalle.innerHTML = `
            <strong style="color:var(--kimi-color-text-primary,#0f172a)">ID:</strong> ${id}<br>
            <strong style="color:var(--kimi-color-text-primary,#0f172a)">Ciudad:</strong> ${ciudad}<br>
            <strong style="color:var(--kimi-color-text-primary,#0f172a)">Contratos:</strong> ${contratosText}<br>
            <strong style="color:var(--kimi-color-text-primary,#0f172a)">Acceso formulario:</strong> ${passForm}<br>
            <strong style="color:var(--kimi-color-text-primary,#0f172a)">Acceso admin:</strong> ${passAdmin}
        `;
    }

    // ═══════════════════════════════════════════
    // GUARDAR
    // ═══════════════════════════════════════════

    async function guardarAsociacion() {
        const id         = document.getElementById('ajustesInputId')?.value?.trim().toLowerCase().replace(/\s+/g, '_');
        const nombre     = document.getElementById('ajustesInputNombre')?.value?.trim();
        const subtitulo  = document.getElementById('ajustesInputSubtitulo')?.value?.trim();
        const logo_url   = document.getElementById('ajustesInputLogo')?.value?.trim();
        const google_url = document.getElementById('ajustesInputGoogle')?.value?.trim();

        if (!id)     { showToast('El ID es obligatorio', 'warning'); _currentStep = 1; updateWizardUI(); return; }
        if (!nombre) { showToast('El nombre es obligatorio', 'warning'); _currentStep = 1; updateWizardUI(); return; }

        const elPassAdmin = document.getElementById('ajustesInputPasswordAdmin');
        const elPassForm  = document.getElementById('ajustesInputPasswordFormulario');
        const passwordAdmin      = elPassAdmin ? elPassAdmin.value.trim()
                                 : (_asociacionEditando ? _clavesExistentes.admin : undefined);
        const passwordFormulario = elPassForm ? elPassForm.value.trim()
                                 : (_asociacionEditando ? _clavesExistentes.formulario : undefined);

        const datos = {
            nombre, subtitulo, logo_url, google_url,
            password_admin:      passwordAdmin || 'ZAN',
            password_formulario: passwordFormulario || '',
            contratos:               _contratosTemp,
            colores_contratos:       _coloresTemp,
            modalidades_contratos:   _modalidadesTemp,
            regionales_contratos:    _regionalesTemp,
            estados_contratos:       _estadosTemp,
            unidades:                _unidadesTemp,
            actualizadoEn: new Date().toISOString()
        };

        const btnGuardar = document.getElementById('btnWizardContinuar');
        if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.innerHTML = '<i class=ic-hourglass></i> Guardando...'; }

        try {
            await AsociacionesModule.guardarAsociacion(id, datos);
            showToast(`Organización "${nombre}" guardada`, 'success');
            cerrarFormularioAsociacion();
            setNav('organizaciones');
            await cargarListaAsociaciones();
        } catch(e) {
            showToast('Error al guardar: ' + e.message, 'error');
        } finally {
            if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.innerHTML = '<i class=ic-save></i> Guardar Organización'; }
        }
    }

    function cerrarFormularioAsociacion() {
        _asociacionEditando = null;
        _contratosTemp = {}; _unidadesTemp = {}; _coloresTemp = {};
        _modalidadesTemp = {}; _regionalesTemp = {}; _estadosTemp = {};
        _currentStep = 1;
    }

    // ═══════════════════════════════════════════
    // ELIMINAR
    // ═══════════════════════════════════════════

    function confirmarEliminarAsociacion(id, nombre) {
        if (!confirm(`¿Eliminar la organización "${nombre}"?\n\nSe elimina el perfil pero NO los datos de novedades/archivados en Firebase.`)) return;
        eliminarAsociacion(id, nombre);
    }

    async function eliminarAsociacion(id, nombre) {
        try {
            await AsociacionesModule.eliminarAsociacion(id);
            showToast(`Organización "${nombre}" eliminada`, 'success');
            await cargarListaAsociaciones();
        } catch(e) {
            showToast('Error al eliminar: ' + e.message, 'error');
        }
    }

    // ═══════════════════════════════════════════
    // UTILIDADES — PASSWORD
    // ═══════════════════════════════════════════

    function togglePass(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.innerHTML = input.type === 'password' ? '<i class=ic-eye></i>' : '<i class=ic-eye-off></i>';
    }

    function genPass(inputId, barId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let pass = '';
        for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
        const input = document.getElementById(inputId);
        if (input) { input.value = pass; checkStrength(input, barId); }
    }

    function checkStrength(input, barId) {
        const val = input.value || '';
        let score = 0;
        if (val.length > 5) score++;
        if (val.length > 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        if (val.length === 0) score = 0;

        const bar = document.getElementById(barId);
        if (!bar) return;
        const segs = bar.querySelectorAll('.strength-segment');
        const label = bar.querySelector('.strength-label');
        const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#3b82f6', '#10b981', '#10b981'];
        const texts = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'];

        segs.forEach((s, i) => {
            s.classList.remove('fill', 'warn', 'danger');
            s.style.background = '';
            if (i < score) {
                s.classList.add('fill');
                if (score < 2) s.classList.add('danger');
                else if (score < 4) s.classList.add('warn');
                s.style.background = colors[score - 1];
            }
        });
        if (label) {
            label.textContent = val.length === 0 ? '—' : (texts[score - 1] || 'Muy débil');
            label.style.color = val.length === 0 ? '#94a3b8' : (colors[score - 1] || '#ef4444');
        }
    }

    function resetStrength(barId) {
        const bar = document.getElementById(barId);
        if (!bar) return;
        bar.querySelectorAll('.strength-segment').forEach(s => {
            s.classList.remove('fill', 'warn', 'danger'); s.style.background = '';
        });
        const label = bar.querySelector('.strength-label');
        if (label) { label.textContent = '—'; label.style.color = '#94a3b8'; }
    }

    // ═══════════════════════════════════════════
    // SEGURIDAD DEL SISTEMA
    // ═══════════════════════════════════════════

    async function cambiarPassword() {
        const nueva = document.getElementById('ajustesNuevaPassSistema')?.value?.trim();
        if (!nueva) { showToast('Ingresa una nueva contraseña', 'warning'); return; }
        if (nueva.length < 4) { showToast('Mínimo 4 caracteres', 'warning'); return; }

        try {
            await AsociacionesModule.guardarPasswordAjustes(nueva);
            showToast('Contraseña maestra actualizada', 'success');
            document.getElementById('ajustesNuevaPassSistema').value = '';
        } catch(e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    // API pública
    return {
        abrirPanelAjustes, cerrarPanelAjustes, setNav,
        nuevaAsociacion, editarAsociacion,
        onNombreInput, onIdInput,
        nextStep, prevStep, goToStep,
        volverALista, cargarListaAsociaciones,
        agregarContrato, quitarContrato, irAUnidades,
        toggleColorPicker, elegirColorContrato, cerrarColorPicker,
        cambiarContratoUDS, agregarUnidad, quitarUnidad,
        toggleEstadoContrato,
        copiarUnidadesDesdeContrato, onOrigenCopiarUDS, seleccionarTodosDestinosUDS, renderCopiarUDS,
        guardarAsociacion, confirmarEliminarAsociacion,
        cerrarFormularioAsociacion, cambiarPassword,
        togglePass, genPass, checkStrength
    };
})();