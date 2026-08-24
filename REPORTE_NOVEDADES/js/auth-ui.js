// ============================================================
// AUTH-UI.JS — Interfaz del portal de acceso (solo index.html)
// Controla las pestañas Login / Registro / Recuperar, valida
// los formularios y decide cuándo mostrar la app real.
// ============================================================

const AuthUI = (() => {

    let _operadoresCache = null; // {id: datos}

    // ── Helpers de DOM ──────────────────────────────────────────
    const $ = (id) => document.getElementById(id);

    function _mostrarMensaje(elId, texto, tipo) {
        const el = $(elId);
        if (!el) return;
        el.textContent = texto || '';
        el.className = 'auth-msg' + (texto ? ` auth-msg-${tipo || 'error'}` : '');
        el.style.display = texto ? 'block' : 'none';
    }

    function _limpiarMensajes() {
        ['authLoginMsg', 'authRegistroMsg', 'authRecuperarMsg'].forEach(id => _mostrarMensaje(id, ''));
    }

    function _setCargando(btnId, cargando, textoNormal, textoCargando) {
        const btn = $(btnId);
        if (!btn) return;
        btn.disabled = cargando;
        btn.textContent = cargando ? (textoCargando || 'Procesando...') : textoNormal;
    }

    // ── Cambiar de vista (login / registro / recuperar) ──────────
    function mostrarVista(vista) {
        _limpiarMensajes();
        ['authViewLogin', 'authViewRegistro', 'authViewRecuperar'].forEach(id => {
            const el = $(id);
            if (el) el.style.display = 'none';
        });
        const activa = $(`authView${vista.charAt(0).toUpperCase()}${vista.slice(1)}`);
        if (activa) activa.style.display = 'block';

        const btnLogin = $('authTabBtnLogin');
        const btnRegistro = $('authTabBtnRegistro');
        if (btnLogin)    btnLogin.classList.toggle('active', vista === 'login');
        if (btnRegistro) btnRegistro.classList.toggle('active', vista === 'registro');

        if (vista === 'registro') _poblarSelectorOperadores();
    }

    // ── Poblar el <select> de operadores en el registro ──────────
    async function _poblarSelectorOperadores() {
        const sel = $('authRegistroOperador');
        if (!sel) return;
        if (_operadoresCache) { _renderOpciones(sel); return; }

        sel.innerHTML = '<option value="">Cargando operadores...</option>';
        try {
            _operadoresCache = await AsociacionesModule.cargarAsociaciones();
            _renderOpciones(sel);
        } catch (e) {
            sel.innerHTML = '<option value="">Error al cargar operadores</option>';
        }
    }

    function _renderOpciones(sel) {
        const entradas = Object.entries(_operadoresCache || {});
        if (entradas.length === 0) {
            sel.innerHTML = '<option value="">No hay operadores configurados</option>';
            return;
        }
        sel.innerHTML = '<option value="">Selecciona tu operador...</option>' +
            entradas.map(([id, datos]) => `<option value="${id}">${datos.nombre || id}</option>`).join('');
    }

    // ── Mostrar / ocultar el portal completo ─────────────────────
    function mostrarPortal() {
        const overlay = $('authGateOverlay');
        if (overlay) overlay.style.display = 'flex';
        mostrarVista('login');
    }

    function ocultarPortal() {
        const overlay = $('authGateOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ── Acciones ───────────────────────────────────────────────
    async function iniciarSesion() {
        _limpiarMensajes();
        const email = ($('authLoginEmail') || {}).value || '';
        const pass  = ($('authLoginPassword') || {}).value || '';

        _setCargando('authLoginBtn', true, 'Ingresar', 'Ingresando...');
        try {
            // No hace falta llamar a _entrarAlSistema() aquí: el login
            // dispara onAuthStateChanged, que ya está escuchado desde
            // AuthUI.init() y se encarga de entrar al sistema.
            await AuthModule.login(email, pass);
        } catch (e) {
            _mostrarMensaje('authLoginMsg', e.message, 'error');
            _setCargando('authLoginBtn', false, 'Ingresar');
        }
    }

    async function registrarse() {
        _limpiarMensajes();
        const nombre   = ($('authRegistroNombre') || {}).value || '';
        const email    = ($('authRegistroEmail') || {}).value || '';
        const pass     = ($('authRegistroPassword') || {}).value || '';
        const pass2    = ($('authRegistroPassword2') || {}).value || '';
        const operador = ($('authRegistroOperador') || {}).value || '';

        if (pass !== pass2) {
            _mostrarMensaje('authRegistroMsg', 'Las contraseñas no coinciden.', 'error');
            return;
        }

        _setCargando('authRegistroBtn', true, 'Crear cuenta', 'Creando...');
        try {
            // El listener de onAuthStateChanged (registrado en AuthUI.init())
            // se encarga de entrar al sistema una vez la cuenta queda activa.
            const resultado = await AuthModule.registrar({ email, password: pass, operadorId: operador, nombre });
            if (resultado.operadorYaVinculado) {
                _mostrarMensaje('authRegistroMsg', 'Ya tenías acceso a ese operador. Iniciando sesión...', 'success');
            }
        } catch (e) {
            _mostrarMensaje('authRegistroMsg', e.message, 'error');
            _setCargando('authRegistroBtn', false, 'Crear cuenta');
        }
    }

    async function enviarRecuperacion() {
        _limpiarMensajes();
        const email = ($('authRecuperarEmail') || {}).value || '';
        _setCargando('authRecuperarBtn', true, 'Enviar enlace', 'Enviando...');
        try {
            await AuthModule.recuperarPassword(email);
            _mostrarMensaje('authRecuperarMsg', '✅ Te enviamos un correo con el enlace para restablecer tu contraseña.', 'success');
        } catch (e) {
            _mostrarMensaje('authRecuperarMsg', e.message, 'error');
        } finally {
            _setCargando('authRecuperarBtn', false, 'Enviar enlace');
        }
    }

    async function _entrarAlSistema() {
        ocultarPortal();
        await AsociacionesModule.init();
    }

    // ── Cerrar sesión desde dentro de la app ─────────────────────
    async function cerrarSesion() {
        if (!confirm('¿Cerrar tu sesión?')) return;
        try {
            await AuthModule.logout();
        } catch (e) {}
        sessionStorage.removeItem('asoc_id');
        sessionStorage.removeItem('asoc_data');
        location.reload();
    }

    // ── Modal "Cambiar mi contraseña" ────────────────────────────
    function abrirCambiarPasswordUsuario() {
        const overlay = $('cambiarPassUsuarioOverlay');
        if (!overlay) return;
        ['cambiarPassUsuarioActual', 'cambiarPassUsuarioNueva', 'cambiarPassUsuarioNueva2'].forEach(id => {
            const el = $(id);
            if (el) el.value = '';
        });
        _mostrarMensaje('cambiarPassUsuarioMsg', '');
        overlay.style.display = 'flex';
    }

    function cerrarCambiarPasswordUsuario() {
        const overlay = $('cambiarPassUsuarioOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    async function confirmarCambiarPasswordUsuario() {
        _mostrarMensaje('cambiarPassUsuarioMsg', '');
        const actual = ($('cambiarPassUsuarioActual') || {}).value || '';
        const nueva  = ($('cambiarPassUsuarioNueva') || {}).value || '';
        const nueva2 = ($('cambiarPassUsuarioNueva2') || {}).value || '';

        if (!actual) { _mostrarMensaje('cambiarPassUsuarioMsg', 'Ingresa tu contraseña actual.', 'error'); return; }
        if (nueva !== nueva2) { _mostrarMensaje('cambiarPassUsuarioMsg', 'Las contraseñas nuevas no coinciden.', 'error'); return; }

        _setCargando('cambiarPassUsuarioBtn', true, 'Guardar', 'Guardando...');
        try {
            await AuthModule.cambiarPassword(actual, nueva);
            _mostrarMensaje('cambiarPassUsuarioMsg', '✅ Contraseña actualizada.', 'success');
            setTimeout(cerrarCambiarPasswordUsuario, 1200);
        } catch (e) {
            _mostrarMensaje('cambiarPassUsuarioMsg', e.message, 'error');
        } finally {
            _setCargando('cambiarPassUsuarioBtn', false, 'Guardar');
        }
    }

    // ── Inicialización general ────────────────────────────────────
    async function init() {
        await AuthModule.onAuthReady(async (user) => {
            if (user) {
                await _entrarAlSistema();
            } else {
                mostrarPortal();
            }
        });
    }

    return {
        init,
        mostrarVista,
        iniciarSesion,
        registrarse,
        enviarRecuperacion,
        cerrarSesion,
        abrirCambiarPasswordUsuario,
        cerrarCambiarPasswordUsuario,
        confirmarCambiarPasswordUsuario,
    };
})();
