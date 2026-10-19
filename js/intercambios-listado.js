// ==================== INTERCAMBIOS EN LAS LISTAS DE MERCADO ====================
// Panel de generación de listado (section-calculator = semanal, section-monthly = mensual).
//
//   Paso 1  Botón sutil ⇄ junto al nombre del alimento (dentro de la celda "Producto").
//   Paso 2  Al pulsarlo se abre un Drawer lateral (cristal/oscuro) sin ocultar la tabla.
//   Paso 3  Se elige el sustituto en una lista desplegable del MISMO grupo de alimentos
//           (o se escribe otro) y se guarda.
//   Paso 4  La fila queda marcada con el badge "🔄 Intercambiado".
//
// Es EL MISMO sistema de intercambios del módulo de Actas: comparte su almacén
// (_actaIntercambiosRows = [{ producto, intercambio }]) y sus funciones de guardado
// (guardarIntercambios / _intercambiosPersistir). Por eso lo registrado aquí:
//   • se guarda en el directorio abierto (igual que el modal "🔄 Intercambios"),
//   • se escribe en la columna CUMPLE del acta ("Se da X"),
//   • se ve también en el modal de Directorio/Actas, y viceversa.
//
// Depende de: actas.js (almacén y guardado), globals.js (getCurrentDB, currentData,
// monthlyData), auxiliares.js (showToast). Debe cargarse DESPUÉS de actas.js.
(function () {
    'use strict';

    var SENTINEL_OTRO = '__otro__';

    var CATS = {
        granos:    { label: 'Granos',    icon: '🌾', rgb: '245,158,11' },
        proteinas: { label: 'Proteínas', icon: '🥩', rgb: '239,68,68'  },
        lacteos:   { label: 'Lácteos',   icon: '🥛', rgb: '59,130,246' },
        verduras:  { label: 'Verduras',  icon: '🥬', rgb: '16,185,129' },
        frutas:    { label: 'Frutas',    icon: '🍎', rgb: '236,72,153' },
        panaderia: { label: 'Panadería', icon: '🥖', rgb: '139,92,246' }
    };

    // Lucide "arrow-left-right" (⇄), hereda el color del texto
    var ICON_SWAP =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>';

    // Estado del drawer
    var S = { abierto: false, nombre: null, ctx: 'semanal', trigger: null };

    // ---------- utilidades ----------
    function $(id) { return document.getElementById(id); }
    function norm(s) { return String(s == null ? '' : s).trim(); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Almacén compartido con Actas. Se lee SIEMPRE fresco: intercambiosCambiarDirectorio()
    // reemplaza el arreglo completo al abrir/cerrar directorios.
    function filas() {
        return (typeof _actaIntercambiosRows !== 'undefined' && Array.isArray(_actaIntercambiosRows))
            ? _actaIntercambiosRows : [];
    }

    // Intercambios COMPLETOS (producto + texto) de un producto: [{ idx, texto }].
    // Las filas a medio llenar del modal de Actas no cuentan (igual que aplicarIntercambios).
    function listaDe(nombre) {
        var n = norm(nombre), out = [];
        filas().forEach(function (r, i) {
            var t = norm(r && r.intercambio);
            if (norm(r && r.producto) === n && t) out.push({ idx: i, texto: t });
        });
        return out;
    }

    function datosDe(ctx) {
        try { return ctx === 'mensual' ? monthlyData : currentData; } catch (e) { return null; }
    }

    function contextoDeElemento(el) {
        return (el && el.closest && el.closest('#monthlyTable')) ? 'mensual' : 'semanal';
    }

    // ---------- HTML que insertan las tablas ----------

    function marcaHtml(nombre) {
        var l = listaDe(nombre);
        if (!l.length) return { sig: '', html: '' };
        var textos = l.map(function (x) { return x.texto; });
        var joined = textos.join(' / ');
        return {
            sig: textos.join('\u0001'),
            html: '<button type="button" class="swap-badge" data-swap-prod="' + esc(nombre) + '" ' +
                'data-swap-to="' + esc(joined) + '" ' +
                'title="Se da: ' + esc(joined) + ' \u2014 clic para editar" ' +
                'aria-label="' + esc(nombre) + ' intercambiado por ' + esc(joined) + '. Editar intercambio">' +
                '\uD83D\uDD04 Intercambiado</button>'
        };
    }

    // Botón ⇄ + contenedor del badge. Se inserta dentro de .product-name.
    function intercambioControlesHtml(nombre) {
        var m = marcaHtml(nombre);
        return '<button type="button" class="swap-btn no-print" data-swap-prod="' + esc(nombre) + '" ' +
            'title="Intercambiar este alimento" aria-label="Intercambiar ' + esc(norm(nombre)) + '">' +
            ICON_SWAP + '</button>' +
            '<span class="swap-slot" data-swap-slot="' + esc(nombre) + '" data-swap-sig="' + esc(m.sig) + '">' +
            m.html + '</span>';
    }

    // Clase para <tr> (tinte de la fila intercambiada)
    function intercambioClaseFila(nombre) {
        return listaDe(nombre).length ? 'row-swapped' : '';
    }

    // Sincroniza badges/tintes de ambas tablas con el almacén. Barato y sin
    // reconstruir nada que no haya cambiado.
    function intercambiosRefrescarMarcas() {
        var slots = document.querySelectorAll('[data-swap-slot]');
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            var m = marcaHtml(slot.getAttribute('data-swap-slot'));
            if (slot.getAttribute('data-swap-sig') !== m.sig) {
                slot.innerHTML = m.html;
                slot.setAttribute('data-swap-sig', m.sig);
            }
            var tr = slot.closest('tr');
            if (tr) tr.classList.toggle('row-swapped', !!m.html);
        }
    }

    // Destello de la fila/badge que acaba de cambiar (Paso 4)
    function destacarFila(nombre) {
        var n = norm(nombre);
        var slots = document.querySelectorAll('[data-swap-slot]');
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            if (norm(slot.getAttribute('data-swap-slot')) !== n) continue;
            var badge = slot.querySelector('.swap-badge');
            var tr = slot.closest('tr');
            if (badge) { badge.classList.remove('is-new'); void badge.offsetWidth; badge.classList.add('is-new'); }
            if (tr) {
                tr.classList.remove('swap-flash'); void tr.offsetWidth; tr.classList.add('swap-flash');
                (function (row) { setTimeout(function () { row.classList.remove('swap-flash'); }, 2100); })(tr);
            }
        }
    }

    // ---------- almacén: agregar / quitar ----------

    function notificarCambio() {
        // guardarIntercambios() marca "hay cambios", programa el guardado y refresca las marcas
        // (gancho en actas.js). _intercambiosPersistir() escribe ya en el directorio abierto.
        if (typeof guardarIntercambios === 'function') guardarIntercambios();
        if (typeof _intercambiosPersistir === 'function') _intercambiosPersistir();
        intercambiosRefrescarMarcas();
    }

    function agregarIntercambio(nombre, texto) {
        var arr = filas();
        var n = norm(nombre);
        var destino = null, i;
        // 1) fila del mismo producto que quedó sin texto (a medio llenar en el modal de Actas)
        for (i = 0; i < arr.length && !destino; i++) {
            if (norm(arr[i].producto) === n && !norm(arr[i].intercambio)) destino = arr[i];
        }
        // 2) fila totalmente en blanco (la que deja el modal de Actas para empezar a escribir)
        for (i = 0; i < arr.length && !destino; i++) {
            if (!norm(arr[i].producto) && !norm(arr[i].intercambio)) destino = arr[i];
        }
        if (destino) { destino.producto = nombre; destino.intercambio = texto; }
        else arr.push({ producto: nombre, intercambio: texto });
        notificarCambio();
    }

    function quitarIntercambio(idx) {
        var arr = filas();
        if (!arr[idx]) return;
        arr.splice(idx, 1);
        notificarCambio();
    }

    // ---------- Drawer ----------

    function categoriaDe(nombre, ctx) {
        var datos = datosDe(ctx);
        var item = datos && datos[nombre];
        var prod = null;
        try { prod = getCurrentDB().find(function (p) { return p.n === nombre; }) || null; } catch (e) {}
        var c = (item && item.c) || (prod && prod.c) || '';
        return { clave: c, info: CATS[c] || { label: 'Otros', icon: '📦', rgb: '148,163,184' },
                 unidad: (item && item.u) || (prod && prod.u) || '' };
    }

    // Sustitutos posibles: alimentos del MISMO grupo, sin el propio producto ni los ya registrados
    function opcionesSustituto(nombre, ctx, claveCat) {
        var ya = listaDe(nombre).map(function (x) { return x.texto.toLowerCase(); });
        var propio = norm(nombre).toLowerCase();
        var datos = datosDe(ctx) || {};
        var enLista = {};
        Object.keys(datos).forEach(function (k) { enLista[norm(k).toLowerCase()] = true; });
        var vistos = {}, out = [];
        var db = [];
        try { db = getCurrentDB(); } catch (e) {}
        db.forEach(function (p) {
            var nom = norm(p.n), low = nom.toLowerCase();
            if (p.c !== claveCat || low === propio || vistos[low] || ya.indexOf(low) >= 0) return;
            vistos[low] = true;
            out.push({ valor: nom, enLista: !!enLista[low] });
        });
        out.sort(function (a, b) { return a.valor.localeCompare(b.valor, 'es'); });
        return out;
    }

    function notaDirectorioHtml() {
        var dir = (typeof _intercambiosDirNombre !== 'undefined') ? _intercambiosDirNombre : null;
        if (dir) {
            return '<div class="swap-note swap-note-ok">\uD83D\uDCC2 <b>' + esc(dir) + '</b> \u2014 el intercambio se guarda ' +
                'en este directorio y se escribe en la columna <b>Cumple</b> del acta.</div>';
        }
        return '<div class="swap-note swap-note-warn">\u26A0\uFE0F No hay un directorio abierto: el intercambio solo vale ' +
            'para esta sesi\u00F3n y <b>no se guarda</b>. Abra un directorio guardado para dejarlo asociado a esa semana.</div>';
    }

    function renderCuerpo(conservar) {
        var body = $('swapDrawerBody');
        if (!body) return;

        // Conservar lo que el usuario ya eligió/escribió si solo se quita un intercambio
        var selPrev = '', otroPrev = '';
        if (conservar) {
            if ($('swapSelect')) selPrev = $('swapSelect').value;
            if ($('swapOtro')) otroPrev = $('swapOtro').value;
        }

        var nombre = S.nombre, ctx = S.ctx;
        var cat = categoriaDe(nombre, ctx);
        var actuales = listaDe(nombre);
        var opciones = opcionesSustituto(nombre, ctx, cat.clave);

        var html = '';
        html += '<div class="swap-prod" style="--swap-cat-rgb:' + cat.info.rgb + '">' +
                '<div class="swap-prod-ico" aria-hidden="true">' + cat.info.icon + '</div>' +
                '<div class="swap-prod-info"><div class="swap-prod-name">' + esc(norm(nombre)) + '</div>' +
                '<div class="swap-prod-meta"><span class="swap-chip swap-chip-cat">' + esc(cat.info.label) + '</span>' +
                (cat.unidad ? '<span class="swap-chip">' + esc(cat.unidad) + '</span>' : '') +
                '</div></div></div>';

        html += notaDirectorioHtml();

        if (actuales.length) {
            html += '<section><div class="swap-label">Intercambios actuales</div>' +
                actuales.map(function (x) {
                    return '<div class="swap-current"><span class="swap-current-arrow" aria-hidden="true">\u2194</span>' +
                        '<span class="swap-current-text">' + esc(x.texto) + '</span>' +
                        '<button type="button" class="swap-current-remove" data-swap-remove="' + x.idx + '" ' +
                        'title="Quitar este intercambio" aria-label="Quitar intercambio con ' + esc(x.texto) + '">\u2715</button></div>';
                }).join('') +
                '</section>';
        }

        var opts = '<option value="">\u2014 Elegir alimento del grupo ' + esc(cat.info.label) + ' \u2014</option>';
        opciones.forEach(function (o) {
            opts += '<option value="' + esc(o.valor) + '">' + esc(o.valor) + (o.enLista ? '  (ya est\u00E1 en esta lista)' : '') + '</option>';
        });
        opts += '<option value="' + SENTINEL_OTRO + '">\u270F\uFE0F Otro alimento (escribir)\u2026</option>';

        html += '<section>' +
            '<label class="swap-label" for="swapSelect">' + (actuales.length ? 'Agregar otro sustituto' : 'Sustituir por') +
            ' <span class="swap-label-hint">\u00B7 grupo ' + esc(cat.info.label) + '</span></label>' +
            '<select id="swapSelect" class="swap-field">' + opts + '</select>' +
            '<input id="swapOtro" type="text" class="swap-field" maxlength="60" autocomplete="off" hidden ' +
            'placeholder="Nombre del alimento sustituto (ej: Naranja)">' +
            '<div class="swap-error" id="swapError" role="alert"></div>' +
            '</section>';

        body.innerHTML = html;

        var sel = $('swapSelect'), otro = $('swapOtro');
        if (selPrev && sel.querySelector('option[value="' + selPrev.replace(/"/g, '\\"') + '"]')) sel.value = selPrev;
        if (otroPrev) otro.value = otroPrev;
        otro.hidden = (sel.value !== SENTINEL_OTRO);
        actualizarEstado();
    }

    function valorActual() {
        var sel = $('swapSelect');
        if (!sel) return '';
        if (sel.value === SENTINEL_OTRO) return norm($('swapOtro') && $('swapOtro').value);
        return norm(sel.value);
    }

    function yaRegistrado(texto) {
        var t = norm(texto).toLowerCase();
        return listaDe(S.nombre).some(function (x) { return x.texto.toLowerCase() === t; });
    }

    // Habilita/deshabilita "Guardar" y muestra cómo quedará en el acta
    function actualizarEstado() {
        var valor = valorActual();
        var dup = valor && yaRegistrado(valor);
        var mismo = valor && norm(valor).toLowerCase() === norm(S.nombre).toLowerCase();
        var err = $('swapError'), btn = $('swapDrawerSave'), prev = $('swapDrawerPreview');

        if (err) err.textContent = dup ? 'Ese sustituto ya est\u00E1 registrado para este producto.'
                                      : (mismo ? 'El sustituto no puede ser el mismo alimento.' : '');
        if (btn) btn.disabled = !valor || !!dup || !!mismo;

        var textos = listaDe(S.nombre).map(function (x) { return x.texto; });
        if (valor && !dup && !mismo) textos.push(valor);
        if (prev) {
            prev.innerHTML = 'Columna <b>Cumple</b> del acta: ' +
                (textos.length ? '<b>Se da ' + esc(textos.join(' / ')) + '</b>' : '<b>sin intercambio</b>');
        }
    }

    function abrir(nombre, ctx, trigger) {
        var drawer = $('swapDrawer'), overlay = $('swapOverlay');
        if (!drawer || !overlay) return;
        // Un solo panel lateral a la vez
        if (typeof cerrarDetalleProducto === 'function') { try { cerrarDetalleProducto(); } catch (e) {} }

        S.nombre = nombre;
        S.ctx = ctx === 'mensual' ? 'mensual' : 'semanal';
        S.trigger = trigger || null;
        S.abierto = true;

        var sub = $('swapDrawerCtx');
        if (sub) sub.textContent = S.ctx === 'mensual' ? 'Listado mensual' : 'Lista semanal';

        renderCuerpo(false);

        overlay.classList.add('open');
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // focus() fuerza el recálculo de estilos, así que el elemento ya es enfocable
        var sel = $('swapSelect');
        if (sel) sel.focus({ preventScroll: true });
    }

    function cerrar(sinRestaurarFoco) {
        if (!S.abierto) return;
        var drawer = $('swapDrawer'), overlay = $('swapOverlay');
        if (overlay) overlay.classList.remove('open');
        if (drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
        document.body.style.overflow = '';
        S.abierto = false;
        var t = S.trigger;
        S.trigger = null;
        if (!sinRestaurarFoco && t && document.body.contains(t)) { try { t.focus(); } catch (e) {} }
    }

    function guardar() {
        var valor = valorActual();
        var err = $('swapError');
        if (!valor) { if (err) err.textContent = 'Elige un alimento sustituto.'; return; }
        if (yaRegistrado(valor)) { actualizarEstado(); return; }
        if (norm(valor).toLowerCase() === norm(S.nombre).toLowerCase()) { actualizarEstado(); return; }

        var nombre = S.nombre;
        agregarIntercambio(nombre, valor);
        cerrar();
        destacarFila(nombre);

        var dir = (typeof _intercambiosDirNombre !== 'undefined') ? _intercambiosDirNombre : null;
        var msg = esc(norm(nombre)) + ' \u2192 ' + esc(valor);
        if (typeof showToast === 'function') {
            if (dir) showToast('Intercambio guardado en \u201C' + esc(dir) + '\u201D: ' + msg, 'success');
            else showToast('Intercambio aplicado (' + msg + '). No hay directorio abierto: no se guardar\u00E1.', 'warning');
        }
    }

    // Mantiene el foco dentro del drawer mientras está abierto (aria-modal)
    function atraparTab(e) {
        var drawer = $('swapDrawer');
        var f = Array.prototype.filter.call(
            drawer.querySelectorAll('button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])'),
            function (el) { return !el.hidden && el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    // ---------- eventos ----------
    function init() {
        // Botón ⇄ y badge (delegado: las tablas se regeneran con cada filtro/búsqueda)
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.swap-btn[data-swap-prod], .swap-badge[data-swap-prod]');
            if (btn) {
                e.preventDefault();
                abrir(btn.getAttribute('data-swap-prod'), contextoDeElemento(btn), btn);
            }
        });

        var overlay = $('swapOverlay'), drawer = $('swapDrawer');
        if (!overlay || !drawer) return;

        overlay.addEventListener('click', function () { cerrar(); });
        $('swapDrawerClose').addEventListener('click', function () { cerrar(); });
        $('swapDrawerCancel').addEventListener('click', function () { cerrar(); });
        $('swapDrawerSave').addEventListener('click', guardar);

        var body = $('swapDrawerBody');
        body.addEventListener('change', function (e) {
            if (e.target.id !== 'swapSelect') return;
            var otro = $('swapOtro');
            otro.hidden = (e.target.value !== SENTINEL_OTRO);
            if (!otro.hidden) otro.focus();
            actualizarEstado();
        });
        body.addEventListener('input', function (e) { if (e.target.id === 'swapOtro') actualizarEstado(); });
        body.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.id === 'swapOtro') { e.preventDefault(); guardar(); }
        });
        body.addEventListener('click', function (e) {
            var rm = e.target.closest && e.target.closest('[data-swap-remove]');
            if (!rm) return;
            quitarIntercambio(parseInt(rm.getAttribute('data-swap-remove'), 10));
            renderCuerpo(true);
        });

        document.addEventListener('keydown', function (e) {
            if (!S.abierto) return;
            if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
            else if (e.key === 'Tab') atraparTab(e);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // ---------- API global (usada por las tablas y por actas.js) ----------
    window.intercambioControlesHtml = intercambioControlesHtml;
    window.intercambioClaseFila = intercambioClaseFila;
    window.intercambiosRefrescarMarcas = intercambiosRefrescarMarcas;
    window.abrirDrawerIntercambio = function (nombre, ctx) { abrir(nombre, ctx, null); };
    window.cerrarDrawerIntercambio = function () { cerrar(); };
})();
