// ============================================================
// MÓDULO DE ASOCIACIONES - Novedades JER
// Gestiona el perfil activo, rutas Firebase dinámicas y branding
// ============================================================

const AsociacionesModule = (() => {

    // ── Estado global del módulo ────────────────────────────────
    let _perfilActivo = null;   // { id, nombre, logo_url, google_url, contratos, unidades }
    let _onPerfilCargado = [];  // callbacks a ejecutar cuando se carga el perfil

    // ── Rutas base en Firebase ─────────────────────────────────
    const FIREBASE_PATHS = {
        asociaciones:   'sistema/asociaciones',
        ajustes:        'sistema/ajustes',
    };

    // ── Obtener ruta Firebase dinámica según perfil activo ─────
    function getRef(tipo) {
        if (!_perfilActivo) {
            console.warn('[Asociaciones] Perfil no cargado. Usando ruta de fallback.');
            return tipo; // fallback a ruta legacy
        }
        const id = _perfilActivo.id;
        switch(tipo) {
            case 'novelties':       return `novedades_${id}`;
            case 'archived':        return `archivados_${id}`;
            case 'configBloqueo':   return `config_${id}/bloqueo`;
            default:                return `${tipo}_${id}`;
        }
    }

    // ── Cargar todas las asociaciones desde Firebase ───────────
    async function cargarAsociaciones() {
        return new Promise((resolve, reject) => {
            database.ref(FIREBASE_PATHS.asociaciones).once('value', snap => {
                const data = snap.val();
                if (!data) { resolve({}); return; }
                resolve(data);
            }, reject);
        });
    }

    // ── Guardar una asociación en Firebase ─────────────────────
    async function guardarAsociacion(id, datos) {
        await database.ref(`${FIREBASE_PATHS.asociaciones}/${id}`).set(datos);
    }

    // ── Eliminar una asociación de Firebase ────────────────────
    async function eliminarAsociacion(id) {
        await database.ref(`${FIREBASE_PATHS.asociaciones}/${id}`).remove();
    }

    // ── Leer / guardar contraseña de ajustes ───────────────────
    async function obtenerPasswordAjustes() {
        return new Promise((resolve) => {
            database.ref(`${FIREBASE_PATHS.ajustes}/password`).once('value', snap => {
                resolve(snap.val() || 'ADMIN2024');
            });
        });
    }

    async function guardarPasswordAjustes(nueva) {
        await database.ref(`${FIREBASE_PATHS.ajustes}/password`).set(nueva);
    }

    // ── Activar un perfil de asociación ───────────────────────
    function activarPerfil(id, datos) {
        _perfilActivo = { id, ...datos };
        sessionStorage.setItem('asoc_id', id);
        sessionStorage.setItem('asoc_data', JSON.stringify(_perfilActivo));
        aplicarBranding(_perfilActivo);
        _onPerfilCargado.forEach(fn => fn(_perfilActivo));
    }

    // ── Recuperar perfil de sesión (si el usuario ya eligió) ───
    function recuperarPerfilDeSesion() {
        const id   = sessionStorage.getItem('asoc_id');
        const data = sessionStorage.getItem('asoc_data');
        if (id && data) {
            try {
                _perfilActivo = JSON.parse(data);
                aplicarBranding(_perfilActivo);
                return true;
            } catch(e) {}
        }
        return false;
    }

    // ── Obtener perfil activo ──────────────────────────────────
    function getPerfilActivo() {
        return _perfilActivo;
    }

    // ── Registrar callback para cuando se cargue el perfil ─────
    function onPerfilCargado(fn) {
        _onPerfilCargado.push(fn);
        if (_perfilActivo) fn(_perfilActivo); // llamar inmediatamente si ya hay perfil
    }

    // ── Aplicar branding visual según perfil ──────────────────
    function aplicarBranding(perfil) {
        // Título de la página
        document.title = `Reporte Novedades | ${perfil.nombre || 'JER'}`;

        // Nombre en el header
        const headerNombre = document.getElementById('headerNombreAsoc');
        if (headerNombre) headerNombre.textContent = perfil.nombre || '';

        // Subtítulo / ciudad
        const headerSub = document.getElementById('headerSubtitle');
        if (headerSub) headerSub.textContent = perfil.subtitulo || perfil.nombre || '';

        // Logo
        const logoEl = document.getElementById('logoAsociacion');
        if (logoEl) {
            if (perfil.logo_url) {
                logoEl.src = perfil.logo_url;
                logoEl.style.display = 'block';
            } else {
                logoEl.src = 'LOGOJER.png';
            }
        }

        // URL del formulario de Google
        const form = document.getElementById('noveltyForm');
        if (form && perfil.google_url) {
            form.action = perfil.google_url;
        }

        // Poblar selects de contratos en el formulario
        _poblarContratosFormulario(perfil);

        // Poblar select de contratos en filtros del panel admin
        _poblarContratosAdmin(perfil);

        // Actualizar UDS_DATA global con los datos del perfil activo
        _actualizarUDSData(perfil);

        // Indicador de perfil en header
        const indicadorPerfil = document.getElementById('indicadorPerfil');
        if (indicadorPerfil) indicadorPerfil.textContent = perfil.nombre || '';

        // Nombre en el panel admin
        const adminNombreAsoc = document.getElementById('adminNombreAsoc');
        if (adminNombreAsoc) adminNombreAsoc.textContent = `🏢 ${perfil.nombre || perfil.id}`;
    }

    // ── Poblar contratos en el formulario público ──────────────
    function _poblarContratosFormulario(perfil) {
        const select = document.getElementById('contractNumber');
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione...</option>';
        const contratos = perfil.contratos || {};
        Object.entries(contratos).forEach(([codigo, label]) => {
            const opt = document.createElement('option');
            opt.value = codigo;
            opt.textContent = label || `Contrato ${codigo}`;
            select.appendChild(opt);
        });
    }

    // ── Poblar contratos en los filtros del panel admin ────────
    function _poblarContratosAdmin(perfil) {
        const selects = [
            document.getElementById('filterContract'),
            document.getElementById('filterContractArchivados'),
        ];
        selects.forEach(select => {
            if (!select) return;
            const valorActual = select.value;
            select.innerHTML = '<option value="">Todos los contratos</option>';
            const contratos = perfil.contratos || {};
            Object.entries(contratos).forEach(([codigo, label]) => {
                const opt = document.createElement('option');
                opt.value = codigo;
                opt.textContent = label || `Contrato ${codigo}`;
                select.appendChild(opt);
            });
            select.value = valorActual;
        });
    }

    // ── Actualizar UDS_DATA global según perfil ────────────────
    // app.js usa window.UDS_DATA — lo reemplazamos con el del perfil activo
    function _actualizarUDSData(perfil) {
        const unidades = perfil.unidades || {};
        // Convertir formato Firebase {codigo: [{nombre, codigo_uds}, ...]}
        // al formato legado usado por app.js: {'665': [['NOMBRE', 'CODIGO'], ...]}
        const nuevoUDS = {};
        Object.entries(unidades).forEach(([contrato, lista]) => {
            if (Array.isArray(lista)) {
                nuevoUDS[contrato] = lista.map(u => [u.nombre || u[0], u.codigo || u[1]]);
            } else if (typeof lista === 'object') {
                // formato objeto {key: {nombre, codigo}}
                nuevoUDS[contrato] = Object.values(lista).map(u => [u.nombre, u.codigo]);
            }
        });
        window.UDS_DATA = nuevoUDS;
    }

    // ── Mostrar modal selector de asociaciones ─────────────────
    async function mostrarSelectorAsociaciones() {
        const modal = document.getElementById('modalSelectorAsociacion');
        const grid  = document.getElementById('gridAsociaciones');
        if (!modal || !grid) return;

        grid.innerHTML = '<div class="asoc-loading">⏳ Cargando asociaciones...</div>';
        modal.style.display = 'flex';

        try {
            const asociaciones = await cargarAsociaciones();
            const lista = Object.entries(asociaciones);

            if (lista.length === 0) {
                grid.innerHTML = `
                    <div class="asoc-empty">
                        <div style="font-size:3rem">🏢</div>
                        <p>No hay asociaciones configuradas.</p>
                        <p style="font-size:12px;color:#94a3b8;">Accede al Panel de Ajustes para crear la primera.</p>
                    </div>`;
                return;
            }

            grid.innerHTML = lista.map(([id, datos]) => `
                <button class="asoc-card" onclick="AsociacionesModule.seleccionarAsociacion('${id}')">
                    <div class="asoc-card-logo">
                        ${datos.logo_url
                            ? `<img src="${datos.logo_url}" alt="${datos.nombre}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
                            : ''}
                        <div class="asoc-card-logo-fallback" style="${datos.logo_url ? 'display:none' : 'display:flex'}">
                            🏢
                        </div>
                    </div>
                    <div class="asoc-card-nombre">${datos.nombre || id}</div>
                    ${datos.subtitulo ? `<div class="asoc-card-sub">${datos.subtitulo}</div>` : ''}
                    <div class="asoc-card-contratos">
                        ${Object.keys(datos.contratos || {}).length} contrato(s)
                    </div>
                </button>
            `).join('');
        } catch(e) {
            grid.innerHTML = `<div class="asoc-empty">❌ Error al cargar asociaciones.<br><small>${e.message}</small></div>`;
        }
    }

    // ── Seleccionar una asociación desde el modal ──────────────
    async function seleccionarAsociacion(id) {
        try {
            const snap = await database.ref(`${FIREBASE_PATHS.asociaciones}/${id}`).once('value');
            const datos = snap.val();
            if (!datos) { showToast('Asociación no encontrada', 'error'); return; }

            activarPerfil(id, datos);

            const modal = document.getElementById('modalSelectorAsociacion');
            if (modal) modal.style.display = 'none';

            showToast(`✅ Perfil cargado: ${datos.nombre}`, 'success');

            // Recargar datos de Firebase con las nuevas rutas
            if (typeof openAdminPanel !== 'undefined' && document.getElementById('adminPanel')?.style.display === 'block') {
                openAdminPanel();
            }
        } catch(e) {
            showToast('Error al cargar perfil: ' + e.message, 'error');
        }
    }

    // ── Cerrar el modal selector ───────────────────────────────
    function cerrarSelectorAsociacion() {
        // Solo se puede cerrar si ya hay un perfil activo
        if (!_perfilActivo) {
            showToast('Debes seleccionar una asociación para continuar', 'warning');
            return;
        }
        const modal = document.getElementById('modalSelectorAsociacion');
        if (modal) modal.style.display = 'none';
    }

    // ── Cambiar de perfil (vuelve a mostrar el selector) ──────
    function cambiarAsociacion() {
        sessionStorage.removeItem('asoc_id');
        sessionStorage.removeItem('asoc_data');
        _perfilActivo = null;
        mostrarSelectorAsociaciones();
    }

    // ── Inicializar al cargar la página ───────────────────────
    async function init() {
        // Si ya hay perfil en sesión, cargarlo sin mostrar el modal
        if (recuperarPerfilDeSesion()) {
            return;
        }
        // Si no, mostrar el modal selector
        await mostrarSelectorAsociaciones();
    }

    // API pública
    return {
        init,
        getRef,
        getPerfilActivo,
        onPerfilCargado,
        cargarAsociaciones,
        guardarAsociacion,
        eliminarAsociacion,
        obtenerPasswordAjustes,
        guardarPasswordAjustes,
        activarPerfil,
        seleccionarAsociacion,
        cerrarSelectorAsociacion,
        cambiarAsociacion,
        mostrarSelectorAsociaciones,
    };
})();
          
