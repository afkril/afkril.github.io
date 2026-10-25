// ══════════ Badges "NUEVO" parpadeantes ══════════
// Cada badge desaparece (y no vuelve a aparecer) cuando el usuario presiona
// el botón/control al que pertenece. Se recuerda en localStorage por navegador.
(function () {
    'use strict';
    var STORAGE_KEY = 'smartMenu_badgesNuevoVistos_v1';
    var SELECTOR = '.badge-nuevo, .dir-tool-badge';
    var HOST_SELECTOR = 'button, label, a, .form-group';

    function leerVistos() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch (e) { return []; }
    }
    function guardarVistos(arr) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
    }

    function textoLimpio(host) {
        var clon = host.cloneNode(true);
        clon.querySelectorAll(SELECTOR).forEach(function (b) { b.remove(); });
        return (clon.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    }

    // Clave estable por control: id > onclick > data-section > texto visible
    function claveDe(host, indice) {
        var base = host.id
            || host.getAttribute('onclick')
            || host.getAttribute('data-section')
            || (host.querySelector('select[id], input[id]') || {}).id
            || textoLimpio(host)
            || ('idx' + indice);
        return (String(base).replace(/\s+/g, ' ').slice(0, 100) + '|' + (host.className || '').toString().slice(0, 30));
    }

    function iniciar() {
        var vistos = leerVistos();
        var badges = document.querySelectorAll(SELECTOR);

        badges.forEach(function (badge, i) {
            var host = badge.closest(HOST_SELECTOR) || badge.parentElement;
            if (!host) return;
            var clave = claveDe(host, i);

            if (vistos.indexOf(clave) !== -1) { badge.remove(); return; }

            function marcarVisto() {
                if (badge.parentNode) badge.remove();
                var actuales = leerVistos();
                if (actuales.indexOf(clave) === -1) { actuales.push(clave); guardarVistos(actuales); }
                ['click', 'focusin', 'change'].forEach(function (ev) { host.removeEventListener(ev, marcarVisto, true); });
            }
            // click (botones, labels, nav), focusin/change (selects dentro de .form-group)
            ['click', 'focusin', 'change'].forEach(function (ev) { host.addEventListener(ev, marcarVisto, true); });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
