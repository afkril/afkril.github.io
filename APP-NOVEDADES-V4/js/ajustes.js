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
    let _currentStep = 1;
    let _idEditadoManualmente = false;
    const TOTAL_STEPS = 5;

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
            icono: '⚙️',
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
        _contratosTemp = {}; _unidadesTemp = {}; _coloresTemp = {};
        _modalidadesTemp = {}; _regionalesTemp = {};
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
            _unidadesTemp  = JSON.parse(JSON.stringify(datos.unidades || {}));
            _coloresTemp      = { ...(datos.colores_contratos || {}) };
            _modalidadesTemp  = { ...(datos.modalidades_contratos || {}) };
            _regionalesTemp   = { ...(datos.regionales_contratos || {}) };
            _currentStep = 1;
            _idEditadoManualmente = true;

            document.getElementById('ajustesInputId').value = id;
            document.getElementById('ajustesInputId').disabled = true;
            document.getElementById('ajustesInputNombre').value = datos.nombre || '';
            document.getElementById('ajustesInputSubtitulo').value = datos.subtitulo || '';
            document.getElementById('ajustesInputLogo').value = datos.logo_url || '';
            document.getElementById('ajustesInputGoogle').value = datos.google_url || '';
            document.getElementById('ajustesInputPasswordAdmin').value = datos.password_admin || 'ZAN';
            document.getElementById('ajustesInputPasswordFormulario').value = datos.password_formulario || '';

            checkStrength(document.getElementById('ajustesInputPasswordFormulario'), 'strengthForm');
            checkStrength(document.getElementById('ajustesInputPasswordAdmin'), 'strengthAdmin');

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
        const titles = ['Información', 'Accesos', 'Contratos', 'UDS', 'Finalizar'];
        document.getElementById('wizardSubtitulo').textContent = `Paso ${_currentStep} de ${TOTAL_STEPS}: ${titles[_currentStep - 1]}`;

        // Wizard dots
        document.querySelectorAll('.cw-step-wrap').forEach((wrap, idx) => {
            const step = idx + 1;
            const dot = wrap.querySelector('.cw-step-dot');
            const conn = wrap.querySelector('.cw-connector');
            wrap.classList.remove('done', 'active');
            if (step < _currentStep) {
                wrap.classList.add('done');
                dot.textContent = '✓'; dot.className = 'cw-step-dot done';
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
        if (btnCont) btnCont.textContent = _currentStep === TOTAL_STEPS ? '💾 Guardar Organización' : 'Continuar →';

        // Si es paso 3, renderizar contratos
        if (_currentStep === 3) renderContratos();
        // Si es paso 4, poblar select de contratos
        if (_currentStep === 4) poblarSelectContratosUDS();
        // Si es paso 5, generar resumen
        if (_currentStep === 5) generarResumen();
    }

    // ═══════════════════════════════════════════
    // LISTADO DE ORGANIZACIONES
    // ═══════════════════════════════════════════

    async function cargarListaAsociaciones() {
        const lista = document.getElementById('listaAsociaciones');
        if (!lista) return;
        lista.innerHTML = '<div class="ajustes-loading">⏳ Cargando organizaciones...</div>';

        try {
            const asociaciones = await AsociacionesModule.cargarAsociaciones();
            const entries = Object.entries(asociaciones);

            if (entries.length === 0) {
                lista.innerHTML = `<div class="ajustes-empty">No hay organizaciones registradas. Crea la primera. 👇</div>`;
                return;
            }

            lista.innerHTML = entries.map(([id, datos]) => {
                const numContratos = Object.keys(datos.contratos || {}).length;
                let numUDS = 0;
                Object.values(datos.unidades || {}).forEach(arr => numUDS += (arr || []).length);
                return `
                <div class="config-org-item" id="item-asoc-${id}">
                    <div class="config-org-logo">
                        ${datos.logo_url
                            ? `<img src="${datos.logo_url}" alt="${datos.nombre}" onerror="this.outerHTML='🏢'">`
                            : '🏢'}
                    </div>
                    <div class="config-org-info">
                        <div class="config-org-name">${datos.nombre || id}</div>
                        <div class="config-org-meta">
                            ID: <code>${id}</code> · ${numContratos} contrato(s) · ${numUDS} UDS
                            ${datos.google_url ? '· ✅ Google URL' : '· ⚠️ Sin Google URL'}
                        </div>
                    </div>
                    <div class="config-org-actions">
                        <button class="config-center-btn-primary" style="padding:7px 14px;font-size:12px" onclick="AjustesModule.editarAsociacion('${id}')">✏️ Editar</button>
                        <button class="config-center-btn-secondary" style="padding:7px 12px;font-size:12px;color:#ef4444;border-color:#fecaca" onclick="AjustesModule.confirmarEliminarAsociacion('${id}', '${(datos.nombre||'').replace(/'/g,"\'")}')">🗑️</button>
                    </div>
                </div>
                `;
            }).join('');
        } catch(e) {
            lista.innerHTML = `<div class="ajustes-empty">❌ Error: ${e.message}</div>`;
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
            const numUDS = (_unidadesTemp[codigo] || []).length;
            return `
            <div class="contract-item" id="ctr-row-${codigo}">
                <div class="contract-info">
                    <button type="button" class="contract-color" title="Cambiar color" style="background:${color};border-color:${color}" onclick="AjustesModule.toggleColorPicker('${codigo}', this)"></button>
                    <div>
                        <div class="contract-name">📄 ${label || codigo}</div>
                        <div class="contract-meta">${codigo} · ${regional} · ${modal}</div>
                    </div>
                </div>
                <div class="contract-actions">
                    <button onclick="AjustesModule.toggleColorPicker('${codigo}', this)">🎨 Color</button>
                    <button onclick="AjustesModule.irAUnidades('${codigo}')">📦 UDS (${numUDS})</button>
                    <button onclick="AjustesModule.quitarContrato('${codigo}')" style="color:#ef4444">🗑️</button>
                </div>
            </div>
            `;
        }).join('');
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
                <button type="button" class="color-popover-close" title="Cerrar" onclick="AjustesModule.cerrarColorPicker()">✕</button>
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
        renderContratos();
    }

    function irAUnidades(codigo) {
        _currentStep = 4;
        updateWizardUI();
        setTimeout(() => {
            const sel = document.getElementById('ajustesSelectContratoUDS');
            if (sel) { sel.value = codigo; cambiarContratoUDS(); }
        }, 50);
    }

    // ═══════════════════════════════════════════
    // PASO 4 — UDS
    // ═══════════════════════════════════════════

    function poblarSelectContratosUDS() {
        const sel = document.getElementById('ajustesSelectContratoUDS');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">— Selecciona un contrato —</option>' +
            Object.entries(_contratosTemp).map(([codigo, label]) =>
                `<option value="${codigo}">📄 ${label || codigo} — ${_regionalesTemp[codigo]||'—'} · ${_modalidadesTemp[codigo]||'—'}</option>`
            ).join('');
        if (current && _contratosTemp[current]) sel.value = current;
        cambiarContratoUDS();
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
        const lista = _unidadesTemp[codigo] || [];
        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:16px">Sin unidades. Agrega una arriba.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map((u, i) => `
            <tr>
                <td>${u.nombre}</td>
                <td><code>${u.codigo}</code></td>
                <td><button onclick="AjustesModule.quitarUnidad('${codigo}', ${i})" style="background:transparent;border:none;cursor:pointer;color:#ef4444;font-size:13px">🗑️</button></td>
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

        if (!_unidadesTemp[codigo]) _unidadesTemp[codigo] = [];
        _unidadesTemp[codigo].push({ nombre, codigo: codigoUDS });

        if (nombreInput) nombreInput.value = '';
        if (codigoInput) codigoInput.value = '';
        renderTablaUDS(codigo);
        showToast('UDS agregada', 'success');
    }

    function quitarUnidad(codigo, index) {
        if (!_unidadesTemp[codigo]) return;
        _unidadesTemp[codigo].splice(index, 1);
        renderTablaUDS(codigo);
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
        const passForm = document.getElementById('ajustesInputPasswordFormulario')?.value ? 'Configurado ✅' : 'Sin clave (acceso libre)';
        const passAdmin = document.getElementById('ajustesInputPasswordAdmin')?.value ? 'Configurado ✅' : 'Sin clave';

        let contratosText = Object.entries(_contratosTemp).map(([cod, label]) => {
            const reg = _regionalesTemp[cod] || '—';
            const mod = _modalidadesTemp[cod] || '—';
            return `${label || cod} (${reg}, ${mod})`;
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

        const passwordAdmin      = document.getElementById('ajustesInputPasswordAdmin')?.value?.trim();
        const passwordFormulario  = document.getElementById('ajustesInputPasswordFormulario')?.value?.trim();

        const datos = {
            nombre, subtitulo, logo_url, google_url,
            password_admin:      passwordAdmin || 'ZAN',
            password_formulario: passwordFormulario || '',
            contratos:               _contratosTemp,
            colores_contratos:       _coloresTemp,
            modalidades_contratos:   _modalidadesTemp,
            regionales_contratos:    _regionalesTemp,
            unidades:                _unidadesTemp,
            actualizadoEn: new Date().toISOString()
        };

        const btnGuardar = document.getElementById('btnWizardContinuar');
        if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = '⏳ Guardando...'; }

        try {
            await AsociacionesModule.guardarAsociacion(id, datos);
            showToast(`✅ Organización "${nombre}" guardada`, 'success');
            cerrarFormularioAsociacion();
            setNav('organizaciones');
            await cargarListaAsociaciones();
        } catch(e) {
            showToast('Error al guardar: ' + e.message, 'error');
        } finally {
            if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = '💾 Guardar Organización'; }
        }
    }

    function cerrarFormularioAsociacion() {
        _asociacionEditando = null;
        _contratosTemp = {}; _unidadesTemp = {}; _coloresTemp = {};
        _modalidadesTemp = {}; _regionalesTemp = {};
        _currentStep = 1;
    }

    // ═══════════════════════════════════════════
    // ELIMINAR
    // ═══════════════════════════════════════════

    function confirmarEliminarAsociacion(id, nombre) {
        if (!confirm(`⚠️ ¿Eliminar la organización "${nombre}"?\n\nSe elimina el perfil pero NO los datos de novedades/archivados en Firebase.`)) return;
        eliminarAsociacion(id, nombre);
    }

    async function eliminarAsociacion(id, nombre) {
        try {
            await AsociacionesModule.eliminarAsociacion(id);
            showToast(`🗑️ Organización "${nombre}" eliminada`, 'success');
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
        btn.textContent = input.type === 'password' ? '👁️' : '🙈';
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
            showToast('✅ Contraseña maestra actualizada', 'success');
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
        guardarAsociacion, confirmarEliminarAsociacion,
        cerrarFormularioAsociacion, cambiarPassword,
        togglePass, genPass, checkStrength
    };
})();
