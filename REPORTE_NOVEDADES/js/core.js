// ============================================================
// CORE.JS — Utilidades y estado compartido de toda la aplicación
// (helpers genéricos, tema, reloj, toasts, paleta de colores)
// Debe cargarse antes que los demás módulos.
// ============================================================

function formatDateDMY(dateStr) {
            if (!dateStr || dateStr === '-') return dateStr || '-';
            // Si ya tiene formato DD/MM/YYYY, devolver tal cual
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
            // Si tiene formato YYYY-MM-DD, convertir
            const parts = dateStr.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        }

if (!window.UDS_DATA) window.UDS_DATA = {};

const PALETTE_BACKGROUNDS = [
            'linear-gradient(to bottom right, #fef3c7, #fbbf24)',
            'linear-gradient(to bottom right, #dbeafe, #3b82f6)',
            'linear-gradient(to bottom right, #d1fae5, #10b981)',
            'linear-gradient(to bottom right, #fce7f3, #ec4899)',
            'linear-gradient(to bottom right, #ede9fe, #8b5cf6)',
            'linear-gradient(to bottom right, #ffedd5, #f97316)',
        ];

const BACKGROUNDS = new Proxy({}, {
            get(target, prop) {
                if (prop === 'default') return 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)';
                const contratos = Object.keys(window.UDS_DATA);
                const idx = contratos.indexOf(prop);
                if (idx >= 0) return PALETTE_BACKGROUNDS[idx % PALETTE_BACKGROUNDS.length];
                return 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)';
            }
        });

function updateClock() {
            const now = new Date();
            const date = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const clockEl = document.getElementById('clockDisplay');
            if (clockEl) clockEl.textContent = `${date} | ${time}`;
        }

setInterval(updateClock, 1000);

updateClock();

function showToast(message, type = 'info', duration = 2500) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const icons = { success: '✅', error: '❌', warning: '⚠', info: 'ℹ' };
            toast.innerHTML = `<span style="font-weight:bold">${icons[type]}</span><span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), duration);
        }

function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.querySelectorAll('.theme-toggle').forEach(t => t.classList.toggle('active', isDark));
            localStorage.setItem('darkMode', isDark);
        }

if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.querySelectorAll('.theme-toggle').forEach(t => t.classList.add('active'));
        }

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ════════════════════════════════════════════════════════════
// BARRA DE PROGRESO DE ENVÍO (usada por el formulario de novedades
// y por las acciones especiales de Consulta UDS). Se controla con
// un único "estado" reportado por OfflineModule.submitNovedad():
//   preparando -> guardando -> correo -> correo-ok | correo-error | listo
//   (o "encolado" si no hubo confirmación a tiempo y quedó en cola)
// ════════════════════════════════════════════════════════════
const EnvioProgresoUI = (() => {

    const ORDEN = ['preparando', 'guardando', 'correo'];

    function mostrar() {
        document.getElementById('epOverlay')?.classList.add('is-open');
        setEstado('preparando');
    }

    function ocultar(delay = 400) {
        setTimeout(() => document.getElementById('epOverlay')?.classList.remove('is-open'), delay);
    }

    function setEstado(estado) {
        const overlay = document.getElementById('epOverlay');
        if (!overlay) return;

        const pasoEquivalente = (estado === 'correo-ok' || estado === 'correo-error' || estado === 'listo') ? 'correo' : estado;
        const idxActual = ORDEN.indexOf(pasoEquivalente === 'encolado' ? 'guardando' : pasoEquivalente);

        ORDEN.forEach((p, i) => {
            const li = document.getElementById('epPaso-' + p);
            if (!li) return;
            li.classList.remove('is-active', 'is-done', 'is-error');
            if (estado === 'correo-error' && p === 'correo') { li.classList.add('is-error'); return; }
            if (i < idxActual || estado === 'correo-ok' || estado === 'listo') li.classList.add('is-done');
            else if (i === idxActual) li.classList.add('is-active');
        });

        const fill = document.getElementById('epBarraFill');
        const pct = { preparando: 15, guardando: 55, encolado: 70, correo: 85, 'correo-ok': 100, 'correo-error': 100, listo: 100 }[estado] || 10;
        if (fill) fill.style.width = pct + '%';

        const titulo = document.getElementById('epTitulo');
        if (titulo) {
            titulo.textContent = {
                preparando: 'Preparando información…',
                guardando: 'Guardando en el sistema…',
                encolado: 'Conexión inestable: guardado en este dispositivo…',
                correo: 'Guardado ✅ — enviando notificación por correo…',
                'correo-ok': '¡Listo! Correo enviado.',
                'correo-error': 'Guardado ✅ (el correo se reintentará solo)',
                listo: '¡Listo!'
            }[estado] || 'Procesando…';
        }
    }

    // Toast pequeño y no bloqueante para reportar el correo cuando el
    // overlay principal ya se cerró (el formulario sigue libre de usarse).
    function miniToast(texto, autoOcultarMs = null) {
        const el = document.getElementById('epMiniToast');
        if (!el) return;
        document.getElementById('epMiniToastTexto').textContent = texto;
        el.classList.add('is-visible');
        if (autoOcultarMs) setTimeout(() => el.classList.remove('is-visible'), autoOcultarMs);
    }

    function miniToastOcultar() {
        document.getElementById('epMiniToast')?.classList.remove('is-visible');
    }

    return { mostrar, ocultar, setEstado, miniToast, miniToastOcultar };
})();

// ════════════════════════════════════════════════════════════
// Comprimir imágenes en el cliente antes de adjuntarlas
// ════════════════════════════════════════════════════════════
// Las fotos tomadas con celular suelen pesar 3-8 MB. Convertidas a
// base64 (+33% de tamaño) y subidas a Google Apps Script/Drive, eso
// es la parte que más tiempo toma en todo el envío de una novedad.
// Esta función reduce esa foto a un tamaño razonable para el caso de
// uso (soporte documental, no una foto de estudio) ANTES de leerla
// como base64, sin tocar el resto del flujo de envío.
//
// Si el archivo no es una imagen (p.ej. un PDF), se devuelve tal cual.
async function comprimirImagenSiAplica(file, maxDim = 1600, calidad = 0.72) {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        let { width, height } = bitmap;

        if (width <= maxDim && height <= maxDim && file.size < 900 * 1024) {
            // Ya es razonablemente pequeña: no vale la pena recomprimir.
            bitmap.close?.();
            return file;
        }

        const escala = Math.min(1, maxDim / Math.max(width, height));
        const nuevoAncho = Math.round(width * escala);
        const nuevoAlto = Math.round(height * escala);

        const canvas = document.createElement('canvas');
        canvas.width = nuevoAncho;
        canvas.height = nuevoAlto;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, nuevoAncho, nuevoAlto);
        bitmap.close?.();

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', calidad));
        if (!blob) return file; // si algo falla, se usa el archivo original

        const nombreBase = (file.name || 'imagen').replace(/\.[^.]+$/, '');
        const comprimido = new File([blob], `${nombreBase}.jpg`, { type: 'image/jpeg' });

        console.log(`[Compresión] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(comprimido.size / 1024).toFixed(0)}KB`);
        return comprimido;
    } catch (e) {
        console.warn('[Compresión] No se pudo comprimir la imagen, se usa el archivo original:', e.message);
        return file; // ante cualquier error, seguir con el archivo tal cual
    }
}
