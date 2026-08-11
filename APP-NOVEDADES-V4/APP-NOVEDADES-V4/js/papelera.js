// ============================================================
// PAPELERA.JS — Papelera de Reciclaje de Novedades
// Las novedades eliminadas desde "Activas" o "Archivados" se
// mueven aquí en vez de borrarse directamente. Se conservan 7
// días (a partir de la fecha de eliminación) y luego se purgan
// automáticamente. Es independiente por operador: cada perfil
// (AsociacionesModule) tiene su propio nodo Firebase
// "Papelera_<id_operador>" (ej: Papelera_jer, Papelera_t3),
// generado automáticamente para operadores actuales y futuros.
// ============================================================

const DIAS_RETENCION_PAPELERA = 7;

let papeleraNovelties = [];
let currentPapeleraPage = 1;

// ── Núcleo: mover un registro a la papelera del operador activo ──
const PapeleraModule = (() => {

    function moverAPapelera(novelty, idOriginal, origen) {
        if (!novelty) return Promise.reject(new Error('Novedad inválida'));

        // Quitamos el "id" propio del objeto en memoria (es la key del
        // nodo de origen); en la papelera se genera una key nueva.
        const { id: _idEnMemoria, ...datos } = novelty;

        const papeleraData = {
            ...datos,
            origen: origen,              // 'activas' | 'archivadas'
            idOriginal: idOriginal,       // id que tenía en su nodo de origen
            papeleraDate: new Date().toISOString()
        };

        const ref = database.ref(AsociacionesModule.getRef('papelera')).push();
        return ref.set(papeleraData);
    }

    // ── Purga silenciosa: elimina definitivamente lo que ya cumplió
    //    los 7 días desde que llegó a la papelera. Se ejecuta al
    //    abrir el panel admin y cada vez que se carga la papelera. ──
    function purgarExpirados() {
        if (typeof database === 'undefined' || !AsociacionesModule.getPerfilActivo()) {
            return Promise.resolve(0);
        }
        const ref = database.ref(AsociacionesModule.getRef('papelera'));
        return ref.once('value').then(snapshot => {
            const data = snapshot.val() || {};
            const ahora = Date.now();
            const limiteMs = DIAS_RETENCION_PAPELERA * 24 * 60 * 60 * 1000;
            const updates = {};
            let expirados = 0;

            Object.entries(data).forEach(([id, item]) => {
                const fecha = new Date(item.papeleraDate).getTime();
                if (!isNaN(fecha) && (ahora - fecha) >= limiteMs) {
                    updates[id] = null;
                    expirados++;
                }
            });

            if (expirados > 0) {
                return ref.update(updates).then(() => expirados);
            }
            return 0;
        }).catch(error => {
            console.error('[Papelera] Error al purgar expirados:', error);
            return 0;
        });
    }

    return { moverAPapelera, purgarExpirados };
})();

// ── Cargar la papelera del operador activo (purga primero) ───────
function loadPapeleraNovelties() {
    PapeleraModule.purgarExpirados()
        .then(() => database.ref(AsociacionesModule.getRef('papelera')).once('value'))
        .then(snapshot => {
            const data = snapshot.val() || {};
            papeleraNovelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
            filterPapeleraNovelties();
            updatePapeleraBadge();
        })
        .catch(error => showToast('Error al cargar la papelera: ' + error.message, 'error'));
}

// ── Badge con el conteo de la papelera en el tab de navegación ───
function updatePapeleraBadge() {
    const badge = document.getElementById('papeleraCountBadge');
    if (!badge) return;

    const ref = database.ref(AsociacionesModule.getRef('papelera'));
    ref.once('value').then(snapshot => {
        const data = snapshot.val() || {};
        const total = Object.keys(data).length;
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }).catch(() => {});
}

function filterPapeleraNovelties() {
    const searchInput = document.getElementById('searchInputPapelera');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = papeleraNovelties.filter(n => {
        return !searchTerm ||
            (n.name && n.name.toLowerCase().includes(searchTerm)) ||
            (n.document && n.document.includes(searchTerm)) ||
            (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
            (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
            (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
            (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
    });

    filtered.sort((a, b) => new Date(b.papeleraDate) - new Date(a.papeleraDate));
    renderPapeleraTable(filtered);
}

function renderPapeleraTable(novelties) {
    const tbody = document.getElementById('papeleraTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const countEl = document.getElementById('papeleraCount');
    if (countEl) countEl.textContent = novelties.length;

    const start = (currentPapeleraPage - 1) * itemsPerPage;
    const paginated = novelties.slice(start, start + itemsPerPage);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color:#94a3b8;">🗑️ La papelera está vacía</td></tr>`;
        renderPapeleraPagination(0);
        return;
    }

    paginated.forEach(n => {
        let tipoBadge = '';
        if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
            tipoBadge = '<span class="badge badge-ambos">AMBOS</span>';
        } else if (n.type === 'retiro') {
            tipoBadge = '<span class="badge badge-retiro">RETIRO</span>';
        } else if (n.type === 'ingreso') {
            tipoBadge = '<span class="badge badge-ingreso">INGRESO</span>';
        } else {
            tipoBadge = '<span class="badge">' + (n.type || 'N/A').toUpperCase() + '</span>';
        }

        let docDisplay = n.document || '-';
        let nameDisplay = n.name || '-';
        if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
            const docRet = n.retiro ? n.retiro.document : (n.document || '-');
            const docIng = n.ingreso ? n.ingreso.document : '-';
            const nomRet = n.retiro ? n.retiro.name : (n.name || '-');
            const nomIng = n.ingreso ? n.ingreso.name : '-';
            docDisplay = docRet + ' / ' + docIng;
            nameDisplay = (nomRet.length > 15 ? nomRet.substring(0, 15) + '...' : nomRet) + ' / ' + (nomIng.length > 15 ? nomIng.substring(0, 15) + '...' : nomIng);
        }

        const fechaElim = new Date(n.papeleraDate);
        const msRestante = (DIAS_RETENCION_PAPELERA * 24 * 60 * 60 * 1000) - (Date.now() - fechaElim.getTime());
        const diasRestantes = Math.max(0, Math.ceil(msRestante / (24 * 60 * 60 * 1000)));

        let diasColor = '#10b981';
        if (diasRestantes <= 1) diasColor = '#dc2626';
        else if (diasRestantes <= 3) diasColor = '#f59e0b';

        const origenBadge = n.origen === 'archivadas'
            ? '<span class="badge" style="background:#ede9fe; color:#5b21b6;">🗃️ Archivados</span>'
            : '<span class="badge" style="background:#dbeafe; color:#1e40af;">📋 Activas</span>';

        const row = document.createElement('tr');
        row.className = 'papelera-row';
        row.innerHTML = `
            <td>${fechaElim.toLocaleDateString('es-CO')} ${fechaElim.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
            <td>${origenBadge}</td>
            <td><span class="badge" style="background:${diasColor}; color:white;">${diasRestantes} día${diasRestantes === 1 ? '' : 's'}</span></td>
            <td><span class="badge" style="background: ${getContractColor(n.contract)}; color: white;">${n.contract || 'N/A'}</span></td>
            <td>${n.udsName || '-'}</td>
            <td>${tipoBadge}</td>
            <td>${docDisplay}</td>
            <td>${nameDisplay}</td>
            <td>
                <button onclick="restaurarPapelera('${n.id}')" class="text-green-600 hover:text-green-800 text-xs font-semibold mr-2 bg-green-50 px-2 py-1 rounded">♻️ Restaurar</button>
                <button onclick="eliminarDefinitivoPapelera('${n.id}')" class="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2 py-1 rounded">🗑️ Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    renderPapeleraPagination(novelties.length);
}

function renderPapeleraPagination(totalItems) {
    const container = document.getElementById('paginationPapelera');
    if (!container) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1 rounded text-sm ${i === currentPapeleraPage ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
        btn.textContent = i;
        btn.onclick = () => { currentPapeleraPage = i; filterPapeleraNovelties(); };
        container.appendChild(btn);
    }
}

// ── Restaurar: vuelve el registro a su ubicación original ────────
function restaurarPapelera(id) {
    const item = papeleraNovelties.find(n => n.id === id);
    if (!item) return;

    const destinoLabel = item.origen === 'archivadas' ? 'Archivados' : 'Novedades Activas';
    if (!confirm(`¿Restaurar esta novedad a "${destinoLabel}"?`)) return;

    const { id: _id, origen, idOriginal, papeleraDate, ...datos } = item;
    const destinoRef = origen === 'archivadas'
        ? AsociacionesModule.getRef('archived')
        : AsociacionesModule.getRef('novelties');

    database.ref(destinoRef).push().set(datos)
        .then(() => database.ref(`${AsociacionesModule.getRef('papelera')}/${id}`).remove())
        .then(() => {
            showToast(`♻️ Novedad restaurada a ${destinoLabel}`, 'success');
            loadPapeleraNovelties();
            if (typeof loadNoveltiesTable === 'function') loadNoveltiesTable();
            if (typeof loadArchivedNovelties === 'function') loadArchivedNovelties();
            if (typeof updatePendientesIndicator === 'function') updatePendientesIndicator();
        })
        .catch(error => showToast('Error al restaurar: ' + error.message, 'error'));
}

// ── Eliminar un registro puntual de forma definitiva ──────────────
function eliminarDefinitivoPapelera(id) {
    if (!confirm('⚠️ Esta acción eliminará el registro de forma PERMANENTE y no se puede deshacer.\n\n¿Desea continuar?')) return;

    database.ref(`${AsociacionesModule.getRef('papelera')}/${id}`).remove()
        .then(() => {
            showToast('🗑️ Registro eliminado permanentemente', 'success');
            loadPapeleraNovelties();
        })
        .catch(error => showToast('Error al eliminar: ' + error.message, 'error'));
}

// ── Vaciar toda la papelera del operador activo ───────────────────
function vaciarPapelera() {
    const count = papeleraNovelties.length;
    if (count === 0) {
        showToast('La papelera ya está vacía', 'warning');
        return;
    }

    const confirmacion = prompt(`⚠️ ¡ATENCIÓN! ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\n` +
        `Está a punto de eliminar PERMANENTEMENTE los ${count} registros de la papelera.\n\n` +
        `Para confirmar, escriba ELIMINAR en mayúsculas:`);

    if (confirmacion !== 'ELIMINAR') {
        showToast('Operación cancelada', 'info');
        return;
    }

    database.ref(AsociacionesModule.getRef('papelera')).remove()
        .then(() => {
            showToast('🗑️ Papelera vaciada correctamente', 'success');
            papeleraNovelties = [];
            filterPapeleraNovelties();
            updatePapeleraBadge();
        })
        .catch(error => showToast('Error al vaciar la papelera: ' + error.message, 'error'));
}
