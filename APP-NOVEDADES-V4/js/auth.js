// ============================================================
// AUTH.JS — Módulo de autenticación (SOLO usado en index.html)
// ------------------------------------------------------------
// Maneja login / registro / recuperación / cambio de contraseña
// usando Firebase Authentication (correo + contraseña).
//
// Modelo de datos en Realtime Database:
//   sistema/usuarios/{uid}/email        -> correo del usuario
//   sistema/usuarios/{uid}/nombre       -> nombre (opcional)
//   sistema/usuarios/{uid}/operadores/{operadorId} -> true
//
// Un mismo usuario (mismo correo + contraseña) puede quedar
// vinculado a VARIOS operadores: si se "registra" de nuevo con
// el mismo correo/contraseña pero eligiendo otro operador, no
// se crea una cuenta nueva — se valida que sea la misma persona
// (reautenticando) y simplemente se agrega el nuevo operador a
// su lista de accesos.
// ============================================================

const AuthModule = (() => {

    let _user = null;                 // objeto de usuario de Firebase Auth
    let _operadoresPermitidos = [];   // ['t3', 'florida', ...]
    let _listo = false;
    let _callbacks = [];

    // ── Helpers internos ───────────────────────────────────────
    function _getAuth() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            throw new Error('Firebase Authentication no está disponible.');
        }
        return firebase.auth();
    }

    function _getDB() {
        if (typeof database === 'undefined') {
            throw new Error('Firebase Database no está disponible.');
        }
        return database;
    }

    function _traducirError(codigo, fallback) {
        const MAPA = {
            'auth/invalid-email':          'El correo no es válido.',
            'auth/user-disabled':          'Esta cuenta fue deshabilitada.',
            'auth/user-not-found':         'No existe una cuenta con ese correo.',
            'auth/wrong-password':         'Contraseña incorrecta.',
            'auth/invalid-credential':     'Correo o contraseña incorrectos.',
            'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
            'auth/email-already-in-use':   'Ese correo ya está en uso.',
            'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
            'auth/too-many-requests':      'Demasiados intentos. Intenta de nuevo en unos minutos.',
            'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
            'auth/requires-recent-login':  'Por seguridad, vuelve a iniciar sesión antes de repetir esta acción.',
        };
        return MAPA[codigo] || fallback || 'Ocurrió un error inesperado.';
    }

    async function _cargarOperadoresPermitidos(uid) {
        try {
            const snap = await _getDB().ref(`sistema/usuarios/${uid}/operadores`).once('value');
            const val = snap.val() || {};
            return Object.keys(val).filter(k => !!val[k]);
        } catch (e) {
            console.error('[Auth] Error cargando operadores del usuario:', e);
            return [];
        }
    }

    // ── Estado público ──────────────────────────────────────────
    function estaLogeado() { return !!_user; }
    function getUsuario()  { return _user; }
    function getOperadoresPermitidos() { return _operadoresPermitidos.slice(); }
    function tieneAccesoA(operadorId) {
        return !!operadorId && _operadoresPermitidos.includes(operadorId);
    }

    // ── Login ────────────────────────────────────────────────────
    async function login(email, password) {
        email = (email || '').trim();
        if (!email || !password) throw new Error('Completa correo y contraseña.');
        try {
            const cred = await _getAuth().signInWithEmailAndPassword(email, password);
            return cred.user;
        } catch (e) {
            throw new Error(_traducirError(e.code, e.message));
        }
    }

    // ── Registro (crea cuenta o vincula un operador más) ────────
    async function registrar({ email, password, operadorId, nombre }) {
        email = (email || '').trim();
        if (!email || !password) throw new Error('Completa correo y contraseña.');
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (!operadorId) throw new Error('Selecciona el operador para el que te registras.');

        let uid;
        let cuentaNueva = true;

        try {
            const cred = await _getAuth().createUserWithEmailAndPassword(email, password);
            uid = cred.user.uid;
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                // Puede ser la misma persona agregando otro operador.
                // Verificamos identidad reautenticando con esas credenciales.
                try {
                    const cred2 = await _getAuth().signInWithEmailAndPassword(email, password);
                    uid = cred2.user.uid;
                    cuentaNueva = false;
                } catch (e2) {
                    throw new Error('Ese correo ya está registrado con una contraseña distinta. Inicia sesión en su lugar.');
                }
            } else {
                throw new Error(_traducirError(e.code, e.message));
            }
        }

        const refUsuario = _getDB().ref(`sistema/usuarios/${uid}`);
        const refOperador = refUsuario.child(`operadores/${operadorId}`);

        const yaTeniaEsteOperador = !!(await refOperador.once('value')).val();

        await refUsuario.update({
            email: email,
            nombre: (nombre || '').trim(),
            actualizadoEn: new Date().toISOString(),
        });
        await refOperador.set(true);

        _operadoresPermitidos = await _cargarOperadoresPermitidos(uid);

        return { uid, cuentaNueva, operadorYaVinculado: yaTeniaEsteOperador };
    }

    // ── Recuperar contraseña (correo real vía Firebase) ─────────
    async function recuperarPassword(email) {
        email = (email || '').trim();
        if (!email) throw new Error('Ingresa tu correo.');
        try {
            await _getAuth().sendPasswordResetEmail(email);
        } catch (e) {
            throw new Error(_traducirError(e.code, e.message));
        }
    }

    // ── Cambiar contraseña (usuario ya logeado) ──────────────────
    async function cambiarPassword(passwordActual, passwordNueva) {
        const user = _getAuth().currentUser;
        if (!user) throw new Error('No hay una sesión activa.');
        if (!passwordNueva || passwordNueva.length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
        }
        try {
            const cred = firebase.auth.EmailAuthProvider.credential(user.email, passwordActual);
            await user.reauthenticateWithCredential(cred);
            await user.updatePassword(passwordNueva);
        } catch (e) {
            throw new Error(_traducirError(e.code, e.message));
        }
    }

    // ── Cerrar sesión ─────────────────────────────────────────────
    async function logout() {
        await _getAuth().signOut();
    }

    // ── Ciclo de vida ────────────────────────────────────────────
    function onAuthReady(fn) {
        _callbacks.push(fn);
        if (_listo) { try { fn(_user, _operadoresPermitidos.slice()); } catch (e) {} }
    }

    function init() {
        let _uidAnterior = undefined; // 'undefined' = todavía no se resolvió ningún estado
        return new Promise((resolve) => {
            _getAuth().onAuthStateChanged(async (user) => {
                const uidNuevo = user ? user.uid : null;
                // Firebase dispara este evento también en refrescos silenciosos
                // de token (misma sesión). Solo notificamos a la UI cuando
                // realmente cambia quién está logeado (login/logout real),
                // para no reabrir el selector de operadores en medio del uso.
                const esCambioReal = (uidNuevo !== _uidAnterior);
                _uidAnterior = uidNuevo;

                _user = user;
                _operadoresPermitidos = user ? await _cargarOperadoresPermitidos(user.uid) : [];

                if (!_listo) {
                    _listo = true;
                    resolve(_user);
                }
                if (esCambioReal) {
                    _callbacks.forEach(fn => { try { fn(_user, _operadoresPermitidos.slice()); } catch (e) {} });
                }
            });
        });
    }

    return {
        init,
        onAuthReady,
        login,
        registrar,
        recuperarPassword,
        cambiarPassword,
        logout,
        estaLogeado,
        getUsuario,
        getOperadoresPermitidos,
        tieneAccesoA,
    };
})();
