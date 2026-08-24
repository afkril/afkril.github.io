// ============================================================
// MÓDULO: MODAL DE CONTRASEÑA REUTILIZABLE
// Reemplaza los prompt() nativos del navegador por un panel
// visual con el estilo de la app. Se usa tanto para el Panel
// de Ajustes del sistema como para el Panel Administrativo
// de cada asociación.
// ============================================================

const ClaveModal = (() => {

    let _onSubmit = null;   // async (password) => boolean
    let _onCancel = null;   // () => void

    // ── Mostrar el modal ───────────────────────────────────────
    // opciones: { icono, titulo, subtitulo, placeholder, onSubmit, onCancel }
    function mostrar(opciones) {
        _onSubmit = opciones.onSubmit;
        _onCancel = opciones.onCancel || null;

        const icono      = document.getElementById('claveModalIcono');
        const titulo     = document.getElementById('claveModalTitulo');
        const subtitulo  = document.getElementById('claveModalSubtitulo');
        const input      = document.getElementById('claveModalInput');
        const overlay    = document.getElementById('claveModalOverlay');
        const btn        = document.getElementById('claveModalBtnConfirmar');

        if (icono)  icono.textContent  = opciones.icono || '🔐';
        if (titulo) titulo.textContent = opciones.titulo || 'Acceso protegido';

        if (subtitulo) {
            if (opciones.subtitulo) {
                subtitulo.textContent   = opciones.subtitulo;
                subtitulo.style.display = 'block';
            } else {
                subtitulo.style.display = 'none';
            }
        }

        if (input) {
            input.value       = '';
            input.type        = 'password';
            input.placeholder = opciones.placeholder || '••••••••';
        }
        const toggleBtn = document.getElementById('claveModalToggleVer');
        if (toggleBtn) toggleBtn.textContent = '👁️';

        _ocultarError();

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Acceder';
        }

        if (overlay) overlay.style.display = 'flex';
        setTimeout(() => input && input.focus(), 80);
    }

    // ── Ocultar el modal ────────────────────────────────────────
    function ocultar() {
        const overlay = document.getElementById('claveModalOverlay');
        if (overlay) overlay.style.display = 'none';
        _onSubmit = null;
    }

    // ── Cancelar (botón X o "Cancelar") ─────────────────────────
    function cancelar() {
        const cb = _onCancel;
        ocultar();
        if (cb) cb();
    }

    // ── Confirmar contraseña ────────────────────────────────────
    async function confirmar() {
        const input = document.getElementById('claveModalInput');
        const valor = input ? input.value : '';

        if (!valor || valor.trim() === '') {
            _mostrarError('Ingresa una contraseña');
            return;
        }
        if (!_onSubmit) { ocultar(); return; }

        const btn = document.getElementById('claveModalBtnConfirmar');
        if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

        try {
            const ok = await _onSubmit(valor);
            if (ok) {
                ocultar();
            } else {
                _mostrarError('❌ Contraseña incorrecta');
                _sacudir();
                if (input) { input.value = ''; input.focus(); }
            }
        } catch (e) {
            _mostrarError('Error al verificar: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Acceder'; }
        }
    }

    // ── Mostrar / ocultar clave en texto plano ─────────────────
    function toggleVer() {
        const input = document.getElementById('claveModalInput');
        const btn   = document.getElementById('claveModalToggleVer');
        if (!input) return;
        const verClave = input.type === 'password';
        input.type = verClave ? 'text' : 'password';
        if (btn) btn.textContent = verClave ? '🙈' : '👁️';
    }

    // ── Atajos de teclado ────────────────────────────────────────
    function manejarTecla(e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
        if (e.key === 'Escape') cancelar();
    }

    // ── Helpers internos ─────────────────────────────────────────
    function _mostrarError(msg) {
        const el = document.getElementById('claveModalError');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    function _ocultarError() {
        const el = document.getElementById('claveModalError');
        if (el) el.style.display = 'none';
    }

    function _sacudir() {
        const box = document.getElementById('claveModalBox');
        if (!box) return;
        box.classList.remove('clave-modal-shake');
        void box.offsetWidth; // reinicia la animación
        box.classList.add('clave-modal-shake');
    }

    return {
        mostrar,
        ocultar,
        cancelar,
        confirmar,
        toggleVer,
        manejarTecla
    };
})();
