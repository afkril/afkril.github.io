        // ==================== VARIABLES GLOBALES ====================
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

		// ==================== OPERADORES ====================
		let currentOperador = null; // código del operador activo, o null si la modalidad no maneja operadores / no hay ninguno seleccionado
		let operadoresConfig = {};  // { regional: { modalidad: [codigo, ...] } } — derivado de `regionales`
		let operadoresNombres = {}; // { codigo: 'Nombre para mostrar' }

		function getCurrentDB() {
			if (currentOperador) {
				const opDb = regionales[currentRegional]?.modalidades?.[currentModalidad]?.operadores?.[currentOperador]?.db;
				if (opDb) return opDb;
			}
			return regionales[currentRegional].modalidades[currentModalidad].db;
		}

		// Base de datos "original" (tal como está en database.js) contra la que el
		// editor compara para marcar cambios; respeta el operador activo.
		function getBaseDB() {
			if (currentOperador) {
				const opDb = baseDatabase[currentRegional]?.modalidades?.[currentModalidad]?.operadores?.[currentOperador]?.db;
				if (opDb) return opDb;
			}
			return baseDatabase[currentRegional]?.modalidades?.[currentModalidad]?.db || [];
		}

		function getCurrentTitle() {
			const modTitulo = regionales[currentRegional].modalidades[currentModalidad].titulo;
			if (currentOperador) {
				const opTitulo = regionales[currentRegional]?.modalidades?.[currentModalidad]?.operadores?.[currentOperador]?.titulo;
				if (opTitulo) return opTitulo;
			}
			return modTitulo;
		}

		// Ruta de Firebase para la "db" activa (respeta el operador activo)
		function getCurrentDBPath() {
			if (currentOperador) {
				return `regionales/${currentRegional}/modalidades/${currentModalidad}/operadores/${currentOperador}/db`;
			}
			return `regionales/${currentRegional}/modalidades/${currentModalidad}/db`;
		}

		// Reconstruye operadoresConfig/operadoresNombres a partir de `regionales`
		// (fuente de verdad tras sincronizar con Firebase o tras crear/eliminar operadores).
		function reconstruirOperadoresConfig() {
			operadoresConfig = {};
			Object.keys(regionales).forEach(reg => {
				operadoresConfig[reg] = {};
				Object.keys(regionales[reg].modalidades || {}).forEach(mod => {
					const ops = regionales[reg].modalidades[mod].operadores || {};
					operadoresConfig[reg][mod] = Object.keys(ops);
					Object.keys(ops).forEach(codigo => {
						operadoresNombres[codigo] = ops[codigo].nombre || operadoresNombres[codigo] || codigo.toUpperCase();
					});
				});
			});
		}

		// ---- Registro de operadores eliminados (localStorage + Firebase) ----
		// Evita que un operador eliminado reaparezca al recargar la página por
		// venir "de fábrica" en database.js. Se guarda también en Firebase bajo
		// `operadoresEliminados/` para que la eliminación se comparta entre
		// CUALQUIER usuario o dispositivo, no solo en el navegador donde se borró.
		let operadoresEliminadosRemotos = {}; // { "reg_mod_codigo": true, ... } — espejo de Firebase en memoria

		function getOperadoresEliminados() {
			try {
				const local = JSON.parse(localStorage.getItem('smartMenu_operadoresEliminados')) || [];
				const remotos = Object.keys(operadoresEliminadosRemotos || {});
				return Array.from(new Set([...local, ...remotos]));
			} catch {
				return Object.keys(operadoresEliminadosRemotos || {});
			}
		}
		function marcarOperadorEliminado(regional, modalidad, codigo) {
			const key = `${regional}_${modalidad}_${codigo}`;
			try {
				const lista = JSON.parse(localStorage.getItem('smartMenu_operadoresEliminados')) || [];
				if (!lista.includes(key)) {
					lista.push(key);
					localStorage.setItem('smartMenu_operadoresEliminados', JSON.stringify(lista));
				}
			} catch {}
			operadoresEliminadosRemotos[key] = true;

			// Sincronizar con Firebase para que CUALQUIER usuario/dispositivo
			// (con su propio caché) vea el operador como eliminado.
			if (window.firebaseDB && window.firebaseSet) {
				window.firebaseSet(
					window.firebaseRef(window.firebaseDB, `operadoresEliminados/${key}`),
					{ fecha: new Date().toISOString() }
				).catch(err => console.error('No se pudo sincronizar la eliminación del operador con Firebase:', err));
			}
		}
		function desmarcarOperadorEliminado(regional, modalidad, codigo) {
			const key = `${regional}_${modalidad}_${codigo}`;
			try {
				const lista = (JSON.parse(localStorage.getItem('smartMenu_operadoresEliminados')) || []).filter(k => k !== key);
				localStorage.setItem('smartMenu_operadoresEliminados', JSON.stringify(lista));
			} catch {}
			delete operadoresEliminadosRemotos[key];

			if (window.firebaseDB && window.firebaseRemove) {
				window.firebaseRemove(
					window.firebaseRef(window.firebaseDB, `operadoresEliminados/${key}`)
				).catch(err => console.error('No se pudo sincronizar la reactivación del operador con Firebase:', err));
			}
		}
		function aplicarOperadoresEliminados() {
			const eliminados = getOperadoresEliminados();
			if (!eliminados.length) return;
			eliminados.forEach(key => {
				const partes = key.split('_');
				const codigo = partes.pop();
				const modalidad = partes.pop();
				const regional = partes.join('_');
				const ops = regionales[regional]?.modalidades?.[modalidad]?.operadores;
				if (ops && ops[codigo]) delete ops[codigo];
			});
		}

		// Renderiza los botones de operador en el sidebar según Regional/Modalidad activos
		function actualizarSelectorOperador() {
			const cont = document.getElementById('operadorSelector');
			const label = document.getElementById('operadorSelectorLabel');
			if (!cont) return;

			const ops = regionales[currentRegional]?.modalidades?.[currentModalidad]?.operadores || {};
			const opIds = Object.keys(ops);

			if (!opIds.length) {
				cont.innerHTML = '';
				if (label) label.style.display = 'none';
				currentOperador = null;
				if (typeof actualizarChipPerfil === 'function') actualizarChipPerfil();
				return;
			}

			if (label) label.style.display = 'block';

			// Restaurar último operador usado para esta regional/modalidad si sigue existiendo
			if (!currentOperador || !opIds.includes(currentOperador)) {
				const lastOp = localStorage.getItem(`smartMenu_lastOperador_${currentRegional}_${currentModalidad}`);
				currentOperador = (lastOp && opIds.includes(lastOp)) ? lastOp : opIds[0];
			}

			// Con más de 3 operadores, se acomodan en una grilla de 3 columnas;
			// con 3 o menos, se mantienen en una sola fila (comportamiento previo).
			if (opIds.length > 3) {
				cont.style.display = 'grid';
				cont.style.gridTemplateColumns = 'repeat(3, 1fr)';
			} else {
				cont.style.display = 'flex';
				cont.style.removeProperty('grid-template-columns');
			}

			cont.innerHTML = opIds.map(op => {
				const activo = op === currentOperador;
				const color = ops[op]?.color || null;
				let estilo = opIds.length > 3 ? '' : 'flex:1;';
				if (color) {
					estilo += activo
						? `background:${color};border-color:${color};color:#fff;`
						: `border-color:${color}66;color:${color};background:${color}1a;`;
				}
				return `
				<button class="reg-btn op-btn${activo ? ' active' : ''}" onclick="cambiarOperador('${op}')" style="${estilo}">
					${operadoresNombres[op] || op.toUpperCase()}
				</button>
			`;
			}).join('');

			if (typeof actualizarChipPerfil === 'function') actualizarChipPerfil();
		}

		function cambiarOperador(codigo) {
			if (codigo === currentOperador) return;
			currentOperador = codigo;
			localStorage.setItem(`smartMenu_lastOperador_${currentRegional}_${currentModalidad}`, codigo);

			actualizarSelectorOperador();
			limpiarVistas();
			actualizarIndicadorEstado();

			const activeSection = document.querySelector('.section.active')?.id;
			if (activeSection === 'section-editor') initEditor();

			showToast(`Operador: ${operadoresNombres[codigo] || codigo.toUpperCase()}`, 'success');
		}

        // ==================== INICIALIZACIoN ====================
        document.addEventListener('DOMContentLoaded', () => {
			const savedTheme = localStorage.getItem('smartMenu_theme') || 'dark';
			document.body.setAttribute('data-theme', savedTheme);

			// Aplicar operadores eliminados localmente antes de derivar la config
			aplicarOperadoresEliminados();
			reconstruirOperadoresConfig();

			const lastRegional = localStorage.getItem('smartMenu_lastRegional') || 'neiva';
			cambiarRegional(lastRegional);
			
			const lastModalidad = localStorage.getItem('smartMenu_lastModalidad') || 'hcb';
			cambiarModalidad(lastModalidad);

			actualizarSelectorOperador();
			
			if (sidebarCollapsed && window.innerWidth >= 1024) {
				toggleSidebarCollapse(false);
			}

			updateSavedCount();
			initCalendar();
			initFirebase();
			initAuditoria();
			actualizarIndicadorEstado();
        });
		
		// Muestra u oculta el badge de "operador activo" dentro de un status-indicator
		// (semanal/mensual), aplicando el color configurado para ese operador si existe.
		function _actualizarBadgeOperador(badgeId, dividerId, codigoOperador, nombreOperador, colorHex) {
			const badge = document.getElementById(badgeId);
			const divider = document.getElementById(dividerId);
			if (!badge) return;

			if (!codigoOperador || !nombreOperador) {
				badge.style.display = 'none';
				if (divider) divider.style.display = 'none';
				return;
			}

			badge.textContent = `👤 ${nombreOperador}`;
			badge.style.display = 'inline-flex';
			if (divider) divider.style.display = '';

			if (colorHex) {
				badge.style.background = colorHex + '26'; // ~15% opacidad
				badge.style.borderColor = colorHex + '4d'; // ~30% opacidad
				badge.style.color = colorHex;
				badge.style.border = '1px solid ' + colorHex + '4d';
			} else {
				badge.style.background = '';
				badge.style.borderColor = '';
				badge.style.color = '';
				badge.style.border = '';
			}
		}

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
			
			// Datos del operador activo (si la modalidad maneja operadores)
			const opInfo = currentOperador
				? (regionales[currentRegional]?.modalidades?.[currentModalidad]?.operadores?.[currentOperador] || null)
				: null;
			const opNombre = currentOperador ? (operadoresNombres[currentOperador] || currentOperador.toUpperCase()) : '';
			const opColor = opInfo?.color || null;

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
			_actualizarBadgeOperador('statusOperador', 'statusOperadorDivider', currentOperador, opNombre, opColor);
			
			// Actualizar indicador mensual
			if (indicatorMensual && badgeRegionalMensual && badgeModalidadMensual) {
				indicatorMensual.classList.add('updating');
				setTimeout(() => indicatorMensual.classList.remove('updating'), 300);
				badgeRegionalMensual.className = 'status-badge ' + reg.class;
				badgeRegionalMensual.textContent = reg.text;
				badgeModalidadMensual.className = 'status-badge ' + mod.class;
				badgeModalidadMensual.textContent = mod.text;
			}
			_actualizarBadgeOperador('statusOperadorMensual', 'statusOperadorDividerMensual', currentOperador, opNombre, opColor);

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
			currentOperador = null; // se resuelve en actualizarSelectorOperador() según la nueva modalidad
			
			// Actualizar botones
			document.getElementById('btnHCB').classList.toggle('active', modalidad === 'hcb');
			document.getElementById('btnCDI').classList.toggle('active', modalidad === 'cdi');
			document.getElementById('btnHI').classList.toggle('active', modalidad === 'hi');
			
			// Guardar preferencia
			localStorage.setItem('smartMenu_lastModalidad', modalidad);
			
			// Actualizar selector de operador para la nueva regional/modalidad
			actualizarSelectorOperador();

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
			const weeklyEmptyStateG = document.getElementById('weeklyEmptyState');
			if (weeklyEmptyStateG) weeklyEmptyStateG.style.display = '';
			
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
			const monthlyEmptyStateG = document.getElementById('monthlyEmptyState');
			if (monthlyEmptyStateG) monthlyEmptyStateG.style.display = '';
			
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

