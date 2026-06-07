// ==================== CONFIRM DIALOG ====================
    // ── Custom Confirm Dialog ──────────────────────────────
    let _confirmDialogResolve = null;
    let _confirmDialogReject = null;

    function mostrarConfirm(mensaje, { titulo = '¿Confirmar acción?', icono = '⚠️', btnOk = 'Confirmar', colorOk = 'linear-gradient(135deg,#dc2626,#ef4444)' } = {}) {
        return new Promise((resolve, reject) => {
            _confirmDialogResolve = resolve;
            _confirmDialogReject = reject;
            document.getElementById('confirm-dialog-title').textContent = titulo;
            document.getElementById('confirm-dialog-message').textContent = mensaje;
            document.getElementById('confirm-dialog-icon').textContent = icono;
            document.getElementById('confirm-dialog-ok').textContent = btnOk;
            document.getElementById('confirm-dialog-ok').style.background = colorOk;
            const overlay = document.getElementById('confirm-dialog-overlay');
            overlay.style.display = 'flex';
            // Focus the cancel button by default for safety
            setTimeout(() => document.getElementById('confirm-dialog-cancel').focus(), 50);
        });
    }
    function _confirmDialogConfirm() {
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
    </script>
