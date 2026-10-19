    // ── Custom Confirm Dialog ──────────────────────────────
    let _confirmDialogResolve = null;
    let _confirmDialogReject = null;
    let _confirmDialogPalabraRequerida = null;

    // palabraConfirmacion: si se define (ej: "CONFIRMAR"), el botón de confirmar
    // queda deshabilitado hasta que el usuario escriba exactamente esa palabra
    // en el campo de texto que aparece en el diálogo. Útil para acciones muy
    // destructivas (ej: eliminar operadores) donde se quiere evitar un clic accidental.
    function mostrarConfirm(mensaje, { titulo = '¿Confirmar acción?', icono = '⚠️', btnOk = 'Confirmar', colorOk = 'linear-gradient(135deg,#dc2626,#ef4444)', palabraConfirmacion = null } = {}) {
        return new Promise((resolve, reject) => {
            _confirmDialogResolve = resolve;
            _confirmDialogReject = reject;
            _confirmDialogPalabraRequerida = palabraConfirmacion;
            document.getElementById('confirm-dialog-title').textContent = titulo;
            document.getElementById('confirm-dialog-message').textContent = mensaje;
            document.getElementById('confirm-dialog-icon').textContent = icono;
            const btnOkEl = document.getElementById('confirm-dialog-ok');
            btnOkEl.textContent = btnOk;
            btnOkEl.style.background = colorOk;

            const wrap = document.getElementById('confirm-dialog-palabra-wrap');
            const input = document.getElementById('confirm-dialog-palabra-input');
            const label = document.getElementById('confirm-dialog-palabra-label');

            if (palabraConfirmacion) {
                label.innerHTML = `Para continuar, escriba <strong>${palabraConfirmacion}</strong> en el campo:`;
                input.value = '';
                input.placeholder = palabraConfirmacion;
                wrap.style.display = 'block';
                btnOkEl.disabled = true;
                btnOkEl.style.opacity = '0.5';
                btnOkEl.style.cursor = 'not-allowed';
                input.oninput = function() {
                    const ok = input.value.trim() === palabraConfirmacion;
                    btnOkEl.disabled = !ok;
                    btnOkEl.style.opacity = ok ? '1' : '0.5';
                    btnOkEl.style.cursor = ok ? 'pointer' : 'not-allowed';
                };
                input.onkeypress = function(e) {
                    if (e.key === 'Enter' && input.value.trim() === palabraConfirmacion) _confirmDialogConfirm();
                };
            } else {
                wrap.style.display = 'none';
                btnOkEl.disabled = false;
                btnOkEl.style.opacity = '1';
                btnOkEl.style.cursor = 'pointer';
            }

            const overlay = document.getElementById('confirm-dialog-overlay');
            overlay.style.display = 'flex';
            // Enfocar el campo de palabra clave si aplica; si no, el botón cancelar por seguridad
            setTimeout(() => {
                if (palabraConfirmacion) input.focus();
                else document.getElementById('confirm-dialog-cancel').focus();
            }, 50);
        });
    }
    function _confirmDialogConfirm() {
        const btnOkEl = document.getElementById('confirm-dialog-ok');
        if (btnOkEl.disabled) return; // bloqueado hasta escribir la palabra requerida
        document.getElementById('confirm-dialog-overlay').style.display = 'none';
        if (_confirmDialogResolve) { _confirmDialogResolve(true); _confirmDialogResolve = null; }
    }
    function _confirmDialogCancel() {
        document.getElementById('confirm-dialog-overlay').style.display = 'none';
        if (_confirmDialogReject) { _confirmDialogReject(false); _confirmDialogReject = null; }
    }
    // Cerrar con clic fuera
    document.getElementById('confirm-dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) _confirmDialogCancel();
    });
