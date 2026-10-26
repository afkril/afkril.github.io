/* ============================================================
   CAMBIO-TIPO.JS  (panel de administración)
   Ventana con los participantes "Menor de 6 meses" que siguen
   ACTIVOS y ya cumplieron 6 meses (edad = fecha de nacimiento vs
   fecha actual), para actualizar su tipo de beneficiario a
   "6 meses a 5 años" en la plataforma (Cuéntame).
   · Activo = tiene ingreso y NO tiene un retiro posterior/igual del
     mismo documento (se revisan novedades activas y archivadas).
   · "Marcar actualizado" guarda cambioTipo en la novedad y la quita de
     la lista.
   ============================================================ */
const CambioTipoModule = (() => {
    let _casos = [];
    let _ultimaCarga = 0;
    let _cargando = false;
    const $ = id => document.getElementById(id);
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Fechas ---------- */
    function parseFecha(v) {
        if (!v) return null;
        const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
        const d = new Date(v);
        return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const hoyLocal = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); };
    const fmt = d => d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() : '-';
    const iso = d => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '';

    /** Fecha en que cumple N meses (si el día no existe, último día del mes). */
    function sumarMeses(d, n) {
        const y = d.getFullYear(), m = d.getMonth() + n;
        const r = new Date(y, m, 1);
        const ult = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
        return new Date(r.getFullYear(), r.getMonth(), Math.min(d.getDate(), ult));
    }
    function edadTexto(nac, hoy) {
        let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + hoy.getMonth() - nac.getMonth();
        if (hoy.getDate() < nac.getDate()) meses--;
        const base = sumarMeses(nac, meses);
        const dias = Math.round((hoy - base) / 86400000);
        return { meses, dias, texto: `${meses} ${meses === 1 ? 'mes' : 'meses'}` + (dias ? ` y ${dias} ${dias === 1 ? 'día' : 'días'}` : '') };
    }

    /* ---------- Cálculo de casos ---------- */
    async function leer(tipo) {
        const path = AsociacionesModule.getRef(tipo);
        const snap = await OfflineModule.cachedRead(`${tipo === 'novelties' ? 'novelties' : 'archived'}:${path}`, () => database.ref(path).once('value'));
        const data = (snap && snap.val && snap.val()) || {};
        return Object.entries(data).map(([id, v]) => ({ id, _path: `${path}/${id}`, _origen: tipo === 'novelties' ? 'Activa' : 'Archivada', ...v }));
    }

    function calcular(todas) {
        const hoy = hoyLocal();
        // Retiros por documento → fecha más reciente
        const retiros = {};
        todas.forEach(n => {
            const esRet = n.type === 'retiro' || n.type === 'ambos' || n.hasRetiro;
            const r = n.retiro;
            if (!esRet || !r || !r.document) return;
            const f = parseFecha(r.retiroDate) || parseFecha(n.timestamp) || new Date(0);
            if (!retiros[r.document] || f > retiros[r.document]) retiros[r.document] = f;
        });
        // Ingresos de menores de 6 meses (el más reciente por documento)
        const porDoc = {};
        todas.forEach(n => {
            const esIng = n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso;
            const i = n.ingreso;
            if (!esIng || !i || !i.document) return;
            const tipo = n.tipoBeneficiario || i.tipoBeneficiario || (n.nutricion && n.nutricion.tipo);
            if (tipo !== 'menor_6_meses') return;
            const fIng = parseFecha(i.ingresoDate || i.date || n.ingresoDate || n.timestamp) || new Date(0);
            const prev = porDoc[i.document];
            if (!prev || fIng > prev._fIng) porDoc[i.document] = Object.assign({}, n, { _fIng: fIng });
        });
        const casos = [];
        Object.values(porDoc).forEach(n => {
            const i = n.ingreso;
            if (n.cambioTipo && n.cambioTipo.realizado) return;
            const rf = retiros[i.document];
            if (rf && rf >= n._fIng) return;                       // ya fue retirado
            const nac = parseFecha(i.dob || i.birthDate || i.fechaNacimiento);
            if (!nac) return;
            const cumple6 = sumarMeses(nac, 6);
            if (hoy < cumple6) return;                              // aún es menor de 6 meses
            const edad = edadTexto(nac, hoy);
            casos.push({
                id: n.id, path: n._path, origen: n._origen,
                doc: `${i.docType || ''} ${i.document}`.trim(), documento: i.document,
                nombre: i.name || n.name || '-',
                uds: n.udsName || n.udsFull || '-', contrato: n.contract || n.contrato || '-',
                modalidad: n.modalidad || '-',
                nac, cumple6, edad, atraso: Math.round((hoy - cumple6) / 86400000),
                ingreso: n._fIng
            });
        });
        casos.sort((a, b) => b.atraso - a.atraso);
        return casos;
    }

    async function cargar(forzar) {
        if (_cargando) return _casos;
        if (!forzar && Date.now() - _ultimaCarga < 120000) return _casos;
        _cargando = true;
        try {
            const [a, b] = await Promise.all([leer('novelties'), leer('archived')]);
            _casos = calcular(a.concat(b));
            _ultimaCarga = Date.now();
        } catch (e) {
            console.error('[CambioTipo]', e);
        } finally { _cargando = false; }
        actualizarBadge();
        return _casos;
    }

    function actualizarBadge() {
        const b = $('countCambioTipo');
        if (b) { b.textContent = _casos.length; b.classList.toggle('admin-tab-count--danger', _casos.length > 0); }
    }
    const actualizarContador = () => { cargar(false); };

    /* ---------- Ventana ---------- */
    function construir() {
        if ($('cambioTipoOverlay')) return;
        const ov = document.createElement('div');
        ov.id = 'cambioTipoOverlay';
        ov.className = 'ct-overlay';
        ov.innerHTML = `
        <div class="ct-box" role="dialog" aria-modal="true" aria-labelledby="ctTitulo">
            <div class="ct-head">
                <div class="ct-icon">🔄</div>
                <div style="flex:1">
                    <h2 id="ctTitulo">Cambio de tipo de beneficiario</h2>
                    <p>Participantes activos que eran <b>menores de 6 meses</b> y ya cumplieron 6 meses: pasan a <b>6 meses a 5 años</b>.</p>
                </div>
                <button type="button" class="ct-x" id="ctCerrar" aria-label="Cerrar">✕</button>
            </div>
            <div class="ct-tools">
                <input type="search" id="ctBuscar" placeholder="Buscar por nombre, documento o UDS…">
                <span id="ctResumen" class="ct-resumen"></span>
                <button type="button" class="ct-btn" id="ctRecargar">↻ Actualizar</button>
                <button type="button" class="ct-btn" id="ctExcel">⬇ Excel</button>
            </div>
            <div class="ct-body" id="ctBody"></div>
            <div class="ct-foot">Edad calculada con la fecha de nacimiento y la fecha de hoy. Tras cambiar el tipo en la plataforma, use <b>Marcar actualizado</b> para quitar el caso de la lista.</div>
        </div>`;
        document.body.appendChild(ov);
        $('ctCerrar').addEventListener('click', cerrar);
        ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('is-open')) cerrar(); });
        $('ctBuscar').addEventListener('input', pintar);
        $('ctRecargar').addEventListener('click', async () => { await cargar(true); pintar(); });
        $('ctExcel').addEventListener('click', exportar);
        $('ctBody').addEventListener('click', e => {
            const b = e.target.closest('[data-ct-ok]');
            if (b) marcar(b.getAttribute('data-ct-ok'));
        });
    }

    function filtrados() {
        const q = ($('ctBuscar') ? $('ctBuscar').value : '').trim().toLowerCase();
        if (!q) return _casos;
        return _casos.filter(c => [c.nombre, c.documento, c.uds, c.contrato].join(' ').toLowerCase().includes(q));
    }

    function pintar() {
        const lista = filtrados();
        $('ctResumen').textContent = `${lista.length} de ${_casos.length} caso(s)`;
        if (!lista.length) {
            $('ctBody').innerHTML = `<div class="ct-vacio">${_casos.length ? 'Sin resultados para la búsqueda.' : '✅ No hay menores de 6 meses activos que hayan superado los 6 meses.'}</div>`;
            return;
        }
        $('ctBody').innerHTML = `<div class="ct-tabla"><table>
            <thead><tr><th>Beneficiario</th><th>Documento</th><th>UDS / Contrato</th><th>Nacimiento</th><th>Edad hoy</th><th>Cumplió 6 meses</th><th></th></tr></thead>
            <tbody>${lista.map(c => `<tr>
                <td><b>${esc(String(c.nombre).toUpperCase())}</b><br><small>${esc(c.origen)} · ingresó ${fmt(c.ingreso)}</small></td>
                <td>${esc(c.doc)}</td>
                <td>${esc(c.uds)}<br><small>${esc(c.contrato)}</small></td>
                <td>${fmt(c.nac)}</td>
                <td>${esc(c.edad.texto)}</td>
                <td>${fmt(c.cumple6)}<br><small class="${c.atraso > 30 ? 'ct-rojo' : 'ct-ambar'}">hace ${c.atraso} ${c.atraso === 1 ? 'día' : 'días'}</small></td>
                <td><button type="button" class="ct-btn ct-ok" data-ct-ok="${esc(c.id)}">Marcar actualizado</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    }

    async function marcar(id) {
        const c = _casos.find(x => x.id === id);
        if (!c) return;
        if (!confirm(`¿Ya cambió a ${String(c.nombre).toUpperCase()} (${c.doc}) a "6 meses a 5 años" en la plataforma?`)) return;
        try {
            await database.ref(c.path).update({
                cambioTipo: { realizado: true, tipoNuevo: 'estandar', fecha: new Date().toISOString() }
            });
            _casos = _casos.filter(x => x.id !== id);
            actualizarBadge(); pintar();
            if (typeof showToast === 'function') showToast('✅ Caso marcado como actualizado', 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast('Error al guardar: ' + e.message, 'error');
        }
    }

    function exportar() {
        const lista = filtrados();
        if (!lista.length) { if (typeof showToast === 'function') showToast('No hay casos para exportar', 'warning'); return; }
        if (typeof XLSX === 'undefined') { if (typeof showToast === 'function') showToast('No se pudo cargar la librería de Excel', 'error'); return; }
        const filas = lista.map(c => ({
            'Nombre': String(c.nombre).toUpperCase(), 'Tipo documento / N°': c.doc, 'UDS': c.uds, 'Contrato': c.contrato,
            'Fecha nacimiento': iso(c.nac), 'Edad hoy': c.edad.texto, 'Cumplió 6 meses': iso(c.cumple6),
            'Días desde que cumplió': c.atraso, 'Fecha ingreso': iso(c.ingreso), 'Tipo nuevo': '6 meses a 5 años'
        }));
        const ws = XLSX.utils.json_to_sheet(filas);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cambio de tipo');
        XLSX.writeFile(wb, `cambio_tipo_beneficiario_${iso(hoyLocal())}.xlsx`);
    }

    function cerrar() { const ov = $('cambioTipoOverlay'); if (ov) ov.classList.remove('is-open'); document.body.style.overflow = ''; }

    async function abrir() {
        construir();
        $('cambioTipoOverlay').classList.add('is-open');
        document.body.style.overflow = 'hidden';
        $('ctBody').innerHTML = '<div class="ct-vacio">Calculando…</div>';
        await cargar(true);
        pintar();
    }

    return { abrir, cerrar, actualizarContador, _calcular: calcular };
})();
