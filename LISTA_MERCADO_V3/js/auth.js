// ==================== AUTH + USUARIOS ====================
        //  AUTH SYSTEM - Login / Register / User State
        // ═══════════════════════════════════════════════════════════════════

        function initAuthUI() {
            // The onAuthStateChanged listener set in the module will call
            // onUserLoggedIn / onUserLoggedOut
            // Initially show login wall until auth resolves
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
            const loginForm = document.getElementById('auth-form-login');
            const regForm = document.getElementById('auth-form-register');
            const tabLogin = document.getElementById('auth-tab-login');
            const tabReg = document.getElementById('auth-tab-register');
            if (tab === 'login') {
                loginForm.style.display = 'block';
                regForm.style.display = 'none';
                tabLogin.classList.add('active');
                tabReg.classList.remove('active');
            } else {
                loginForm.style.display = 'none';
                regForm.style.display = 'block';
                tabLogin.classList.remove('active');
                tabReg.classList.add('active');
            }
            clearAuthErrors();
        }

        function clearAuthErrors() {
            document.getElementById('auth-error-login').textContent = '';
            document.getElementById('auth-error-register').textContent = '';
        }

        function showAuthError(id, msg) {
            document.getElementById(id).textContent = msg;
        }

        // Convierte un nombre de usuario a email interno para Firebase Auth
        function usuarioAEmail(usuario) {
            // Si ya parece un email, lo usa directo; si no, lo convierte
            if (usuario.indexOf('@') !== -1) return usuario.toLowerCase().trim();
            // Limpiar: solo alfanumérico, puntos, guiones
            var limpio = usuario.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
            return limpio + '@app.local';
        }

        async function doLogin() {
            const usuario = document.getElementById('auth-email-login').value.trim();
            const pass = document.getElementById('auth-pass-login').value;
            if (!usuario || !pass) { showAuthError('auth-error-login','Completa todos los campos'); return; }
            const email = usuarioAEmail(usuario);
            const btn = document.getElementById('auth-btn-login');
            btn.disabled = true; btn.textContent = 'Ingresando...';
            try {
                const userCred = await window.firebaseSignIn(window.firebaseAuth, email, pass);
                // Capturar IP al iniciar sesión
                let ipLogin = 'desconocida';
                try {
                    const ipResp2 = await fetch('https://api.ipify.org?format=json');
                    const ipData2 = await ipResp2.json();
                    ipLogin = ipData2.ip || 'desconocida';
                } catch(e2) {}
                // El nombre se cargará del perfil de Firebase; usamos displayName si existe
                const nombreLogin = userCred.user.displayName || usuario;
                registrarIPUsuario(ipLogin, nombreLogin, userCred.user.uid, 'login');
                // onUserLoggedIn will be called by onAuthStateChanged
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
            const nombre = document.getElementById('auth-nombre-register').value.trim();
            const usuario = document.getElementById('auth-email-register').value.trim();
            const pass = document.getElementById('auth-pass-register').value;
            const pass2 = document.getElementById('auth-pass-register2').value;
            if (!nombre || !usuario || !pass) { showAuthError('auth-error-register','Completa todos los campos'); return; }
            if (pass !== pass2) { showAuthError('auth-error-register','Las claves no coinciden'); return; }
            if (pass.length < 6) { showAuthError('auth-error-register','La clave debe tener al menos 6 caracteres'); return; }
            const email = usuarioAEmail(usuario);
            const btn = document.getElementById('auth-btn-register');
            btn.disabled = true; btn.textContent = 'Creando cuenta...';
            try {
                const cred = await window.firebaseCreateUser(window.firebaseAuth, email, pass);
                await window.firebaseUpdateProfile(cred.user, { displayName: nombre });
                // Save user profile to DB
                const uid = cred.user.uid;
                // Obtener IP del usuario
                let ipUsuario = 'desconocida';
                try {
                    const ipResp = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResp.json();
                    ipUsuario = ipData.ip || 'desconocida';
                } catch(ipErr) { ipUsuario = 'desconocida'; }

                const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid);
                await window.firebaseSet(userRef, {
                    nombre: nombre,
                    usuario: usuario,
                    email: email,
                    contrasena: pass,
                    rol: 'usuario',
                    creadoEn: new Date().toISOString(),
                    ultimoIngreso: new Date().toISOString(),
                    ipRegistro: ipUsuario
                });
                // Registrar IP con apodo = nombre del usuario
                registrarIPUsuario(ipUsuario, nombre, uid, 'registro');
                // Log login
                logUserLogin(uid, nombre, email, ipUsuario);
            } catch(e) {
                let msg = 'Error al crear cuenta';
                if (e.code === 'auth/email-already-in-use') msg = 'Este usuario ya está registrado';
                else if (e.code === 'auth/invalid-email') msg = 'Nombre de usuario inválido';
                else if (e.code === 'auth/weak-password') msg = 'La clave es muy débil';
                showAuthError('auth-error-register', msg);
            }
            btn.disabled = false; btn.textContent = 'Crear cuenta';
        }

        async function doLogout() {
            try {
                await window.firebaseSignOut(window.firebaseAuth);
            } catch(e) { console.error(e); }
        }

        function logUserLogin(uid, nombre, email, ip) {
            try {
                const logRef = window.firebaseRef(window.firebaseDB, 'user_logins/' + Date.now() + '_' + uid.substring(0,8));
                window.firebaseSet(logRef, {
                    uid: uid,
                    nombre: nombre || 'Sin nombre',
                    email: email || '',
                    ip: ip || 'desconocida',
                    timestamp: new Date().toISOString(),
                    fecha: new Date().toLocaleDateString('es-CO'),
                    hora: new Date().toLocaleTimeString('es-CO')
                });
                // Update last login on user profile
                const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid + '/ultimoIngreso');
                window.firebaseSet(userRef, new Date().toISOString());
            } catch(e) { console.error('Error logging login', e); }
        }

        // Registra/actualiza la IP con apodo = nombre del usuario en Firebase
        function registrarIPUsuario(ip, nombre, uid, evento) {
            if (!ip || ip === 'desconocida' || !window.firebaseDB) return;
            try {
                // Clave segura para la IP (reemplazar puntos por guiones)
                const ipKey = ip.replace(/\./g, '-');
                const ipRef = window.firebaseRef(window.firebaseDB, 'ips_usuarios/' + ipKey);
                window.firebaseGet(ipRef).then(snap => {
                    const existing = snap.exists() ? snap.val() : {};
                    const entry = {
                        ip: ip,
                        apodo: nombre || existing.apodo || 'Sin nombre',
                        uid: uid || existing.uid || '',
                        ultimoEvento: evento || 'acceso',
                        ultimaVez: new Date().toISOString(),
                        accesos: (existing.accesos || 0) + 1,
                        primeraVez: existing.primeraVez || new Date().toISOString()
                    };
                    window.firebaseSet(ipRef, entry);
                }).catch(e => console.error('Error ips_usuarios get', e));
            } catch(e) { console.error('Error registrarIPUsuario', e); }
        }

        function onUserLoggedIn(user) {
            hideLoginOverlay();
            // Establecer keys de almacenamiento exclusivos para este usuario
            setDirStorageKeyForUser(user.uid);
            // Update user info display
            const displayName = user.displayName || user.email || 'Usuario';
            document.getElementById('user-display-name').textContent = displayName;
            document.getElementById('user-avatar-letter').textContent = displayName.charAt(0).toUpperCase();
            document.getElementById('user-info-bar').style.display = 'flex';
            // Log login event con IP
            fetch('https://api.ipify.org?format=json')
                .then(r => r.json())
                .then(d => {
                    const ip = d.ip || 'desconocida';
                    logUserLogin(user.uid, user.displayName, user.email, ip);
                    registrarIPUsuario(ip, user.displayName || user.email, user.uid, 'login');
                })
                .catch(() => logUserLogin(user.uid, user.displayName, user.email, 'desconocida'));
            // Load user's directories from Firebase
            loadUserDirectories(user.uid);
            // Load user's proveedores from Firebase
            loadUserProveedores(user.uid);
            // Load user's savedLists from Firebase
            loadUserSavedLists(user.uid);
        }

        function onUserLoggedOut() {
            showLoginOverlay();
            document.getElementById('user-info-bar').style.display = 'none';
            // Limpiar todos los datos en memoria al cerrar sesión
            try { tabSaveDirectoriosGuardados({}); tabRefreshSelect(); } catch(e) {}
            try { savedLists = []; updateSavedCount(); showSavedLists(); } catch(e) {}
            try { provSaveAllLocal([]); provRenderizar(); } catch(e) {}
            // Reset todas las keys a anónimo
            resetStorageKeysToAnon();
        }

        function loadUserDirectories(uid) {
            try {
                const dirRef = window.firebaseRef(window.firebaseDB, 'user_dirs/' + uid);
                window.firebaseOnValue(dirRef, (snap) => {
                    if (snap.exists()) {
                        // Cargar SOLO los directorios del usuario desde Firebase (no mezclar con otros)
                        const data = snap.val();
                        tabSaveDirectoriosGuardados(data);
                        tabRefreshSelect();
                        tabRenderizarDirectorio();
                    } else {
                        // Sin datos en Firebase: limpiar local para este usuario
                        tabSaveDirectoriosGuardados({});
                        tabRefreshSelect();
                    }
                }, { onlyOnce: true });
            } catch(e) { console.error('Error loading user dirs', e); }
        }

        // Guarda proveedores solo en localStorage (sin disparar sync Firebase, para evitar loop)
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
                    // Sincronizar en localStorage del usuario
                    localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
                    try { updateSavedCount(); showSavedLists(); } catch(e) {}
                }, { onlyOnce: true });
            } catch(e) { console.error('Error loading user savedLists', e); }
        }


        

        // Hook into existing save functions to also save to Firebase
        const _origTabSave = typeof tabSaveDirectoriosGuardados === 'function' ? tabSaveDirectoriosGuardados : null;

        // ═══════════════════════════════════════════════════════════════════
        //  ADMIN PANEL - moved to login-style overlay
        // ═══════════════════════════════════════════════════════════════════

        function abrirAdmin() {
            // Check if already admin-logged-in this session
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
                        <td style="padding:0.4rem 0.6rem;font-size:0.75rem;color:var(--text-secondary);">${u.usuario||u.email||'—'}</td>
                        <td style="padding:0.4rem 0.6rem;font-size:0.75rem;">
                            <span style="font-family:monospace;background:rgba(239,68,68,0.08);color:#f87171;padding:0.1rem 0.45rem;border-radius:0.25rem;letter-spacing:0.05em;">${u.contrasena||'—'}</span>
                        </td>
                        <td style="padding:0.4rem 0.6rem;font-size:0.72rem;color:var(--text-secondary);">${u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
                        <td style="padding:0.4rem 0.6rem;"><span style="background:rgba(16,185,129,0.1);color:#10b981;padding:0.1rem 0.4rem;border-radius:0.25rem;font-size:0.68rem;">${u.rol||'usuario'}</span></td>
                    </tr>
                `).join('');
                document.getElementById('admin-usuarios-count').textContent = users.length + ' usuarios';
            }).catch(e => { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--danger);">Error cargando usuarios</td></tr>'; });

            // Also load login history count
            const loginsRef = window.firebaseRef(window.firebaseDB, 'user_logins');
            window.firebaseGet(loginsRef).then(snap => {
                const count = snap.exists() ? Object.keys(snap.val()).length : 0;
                const el = document.getElementById('admin-logins-count');
                if (el) el.textContent = count + ' ingresos';
            }).catch(()=>{});

            // Cargar tabla de IPs con apodos
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

