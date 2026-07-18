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
            const toggle = document.getElementById('themeToggle');
            if (toggle) toggle.classList.toggle('active');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        }

if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('themeToggle');
            if (toggle) toggle.classList.add('active');
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
