// ==================== VARIABLES GLOBALES + INICIALIZACION ====================
        // ── AppState: Modelo centralizado de estado (patrón MVC) ──────
        // Los globals existentes se mantienen por compatibilidad, pero
        // AppState es la fuente autoritativa para los controladores.
        const AppState = {
            _listeners: {},

            // Estado reactivo — leer siempre desde aquí en código nuevo
            get regional()   { return currentRegional; },
            get modalidad()  { return currentModalidad; },
            get weeklyData() { return currentData; },
            get monthlyData(){ return monthlyData; },
            get firebaseConnected() { return firebaseConnected; },

            // Suscripción a cambios: AppState.on('regional', fn)
            on(event, fn) {
                if (!this._listeners[event]) this._listeners[event] = [];
                this._listeners[event].push(fn);
                return () => { this._listeners[event] = this._listeners[event].filter(f => f !== fn); };
            },

            // Emitir evento: AppState.emit('weeklyData', data)
            emit(event, payload) {
                (this._listeners[event] || []).forEach(fn => {
                    try { fn(payload); } catch(e) { console.warn('AppState listener error:', event, e); }
                });
            },

            // Mutaciones tipadas — actualizar global Y notificar listeners
            setRegional(val) {
                currentRegional = val; window.__actaRegional = val;
                this.emit('regional', val);
            },
            setModalidad(val) {
                currentModalidad = val;
                this.emit('modalidad', val);
            },
            setWeeklyData(val) {
                currentData = val; window.__actaCurrentData = val;
                this.emit('weeklyData', val);
            },
            setMonthlyData(val) {
                monthlyData = val; window.__actaMonthlyData = val;
                this.emit('monthlyData', val);
            },
            setFirebaseConnected(val) {
                firebaseConnected = val;
                this.emit('firebaseConnected', val);
            }
        };
        // ─────────────────────────────────────────────────────────────
        let regionales = JSON.parse(JSON.stringify(baseDatabase));
        let currentRegional = 'neiva'; window.__actaRegional = 'neiva';
		let currentModalidad = 'hcb';
        let currentData = null;
        let filteredData = null;
        let activeFilters = new Set(['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
        let savedLists = JSON.parse(localStorage.getItem('smartMenu_savedLists')) || []; // se recarga con clave de usuario al iniciar sesión
        let currentView = 'detallada';
        let searchTerm = '';
        let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

        // Variables para modo mensual
        let monthlyActiveWeeks = new Map();
        let monthlyActiveFilters = new Set(['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
        let monthlyData = null;
        let monthlyFilteredData = null;
        let monthlySearchTerm = '';
        let currentMonth = new Date().getMonth();

        // Variables para editor
        let currentEditingProduct = null;
        let modifiedFields = new Set();
        let firebaseConnected = false;
		
		function getCurrentDB() {
			return regionales[currentRegional].modalidades[currentModalidad].db;
		}

		function getCurrentTitle() {
			return regionales[currentRegional].modalidades[currentModalidad].titulo;
		}

        // ==================== INICIALIZACIoN ====================
        document.addEventListener('DOMContentLoaded', () => {
			const savedTheme = localStorage.getItem('smartMenu_theme') || 'dark';
			document.body.setAttribute('data-theme', savedTheme);
			
			const lastRegional = localStorage.getItem('smartMenu_lastRegional') || 'neiva';
			cambiarRegional(lastRegional);
			
			const lastModalidad = localStorage.getItem('smartMenu_lastModalidad') || 'hcb';
			cambiarModalidad(lastModalidad);
			
			if (sidebarCollapsed && window.innerWidth >= 1024) {
				toggleSidebarCollapse(false);
			}
            
            updateSavedCount();
			initCalendar();
			initFirebase();
			initAuditoria();
			actualizarIndicadorEstado();
        });
		
		// ==================== ACTUALIZAR INDICADOR DE ESTADO ====================
		function actualizarIndicadorEstado() {
			// Indicador semanal
			const indicator = document.getElementById('statusIndicator');
			const badgeRegional = document.getElementById('statusRegional');
			const badgeModalidad = document.getElementById('statusModalidad');
			
			// Indicador mensual
			const indicatorMensual = document.getElementById('statusIndicatorMensual');
			const badgeRegionalMensual = document.getElementById('statusRegionalMensual');
			const badgeModalidadMensual = document.getElementById('statusModalidadMensual');
			
			// Configuración de nombres y clases
			const regionalNames = {
				neiva: { text: '🏢 NEIVA', class: 'reg-neiva' },
				gaitana: { text: '🌿 GAITANA', class: 'reg-gaitana' }
			};
			const reg = regionalNames[currentRegional] || regionalNames.neiva;
			
			const modalidadNames = {
				hcb: { text: '🏠 HCB', class: 'mod-hcb' },
				cdi: { text: '🏫 CDI', class: 'mod-cdi' },
				hi: { text: '👶 HI', class: 'mod-hi' }
			};
			const mod = modalidadNames[currentModalidad] || modalidadNames.hcb;
			
			// Actualizar indicador semanal
			if (indicator && badgeRegional && badgeModalidad) {
				indicator.classList.add('updating');
				setTimeout(() => indicator.classList.remove('updating'), 300);
				badgeRegional.className = 'status-badge ' + reg.class;
				badgeRegional.textContent = reg.text;
				badgeModalidad.className = 'status-badge ' + mod.class;
				badgeModalidad.textContent = mod.text;
				
				const modalidadTitulo = regionales[currentRegional]?.modalidades[currentModalidad]?.titulo || '';
				indicator.title = `${reg.text.replace(/🏢 |🌿 /, '')} - ${modalidadTitulo}`;
			}
			
			// Actualizar indicador mensual
			if (indicatorMensual && badgeRegionalMensual && badgeModalidadMensual) {
				indicatorMensual.classList.add('updating');
				setTimeout(() => indicatorMensual.classList.remove('updating'), 300);
				badgeRegionalMensual.className = 'status-badge ' + reg.class;
				badgeRegionalMensual.textContent = reg.text;
				badgeModalidadMensual.className = 'status-badge ' + mod.class;
				badgeModalidadMensual.textContent = mod.text;
			}
			// Actualizar indicador Directorio
			const indicatorDirectorio = document.getElementById('statusIndicatorDirectorio');
			const badgeRegionalDirectorio = document.getElementById('statusRegionalDirectorio');
			const badgeModalidadDirectorio = document.getElementById('statusModalidadDirectorio');

			if (indicatorDirectorio && badgeRegionalDirectorio && badgeModalidadDirectorio) {
				indicatorDirectorio.classList.add('updating');
				setTimeout(() => indicatorDirectorio.classList.remove('updating'), 300);
				badgeRegionalDirectorio.className = 'status-badge ' + reg.class;
				badgeRegionalDirectorio.textContent = reg.text;
				badgeModalidadDirectorio.className = 'status-badge ' + mod.class;
				badgeModalidadDirectorio.textContent = mod.text;
			}
		}
		
		function cambiarModalidad(modalidad) {
			currentModalidad = modalidad;
			
			// Actualizar botones
			document.getElementById('btnHCB').classList.toggle('active', modalidad === 'hcb');
			document.getElementById('btnCDI').classList.toggle('active', modalidad === 'cdi');
			document.getElementById('btnHI').classList.toggle('active', modalidad === 'hi');
			
			// Guardar preferencia
			localStorage.setItem('smartMenu_lastModalidad', modalidad);
			
			// Limpiar y regenerar si hay datos visibles
			limpiarVistas();
			actualizarIndicadorEstado();
			showToast(`Modalidad: ${regionales[currentRegional].modalidades[modalidad].titulo}`, 'success');
		}
		function limpiarVistas() {
			// Limpiar semanal
			currentData = null;
			filteredData = null;
			searchTerm = '';
			document.getElementById('resultContainer').style.display = 'none';
			document.getElementById('catFilters').style.display = 'none';
			document.getElementById('searchContainer').style.display = 'none';
			document.getElementById('buscador').value = '';
			
			// Resetear contadores semanales
			['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia'].forEach(cat => {
				const el = document.getElementById(`count-${cat}`);
				if (el) el.textContent = '0';
			});
			
			// Limpiar mensual
			monthlyData = null;
			monthlyFilteredData = null;
			monthlySearchTerm = '';
			document.getElementById('monthlyResultContainer').style.display = 'none';
			document.getElementById('monthlyCatFilters').style.display = 'none';
			document.getElementById('monthlySearchContainer').style.display = 'none';
			document.getElementById('buscadorMensual').value = '';
			
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
			
			// Recargar editor si está abierto
			const activeSection = document.querySelector('.section.active')?.id;
			if (activeSection === 'section-editor') {
				initEditor();
				if (currentEditingProduct !== null) {
					loadProductMatrix();
				}
			}
		}

