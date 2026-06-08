// ==================== AUTH + USUARIOS ====================
//  AUTH SYSTEM - Login / Register / User State
// ═══════════════════════════════════════════════════════════════════

function initAuthUI() {
    showLoginOverlay();
}

function showLoginOverlay() {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('auth-form-login').style.display = 'block';
    document.getElementById('auth-form-register').style.display = 'none';
}

function hideLoginOverlay() {
    document.getElementById('auth-overlay').style.display = 'none';
}

function switchAuthTab(tab) {
    const forms = ['login', 'register', 'recover', 'change'];
    forms.forEach(f => {
        const el = document.getElementById('auth-form-' + f);
        if (el) el.style.display = (f === tab) ? 'block' : 'none';
    });
    clearAuthErrors();
    const recoverMsg = document.getElementById('auth-error-recover');
    const changeMsg  = document.getElementById('auth-error-change');
    if (recoverMsg) recoverMsg.textContent = '';
    if (changeMsg)  changeMsg.textContent  = '';
}

function clearAuthErrors() {
    const ids = ['auth-error-login','auth-error-register','auth-error-recover','auth-error-change'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}

function showAuthError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.color = '#ef4444'; }
}

// ── Toggle ver/ocultar contraseña ──────────────────────────────────
function togglePasswordVisibility(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.title = 'Ocultar contraseña';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
        btn.title = 'Ver contraseña';
    }
}

// ── Validar formato de email real ──────────────────────────────────
function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// Convierte un usuario/email al email usado en Firebase Auth.
// Si ya es un email real (@dominio.tld) lo usa directo.
// Si no (usuario interno) convierte a usuario@app.local (solo para login retrocompatible).
function usuarioAEmail(usuario) {
    const v = usuario.trim();
    if (esEmailValido(v)) return v.toLowerCase();
    const limpio = v.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return limpio + '@app.local';
}

async function doLogin() {
    const usuario = document.getElementById('auth-email-login').value.trim();
    const pass    = document.getElementById('auth-pass-login').value;
    if (!usuario || !pass) { showAuthError('auth-error-login','Completa todos los campos'); return; }
    const email = usuarioAEmail(usuario);
    const btn = document.getElementById('auth-btn-login');
    btn.disabled = true; btn.textContent = 'Ingresando...';
    try {
        const userCred = await window.firebaseSignIn(window.firebaseAuth, email, pass);
        let ipLogin = 'desconocida';
        try {
            const ipResp2 = await fetch('https://api.ipify.org?format=json');
            const ipData2 = await ipResp2.json();
            ipLogin = ipData2.ip || 'desconocida';
        } catch(e2) {}
        const nombreLogin = userCred.user.displayName || usuario;
        registrarIPUsuario(ipLogin, nombreLogin, userCred.user.uid, 'login');
    } catch(e) {
        let msg = 'Usuario o clave incorrectos';
        if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'Usuario o clave incorrectos';
        else if (e.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
        else if (e.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Intente más tarde';
        showAuthError('auth-error-login', msg);
    }
    btn.disabled = false; btn.textContent = 'Ingresar';
}

async function doRegister() {
    const nombre   = document.getElementById('auth-nombre-register').value.trim();
    const correo   = document.getElementById('auth-email-register').value.trim();    // correo real
    const usuario  = document.getElementById('auth-usuario-register').value.trim();  // nombre de usuario opcional
    const pass     = document.getElementById('auth-pass-register').value;
    const pass2    = document.getElementById('auth-pass-register2').value;

    if (!nombre || !correo || !pass) {
        showAuthError('auth-error-register','Completa todos los campos obligatorios'); return;
    }
    if (!esEmailValido(correo)) {
        showAuthError('auth-error-register','Ingresa un correo electrónico válido (ej: tu@correo.com)'); return;
    }
    if (pass !== pass2) {
        showAuthError('auth-error-register','Las claves no coinciden'); return;
    }
    if (pass.length < 6) {
        showAuthError('auth-error-register','La clave debe tener al menos 6 caracteres'); return;
    }

    // El email de Firebase Auth ES el correo real
    const email = correo.toLowerCase();
    // El campo "usuario" es un alias visible; si no se ingresa se usa el correo
    const usuarioFinal = usuario || email.split('@')[0];

    const btn = document.getElementById('auth-btn-register');
    btn.disabled = true; btn.textContent = 'Creando cuenta...';
    try {
        const cred = await window.firebaseCreateUser(window.firebaseAuth, email, pass);
        await window.firebaseUpdateProfile(cred.user, { displayName: nombre });
        const uid = cred.user.uid;

        let ipUsuario = 'desconocida';
        try {
            const ipResp = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResp.json();
            ipUsuario = ipData.ip || 'desconocida';
        } catch(ipErr) {}

        const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid);
        await window.firebaseSet(userRef, {
            nombre:        nombre,
            usuario:       usuarioFinal,
            email:         email,
            // NOTA DE SEGURIDAD: guardar la contraseña en texto plano en la DB
            // es solo para que el admin la vea en el panel. Nunca expongas esto
            // en una app de producción pública.
            contrasena:    pass,
            rol:           'usuario',
            creadoEn:      new Date().toISOString(),
            ultimoIngreso: new Date().toISOString(),
            ipRegistro:    ipUsuario
        });
        registrarIPUsuario(ipUsuario, nombre, uid, 'registro');
        logUserLogin(uid, nombre, email, ipUsuario);
    } catch(e) {
        let msg = 'Error al crear cuenta';
        if (e.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado';
        else if (e.code === 'auth/invalid-email')   msg = 'Correo electrónico inválido';
        else if (e.code === 'auth/weak-password')   msg = 'La clave es muy débil';
        showAuthError('auth-error-register', msg);
    }
    btn.disabled = false; btn.textContent = 'Crear cuenta';
}

async function doLogout() {
    try { await window.firebaseSignOut(window.firebaseAuth); } catch(e) { console.error(e); }
}

function logUserLogin(uid, nombre, email, ip) {
    try {
        const logRef = window.firebaseRef(window.firebaseDB, 'user_logins/' + Date.now() + '_' + uid.substring(0,8));
        window.firebaseSet(logRef, {
            uid,
            nombre: nombre || 'Sin nombre',
            email:  email  || '',
            ip:     ip     || 'desconocida',
            timestamp: new Date().toISOString(),
            fecha: new Date().toLocaleDateString('es-CO'),
            hora:  new Date().toLocaleTimeString('es-CO')
        });
        const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid + '/ultimoIngreso');
        window.firebaseSet(userRef, new Date().toISOString());
    } catch(e) { console.error('Error logging login', e); }
}

function registrarIPUsuario(ip, nombre, uid, evento) {
    if (!ip || ip === 'desconocida' || !window.firebaseDB) return;
    try {
        const ipKey = ip.replace(/\./g, '-');
        const ipRef = window.firebaseRef(window.firebaseDB, 'ips_usuarios/' + ipKey);
        window.firebaseGet(ipRef).then(snap => {
            const existing = snap.exists() ? snap.val() : {};
            const entry = {
                ip,
                apodo:        nombre      || existing.apodo || 'Sin nombre',
                uid:          uid         || existing.uid   || '',
                ultimoEvento: evento      || 'acceso',
                ultimaVez:    new Date().toISOString(),
                accesos:      (existing.accesos || 0) + 1,
                primeraVez:   existing.primeraVez || new Date().toISOString()
            };
            window.firebaseSet(ipRef, entry);
        }).catch(e => console.error('Error ips_usuarios get', e));
    } catch(e) { console.error('Error registrarIPUsuario', e); }
}

function onUserLoggedIn(user) {
    hideLoginOverlay();
    setDirStorageKeyForUser(user.uid);
    const displayName = user.displayName || user.email || 'Usuario';
    document.getElementById('user-display-name').textContent = displayName;
    document.getElementById('user-avatar-letter').textContent = displayName.charAt(0).toUpperCase();
    document.getElementById('user-info-bar').style.display = 'flex';
    fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => {
            const ip = d.ip || 'desconocida';
            logUserLogin(user.uid, user.displayName, user.email, ip);
            registrarIPUsuario(ip, user.displayName || user.email, user.uid, 'login');
        })
        .catch(() => logUserLogin(user.uid, user.displayName, user.email, 'desconocida'));
    loadUserDirectories(user.uid);
    loadUserProveedores(user.uid);
    loadUserSavedLists(user.uid);
}

function onUserLoggedOut() {
    showLoginOverlay();
    document.getElementById('user-info-bar').style.display = 'none';
    try { tabSaveDirectoriosGuardados({}); tabRefreshSelect(); } catch(e) {}
    try { savedLists = []; updateSavedCount(); showSavedLists(); } catch(e) {}
    try { provSaveAllLocal([]); provRenderizar(); } catch(e) {}
    resetStorageKeysToAnon();
}

function loadUserDirectories(uid) {
    try {
        const dirRef = window.firebaseRef(window.firebaseDB, 'user_dirs/' + uid);
        window.firebaseOnValue(dirRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                tabSaveDirectoriosGuardados(data);
                tabRefreshSelect();
                tabRenderizarDirectorio();
            } else {
                tabSaveDirectoriosGuardados({});
                tabRefreshSelect();
            }
        }, { onlyOnce: true });
    } catch(e) { console.error('Error loading user dirs', e); }
}

function provSaveAllLocal(arr) {
    localStorage.setItem(PROVEEDORES_STORAGE_KEY, JSON.stringify(arr));
}

function loadUserProveedores(uid) {
    try {
        const ref = window.firebaseRef(window.firebaseDB, 'user_proveedores/' + uid);
        window.firebaseOnValue(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const arr = Array.isArray(data) ? data : Object.values(data);
                provSaveAllLocal(arr);
            } else {
                provSaveAllLocal([]);
            }
            try { provRenderizar(); provRefreshSelectDirectorio(); } catch(e) {}
        }, { onlyOnce: true });
    } catch(e) { console.error('Error loading user proveedores', e); }
}

function loadUserSavedLists(uid) {
    try {
        const ref = window.firebaseRef(window.firebaseDB, 'user_savedlists/' + uid);
        window.firebaseOnValue(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                savedLists = Array.isArray(data) ? data : Object.values(data);
            } else {
                savedLists = [];
            }
            localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
            try { updateSavedCount(); showSavedLists(); } catch(e) {}
        }, { onlyOnce: true });
    } catch(e) { console.error('Error loading user savedLists', e); }
}

const _origTabSave = typeof tabSaveDirectoriosGuardados === 'function' ? tabSaveDirectoriosGuardados : null;

// ═══════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════

function abrirAdmin() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        setupAuditoriaListener();
        sincronizarPendientes();
        cargarRegistrosAdmin();
        cargarListaUsuariosAdmin();
    } else {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-login').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('admin-clave').value = '';
        document.getElementById('admin-error').style.display = 'none';
        setTimeout(() => document.getElementById('admin-clave').focus(), 100);
    }
}

function cerrarAdmin() {
    document.getElementById('admin-panel').style.display = 'none';
}

function validarAdmin() {
    const clave = document.getElementById('admin-clave').value;
    if (clave === CLAVE_ADMIN) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        const dot = document.getElementById('admin-fb-dot');
        const txt = document.getElementById('admin-fb-text');
        if (window.firebaseDB) {
            dot.style.background = '#10b981';
            dot.style.boxShadow = '0 0 6px #10b981';
            txt.textContent = 'Firebase conectado';
        } else {
            dot.style.background = '#ef4444';
            txt.textContent = 'Sin conexión Firebase';
        }
        setupAuditoriaListener();
        sincronizarPendientes();
        cargarRegistrosAdmin();
        cargarListaUsuariosAdmin();
    } else {
        document.getElementById('admin-error').style.display = 'block';
        setTimeout(() => { document.getElementById('admin-error').style.display = 'none'; }, 3000);
    }
}

function cargarListaUsuariosAdmin() {
    if (!window.firebaseDB) return;
    const tbody = document.getElementById('admin-usuarios-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-secondary);">Cargando usuarios...</td></tr>';
    const usersRef = window.firebaseRef(window.firebaseDB, 'usuarios');
    window.firebaseGet(usersRef).then(snap => {
        if (!snap.exists()) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-secondary);">Sin usuarios registrados</td></tr>'; return; }
        const data = snap.val();
        const users = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
        users.sort((a,b) => (b.ultimoIngreso || '').localeCompare(a.ultimoIngreso || ''));
        tbody.innerHTML = users.map(u => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:0.4rem 0.6rem;">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:0.7rem;font-weight:700;">${(u.nombre||u.email||'?').charAt(0).toUpperCase()}</div>
                </td>
                <td style="padding:0.4rem 0.6rem;font-size:0.78rem;">${u.nombre||'—'}</td>
                <td style="padding:0.4rem 0.6rem;font-size:0.75rem;color:var(--text-secondary);">${u.email||u.usuario||'—'}</td>
                <td style="padding:0.4rem 0.6rem;font-size:0.75rem;">
                    <span style="font-family:monospace;background:rgba(239,68,68,0.08);color:#f87171;padding:0.1rem 0.45rem;border-radius:0.25rem;letter-spacing:0.05em;">${u.contrasena||'—'}</span>
                </td>
                <td style="padding:0.4rem 0.6rem;font-size:0.72rem;color:var(--text-secondary);">${u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
                <td style="padding:0.4rem 0.6rem;"><span style="background:rgba(16,185,129,0.1);color:#10b981;padding:0.1rem 0.4rem;border-radius:0.25rem;font-size:0.68rem;">${u.rol||'usuario'}</span></td>
            </tr>
        `).join('');
        document.getElementById('admin-usuarios-count').textContent = users.length + ' usuarios';
    }).catch(e => { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--danger);">Error cargando usuarios</td></tr>'; });

    const loginsRef = window.firebaseRef(window.firebaseDB, 'user_logins');
    window.firebaseGet(loginsRef).then(snap => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        const el = document.getElementById('admin-logins-count');
        if (el) el.textContent = count + ' ingresos';
    }).catch(()=>{});

    cargarTablaIPsAdmin();
}

function cargarTablaIPsAdmin() {
    if (!window.firebaseDB) return;
    const cont = document.getElementById('admin-ips-apodos-tbody');
    if (!cont) return;
    cont.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-secondary);">Cargando IPs...</td></tr>';
    const ipsRef = window.firebaseRef(window.firebaseDB, 'ips_usuarios');
    window.firebaseGet(ipsRef).then(snap => {
        if (!snap.exists()) { cont.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:0.75rem;color:var(--text-secondary);">Sin registros de IP</td></tr>'; return; }
        const data = snap.val();
        const ips = Object.values(data).sort((a,b) => (b.accesos||0) - (a.accesos||0));
        cont.innerHTML = ips.map((r,i) => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:0.4rem 0.6rem;font-size:0.72rem;color:var(--text-secondary);">${i+1}</td>
                <td style="padding:0.4rem 0.6rem;font-size:0.78rem;font-family:monospace;color:#60a5fa;">${r.ip||'—'}</td>
                <td style="padding:0.4rem 0.6rem;font-size:0.78rem;font-weight:700;color:#a78bfa;">${r.apodo||'—'}</td>
                <td style="padding:0.4rem 0.6rem;text-align:center;">
                    <span style="background:rgba(99,102,241,0.15);color:#818cf8;padding:0.1rem 0.45rem;border-radius:1rem;font-size:0.72rem;font-weight:700;">${r.accesos||0}</span>
                </td>
                <td style="padding:0.4rem 0.6rem;font-size:0.7rem;color:var(--text-secondary);">${r.ultimoEvento||'—'}</td>
                <td style="padding:0.4rem 0.6rem;font-size:0.7rem;color:var(--text-secondary);">${r.ultimaVez ? new Date(r.ultimaVez).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
            </tr>
        `).join('');
        const countEl = document.getElementById('admin-ips-count');
        if (countEl) countEl.textContent = ips.length + ' IPs';
    }).catch(e => { cont.innerHTML = '<tr><td colspan="6" style="color:var(--danger);padding:0.75rem;text-align:center;">Error cargando IPs</td></tr>'; });
}
