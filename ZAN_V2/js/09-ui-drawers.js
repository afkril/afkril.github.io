        // ===== DRAWERS =====
        function toggleDrawer(id) {
            const drawer = document.getElementById(`drawer-${id}`);
            const overlay = document.getElementById('overlay');
            const isOpen = drawer.classList.contains('open');

            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));

            if (!isOpen) {
                drawer.classList.add('open');
                overlay.classList.add('active');
                if (id === 'archivo') {
                    currentPath = 'root';
                    busquedaActual = '';
                    document.getElementById('buscar-archivos').value = '';
                    listarCloud();
                }
                if (id === 'resumen') actualizarResumen();
                if (id === 'contabilidad') actualizarVistaContabilidad();
                if (id === 'distribuidora') renderizarValoresDistribuidora();
                if (id === 'facturas') renderizarValidadorFacturas();
            } else {
                overlay.classList.remove('active');
            }
        }

        function closeAllDrawers() {
            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
            document.getElementById('overlay').classList.remove('active');
        }

        function actualizarVistaContabilidad() {
            const datos = generarDatosContabilidad();
            const cont = document.getElementById('accounting-content');

            let html = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                    <div style="background:var(--bg-card-solid); padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size:9px; color:var(--text-dim);">FACTURAS</div>
                        <div style="font-size:16px; color:var(--accent-cyan); font-weight:bold;">${datos.totalFacturas}</div>
                    </div>
                    <div style="background:var(--bg-card-solid); padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size:9px; color:var(--text-dim);">MONTO TOTAL</div>
                        <div style="font-size:16px; color:var(--primary-gold); font-weight:bold;">${formatter.format(datos.montoTotal)}</div>
                    </div>
                </div>
            `;

            for (let provId in datos.porProveedor) {
                const prov = datos.porProveedor[provId];
                if (prov.total === 0) continue;

                const provInfo = getProveedorById(provId);
                
                html += `
                    <div style="background:var(--bg-card-solid); padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid ${provInfo?.color || '#666'};">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-weight:bold; color:${provInfo?.color || '#fff'};">${prov.nombre} (${prov.sigla})</span>
                            <span style="font-size:10px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:10px;">${prov.facturas.size} facturas</span>
                        </div>
                        <div style="font-size:14px; color:var(--primary-gold); font-weight:bold; margin-bottom:8px;">${formatter.format(prov.total)}</div>
                    </div>
                `;
            }

            cont.innerHTML = html;
        }
		// ===== MODO CLARO/OSCURO =====
        (function initTheme() {
            const saved = localStorage.getItem('zan_theme') || 'dark';
            applyTheme(saved);
        })();

        function applyTheme(mode) {
            const html = document.documentElement;
            const icons = document.querySelectorAll('#theme-icon');
            const labels = document.querySelectorAll('#theme-label');
            if (mode === 'light') {
                html.setAttribute('data-theme', 'light');
                icons.forEach(el => el.className = 'fa-solid fa-sun');
                labels.forEach(el => el.textContent = 'Modo Claro');
            } else {
                html.removeAttribute('data-theme');
                icons.forEach(el => el.className = 'fa-solid fa-moon');
                labels.forEach(el => el.textContent = 'Modo Oscuro');
            }
            localStorage.setItem('zan_theme', mode);
        }

        function toggleTheme() {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            applyTheme(isLight ? 'dark' : 'light');
        }

        // ===== HELPER: contraste de color de proveedor en modo claro =====
        // Cuando hay modo claro, el color del proveedor (elegido por el usuario para fondo oscuro)
        // puede ser demasiado claro. Esta función devuelve el color ajustado.
        function getProvColorForMode(hexColor) {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            if (!isLight) return hexColor;
            // Oscurecer el color para que sea legible sobre fondos claros
            return darkenColor(hexColor, 0.35);
        }

        function darkenColor(hex, amount) {
            let col = hex.replace('#', '');
            if (col.length === 3) col = col.split('').map(c => c+c).join('');
            const r = Math.max(0, Math.round(parseInt(col.substring(0,2),16) * (1-amount)));
            const g = Math.max(0, Math.round(parseInt(col.substring(2,4),16) * (1-amount)));
            const b = Math.max(0, Math.round(parseInt(col.substring(4,6),16) * (1-amount)));
            return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
        }


        // ================================================================
        //  SISTEMA DE AJUSTES: MODOS DE VISTA Y TEMAS DE COLOR
        // ================================================================

        // ===== MODO DE VISTA =====
        let vistaActual = localStorage.getItem('zan_vista') || 'tabs';

        function setVistaMode(modo) {
            vistaActual = modo;
            localStorage.setItem('zan_vista', modo);
            applyVistaMode(modo);
            // Actualizar UI del modal
            ['tabs','cards','list','accordion'].forEach(m => {
                const card = document.getElementById(`vista-card-${m}`);
                if (card) card.classList.toggle('activo', m === modo);
            });
        }

        function applyVistaMode(modo) {
            const body = document.body;
            // Quitar todos los modos
            body.removeAttribute('data-view');
            if (modo !== 'tabs') {
                body.setAttribute('data-view', modo);
            }

            // Para acordeón: configurar headers como toggles
            if (modo === 'accordion') {
                setupAccordionMode();
            } else {
                cleanupAccordionMode();
            }
        }

        function setupAccordionMode() {
            const semanas = parseInt(document.getElementById('num-semanas')?.value) || 4;
            for (let s = 1; s <= semanas; s++) {
                const panel = document.getElementById(`panel-${s}`);
                if (!panel) continue;
                const header = panel.querySelector('.panel-header');
                if (!header) continue;

                // Solo configurar una vez
                if (header.dataset.accSetup) continue;
                header.dataset.accSetup = '1';

                // Envolver el contenido del panel (excepto header) en accordion body
                if (!panel.querySelector('.panel-accordion-body')) {
                    const body = document.createElement('div');
                    body.className = 'panel-accordion-body';
                    const inner = document.createElement('div');
                    inner.className = 'accordion-body-inner';

                    // Mover todos los hijos excepto el header al inner
                    const children = Array.from(panel.children).filter(c => !c.classList.contains('panel-header'));
                    children.forEach(c => inner.appendChild(c));
                    body.appendChild(inner);
                    panel.appendChild(body);
                }

                // Agregar chevron al header si no existe
                if (!header.querySelector('.panel-accordion-chevron')) {
                    const chevron = document.createElement('i');
                    chevron.className = 'fa-solid fa-chevron-down panel-accordion-chevron';
                    header.appendChild(chevron);
                }

                // Abrir el primero por defecto
                if (s === 1) panel.classList.add('acc-open');

                header.addEventListener('click', onAccordionHeaderClick);
            }
        }

        function onAccordionHeaderClick(e) {
            // Evitar que clicks en inputs/buttons del header cierren el acordeón
            if (e.target.closest('input, button, select')) return;
            const panel = this.closest('.semana-panel');
            if (!panel) return;
            panel.classList.toggle('acc-open');
        }

        function cleanupAccordionMode() {
            document.querySelectorAll('.panel-header[data-acc-setup]').forEach(h => {
                h.removeEventListener('click', onAccordionHeaderClick);
                delete h.dataset.accSetup;
            });
        }

        // Inicializar vista al cargar
        (function initVista() {
            const saved = localStorage.getItem('zan_vista') || 'tabs';
            // Aplicar después de que el DOM esté listo
            window.addEventListener('DOMContentLoaded', () => {
                applyVistaMode(saved);
                const card = document.getElementById(`vista-card-${saved}`);
                if (card) {
                    document.querySelectorAll('.vista-modo-card').forEach(c => c.classList.remove('activo'));
                    card.classList.add('activo');
                }
            });
        })();

        // Re-aplicar vista cuando se regeneran semanas
        const _origCambiarSemanas = typeof cambiarSemanas === 'function' ? cambiarSemanas : null;

        // Hook into renderSemanas to re-apply view mode
        function reapplyVistaAfterRender() {
            setTimeout(() => {
                applyVistaMode(vistaActual);
            }, 50);
        }

        // ===== TEMA DE COLOR =====
        let colorTemaActual = localStorage.getItem('zan_color_tema') || 'default';

        function setColorTema(tema) {
            colorTemaActual = tema;
            localStorage.setItem('zan_color_tema', tema);
            applyColorTema(tema);
            // Actualizar UI del modal
            ['default','ocean','emerald','twilight','volcano','neon','arctic','toxic','amber','amethyst','quantum','sakura'].forEach(t => {
                const card = document.getElementById(`tema-card-${t}`);
                if (card) card.classList.toggle('activo', t === tema);
            });
        }

        function applyColorTema(tema) {
            const html = document.documentElement;
            // Solo aplicar en modo oscuro
            const isLight = html.getAttribute('data-theme') === 'light';
            if (isLight) {
                html.removeAttribute('data-color-theme');
                return;
            }
            if (tema === 'default') {
                html.removeAttribute('data-color-theme');
            } else {
                html.setAttribute('data-color-theme', tema);
            }
        }

        // Al cambiar tema claro/oscuro, re-aplicar color tema
        const _origToggleTheme = typeof toggleTheme === 'function' ? toggleTheme : null;
        const _origApplyTheme = typeof applyTheme === 'function' ? applyTheme : null;

        // Override applyTheme to also manage color themes
        window.addEventListener('DOMContentLoaded', () => {
            // Restaurar color tema guardado
            const savedTema = localStorage.getItem('zan_color_tema') || 'default';
            applyColorTema(savedTema);

            // Marcar card activo en modal
            const card = document.getElementById(`tema-card-${savedTema}`);
            if (card) {
                document.querySelectorAll('.color-tema-card').forEach(c => c.classList.remove('activo'));
                card.classList.add('activo');
            }

            // Restaurar vista
            const savedVista = localStorage.getItem('zan_vista') || 'tabs';
            applyVistaMode(savedVista);
            const vistaCard = document.getElementById(`vista-card-${savedVista}`);
            if (vistaCard) {
                document.querySelectorAll('.vista-modo-card').forEach(c => c.classList.remove('activo'));
                vistaCard.classList.add('activo');
            }
        });

        // Patch toggleTheme to handle color themes
        const _patchedToggleTheme = window.toggleTheme;
        window.toggleTheme = function() {
            if (_patchedToggleTheme) _patchedToggleTheme();
            // Re-apply color theme after mode change
            setTimeout(() => applyColorTema(colorTemaActual), 50);
        };

