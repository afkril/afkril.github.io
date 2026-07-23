// ============================================================
// MÓDULO: DESHACER / REHACER (Undo/Redo)
// Patrón Command con historial de estados
// ============================================================

const UndoManager = (() => {
    const history = [];
    let currentIndex = -1;
    const MAX_HISTORY = 50;
    let _onUpdate = null;

    /**
     * Captura el estado actual de la aplicación como snapshot
     */
    function captureState() {
        const semanas = parseInt(document.getElementById('num-semanas')?.value) || 4;
        const state = {
            mes: document.getElementById('main-mes')?.value || 'Enero',
            contrato: document.getElementById('main-contrato')?.value || '',
            numSemanas: semanas,
            valorCupo: valorCupoBase,
            proveedores: JSON.parse(JSON.stringify(proveedores)),
            productosBase: JSON.parse(JSON.stringify(productosBase)),
            semanas: {},
            descuentos: JSON.parse(JSON.stringify(descuentosPorSemana || {})),
            descuentosGlobalActivo: descuentosGlobalActivo !== false,
            timestamp: Date.now()
        };

        for (let s = 1; s <= semanas; s++) {
            state.semanas[s] = {
                d: document.getElementById(`dias-${s}`)?.value || '',
                c: document.getElementById(`cupos-${s}`)?.value || '',
                items: {}
            };
            productosBase.forEach((p, i) => {
                state.semanas[s].items[i] = {
                    f: document.getElementById(`fac-${s}-${i}`)?.value || '',
                    q: document.getElementById(`cant-${s}-${i}`)?.value || '',
                    p: document.getElementById(`punit-${s}-${i}`)?.value || p.precio,
                    v: document.getElementById(`val-${s}-${i}`)?.value || ''
                };
            });
        }

        return state;
    }

    /**
     * Restaura un snapshot en la interfaz
     */
    function restoreState(state) {
        if (!state) return;

        proveedores = JSON.parse(JSON.stringify(state.proveedores));
        productosBase = JSON.parse(JSON.stringify(state.productosBase));
        valorCupoBase = state.valorCupo;

        document.getElementById('main-mes').value = state.mes;
        document.getElementById('main-contrato').value = state.contrato;
        document.getElementById('num-semanas').value = state.numSemanas;

        initGrid();

        for (let s = 1; s <= state.numSemanas; s++) {
            if (!state.semanas[s]) continue;
            const sem = state.semanas[s];

            if (document.getElementById(`dias-${s}`))
                document.getElementById(`dias-${s}`).value = sem.d;
            if (document.getElementById(`cupos-${s}`))
                document.getElementById(`cupos-${s}`).value = sem.c;

            productosBase.forEach((p, i) => {
                const item = sem.items[i];
                if (!item) return;
                if (document.getElementById(`fac-${s}-${i}`))
                    document.getElementById(`fac-${s}-${i}`).value = item.f;
                if (document.getElementById(`cant-${s}-${i}`))
                    document.getElementById(`cant-${s}-${i}`).value = item.q;
                if (document.getElementById(`punit-${s}-${i}`))
                    document.getElementById(`punit-${s}-${i}`).value = item.p;
                if (document.getElementById(`val-${s}-${i}`))
                    document.getElementById(`val-${s}-${i}`).value = item.v;
            });
            calcular(s);
        }

        descuentosPorSemana = JSON.parse(JSON.stringify(state.descuentos || {}));
        descuentosGlobalActivo = state.descuentosGlobalActivo !== false;

        setTimeout(() => {
            _inyectarSeccionesDescuentos();
            renderizarTodosDescuentos();
            actualizarResumen();
            guardarLocal();
        }, 50);
    }

    /**
     * Guarda un nuevo estado en el historial
     */
    function push(state) {
        if (!state) state = captureState();

        // Si estamos en medio del historial, truncar el futuro
        if (currentIndex < history.length - 1) {
            history.splice(currentIndex + 1);
        }

        history.push(state);

        // Limitar tamaño del historial
        if (history.length > MAX_HISTORY) {
            history.shift();
        } else {
            currentIndex++;
        }

        currentIndex = history.length - 1;
        _notify();
    }

    /**
     * Deshacer: retrocede un paso
     */
    function undo() {
        if (currentIndex <= 0) return null;
        currentIndex--;
        const state = history[currentIndex];
        restoreState(state);
        _notify();
        return state;
    }

    /**
     * Rehacer: avanza un paso
     */
    function redo() {
        if (currentIndex >= history.length - 1) return null;
        currentIndex++;
        const state = history[currentIndex];
        restoreState(state);
        _notify();
        return state;
    }

    function canUndo() { return currentIndex > 0; }
    function canRedo() { return currentIndex < history.length - 1; }

    function onUpdate(fn) { _onUpdate = fn; }
    function _notify() { if (_onUpdate) _onUpdate({ canUndo: canUndo(), canRedo: canRedo() }); }

    function clear() {
        history.length = 0;
        currentIndex = -1;
        _notify();
    }

    return { push, undo, redo, canUndo, canRedo, captureState, onUpdate, clear };
})();

// ============================================================
// ATAJOS DE TECLADO GLOBALES
// ============================================================

document.addEventListener('keydown', (e) => {
    // Ctrl+Z → Deshacer
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (UndoManager.canUndo()) {
            UndoManager.undo();
            Toast.info('Acción deshecha', { title: 'Deshacer' });
        }
    }

    // Ctrl+Shift+Z o Ctrl+Y → Rehacer
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (UndoManager.canRedo()) {
            UndoManager.redo();
            Toast.info('Acción rehecha', { title: 'Rehacer' });
        }
    }

    // Ctrl+S → Guardar en la nube
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (typeof guardarFirebase === 'function') guardarFirebase();
    }

    // Escape → Cerrar drawers/modales
    if (e.key === 'Escape') {
        if (typeof closeAllDrawers === 'function') closeAllDrawers();
        document.querySelectorAll('.modal[style*="display: flex"]').forEach(m => {
            m.style.display = 'none';
        });
    }
});

// ============================================================
// CONFIRMAR ANTES DE SALIR CON CAMBIOS PENDIENTES
// ============================================================

window.addEventListener('beforeunload', (e) => {
    if (cambiosSinGuardar) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
        return e.returnValue;
    }
});

// ============================================================
// SNAPSHOT AUTOMÁTICO: capturar estado al inicio
// ============================================================

// Se llama una vez después de cargar datos para tener el estado base
let _undoInitialized = false;
function initUndoSystem() {
    if (_undoInitialized) return;
    _undoInitialized = true;
    // Capturar estado inicial después de un tick para que el DOM esté listo
    setTimeout(() => {
        UndoManager.push(UndoManager.captureState());
    }, 200);
}

// ============================================================
// CONECTAR BOTONES DE UI CON EL SISTEMA DE UNDO
// ============================================================

UndoManager.onUpdate(({ canUndo, canRedo }) => {
    const undoBtn = document.querySelector('.undo-btn');
    const redoBtn = document.querySelector('.redo-btn');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
});
