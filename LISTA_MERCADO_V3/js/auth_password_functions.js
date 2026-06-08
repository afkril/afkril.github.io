// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE CONTRASEÑA — Recuperar / Cambiar
// ═══════════════════════════════════════════════════════════════════

// ── Helper: mostrar mensaje con color ──────────────────────────────
function showAuthMsg(id, msg, tipo) {
    const colores = { error: '#ef4444', ok: '#10b981', info: '#f59e0b' };
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = colores[tipo] || '#ef4444';
}

// ── RECUPERAR CONTRASEÑA ────────────────────────────────────────────
// Usa Firebase sendPasswordResetEmail con el correo REAL registrado.
async function doRecoverPassword() {
    const correo = document.getElementById('auth-recover-usuario').value.trim();
    if (!correo) {
        showAuthMsg('auth-error-recover', 'Ingresa tu correo electrónico', 'error');
        return;
    }
    // Validar que sea email real; si no, avisamos
    if (!esEmailValido(correo)) {
        showAuthMsg('auth-error-recover',
            '⚠️ Ingresa tu correo real (ej: tu@correo.com). Las cuentas antiguas con usuario interno no pueden recuperar contraseña por correo.',
            'error');
        return;
    }

    const email = correo.toLowerCase();
    const btn = document.getElementById('auth-btn-recover');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        await window.firebaseSendPasswordReset(window.firebaseAuth, email);
        showAuthMsg('auth-error-recover',
            '✅ Correo enviado a ' + email + '. Revisa tu bandeja de entrada y la carpeta de spam.',
            'ok');
        document.getElementById('auth-recover-usuario').value = '';
    } catch (e) {
        let msg = 'No se pudo enviar el correo';
        if (e.code === 'auth/user-not-found')         msg = 'No existe una cuenta con ese correo';
        else if (e.code === 'auth/invalid-email')     msg = 'Correo electrónico inválido';
        else if (e.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Espera un momento';
        showAuthMsg('auth-error-recover', msg, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Enviar correo de recuperación';
}

// ── CAMBIAR CONTRASEÑA ──────────────────────────────────────────────
// Reautentica con correo+clave actual → updatePassword con la nueva.
// También actualiza el campo "contrasena" en Firebase RTDB usuarios/{uid}.
async function doChangePassword() {
    const correo     = document.getElementById('auth-change-usuario').value.trim();
    const passActual = document.getElementById('auth-change-pass-actual').value;
    const passNueva  = document.getElementById('auth-change-pass-nueva').value;
    const passNueva2 = document.getElementById('auth-change-pass-nueva2').value;

    if (!correo || !passActual || !passNueva || !passNueva2) {
        showAuthMsg('auth-error-change', 'Completa todos los campos', 'error'); return;
    }
    if (!esEmailValido(correo)) {
        showAuthMsg('auth-error-change', 'Ingresa tu correo real (ej: tu@correo.com)', 'error'); return;
    }
    if (passNueva !== passNueva2) {
        showAuthMsg('auth-error-change', 'Las claves nuevas no coinciden', 'error'); return;
    }
    if (passNueva.length < 6) {
        showAuthMsg('auth-error-change', 'La nueva clave debe tener al menos 6 caracteres', 'error'); return;
    }
    if (passNueva === passActual) {
        showAuthMsg('auth-error-change', 'La nueva clave debe ser diferente a la actual', 'info'); return;
    }

    const email = correo.toLowerCase();
    const btn = document.getElementById('auth-btn-change');
    btn.disabled = true;
    btn.textContent = 'Actualizando...';

    try {
        // 1. Iniciar sesión para obtener el user
        const userCred = await window.firebaseSignIn(window.firebaseAuth, email, passActual);
        const user = userCred.user;

        // 2. Reautenticación explícita (requerida para operaciones sensibles)
        const credential = window.firebaseEmailAuthProvider.credential(email, passActual);
        await window.firebaseReauthenticate(user, credential);

        // 3. Actualizar contraseña en Firebase Auth
        await window.firebaseUpdatePasswordFn(user, passNueva);

        // 4. Actualizar campo "contrasena" en RTDB usuarios/{uid}
        try {
            const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + user.uid + '/contrasena');
            await window.firebaseSet(userRef, passNueva);
        } catch (dbErr) {
            console.warn('No se actualizó contrasena en DB:', dbErr);
        }

        // 5. Cerrar sesión y pedir nuevo ingreso
        await window.firebaseSignOut(window.firebaseAuth);

        showAuthMsg('auth-error-change',
            '✅ Contraseña actualizada. Por favor ingresa con la nueva clave.',
            'ok');

        ['auth-change-usuario','auth-change-pass-actual','auth-change-pass-nueva','auth-change-pass-nueva2']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

        setTimeout(() => switchAuthTab('login'), 2000);

    } catch (e) {
        let msg = 'No se pudo cambiar la contraseña';
        if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
            msg = 'Clave actual incorrecta';
        else if (e.code === 'auth/user-not-found')
            msg = 'No existe una cuenta con ese correo';
        else if (e.code === 'auth/too-many-requests')
            msg = 'Demasiados intentos. Intenta más tarde';
        else if (e.code === 'auth/weak-password')
            msg = 'La nueva clave es muy débil';
        showAuthMsg('auth-error-change', msg, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Actualizar contraseña';
}
