// ============================================================
// MÓDULO DE ASOCIACIONES - Novedades JER
// Gestiona el perfil activo, rutas Firebase dinámicas y branding
// ============================================================

const AsociacionesModule = (() => {

    // ── Estado ─────────────────────────────────────────────────
    let _perfilActivo = null;
    let _onPerfilCargado = [];
    let _dbReady = false;

    const PATHS = {
        asociaciones: 'sistema/asociaciones',
        ajustes:      'sistema/ajustes',
    };

    // Datos JER por defecto (se siembran si Firebase está vacío)
    const JER_DEFAULT = {
        id: 'jer',
        nombre: 'Asociación J.E.R - Neiva',
        subtitulo: 'Neiva, Huila',
        logo_url: '',
        google_url: 'https://script.google.com/macros/s/AKfycbwvO5vg4wM9PdHc86IZM8FKcmoaSX7ls-4D-ZdbOVAFR6GUrRIHcXCq0rpQBDOVZvI/exec',
        password_admin: 'ZAN',
        password_formulario: '',   // vacío = acceso libre
        contratos: {
            '665': 'Contrato 41006652024',
            '667': 'Contrato 41006672024',
            '676': 'Contrato 41006762024',
        },
        colores_contratos: {
            '665': '#D97706',
            '667': '#2563EB',
            '676': '#059669',
        },
        modalidades_contratos: {
            '665': 'HCB',
            '667': 'HCB',
            '676': 'HCB',
        },
        regionales_contratos: {
            '665': 'Regional Neiva',
            '667': 'Regional Neiva',
            '676': 'Regional Neiva',
        },
        unidades: {
            '665': [
                {nombre:'ALEGRIA DE VIVIR',      codigo:'4100100115777'},
                {nombre:'LOS ANGELITOS',          codigo:'4100100041381'},
                {nombre:'LOS CARIÑOSITOS',        codigo:'4100100043894'},
                {nombre:'LOS CHUPETINES',         codigo:'4100100038177'},
                {nombre:'LOS DUMIS',              codigo:'4100100115770'},
                {nombre:'LOS JUGUETONES',         codigo:'4100100115796'},
                {nombre:'LOS PINGUINOS',          codigo:'4100100041027'},
                {nombre:'MAFALDA',                codigo:'4100100115757'},
                {nombre:'MIS 15 ANGELITOS',       codigo:'4100100041374'},
                {nombre:'MIS AMIGUITOS',          codigo:'4100100115793'},
                {nombre:'MIS ANGELITOS',          codigo:'410011123928'},
                {nombre:'MIS ANGELITOS',          codigo:'4100100115781'},
                {nombre:'MIS CAPULLOS',           codigo:'4100100040968'},
                {nombre:'MIS PEQUEÑOS GIGANTES',  codigo:'4100100040991'},
                {nombre:'MIS PEQUEÑOS PUPILOS',   codigo:'4100100115788'},
                {nombre:'MIS PEQUEÑOS SALTARINES',codigo:'4100100041008'},
                {nombre:'MIS PEQUEÑOS SALTARINES',codigo:'4100100047851'},
                {nombre:'NIÑOS FELICES',          codigo:'4100100041394'},
                {nombre:'PLUTO',                  codigo:'4100100115774'},
            ],
            '667': [
                {nombre:'BLANCA NIEVES',             codigo:'4100100078903'},
                {nombre:'CHIQUILLADAS',              codigo:'4100100120110'},
                {nombre:'DIAS FELICES',              codigo:'4100100023616'},
                {nombre:'LA RANA RENE',              codigo:'4100100120291'},
                {nombre:'LOS CHIQUITINES',           codigo:'4100100112390'},
                {nombre:'LOS EXPLORADORES',          codigo:'4100100023662'},
                {nombre:'LOS PITUFOS',               codigo:'4100100127770'},
                {nombre:'MI MUNDO FELIZ',            codigo:'4100100023780'},
                {nombre:'MI PEQUEÑO MUNDO',          codigo:'4100100023816'},
                {nombre:'MI PRIMER PASO',            codigo:'4100100045206'},
                {nombre:'MIS CHIQUITINES',           codigo:'4100100024111'},
                {nombre:'MIS PASTORCITOS',           codigo:'4100100023682'},
                {nombre:'MIS PATICOS',               codigo:'4100100023459'},
                {nombre:'MIS PEQUEÑOS ANGELITOS',    codigo:'4100100029904'},
                {nombre:'MIS PICARDIAS',             codigo:'4100100044836'},
                {nombre:'MIS PIRUETAS',              codigo:'4100100128106'},
                {nombre:'PEQUEÑOS GIGANTES',         codigo:'4100100120109'},
                {nombre:'SEMILLITAS',                codigo:'4100100024235'},
            ],
            '676': [
                {nombre:'ALEGRIA',                   codigo:'4100100085789'},
                {nombre:'BAMBIS 2',                  codigo:'4100100083331'},
                {nombre:'BAMBY',                     codigo:'4100100091036'},
                {nombre:'BURBUJITAS',                codigo:'4100100043041'},
                {nombre:'CASITA ENCANTADA',          codigo:'4100100085784'},
                {nombre:'HOGAR FELIZ',               codigo:'4100100085820'},
                {nombre:'LA PEQUEÑA LULU',           codigo:'4100100085809'},
                {nombre:'LOS ANGELITOS',             codigo:'4100100043056'},
                {nombre:'LOS CARIÑOSITOS',           codigo:'4100100091312'},
                {nombre:'LOS SIMPSONS',              codigo:'4100100041466'},
                {nombre:'MI PEQUEÑA CASITA',         codigo:'4100100085800'},
                {nombre:'MIS AMIGUITOS',             codigo:'4100100043065'},
                {nombre:'MIS CORAZONSITOS',          codigo:'4100100024142'},
                {nombre:'MIS OSITOS',                codigo:'4100100107660'},
                {nombre:'MIS PEQUEÑOS ANGELITOS',    codigo:'4100100115738'},
                {nombre:'PICAPIEDRAS',               codigo:'4100100043022'},
                {nombre:'SABIDURIA',                 codigo:'4100100085779'},
            ],
        },
        creadoEn: new Date().toISOString(),
    };

    // ── Esperar a que Firebase esté listo ──────────────────────
    function _getDB() {
        if (typeof database !== 'undefined') return database;
        throw new Error('Firebase no está inicializado aún.');
    }

    // ── Sembrar datos JER por defecto si no hay asociaciones ──
    async function _seedJERDefault() {
        const db = _getDB();
        const snap = await db.ref(PATHS.asociaciones).once('value');
        if (snap.val()) return; // ya hay datos

        console.log('[Asociaciones] Sembrando datos JER por defecto...');
        const { id, ...datos } = JER_DEFAULT;
        await db.ref(`${PATHS.asociaciones}/${id}`).set({
            ...datos,
            actualizadoEn: new Date().toISOString()
        });

        // Contraseña por defecto
        const passSnap = await db.ref(`${PATHS.ajustes}/password`).once('value');
        if (!passSnap.val()) {
            await db.ref(`${PATHS.ajustes}/password`).set('JER2024');
        }

        console.log('[Asociaciones] Datos JER sembrados ✅');
    }

    // ── Obtener ruta Firebase dinámica ─────────────────────────
    function getRef(tipo) {
        if (!_perfilActivo) {
            console.warn('[Asociaciones] Perfil no cargado. Fallback a ruta legacy.');
            return tipo;
        }
        const id = _perfilActivo.id;
        switch(tipo) {
            case 'novelties':     return `novedades_${id}`;
            case 'archived':      return `archivados_${id}`;
            case 'configBloqueo': return `config_${id}/bloqueo`;
            default:              return `${tipo}_${id}`;
        }
    }

    // ── Cargar asociaciones ───────────────────────────────────
    async function cargarAsociaciones() {
        const snap = await _getDB().ref(PATHS.asociaciones).once('value');
        return snap.val() || {};
    }

    async function guardarAsociacion(id, datos) {
        await _getDB().ref(`${PATHS.asociaciones}/${id}`).set(datos);
    }

    async function eliminarAsociacion(id) {
        await _getDB().ref(`${PATHS.asociaciones}/${id}`).remove();
    }

    async function obtenerPasswordAjustes() {
        const snap = await _getDB().ref(`${PATHS.ajustes}/password`).once('value');
        return snap.val() || 'JER2024';
    }

    async function guardarPasswordAjustes(nueva) {
        await _getDB().ref(`${PATHS.ajustes}/password`).set(nueva);
    }

    // ── Obtener / guardar contraseña admin de un perfil ───────
    async function obtenerPasswordAdmin(id) {
        const asocId = id || (_perfilActivo && _perfilActivo.id);
        if (!asocId) return 'ZAN';
        const snap = await _getDB().ref(`${PATHS.asociaciones}/${asocId}/password_admin`).once('value');
        return snap.val() || 'ZAN';
    }

    async function guardarPasswordAdmin(id, nueva) {
        await _getDB().ref(`${PATHS.asociaciones}/${id}/password_admin`).set(nueva);
        // Actualizar perfil en sesión si es el activo
        if (_perfilActivo && _perfilActivo.id === id) {
            _perfilActivo.password_admin = nueva;
            sessionStorage.setItem('asoc_data', JSON.stringify(_perfilActivo));
        }
    }

    // ── Contraseña formulario del perfil ─────────────────────
    async function obtenerPasswordFormulario(id) {
        const asocId = id || (_perfilActivo && _perfilActivo.id);
        if (!asocId) return '';
        const snap = await _getDB().ref(`${PATHS.asociaciones}/${asocId}/password_formulario`).once('value');
        return snap.val() || '';  // vacío = sin restricción
    }

    // ── Sesión formulario por perfil ──────────────────────────
    function isFormularioAutenticado() {
        const id = _perfilActivo && _perfilActivo.id;
        if (!id) return false;
        // Si no tiene clave de formulario configurada, acceso libre
        const clave = _perfilActivo.password_formulario;
        if (!clave || clave.trim() === '') return true;
        return sessionStorage.getItem(`form_auth_${id}`) === '1';
    }

    function marcarFormularioAutenticado() {
        const id = _perfilActivo && _perfilActivo.id;
        if (id) sessionStorage.setItem(`form_auth_${id}`, '1');
    }

    // ── Sesión admin por perfil ────────────────────────────────
    function isAdminAutenticado() {
        const id = _perfilActivo && _perfilActivo.id;
        if (!id) return false;
        return sessionStorage.getItem(`admin_auth_${id}`) === '1';
    }

    function marcarAdminAutenticado() {
        const id = _perfilActivo && _perfilActivo.id;
        if (id) sessionStorage.setItem(`admin_auth_${id}`, '1');
    }

    function cerrarSesionAdmin() {
        const id = _perfilActivo && _perfilActivo.id;
        if (id) sessionStorage.removeItem(`admin_auth_${id}`);
    }

    // ── Activar perfil ────────────────────────────────────────
    function activarPerfil(id, datos) {
        _perfilActivo = { id, ...datos };
        sessionStorage.setItem('asoc_id', id);
        sessionStorage.setItem('asoc_data', JSON.stringify(_perfilActivo));
        aplicarBranding(_perfilActivo);
        _onPerfilCargado.forEach(fn => { try { fn(_perfilActivo); } catch(e) {} });
    }

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

    function getPerfilActivo() { return _perfilActivo; }

    function onPerfilCargado(fn) {
        _onPerfilCargado.push(fn);
        if (_perfilActivo) { try { fn(_perfilActivo); } catch(e) {} }
    }

    // ── Branding dinámico ─────────────────────────────────────
    function aplicarBranding(perfil) {
        document.title = `Reporte Novedades | ${perfil.nombre || 'JER'}`;

        const el = (id) => document.getElementById(id);

        if (el('headerNombreAsoc')) el('headerNombreAsoc').textContent = perfil.nombre || '';
        if (el('adminNombreAsoc'))  el('adminNombreAsoc').textContent  = `🏢 ${perfil.nombre || perfil.id}`;
        if (el('indicadorPerfil'))  el('indicadorPerfil').textContent  = perfil.nombre || '';
        if (el('footerNombreAsoc')) el('footerNombreAsoc').textContent = perfil.subtitulo ? `${perfil.nombre} - ${perfil.subtitulo}` : (perfil.nombre || 'Asociación JER');

        const logo = el('logoAsociacion');
        if (logo) logo.src = perfil.logo_url || 'LOGOJER.png';

        const form = el('noveltyForm');
        if (form && perfil.google_url) form.action = perfil.google_url;

        _poblarContratos(perfil);
        _inyectarEstilosContratos(perfil);
        _actualizarUDSData(perfil);
        _poblarRegionales(perfil);
    }

    // ── Inyectar CSS dinámico de colores de contratos ────────
    function _inyectarEstilosContratos(perfil) {
        // Eliminar estilos previos
        const previo = document.getElementById('estilos-contratos-dinamicos');
        if (previo) previo.remove();

        const colores = perfil.colores_contratos || {};
        const contratos = Object.keys(perfil.contratos || {});

        // Paleta de fallback si no tiene color configurado
        const fallback = ['#D97706','#2563EB','#059669','#E91E63','#9C27B0','#FF5722'];

        let css = '';
        contratos.forEach((cod, i) => {
            const color = colores[cod] || fallback[i % fallback.length];
            css += `
            .contract-${cod} .dynamic-bg { background-color: ${color}; }
            .contract-${cod} .dynamic-text { color: ${color}; }
            .contract-${cod} .dynamic-border { border-top-color: ${color}; }`;
        });

        const style = document.createElement('style');
        style.id = 'estilos-contratos-dinamicos';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function _poblarContratos(perfil) {
        const contratos = perfil.contratos || {};
        const ids = ['contractNumber','filterContract','filterContractArchivados'];
        ids.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const val = sel.value;
            const label = id === 'contractNumber' ? 'Seleccione...' : 'Todos los contratos';
            sel.innerHTML = `<option value="">${label}</option>`;
            Object.entries(contratos).forEach(([cod, etiqueta]) => {
                const opt = document.createElement('option');
                opt.value = cod;
                opt.textContent = etiqueta || `Contrato ${cod}`;
                sel.appendChild(opt);
            });
            if (val) sel.value = val;
        });
    }

    function _actualizarUDSData(perfil) {
        const unidades = perfil.unidades || {};
        const nuevoUDS = {};
        Object.entries(unidades).forEach(([contrato, lista]) => {
            if (Array.isArray(lista)) {
                nuevoUDS[contrato] = lista.map(u =>
                    Array.isArray(u) ? u : [u.nombre || '', u.codigo || '']
                );
            } else if (lista && typeof lista === 'object') {
                nuevoUDS[contrato] = Object.values(lista).map(u => [u.nombre || '', u.codigo || '']);
            }
        });
        window.UDS_DATA              = nuevoUDS;
        window.MODALIDADES_CONTRATOS = perfil.modalidades_contratos || {};
        window.REGIONALES_CONTRATOS  = perfil.regionales_contratos  || {};
        window.COLORES_CONTRATOS     = perfil.colores_contratos      || {};
    }

    // ── Poblar select de Regional ─────────────────────────────
    function _poblarRegionales(perfil) {
        // Obtener regionales únicas de los contratos configurados
        const regionales = [...new Set(Object.values(perfil.regionales_contratos || {}))];
        const sel = document.getElementById('regionalSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccione...</option>';
        regionales.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = r;
            sel.appendChild(opt);
        });
        // También poblar filtros del admin
        ['filterRegional','filterRegionalArchivados'].forEach(id => {
            const f = document.getElementById(id);
            if (!f) return;
            f.innerHTML = '<option value="">Todas las regionales</option>';
            regionales.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r; opt.textContent = r;
                f.appendChild(opt);
            });
        });
    }

    // ── Modal selector ────────────────────────────────────────
    async function mostrarSelectorAsociaciones() {
        const modal = document.getElementById('modalSelectorAsociacion');
        const grid  = document.getElementById('gridAsociaciones');
        if (!modal || !grid) return;

        modal.style.display = 'flex';
        grid.innerHTML = '<div class="asoc-loading">⏳ Cargando asociaciones...</div>';

        try {
            const asociaciones = await cargarAsociaciones();
            const lista = Object.entries(asociaciones);

            if (lista.length === 0) {
                grid.innerHTML = `<div class="asoc-empty">
                    <div style="font-size:2.5rem">🏢</div>
                    <p>No hay asociaciones configuradas.</p>
                    <p style="font-size:12px;color:#94a3b8">Usa el Panel de Ajustes para crear la primera.</p>
                </div>`;
                return;
            }

            const PALETTE = [
                { color: '#3b82f6', bg: '#eff6ff' },
                { color: '#10b981', bg: '#ecfdf5' },
                { color: '#f59e0b', bg: '#fffbeb' },
                { color: '#8b5cf6', bg: '#f5f3ff' },
                { color: '#ef4444', bg: '#fef2f2' },
                { color: '#06b6d4', bg: '#ecfeff' },
            ];

            grid.innerHTML = '';
            lista.forEach(([id, datos], i) => {
                // Color: primer contrato si tiene color, o paleta por índice
                const colores = datos.colores_contratos || {};
                const primerCodigo = Object.keys(datos.contratos || {})[0];
                const palette = PALETTE[i % PALETTE.length];
                const color = (primerCodigo && colores[primerCodigo]) || palette.color;
                const bg    = palette.bg;

                const card = document.createElement('button');
                card.className = 'asoc-card';
                card.style.setProperty('--asoc-color', color);
                card.style.setProperty('--asoc-bg',    bg);
                card.onclick = () => AsociacionesModule.seleccionarAsociacion(id);

                const numContratos = Object.keys(datos.contratos || {}).length;
                const ubicacion    = datos.subtitulo || '';
                const tieneImg     = !!datos.logo_url;

                card.innerHTML = `
                    <div class="asoc-card-logo-wrap">
                        ${tieneImg
                            ? `<img src="${datos.logo_url}" alt="${datos.nombre}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                            : ''}
                        <div class="asoc-card-logo-fallback" style="${tieneImg ? 'display:none' : ''}">🏢</div>
                    </div>
                    <div class="asoc-card-nombre">${datos.nombre || id}</div>
                    ${ubicacion ? `
                    <div class="asoc-card-ubicacion">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${ubicacion}
                    </div>` : ''}
                    <div class="asoc-card-contratos-wrap">
                        <div class="asoc-card-contratos-icon">📄</div>
                        <div>
                            <div class="asoc-card-contratos-label">Contratos activos</div>
                            <div class="asoc-card-contratos-value">${numContratos} contrato${numContratos !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    ${datos.password_formulario ? '<div class="asoc-card-lock">🔑 Requiere clave de acceso</div>' : ''}
                    <div class="asoc-card-btn">
                        Seleccionar
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch(e) {
            grid.innerHTML = `<div class="asoc-empty">❌ Error al cargar asociaciones.<br><small>${e.message}</small></div>`;
        }
    }

    async function seleccionarAsociacion(id) {
        try {
            const snap = await _getDB().ref(`${PATHS.asociaciones}/${id}`).once('value');
            const datos = snap.val();
            if (!datos) { showToast('Asociación no encontrada', 'error'); return; }

            // Si tiene clave de formulario, pedirla antes de activar el perfil
            const clave = datos.password_formulario || '';
            if (clave.trim() !== '') {
                const ingresada = prompt(`🔑 Clave de acceso\n${datos.nombre}`);
                if (ingresada === null) return; // canceló
                if (ingresada !== clave) {
                    showToast('❌ Clave incorrecta', 'error');
                    return;
                }
                // Marcar sesión de formulario
                sessionStorage.setItem(`form_auth_${id}`, '1');
            }

            activarPerfil(id, datos);
            const modal = document.getElementById('modalSelectorAsociacion');
            if (modal) modal.style.display = 'none';
            showToast(`✅ Perfil: ${datos.nombre}`, 'success');
        } catch(e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    function cerrarSelectorAsociacion() {
        if (!_perfilActivo) {
            showToast('Debes seleccionar una asociación para continuar', 'warning');
            return;
        }
        const modal = document.getElementById('modalSelectorAsociacion');
        if (modal) modal.style.display = 'none';
    }

    function cambiarAsociacion() {
        // Cerrar sesión admin del perfil actual antes de cambiar
        cerrarSesionAdmin();
        // Cerrar panel admin si está abierto
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.style.display = 'none';
        sessionStorage.removeItem('asoc_id');
        sessionStorage.removeItem('asoc_data');
        _perfilActivo = null;
        // Resetear fondo y tema a gris neutro
        document.body.style.background = '';
        const mainCard = document.getElementById('mainCard');
        if (mainCard) {
            mainCard.className = mainCard.className.replace(/contract-\S+/g, '').trim();
        }
        const indicator = document.getElementById('contractIndicator');
        if (indicator) {
            indicator.className = 'px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-slate-400 uppercase whitespace-nowrap';
            indicator.textContent = 'Sin Contrato';
        }
        const contractSel = document.getElementById('contractNumber');
        if (contractSel) contractSel.value = '';
        // Eliminar estilos dinámicos de contratos
        const estilos = document.getElementById('estilos-contratos-dinamicos');
        if (estilos) estilos.remove();
        mostrarSelectorAsociaciones();
    }

    // ── Inicializar ───────────────────────────────────────────
    async function init() {
        // Esperar a que Firebase esté disponible (máx 5 segundos)
        let intentos = 0;
        while (typeof database === 'undefined' && intentos < 50) {
            await new Promise(r => setTimeout(r, 100));
            intentos++;
        }
        if (typeof database === 'undefined') {
            console.error('[Asociaciones] Firebase no disponible tras 5s');
            const grid = document.getElementById('gridAsociaciones');
            if (grid) grid.innerHTML = '<div class="asoc-empty">❌ Error de conexión con Firebase.</div>';
            return;
        }

        // Sembrar datos JER si es primera vez
        try { await _seedJERDefault(); } catch(e) { console.warn('Seed error:', e); }

        // Si ya hay perfil en sesión, usarlo
        if (recuperarPerfilDeSesion()) return;

        // Mostrar selector
        await mostrarSelectorAsociaciones();
    }

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
        obtenerPasswordAdmin,
        guardarPasswordAdmin,
        obtenerPasswordFormulario,
        isFormularioAutenticado,
        marcarFormularioAutenticado,
        isAdminAutenticado,
        marcarAdminAutenticado,
        cerrarSesionAdmin,
        activarPerfil,
        seleccionarAsociacion,
        cerrarSelectorAsociacion,
        cambiarAsociacion,
        mostrarSelectorAsociaciones,
    };
})();