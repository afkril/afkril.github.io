        // ==================== NAVEGACIoN Y UI ====================
        // ══ MÓDULO: Registro de secciones inicializadas (arquitectura lazy) ══
        const _sectionInitialized = {};

        function showSection(section) {
            // Inicialización lazy: cada sección se inicializa solo la primera vez
            if (!_sectionInitialized[section]) {
                _sectionInitialized[section] = true;
                if (section === 'directorio') { tabRefreshSelect(); tabRenderizarDirectorio(); sincronizarDesdePanel(); actualizarIndicadorEstado(); provRefreshSelectDirectorio(); }
                if (section === 'proveedores') { provRenderizar(); }
                if (section === 'saved') { showSavedLists(); }
                if (section === 'calendar') { /* renderCalendar se llama abajo */ }
                if (section === 'cargue') { initCargueMinuta(); }
                if (section === 'gestion-operadores') { initGestionOperadores(); }
            } else {
                // Re-renders necesarios en visitas posteriores
                if (section === 'directorio') { tabRenderizarDirectorio(); actualizarIndicadorEstado(); }
                if (section === 'proveedores') { provRenderizar(); }
                if (section === 'cargue') { initCargueMinuta(); }
                if (section === 'gestion-operadores') { goRenderTabla(); }
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
                initEditor();
            } else if (section === 'saved') {
                showSavedLists();
            } else if (section === 'cargue') {
                document.getElementById('headerIcon').textContent = '📥';
                document.getElementById('headerTitle').textContent = 'Cargue de Minuta por Operador';
                document.getElementById('logoIcon').textContent = '📥';
            } else if (section === 'gestion-operadores') {
                document.getElementById('headerIcon').textContent = '🗂️';
                document.getElementById('headerTitle').textContent = 'Gestión de Operadores';
                document.getElementById('logoIcon').textContent = '🗂️';
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

        // El menú lateral ahora es plano (sin acordeones): el estado activo de cada
        // sección se resuelve únicamente marcando el .nav-item correspondiente (ver arriba).
        // Se conserva toggleNavGroup() como no-op seguro por compatibilidad con
        // llamadas existentes en otros módulos (actas.js, globals.js).
        function toggleNavGroup() { /* noop: navegación plana, sin grupos colapsables */ }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const hamburger = document.getElementById('hamburger');
            const overlay = document.getElementById('overlay');
            
            sidebar.classList.toggle('open');
            hamburger.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        // Abre/cierra el menú desplegable del perfil de usuario.
        function toggleUserProfileMenu(forceState) {
            const userProfile = document.getElementById('userProfile');
            if (!userProfile) return;
            const abrir = typeof forceState === 'boolean' ? forceState : !userProfile.classList.contains('open');
            userProfile.classList.toggle('open', abrir);
        }

        // Cerrar el menú de perfil al hacer clic fuera
        document.addEventListener('click', function(e) {
            const userProfile = document.getElementById('userProfile');
            if (!userProfile || !userProfile.classList.contains('open')) return;
            if (userProfile.contains(e.target)) return;
            userProfile.classList.remove('open');
        });

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
			currentOperador = null; // se resuelve en actualizarSelectorOperador() segun la nueva regional
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
			const weeklyEmptyStateNav = document.getElementById('weeklyEmptyState');
			if (weeklyEmptyStateNav) weeklyEmptyStateNav.style.display = '';
			
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
			const monthlyEmptyStateNav = document.getElementById('monthlyEmptyState');
			if (monthlyEmptyStateNav) monthlyEmptyStateNav.style.display = '';
			
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
			document.querySelectorAll('.week-card-repeated').forEach(c => c.remove());
			repeatedWeekCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
			const repeatWeekPickerNav = document.getElementById('repeatWeekPicker');
			if (repeatWeekPickerNav) repeatWeekPickerNav.style.display = 'none';
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
			actualizarSelectorOperador();
			limpiarVistas();
			showToast(`Regional: ${regionales[regional].titulo}`, 'success');
			showToast(`Regional cambiada a: ${regionales[regional].titulo}. Genere una nueva lista.`, 'success');
			actualizarIndicadorEstado();
		}
		
		


		// ══════════ Modal "Cambiar Perfil" (Regional / Modalidad / Operador) ══════════
		function togglePerfilModal(show) {
			const overlay = document.getElementById('perfil-modal-overlay');
			if (!overlay) return;
			const abrir = typeof show === 'boolean' ? show : !overlay.classList.contains('open');
			overlay.classList.toggle('open', abrir);
			if (abrir) actualizarChipPerfil();
		}

		// Sincroniza el texto del chip de perfil en el sidebar con la
		// Regional / Modalidad / Operador actualmente activos.
		function actualizarChipPerfil() {
			const valueEl = document.getElementById('profileChipValue');
			if (!valueEl || typeof regionales === 'undefined' || !regionales[currentRegional]) return;

			const modTitulo = regionales[currentRegional]?.modalidades?.[currentModalidad]?.titulo || (currentModalidad ? currentModalidad.toUpperCase() : '');
			const modCorta = currentModalidad ? currentModalidad.toUpperCase() : '';
			const opNombre = currentOperador ? (operadoresNombres[currentOperador] || currentOperador.toUpperCase()) : null;

			const partes = [regionales[currentRegional].titulo.replace('Regional ', ''), modCorta];
			if (opNombre) partes.push(opNombre);
			valueEl.textContent = partes.join(' · ');
			valueEl.title = `${regionales[currentRegional].titulo} · ${modTitulo}${opNombre ? ' · ' + opNombre : ''}`;
		}
