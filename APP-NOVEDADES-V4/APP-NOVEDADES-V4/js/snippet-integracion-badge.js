// ============================================================
// SNIPPET: Integrar badge DUP en tabla de Novedades Activas
// Copia esto en tu función de renderizado de filas
// ============================================================

// Opción A: Verificación por lotes (recomendada para performance)
// Agrega esto DESPUÉS de cargar los datos y ANTES de renderizar:

async function cargarYRenderizarNovedades() {
    const novelties = await cargarNovedades(); // tu función actual

    // Enriquecer con info de duplicados
    const docsUnicos = [...new Set(novelties.map(n => {
        const doc = n.ingreso?.document || n.retiro?.document || n.document;
        return String(doc || '').trim();
    }).filter(Boolean))];

    const docsDuplicados = new Set();
    await Promise.all(docsUnicos.map(async (doc) => {
        try {
            const caso = await DuplicadosModule.buscarPorDocumento(doc);
            if (caso && caso.totalMovimientos > 1) docsDuplicados.add(doc);
        } catch(e) {}
    }));

    const noveltiesConDup = novelties.map(n => {
        const doc = String(n.ingreso?.document || n.retiro?.document || n.document || '').trim();
        return { ...n, _tieneDuplicado: docsDuplicados.has(doc) };
    });

    renderTabla(noveltiesConDup); // tu función de renderizado
}

// En tu función renderRow(), agrega el badge:
function renderRow(novelty) {
    const doc = novelty.ingreso?.document || novelty.retiro?.document || novelty.document;
    const dupBadge = novelty._tieneDuplicado && doc 
        ? DuplicadosModule.renderBadgeDuplicado(doc)
        : '';

    return `
        <tr>
            ... otras columnas ...
            <td>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    ${doc || '—'}
                    ${dupBadge}
                </div>
            </td>
            <td>${novelty.name || '—'}</td>
            ... resto de columnas ...
        </tr>
    `;
}
