// ==================== NAVEGACION Y UI ====================
        // ══ MÓDULO: Registro de secciones inicializadas (arquitectura lazy) ══
        const _sectionInitialized = {};

        function showSection(section) {
            // Desconectar listener de editor si salimos de esa sección
            const prevSection = document.querySelector('.section.active')?.id?.replace('section-', '');
            if (prevSection === 'editor' && section !== 'editor') {
                _detachEditorRealtime();
            }
            // Inicialización lazy: cada sección se inicializa solo la primera vez
            if (!_sectionInitialized[section]) {
                _sectionInitialized[section] = true;
                if (section === 'directorio') { tabRefreshSelect(); tabRenderizarDirectorio(); sincronizarDesdePanel(); actualizarIndicadorEstado(); provRefreshSelectDirectorio(); }
                if (section === 'proveedores') { provRenderizar(); }
                if (section === 'saved') { showSavedLists(); }
                if (section === 'calendar') { /* renderCalendar se llama abajo */ }
            } else {
                // Re-renders necesarios en visitas posteriores
                if (section === 'directorio') { tabRenderizarDirectorio(); actualizarIndicadorEstado(); }
                if (section === 'proveedores') { provRenderizar(); }
            }
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
            document.getElementById('headerTitle').textContent = `${regionales[currentRegional].titulo} - ${getCurrentTitle()}`;
            // Resetear clases de vista
            document.body.classList.remove('view-monthly', 'view-calendar', 'view-editor');
            document.getElementById('monthlyBadge').style.display = 'none';
            document.getElementById('calendarBadge').style.display = 'none';
            document.getElementById('editorBadge').style.display = 'none';
            document.getElementById('headerIcon').textContent = '🍽️';
            document.getElementById('headerTitle').textContent = 'Lista Mercados';
            document.getElementById('logoIcon').textContent = '🍽️';
            
            if (section === 'monthly') {
                document.body.classList.add('view-monthly');
                document.getElementById('monthlyBadge').style.display = 'inline-block';
                document.getElementById('headerIcon').textContent = '📅';
                document.getElementById('headerTitle').textContent = 'Listado Mensual';
                document.getElementById('logoIcon').textContent = '📅';
            } else if (section === 'calendar') {
                document.body.classList.add('view-calendar');
                document.getElementById('calendarBadge').style.display = 'inline-block';
                document.getElementById('headerIcon').textContent = '📆';
                document.getElementById('headerTitle').textContent = 'Calendario';
                document.getElementById('logoIcon').textContent = '📆';
                renderCalendar(currentMonth);
            } else if (section === 'editor') {
                document.body.classList.add('view-editor');
                document.getElementById('editorBadge').style.display = 'inline-block';
                document.getElementById('headerIcon').textContent = '⚖️';
                document.getElementById('headerTitle').textContent = 'Editor';
                document.getElementById('logoIcon').textContent = '⚖️';
                _attachEditorRealtime(); // Activar listener en tiempo real solo para el editor
                initEditor();
            } else if (section === 'saved') {
                showSavedLists();
            } else if (section === 'actas') {
                document.getElementById('headerIcon').textContent = '📋';
                document.getElementById('headerTitle').textContent = 'Actas F3.MT1.PP';
                document.getElementById('logoIcon').textContent = '📋';
                // Sincronizar estado regional/modalidad en los campos del acta
                const modVal = {'hcb':'HCB','cdi':'CDI','hi':'HI'}[currentModalidad]||'HCB';
                const regVal = currentRegional==='neiva'?'NEIVA':'GAITANA';
                document.getElementById('acta-modalidad').value = modVal;
                document.getElementById('acta-centrozonal').value = regVal;
                document.getElementById('acta-municipio').value = regVal;
                // Detectar fuente disponible
                const fuenteSelect = document.getElementById('acta-fuente');
                if (currentData) fuenteSelect.value = 'semanal';
                else if (monthlyData) fuenteSelect.value = 'mensual';
                else fuenteSelect.value = 'manual';
            }
            
            if (window.innerWidth < 1024) {
                toggleSidebar();
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const hamburger = document.getElementById('hamburger');
            const overlay = document.getElementById('overlay');
            
            sidebar.classList.toggle('open');
            hamburger.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        // Cerrar sidebar al hacer clic fuera
        document.addEventListener('click', function(e) {
            var sidebar = document.getElementById('sidebar');
            var hamburger = document.getElementById('hamburger');
            var overlay = document.getElementById('overlay');
            if (!sidebar || !sidebar.classList.contains('open')) return;
            // Si el clic fue dentro del sidebar o en el hamburger, no cerrar
            if (sidebar.contains(e.target) || hamburger.contains(e.target)) return;
            sidebar.classList.remove('open');
            hamburger.classList.remove('active');
            overlay.classList.remove('active');
        });

        function toggleSidebarCollapse(save = true) {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            sidebarCollapsed = !sidebarCollapsed;
            sidebar.classList.toggle('collapsed', sidebarCollapsed);
            mainContent.classList.toggle('sidebar-collapsed', sidebarCollapsed);
            
            if (save) {
                localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
            }
        }

        function toggleTheme() {
            const current = document.body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('smartMenu_theme', next);
        }

        function cambiarRegional(regional) {
			currentRegional = regional;
			document.body.className = document.body.className.replace(/reg-\w+/, `reg-${regional}`);
			
			const activeSection = document.querySelector('.section.active')?.id;
			if (activeSection === 'section-monthly') document.body.classList.add('view-monthly');
			if (activeSection === 'section-calendar') document.body.classList.add('view-calendar');
			if (activeSection === 'section-editor') document.body.classList.add('view-editor');
			
			document.getElementById('btnNeiva').classList.toggle('active', regional === 'neiva');
			document.getElementById('btnGaitana').classList.toggle('active', regional === 'gaitana');
			
			localStorage.setItem('smartMenu_lastRegional', regional);
			
			// LIMPIAR LISTADO SEMANAL
			currentData = null;
			filteredData = null;
			searchTerm = '';
			document.getElementById('resultContainer').style.display = 'none';
			document.getElementById('catFilters').style.display = 'none';
			document.getElementById('searchContainer').style.display = 'none';
			document.getElementById('buscador').value = '';
			
			// Resetear contadores de categorias semanales
			['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia'].forEach(cat => {
				const el = document.getElementById(`count-${cat}`);
				if (el) el.textContent = '0';
			});
			
			// Resetear filtros de categoria semanales (dejar todos activos)
			activeFilters = new Set(['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
			document.querySelectorAll('#catFilters .category-card').forEach(card => {
				card.classList.add('active');
			});
			
			// LIMPIAR LISTADO MENSUAL
			monthlyData = null;
			monthlyFilteredData = null;
			monthlySearchTerm = '';
			document.getElementById('monthlyResultContainer').style.display = 'none';
			document.getElementById('monthlyCatFilters').style.display = 'none';
			document.getElementById('monthlySearchContainer').style.display = 'none';
			document.getElementById('buscadorMensual').value = '';
			
			// Resetear contadores de categorias mensuales
			['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia'].forEach(cat => {
				const el = document.getElementById(`monthly-count-${cat}`);
				if (el) el.textContent = '0';
			});
			
			// Resetear filtros de categoria mensuales (dejar todos activos)
			monthlyActiveFilters = new Set(['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
			document.querySelectorAll('#monthlyCatFilters .category-card').forEach(card => {
				card.classList.add('active');
			});
			
			// Limpiar selector de semanas mensuales
			monthlyActiveWeeks.clear();
			for (let i = 1; i <= 5; i++) {
				const card = document.getElementById(`week-${i}`);
				const checkbox = document.getElementById(`check-week-${i}`);
				if (card) {
					card.classList.remove('active');
					checkbox.checked = false;
					card.querySelectorAll('.week-day-chip').forEach(chip => chip.classList.remove('selected'));
				}
			}
			
			// Recargar editor si esta abierto
			if (activeSection === 'section-editor') {
				initEditor();
				if (currentEditingProduct !== null) {
					loadProductMatrix();
				}
			}
			limpiarVistas();
			showToast(`Regional: ${regionales[regional].titulo}`, 'success');
			showToast(`Regional cambiada a: ${regionales[regional].titulo}. Genere una nueva lista.`, 'success');
			actualizarIndicadorEstado();
		}

