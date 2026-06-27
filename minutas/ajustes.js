// ============================================================
// MÓDULO DE AJUSTES DE ASOCIACIONES - Novedades JER
// Solo accesible con contraseña única del sistema
// ============================================================

const AjustesModule = (() => {

    let _asociacionEditando = null; // id de la asociación en edición
    let _contratosTemp = {};        // contratos mientras se edita
    let _unidadesTemp = {};         // unidades por contrato mientras se edita

    // ── Abrir panel de ajustes (requiere contraseña) ──────────
    async function abrirPanelAjustes() {
        const password = prompt('🔐 Contraseña del Panel de Ajustes:');
        if (password === null) return;

        const passwordCorrecta = await AsociacionesModule.obtenerPasswordAjustes();
        if (password !== passwordCorrecta) {
            showToast('Contraseña incorrecta', 'error');
            return;
        }

        const panel = document.getElementById('panelAjustes');
        if (panel) {
            panel.style.display = 'flex';
            await cargarListaAsociaciones();
        }
    }

    // ── Cerrar panel de ajustes ───────────────────────────────
    function cerrarPanelAjustes() {
        const panel = document.getElementById('panelAjustes');
        if (panel) panel.style.display = 'none';
        cerrarFormularioAsociacion();
    }

    // ── Cargar lista de asociaciones en el panel ───────────────
    async function cargarListaAsociaciones() {
        const lista = document.getElementById('listaAsociaciones');
        if (!lista) return;
        lista.innerHTML = '<div class="ajustes-loading">⏳ Cargando...</div>';

        try {
            const asociaciones = await AsociacionesModule.cargarAsociaciones();
            const entries = Object.entries(asociaciones);

            if (entries.length === 0) {
                lista.innerHTML = `<div class="ajustes-empty">No hay asociaciones. Crea la primera. 👇</div>`;
                return;
            }

            lista.innerHTML = entries.map(([id, datos]) => `
                <div class="ajustes-asoc-item" id="item-asoc-${id}">
                    <div class="ajustes-asoc-logo">
                        ${datos.logo_url
                            ? `<img src="${datos.logo_url}" alt="${datos.nombre}" onerror="this.outerHTML='🏢'">`
                            : '🏢'}
                    </div>
                    <div class="ajustes-asoc-info">
                        <div class="ajustes-asoc-nombre">${datos.nombre || id}</div>
                        <div class="ajustes-asoc-meta">
                            ID: <code>${id}</code> · 
                            ${Object.keys(datos.contratos || {}).length} contrato(s) · 
                            ${datos.google_url ? '✅ Google URL' : '⚠️ Sin Google URL'}
                        </div>
                    </div>
                    <div class="ajustes-asoc-actions">
                        <button class="btn-ajustes-edit" onclick="AjustesModule.editarAsociacion('${id}')">✏️ Editar</button>
                        <button class="btn-ajustes-delete" onclick="AjustesModule.confirmarEliminarAsociacion('${id}', '${(datos.nombre||'').replace(/'/g,"\\'")}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch(e) {
            lista.innerHTML = `<div class="ajustes-empty">❌ Error: ${e.message}</div>`;
        }
    }

    // ── Mostrar formulario para nueva asociación ───────────────
    function nuevaAsociacion() {
        _asociacionEditando = null;
        _contratosTemp = {};
        _unidadesTemp = {};
        _mostrarFormulario({
            id: '',
            nombre: '',
            subtitulo: '',
            logo_url: '',
            google_url: '',
            contratos: {},
            unidades: {}
        }, true);
    }

    // ── Editar una asociación existente ───────────────────────
    async function editarAsociacion(id) {
        try {
            const snap = await database.ref(`sistema/asociaciones/${id}`).once('value');
            const datos = snap.val();
            if (!datos) { showToast('Asociación no encontrada', 'error'); return; }

            _asociacionEditando = id;
            _contratosTemp = { ...(datos.contratos || {}) };
            _unidadesTemp  = JSON.parse(JSON.stringify(datos.unidades || {}));
            _mostrarFormulario({ id, ...datos }, false);
        } catch(e) {
            showToast('Error al cargar: ' + e.message, 'error');
        }
    }

    // ── Mostrar el formulario en el panel ─────────────────────
    function _mostrarFormulario(datos, esNueva) {
        const form = document.getElementById('formAsociacion');
        if (!form) return;

        form.style.display = 'block';

        document.getElementById('ajustesTituloForm').textContent = esNueva ? '➕ Nueva Asociación' : `✏️ Editar: ${datos.nombre}`;
        document.getElementById('ajustesInputId').value      = datos.id || '';
        document.getElementById('ajustesInputId').disabled   = !esNueva;
        document.getElementById('ajustesInputNombre').value  = datos.nombre || '';
        document.getElementById('ajustesInputSubtitulo').value = datos.subtitulo || '';
        document.getElementById('ajustesInputLogo').value    = datos.logo_url || '';
        document.getElementById('ajustesInputGoogle').value  = datos.google_url || '';

        _renderContratos();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Renderizar lista de contratos en el formulario ─────────
    function _renderContratos() {
        const container = document.getElementById('ajustesContratos');
        if (!container) return;

        const entries = Object.entries(_contratosTemp);
        if (entries.length === 0) {
            container.innerHTML = '<div class="ajustes-empty-contratos">Sin contratos. Agrega uno abajo.</div>';
        } else {
            container.innerHTML = entries.map(([codigo, label]) => `
                <div class="ajustes-contrato-item" id="ctr-${codigo}">
                    <div class="ajustes-contrato-header">
                        <span class="ajustes-contrato-codigo">📄 ${label || codigo}</span>
                        <div class="ajustes-contrato-btns">
                            <button class="btn-ajustes-sm" onclick="AjustesModule.toggleUnidades('${codigo}')">
                                📦 Unidades (${(_unidadesTemp[codigo] || []).length})
                            </button>
                            <button class="btn-ajustes-delete-sm" onclick="AjustesModule.quitarContrato('${codigo}')">✕</button>
                        </div>
                    </div>
                    <div class="ajustes-unidades-panel" id="panel-unidades-${codigo}" style="display:none">
                        ${_renderUnidades(codigo)}
                    </div>
                </div>
            `).join('');
        }
    }

    // ── Renderizar unidades de un contrato ────────────────────
    function _renderUnidades(codigo) {
        const lista = _unidadesTemp[codigo] || [];
        return `
            <div class="ajustes-unidades-lista" id="lista-unidades-${codigo}">
                ${lista.length === 0
                    ? '<div class="ajustes-empty-contratos">Sin unidades. Agrega una.</div>'
                    : lista.map((u, i) => `
                        <div class="ajustes-unidad-item">
                            <span>${u.nombre} <small>(${u.codigo})</small></span>
                            <button class="btn-ajustes-delete-sm" onclick="AjustesModule.quitarUnidad('${codigo}', ${i})">✕</button>
                        </div>
                    `).join('')
                }
            </div>
            <div class="ajustes-add-unidad">
                <input type="text" id="inputNombreUDS-${codigo}" placeholder="Nombre UDS" class="ajustes-input-sm">
                <input type="text" id="inputCodigoUDS-${codigo}" placeholder="Código UDS" class="ajustes-input-sm">
                <button class="btn-ajustes-add" onclick="AjustesModule.agregarUnidad('${codigo}')">+ Agregar</button>
            </div>
        `;
    }

    // ── Toggle panel de unidades ───────────────────────────────
    function toggleUnidades(codigo) {
        const panel = document.getElementById(`panel-unidades-${codigo}`);
        if (!panel) return;
        if (panel.style.display === 'none') {
            panel.innerHTML = _renderUnidades(codigo);
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // ── Agregar contrato al temporal ───────────────────────────
    function agregarContrato() {
        const codigoInput = document.getElementById('ajustesNuevoCodigoContrato');
        const labelInput  = document.getElementById('ajustesNuevoLabelContrato');
        const codigo = (codigoInput?.value || '').trim();
        const label  = (labelInput?.value  || '').trim();

        if (!codigo) { showToast('Ingresa un código de contrato', 'warning'); return; }
        if (_contratosTemp[codigo]) { showToast('Ese contrato ya existe', 'warning'); return; }

        _contratosTemp[codigo] = label || `Contrato ${codigo}`;
        if (!_unidadesTemp[codigo]) _unidadesTemp[codigo] = [];

        if (codigoInput) codigoInput.value = '';
        if (labelInput)  labelInput.value  = '';
        _renderContratos();
    }

    // ── Quitar contrato del temporal ───────────────────────────
    function quitarContrato(codigo) {
        if (!confirm(`¿Eliminar el contrato "${_contratosTemp[codigo] || codigo}" y todas sus unidades?`)) return;
        delete _contratosTemp[codigo];
        delete _unidadesTemp[codigo];
        _renderContratos();
    }

    // ── Agregar unidad a un contrato ──────────────────────────
    function agregarUnidad(codigo) {
        const nombreInput = document.getElementById(`inputNombreUDS-${codigo}`);
        const codigoInput = document.getElementById(`inputCodigoUDS-${codigo}`);
        const nombre = (nombreInput?.value || '').trim().toUpperCase();
        const codigoUDS = (codigoInput?.value || '').trim();

        if (!nombre) { showToast('Ingresa el nombre de la UDS', 'warning'); return; }
        if (!codigoUDS) { showToast('Ingresa el código de la UDS', 'warning'); return; }

        if (!_unidadesTemp[codigo]) _unidadesTemp[codigo] = [];
        _unidadesTemp[codigo].push({ nombre, codigo: codigoUDS });

        if (nombreInput) nombreInput.value = '';
        if (codigoInput) codigoInput.value = '';

        // Refrescar solo la lista
        const lista = document.getElementById(`lista-unidades-${codigo}`);
        if (lista) {
            const listaActualizada = _unidadesTemp[codigo];
            lista.innerHTML = listaActualizada.map((u, i) => `
                <div class="ajustes-unidad-item">
                    <span>${u.nombre} <small>(${u.codigo})</small></span>
                    <button class="btn-ajustes-delete-sm" onclick="AjustesModule.quitarUnidad('${codigo}', ${i})">✕</button>
                </div>
            `).join('');
        }
        // Actualizar contador
        const btn = document.querySelector(`#ctr-${codigo} .btn-ajustes-sm`);
        if (btn) btn.textContent = `📦 Unidades (${_unidadesTemp[codigo].length})`;
    }

    // ── Quitar una unidad de un contrato ──────────────────────
    function quitarUnidad(codigo, index) {
        if (!_unidadesTemp[codigo]) return;
        _unidadesTemp[codigo].splice(index, 1);
        // Refrescar lista
        const lista = document.getElementById(`lista-unidades-${codigo}`);
        if (lista) {
            const listaActualizada = _unidadesTemp[codigo];
            if (listaActualizada.length === 0) {
                lista.innerHTML = '<div class="ajustes-empty-contratos">Sin unidades. Agrega una.</div>';
            } else {
                lista.innerHTML = listaActualizada.map((u, i) => `
                    <div class="ajustes-unidad-item">
                        <span>${u.nombre} <small>(${u.codigo})</small></span>
                        <button class="btn-ajustes-delete-sm" onclick="AjustesModule.quitarUnidad('${codigo}', ${i})">✕</button>
                    </div>
                `).join('');
            }
        }
        const btn = document.querySelector(`#ctr-${codigo} .btn-ajustes-sm`);
        if (btn) btn.textContent = `📦 Unidades (${_unidadesTemp[codigo].length})`;
    }

    // ── Guardar la asociación ──────────────────────────────────
    async function guardarAsociacion() {
        const id         = document.getElementById('ajustesInputId')?.value?.trim().toLowerCase().replace(/\s+/g, '_');
        const nombre     = document.getElementById('ajustesInputNombre')?.value?.trim();
        const subtitulo  = document.getElementById('ajustesInputSubtitulo')?.value?.trim();
        const logo_url   = document.getElementById('ajustesInputLogo')?.value?.trim();
        const google_url = document.getElementById('ajustesInputGoogle')?.value?.trim();

        if (!id)     { showToast('El ID es obligatorio', 'warning'); return; }
        if (!nombre) { showToast('El nombre es obligatorio', 'warning'); return; }

        const datos = {
            nombre,
            subtitulo,
            logo_url,
            google_url,
            contratos: _contratosTemp,
            unidades:  _unidadesTemp,
            actualizadoEn: new Date().toISOString()
        };

        const btnGuardar = document.getElementById('btnGuardarAsociacion');
        if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = '⏳ Guardando...'; }

        try {
            await AsociacionesModule.guardarAsociacion(id, datos);
            showToast(`✅ Asociación "${nombre}" guardada`, 'success');
            cerrarFormularioAsociacion();
            await cargarListaAsociaciones();
        } catch(e) {
            showToast('Error al guardar: ' + e.message, 'error');
        } finally {
            if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = '💾 Guardar Asociación'; }
        }
    }

    // ── Confirmar eliminación de asociación ────────────────────
    function confirmarEliminarAsociacion(id, nombre) {
        if (!confirm(`⚠️ ¿Eliminar la asociación "${nombre}"?\n\nSe elimina el perfil pero NO los datos de novedades/archivados en Firebase.`)) return;
        eliminarAsociacion(id, nombre);
    }

    async function eliminarAsociacion(id, nombre) {
        try {
            await AsociacionesModule.eliminarAsociacion(id);
            showToast(`🗑️ Asociación "${nombre}" eliminada`, 'success');
            await cargarListaAsociaciones();
        } catch(e) {
            showToast('Error al eliminar: ' + e.message, 'error');
        }
    }

    // ── Cerrar formulario ──────────────────────────────────────
    function cerrarFormularioAsociacion() {
        const form = document.getElementById('formAsociacion');
        if (form) form.style.display = 'none';
        _asociacionEditando = null;
        _contratosTemp = {};
        _unidadesTemp  = {};
    }

    // ── Cambiar contraseña del panel de ajustes ────────────────
    async function cambiarPassword() {
        const actual  = prompt('🔑 Contraseña actual:');
        if (actual === null) return;

        const correcta = await AsociacionesModule.obtenerPasswordAjustes();
        if (actual !== correcta) { showToast('Contraseña actual incorrecta', 'error'); return; }

        const nueva   = prompt('🆕 Nueva contraseña:');
        if (!nueva || nueva.trim() === '') { showToast('La nueva contraseña no puede estar vacía', 'warning'); return; }

        const confirmar = prompt('🔁 Confirmar nueva contraseña:');
        if (nueva !== confirmar) { showToast('Las contraseñas no coinciden', 'error'); return; }

        try {
            await AsociacionesModule.guardarPasswordAjustes(nueva.trim());
            showToast('✅ Contraseña actualizada', 'success');
        } catch(e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    // API pública
    return {
        abrirPanelAjustes,
        cerrarPanelAjustes,
        cargarListaAsociaciones,
        nuevaAsociacion,
        editarAsociacion,
        agregarContrato,
        quitarContrato,
        toggleUnidades,
        agregarUnidad,
        quitarUnidad,
        guardarAsociacion,
        confirmarEliminarAsociacion,
        cerrarFormularioAsociacion,
        cambiarPassword,
    };
})();
          
