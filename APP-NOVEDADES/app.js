

        // ============================================================
        // TOGGLE: Dato Pendiente en Nutrición
        // ============================================================
        function toggleNutricionPendiente() {
            const checkbox = document.getElementById('nutricionPendiente');
            const wrapper = document.getElementById('nutricionFieldsWrapper');
            const indicator = document.getElementById('nutricionIndicator');
            if (!checkbox || !wrapper) return;
            const isPendiente = checkbox.checked;
            wrapper.style.display = isPendiente ? 'none' : '';
            if (indicator) indicator.style.display = isPendiente ? 'none' : '';
        }

        // ============================================================
        // HELPER: Convierte fecha YYYY-MM-DD a DD/MM/YYYY
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

        // UDS_DATA se carga dinámicamente desde el perfil de asociación activo
        // El objeto window.UDS_DATA es actualizado por AsociacionesModule.activarPerfil()
        if (!window.UDS_DATA) window.UDS_DATA = {};

        // BACKGROUNDS: paleta de colores por índice de contrato (se asignan automáticamente)
        const PALETTE_BACKGROUNDS = [
            'linear-gradient(to bottom right, #fef3c7, #fbbf24)',
            'linear-gradient(to bottom right, #dbeafe, #3b82f6)',
            'linear-gradient(to bottom right, #d1fae5, #10b981)',
            'linear-gradient(to bottom right, #fce7f3, #ec4899)',
            'linear-gradient(to bottom right, #ede9fe, #8b5cf6)',
            'linear-gradient(to bottom right, #ffedd5, #f97316)',
        ];
        // BACKGROUNDS es un proxy que asigna colores automáticamente a contratos dinámicos
        const BACKGROUNDS = new Proxy({}, {
            get(target, prop) {
                if (prop === 'default') return 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)';
                const contratos = Object.keys(window.UDS_DATA);
                const idx = contratos.indexOf(prop);
                if (idx >= 0) return PALETTE_BACKGROUNDS[idx % PALETTE_BACKGROUNDS.length];
                return 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)';
            }
        });

        
        let typeChartInstance = null, udsChartInstance = null, cuentameChartInstance = null, monthChartInstance = null, contractChartInstance = null;
        let configBloqueo = { activo: false, fechaInicio: 28, fechaFin: 30 };
        let currentNovelties = [], archivedNovelties = [];
        let currentPage = 1, currentArchivedPage = 1;
        const itemsPerPage = 10;
        let resumenMesSeleccionado = -1, resumenAnioSeleccionado = new Date().getFullYear();
        let todosLosDatosNovelties = [], todosLosDatosArchivados = [];

        const OMS_REFERENCE_DATA = {
			// ============================================
			// TABLAS OMS PESO/TALLA - NIÑOS 2-5 AÑOS (65-120cm)
			// Fuente: Resolución MINSALUD 2465 de 2016
			// ============================================
			boys: {
				// talla: [-3DE, -2DE, -1DE, Mediana, +1DE, +2DE, +3DE]
				65: [5.8, 6.3, 6.9, 7.5, 8.2, 9.0, 9.9],      // 2 años aprox
				70: [6.7, 7.3, 7.9, 8.6, 9.4, 10.3, 11.3],     // ~2.5 años
				75: [7.6, 8.2, 8.9, 9.7, 10.6, 11.6, 12.7],    // ~2.8 años
				80: [8.5, 9.2, 10.0, 10.9, 11.9, 13.0, 14.2],  // ~3 años
				85: [9.5, 10.3, 11.2, 12.2, 13.3, 14.5, 15.9], // ~3.3 años
				90: [10.5, 11.4, 12.4, 13.5, 14.7, 16.1, 17.6],// ~3.6 años
				95: [11.6, 12.6, 13.7, 14.9, 16.2, 17.7, 19.4],// ~4 años
				100: [12.7, 13.8, 15.0, 16.3, 17.8, 19.4, 21.2],// ~4.3 años
				105: [13.9, 15.1, 16.4, 17.8, 19.4, 21.2, 23.2],// ~4.6 años
				110: [15.2, 16.5, 17.9, 19.4, 21.1, 23.0, 25.1],// ~5 años
				115: [16.6, 18.0, 19.5, 21.1, 23.0, 25.0, 27.3],// ~5.3 años
				120: [18.1, 19.6, 21.2, 23.0, 25.0, 27.2, 29.6] // ~5.6 años
			},
			
			// ============================================
			// TABLAS OMS PESO/TALLA - NIÑAS 2-5 AÑOS (65-120cm)
			// Fuente: Resolución MINSALUD 2465 de 2016
			// ============================================
			girls: {
				// talla: [-3DE, -2DE, -1DE, Mediana, +1DE, +2DE, +3DE]
				65: [5.6, 6.1, 6.7, 7.3, 8.0, 8.7, 9.6],      // 2 años aprox
				70: [6.4, 7.0, 7.6, 8.3, 9.1, 9.9, 10.9],      // ~2.5 años
				75: [7.3, 7.9, 8.6, 9.4, 10.3, 11.2, 12.3],    // ~2.8 años
				80: [8.2, 8.9, 9.7, 10.6, 11.5, 12.6, 13.8],   // ~3 años
				85: [9.2, 10.0, 10.9, 11.8, 12.9, 14.1, 15.4], // ~3.3 años
				90: [10.3, 11.2, 12.1, 13.2, 14.4, 15.7, 17.2],// ~3.6 años
				95: [11.4, 12.4, 13.5, 14.7, 16.0, 17.5, 19.1],// ~4 años
				100: [12.6, 13.7, 14.9, 16.2, 17.7, 19.3, 21.1],// ~4.3 años
				105: [13.9, 15.1, 16.4, 17.8, 19.4, 21.2, 23.2],// ~4.6 años
				110: [15.3, 16.6, 18.0, 19.6, 21.3, 23.2, 25.4],// ~5 años
				115: [16.8, 18.2, 19.7, 21.4, 23.3, 25.4, 27.8],// ~5.3 años
				120: [18.4, 20.0, 21.6, 23.4, 25.5, 27.8, 30.3] // ~5.6 años
			}
		};
		const TALLA_REFERENCIA_EDAD = {
			boys: {
				// meses: [min, max] en cm aproximado para -2DE y +2DE
				0: [46, 54], 1: [50, 57], 2: [53, 60], 3: [55, 63], 6: [61, 69],
				9: [65, 74], 12: [69, 78], 15: [72, 82], 18: [75, 85], 24: [80, 91],
				30: [84, 96], 36: [88, 101], 42: [91, 105], 48: [94, 109], 54: [97, 113],
				60: [100, 117]
			},
			girls: {
				0: [45, 53], 1: [49, 56], 2: [52, 59], 3: [54, 62], 6: [60, 68],
				9: [64, 73], 12: [67, 77], 15: [71, 81], 18: [74, 84], 24: [78, 90],
				30: [83, 95], 36: [86, 100], 42: [90, 104], 48: [93, 108], 54: [96, 112],
				60: [99, 116]
			}
};

        //const DE_COLORS = ['#7f1d1d', '#dc2626', '#f59e0b', '#10b981', '#fbbf24', '#f97316', '#dc2626'];
		const DE_COLORS = [
				'#C0392B',  // -3DE (rojo oscuro)
				'#E74C3C',  // -2DE (rojo)
				'#F39C12',  // -1DE (naranja)
				'#27AE60',  // Mediana/0 (verde) - LÍNEA PRINCIPAL
				'#F1C40F',  // +1DE (amarillo)
				'#E67E22',  // +2DE (naranja oscuro)
				'#8E44AD'   // +3DE (púrpura)
			];
	   const DE_LABELS = ['-3DE', '-2DE', '-1DE', 'Mediana', '+1DE', '+2DE', '+3DE'];

        // Rangos para la leyenda
        const rangos = [
            
        ];

        function updateClock() {
            const now = new Date();
            const date = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const clockEl = document.getElementById('clockDisplay');
            if (clockEl) clockEl.textContent = `${date} | ${time}`;
        }
        setInterval(updateClock, 1000);
        updateClock();

        function showToast(message, type = 'info', duration = 5000) {
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

        async function promptAdminAccess() {
            // Verificar que hay un perfil activo
            if (!AsociacionesModule.getPerfilActivo()) {
                showToast('Primero selecciona una asociación', 'warning');
                AsociacionesModule.mostrarSelectorAsociaciones();
                return;
            }
            // Si ya está autenticado en esta sesión, abrir directamente
            if (AsociacionesModule.isAdminAutenticado()) {
                openAdminPanel();
                return;
            }
            const perfil = AsociacionesModule.getPerfilActivo();
            ClaveModal.mostrar({
                icono: '🛡️',
                titulo: 'Acceso Administrador',
                subtitulo: perfil ? perfil.nombre : '',
                onSubmit: async (password) => {
                    const correcta = await AsociacionesModule.obtenerPasswordAdmin();
                    if (password !== correcta) return false;
                    AsociacionesModule.marcarAdminAutenticado();
                    openAdminPanel();
                    showToast("✅ Acceso concedido", "success");
                    return true;
                }
            });
        }

        function openAdminPanel() {
            // Guard: nunca abrir sin autenticación
            if (!AsociacionesModule.isAdminAutenticado()) {
                console.warn('[Admin] Intento de apertura sin autenticación bloqueado.');
                return;
            }
            const panel = document.getElementById('adminPanel');
            if (panel) panel.style.display = 'block';
            loadNoveltiesTable();
            loadArchivedNovelties();
            cargarConfigBloqueo();
            populateUDSFilter();
            updatePendientesIndicator();
            inicializarSelectorMes();
            loadResumenStats();
        }

        function closeAdminPanel() {
            const panel = document.getElementById('adminPanel');
            if (panel) panel.style.display = 'none';
            // NO cerramos sesión al cerrar el panel — permanece autenticado en la sesión
        }

        function cerrarSesionAdmin() {
            AsociacionesModule.cerrarSesionAdmin();
            closeAdminPanel();
            showToast('🔒 Sesión admin cerrada', 'info');
        }

        function switchTab(tab) {
            document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`section-${tab}`).classList.add('active');
            
            if (tab === 'archivadas') loadArchivedNovelties();
            else if (tab === 'activas') loadNoveltiesTable();
            else if (tab === 'resumen') loadResumenStats();
        }

        function populateUDSFilter() {
            const filterUDS = document.getElementById('filterUDS');
            const filterUDSArchivados = document.getElementById('filterUDSArchivados');
            
            if (filterUDS) {
                filterUDS.innerHTML = '<option value="">Todas las UDS</option>';
                Object.values(window.UDS_DATA).flat().forEach(([name, code]) => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = `${name} (${code})`;
                    filterUDS.appendChild(opt);
                });
            }
            
            if (filterUDSArchivados) {
                filterUDSArchivados.innerHTML = '<option value="">Todas las UDS</option>';
                Object.values(window.UDS_DATA).flat().forEach(([name, code]) => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = `${name} (${code})`;
                    filterUDSArchivados.appendChild(opt);
                });
            }
        }

        function cargarConfigBloqueo() {
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
            configRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    configBloqueo = data;
                    actualizarUIConfigBloqueo();
                    verificarBloqueo();
                }
            });
        }

        function guardarConfigBloqueo() {
            const fechaInicio = document.getElementById('configFechaInicio');
            const fechaFin = document.getElementById('configFechaFin');
            if (!fechaInicio || !fechaFin) return;
            
            let inicio = parseInt(fechaInicio.value);
            let fin = parseInt(fechaFin.value);
            
            if (inicio < 1) inicio = 1;
            if (inicio > 31) inicio = 31;
            if (fin < 1) fin = 1;
            if (fin > 31) fin = 31;
            if (fin < inicio) fin = inicio;
            
            configBloqueo.fechaInicio = inicio;
            configBloqueo.fechaFin = fin;
            
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
            configRef.set(configBloqueo)
                .then(() => {
                    showToast("Configuración guardada correctamente", "success");
                    actualizarUIConfigBloqueo();
                    verificarBloqueo();
                })
                .catch((error) => showToast("Error al guardar: " + error.message, "error"));
        }

        function toggleBloqueoSistema() {
            configBloqueo.activo = !configBloqueo.activo;
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
            configRef.set(configBloqueo)
                .then(() => {
                    showToast(configBloqueo.activo ? "Bloqueo ACTIVADO" : "Bloqueo DESACTIVADO", configBloqueo.activo ? "warning" : "success");
                    actualizarUIConfigBloqueo();
                    verificarBloqueo();
                })
                .catch((error) => showToast("Error: " + error.message, "error"));
        }

        function actualizarUIConfigBloqueo() {
            const toggle = document.getElementById('toggleBloqueo');
            const estadoText = document.getElementById('estadoBloqueoText');
            const fechaInicio = document.getElementById('configFechaInicio');
            const fechaFin = document.getElementById('configFechaFin');
            const periodoDisplay = document.getElementById('periodoActualDisplay');
            const bloqueoFechasDisplay = document.getElementById('bloqueoFechasDisplay');
            
            if (toggle) {
                if (configBloqueo.activo) toggle.classList.add('active');
                else toggle.classList.remove('active');
            }
            
            if (estadoText) {
                if (configBloqueo.activo) {
                    estadoText.textContent = "ACTIVADO";
                    estadoText.className = "estado-activo";
                } else {
                    estadoText.textContent = "DESACTIVADO";
                    estadoText.className = "estado-inactivo";
                }
            }
            
            if (fechaInicio) fechaInicio.value = configBloqueo.fechaInicio;
            if (fechaFin) fechaFin.value = configBloqueo.fechaFin;
            
            const textoPeriodo = `${configBloqueo.fechaInicio} - ${configBloqueo.fechaFin} de cada mes`;
            if (periodoDisplay) periodoDisplay.textContent = textoPeriodo;
            if (bloqueoFechasDisplay) bloqueoFechasDisplay.textContent = `Periodo de cierre: ${textoPeriodo}`;
        }

        function verificarBloqueo() {
            const overlay = document.getElementById('bloqueoOverlay');
            const mainCard = document.getElementById('mainCard');
            
            if (!configBloqueo.activo) {
                if (overlay) overlay.style.display = 'none';
                if (mainCard) mainCard.style.display = 'block';
                return;
            }
            
            const hoy = new Date();
            const diaActual = hoy.getDate();
            const enPeriodoBloqueo = diaActual >= configBloqueo.fechaInicio && diaActual <= configBloqueo.fechaFin;
            
            if (enPeriodoBloqueo) {
                if (overlay) overlay.style.display = 'flex';
                if (mainCard) mainCard.style.display = 'none';
            } else {
                if (overlay) overlay.style.display = 'none';
                if (mainCard) mainCard.style.display = 'block';
            }
        }

        async function accesoAdminDesdeBloqueo() {
            ClaveModal.mostrar({
                icono: '🔒',
                titulo: 'Acceso Administrador',
                subtitulo: 'Desactivar bloqueo del formulario',
                onSubmit: async (password) => {
                    const correcta = await AsociacionesModule.obtenerPasswordAdmin();
                    if (password !== correcta) return false;

                    AsociacionesModule.marcarAdminAutenticado();
                    configBloqueo.activo = false;
                    const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
                    configRef.set(configBloqueo)
                        .then(() => {
                            showToast("✅ Bloqueo desactivado", "success");
                            actualizarUIConfigBloqueo();
                            verificarBloqueo();
                            setTimeout(() => {
                                if (confirm("¿Desea abrir el panel de administración?")) openAdminPanel();
                            }, 500);
                        })
                        .catch((error) => showToast("Error: " + error.message, "error"));
                    return true;
                }
            });
        }

        setInterval(verificarBloqueo, 3600000);
        // cargarConfigBloqueo se ejecuta cuando hay perfil activo
        document.addEventListener('DOMContentLoaded', () => {
            AsociacionesModule.onPerfilCargado(() => cargarConfigBloqueo());
        });

        // ============================================
		// FUNCIÓN AUXILIAR: Calcular rango OMS (verificar que esté correcta)
		// ============================================
		
		function calcularRangoOMS(talla, peso, genero, edadMeses = null) {
			
			if (talla < 65 || talla > 120) {
				console.warn(`Talla ${talla}cm fuera de rango 65-120cm (tablas 2-5 años)`);
				return { 
					nombre: 'Fuera de rango (2-5 años)', 
					de: 'N/A', 
					color: '#95A5A6', 
					clase: 'rango-sin-datos',
					mensaje: 'Las tablas OMS utilizadas son para niños de 2-5 años (65-120cm)'
				};
			}
		
			const data = genero === 'M' ? OMS_REFERENCE_DATA.boys : OMS_REFERENCE_DATA.girls;
			const tallas = Object.keys(data).map(Number).sort((a, b) => a - b);
			
			// ===== NUEVO: Validación de edad si se proporciona =====
			if (edadMeses !== null) {
				// Validar que la talla sea apropiada para la edad
				const tallaEsperadaMin = getTallaMinimaEsperada(edadMeses);
				const tallaEsperadaMax = getTallaMaximaEsperada(edadMeses);
				
				if (talla < tallaEsperadaMin || talla > tallaEsperadaMax) {
					console.warn(`⚠️ Talla ${talla}cm no corresponde a edad ${edadMeses} meses (rango esperado: ${tallaEsperadaMin}-${tallaEsperadaMax}cm)`);
					// Podrías retornar un estado especial o continuar con advertencia
				}
			}
			
			// Encontrar talla de referencia más cercana
			let tallaRef = tallas[0];
			let minDiff = Math.abs(talla - tallaRef);
			
			tallas.forEach(t => {
				const diff = Math.abs(talla - t);
				if (diff < minDiff) {
					minDiff = diff;
					tallaRef = t;
				}
			})
			
			if (minDiff > 2) {
				console.warn(`Talla ${talla}cm no coincide exactamente con tabla OMS (más cercana: ${tallaRef}cm)`);
			}
			
			const pesosRef = data[tallaRef];
			const mediana = pesosRef[3];  // Índice 3 = Mediana (0 DE)
			const deNeg2 = pesosRef[1];   // Índice 1 = -2DE
			const dePos2 = pesosRef[5];   // Índice 5 = +2DE
			
			// Calcular DE aproximada
			let de = 0;
			if (peso < mediana) {
				// Por debajo de la mediana
				const deNeg3 = pesosRef[0]; // -3DE
				if (peso < deNeg3) {
					de = -3 - ((deNeg3 - peso) / (deNeg3 - (pesosRef[0] - (deNeg3 - pesosRef[0]))));
				} else if (peso < deNeg2) {
					// Entre -3DE y -2DE
					de = -3 + ((peso - deNeg3) / (deNeg2 - deNeg3));
				} else {
					// Entre -2DE y Mediana
					de = -2 + ((peso - deNeg2) / (mediana - deNeg2)) * 2;
				}
			} else {
				// Por encima de la mediana
				const dePos3 = pesosRef[6]; // +3DE
				if (peso > dePos3) {
					de = 3 + ((peso - dePos3) / ((dePos3 + (dePos3 - dePos2)) - dePos3));
				} else if (peso > dePos2) {
					// Entre +2DE y +3DE
					de = 2 + ((peso - dePos2) / (dePos3 - dePos2));
				} else {
					// Entre Mediana y +2DE
					de = ((peso - mediana) / (dePos2 - mediana)) * 2;
				}
			}
			
			// Determinar categoría según DE calculada
			if (de < -3) return { 
				nombre: 'Desnutrición Aguda Severa', 
				de: de.toFixed(2), 
				color: '#C0392B', 
				clase: 'rango-desnutricion-severa',
				alerta: 'ALTA - Requiere intervención inmediata'
			};
			if (de < -2) return { 
				nombre: 'Desnutrición Aguda Moderada', 
				de: de.toFixed(2), 
				color: '#E74C3C', 
				clase: 'rango-desnutricion-moderada',
				alerta: 'MODERADA - Requiere seguimiento cercano'
			};
			if (de < -1) return { 
				nombre: 'Riesgo de Desnutrición', 
				de: de.toFixed(2), 
				color: '#F39C12', 
				clase: 'rango-riesgo-desnutricion',
				alerta: 'PREVENTIVO - Monitoreo nutricional'
			};
			if (de < 1) return { 
				nombre: 'Peso Normal', 
				de: de.toFixed(2), 
				color: '#27AE60', 
				clase: 'rango-normal',
				alerta: 'ÓPTIMO - Mantener hábitos saludables'
			};
			if (de < 1.5) return { 
				nombre: 'Riesgo de Sobrepeso', 
				de: de.toFixed(2), 
				color: '#F1C40F', 
				clase: 'rango-riesgo-sobrepeso',
				alerta: 'PREVENTIVO - Vigilar alimentación'
			};
			if (de < 2) return { 
				nombre: 'Sobrepeso', 
				de: de.toFixed(2), 
				color: '#E67E22', 
				clase: 'rango-sobrepeso',
				alerta: 'ATENCIÓN - Ajustar dieta y actividad'
			};
			return { 
				nombre: 'Obesidad', 
				de: de.toFixed(2), 
				color: '#8E44AD', 
				clase: 'rango-obesidad',
				alerta: 'ALTA - Intervención nutricional necesaria'
			};
		}
		
		function getTallaMinimaEsperada(edadMeses, genero = 'M') {
			const data = genero === 'M' ? TALLA_REFERENCIA_EDAD.boys : TALLA_REFERENCIA_EDAD.girls;
			// Encontrar el rango más cercano
			const mesesDisponibles = Object.keys(data).map(Number).sort((a, b) => a - b);
			let mesRef = mesesDisponibles[0];
			for (const m of mesesDisponibles) {
				if (Math.abs(edadMeses - m) < Math.abs(edadMeses - mesRef)) {
					mesRef = m;
				}
			}
			return data[mesRef][0];
		}

		function getTallaMaximaEsperada(edadMeses, genero = 'M') {
			const data = genero === 'M' ? TALLA_REFERENCIA_EDAD.boys : TALLA_REFERENCIA_EDAD.girls;
			const mesesDisponibles = Object.keys(data).map(Number).sort((a, b) => a - b);
			let mesRef = mesesDisponibles[0];
			for (const m of mesesDisponibles) {
				if (Math.abs(edadMeses - m) < Math.abs(edadMeses - mesRef)) {
					mesRef = m;
				}
			}
			return data[mesRef][1];
		}
		
		function parseEdadAMeses(edadString) {
			if (!edadString || edadString === 'Esperando fechas...') return null;
			
			const match = edadString.match(/(\d+)\s*años?\s*y\s*(\d+)\s*meses?/i);
			if (match) {
				const años = parseInt(match[1]);
				const meses = parseInt(match[2]);
				return (años * 12) + meses;
			}
			
			// Alternativa: solo meses
			const matchMeses = edadString.match(/(\d+)\s*meses?/i);
			if (matchMeses) {
				return parseInt(matchMeses[1]);
			}
			
			return null;
		}

        function validarRangoNutricion(input, min, max) {
			const valor = parseFloat(input.value);
			
			// NUEVOS RANGOS PARA 2-5 AÑOS:
			// Peso: 5-30 kg (aproximado según tablas)
			// Talla: 65-120 cm (según tablas oficiales)
			
			if (valor < min || valor > max) {
				input.classList.add('input-error');
				showToast(`⚠️ Valor fuera de rango para 2-5 años: ${min} - ${max}`, 'warning');
			} else {
				input.classList.remove('input-error');
			}
		}

        function calcularEstadoNutricional() {
            const pesoInput = document.getElementById('nutricionPeso');
            const tallaInput = document.getElementById('nutricionTalla');
            const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
            const indicator = document.getElementById('nutricionIndicator');
            const statusEl = document.getElementById('nutricionStatus');
            const detailsEl = document.getElementById('nutricionDetails');
            const legendEl = document.getElementById('nutricionLegend');
			 
			const displayAge = document.getElementById('displayAge');
			const edadCalculada = displayAge ? displayAge.value : '';
			
            
            const checkIngreso = document.getElementById('checkIngreso');
			
			if (!edadCalculada || edadCalculada === 'Esperando fechas...') {
				
				console.log('Esperando cálculo de edad...');
			}
            if (!checkIngreso || !checkIngreso.checked) {
                if (indicator) indicator.style.display = 'none';
                return;
            }

            if (!pesoInput || !tallaInput || !generoInput) {
                if (indicator) indicator.style.display = 'none';
                return;
            }
            
            const peso = parseFloat(pesoInput.value);
            const talla = parseFloat(tallaInput.value);
            const genero = generoInput.value;

            if (!peso || !talla || isNaN(peso) || isNaN(talla)) {
                if (indicator) indicator.style.display = 'none';
                return;
            }
            
            const modal = document.getElementById('modalGraficaOMS');
            if (modal && modal.classList.contains('active')) {
                const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
                if (generoInput) {
                    requestAnimationFrame(() => {
                        dibujarGraficaEnModal(generoInput.value);
                    });
                }
            }

            const edadMeses = parseEdadAMeses(edadCalculada);
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			
			// ===== Validar rango de edad =====
			const validacionEdad = mostrarAdvertenciaEdad(edadMeses);
			if (!validacionEdad.valido) {
				// Mostrar advertencia pero permitir cálculo
				console.warn(validacionEdad.mensaje);
			}
			
			let advertenciaHTML = '';
			if (!validacionEdad.valido) {
				advertenciaHTML = `<div style="color: #F39C12; font-size: 11px; margin-top: 8px; padding: 8px; background: #FEF3C7; border-radius: 6px; border: 1px solid #FCD34D;">⚠️ ${validacionEdad.mensaje}</div>`;
			}
            
            if (indicator) {
                indicator.style.display = 'block';
                statusEl.textContent = estado.nombre;
                statusEl.className = `nutricion-status ${estado.clase}`;
                
				detailsEl.innerHTML = `
					<strong>DE (Desviación Estándar):</strong> ${estado.de}<br>
					<strong>Peso:</strong> ${peso} kg | <strong>Talla:</strong> ${talla} cm<br>
					<strong>Género:</strong> ${genero === 'M' ? 'Masculino' : 'Femenino'}<br>
					${edadMeses ? `<strong>Edad:</strong> ${Math.floor(edadMeses/12)} años ${edadMeses%12} meses<br>` : ''}
					<em style="font-size: 10px; color: #9ca3af;">* Tablas OMS Peso/Talla 2-5 años (Res. MINSALUD 2465/2016)</em>
					${advertenciaHTML}
				`;
                                
                legendEl.innerHTML = rangos.map(r => `
                    <div class="nutricion-legend-item ${r.clase}">
                        <span>${r.nombre}</span>
                        <span style="opacity: 0.8; font-size: 9px;">${r.de}</span>
                    </div>
                `).join('');
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => inicializarGraficaOMS(), 100);
            
            ['nutricionPeso', 'nutricionTalla'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.addEventListener('input', calcularEstadoNutricional);
            });
            
            document.querySelectorAll('input[name="_ingresoGender"]').forEach(input => {
                input.addEventListener('change', calcularEstadoNutricional);
            });
        });

        function inicializarSelectorMes() {
            const selectorAnio = document.getElementById('resumenAnioSelector');
            const anioActual = new Date().getFullYear();
            
            for (let anio = 2024; anio <= anioActual + 1; anio++) {
                const opt = document.createElement('option');
                opt.value = anio;
                opt.textContent = anio;
                if (anio === anioActual) opt.selected = true;
                selectorAnio.appendChild(opt);
            }
            
            document.getElementById('resumenMesSelector').value = new Date().getMonth();
        }

        function irMesActual() {
            const ahora = new Date();
            document.getElementById('resumenMesSelector').value = ahora.getMonth();
            document.getElementById('resumenAnioSelector').value = ahora.getFullYear();
            cambiarMesResumen();
        }

        function cambiarMesResumen() {
            resumenMesSeleccionado = parseInt(document.getElementById('resumenMesSelector').value);
            resumenAnioSeleccionado = parseInt(document.getElementById('resumenAnioSelector').value);
            
            const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            const nombreMes = resumenMesSeleccionado === -1 ? 'Todos los meses' : 
                             `${nombresMeses[resumenMesSeleccionado]} ${resumenAnioSeleccionado}`;
            
            document.getElementById('nombreMesResumen').textContent = nombreMes;
            document.getElementById('labelMesSeleccionado').textContent = 
                resumenMesSeleccionado === -1 ? 'Este Mes' : nombresMeses[resumenMesSeleccionado];
            
            calcularYMostrarEstadisticas();
        }

        function filtrarPorMes(novelties) {
            if (resumenMesSeleccionado === -1) {
                return novelties.filter(n => {
                    const fecha = new Date(n.timestamp);
                    return fecha.getFullYear() === resumenAnioSeleccionado;
                });
            }
            
            return novelties.filter(n => {
                const fecha = new Date(n.timestamp);
                return fecha.getMonth() === resumenMesSeleccionado && 
                       fecha.getFullYear() === resumenAnioSeleccionado;
            });
        }

        function loadResumenStats() {
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            const archivedRef = database.ref(AsociacionesModule.getRef('archived'));
            
            Promise.all([
                noveltiesRef.once('value'),
                archivedRef.once('value')
            ]).then(([noveltiesSnap, archivedSnap]) => {
                const noveltiesData = noveltiesSnap.val() || {};
                const archivedData = archivedSnap.val() || {};
                
                todosLosDatosNovelties = Object.entries(noveltiesData).map(([id, value]) => ({ id, ...value }));
                todosLosDatosArchivados = Object.entries(archivedData).map(([id, value]) => ({ id, ...value }));
                
                calcularYMostrarEstadisticas();
            }).catch(error => {
                console.error('Error cargando datos:', error);
                showToast('Error al cargar estadísticas: ' + error.message, 'error');
            });
        }

        function calcularYMostrarEstadisticas() {
            const novelties = todosLosDatosNovelties;
            const archivados = todosLosDatosArchivados;
            
            const noveltiesFiltradas = filtrarPorMes(novelties);
            const archivadosFiltrados = filtrarPorMes(archivados);
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            let todayCount = 0, weekCount = 0;
            
            novelties.forEach(n => {
                const nDate = new Date(n.timestamp);
                if (nDate >= today) todayCount++;
                if (nDate >= weekAgo) weekCount++;
            });

            let retiros = 0, ingresos = 0, ambos = 0;
            let pendientes = 0, cargados = 0;

            noveltiesFiltradas.forEach(n => {
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    ambos++;
                    retiros++;
                    ingresos++;
                } else if (n.type === 'retiro') {
                    retiros++;
                } else if (n.type === 'ingreso') {
                    ingresos++;
                }

                if (n.cuentameStatus === 'cargado') cargados++;
                else pendientes++;
            });

            animarNumero('statTotal', noveltiesFiltradas.length);
            animarNumero('statPendientes', pendientes);
            animarNumero('statCargados', cargados);
            animarNumero('statArchivados', archivadosFiltrados.length);
            animarNumero('statToday', todayCount);
            animarNumero('statWeek', weekCount);
            animarNumero('statMonth', noveltiesFiltradas.length);
            animarNumero('statRetiros', retiros);
            animarNumero('statIngresos', ingresos);
            animarNumero('statAmbos', ambos);

            loadContractChart(noveltiesFiltradas);
            loadTypeChart(noveltiesFiltradas);
            loadUDSChart(noveltiesFiltradas);
            loadCuentameChart(noveltiesFiltradas);
            loadMonthChart(novelties);
            loadTopUDSPendientes(noveltiesFiltradas);
        }

        function animarNumero(elementId, valor) {
            const elemento = document.getElementById(elementId);
            if (!elemento) return;
            elemento.textContent = valor;
            elemento.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => elemento.classList.remove('animate__animated', 'animate__pulse'), 500);
        }

        function loadContractChart(novelties) {
            const ctx = document.getElementById('contractChart');
            if (!ctx) return;

            // Dinámico: obtener contratos del perfil activo
            const contratosActivos = Object.keys(window.UDS_DATA || {});
            const perfil = AsociacionesModule.getPerfilActivo();
            const palette = ['#fbbf24','#3b82f6','#10b981','#f43f5e','#a855f7','#f97316'];

            const datos  = contratosActivos.map(c => novelties.filter(n => n.contract === c).length);
            const labels = contratosActivos.map(c => (perfil?.contratos?.[c]) || `Contrato ${c}`);
            const colors = contratosActivos.map((_, i) => palette[i % palette.length]);

            if (contractChartInstance) contractChartInstance.destroy();

            contractChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: datos,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        function loadTypeChart(novelties) {
            const ctx = document.getElementById('typeChart');
            if (!ctx) return;
            
            const retiros = novelties.filter(n => n.type === 'retiro' && !n.hasIngreso).length;
            const ingresos = novelties.filter(n => n.type === 'ingreso' && !n.hasRetiro).length;
            const ambos = novelties.filter(n => n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)).length;

            if (typeChartInstance) typeChartInstance.destroy();

            typeChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Retiros', 'Ingresos', 'Ambos'],
                    datasets: [{
                        data: [retiros, ingresos, ambos],
                        backgroundColor: ['#ef4444', '#10b981', '#8b5cf6'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }
        
        function toggleBatchMenu() {
            const menu = document.getElementById('batchMenu');
            if (menu) {
                const isVisible = menu.style.display === 'block';
                menu.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    const pendientes = currentNovelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente');
                    const badge = document.getElementById('countPendientesBadge');
                    if (badge) badge.textContent = pendientes.length;
                }
            }
        }

        document.addEventListener('click', function(e) {
            const menu = document.getElementById('batchMenu');
            const btn = e.target.closest('button');
            if (menu && menu.style.display === 'block' && !btn?.textContent?.includes('Acciones Masivas')) {
                menu.style.display = 'none';
            }
        });

        function loadUDSChart(novelties) {
            const ctx = document.getElementById('udsChart');
            if (!ctx) return;
            
            const udsCounts = {};
            novelties.forEach(n => {
                udsCounts[n.udsName] = (udsCounts[n.udsName] || 0) + 1;
            });

            const sorted = Object.entries(udsCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (udsChartInstance) udsChartInstance.destroy();

            udsChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
                    datasets: [{
                        label: 'Novedades',
                        data: sorted.map(([, count]) => count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { ticks: { font: { size: 9 } } }
                    }
                }
            });
        }

        function loadCuentameChart(novelties) {
            const ctx = document.getElementById('cuentameChart');
            if (!ctx) return;
            
            const pendientes = novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length;
            const cargados = novelties.filter(n => n.cuentameStatus === 'cargado').length;

            if (cuentameChartInstance) cuentameChartInstance.destroy();

            cuentameChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pendientes', 'Cargados'],
                    datasets: [{
                        data: [pendientes, cargados],
                        backgroundColor: ['#f59e0b', '#10b981'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
                    }
                }
            });
        }
        
        function marcarTodosCargados() {
            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';

            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let pendientesFiltrados = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                const isPendiente = !n.cuentameStatus || n.cuentameStatus === 'pendiente';

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && isPendiente;
            });

            if (pendientesFiltrados.length === 0) {
                showToast('No hay novedades pendientes en la vista actual para marcar como cargadas', 'warning');
                return;
            }

            if (!confirm(`¿Está seguro de marcar como "Cargado al CUENTAME" ${pendientesFiltrados.length} novedades?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }

            showToast(`⏳ Procesando ${pendientesFiltrados.length} novedades...`, 'info');

            let actualizados = 0;
            const fechaActual = new Date().toISOString();

            const promesas = pendientesFiltrados.map(novedad => {
                const updates = {
                    cuentameStatus: 'cargado',
                    cuentameDate: fechaActual
                };
                return database.ref(`${AsociacionesModule.getRef('novelties')}/${novedad.id}`).update(updates)
                    .then(() => {
                        actualizados++;
                        const index = currentNovelties.findIndex(n => n.id === novedad.id);
                        if (index !== -1) {
                            currentNovelties[index].cuentameStatus = 'cargado';
                            currentNovelties[index].cuentameDate = fechaActual;
                        }
                    })
                    .catch(error => {
                        console.error(`Error actualizando ${novedad.id}:`, error);
                    });
            });

            Promise.all(promesas)
                .then(() => {
                    showToast(`✅ ${actualizados} novedades marcadas como cargadas al CUENTAME`, 'success');
                    filterNovelties();
                    updatePendientesIndicator();
                })
                .catch(error => {
                    showToast('Error al actualizar: ' + error.message, 'error');
                });
        }

        function archivarTodosCargados() {
            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';

            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let cargadosFiltrados = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                const isCargado = n.cuentameStatus === 'cargado';

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && isCargado;
            });

            if (cargadosFiltrados.length === 0) {
                showToast('No hay novedades cargadas en la vista actual para archivar', 'warning');
                return;
            }

            if (!confirm(`⚠️ ¿Está seguro de ARCHIVAR ${cargadosFiltrados.length} novedades?\n\nSolo se archivarán las que estén marcadas como "Cargado al CUENTAME".\n\nEsta acción moverá los registros a la sección de Archivados.`)) {
                return;
            }

            showToast(`⏳ Archivando ${cargadosFiltrados.length} novedades...`, 'info');

            let archivados = 0;
            let errores = 0;
            const fechaArchivo = new Date().toISOString();

            const promesas = cargadosFiltrados.map(novedad => {
                const archivedData = {
                    ...novedad,
                    archivedDate: fechaArchivo,
                    originalId: novedad.id
                };

                const archivedRef = database.ref(AsociacionesModule.getRef('archived')).push();
                
                return archivedRef.set(archivedData)
                    .then(() => database.ref(`${AsociacionesModule.getRef('novelties')}/${novedad.id}`).remove())
                    .then(() => {
                        archivados++;
                        archivedNovelties.push({ id: archivedRef.key, ...archivedData });
                        currentNovelties = currentNovelties.filter(n => n.id !== novedad.id);
                    })
                    .catch(error => {
                        errores++;
                        console.error(`Error archivando ${novedad.id}:`, error);
                    });
            });

            Promise.all(promesas)
                .then(() => {
                    if (errores > 0) {
                        showToast(`⚠️ ${archivados} archivados, ${errores} errores`, 'warning');
                    } else {
                        showToast(`🗃️ ${archivados} novedades archivadas correctamente`, 'success');
                    }
                    filterNovelties();
                    updatePendientesIndicator();
                })
                .catch(error => {
                    showToast('Error general al archivar: ' + error.message, 'error');
                });
        }

        function loadMonthChart(novelties) {
            const ctx = document.getElementById('monthChart');
            if (!ctx) return;
            
            const monthCounts = new Array(12).fill(0);
            novelties.forEach(n => {
                const month = new Date(n.timestamp).getMonth();
                monthCounts[month]++;
            });

            if (monthChartInstance) monthChartInstance.destroy();

            monthChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                    datasets: [{
                        data: monthCounts,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        function loadTopUDSPendientes(novelties) {
            const container = document.getElementById('topUDSPendientes');
            if (!container) return;

            const udsPendientes = {};
            novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').forEach(n => {
                udsPendientes[n.udsName] = (udsPendientes[n.udsName] || 0) + 1;
            });

            const sorted = Object.entries(udsPendientes).sort((a, b) => b[1] - a[1]).slice(0, 5);
            
            container.innerHTML = sorted.map(([uds, count], index) => `
                <div class="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">${index + 1}</span>
                        <span class="font-semibold text-slate-700 text-sm">${uds}</span>
                    </div>
                    <span class="font-bold text-amber-600">${count} pendientes</span>
                </div>
            `).join('') || '<p class="text-slate-500 text-center py-4">No hay pendientes</p>';
        }

        function loadNoveltiesTable() {
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            noveltiesRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                currentNovelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                filterNovelties();
                updatePendientesIndicator();
            });
        }

        function checkDuplicate(document, currentId) {
            if (!document || document.length < 5) return null;
            
            const duplicateActive = currentNovelties.find(n => 
                n.id !== currentId && (
                    (n.document === document) || 
                    (n.retiro && n.retiro.document === document) ||
                    (n.ingreso && n.ingreso.document === document)
                )
            );
            
            const duplicateArchived = archivedNovelties.find(n => 
                n.document === document || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            if (duplicateActive) return { type: 'active', data: duplicateActive };
            if (duplicateArchived) return { type: 'archived', data: duplicateArchived };
            
            return null;
        }

        function toggleCuentame(id) {
            const novelty = currentNovelties.find(n => n.id === id);
            if (!novelty) return;
            
            const newStatus = novelty.cuentameStatus === 'cargado' ? 'pendiente' : 'cargado';
            
            const noveltyRef = database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`);
            noveltyRef.update({ 
                cuentameStatus: newStatus,
                cuentameDate: newStatus === 'cargado' ? new Date().toISOString() : null
            })
            .then(() => {
                showToast(newStatus === 'cargado' ? '✓ Marcado como cargado al CUENTAME' : '⏳ Marcado como pendiente', 'success');
                loadNoveltiesTable();
                updatePendientesIndicator();
            })
            .catch((error) => showToast('Error al actualizar: ' + error.message, 'error'));
        }

        function archivarNovelty(id) {
            const novelty = currentNovelties.find(n => n.id === id);
            if (!novelty) return;
            
            if (novelty.cuentameStatus !== 'cargado') {
                showToast('⚠️ Solo se pueden archivar novedades marcadas como "Cargado al CUENTAME"', 'warning');
                return;
            }
            
            if (!confirm('¿Está seguro de archivar esta novedad?\n\nLos archivados se mueven a una sección separada.')) return;
            
            const archivedData = {
                ...novelty,
                archivedDate: new Date().toISOString(),
                originalId: id
            };
            
            const archivedRef = database.ref(AsociacionesModule.getRef('archived')).push();
            archivedRef.set(archivedData)
                .then(() => database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`).remove())
                .then(() => {
                    showToast('🗃️ Novedad archivada correctamente', 'success');
                    loadNoveltiesTable();
                    updatePendientesIndicator();
                })
                .catch((error) => showToast('Error al archivar: ' + error.message, 'error'));
        }

        function updatePendientesIndicator() {
            const indicator = document.getElementById('pendientesIndicator');
            const countEl = document.getElementById('pendientesCount');
            
            if (!indicator || !countEl) return;
            
            const pendientes = currentNovelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length;
            
            countEl.textContent = pendientes;
            
            if (pendientes === 0) {
                indicator.classList.add('zero');
                indicator.style.display = 'none';
            } else {
                indicator.classList.remove('zero');
                indicator.style.display = 'flex';
            }
        }

        async function showPendientesView() {
            // Requiere autenticación admin
            if (!AsociacionesModule.isAdminAutenticado()) {
                await promptAdminAccess();
                if (!AsociacionesModule.isAdminAutenticado()) return;
            }
            openAdminPanel();
            switchTab('activas');
            document.getElementById('filterStatus').value = 'pendiente';
            filterNovelties();
        }
        
        function abrirModalGrafica() {
            const modal = document.getElementById('modalGraficaOMS');
            const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
            
            if (!generoInput) {
                showToast('Seleccione el género del beneficiario primero', 'warning');
                return;
            }
            
            document.body.classList.add('modal-open');
            
            const genero = generoInput.value;
            const content = modal.querySelector('.modal-grafica-content');
            
            content.classList.remove('boy', 'girl');
            content.classList.add(genero === 'M' ? 'boy' : 'girl');
            
            const title = document.getElementById('modalGraficaTitle');
            const icon = genero === 'M' ? '👦' : '👧';
            title.textContent = `Gráfica Peso/Talla OMS - ${genero === 'M' ? 'NIÑOS' : 'NIÑAS'} ${icon}`;
            
            modal.classList.add('active');
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    dibujarGraficaEnModal(genero);
                }, 100);
            });
            
            llenarLeyendaModal();
            
            window.addEventListener('resize', handleResizeModal);
        }

        function cerrarModalGrafica(event) {
			if (event && event.target.closest('.modal-grafica-content')) {
				return;
			}
			
			const modal = document.getElementById('modalGraficaOMS');
			modal.classList.remove('active');
			document.body.classList.remove('modal-open');
			
			// Destruir Gráfica al cerrar
			if (ChartIndividual) {
				ChartIndividual.destroy();
				ChartIndividual = null;
			}
		}

        let resizeTimeout;
        function handleResizeModal() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const modal = document.getElementById('modalGraficaOMS');
                if (modal.classList.contains('active')) {
                    const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
                    if (generoInput) {
                        dibujarGraficaEnModal(generoInput.value);
                    }
                }
            }, 250);
        }

        function dibujarGraficaOMS(canvasId, genero, peso = null, talla = null, edadMeses = null, nombre = '', datosExtra = {}) {
			const canvas = document.getElementById(canvasId);
			if (!canvas) {
				console.error('Canvas no encontrado:', canvasId);
				return;
			}
			
			// Obtener el contenedor para dimensiones
			const wrapper = canvas.closest('.modal-grafica-canvas-wrapper') || 
							canvas.closest('.chart-container-nutricional') ||
							canvas.parentElement;
			
			if (!wrapper) {
				console.error('Wrapper no encontrado para canvas:', canvasId);
				return;
			}
			
			const rect = wrapper.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			
			// Configurar dimensiones del canvas
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			canvas.style.width = rect.width + 'px';
			canvas.style.height = rect.height + 'px';
			
			const ctx = canvas.getContext('2d');
			ctx.scale(dpr, dpr);
			ctx.clearRect(0, 0, rect.width, rect.height);
			
			const width = rect.width;
			const height = rect.height;
			
			// Padding proporcional
			const padding = {
				top: height * 0.12,
				right: width * 0.15,
				bottom: height * 0.18,
				left: width * 0.12
			};
			
			const chartWidth = width - padding.left - padding.right;
			const chartHeight = height - padding.top - padding.bottom;
			
			// Dibujar elementos base
			dibujarGridOMS(ctx, padding, chartWidth, chartHeight, width, height);
			dibujarEjesOMS(ctx, padding, chartWidth, chartHeight, width, height);
			dibujarCurvasOMS(ctx, genero, padding, chartWidth, chartHeight);
			
			// Dibujar punto del niño si hay datos
			if (peso !== null && talla !== null && !isNaN(peso) && !isNaN(talla)) {
				dibujarPuntoNinoOMS(ctx, talla, peso, padding, chartWidth, chartHeight, genero, edadMeses, nombre, datosExtra);
			}
			
			// Actualizar leyenda si existe
			if (document.getElementById('modalGraficaLeyenda')) {
				llenarLeyendaModal();
			}
			if (document.getElementById('leyendaIndividual')) {
				llenarLeyendaIndividual();
			}
		}

		// ============================================
		// FUNCIONES AUXILIARES DE DIBUJO (RENOMBRADAS)
		// ============================================

		function dibujarGridOMS(ctx, padding, chartWidth, chartHeight, width, height) {
			ctx.strokeStyle = document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
			ctx.lineWidth = Math.max(0.5, height * 0.002);
			
			// Líneas horizontales
			for (let i = 0; i <= 10; i++) {
				const y = padding.top + (i * chartHeight / 10);
				ctx.beginPath();
				ctx.moveTo(padding.left, y);
				ctx.lineTo(width - padding.right, y);
				ctx.stroke();
			}
			
			// Líneas verticales
			for (let i = 0; i <= 8; i++) {
				const x = padding.left + (i * chartWidth / 8);
				ctx.beginPath();
				ctx.moveTo(x, padding.top);
				ctx.lineTo(x, height - padding.bottom);
				ctx.stroke();
			}
		}

		function dibujarEjesOMS(ctx, padding, chartWidth, chartHeight, width, height) {
			const isDark = document.body.classList.contains('dark-mode');
			
			// Ejes principales
			ctx.strokeStyle = isDark ? '#e2e8f0' : '#374151';
			ctx.lineWidth = Math.max(1.5, height * 0.004);
			ctx.beginPath();
			ctx.moveTo(padding.left, padding.top);
			ctx.lineTo(padding.left, height - padding.bottom);
			ctx.lineTo(width - padding.right, height - padding.bottom);
			ctx.stroke();
			
			// Título eje X
			ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
			ctx.font = `bold ${Math.max(10, height * 0.025)}px Inter, sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText('Talla (cm)', padding.left + chartWidth / 2, height - padding.bottom / 3);
			
			// Título eje Y (rotado)
			ctx.save();
			ctx.translate(padding.left / 2, padding.top + chartHeight / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText('Peso (kg)', 0, 0);
			ctx.restore();
			
			// Ticks Y (peso: 5-33 kg)
			ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
			ctx.font = `${Math.max(9, height * 0.02)}px Inter, sans-serif`;
			ctx.textAlign = 'right';
			
			for (let i = 0; i <= 9; i++) {
				const peso = 5 + (i * 3); // 5, 8, 11, 14, 17, 20, 23, 26, 29, 32
				const y = padding.top + ((33 - peso) / (33 - 5)) * chartHeight;
				ctx.fillText(peso.toFixed(0), padding.left - 8, y + 4);
			}
			
			// Ticks X (talla: 65-120 cm)
			ctx.textAlign = 'center';
			for (let i = 0; i <= 11; i++) {
				const talla = 65 + (i * 5); // 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120
				const x = padding.left + ((talla - 65) / (120 - 65)) * chartWidth;
				ctx.fillText(talla, x, height - padding.bottom + 20);
			}
		}

		function dibujarCurvasOMS(ctx, genero, padding, chartWidth, chartHeight) {
			const data = genero === 'M' ? OMS_REFERENCE_DATA.boys : OMS_REFERENCE_DATA.girls;
			const tallas = Object.keys(data).map(Number).sort((a, b) => a - b);
			
			const minTalla = 65;
			const maxTalla = 120;
			const minPeso = 5;
			const maxPeso = 33;
			
			const baseLineWidth = Math.max(1, chartHeight * 0.004);
			
			// Dibujar las 7 curvas DE
			for (let deIndex = 0; deIndex < 7; deIndex++) {
				ctx.strokeStyle = DE_COLORS[deIndex];
				ctx.lineWidth = deIndex === 3 ? baseLineWidth * 2.5 : baseLineWidth * 1.5;
				ctx.setLineDash(deIndex === 3 ? [] : [5, 5]);
				ctx.beginPath();
				
				let firstPoint = true;
				
				tallas.forEach(talla => {
					const peso = data[talla][deIndex];
					const x = padding.left + ((talla - minTalla) / (maxTalla - minTalla)) * chartWidth;
					const y = padding.top + ((maxPeso - peso) / (maxPeso - minPeso)) * chartHeight;
					
					if (firstPoint) {
						ctx.moveTo(x, y);
						firstPoint = false;
					} else {
						ctx.lineTo(x, y);
					}
				});
				
				ctx.stroke();
				
				// Etiqueta de la curva al final
				const lastTalla = tallas[tallas.length - 1];
				const lastPeso = data[lastTalla][deIndex];
				const lastX = padding.left + ((lastTalla - minTalla) / (maxTalla - minTalla)) * chartWidth;
				const lastY = padding.top + ((maxPeso - lastPeso) / (maxPeso - minPeso)) * chartHeight;
				
				ctx.fillStyle = DE_COLORS[deIndex];
				ctx.font = `bold ${Math.max(10, chartHeight * 0.022)}px Inter, sans-serif`;
				ctx.textAlign = 'left';
				ctx.fillText(DE_LABELS[deIndex], lastX + 8, lastY + 4);
			}
			
			ctx.setLineDash([]); // Resetear dash
		}

		function dibujarPuntoNinoOMS(ctx, talla, peso, padding, chartWidth, chartHeight, genero, edadMeses = null, nombre = '', datosExtra = {}) {
			const minTalla = 65;
			const maxTalla = 120;
			const minPeso = 5;
			const maxPeso = 33;
			
			const x = padding.left + ((talla - minTalla) / (maxTalla - minTalla)) * chartWidth;
			const y = padding.top + ((maxPeso - peso) / (maxPeso - minPeso)) * chartHeight;
			
			// Validar que el punto esté dentro del canvas
			if (x < padding.left || x > padding.left + chartWidth || 
				y < padding.top || y > padding.top + chartHeight) {
				console.warn(`Punto (${talla}cm, ${peso}kg) fuera de rango visual`);
				return;
			}
			
			// Calcular estado nutricional para color
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			const colorPunto = estado.color;
			
			const puntoSize = Math.max(10, chartHeight * 0.035);
			
			// Halo de advertencia si está fuera de rango de edad
			if (edadMeses !== null && (edadMeses < 24 || edadMeses > 72)) {
				ctx.beginPath();
				ctx.arc(x, y, puntoSize * 2.5, 0, 2 * Math.PI);
				ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
				ctx.fill();
			}
			
			// Punto principal con color según estado nutricional
			ctx.beginPath();
			ctx.arc(x, y, puntoSize, 0, 2 * Math.PI);
			ctx.fillStyle = colorPunto;
			ctx.fill();
			ctx.strokeStyle = 'white';
			ctx.lineWidth = Math.max(3, puntoSize * 0.3);
			ctx.stroke();
			
			// Etiqueta con valores
			ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b';
			ctx.font = `bold ${Math.max(12, chartHeight * 0.028)}px Inter, sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText(`${peso}kg / ${talla}cm`, x, y - puntoSize * 1.8);
			
			// Si hay nombre, mostrarlo
			if (nombre) {
				ctx.font = `${Math.max(10, chartHeight * 0.022)}px Inter, sans-serif`;
				ctx.fillText(nombre.toUpperCase(), x, y - puntoSize * 3);
			}
			
			return { x, y, estado };
		}

		// ============================================
		// FUNCIONES WRAPPER PARA COMPATIBILIDAD
		// ============================================

		/**
		 * Wrapper para el formulario de novedades (modo preview con inputs del form)
		 */
		function dibujarGraficaEnModal(genero) {
			const pesoInput = document.getElementById('nutricionPeso');
			const tallaInput = document.getElementById('nutricionTalla');
			const displayAge = document.getElementById('displayAge');
			
			let peso = null, talla = null, edadMeses = null;
			
			if (pesoInput && pesoInput.value) peso = parseFloat(pesoInput.value);
			if (tallaInput && tallaInput.value) talla = parseFloat(tallaInput.value);
			if (displayAge && displayAge.value) edadMeses = parseEdadAMeses(displayAge.value);
			
			// Dibujar usando la función unificada
			dibujarGraficaOMS('omsChartModal', genero, peso, talla, edadMeses);
			
			// Actualizar subtítulo si hay datos
			if (peso !== null && talla !== null) {
				const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
				const subtitle = document.getElementById('modalGraficaSubtitle');
				let edadTexto = edadMeses ? ` • ${Math.floor(edadMeses/12)}a ${edadMeses%12}m` : '';
				let advertenciaHTML = '';
				
				if (edadMeses !== null) {
					const validacion = mostrarAdvertenciaEdad(edadMeses);
					if (!validacion.valido) {
						advertenciaHTML = `<div style="color: #F39C12; font-size: 11px; margin-top: 8px; padding: 8px; background: #FEF3C7; border-radius: 6px; border: 1px solid #FCD34D;">⚠️ ${validacion.mensaje}</div>`;
					}
				}
				
				if (subtitle) {
					subtitle.innerHTML = `<strong style="color: ${estado.color}">${estado.nombre}</strong> (DE: ${estado.de})${edadTexto}${advertenciaHTML}`;
				}
			}
		}	

        

        function llenarLeyendaModal() {
			const container = document.getElementById('modalGraficaLeyenda');
			if (!container) return;
			
			// Leyenda actualizada para tablas 2-5 años
			const rangos = [
				{ nombre: 'Desnutrición Severa (<-3DE)', color: '#C0392B', de: '< -3DE', desc: 'Intervención inmediata' },
				{ nombre: 'Desnutrición Moderada', color: '#E74C3C', de: '-3DE a -2DE', desc: 'Seguimiento cercano' },
				{ nombre: 'Riesgo Desnutrición', color: '#F39C12', de: '-2DE a -1DE', desc: 'Monitoreo preventivo' },
				{ nombre: 'Peso Adecuado (Mediana)', color: '#27AE60', de: '-1DE a +1DE', desc: 'Estado óptimo' },
				{ nombre: 'Riesgo Sobrepeso', color: '#F1C40F', de: '+1DE a +1.5DE', desc: 'Vigilar alimentación' },
				{ nombre: 'Sobrepeso', color: '#E67E22', de: '+1.5DE a +2DE', desc: 'Ajustar dieta/actividad' },
				{ nombre: 'Obesidad (>+2DE)', color: '#8E44AD', de: '> +2DE', desc: 'Intervención nutricional' }
			];
			
			container.innerHTML = rangos.map(r => `
				<div class="leyenda-item" style="border-left: 4px solid ${r.color}; padding-left: 8px;">
					<div class="leyenda-color" style="background: ${r.color}; width: 20px; height: 20px; border-radius: 50%;"></div>
					<div style="flex: 1;">
						<div style="font-weight: 700; color: ${r.color}; font-size: 11px; line-height: 1.2;">${r.nombre}</div>
						<div style="font-size: 9px; color: #64748b; line-height: 1.2;">${r.de} • ${r.desc}</div>
					</div>
				</div>
			`).join('');
		}
		
		function mostrarAdvertenciaEdad(edadMeses) {
			// Validar que el niño esté en rango 2-5 años (24-60 meses)
			if (edadMeses !== null) {
				if (edadMeses < 24) {
					return {
						valido: false,
						mensaje: `⚠️ Edad ${Math.floor(edadMeses/12)} años ${edadMeses%12} meses: Las tablas OMS son para 2-5 años`,
						tipo: 'warning'
					};
				} else if (edadMeses > 72) { // 6 años = 72 meses, damos margen
					return {
						valido: false,
						mensaje: `⚠️ Edad ${Math.floor(edadMeses/12)} años: Recomendado usar tablas 5-10 años`,
						tipo: 'warning'
					};
				}
			}
			return { valido: true, mensaje: '', tipo: 'success' };
		}

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                cerrarModalGrafica();
            }
        });

        document.getElementById('modalGraficaOMS').addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalGrafica();
            }
        });

        function filterNovelties() {
            const searchInput = document.getElementById('searchInput');
            const filterContract  = document.getElementById('filterContract');
            const filterType      = document.getElementById('filterType');
            const filterDate      = document.getElementById('filterDate');
            const filterMonth     = document.getElementById('filterMonth');
            const filterUDS       = document.getElementById('filterUDS');
            const filterStatus    = document.getElementById('filterStatus');
            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            
            const searchTerm      = searchInput     ? searchInput.value.toLowerCase() : '';
            const contractFilter  = filterContract  ? filterContract.value  : '';
            const typeFilter      = filterType      ? filterType.value      : '';
            const dateFilter      = filterDate      ? filterDate.value      : '';
            const monthFilter     = filterMonth     ? filterMonth.value     : '';
            const udsFilter       = filterUDS       ? filterUDS.value       : '';
            const statusFilter    = filterStatus    ? filterStatus.value    : '';
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let filtered = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract = !contractFilter || n.contract === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && matchesRegional && matchesModalidad;
            });

            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderTable(filtered);
        }

        function getFechaMovimiento(novelty) {
            let fechas = [];
            
            if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
                const fechaRetiro = novelty.retiro ? novelty.retiro.retiroDate : (novelty.retiroDate || null);
                if (fechaRetiro) fechas.push('Ret: ' + fechaRetiro);
            }
            
            if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
                const fechaIngreso = novelty.ingreso ? novelty.ingreso.ingresoDate : (novelty.ingresoDate || null);
                if (fechaIngreso) fechas.push('Ing: ' + fechaIngreso);
            }
            
            if (fechas.length > 0) return fechas.join(' / ');
            return novelty.date || '-';
        }

        function renderTable(novelties) {
            const tbody = document.getElementById('noveltiesTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            const start = (currentPage - 1) * itemsPerPage;
            const paginated = novelties.slice(start, start + itemsPerPage);

            paginated.forEach(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                
                let tipoBadge = '';
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoBadge = '<span class="badge badge-ambos">AMBOS</span>';
                } else if (n.type === 'retiro') {
                    tipoBadge = '<span class="badge badge-retiro">RETIRO</span>';
                } else if (n.type === 'ingreso') {
                    tipoBadge = '<span class="badge badge-ingreso">INGRESO</span>';
                } else {
                    tipoBadge = '<span class="badge">' + (n.type || 'N/A').toUpperCase() + '</span>';
                }
                // Badge nutrición pendiente
                if ((n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente) {
                    tipoBadge += ' <span style="background:#f59e0b;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;" title="Datos nutricionales pendientes">🍎⏳</span>';
                }
                
                let docDisplay = n.document || '-';
                let nameDisplay = n.name || '-';
                let docsToCheck = [];
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    const docRet = n.retiro ? n.retiro.document : (n.document || '-');
                    const docIng = n.ingreso ? n.ingreso.document : '-';
                    const nomRet = n.retiro ? n.retiro.name : (n.name || '-');
                    const nomIng = n.ingreso ? n.ingreso.name : '-';
                    
                    docDisplay = docRet + ' / ' + docIng;
                    nameDisplay = (nomRet.length > 15 ? nomRet.substring(0, 15) + '...' : nomRet) + ' / ' + (nomIng.length > 15 ? nomIng.substring(0, 15) + '...' : nomIng);
                    
                    if (n.retiro && n.retiro.document) docsToCheck.push(n.retiro.document);
                    if (n.ingreso && n.ingreso.document) docsToCheck.push(n.ingreso.document);
                } else if (n.type === 'retiro') {
                    const retData = n.retiro || n;
                    docDisplay = retData.document || '-';
                    nameDisplay = retData.name ? (retData.name.length > 20 ? retData.name.substring(0, 20) + '...' : retData.name) : '-';
                    if (retData.document) docsToCheck.push(retData.document);
                } else if (n.type === 'ingreso') {
                    const ingData = n.ingreso || n;
                    docDisplay = ingData.document || '-';
                    nameDisplay = ingData.name ? (ingData.name.length > 20 ? ingData.name.substring(0, 20) + '...' : ingData.name) : '-';
                    if (ingData.document) docsToCheck.push(ingData.document);
                }

                let duplicadoHTML = '';
                docsToCheck.forEach(doc => {
                    const dup = checkDuplicate(doc, n.id);
                    if (dup) {
                        const tooltipText = dup.type === 'active' 
                            ? `Duplicado en: ${dup.data.udsName} (${new Date(dup.data.timestamp).toLocaleDateString('es-CO')})`
                            : `Ya archivado en: ${dup.data.udsName}`;
                        duplicadoHTML += `<span class="duplicado-badge duplicado-tooltip" data-tooltip="${tooltipText}">⚠️ DUP</span> `;
                    }
                });
                
                const isCargado = n.cuentameStatus === 'cargado';
                const cuentameClass = isCargado ? 'checked' : 'pending';
                const cuentameTitle = isCargado ? 'Cargado al CUENTAME' : 'Pendiente por cargar';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="cuentame-check ${cuentameClass}" 
                             onclick="toggleCuentame('${n.id}')" 
                             title="${cuentameTitle}">
                        </div>
                    </td>
                    <td>${isCargado ? '<span style="color: #10b981; font-weight: 600;">✓ Cargado</span>' : '<span style="color: #f59e0b; font-weight: 600;">⏳ Pendiente</span>'}</td>
                    <td>${new Date(n.timestamp).toLocaleDateString('es-CO')}</td>
                    <td><strong>${fechaMovimiento}</strong></td>
                    <td><span class="badge" style="background: ${getContractColor(n.contract)}; color: white;">${n.contract || 'N/A'}</span></td>
                    <td>${n.udsName} ${duplicadoHTML}</td>
                    <td>${tipoBadge}</td>
                    <td>${docDisplay}</td>
                    <td>${nameDisplay}</td>
                    <td>
                        <button onclick="viewNovelty('${n.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2 bg-blue-50 px-2 py-1 rounded">Ver</button>
                        ${(n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente ? `<button onclick="abrirEditNutricion('${n.id}')" class="text-xs font-semibold mr-2 px-2 py-1 rounded" style="background:#fef3c7;color:#92400e;" title="Completar datos nutricionales pendientes">🍎 Nutrición</button>` : ''}
                        ${isCargado ? `<button onclick="archivarNovelty('${n.id}')" class="btn-archivar" title="Archivar">🗃️</button>` : ''}
                        <button onclick="deleteNovelty('${n.id}')" class="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2 py-1 rounded">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderPagination(novelties.length);
        }

        function getContractColor(contract) {
            return COLORES_GRAFICAS.contratos[contract] || '#6b7280';
        }

        function loadArchivedNovelties() {
            const archivedRef = database.ref(AsociacionesModule.getRef('archived'));
            archivedRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                archivedNovelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                filterArchivedNovelties();
            });
        }

        function filterArchivedNovelties() {
            const searchInput       = document.getElementById('searchInputArchivados');
            const filterContract    = document.getElementById('filterContractArchivados');
            const filterType        = document.getElementById('filterTypeArchivados');
            const filterDate        = document.getElementById('filterDateArchivados');
            const filterMonth       = document.getElementById('filterMonthArchivados');
            const filterUDS         = document.getElementById('filterUDSArchivados');
            const filterRegional    = document.getElementById('filterRegionalArchivados');
            const filterModalidad   = document.getElementById('filterModalidadArchivados');

            const searchTerm        = searchInput     ? searchInput.value.toLowerCase()  : '';
            const contractFilter    = filterContract  ? filterContract.value              : '';
            const typeFilter        = filterType      ? filterType.value                  : '';
            const dateFilter        = filterDate      ? filterDate.value                  : '';
            const monthFilter       = filterMonth     ? filterMonth.value                 : '';
            const udsFilter         = filterUDS       ? filterUDS.value                   : '';
            const regionalFilter    = filterRegional  ? filterRegional.value              : '';
            const modalidadFilter   = filterModalidad ? filterModalidad.value             : '';

            let filtered = archivedNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));

                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;

                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }

                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS  = !udsFilter  || n.udsName === udsFilter;

                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesRegional && matchesModalidad;
            });

            filtered.sort((a, b) => new Date(b.archivedDate) - new Date(a.archivedDate));
            renderArchivedTable(filtered);
        }

        function renderArchivedTable(novelties) {
            const tbody = document.getElementById('archivedTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            const start = (currentArchivedPage - 1) * itemsPerPage;
            const paginated = novelties.slice(start, start + itemsPerPage);

            paginated.forEach(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                
                let tipoBadge = '';
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoBadge = '<span class="badge badge-ambos">AMBOS</span>';
                } else if (n.type === 'retiro') {
                    tipoBadge = '<span class="badge badge-retiro">RETIRO</span>';
                } else if (n.type === 'ingreso') {
                    tipoBadge = '<span class="badge badge-ingreso">INGRESO</span>';
                } else {
                    tipoBadge = '<span class="badge">' + (n.type || 'N/A').toUpperCase() + '</span>';
                }
                
                let docDisplay = n.document || '-';
                let nameDisplay = n.name || '-';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    const docRet = n.retiro ? n.retiro.document : (n.document || '-');
                    const docIng = n.ingreso ? n.ingreso.document : '-';
                    const nomRet = n.retiro ? n.retiro.name : (n.name || '-');
                    const nomIng = n.ingreso ? n.ingreso.name : '-';
                    
                    docDisplay = docRet + ' / ' + docIng;
                    nameDisplay = (nomRet.length > 15 ? nomRet.substring(0, 15) + '...' : nomRet) + ' / ' + (nomIng.length > 15 ? nomIng.substring(0, 15) + '...' : nomIng);
                }

                const row = document.createElement('tr');
                row.className = 'archivado-row';
                row.innerHTML = `
                    <td><div class="check-archivado">✓</div></td>
                    <td>${new Date(n.archivedDate).toLocaleDateString('es-CO')}</td>
                    <td><strong>${fechaMovimiento}</strong></td>
                    <td><span class="badge" style="background: ${getContractColor(n.contract)}; color: white;">${n.contract || 'N/A'}</span></td>
                    <td>${n.udsName}</td>
                    <td>${tipoBadge}</td>
                    <td>${docDisplay}</td>
                    <td>${nameDisplay}</td>
                    <td>
                        <button onclick="viewArchivedNovelty('${n.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2 bg-blue-50 px-2 py-1 rounded">Ver</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderArchivedPagination(novelties.length);
        }
		
		// Variable para controlar el modo de vista
let isPlainView = false;
let currentNoveltyData = null;

// Función principal para abrir el modal
function viewNoveltyDetails(novelty, isArchived) {
    currentNoveltyData = novelty;
    isPlainView = false;
    
    const modal = document.getElementById('viewModal');
    const cardsView = document.getElementById('cardsView');
    const plainView = document.getElementById('plainView');
    const plainTextContent = document.getElementById('plainTextContent');
    const headerSubtitle = document.getElementById('headerSubtitle');
    
    // Extraer código UDS del valor completo
    let udsCode = '';
    let udsName = novelty.udsName || 'No especificado';
    if (novelty.udsFull && novelty.udsFull.includes(' - ')) {
        const parts = novelty.udsFull.split(' - ');
        udsName = parts[0];
        udsCode = parts[1];
    }
    
    // Actualizar subtítulo del header
    const estadoText = novelty.cuentameStatus === 'cargado' ? 'Cargado' : 'Pendiente';
    headerSubtitle.textContent = `${udsName} • Estado: ${estadoText}`;
    
    // Generar contenido
    cardsView.innerHTML = generateFiveCards(novelty, isArchived, udsName, udsCode);
    plainTextContent.textContent = generatePlainTextFive(novelty, isArchived, udsName, udsCode);
    
    // Mostrar vista correcta
    updateViewMode();
    
    // Mostrar modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// Generar las 5 tarjetas reorganizadas
function generateFiveCards(novelty, isArchived, udsName, udsCode) {
    const contract = novelty.contract || 'N/A';
    const fechaRegistro = new Date(novelty.timestamp).toLocaleString('es-CO');
    
    // Determinar tipo y badges
    let tipoBadge = '';
    if (novelty.type === 'ambos' || (novelty.hasRetiro && novelty.hasIngreso)) {
        tipoBadge = '<span class="badge-tipo-c ambos">AMBOS</span>';
    } else if (novelty.type === 'retiro') {
        tipoBadge = '<span class="badge-tipo-c retiro">RETIRO</span>';
    } else if (novelty.type === 'ingreso') {
        tipoBadge = '<span class="badge-tipo-c ingreso">INGRESO</span>';
    }
    
    const isCargado = novelty.cuentameStatus === 'cargado';
    const estadoBadge = `<span class="badge-estado-c ${isCargado ? 'cargado' : 'pendiente'}">${isCargado ? '✓ CARGADO' : '⏳ PENDIENTE'}</span>`;
    
    let html = '';
    
    // TARJETA 1: INFORMACIÓN GENERAL (siempre presente)
    html += `
        <div class="detail-card-compact card-info-c">
            <div class="card-header-c">
                <div class="card-icon-c">📋</div>
                <h4 class="card-title-c">Información General</h4>
            </div>
            <div class="data-grid-c">
                <div class="data-item-c">
                    <span class="data-label-c">📄 Contrato</span>
                    <span class="data-value-c"><strong>${contract}</strong></span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">🏫 UDS</span>
                    <span class="data-value-c">${udsName}</span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">🔢 Código UDS</span>
                    <span class="data-value-c">${udsCode || '-'}</span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">✅ Estado</span>
                    <span class="data-value-c">${estadoBadge}</span>
                </div>
                <div class="data-item-c full-width-c">
                    <span class="data-label-c">📅 Fecha Registro</span>
                    <span class="data-value-c">${fechaRegistro}</span>
                </div>
                <div class="data-item-c full-width-c">
                    <span class="data-label-c">🏷️ Tipo Novedad</span>
                    <span class="data-value-c">${tipoBadge}</span>
                </div>
            </div>
        </div>
    `;
    
    // TARJETA 2: RETIRO (si aplica)
    if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
        const r = novelty.retiro || novelty;
        html += `
            <div class="detail-card-compact card-retiro-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👤</div>
                    <h4 class="card-title-c">Datos de Retiro</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${r.docType || 'RC'} ${r.document || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">👤 Nombre</span>
                        <span class="data-value-c name-highlight">${r.name ? r.name.toUpperCase() : 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📅 Fecha Retiro</span>
                        <span class="data-value-c">${formatDateDMY(r.retiroDate || novelty.retiroDate || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">⚧ Género</span>
                        <span class="data-value-c">${r.gender === 'M' ? 'Masculino' : r.gender === 'F' ? 'Femenino' : '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👤</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Retiro</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 3: INGRESO (si aplica)
    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        html += `
            <div class="detail-card-compact card-ingreso-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👶</div>
                    <h4 class="card-title-c">Datos de Ingreso</h4>
                </div>
                <div class="data-grid-c">
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">👤 Niño</span>
                        <span class="data-value-c name-highlight">${i.name ? i.name.toUpperCase() : 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${i.docType || 'RC'} ${i.document || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📏 Edad</span>
                        <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${i.age || novelty.age || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🎂 F. Nacimiento</span>
                        <span class="data-value-c">${formatDateDMY(i.dob || i.ingresoDOB || novelty.ingresoDOB || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📅 F. Ingreso</span>
                        <span class="data-value-c">${formatDateDMY(i.ingresoDate || novelty.ingresoDate || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">⚧ Género</span>
                        <span class="data-value-c">${i.gender === 'M' ? 'Masculino' : i.gender === 'F' ? 'Femenino' : '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📍 Comuna</span>
                        <span class="data-value-c">${i.comuna || novelty.comuna || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🏘️ Barrio</span>
                        <span class="data-value-c">${i.barrio || novelty.barrio || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👶</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Ingreso</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 4: ACUDIENTE (si hay ingreso)
    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        html += `
            <div class="detail-card-compact card-acudiente-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👨‍👩‍👧</div>
                    <h4 class="card-title-c">Datos del Acudiente</h4>
                </div>
                <div class="data-grid-c">
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">👤 Nombre</span>
                        <span class="data-value-c name-highlight">${i.acudiente || novelty.acudiente || 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${i.acudienteDoc || novelty.acudienteDoc || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🎂 F. Nacimiento</span>
                        <span class="data-value-c">${formatDateDMY(i.acudienteDOB || novelty.acudienteDOB || '-')}</span>
                    </div>
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">📍 Ubicación</span>
                        <span class="data-value-c">${i.comuna || novelty.comuna || '-'} • ${i.barrio || novelty.barrio || '-'}</span>
                    </div>
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">🏠 Dirección</span>
                        <span class="data-value-c">${i.address || novelty.address || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📞 Teléfono</span>
                        <span class="data-value-c">${i.phone || novelty.phone || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👨‍👩‍👧</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Acudiente</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 5: SEGUIMIENTO NUTRICIONAL (si hay datos de ingreso)
    const nutricion = novelty.nutricion || (novelty.ingreso && novelty.ingreso.nutricion);
    const isNutrPendiente = nutricion && nutricion.pendiente === true;
    if ((novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) && nutricion) {
        
        const estadoColor = getNutricionColor(nutricion.estadoNutricional);
        const editBtn = novelty.id && !isArchived
            ? `<button onclick="abrirEditNutricion('${novelty.id}')" style="margin-left:auto;background:#f59e0b;color:white;border:none;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">✏️ Editar</button>`
            : '';
        
        if (isNutrPendiente) {
            html += `
                <div class="detail-card-compact card-nutricional-c" style="border-top-color:#f59e0b;">
                    <div class="card-header-c">
                        <div class="card-icon-c">🍎</div>
                        <h4 class="card-title-c">Seguimiento Nutricional</h4>
                        ${editBtn}
                    </div>
                    <div class="data-grid-c single-col">
                        <div class="data-item-c full-width-c" style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center;">
                            <span style="font-size:22px;">⏳</span>
                            <p style="font-weight:700;color:#b45309;margin-top:4px;">DATO PENDIENTE</p>
                            <p style="font-size:11px;color:#92400e;">Los datos nutricionales serán completados desde el panel de administración</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (nutricion.fecha || nutricion.peso) {
            html += `
                <div class="detail-card-compact card-nutricional-c">
                    <div class="card-header-c">
                        <div class="card-icon-c">🍎</div>
                        <h4 class="card-title-c">Seguimiento Nutricional</h4>
                        ${editBtn}
                    </div>
                    <div class="data-grid-c">
                        <div class="data-item-c">
                            <span class="data-label-c">📅 F. Valoración</span>
                            <span class="data-value-c">${formatDateDMY(nutricion.fecha || '-')}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">📊 Estado</span>
                            <span class="data-value-c" style="color: ${estadoColor}; font-weight: 700;">${nutricion.estadoNutricional || 'No calculado'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">⚖️ Peso</span>
                            <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${nutricion.peso ? nutricion.peso + ' kg' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">📏 Talla</span>
                            <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${nutricion.talla ? nutricion.talla + ' cm' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">💪 Perímetro Braquial</span>
                            <span class="data-value-c">${nutricion.perimetroBraquial ? nutricion.perimetroBraquial + ' cm' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">🏥 Régimen</span>
                            <span class="data-value-c">${nutricion.regimen || '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">🏥 EPS</span>
                            <span class="data-value-c">${nutricion.eps || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">🍎</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Seguimiento Nutricional</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No se registraron datos nutricionales</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

// Generar texto plano con el nuevo formato
function generatePlainTextFive(novelty, isArchived, udsName, udsCode) {
    const fechaRegistro = new Date(novelty.timestamp).toLocaleString('es-CO');
    
    let text = `=================================\n`;
    text +=    ` REPORTE DE NOVEDADES - ASOCIACIÓN JER\n`;
    text +=    `=================================\n\n`;
    
    text += `[ INFORMACIÓN GENERAL ]\n`;
    text += `> CONTRATO:         ${novelty.contract || 'N/A'}\n`;
    text += `> UDS NOMBRE:       ${udsName ? udsName.toUpperCase() : 'N/A'}\n`;
    text += `> CÓDIGO UDS:       ${udsCode || 'N/A'}\n`;
    text += `> FECHA REGISTRO:   ${fechaRegistro}\n`;
    text += `> TIPO DE NOVEDAD:  ${novelty.type === 'ambos' ? 'RETIRO + INGRESO (AMBOS)' : novelty.type?.toUpperCase() || 'N/A'}\n`;
    text += `> ESTADO CUENTAME:  ${novelty.cuentameStatus === 'cargado' ? '✓ CARGADO' : '⏳ PENDIENTE'}\n`;
    
    if (isArchived) {
        text += `> FECHA ARCHIVO:    ${novelty.archivedDate ? new Date(novelty.archivedDate).toLocaleString('es-CO') : '-'}\n`;
    }
    
    text += `------------------------------------------\n`;

    if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
        const r = novelty.retiro || novelty;
        text += `\n[ DATOS DE RETIRO ]\n`;
        text += `  - Documento:      ${r.docType || 'RC'} ${r.document || 'N/A'}\n`;
        text += `  - Nombre:         ${r.name ? r.name.toUpperCase() : 'N/A'}\n`;
        text += `  - Fecha Retiro:   ${formatDateDMY(r.retiroDate || novelty.retiroDate || '-')}\n`;
        text += `  - Género:         ${r.gender === 'M' ? 'Masculino' : r.gender === 'F' ? 'Femenino' : 'N/A'}\n`;
    }

    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        text += `\n[ DATOS DE INGRESO ]\n`;
        text += `  - Niño:           ${i.name ? i.name.toUpperCase() : 'N/A'}\n`;
        text += `  - Documento:      ${i.docType || 'RC'} ${i.document || 'N/A'}\n`;
        text += `  - Edad:           ${i.age || novelty.age || 'N/A'}\n`;
        text += `  - F. Nacimiento:  ${formatDateDMY(i.dob || i.ingresoDOB || novelty.ingresoDOB || '-')}\n`;
        text += `  - F. Ingreso:     ${formatDateDMY(i.ingresoDate || novelty.ingresoDate || '-')}\n`;
        text += `  - Género:         ${i.gender === 'M' ? 'Masculino' : i.gender === 'F' ? 'Femenino' : 'N/A'}\n`;
        text += `  - Comuna:         ${i.comuna || novelty.comuna || '-'}\n`;
        text += `  - Barrio:         ${i.barrio || novelty.barrio || '-'}\n`;
        text += `  - Dirección:      ${i.address || novelty.address || 'N/A'}\n`;
        text += `  - Teléfono:       ${i.phone || novelty.phone || 'N/A'}\n`;
        
        text += `\n[ DATOS DEL ACUDIENTE ]\n`;
        text += `  - Nombre:         ${i.acudiente || novelty.acudiente || 'N/A'}\n`;
        text += `  - Documento:      ${i.acudienteDoc || novelty.acudienteDoc || '-'}\n`;
        text += `  - F. Nacimiento:  ${formatDateDMY(i.acudienteDOB || novelty.acudienteDOB || '-')}\n`;

        const n = novelty.nutricion || (novelty.ingreso && novelty.ingreso.nutricion);
        if (n && (n.fecha || n.peso)) {
            text += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
            text += `  - F. Valoración:      ${formatDateDMY(n.fecha || '-')}\n`;
            text += `  - Peso:               ${n.peso ? n.peso + ' kg' : '-'}\n`;
            text += `  - Talla:              ${n.talla ? n.talla + ' cm' : '-'}\n`;
            text += `  - Perímetro Braquial: ${n.perimetroBraquial ? n.perimetroBraquial + ' cm' : '-'}\n`;
            text += `  - Régimen:            ${n.regimen || '-'}\n`;
            text += `  - EPS:                ${n.eps || '-'}\n`;
            text += `  - Estado Nutricional: ${n.estadoNutricional || 'No calculado'}\n`;
        }
    }

    text += `\n------------------------------------------\n`;
    text += `Generado: ${new Date().toLocaleString('es-CO')}\n`;
    
    return text;
}

// Alternar vista
function toggleViewMode() {
    isPlainView = !isPlainView;
    updateViewMode();
}

function updateViewMode() {
    const cardsView = document.getElementById('cardsView');
    const plainView = document.getElementById('plainView');
    const icon = document.getElementById('viewModeIcon');
    const text = document.getElementById('viewModeText');
    
    if (isPlainView) {
        cardsView.classList.add('hidden');
        plainView.classList.remove('hidden');
        icon.textContent = '🎴';
        text.textContent = 'Vista Tarjetas';
    } else {
        cardsView.classList.remove('hidden');
        plainView.classList.add('hidden');
        icon.textContent = '📝';
        text.textContent = 'Texto Plano';
    }
}

function getNutricionColor(estado) {
    if (!estado) return '#94a3b8';
    if (estado.includes('Severa')) return '#ef4444';
    if (estado.includes('Moderada')) return '#f87171';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return '#fbbf24';
    if (estado.includes('Normal')) return '#10b981';
    if (estado.includes('Sobrepeso')) return '#f97316';
    if (estado.includes('Obesidad')) return '#dc2626';
    return '#94a3b8';
}

function closeModal(event) {
    if (!event || event.target.id === 'viewModal' || event.target.classList.contains('btn-close-compact') || event.target.classList.contains('btn-cerrar-compact')) {
        const modal = document.getElementById('viewModal');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentNoveltyData = null;
    }
}

// Compatibilidad con funciones existentes
function viewNovelty(id) {
    const novelty = currentNovelties.find(n => n.id === id);
    if (!novelty) return;
    viewNoveltyDetails(novelty, false);
}

function viewArchivedNovelty(id) {
    const novelty = archivedNovelties.find(n => n.id === id);
    if (!novelty) return;
    viewNoveltyDetails(novelty, true);
}

// ============================================================
// EDITAR NUTRICIÓN PENDIENTE DESDE EL PANEL
// ============================================================
function abrirEditNutricion(noveltyId) {
    const novelty = currentNovelties.find(n => n.id === noveltyId);
    if (!novelty) { showToast('No se encontró la novedad', 'error'); return; }

    // Remove old modal if exists
    const oldModal = document.getElementById('editNutricionModal');
    if (oldModal) oldModal.remove();

    const nutricion = novelty.nutricion || {};

    const modal = document.createElement('div');
    modal.id = 'editNutricionModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:18px 22px;display:flex;align-items:center;gap:12px;">
                <span style="font-size:24px;">🍎</span>
                <div>
                    <h3 style="color:white;font-weight:800;font-size:16px;margin:0;">Completar Datos Nutricionales</h3>
                    <p style="color:#fef3c7;font-size:12px;margin:2px 0 0;">${novelty.ingreso?.name || novelty.name || 'Beneficiario'}</p>
                </div>
                <button onclick="document.getElementById('editNutricionModal').remove()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;font-weight:bold;">×</button>
            </div>
            <div style="padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div style="grid-column:1/-1;">
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Fecha de Valoración *</label>
                    <input type="date" id="en_fecha" value="${nutricion.fecha || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Peso (kg) * <span style="font-weight:400;">(5-30)</span></label>
                    <input type="number" id="en_peso" step="0.1" min="5" max="30" placeholder="Ej: 12.5" value="${nutricion.peso || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Talla (cm) * <span style="font-weight:400;">(65-120)</span></label>
                    <input type="number" id="en_talla" step="0.1" min="65" max="120" placeholder="Ej: 85.0" value="${nutricion.talla || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Perímetro Braquial (cm) * <span style="font-weight:400;">(6-30)</span></label>
                    <input type="number" id="en_perimetro" step="0.1" min="6" max="30" placeholder="Ej: 15.5" value="${nutricion.perimetroBraquial || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Régimen</label>
                    <select id="en_regimen" style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                        <option value="">Seleccione...</option>
                        <option value="SUBSIDIADO" ${nutricion.regimen==='SUBSIDIADO'?'selected':''}>SUBSIDIADO</option>
                        <option value="CONTRIBUTIVO" ${nutricion.regimen==='CONTRIBUTIVO'?'selected':''}>CONTRIBUTIVO</option>
                        <option value="ESPECIAL" ${nutricion.regimen==='ESPECIAL'?'selected':''}>ESPECIAL</option>
                        <option value="NO_AFILIADO" ${nutricion.regimen==='NO_AFILIADO'?'selected':''}>NO AFILIADO</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">EPS</label>
                    <input type="text" id="en_eps" placeholder="Nombre de la EPS" value="${nutricion.eps || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
            </div>
            <div style="padding:0 22px 22px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="document.getElementById('editNutricionModal').remove()" style="padding:10px 20px;border:2px solid #e2e8f0;background:white;color:#64748b;border-radius:12px;font-weight:700;cursor:pointer;">Cancelar</button>
                <button onclick="guardarEditNutricion('${noveltyId}')" style="padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:14px;">💾 Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function guardarEditNutricion(noveltyId) {
    const fecha = document.getElementById('en_fecha')?.value;
    const peso = parseFloat(document.getElementById('en_peso')?.value);
    const talla = parseFloat(document.getElementById('en_talla')?.value);
    const perimetro = parseFloat(document.getElementById('en_perimetro')?.value);
    const regimen = document.getElementById('en_regimen')?.value;
    const eps = document.getElementById('en_eps')?.value;

    if (!fecha) { showToast('❌ La fecha de valoración es obligatoria', 'error'); return; }
    if (!peso || peso < 5 || peso > 30) { showToast('❌ Peso inválido (5-30 kg)', 'error'); return; }
    if (!talla || talla < 65 || talla > 120) { showToast('❌ Talla inválida (65-120 cm)', 'error'); return; }
    if (!perimetro || perimetro < 6 || perimetro > 30) { showToast('❌ Perímetro braquial inválido (6-30 cm)', 'error'); return; }

    // Calculate estado nutricional using existing logic
    const novelty = currentNovelties.find(n => n.id === noveltyId);
    const dob = novelty?.ingreso?.dob || novelty?.ingresoDOB || '';
    const ingresoDate = novelty?.ingreso?.ingresoDate || novelty?.ingresoDate || '';
    const gender = novelty?.ingreso?.gender || novelty?.gender || '';
    let estadoNutricional = 'Sin calcular';
    try {
        estadoNutricional = calcularEstadoNutricionalDirecto(peso, talla, dob, ingresoDate, gender) || 'Sin calcular';
    } catch(e) {}

    const nutricionData = {
        pendiente: false,
        fecha,
        peso: peso.toString(),
        talla: talla.toString(),
        perimetroBraquial: perimetro.toString(),
        regimen: regimen || '',
        eps: eps || '',
        estadoNutricional
    };

    try {
        await database.ref(`${AsociacionesModule.getRef('novelties')}/${noveltyId}/nutricion`).set(nutricionData);
        // Update local cache
        const idx = currentNovelties.findIndex(n => n.id === noveltyId);
        if (idx !== -1) currentNovelties[idx].nutricion = nutricionData;

        showToast('✅ Datos nutricionales guardados correctamente', 'success');
        document.getElementById('editNutricionModal')?.remove();

        // Refresh current modal if open
        if (currentNoveltyData && currentNoveltyData.id === noveltyId) {
            currentNoveltyData.nutricion = nutricionData;
            const cardsView = document.getElementById('cardsView');
            const plainTextContent = document.getElementById('plainTextContent');
            let udsCode = '', udsName = currentNoveltyData.udsName || '';
            if (currentNoveltyData.udsFull && currentNoveltyData.udsFull.includes(' - ')) {
                const parts = currentNoveltyData.udsFull.split(' - ');
                udsName = parts[0]; udsCode = parts[1];
            }
            if (cardsView) cardsView.innerHTML = generateFiveCards(currentNoveltyData, false, udsName, udsCode);
            if (plainTextContent) plainTextContent.textContent = generatePlainTextFive(currentNoveltyData, false, udsName, udsCode);
        }

        loadNovelties();
    } catch(err) {
        showToast('❌ Error al guardar: ' + err.message, 'error');
    }
}

// Helper para calcular estado nutricional directamente con valores numéricos
function calcularEstadoNutricionalDirecto(peso, talla, dob, fechaIngreso, gender) {
    if (!peso || !talla || !dob || !fechaIngreso) return null;
    const fechaRef = new Date(fechaIngreso);
    const fechaNac = new Date(dob);
    if (isNaN(fechaRef) || isNaN(fechaNac)) return null;
    const meses = (fechaRef.getFullYear() - fechaNac.getFullYear()) * 12 + (fechaRef.getMonth() - fechaNac.getMonth());
    if (meses < 0 || meses > 60) return null;
    const zPT = calcularZScore(peso, talla, gender, 'PT', meses);
    if (zPT === null) return 'Sin datos OMS';
    if (zPT < -3) return 'Desnutrición Aguda Severa';
    if (zPT < -2) return 'Desnutrición Aguda Moderada';
    if (zPT < -1) return 'Riesgo de Desnutrición';
    if (zPT <= 1) return 'Peso Normal';
    if (zPT <= 2) return 'Riesgo de Sobrepeso';
    if (zPT <= 3) return 'Sobrepeso';
    return 'Obesidad';
}






// ============================================
// SECCIÓN ANÁLISIS NUTRICIONAL - JAVASCRIPT CORREGIDO
// ============================================

let datosNutricionales = [];
let datosNutricionalesFiltrados = [];
let paginaNutricional = 1;
const itemsPorPaginaNutricional = 15;

// Instancias de gráficas
let chartEstados = null;
let chartContratos = null;
let chartEvolucion = null;
let chartPesoTalla = null;
let chartCriticosUDS = null;
let chartPerimetro = null;
let chartIndividual = null;

// Colores mejorados para gráficas
const COLORES_GRAFICAS = {
    primarios: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
    desnutricion: {
        severa: '#C0392B',      // Rojo oscuro
        moderada: '#E74C3C',    // Rojo
        riesgo: '#F39C12',      // Naranja
        normal: '#27AE60',      // Verde
        riesgoSobrepeso: '#F1C40F', // Amarillo
        sobrepeso: '#E67E22',   // Naranja oscuro
        obesidad: '#8E44AD'     // Púrpura
    },
    contratos: new Proxy({
        _palette: ['#F39C12','#3498DB','#27AE60','#E91E63','#9C27B0','#FF5722','#009688','#795548']
    }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            const contratos = Object.keys(window.UDS_DATA || {});
            const idx = contratos.indexOf(prop);
            if (idx >= 0) return target._palette[idx % target._palette.length];
            return '#95A5A6';
        }
    }),
    estadoBorde: {
        severa: '3px solid #C0392B',
        moderada: '3px solid #E74C3C',
        'riesgo-desnutricion': '3px solid #F39C12',
        normal: '3px solid #27AE60',
        'riesgo-sobrepeso': '3px solid #F1C40F',
        sobrepeso: '3px solid #E67E22',
        obesidad: '3px solid #8E44AD',
        'sin-datos': '3px solid #95A5A6'
    }
};

// Inicializar sección nutricional
function initNutricionalSection() {
    cargarDatosNutricionales();
}

// Cargar datos de ambas fuentes (activas y archivadas)
async function cargarDatosNutricionales() {
    showToast('🍎 Cargando datos nutricionales...', 'info');
    
    try {
        const [activasSnap, archivadasSnap] = await Promise.all([
            database.ref(AsociacionesModule.getRef('novelties')).once('value'),
            database.ref(AsociacionesModule.getRef('archived')).once('value')
        ]);
        
        const activas = activasSnap.val() || {};
        const archivadas = archivadasSnap.val() || {};
        
        datosNutricionales = [];
        
        // Procesar activas
        Object.entries(activas).forEach(([id, data]) => {
            const registro = extraerDatosNutricionales(id, data, 'activa');
            if (registro) datosNutricionales.push(registro);
        });
        
        // Procesar archivadas
        Object.entries(archivadas).forEach(([id, data]) => {
            const registro = extraerDatosNutricionales(id, data, 'archivada');
            if (registro) datosNutricionales.push(registro);
        });
        
        // Aplicar filtros iniciales
        filterNutricionalData();
        
        showToast(`✅ ${datosNutricionales.length} registros nutricionales cargados`, 'success');
    } catch (error) {
        console.error('Error cargando datos nutricionales:', error);
        showToast('❌ Error al cargar datos nutricionales', 'error');
    }
}

// Extraer datos nutricionales de un registro
function extraerDatosNutricionales(id, data, tipo) {
    // Solo procesar si tiene datos de ingreso (donde está la info nutricional)
    if (!data.hasIngreso && data.type !== 'ingreso' && data.type !== 'ambos') {
        return null;
    }
    
    const ingreso = data.ingreso || data;
    const nutricion = data.nutricion || (data.ingreso && data.ingreso.nutricion) || {};
    
    // Extraer código UDS
    let udsCode = '';
    let udsName = data.udsName || 'Sin UDS';
    if (data.udsFull && data.udsFull.includes(' - ')) {
        const parts = data.udsFull.split(' - ');
        udsName = parts[0];
        udsCode = parts[1];
    }
    
    // Determinar estado nutricional con cálculo si no existe
    let estadoNutricional = nutricion.estadoNutricional || 'Sin datos';
    let categoriaEstado = categorizarEstado(estadoNutricional);
    
    // Si hay peso y talla pero no hay estado calculado, calcularlo
    if (estadoNutricional === 'Sin datos' && nutricion.peso && nutricion.talla && ingreso.gender) {
        const calculado = calcularRangoOMS(parseFloat(nutricion.talla), parseFloat(nutricion.peso), ingreso.gender);
        estadoNutricional = calculado.nombre;
        categoriaEstado = categorizarEstado(estadoNutricional);
    }
    
    return {
        id,
        tipo,
        originalData: data,
        // Info general
        contract: data.contract || 'N/A',
        udsName,
        udsCode,
        fechaRegistro: data.timestamp,
        // Info niño
        nombre: ingreso.name || 'N/A',
        documento: ingreso.document || 'N/A',
        tipoDoc: ingreso.docType || 'RC',
        edad: ingreso.age || data.age || 'N/A',
        fechaNacimiento: ingreso.dob || ingreso.ingresoDOB || data.ingresoDOB,
        genero: ingreso.gender || 'N/A',
        // Info nutricional
        peso: parseFloat(nutricion.peso) || null,
        talla: parseFloat(nutricion.talla) || null,
        perimetroBraquial: parseFloat(nutricion.perimetroBraquial) || null,
        fechaValoracion: nutricion.fecha || null,
        regimen: nutricion.regimen || 'N/A',
        eps: nutricion.eps || 'N/A',
        estadoNutricional,
        categoriaEstado,
        // Para gráficas
        imc: (nutricion.peso && nutricion.talla) ? 
            (nutricion.peso / Math.pow(nutricion.talla / 100, 2)).toFixed(2) : null
    };
}

// Categorizar estado nutricional mejorado
function categorizarEstado(estado) {
    if (!estado || estado === 'Sin datos') return 'sin-datos';
    if (estado.includes('Severa')) return 'severa';
    if (estado.includes('Moderada')) return 'moderada';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return 'riesgo-desnutricion';
    if (estado.includes('Normal')) return 'normal';
    if (estado.includes('Riesgo') && estado.includes('Sobrepeso')) return 'riesgo-sobrepeso';
    if (estado.includes('Sobrepeso')) return 'sobrepeso';
    if (estado.includes('Obesidad')) return 'obesidad';
    return 'sin-datos';
}

// Filtrar datos nutricionales CORREGIDO
function filterNutricionalData() {
    const contrato = document.getElementById('nutricionalFilterContract')?.value || '';
    const estado = document.getElementById('nutricionalFilterEstado')?.value || '';
    const tipo = document.getElementById('nutricionalFilterTipo')?.value || 'ambas';
    const critico = document.getElementById('nutricionalFilterCritico')?.value || '';
    const mes = document.getElementById('nutricionalFilterMes')?.value || '';
    const search = document.getElementById('nutricionalSearch')?.value.toLowerCase() || '';
    
    datosNutricionalesFiltrados = datosNutricionales.filter(d => {
        // Filtro por contrato
        if (contrato && d.contract !== contrato) return false;
        
        // Filtro por estado nutricional - CORREGIDO
        if (estado) {
            // Coincidencia exacta o parcial del estado
            const estadoLower = estado.toLowerCase();
            const dEstadoLower = d.estadoNutricional.toLowerCase();
            
            // Si es "Sin datos", buscar exacto
            if (estado === 'Sin datos') {
                if (d.estadoNutricional !== 'Sin datos') return false;
            } else {
                // Para otros estados, buscar coincidencia parcial
                if (!dEstadoLower.includes(estadoLower)) return false;
            }
        }
        
        // Filtro por tipo (activa/archivada)
        if (tipo === 'activas' && d.tipo !== 'activa') return false;
        if (tipo === 'archivadas' && d.tipo !== 'archivada') return false;
        
        // Filtro por mes
        if (mes && d.fechaValoracion) {
            const fechaVal = new Date(d.fechaValoracion);
            const mesVal = fechaVal.toISOString().slice(0, 7);
            if (mesVal !== mes) return false;
        }
        
        // Filtro por búsqueda
        if (search) {
            const matchNombre = d.nombre?.toLowerCase().includes(search);
            const matchDoc = d.documento?.includes(search);
            const matchUDS = d.udsName?.toLowerCase().includes(search);
            if (!matchNombre && !matchDoc && !matchUDS) return false;
        }
        
        return true;
    });
    
    // Resetear paginación al filtrar
    paginaNutricional = 1;
    
    // Actualizar UI
    actualizarResumenRapido();
    actualizarGraficasNutricionales();
    renderizarAccordionEstados();
    renderizarTablaNutricional();
    actualizarInfoFiltros();
}

// Actualizar información de filtros aplicados en las gráficas
function actualizarInfoFiltros() {
    const estado = document.getElementById('nutricionalFilterEstado')?.value || '';
    const contrato = document.getElementById('nutricionalFilterContract')?.value || '';
    const critico = document.getElementById('nutricionalFilterCritico')?.value || '';
    
    // Info para gráfica de distribución
    const infoDistribucion = document.getElementById('infoDistribucion');
    if (infoDistribucion) {
        let mensaje = '';
        if (estado) mensaje += `<strong>Filtrado por:</strong> ${estado}`;
        if (contrato) mensaje += (mensaje ? ' | ' : '<strong>Filtrado por:</strong> ') + `Contrato ${contrato}`;
        if (critico) mensaje += (mensaje ? ' | ' : '<strong>Filtrado por:</strong> ') + `Casos ${critico}`;
        
        infoDistribucion.innerHTML = mensaje || 'Mostrando todos los registros';
        infoDistribucion.style.display = 'block';
    }
    
    // Info para gráfica de contratos
    const infoContratos = document.getElementById('infoContratos');
    if (infoContratos) {
        let mensaje = '';
        if (estado) mensaje = `<strong>Análisis de:</strong> ${estado} por contrato`;
        else if (critico) mensaje = `<strong>Análisis de casos:</strong> ${critico} por contrato`;
        else mensaje = '<strong>Distribución por contrato:</strong> Todos los estados';
        
        infoContratos.innerHTML = mensaje;
        infoContratos.style.display = 'block';
    }
    
    // Info para gráfica de críticos por UDS
    const infoCriticosUDS = document.getElementById('infoCriticosUDS');
    if (infoCriticosUDS) {
        let mensaje = '';
        if (estado) mensaje = `<strong>UDS con más casos de:</strong> ${estado}`;
        else if (critico) mensaje = `<strong>UDS con casos:</strong> ${critico}`;
        else mensaje = '<strong>UDS con más casos críticos:</strong> Desnutrición severa, moderada y obesidad';
        
        infoCriticosUDS.innerHTML = mensaje;
        infoCriticosUDS.style.display = 'block';
    }
}

// Actualizar resumen rápido con colores mejorados
function actualizarResumenRapido() {
    const container = document.getElementById('nutricionalResumenRapido');
    if (!container) return;
    
    const total = datosNutricionalesFiltrados.length;
    
    // Contar por categoría
    const conteos = {};
    datosNutricionalesFiltrados.forEach(d => {
        conteos[d.categoriaEstado] = (conteos[d.categoriaEstado] || 0) + 1;
    });
    
    const criticos = (conteos['severa'] || 0) + (conteos['moderada'] || 0) + (conteos['obesidad'] || 0);
    const alertas = (conteos['riesgo-desnutricion'] || 0) + (conteos['riesgo-sobrepeso'] || 0) + (conteos['sobrepeso'] || 0);
    const normales = conteos['normal'] || 0;
    const sinDatos = conteos['sin-datos'] || 0;
    
    // Determinar contrato con más casos si hay filtro de estado
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    let contratoMax = '';
    let maxCount = 0;
    
    if (estadoFiltrado && estadoFiltrado !== 'Sin datos') {
        const porContrato = {};
        datosNutricionalesFiltrados.forEach(d => {
            if (d.estadoNutricional.includes(estadoFiltrado)) {
                porContrato[d.contract] = (porContrato[d.contract] || 0) + 1;
            }
        });
        
        Object.entries(porContrato).forEach(([contrato, count]) => {
            if (count > maxCount) {
                maxCount = count;
                contratoMax = contrato;
            }
        });
    }
    
    let html = `
        <div class="stats-card text-center p-3" style="border-left: 4px solid #3498DB;">
            <div class="text-2xl font-black text-slate-800 dark:text-white">${total}</div>
            <div class="text-xs text-slate-500 uppercase">Total Analizados</div>
        </div>
        
    `;
    
    // Agregar tarjeta de contrato líder si hay filtro de estado
    if (contratoMax && maxCount > 0) {
        const colorContrato = COLORES_GRAFICAS.contratos[contratoMax] || '#95A5A6';
        html += `
            <div class="stats-card text-center p-3" style="border-left: 4px solid ${colorContrato}; grid-column: span 2;">
                <div class="text-lg font-black" style="color: ${colorContrato};">Contrato ${contratoMax}</div>
                <div class="text-xs text-slate-500 uppercase">Con más casos de ${estadoFiltrado}: ${maxCount}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Actualizar todas las gráficas con colores mejorados
function actualizarGraficasNutricionales() {
    graficarDistribucionEstados();
    graficarPorContrato();
    graficarEvolucionMensual();
    graficarPesoTalla();
    graficarCriticosPorUDS();
    graficarPerimetroBraquial();
}

// Gráfica 1: Distribución por estados con colores específicos
function graficarDistribucionEstados() {
    const ctx = document.getElementById('chartEstadosNutricionales');
    if (!ctx) return;
    
    const conteos = {};
    datosNutricionalesFiltrados.forEach(d => {
        conteos[d.estadoNutricional] = (conteos[d.estadoNutricional] || 0) + 1;
    });
    
    const labels = Object.keys(conteos);
    const data = Object.values(conteos);
    
    // Asignar colores según el estado
    const colors = labels.map(l => {
        if (l.includes('Severa')) return COLORES_GRAFICAS.desnutricion.severa;
        if (l.includes('Moderada')) return COLORES_GRAFICAS.desnutricion.moderada;
        if (l.includes('Riesgo') && l.includes('Desnutrición')) return COLORES_GRAFICAS.desnutricion.riesgo;
        if (l.includes('Normal')) return COLORES_GRAFICAS.desnutricion.normal;
        if (l.includes('Riesgo') && l.includes('Sobrepeso')) return COLORES_GRAFICAS.desnutricion.riesgoSobrepeso;
        if (l.includes('Sobrepeso')) return COLORES_GRAFICAS.desnutricion.sobrepeso;
        if (l.includes('Obesidad')) return COLORES_GRAFICAS.desnutricion.obesidad;
        return '#95A5A6';
    });
    
    if (chartEstados) chartEstados.destroy();
    
    chartEstados = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        boxWidth: 15, 
                        padding: 15,
                        font: { size: 11, weight: 'bold' },
                        color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#334155',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label}: ${data.datasets[0].data[i]}`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfica 2: Por contrato con análisis de estado filtrado
function graficarPorContrato() {
    const ctx = document.getElementById('chartPorContrato');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Obtener contratos dinámicamente del perfil activo
    const contratosActivos = Object.keys(window.UDS_DATA || {});
    const perfil = AsociacionesModule.getPerfilActivo();
    const contratosLabels = contratosActivos.map(c => (perfil?.contratos?.[c]) || `Contrato ${c}`);
    
    // Agrupar por contrato y estado
    const porContrato = {};
    contratosActivos.forEach(c => { porContrato[c] = {}; });
    
    const estadosUnicos = [...new Set(datosNutricionalesFiltrados.map(d => d.estadoNutricional))];
    
    datosNutricionalesFiltrados.forEach(d => {
        if (porContrato[d.contract] !== undefined) {
            porContrato[d.contract][d.estadoNutricional] = 
                (porContrato[d.contract][d.estadoNutricional] || 0) + 1;
        }
    });
    
    // Si hay filtro de estado, mostrar solo ese estado por contrato
    let datasets;
    if (estadoFiltrado && estadoFiltrado !== 'Sin datos') {
        // Modo: comparación de un estado específico entre contratos
        datasets = [{
            label: estadoFiltrado,
            data: contratosActivos.map(c => porContrato[c][estadoFiltrado] || 0),
            backgroundColor: contratosActivos.map(c => {
                const count = porContrato[c][estadoFiltrado] || 0;
                const baseColor = COLORES_GRAFICAS.contratos[c];
                return count > 0 ? baseColor : '#E5E7EB';
            }),
            borderRadius: 8,
            borderWidth: 2,
            borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
        }];
    } else {
        // Modo: todos los estados apilados
        datasets = estadosUnicos.map((estado, idx) => ({
            label: estado,
            data: contratosActivos.map(c => porContrato[c][estado] || 0),
            backgroundColor: getColorPorEstado(estado),
            borderRadius: 4,
            borderWidth: 1,
            borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
        }));
    }
    
    if (chartContratos) chartContratos.destroy();
    
    chartContratos = new Chart(ctx, {
        type: estadoFiltrado ? 'bar' : 'bar',
        data: {
            labels: contratosLabels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: estadoFiltrado ? {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: `Casos de ${estadoFiltrado}` }
                }
            } : {
                x: { stacked: true },
                y: { 
                    stacked: true, 
                    beginAtZero: true,
                    title: { display: true, text: 'Número de casos' }
                }
            },
            plugins: {
                legend: estadoFiltrado ? { display: false } : {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 9 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            if (estadoFiltrado) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                                return `Del total filtrado: ${percentage}%`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Gráfica 3: Evolución temporal con colores
function graficarEvolucionMensual() {
    const ctx = document.getElementById('chartEvolucionMensual');
    if (!ctx) return;
    
    const porMes = {};
    const porEstadoMes = {};
    
    datosNutricionalesFiltrados.forEach(d => {
        if (d.fechaValoracion) {
            const mes = d.fechaValoracion.slice(0, 7); // YYYY-MM
            porMes[mes] = (porMes[mes] || 0) + 1;
            
            if (!porEstadoMes[mes]) porEstadoMes[mes] = {};
            porEstadoMes[mes][d.categoriaEstado] = (porEstadoMes[mes][d.categoriaEstado] || 0) + 1;
        }
    });
    
    const meses = Object.keys(porMes).sort();
    
    // Crear datasets por estado
    const estadosOrden = ['severa', 'moderada', 'riesgo-desnutricion', 'normal', 'riesgo-sobrepeso', 'sobrepeso', 'obesidad'];
    const datasets = estadosOrden.map(estado => ({
        label: getNombreEstado(estado),
        data: meses.map(m => porEstadoMes[m]?.[estado] || 0),
        borderColor: getColorPorCategoria(estado),
        backgroundColor: getColorPorCategoria(estado) + '40', // 40 = 25% opacidad
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: getColorPorCategoria(estado),
        pointBorderColor: '#fff',
        pointBorderWidth: 2
    })).filter(ds => ds.data.some(v => v > 0)); // Solo mostrar estados con datos
    
    if (chartEvolucion) chartEvolucion.destroy();
    
    chartEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses.map(m => {
                const [year, month] = m.split('-');
                return `${month}/${year}`;
            }),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de valoraciones' }
                },
                x: {
                    title: { display: true, text: 'Mes' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 },
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Gráfica 4: Peso vs Talla Scatter mejorado
function graficarPesoTalla() {
    const ctx = document.getElementById('chartPesoTalla');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Agrupar puntos por estado
    const puntosPorEstado = {};
    
    datosNutricionalesFiltrados
        .filter(d => d.peso && d.talla)
        .forEach(d => {
            if (!puntosPorEstado[d.categoriaEstado]) {
                puntosPorEstado[d.categoriaEstado] = [];
            }
            puntosPorEstado[d.categoriaEstado].push({
                x: d.talla,
                y: d.peso,
                nombre: d.nombre,
                uds: d.udsName,
                contrato: d.contract
            });
        });
    
    // Crear datasets por estado
    const datasets = Object.entries(puntosPorEstado).map(([estado, puntos]) => ({
        label: getNombreEstado(estado),
        data: puntos,
        backgroundColor: getColorPorCategoria(estado),
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: estado === 'severa' || estado === 'moderada' ? 'triangle' : 
                    estado === 'obesidad' ? 'rect' : 'circle'
    }));
    
    if (chartPesoTalla) chartPesoTalla.destroy();
    
    chartPesoTalla = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    title: { display: true, text: 'Talla (cm)', font: { weight: 'bold' } },
                    min: 45,
                    max: 135,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                y: { 
                    title: { display: true, text: 'Peso (kg)', font: { weight: 'bold' } },
                    min: 0,
                    max: 35,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.nombre}`,
                                `Peso: ${point.y} kg`,
                                `Talla: ${point.x} cm`,
                                `UDS: ${point.uds}`,
                                `Contrato: ${point.contrato}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Gráfica 5: Casos críticos por UDS con análisis
function graficarCriticosPorUDS() {
    const ctx = document.getElementById('chartCriticosUDS');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Contar por UDS
    const porUDS = {};
    
    datosNutricionalesFiltrados.forEach(d => {
        // Si hay filtro de estado, solo contar ese estado
        // Si no, contar todos los críticos
        const incluir = estadoFiltrado ? 
            d.estadoNutricional.includes(estadoFiltrado) :
            ['severa', 'moderada', 'obesidad'].includes(d.categoriaEstado);
        
        if (incluir) {
            if (!porUDS[d.udsName]) {
                porUDS[d.udsName] = { total: 0, porContrato: {} };
            }
            porUDS[d.udsName].total++;
            porUDS[d.udsName].porContrato[d.contract] = (porUDS[d.udsName].porContrato[d.contract] || 0) + 1;
        }
    });
    
    const udsOrdenadas = Object.entries(porUDS)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);
    
    // Crear gradientes de color según cantidad
    const maxCount = Math.max(...udsOrdenadas.map(([, data]) => data.total));
    
    if (chartCriticosUDS) chartCriticosUDS.destroy();
    
    chartCriticosUDS = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: udsOrdenadas.map(([uds]) => uds.length > 25 ? uds.slice(0, 25) + '...' : uds),
            datasets: [{
                label: estadoFiltrado || 'Casos Críticos',
                data: udsOrdenadas.map(([, data]) => data.total),
                backgroundColor: udsOrdenadas.map(([, data]) => {
                    const intensity = data.total / maxCount;
                    // Gradiente de rojo según intensidad
                    const r = Math.floor(231 - (231 - 192) * intensity);
                    const g = Math.floor(76 - 76 * intensity);
                    const b = Math.floor(60 - 60 * intensity);
                    return `rgb(${r}, ${g}, ${b})`;
                }),
                borderRadius: 6,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const udsData = udsOrdenadas[context.dataIndex][1];
                            const contratoInfo = Object.entries(udsData.porContrato)
                                .map(([c, count]) => `Contrato ${c}: ${count}`)
                                .join(', ');
                            return `Por contrato: ${contratoInfo}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de casos' }
                }
            }
        }
    });
}

// Gráfica 6: Perímetro braquial con rangos
function graficarPerimetroBraquial() {
    const ctx = document.getElementById('chartPerimetroBraquial');
    if (!ctx) return;
    
    // Rangos de perímetro braquial según OMS (0-5 años)
    const rangos = {
        '< 11.5 cm (Desnutrición Aguda)': 0,
        '11.5 - 12.5 cm (Riesgo)': 0,
        '12.5 - 13.5 cm (Normal)': 0,
        '> 13.5 cm (Adecuado)': 0,
        'Sin datos': 0
    };
    
    const colores = {
        '< 11.5 cm (Desnutrición Aguda)': '#C0392B',
        '11.5 - 12.5 cm (Riesgo)': '#F39C12',
        '12.5 - 13.5 cm (Normal)': '#27AE60',
        '> 13.5 cm (Adecuado)': '#2980B9',
        'Sin datos': '#95A5A6'
    };
    
    datosNutricionalesFiltrados.forEach(d => {
        if (!d.perimetroBraquial) {
            rangos['Sin datos']++;
        } else if (d.perimetroBraquial < 11.5) {
            rangos['< 11.5 cm (Desnutrición Aguda)']++;
        } else if (d.perimetroBraquial < 12.5) {
            rangos['11.5 - 12.5 cm (Riesgo)']++;
        } else if (d.perimetroBraquial < 13.5) {
            rangos['12.5 - 13.5 cm (Normal)']++;
        } else {
            rangos['> 13.5 cm (Adecuado)']++;
        }
    });
    
    const labels = Object.keys(rangos).filter(l => rangos[l] > 0);
    const data = labels.map(l => rangos[l]);
    const backgroundColor = labels.map(l => colores[l]);
    
    if (chartPerimetro) chartPerimetro.destroy();
    
    chartPerimetro = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.y || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} niños (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de niños' }
                }
            }
        }
    });
}

// Renderizar acordeón de estados mejorado
function renderizarAccordionEstados() {
    const container = document.getElementById('accordionEstados');
    if (!container) return;
    
    // Agrupar por estado
    const porEstado = {};
    datosNutricionalesFiltrados.forEach(d => {
        if (!porEstado[d.estadoNutricional]) {
            porEstado[d.estadoNutricional] = [];
        }
        porEstado[d.estadoNutricional].push(d);
    });
    
    // Ordenar por criticidad
    const ordenEstados = [
        'Desnutrición Aguda Severa',
        'Desnutrición Aguda Moderada',
        'Riesgo de Desnutrición',
        'Peso Normal',
        'Riesgo de Sobrepeso',
        'Sobrepeso',
        'Obesidad',
        'Sin datos'
    ];
    
    let html = '';
    ordenEstados.forEach(estado => {
        if (porEstado[estado] && porEstado[estado].length > 0) {
            const ninos = porEstado[estado];
            const categoria = ninos[0].categoriaEstado;
            const icono = getIconoEstado(categoria);
            const color = getColorPorCategoria(categoria);
            
            // Análisis por contrato
            const porContrato = {};
            ninos.forEach(n => {
                porContrato[n.contract] = (porContrato[n.contract] || 0) + 1;
            });
            
            const analisisContratos = Object.entries(porContrato)
                .sort((a, b) => b[1] - a[1])
                .map(([c, count]) => `<span style="color: ${COLORES_GRAFICAS.contratos[c]}; font-weight: 600;">Contrato ${c}: ${count}</span>`)
                .join(' | ');
            
            html += `
                <div class="accordion-item-nutricional estado-${categoria}" style="border-left: ${COLORES_GRAFICAS.estadoBorde[categoria]};">
                    <div class="accordion-header-nutricional" onclick="toggleAccordion(this)">
                        <div class="accordion-title-nutricional">
                            <div class="estado-icono" style="background: ${color}20; color: ${color};">${icono}</div>
                            <div>
                                <span class="estado-nombre" style="color: ${color};">${estado}</span>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${analisisContratos}</div>
                            </div>
                            <span class="estado-cantidad" style="background: ${color}; color: white;">${ninos.length} niños</span>
                        </div>
                        <svg class="accordion-arrow w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <div class="accordion-content-nutricional">
                        <div class="accordion-body-nutricional">
                            <div class="ninos-grid-estado">
                                ${ninos.map(nino => renderizarCardNino(nino)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<p class="text-center text-slate-500 py-4">No hay datos para mostrar con los filtros aplicados</p>';
}

// Renderizar card de niño mejorado
function renderizarCardNino(nino) {
    const badgeTipo = nino.tipo === 'activa' ? 
        '<span class="nino-badge activa">ACTIVA</span>' : 
        '<span class="nino-badge archivada">ARCHIVADA</span>';
    
    const colorEstado = getColorPorCategoria(nino.categoriaEstado);
    
    return `
        <div class="nino-card-estado" style="border-left: 3px solid ${colorEstado};">
            <div class="nino-card-header">
                <span class="nino-nombre">${nino.nombre?.toUpperCase() || 'SIN NOMBRE'}</span>
                ${badgeTipo}
            </div>
            <div class="nino-datos">
                <div class="nino-dato">
                    <span class="nino-dato-label">📄 Documento</span>
                    <span class="nino-dato-valor">${nino.tipoDoc} ${nino.documento}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">🎂 Edad</span>
                    <span class="nino-dato-valor">${nino.edad}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">⚖️ Peso</span>
                    <span class="nino-dato-valor" style="color: ${colorEstado}; font-weight: 700;">${nino.peso ? nino.peso + ' kg' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📏 Talla</span>
                    <span class="nino-dato-valor" style="color: ${colorEstado}; font-weight: 700;">${nino.talla ? nino.talla + ' cm' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">💪 Perímetro Braquial</span>
                    <span class="nino-dato-valor">${nino.perimetroBraquial ? nino.perimetroBraquial + ' cm' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">🏫 UDS</span>
                    <span class="nino-dato-valor" style="font-size: 10px;">${nino.udsName}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📋 Contrato</span>
                    <span class="nino-dato-valor" style="color: ${COLORES_GRAFICAS.contratos[nino.contract] || '#64748b'}; font-weight: 600;">${nino.contract}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📅 Valoración</span>
                    <span class="nino-dato-valor">${nino.fechaValoracion || '-'}</span>
                </div>
            </div>
            <div class="nino-actions" onclick="event.stopPropagation()">
                <button class="btn-ver-grafica" onclick="verGraficaIndividual('${nino.id}', '${nino.tipo}')">
                    📊 Ver Gráfica OMS
                </button>
                <button class="btn-ver-detalles" onclick="verDetalleNino('${nino.id}', '${nino.tipo}')">
                    👁️ Ver Detalles
                </button>
            </div>
        </div>
    `;
}

// Renderizar tabla nutricional con datos filtrados
function renderizarTablaNutricional() {
    const tbody = document.getElementById('tbodyNutricional');
    const countEl = document.getElementById('nutricionalCount');
    if (!tbody) return;
    
    countEl.textContent = `${datosNutricionalesFiltrados.length} registros encontrados`;
    
    const start = (paginaNutricional - 1) * itemsPorPaginaNutricional;
    const paginados = datosNutricionalesFiltrados.slice(start, start + itemsPorPaginaNutricional);
    
    tbody.innerHTML = paginados.map(n => {
        const estadoClass = `estado-${n.categoriaEstado}-cell`;
        const badgeTipo = n.tipo === 'activa' ? 
            '<span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd;">ACTIVA</span>' :
            '<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3a8;">ARCHIVADA</span>';
        
        const colorEstado = getColorPorCategoria(n.categoriaEstado);
        
        return `
            <tr style="border-left: 3px solid ${colorEstado};">
                <td><span class="estado-cell ${estadoClass}" style="background: ${colorEstado}20; color: ${colorEstado}; border: 1px solid ${colorEstado};">${getIconoEstado(n.categoriaEstado)} ${n.estadoNutricional}</span></td>
                <td>${badgeTipo}</td>
                <td><span class="badge" style="background: ${COLORES_GRAFICAS.contratos[n.contract] || '#64748b'}; color: white;">${n.contract}</span></td>
                <td>${n.udsName}</td>
                <td><strong style="color: #fbbf24;">${n.nombre?.toUpperCase() || 'N/A'}</strong></td>
                <td>${n.tipoDoc} ${n.documento}</td>
                <td>${n.edad}</td>
                <td style="color: #fbbf24; font-weight: 700;">${n.peso ? n.peso + ' kg' : '-'}</td>
                <td style="color: #fbbf24; font-weight: 700;">${n.talla ? n.talla + ' cm' : '-'}</td>
                <td><span style="color: ${colorEstado}; font-weight: 600;">${n.estadoNutricional}</span></td>
                <td>
                    <button onclick="verGraficaIndividual('${n.id}', '${n.tipo}')" class="text-emerald-400 hover:text-emerald-300 text-xs font-bold mr-2" style="background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px;">📊 OMS</button>
                    <button onclick="verDetalleNino('${n.id}', '${n.tipo}')" class="text-blue-400 hover:text-blue-300 text-xs font-bold" style="background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px;">Ver</button>
                </td>
            </tr>
        `;
    }).join('');
    
    renderizarPaginacionNutricional();
}

// Paginación
function renderizarPaginacionNutricional() {
    const container = document.getElementById('paginationNutricional');
    if (!container) return;
    
    const totalPages = Math.ceil(datosNutricionalesFiltrados.length / itemsPorPaginaNutricional);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botón anterior
    html += `
        <button onclick="cambiarPaginaNutricional(${paginaNutricional - 1})" 
            class="px-3 py-1 rounded text-sm ${paginaNutricional === 1 ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
            ${paginaNutricional === 1 ? 'disabled' : ''}>
            ←
        </button>
    `;
    
    // Páginas
    const maxVisible = 5;
    let startPage = Math.max(1, paginaNutricional - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="cambiarPaginaNutricional(1)" class="px-3 py-1 rounded text-sm bg-slate-200 text-slate-700 hover:bg-slate-300">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="cambiarPaginaNutricional(${i})" 
                class="px-3 py-1 rounded text-sm ${i === paginaNutricional ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button onclick="cambiarPaginaNutricional(${totalPages})" class="px-3 py-1 rounded text-sm bg-slate-200 text-slate-700 hover:bg-slate-300">${totalPages}</button>`;
    }
    
    // Botón siguiente
    html += `
        <button onclick="cambiarPaginaNutricional(${paginaNutricional + 1})" 
            class="px-3 py-1 rounded text-sm ${paginaNutricional === totalPages ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
            ${paginaNutricional === totalPages ? 'disabled' : ''}>
            →
        </button>
    `;
    
    container.innerHTML = html;
}

function cambiarPaginaNutricional(pagina) {
    const totalPages = Math.ceil(datosNutricionalesFiltrados.length / itemsPorPaginaNutricional);
    if (pagina < 1 || pagina > totalPages) return;
    
    paginaNutricional = pagina;
    renderizarTablaNutricional();
    
    // Scroll al inicio de la tabla
    document.getElementById('tablaNutricional')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Toggle acordeón
function toggleAccordion(header) {
    const item = header.parentElement;
    const wasActive = item.classList.contains('active');
    
    // Cerrar todos
    document.querySelectorAll('.accordion-item-nutricional').forEach(i => i.classList.remove('active'));
    
    // Abrir el clickeado si no estaba activo
    if (!wasActive) {
        item.classList.add('active');
    }
}

	function verGraficaIndividual(id, tipo) {
		const nino = tipo === 'activa' ? 
			datosNutricionales.find(d => d.id === id && d.tipo === 'activa') :
			datosNutricionales.find(d => d.id === id && d.tipo === 'archivada');
		
		if (!nino) {
			showToast('No se encontró el registro del niño', 'error');
			return;
		}
		
		if (!nino.peso || !nino.talla) {
			showToast('No hay datos de peso/talla suficientes para generar la gráfica OMS', 'warning');
			return;
		}
		
		const modal = document.getElementById('modalGraficaIndividual');
		
		// Abrir modal primero
		modal.classList.add('active');
		document.body.classList.add('modal-open');
		
		// Dibujar la gráfica usando la función unificada (que ahora usa el mismo código que el formulario)
		setTimeout(() => {
			dibujarGraficaIndividualCanvas(nino);
		}, 150);
	}
	
	function dibujarGraficaIndividualCanvas(nino) {
		if (!nino) {
			console.error('No se proporcionó datos del niño');
			return;
		}
		
		if (!nino.peso || !nino.talla || !nino.genero) {
			console.error('Datos incompletos del niño:', nino);
			showToast('No hay datos de peso/talla suficientes para generar la gráfica OMS', 'warning');
			return;
		}
		
		const peso = parseFloat(nino.peso);
		const talla = parseFloat(nino.talla);
		const genero = nino.genero;
		
		// Calcular edad en meses
		let edadMeses = null;
		if (nino.edad) {
			edadMeses = parseEdadAMeses(nino.edad);
		} else if (nino.fechaNacimiento) {
			const hoy = new Date();
			const nacimiento = new Date(nino.fechaNacimiento);
			edadMeses = Math.floor((hoy - nacimiento) / (1000 * 60 * 60 * 24 * 30.44));
		}
		
		// Datos extra para mostrar
		const datosExtra = {
			uds: nino.udsName,
			contrato: nino.contract,
			estadoNutricional: nino.estadoNutricional
		};
		
		// Dibujar usando la función unificada - ESTO ES LO CLAVE
		dibujarGraficaOMS('omsChartIndividual', genero, peso, talla, edadMeses, nino.nombre, datosExtra);
		
		// Actualizar título y subtítulo del modal admin
		const title = document.getElementById('modalIndividualTitle');
		const subtitle = document.getElementById('modalIndividualSubtitle');
		
		if (title) {
			title.textContent = `Gráfica OMS - ${nino.nombre?.toUpperCase() || 'Niño'}`;
		}
		
		if (subtitle) {
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			let edadTexto = edadMeses ? ` • ${Math.floor(edadMeses/12)}a ${edadMeses%12}m` : '';
			subtitle.innerHTML = `${nino.tipoDoc} ${nino.documento} • ${nino.edad || '-'}${edadTexto} • <strong style="color: ${estado.color}">${estado.nombre}</strong>`;
		}
		
		// Actualizar info bar
		const infoBar = document.getElementById('infoNinoBar');
		if (infoBar) {
			const colorEstado = getColorPorCategoria(nino.categoriaEstado);
			
			infoBar.innerHTML = `
				<div class="info-nino-item">
					<span class="info-nino-label">⚖️ Peso</span>
					<span class="info-nino-valor" style="color: #fbbf24; font-size: 18px;">${peso} kg</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📏 Talla</span>
					<span class="info-nino-valor" style="color: #fbbf24; font-size: 18px;">${talla} cm</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📊 Estado</span>
					<span class="info-nino-valor" style="color: ${colorEstado}; font-size: 16px;">${nino.estadoNutricional || 'No calculado'}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">💪 Perímetro Braquial</span>
					<span class="info-nino-valor">${nino.perimetroBraquial ? nino.perimetroBraquial + ' cm' : 'No registrado'}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">🏫 UDS</span>
					<span class="info-nino-valor" style="font-size: 12px;">${nino.udsName}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📋 Contrato</span>
					<span class="info-nino-valor" style="color: ${COLORES_GRAFICAS.contratos[nino.contract] || '#64748b'};">${nino.contract}</span>
				</div>
			`;
		}
	}
	
	

	// Función para llenar la leyenda visual (CORREGIDA)
	function llenarLeyendaIndividual() {
		const container = document.getElementById('leyendaIndividual');
		if (!container) return;
		
		// Leyenda actualizada para tablas 2-5 años
		//PANEL ADMINISTRATIVO INFO INDIVIDUAL
			const rangos = [
				{ nombre: 'Desnutrición Severa (<-3DE)', color: '#C0392B', de: '< -3DE', desc: 'Intervención inmediata' },
				{ nombre: 'Desnutrición Moderada', color: '#E74C3C', de: '-3DE a -2DE', desc: 'Seguimiento cercano' },
				{ nombre: 'Riesgo Desnutrición', color: '#F39C12', de: '-2DE a -1DE', desc: 'Monitoreo preventivo' },
				{ nombre: 'Peso Adecuado (Mediana)', color: '#27AE60', de: '-1DE a +1DE', desc: 'Estado óptimo' },
				{ nombre: 'Riesgo Sobrepeso', color: '#F1C40F', de: '+1DE a +1.5DE', desc: 'Vigilar alimentación' },
				{ nombre: 'Sobrepeso', color: '#E67E22', de: '+1.5DE a +2DE', desc: 'Ajustar dieta/actividad' },
				{ nombre: 'Obesidad (>+2DE)', color: '#8E44AD', de: '> +2DE', desc: 'Intervención nutricional' }
			];
		
		container.innerHTML = rangos.map(r => `
			<div class="leyenda-item" style="background: ${r.color}15; border: 2px solid ${r.color}; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 10px; transition: transform 0.2s;">
				<div style="width: 24px; height: 24px; border-radius: 50%; background: ${r.color}; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
				<div style="flex: 1;">
					<div style="font-weight: 700; font-size: 13px; color: ${r.color};">${r.nombre}</div>
					<div style="font-size: 11px; color: #64748b; line-height: 1.3;">${r.de} • ${r.desc}</div>
				</div>
			</div>
		`).join('');
	}

	function cerrarModalIndividual(event) {
		if (event && event.target.closest('.modal-grafica-content')) return;
		
		const modal = document.getElementById('modalGraficaIndividual');
		modal.classList.remove('active');
		document.body.classList.remove('modal-open');
		
		// Limpiar canvas (no destruir Chart.js porque ahora usamos canvas nativo)
		const canvas = document.getElementById('omsChartIndividual');
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}
	// Ver detalle del niño (abre el modal de detalles general)
	function verDetalleNino(id, tipo) {
		const nino = tipo === 'activa' ? 
			currentNovelties.find(n => n.id === id) :
			archivedNovelties.find(n => n.id === id);
		
		if (nino) {
			viewNoveltyDetails(nino, tipo === 'archivada');
		} else {
			showToast('No se encontró el registro completo', 'error');
		}
	}

// Exportar a Excel con datos filtrados
function exportNutricionalToExcel() {
    if (datosNutricionalesFiltrados.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }
    
    // Agregar información de filtros aplicados
    const estadoFiltro = document.getElementById('nutricionalFilterEstado')?.value || 'Todos';
    const contratoFiltro = document.getElementById('nutricionalFilterContract')?.value || 'Todos';
    const criticoFiltro = document.getElementById('nutricionalFilterCritico')?.value || 'Todos';
    
    const exportData = datosNutricionalesFiltrados.map(d => ({
        'Tipo': d.tipo === 'activa' ? 'Activa' : 'Archivada',
        'Contrato': d.contract,
        'UDS': d.udsName,
        'Código UDS': d.udsCode,
        'Nombre Niño': d.nombre,
        'Documento': `${d.tipoDoc} ${d.documento}`,
        'Edad': d.edad,
        'Fecha Nacimiento': d.fechaNacimiento || '-',
        'Género': d.genero === 'M' ? 'Masculino' : 'Femenino',
        'Peso (kg)': d.peso || '-',
        'Talla (cm)': d.talla || '-',
        'Perímetro Braquial (cm)': d.perimetroBraquial || '-',
        'IMC': d.imc || '-',
        'Fecha Valoración': d.fechaValoracion || '-',
        'Estado Nutricional': d.estadoNutricional,
        'Régimen': d.regimen,
        'EPS': d.eps
    }));
    
    // Crear hoja de resumen
    const resumenData = [
        ['ANÁLISIS NUTRICIONAL - ASOCIACIÓN JER'],
        ['Fecha de exportación:', new Date().toLocaleString('es-CO')],
        [''],
        ['FILTROS APLICADOS:'],
        ['Estado:', estadoFiltro],
        ['Contrato:', contratoFiltro],
        ['Casos:', criticoFiltro],
        [''],
        ['RESUMEN:'],
        ['Total registros:', datosNutricionalesFiltrados.length]
    ];
    
    // Contar por estado
    const porEstado = {};
    datosNutricionalesFiltrados.forEach(d => {
        porEstado[d.estadoNutricional] = (porEstado[d.estadoNutricional] || 0) + 1;
    });
    
    Object.entries(porEstado).forEach(([estado, count]) => {
        resumenData.push([estado + ':', count]);
    });
    
    resumenData.push(['']);
    
    const wb = XLSX.utils.book_new();
    
    // Hoja de resumen
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Hoja de datos
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Detallados');
    
    XLSX.writeFile(wb, `Analisis_Nutricional_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showToast(`Exportados ${exportData.length} registros nutricionales`, 'success');
}

// Funciones auxiliares mejoradas
function getColorPorEstado(estado) {
    if (!estado || estado === 'Sin datos') return '#95A5A6';
    if (estado.includes('Severa')) return '#C0392B';
    if (estado.includes('Moderada')) return '#E74C3C';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return '#F39C12';
    if (estado.includes('Normal')) return '#27AE60';
    if (estado.includes('Riesgo') && estado.includes('Sobrepeso')) return '#F1C40F';
    if (estado.includes('Sobrepeso')) return '#E67E22';
    if (estado.includes('Obesidad')) return '#8E44AD';
    return '#95A5A6';
}

function getColorPorCategoria(categoria) {
    const colores = {
        'severa': '#C0392B',
        'moderada': '#E74C3C',
        'riesgo-desnutricion': '#F39C12',
        'normal': '#27AE60',
        'riesgo-sobrepeso': '#F1C40F',
        'sobrepeso': '#E67E22',
        'obesidad': '#8E44AD',
        'sin-datos': '#95A5A6'
    };
    return colores[categoria] || '#95A5A6';
}

function getNombreEstado(categoria) {
    const nombres = {
        'severa': 'Desnutrición Severa',
        'moderada': 'Desnutrición Moderada',
        'riesgo-desnutricion': 'Riesgo de Desnutrición',
        'normal': 'Peso Normal',
        'riesgo-sobrepeso': 'Riesgo de Sobrepeso',
        'sobrepeso': 'Sobrepeso',
        'obesidad': 'Obesidad',
        'sin-datos': 'Sin Datos'
    };
    return nombres[categoria] || categoria;
}

function getIconoEstado(categoria) {
    const iconos = {
        'severa': '🔴',
        'moderada': '🟠',
        'riesgo-desnutricion': '🟡',
        'normal': '🟢',
        'riesgo-sobrepeso': '🔵',
        'sobrepeso': '🟣',
        'obesidad': '🟤',
        'sin-datos': '⚪'
    };
    return iconos[categoria] || '⚪';
}

function refreshNutricionalData() {
    showToast('🔄 Actualizando datos...', 'info');
    cargarDatosNutricionales();
}

// Inicializar cuando se carga la pestaña
document.addEventListener('DOMContentLoaded', () => {
    const tabBtn = document.getElementById('tab-nutricional');
    if (tabBtn) {
        tabBtn.addEventListener('click', () => {
            if (datosNutricionales.length === 0) {
                initNutricionalSection();
            }
        });
    }
    
    // Event listeners para filtros en tiempo real
    ['nutricionalFilterContract', 'nutricionalFilterEstado', 'nutricionalFilterTipo', 
     'nutricionalFilterCritico', 'nutricionalFilterMes'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterNutricionalData);
        }
    });
    
    const searchElement = document.getElementById('nutricionalSearch');
    if (searchElement) {
        searchElement.addEventListener('input', debounce(filterNutricionalData, 300));
    }
});

// Función debounce para búsqueda
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


		// ============================================
		// FUNCIÓN CORREGIDA PARA DIBUJAR GRÁFICA OMS INDIVIDUAL
		// ============================================

		// Función para obtener color según estado nutricional (CORREGIDA)
		function getColorPorEstadoNutricional(estadoNutricional) {
			if (!estadoNutricional || estadoNutricional === 'Sin datos') return '#95A5A6';
			
			// Normalizar el texto para comparación
			const estado = estadoNutricional.toLowerCase();
			
			// Desnutrición severa - Rojo oscuro
			if (estado.includes('severa')) return '#C0392B';
			
			// Desnutrición moderada - Rojo
			if (estado.includes('moderada')) return '#E74C3C';
			
			// Riesgo de desnutrición - Naranja
			if (estado.includes('riesgo') && estado.includes('desnutrición')) return '#F39C12';
			
			// Peso Normal - VERDE (este es el caso de la imagen)
			if (estado.includes('normal')) return '#27AE60';
			
			// Riesgo de sobrepeso - Amarillo
			if (estado.includes('riesgo') && estado.includes('sobrepeso')) return '#F1C40F';
			
			// Sobrepeso - Naranja oscuro
			if (estado.includes('sobrepeso')) return '#E67E22';
			
			// Obesidad - Púrpura
			if (estado.includes('obesidad')) return '#8E44AD';
			
			// Por defecto, gris
			return '#95A5A6';
		}
		
		// Función para obtener color de la curva DE según índice
		function getColorCurvaDE(index) {
			// index 0 = -3DE, 1 = -2DE, 2 = -1DE, 3 = Mediana, 4 = +1DE, 5 = +2DE, 6 = +3DE
			const colores = ['#C0392B', '#E74C3C', '#F39C12', '#27AE60', '#F1C40F', '#E67E22', '#8E44AD'];
			return colores[index] || '#95A5A6';
		}




        function eliminarTodosArchivados() {
            const count = archivedNovelties.length;
            if (count === 0) {
                showToast('No hay archivados para eliminar', 'warning');
                return;
            }
            
            const confirmacion = prompt(`⚠️ ¡ATENCIÓN! ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\n` +
                `Está a punto de eliminar PERMANENTEMENTE ${count} novedades archivadas.\n\n` +
                `Para confirmar, escriba ELIMINAR en mayúsculas:`);
            
            if (confirmacion !== 'ELIMINAR') {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            const segundaConfirmacion = confirm(`Última confirmación:\n\n` +
                `¿Está 100% seguro de eliminar ${count} registros archivados permanentemente?`);
            
            if (!segundaConfirmacion) {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            showToast('⏳ Eliminando todos los archivados...', 'info');
            
            const archivedRef = database.ref(AsociacionesModule.getRef('archived'));
            archivedRef.remove()
                .then(() => {
                    showToast(`🗑️ ${count} archivados eliminados permanentemente`, 'success');
                    archivedNovelties = [];
                    filterArchivedNovelties();
                    loadResumenStats();
                })
                .catch((error) => showToast('Error al eliminar: ' + error.message, 'error'));
        }

        function renderArchivedPagination(totalItems) {
            const container = document.getElementById('paginationArchivados');
            if (!container) return;
            
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            container.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-sm ${i === currentArchivedPage ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
                btn.textContent = i;
                btn.onclick = () => { currentArchivedPage = i; filterArchivedNovelties(); };
                container.appendChild(btn);
            }
        }

        function exportArchivedToExcel() {
            if (archivedNovelties.length === 0) {
                showToast("No hay archivados para exportar", "warning");
                return;
            }

            const exportData = archivedNovelties.map(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                let fechaNacimientoNiño = '';
                let fechaNacimientoAcudiente = '';
                let docRetiro = '', docIngreso = '';
                let nombreRetiro = '', nombreIngreso = '';
                let fechaRetiro = '', fechaIngreso = '';
                let comuna = '', barrio = '', perimetroBraquial = '';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    if (n.retiro) {
                        docRetiro = n.retiro.document || '';
                        nombreRetiro = n.retiro.name || '';
                        fechaRetiro = n.retiro.retiroDate || '';
                    }
                    if (n.ingreso) {
                        docIngreso = n.ingreso.document || '';
                        nombreIngreso = n.ingreso.name || '';
                        fechaIngreso = n.ingreso.ingresoDate || '';
                        fechaNacimientoNiño = n.ingreso.dob || '';
                        fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                        comuna = n.ingreso.comuna || '';
                        barrio = n.ingreso.barrio || '';
                    }
                } else if (n.type === 'retiro') {
                    const retiroData = n.retiro || n;
                    docRetiro = retiroData.document || '';
                    nombreRetiro = retiroData.name || '';
                    fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                } else if (n.type === 'ingreso') {
                    const ingresoData = n.ingreso || n;
                    docIngreso = ingresoData.document || '';
                    nombreIngreso = ingresoData.name || '';
                    fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                    fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                    fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                    comuna = ingresoData.comuna || n.comuna || '';
                    barrio = ingresoData.barrio || n.barrio || '';
                }

                // Datos nutricionales incluyendo perímetro braquial
                let nutricionFecha = '', nutricionPeso = '', nutricionTalla = '', nutricionPerimetroBraquial = '';
                let nutricionRegimen = '', nutricionEPS = '', nutricionEstado = '';
                
                if (n.nutricion) {
                    nutricionFecha = n.nutricion.fecha || '';
                    nutricionPeso = n.nutricion.peso || '';
                    nutricionTalla = n.nutricion.talla || '';
                    nutricionPerimetroBraquial = n.nutricion.perimetroBraquial || '';
                    nutricionRegimen = n.nutricion.regimen || '';
                    nutricionEPS = n.nutricion.eps || '';
                    nutricionEstado = n.nutricion.estadoNutricional || '';
                }

                return {
                    'Fecha Archivo': new Date(n.archivedDate).toLocaleString('es-CO'),
                    'Fecha Registro Original': new Date(n.timestamp).toLocaleString('es-CO'),
                    'Fecha Movimiento': fechaMovimiento,
                    'Contrato': n.contract || '',
                    'UDS Nombre': n.udsName,
                    'Tipo Novedad': n.type ? n.type.toUpperCase() : '',
                    'Documento Retiro': docRetiro,
                    'Nombre Retiro': nombreRetiro,
                    'Fecha Retiro': fechaRetiro,
                    'Documento Ingreso': docIngreso,
                    'Nombre Ingreso': nombreIngreso,
                    'Fecha Ingreso': fechaIngreso,
                    'Fecha Nacimiento Niño': fechaNacimientoNiño,
                    'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                    'Comuna': comuna,
                    'Barrio': barrio,
                    'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                    'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                    'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                    'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                    'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                    'Fecha Valoración Nutricional': nutricionFecha,
                    'Peso (kg)': nutricionPeso,
                    'Talla (cm)': nutricionTalla,
                    'Perímetro Braquial (cm)': nutricionPerimetroBraquial,
                    'Régimen': nutricionRegimen,
                    'EPS': nutricionEPS,
                    'Estado Nutricional': nutricionEstado
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Archivados');
            XLSX.writeFile(wb, `Reporte_Archivados_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            showToast(`Exportados ${archivedNovelties.length} registros archivados`, "success");
        }

        

        

        function closeModal(event) {
            if (!event || event.target.id === 'viewModal' || event.target.tagName === 'BUTTON') {
                const viewModal = document.getElementById('viewModal');
                if (viewModal) viewModal.style.display = 'none';
            }
        }

        function deleteNovelty(id) {
            if (!confirm('¿Está seguro de que desea eliminar este registro permanentemente?\n\nEsta acción no se puede deshacer.')) return;

            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties') + '/' + id);
            noveltiesRef.remove()
                .then(() => {
                    showToast('Registro eliminado correctamente', 'success');
                    loadNoveltiesTable();
                    updatePendientesIndicator();
                })
                .catch((error) => showToast('Error al eliminar: ' + error.message, 'error'));
        }

        function renderPagination(totalItems) {
            const container = document.getElementById('pagination');
            if (!container) return;
            
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            container.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-sm ${i === currentPage ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
                btn.textContent = i;
                btn.onclick = () => { currentPage = i; filterNovelties(); };
                container.appendChild(btn);
            }
        }

        function exportToExcelCurrent() {
            if (currentNovelties.length === 0) {
                showToast("No hay datos para exportar", "warning");
                return;
            }

            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            const filterRegional = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';
            const regionalFilter = filterRegional ? filterRegional.value : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let filtered = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract = !contractFilter || n.contract === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && matchesRegional && matchesModalidad;
            });

            if (filtered.length === 0) {
                showToast("No hay datos en la vista actual para exportar", "warning");
                return;
            }

            const exportData = filtered.map(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                let fechaNacimientoNiño = '';
                let fechaNacimientoAcudiente = '';
                let tipoNovedad = n.type ? n.type.toUpperCase() : '';
                let docRetiro = '';
                let docIngreso = '';
                let nombreRetiro = '';
                let nombreIngreso = '';
                let generoRetiro = '';
                let generoIngreso = '';
                let fechaRetiro = '';
                let fechaIngreso = '';
                let comuna = '';
                let barrio = '';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoNovedad = 'AMBOS (RETIRO + INGRESO)';
                    
                    if (n.retiro) {
                        docRetiro = n.retiro.document || '';
                        nombreRetiro = n.retiro.name || '';
                        generoRetiro = n.retiro.gender || '';
                        fechaRetiro = n.retiro.retiroDate || '';
                    }
                    
                    if (n.ingreso) {
                        docIngreso = n.ingreso.document || '';
                        nombreIngreso = n.ingreso.name || '';
                        generoIngreso = n.ingreso.gender || '';
                        fechaIngreso = n.ingreso.ingresoDate || '';
                        fechaNacimientoNiño = n.ingreso.dob || '';
                        fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                        comuna = n.ingreso.comuna || '';
                        barrio = n.ingreso.barrio || '';
                    }
                } else if (n.type === 'retiro') {
                    const retiroData = n.retiro || n;
                    docRetiro = retiroData.document || '';
                    nombreRetiro = retiroData.name || '';
                    generoRetiro = retiroData.gender || '';
                    fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                } else if (n.type === 'ingreso') {
                    const ingresoData = n.ingreso || n;
                    docIngreso = ingresoData.document || '';
                    nombreIngreso = ingresoData.name || '';
                    generoIngreso = ingresoData.gender || '';
                    fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                    fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                    fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                    comuna = ingresoData.comuna || n.comuna || '';
                    barrio = ingresoData.barrio || n.barrio || '';
                }

                let nutricionData = {};
                if (n.nutricion) {
                    nutricionData = n.nutricion;
                } else if (n.ingreso && n.ingreso.nutricion) {
                    nutricionData = n.ingreso.nutricion;
                }

                return {
                    'Estado CUENTAME': n.cuentameStatus === 'cargado' ? 'CARGADO' : 'PENDIENTE',
                    'Fecha Cargado': n.cuentameDate ? new Date(n.cuentameDate).toLocaleString('es-CO') : '-',
                    'Fecha Registro': new Date(n.timestamp).toLocaleString('es-CO'),
                    'Fecha Movimiento': fechaMovimiento,
                    'Contrato': n.contract || '',
                    'UDS Nombre': n.udsName,
                    'Tipo Novedad': tipoNovedad,
                    'Doc Retiro': docRetiro,
                    'Nombre Retiro': nombreRetiro,
                    'Género Retiro': generoRetiro === 'M' ? 'Masculino' : generoRetiro === 'F' ? 'Femenino' : '',
                    'Fecha Retiro': fechaRetiro,
                    'Doc Ingreso': docIngreso,
                    'Nombre Ingreso': nombreIngreso,
                    'Género Ingreso': generoIngreso === 'M' ? 'Masculino' : generoIngreso === 'F' ? 'Femenino' : '',
                    'Fecha Nacimiento Niño': fechaNacimientoNiño,
                    'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                    'Fecha Ingreso': fechaIngreso,
                    'Comuna': comuna,
                    'Barrio': barrio,
                    'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                    'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                    'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                    'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                    'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                    'Fecha Valoración Nutricional': nutricionData.fecha || '',
                    'Peso (kg)': nutricionData.peso || '',
                    'Talla (cm)': nutricionData.talla || '',
                    'Perímetro Braquial (cm)': nutricionData.perimetroBraquial || '',
                    'Régimen': nutricionData.regimen || '',
                    'EPS': nutricionData.eps || '',
                    'Estado Nutricional': nutricionData.estadoNutricional || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vista Actual');
            XLSX.writeFile(wb, `Reporte_Filtrado_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            showToast(`Exportados ${filtered.length} registros de la vista actual`, "success");
        }

        function exportToExcelFull() {
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            noveltiesRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                const novelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                
                if (novelties.length === 0) {
                    showToast("No hay datos para exportar", "warning");
                    return;
                }

                const retiros = novelties.filter(n => n.type === 'retiro' && !n.hasIngreso);
                const ingresos = novelties.filter(n => n.type === 'ingreso' && !n.hasRetiro);
                const ambos = novelties.filter(n => n.type === 'ambos' || (n.hasRetiro && n.hasIngreso));
                
                const wb = XLSX.utils.book_new();

                const resumenData = [
                    ['REPORTE COMPLETO DE NOVEDADES - ASOCIACIÓN JER'],
                    ['Generado:', new Date().toLocaleString('es-CO')],
                    [''],
                    ['RESUMEN'],
                    ['Total Registros:', novelties.length],
                    ['Total Retiros:', retiros.length],
                    ['Total Ingresos:', ingresos.length],
                    ['Total Ambos (Retiro + Ingreso):', ambos.length],
                    ['Pendientes CUENTAME:', novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length],
                    ['Cargados CUENTAME:', novelties.filter(n => n.cuentameStatus === 'cargado').length],
                    ...Object.entries(window.UDS_DATA || {}).map(([c]) => {
                        const perfil = AsociacionesModule.getPerfilActivo();
                        const label = perfil?.contratos?.[c] || `Contrato ${c}`;
                        return [`Por ${label}:`, novelties.filter(n => n.contract === c).length];
                    }),
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

                const mapNoveltyData = (n, tipo) => {
                    const fechaMovimiento = getFechaMovimiento(n);
                    let fechaNacimientoNiño = '';
                    let fechaNacimientoAcudiente = '';
                    let docRetiro = '';
                    let docIngreso = '';
                    let nombreRetiro = '';
                    let nombreIngreso = '';
                    let fechaRetiro = '';
                    let fechaIngreso = '';
                    let comuna = '';
                    let barrio = '';
                    
                    if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                        if (n.retiro) {
                            docRetiro = n.retiro.document || '';
                            nombreRetiro = n.retiro.name || '';
                            fechaRetiro = n.retiro.retiroDate || '';
                        }
                        if (n.ingreso) {
                            docIngreso = n.ingreso.document || '';
                            nombreIngreso = n.ingreso.name || '';
                            fechaIngreso = n.ingreso.ingresoDate || '';
                            fechaNacimientoNiño = n.ingreso.dob || '';
                            fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                            comuna = n.ingreso.comuna || '';
                            barrio = n.ingreso.barrio || '';
                        }
                    } else if (n.type === 'retiro') {
                        const retiroData = n.retiro || n;
                        docRetiro = retiroData.document || '';
                        nombreRetiro = retiroData.name || '';
                        fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                    } else if (n.type === 'ingreso') {
                        const ingresoData = n.ingreso || n;
                        docIngreso = ingresoData.document || '';
                        nombreIngreso = ingresoData.name || '';
                        fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                        fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                        fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                        comuna = ingresoData.comuna || n.comuna || '';
                        barrio = ingresoData.barrio || n.barrio || '';
                    }

                    let nutricionData = {};
                    if (n.nutricion) {
                        nutricionData = n.nutricion;
                    } else if (n.ingreso && n.ingreso.nutricion) {
                        nutricionData = n.ingreso.nutricion;
                    }

                    return {
                        'Estado CUENTAME': n.cuentameStatus === 'cargado' ? 'CARGADO' : 'PENDIENTE',
                        'ID': n.id,
                        'Fecha Registro': new Date(n.timestamp).toLocaleString('es-CO'),
                        'Fecha Movimiento': fechaMovimiento,
                        'Contrato': n.contract || '',
                        'UDS Nombre': n.udsName,
                        'Tipo': tipo,
                        'Doc Retiro': docRetiro,
                        'Nombre Retiro': nombreRetiro,
                        'Fecha Retiro': fechaRetiro,
                        'Doc Ingreso': docIngreso,
                        'Nombre Ingreso': nombreIngreso,
                        'Fecha Ingreso': fechaIngreso,
                        'Fecha Nacimiento Niño': fechaNacimientoNiño,
                        'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                        'Comuna': comuna,
                        'Barrio': barrio,
                        'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                        'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                        'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                        'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                        'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                        'Fecha Valoración Nutricional': nutricionData.fecha || '',
                        'Peso (kg)': nutricionData.peso || '',
                        'Talla (cm)': nutricionData.talla || '',
                        'Perímetro Braquial (cm)': nutricionData.perimetroBraquial || '',
                        'Régimen': nutricionData.regimen || '',
                        'EPS': nutricionData.eps || '',
                        'Estado Nutricional': nutricionData.estadoNutricional || ''
                    };
                };

                if (retiros.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(retiros.map(n => mapNoveltyData(n, 'RETIRO'))), 'Retiros');
                }

                if (ingresos.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingresos.map(n => mapNoveltyData(n, 'INGRESO'))), 'Ingresos');
                }

                if (ambos.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ambos.map(n => mapNoveltyData(n, 'AMBOS'))), 'Ambos');
                }

                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(novelties.map(n => mapNoveltyData(n, n.type ? n.type.toUpperCase() : ''))), 'Todos los Registros');

                XLSX.writeFile(wb, `Reporte_Completo_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
                showToast(`Excel exportado: ${novelties.length} registros`, "success");
            });
        }

        function exportToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            noveltiesRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                const novelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                
                if (novelties.length === 0) {
                    showToast("No hay datos para exportar", "warning");
                    return;
                }

                doc.setFontSize(16);
                doc.text('Reporte Completo de Novedades - Asociación JER', 14, 15);
                
                doc.setFontSize(10);
                doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 22);
                doc.text(`Total de registros: ${novelties.length}`, 14, 27);

                let y = 35;
                doc.setFillColor(240, 240, 240);
                doc.rect(10, y, 277, 10, 'F');
                doc.setFontSize(9);
                
                const headers = ['Estado', 'Fecha Reg', 'Fecha Mov', 'Contrato', 'UDS', 'Tipo', 'Doc Ret', 'Nom Ret', 'Doc Ing', 'Nom Ing'];
                const colWidths = [25, 25, 35, 25, 35, 25, 30, 45, 30, 47];
                let x = 12;
                
                headers.forEach((header, i) => {
                    doc.text(header, x, y + 7);
                    x += colWidths[i];
                });

                y += 15;
                doc.setFontSize(7);
                let count = 0;
                
                novelties.forEach(n => {
                    if (y > 190) {
                        doc.addPage();
                        y = 15;
                        doc.setFillColor(240, 240, 240);
                        doc.rect(10, y - 5, 277, 10, 'F');
                        doc.setFontSize(9);
                        x = 12;
                        headers.forEach((header, i) => {
                            doc.text(header, x, y + 2);
                            x += colWidths[i];
                        });
                        y += 10;
                        doc.setFontSize(7);
                    }
                    
                    const fechaMovimiento = getFechaMovimiento(n);
                    const estadoText = n.cuentameStatus === 'cargado' ? '✓ CARGADO' : '⏳ PEND';
                    
                    let tipoDisplay = n.type ? n.type.toUpperCase() : '';
                    let docRet = '';
                    let nomRet = '';
                    let docIng = '';
                    let nomIng = '';
                    
                    if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                        tipoDisplay = 'AMBOS';
                        if (n.retiro) {
                            docRet = n.retiro.document || '-';
                            nomRet = n.retiro.name ? (n.retiro.name.length > 20 ? n.retiro.name.substring(0, 20) + '...' : n.retiro.name) : '-';
                        }
                        if (n.ingreso) {
                            docIng = n.ingreso.document || '-';
                            nomIng = n.ingreso.name ? (n.ingreso.name.length > 20 ? n.ingreso.name.substring(0, 20) + '...' : n.ingreso.name) : '-';
                        }
                    } else if (n.type === 'retiro') {
                        const retData = n.retiro || n;
                        docRet = retData.document || '-';
                        nomRet = retData.name ? (retData.name.length > 20 ? retData.name.substring(0, 20) + '...' : retData.name) : '-';
                    } else if (n.type === 'ingreso') {
                        const ingData = n.ingreso || n;
                        docIng = ingData.document || '-';
                        nomIng = ingData.name ? (ingData.name.length > 20 ? ingData.name.substring(0, 20) + '...' : ingData.name) : '-';
                    }
                    
                    x = 12;
                    const rowData = [
                        estadoText,
                        new Date(n.timestamp).toLocaleDateString('es-CO'),
                        fechaMovimiento.length > 18 ? fechaMovimiento.substring(0, 18) : fechaMovimiento,
                        n.contract || '-',
                        n.udsName ? (n.udsName.length > 18 ? n.udsName.substring(0, 18) + '...' : n.udsName) : '',
                        tipoDisplay,
                        docRet,
                        nomRet,
                        docIng,
                        nomIng
                    ];
                    
                    if (n.type === 'retiro') doc.setTextColor(220, 38, 38);
                    else if (n.type === 'ingreso') doc.setTextColor(16, 185, 129);
                    else if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) doc.setTextColor(147, 51, 234);
                    else doc.setTextColor(0, 0, 0);
                    
                    rowData.forEach((cell, i) => {
                        doc.text(String(cell), x, y);
                        x += colWidths[i];
                    });
                    
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                    count++;
                });

                doc.setFontSize(8);
                doc.text(`Mostrando ${count} registros`, 14, 200);
                
                doc.save(`Reporte_Completo_JER_${new Date().toISOString().split('T')[0]}.pdf`);
                showToast(`PDF exportado: ${count} registros`, "success");
            });
        }

        function checkExistingBeneficiary(document, type) {
            if (document.length < 5) return;
            
            const duplicateActive = currentNovelties.find(n => 
                (n.document === document) || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            const duplicateArchived = archivedNovelties.find(n => 
                n.document === document || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            const existing = duplicateActive || duplicateArchived;
            
            if (existing) {
                const ubicacion = duplicateActive ? 'activas' : 'archivadas';
                if (type === 'ingreso') {
                    showToast(`⚠️ Beneficiario ya existe en ${existing.udsName} (${ubicacion})`, "warning");
                } else if (type === 'retiro') {
                    showToast(`ℹ️ Beneficiario encontrado en base de datos (${ubicacion})`, "info");
                }
            }
        }

        function validateAgeRange() {
            const dob = document.getElementById('ingresoDOB');
            if (!dob || !dob.value) return;
            
            const birthDate = new Date(dob.value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age > 5) {
                showToast("Alerta: La edad supera los 5 años (Primera Infancia)", "warning");
            } else if (age < 0) {
                showToast("Error: Fecha de nacimiento inválida", "error");
            }
        }

        function validateDatesRealTime() {
            const checkRetiro = document.getElementById('checkRetiro');
            const checkIngreso = document.getElementById('checkIngreso');
            const fechaRetiroInput = document.getElementById('retiroDate');
            const fechaIngresoInput = document.getElementById('ingresoDate');
            const feedback = document.getElementById('feedbackContainer');

            if (!checkRetiro || !checkIngreso || !fechaRetiroInput || !fechaIngresoInput) return true;

            if (checkRetiro.checked && checkIngreso.checked && fechaRetiroInput.value && fechaIngresoInput.value) {
                const dRetiro = new Date(fechaRetiroInput.value);
                const dIngreso = new Date(fechaIngresoInput.value);
                dRetiro.setMinutes(dRetiro.getMinutes() + dRetiro.getTimezoneOffset());
                dIngreso.setMinutes(dIngreso.getMinutes() + dIngreso.getTimezoneOffset());

                if (dRetiro >= dIngreso) {
                    showFeedback("Atención: La fecha de retiro no puede ser igual o posterior a la de ingreso.", "error");
                    fechaRetiroInput.classList.add('border-red-500', 'bg-red-50');
                    fechaIngresoInput.classList.add('border-red-500', 'bg-red-50');
                    return false;
                } else {
                    if (feedback) feedback.classList.add('hidden');
                    fechaRetiroInput.classList.remove('border-red-500', 'bg-red-50');
                    fechaIngresoInput.classList.remove('border-red-500', 'bg-red-50');
                    return true;
                }
            }
            return true;
        }

        // ── Cambio de Regional: filtrar modalidades disponibles ──
        function onRegionalChange() {
            const regional = document.getElementById('regionalSelect')?.value || '';
            const selMod   = document.getElementById('modalidadSelect');
            const secMod   = document.getElementById('sectionModalidad');
            const secCtr   = document.getElementById('sectionContrato');
            const selCtr   = document.getElementById('contractNumber');
            const selUDS   = document.getElementById('mainUdsDropdown');
            const secUDS   = document.getElementById('sectionUDS');

            // Resetear aguas abajo
            if (selCtr) { selCtr.value = ''; selCtr.disabled = true; }
            if (selUDS) { selUDS.innerHTML = '<option value="">-- Primero Contrato --</option>'; selUDS.disabled = true; }
            if (secCtr) secCtr.classList.add('opacity-50');
            if (secUDS) secUDS.style.opacity = '0.5';

            if (!regional) {
                if (selMod) { selMod.innerHTML = '<option value="">-- Primero Regional --</option>'; selMod.disabled = true; }
                if (secMod) secMod.classList.add('opacity-50');
                return;
            }

            // Obtener modalidades únicas para esta regional
            const regCtrs = window.REGIONALES_CONTRATOS || {};
            const modCtrs = window.MODALIDADES_CONTRATOS || {};
            const modalesDisponibles = [...new Set(
                Object.entries(regCtrs)
                    .filter(([cod, reg]) => reg === regional)
                    .map(([cod]) => modCtrs[cod])
                    .filter(Boolean)
            )];

            if (selMod) {
                selMod.innerHTML = '<option value="">Seleccione...</option>' +
                    modalesDisponibles.map(m => `<option value="${m}">${m}</option>`).join('');
                selMod.disabled = false;
            }
            if (secMod) secMod.classList.remove('opacity-50');
            updateStyles();
        }

        // ── Cambio de Modalidad: filtrar contratos disponibles ──
        function onModalidadChange() {
            const regional  = document.getElementById('regionalSelect')?.value  || '';
            const modalidad = document.getElementById('modalidadSelect')?.value || '';
            const selCtr    = document.getElementById('contractNumber');
            const secCtr    = document.getElementById('sectionContrato');
            const selUDS    = document.getElementById('mainUdsDropdown');
            const secUDS    = document.getElementById('sectionUDS');
            const perfil    = AsociacionesModule.getPerfilActivo();

            if (selUDS) { selUDS.innerHTML = '<option value="">-- Primero Contrato --</option>'; selUDS.disabled = true; }
            if (secUDS) secUDS.style.opacity = '0.5';

            if (!modalidad || !selCtr) {
                if (selCtr) { selCtr.innerHTML = '<option value="">-- Primero Modalidad --</option>'; selCtr.disabled = true; }
                if (secCtr) secCtr.classList.add('opacity-50');
                return;
            }

            const regCtrs = window.REGIONALES_CONTRATOS  || {};
            const modCtrs = window.MODALIDADES_CONTRATOS || {};
            const contratos = perfil?.contratos || {};

            const filtrados = Object.entries(contratos).filter(([cod]) =>
                regCtrs[cod] === regional && modCtrs[cod] === modalidad
            );

            selCtr.innerHTML = '<option value="">Seleccione...</option>' +
                filtrados.map(([cod, lbl]) => `<option value="${cod}">${lbl || 'Contrato ' + cod}</option>`).join('');
            selCtr.disabled = filtrados.length === 0;
            if (secCtr) secCtr.classList.remove('opacity-50');
            if (filtrados.length === 1) {
                selCtr.value = filtrados[0][0];
                updateStyles();
            }
        }

        function updateStyles() {
            const contract = document.getElementById('contractNumber');
            const mainCard = document.getElementById('mainCard');
            const indicator = document.getElementById('contractIndicator');
            const udsSelect = document.getElementById('mainUdsDropdown');
            const sectionUDS = document.getElementById('sectionUDS');
            
            if (!contract) return;
            
            const contractValue = contract.value;
            
            if (mainCard) {
                mainCard.className = "glass-container w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-t-[14px] dynamic-border animate__animated animate__fadeIn";
                if (contractValue) mainCard.classList.add(`contract-${contractValue}`);
            }
            
            document.body.style.background = BACKGROUNDS[contractValue] || BACKGROUNDS['default'];
            
            if (contractValue) {
                if (indicator) {
                    indicator.className = `px-4 py-1.5 rounded-full text-xs font-black text-white dynamic-bg uppercase`;
                    indicator.textContent = `Contrato ${contractValue}`;
                }
                if (udsSelect) udsSelect.disabled = false;
                if (sectionUDS) sectionUDS.style.opacity = "1";
                populateUDS(contractValue);
            } else {
                if (indicator) {
                    indicator.className = "px-4 py-1.5 rounded-full text-xs font-black text-white bg-slate-400 uppercase";
                    indicator.textContent = "Sin Contrato";
                }
                if (udsSelect) {
                    udsSelect.disabled = true;
                    udsSelect.innerHTML = '<option value="">-- Primero Contrato --</option>';
                }
                if (sectionUDS) sectionUDS.style.opacity = "0.5";
            }
        }

        function populateUDS(contract) {
            const udsSelect = document.getElementById('mainUdsDropdown');
            if (!udsSelect) return;
            
            udsSelect.innerHTML = '<option value="">-- Seleccione UDS --</option>';
            window.UDS_DATA[contract]?.forEach(([name, code]) => {
                const opt = document.createElement('option');
                opt.value = `${name} - ${code}`;
                opt.textContent = `${name} - ${code}`;
                udsSelect.appendChild(opt);
            });
        }

        function toggleSection(type) {
            const section = document.getElementById(type === 'retiro' ? 'sectionRetiro' : 'sectionIngreso');
            const check = document.getElementById(type === 'retiro' ? 'checkRetiro' : 'checkIngreso');
            if (section && check) section.classList.toggle('hidden', !check.checked);
        }

        function updateAgeDisplay() {
            const dobValue = document.getElementById('ingresoDOB');
            const entryValue = document.getElementById('ingresoDate');
            const displayField = document.getElementById('displayAge');

            if (dobValue && entryValue && displayField && dobValue.value && entryValue.value) {
                const ageResult = calculateAge(dobValue.value, entryValue.value);
                displayField.value = ageResult;
            } else if (displayField) {
                displayField.value = "Esperando fechas...";
            }
        }

        function calculateAge(dob, entry) {
            const d1 = new Date(dob);
            const d2 = new Date(entry);
            d1.setMinutes(d1.getMinutes() + d1.getTimezoneOffset());
            d2.setMinutes(d2.getMinutes() + d2.getTimezoneOffset());

            let years = d2.getFullYear() - d1.getFullYear();
            let months = d2.getMonth() - d1.getMonth();
            let days = d2.getDate() - d1.getDate();

            if (days < 0) months--;
            if (months < 0) { years--; months += 12; }
            return `${years} años y ${months} meses`;
        }

        function showFeedback(message, type) {
            const container = document.getElementById('feedbackContainer');
            if (!container) return;
            
            container.textContent = message;
            container.className = `p-5 rounded-2xl text-center text-sm font-bold animate__animated animate__fadeInUp mt-4 `;
            if (type === 'success') container.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
            else container.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-200', 'animate__shakeX');
            container.classList.remove('hidden');
        }

        function formatData() {
            const contractNumber = document.getElementById('contractNumber');
            const udsSelection = document.getElementById('mainUdsDropdown');
            
            if (!contractNumber || !udsSelection) return '';
            
            const utsName = udsSelection.value ? udsSelection.value.split(' - ')[0] : 'No Seleccionado';
            const utsCode = udsSelection.value ? udsSelection.value.split(' - ')[1] : 'No Seleccionado';
            
            let formData = `=================================\n`;
            formData +=    ` REPORTE DE NOVEDADES - ASOCIACIÓN JER\n`;
            formData +=    `=================================\n\n`;
            
            formData += `[ INFORMACIÓN GENERAL ]\n`;
            formData += `> CONTRATO:      ${contractNumber.value}\n`;
            formData += `> UDS NOMBRE:    ${utsName}\n`;
            formData += `> UDS CÓDIGO:    ${utsCode}\n`;
            formData += `------------------------------------------\n\n`;

            const checkRetiro = document.getElementById('checkRetiro');
            const checkIngreso = document.getElementById('checkIngreso');
            
            const tieneRetiro = checkRetiro && checkRetiro.checked;
            const tieneIngreso = checkIngreso && checkIngreso.checked;
            
            if (tieneRetiro) {
                const retiroDocType = document.getElementById('retiroDocType');
                const retiroDocNumber = document.getElementById('retiroDocNumber');
                const retiroFullName = document.getElementById('retiroFullName');
                const retiroDate = document.getElementById('retiroDate');
                const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');
                
                formData += `[ DATOS DE RETIRO ]\n`;
                formData += `  - Documento:  ${retiroDocType ? retiroDocType.value : ''} ${retiroDocNumber ? retiroDocNumber.value : ''}\n`;
                formData += `  - Nombre:     ${retiroFullName ? retiroFullName.value.toUpperCase() : ''}\n`;
                formData += `  - Fecha:      ${retiroDate ? formatDateDMY(retiroDate.value) : ''}\n`;
                formData += `  - Género:     ${retiroGender ? retiroGender.value : 'N/A'}\n\n`;
            }

            if (tieneIngreso) {
                const ingresoDocType = document.getElementById('ingresoDocType');
                const ingresoDocNumber = document.getElementById('ingresoDocNumber');
                const ingresoFullName = document.getElementById('ingresoFullName');
                const displayAge = document.getElementById('displayAge');
                const ingresoDOB = document.getElementById('ingresoDOB');
                const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
                const ingresoAddress = document.getElementById('ingresoAddress');
                const ingresoPhone = document.getElementById('ingresoPhone');
                const acudienteName = document.getElementById('acudienteName');
                const acudienteDoc = document.getElementById('acudienteDoc');
                const acudienteDOB = document.getElementById('acudienteDOB');
                const ingresoDate = document.getElementById('ingresoDate');
                const ingresoComuna = document.getElementById('ingresoComuna');
                const ingresoBarrio = document.getElementById('ingresoBarrio');
                
                formData += `[ DATOS DE INGRESO ]\n`;
                formData += `  - Niño:       ${ingresoFullName ? ingresoFullName.value.toUpperCase() : ''}\n`;
                formData += `  - Documento:  ${ingresoDocType ? ingresoDocType.value : ''} ${ingresoDocNumber ? ingresoDocNumber.value : ''}\n`;
                formData += `  - Edad:       ${displayAge ? displayAge.value : ''}\n`;
                formData += `  - F. Nacim:   ${ingresoDOB ? formatDateDMY(ingresoDOB.value) : ''}\n`;
                formData += `  - F. Ingreso: ${ingresoDate ? formatDateDMY(ingresoDate.value) : ''}\n`;
                formData += `  - Género:     ${ingresoGender ? ingresoGender.value : 'N/A'}\n`;
                formData += `  - Comuna:     ${ingresoComuna ? ingresoComuna.value : ''}\n`;
                formData += `  - Barrio:     ${ingresoBarrio ? ingresoBarrio.value : ''}\n`;
                formData += `  - Direccion:  ${ingresoAddress ? ingresoAddress.value : ''}\n`;
                formData += `  - Teléfono:   ${ingresoPhone ? ingresoPhone.value : ''}\n\n`;
                
                formData += `[ DATOS DEL ACUDIENTE ]\n`;
                formData += `  - Nombre:     ${acudienteName ? acudienteName.value : ''}\n`;
                formData += `  - F. Nacim:   ${acudienteDOB ? formatDateDMY(acudienteDOB.value) : ''}\n`;
                formData += `  - Documento:  ${acudienteDoc ? acudienteDoc.value : ''}\n`;

                const nutricionFecha = document.getElementById('nutricionFecha');
                const nutricionPeso = document.getElementById('nutricionPeso');
                const nutricionTalla = document.getElementById('nutricionTalla');
                const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');
                const nutricionRegimen = document.getElementById('nutricionRegimen');
                const nutricionEPS = document.getElementById('nutricionEPS');
                const nutricionStatus = document.getElementById('nutricionStatus');

                const nutricionPendienteEl = document.getElementById('nutricionPendiente');
                const isNutrPend = nutricionPendienteEl && nutricionPendienteEl.checked;
                if (isNutrPend) {
                    formData += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
                    formData += `  ⏳ DATO PENDIENTE - Se completará desde el panel de administración\n`;
                } else if (nutricionFecha && nutricionFecha.value) {
                    formData += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
                    formData += `  - F. Valoración:      ${formatDateDMY(nutricionFecha.value)}\n`;
                    formData += `  - Peso:               ${nutricionPeso ? nutricionPeso.value + ' kg' : ''}\n`;
                    formData += `  - Talla:              ${nutricionTalla ? nutricionTalla.value + ' cm' : ''}\n`;
                    formData += `  - Perímetro Braquial: ${nutricionPerimetroBraquial ? nutricionPerimetroBraquial.value + ' cm' : ''}\n`;
                    formData += `  - Régimen:            ${nutricionRegimen ? nutricionRegimen.value : ''}\n`;
                    formData += `  - EPS:                ${nutricionEPS ? nutricionEPS.value : ''}\n`;
                    formData += `  - Estado Nutric.:     ${nutricionStatus ? nutricionStatus.textContent : 'No calculado'}\n`;
                }
            }
            
            if (!tieneRetiro && !tieneIngreso) {
                formData += `[ ⚠️ NO SE SELECCIONÓ RETIRO NI INGRESO ]\n`;
            }
            
            formData += `\n------------------------------------------\n`;
            formData += `Generado el: ${new Date().toLocaleString()}\n`;
            
            return formData;
        }

        // ============================================================
        // CÓDIGO CORREGIDO PARA ENVÍO DE FORMULARIO CON VALIDACIONES SEPARADAS
        // ============================================================
        
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('noveltyForm');
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const btn = document.getElementById('submitButton');

                    // Verificar que hay perfil activo
                    if (!AsociacionesModule.getPerfilActivo()) {
                        showToast('⚠️ Selecciona una asociación antes de reportar', 'warning');
                        AsociacionesModule.mostrarSelectorAsociaciones();
                        return;
                    }
                    
                    const contract = document.getElementById('contractNumber');
                    const uds = document.getElementById('mainUdsDropdown');
                    const checkRetiro = document.getElementById('checkRetiro');
                    const checkIngreso = document.getElementById('checkIngreso');
                    const fileInput = document.querySelector('input[name="soporte_documento"]');
                    
                    if (!contract || !uds || !checkRetiro || !checkIngreso) {
                        showToast("Error: Elementos del formulario no encontrados", "error");
                        return;
                    }

                    const isRetiro = checkRetiro.checked;
                    const isIngreso = checkIngreso.checked;

                    // ============================================
                    // VALIDACIONES GENERALES (siempre aplican)
                    // ============================================
                    if (!contract.value) {
                        showToast("❌ Seleccione el CONTRATO", "error");
                        contract?.classList.add('input-error');
                        contract?.focus();
                        return;
                    }
                    contract?.classList.remove('input-error');

                    if (!uds.value) {
                        showToast("❌ Seleccione la UDS", "error");
                        uds?.classList.add('input-error');
                        uds?.focus();
                        return;
                    }
                    uds?.classList.remove('input-error');

                    if (!isRetiro && !isIngreso) {
                        showToast("❌ Seleccione al menos una acción: RETIRO o INGRESO", "error");
                        return;
                    }

                    // ============================================
                    // VALIDACIONES SOLO PARA RETIRO
                    // ============================================
                    if (isRetiro) {
                        const retiroDocNumber = document.getElementById('retiroDocNumber');
                        const retiroFullName = document.getElementById('retiroFullName');
                        const retiroDate = document.getElementById('retiroDate');
                        const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');

                        // Documento obligatorio
                        if (!retiroDocNumber || !retiroDocNumber.value.trim()) {
                            showToast("❌ El DOCUMENTO del beneficiario a retirar es OBLIGATORIO", "error");
                            retiroDocNumber?.classList.add('input-error');
                            retiroDocNumber?.focus();
                            return;
                        }
                        
                        if (retiroDocNumber.value.length < 7 || retiroDocNumber.value.length > 10) {
                            showToast("El documento de retiro debe tener entre 7 y 10 dígitos", "error");
                            retiroDocNumber.classList.add('input-error');
                            retiroDocNumber.focus();
                            return;
                        }
                        retiroDocNumber.classList.remove('input-error');

                        // Nombre obligatorio
                        if (!retiroFullName || !retiroFullName.value.trim()) {
                            showToast("❌ El NOMBRE del beneficiario a retirar es OBLIGATORIO", "error");
                            retiroFullName?.classList.add('input-error');
                            retiroFullName?.focus();
                            return;
                        }
                        
                        const nombreParts = retiroFullName.value.trim().split(/\s+/);
                        if (nombreParts.length < 2) {
                            showToast("Ingrese nombre y apellidos completos del retiro", "error");
                            retiroFullName.classList.add('input-error');
                            retiroFullName.focus();
                            return;
                        }
                        retiroFullName.classList.remove('input-error');

                        // Fecha de retiro obligatoria
                        if (!retiroDate || !retiroDate.value) {
                            showToast("❌ La FECHA DE RETIRO es OBLIGATORIA", "error");
                            retiroDate?.classList.add('input-error');
                            retiroDate?.focus();
                            return;
                        }
                        retiroDate.classList.remove('input-error');

                        // Género obligatorio
                        if (!retiroGender) {
                            showToast("❌ Seleccione el GÉNERO del beneficiario a retirar", "error");
                            // Scroll al campo
                            document.getElementById('sectionRetiro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                    }

                    // ============================================
                    // VALIDACIONES SOLO PARA INGRESO
                    // ============================================
                    if (isIngreso) {
                        const ingresoDocNumber = document.getElementById('ingresoDocNumber');
                        const ingresoFullName = document.getElementById('ingresoFullName');
                        const ingresoDOB = document.getElementById('ingresoDOB');
                        const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
                        const ingresoDate = document.getElementById('ingresoDate');
                        const ingresoAddress = document.getElementById('ingresoAddress');
                        const ingresoPhone = document.getElementById('ingresoPhone');
                        const acudienteName = document.getElementById('acudienteName');
                        const ingresoComuna = document.getElementById('ingresoComuna');
                        const ingresoBarrio = document.getElementById('ingresoBarrio');

                        // Documento obligatorio
                        if (!ingresoDocNumber || !ingresoDocNumber.value.trim()) {
                            showToast("❌ El DOCUMENTO del beneficiario es OBLIGATORIO", "error");
                            ingresoDocNumber?.classList.add('input-error');
                            ingresoDocNumber?.focus();
                            return;
                        }
                        
                        if (ingresoDocNumber.value.length < 7 || ingresoDocNumber.value.length > 10) {
                            showToast("El documento debe tener entre 7 y 10 dígitos", "error");
                            ingresoDocNumber.classList.add('input-error');
                            ingresoDocNumber.focus();
                            return;
                        }
                        ingresoDocNumber.classList.remove('input-error');

                        // Nombre obligatorio
                        if (!ingresoFullName || !ingresoFullName.value.trim()) {
                            showToast("❌ El NOMBRE del beneficiario es OBLIGATORIO", "error");
                            ingresoFullName?.classList.add('input-error');
                            ingresoFullName?.focus();
                            return;
                        }
                        
                        const nombreParts = ingresoFullName.value.trim().split(/\s+/);
                        if (nombreParts.length < 2) {
                            showToast("Ingrese nombre y apellidos completos", "error");
                            ingresoFullName.classList.add('input-error');
                            ingresoFullName.focus();
                            return;
                        }
                        ingresoFullName.classList.remove('input-error');

                        // Fecha de nacimiento obligatoria
                        if (!ingresoDOB || !ingresoDOB.value) {
                            showToast("❌ La FECHA DE NACIMIENTO es OBLIGATORIA", "error");
                            ingresoDOB?.classList.add('input-error');
                            ingresoDOB?.focus();
                            return;
                        }
                        ingresoDOB.classList.remove('input-error');

                        // Género obligatorio
                        if (!ingresoGender) {
                            showToast("❌ Seleccione el GÉNERO del beneficiario", "error");
                            document.getElementById('sectionIngreso')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }

                        // Fecha de ingreso obligatoria
                        if (!ingresoDate || !ingresoDate.value) {
                            showToast("❌ La FECHA DE INGRESO es OBLIGATORIA", "error");
                            ingresoDate?.classList.add('input-error');
                            ingresoDate?.focus();
                            return;
                        }
                        ingresoDate.classList.remove('input-error');

                        // Comuna obligatoria
                        if (!ingresoComuna || !ingresoComuna.value) {
                            showToast("❌ La COMUNA es OBLIGATORIA", "error");
                            ingresoComuna?.classList.add('input-error');
                            ingresoComuna?.focus();
                            return;
                        }
                        ingresoComuna.classList.remove('input-error');

                        // Barrio obligatorio
                        if (!ingresoBarrio || !ingresoBarrio.value.trim()) {
                            showToast("❌ El BARRIO es OBLIGATORIO", "error");
                            ingresoBarrio?.classList.add('input-error');
                            ingresoBarrio?.focus();
                            return;
                        }
                        ingresoBarrio.classList.remove('input-error');

                        // Dirección obligatoria
                        if (!ingresoAddress || !ingresoAddress.value.trim()) {
                            showToast("❌ La DIRECCIÓN es OBLIGATORIA", "error");
                            ingresoAddress?.classList.add('input-error');
                            ingresoAddress?.focus();
                            return;
                        }
                        ingresoAddress.classList.remove('input-error');

                        // Teléfono obligatorio
                        if (!ingresoPhone || !ingresoPhone.value.trim()) {
                            showToast("❌ El TELÉFONO de contacto es OBLIGATORIO", "error");
                            ingresoPhone?.classList.add('input-error');
                            ingresoPhone?.focus();
                            return;
                        }
                        ingresoPhone.classList.remove('input-error');

                        // Acudiente obligatorio
                        if (!acudienteName || !acudienteName.value.trim()) {
                            showToast("❌ El NOMBRE del acudiente es OBLIGATORIO", "error");
                            acudienteName?.classList.add('input-error');
                            acudienteName?.focus();
                            return;
                        }
                        acudienteName.classList.remove('input-error');

                        // Documento del acudiente obligatorio
                        const acudienteDoc = document.getElementById('acudienteDoc');
                        if (!acudienteDoc || !acudienteDoc.value.trim()) {
                            showToast("❌ El DOCUMENTO del acudiente es OBLIGATORIO", "error");
                            acudienteDoc?.classList.add('input-error');
                            acudienteDoc?.focus();
                            return;
                        }
                        acudienteDoc.classList.remove('input-error');

                        // Fecha de nacimiento del acudiente obligatoria
                        const acudienteDOBCheck = document.getElementById('acudienteDOB');
                        if (!acudienteDOBCheck || !acudienteDOBCheck.value) {
                            showToast("❌ La FECHA DE NACIMIENTO del acudiente es OBLIGATORIA", "error");
                            acudienteDOBCheck?.classList.add('input-error');
                            acudienteDOBCheck?.focus();
                            return;
                        }
                        acudienteDOBCheck.classList.remove('input-error');

                        // Validaciones de nutrición (solo si NO es dato pendiente)
                        const nutricionPendienteCheck = document.getElementById('nutricionPendiente');
                        const isNutricionPendiente = nutricionPendienteCheck && nutricionPendienteCheck.checked;

                        const nutricionPeso = document.getElementById('nutricionPeso');
                        const nutricionTalla = document.getElementById('nutricionTalla');
                        const nutricionFecha = document.getElementById('nutricionFecha');
                        const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');

                        if (!isNutricionPendiente) {
                            if (!nutricionPeso || !nutricionPeso.value) {
                                showToast("❌ El PESO es obligatorio para el seguimiento nutricional", "error");
                                nutricionPeso?.classList.add('input-error');
                                nutricionPeso?.focus();
                                return;
                            }
                            
                            if (!nutricionTalla || !nutricionTalla.value) {
                                showToast("❌ La TALLA es obligatoria para el seguimiento nutricional", "error");
                                nutricionTalla?.classList.add('input-error');
                                nutricionTalla?.focus();
                                return;
                            }
                            
                            if (!nutricionFecha || !nutricionFecha.value) {
                                showToast("❌ La FECHA DE VALORACIÓN es obligatoria", "error");
                                nutricionFecha?.classList.add('input-error');
                                nutricionFecha?.focus();
                                return;
                            }

                            if (!nutricionPerimetroBraquial || !nutricionPerimetroBraquial.value) {
                                showToast("❌ El PERÍMETRO BRAQUIAL es obligatorio", "error");
                                nutricionPerimetroBraquial?.classList.add('input-error');
                                nutricionPerimetroBraquial?.focus();
                                return;
                            }
                        }

                        const peso = parseFloat(nutricionPeso.value);
                        const talla = parseFloat(nutricionTalla.value);
                        const perimetroBraquial = parseFloat(nutricionPerimetroBraquial.value);

                        if (peso < 5 || peso > 30.5) {
                            showToast("❌ El peso debe estar entre 5 y 30.5 kg", "error");
                            nutricionPeso.classList.add('input-error');
                            return;
                        }
                        nutricionPeso.classList.remove('input-error');

                        if (talla < 50 || talla > 130.5) {
                            showToast("❌ La talla debe estar entre 50 y 130.5 cm", "error");
                            nutricionTalla.classList.add('input-error');
                            return;
                        }
                        nutricionTalla.classList.remove('input-error');

                        if (perimetroBraquial < 6 || perimetroBraquial > 30) {
                            showToast("❌ El perímetro braquial debe estar entre 6 y 30 cm", "error");
                            nutricionPerimetroBraquial.classList.add('input-error');
                            return;
                        }
                        nutricionPerimetroBraquial.classList.remove('input-error');
                    }

                    // ============================================
                    // VALIDACIÓN DE FECHAS CRUZADAS (solo si hay ambos)
                    // ============================================
                    if (isRetiro && isIngreso) {
                        const retiroDate = document.getElementById('retiroDate');
                        const ingresoDate = document.getElementById('ingresoDate');
                        
                        if (retiroDate?.value && ingresoDate?.value) {
                            const dRetiro = new Date(retiroDate.value);
                            const dIngreso = new Date(ingresoDate.value);
                            dRetiro.setMinutes(dRetiro.getMinutes() + dRetiro.getTimezoneOffset());
                            dIngreso.setMinutes(dIngreso.getMinutes() + dIngreso.getTimezoneOffset());

                            if (dRetiro >= dIngreso) {
                                showToast("❌ La fecha de retiro debe ser anterior a la fecha de ingreso", "error");
                                retiroDate.classList.add('input-error');
                                ingresoDate.classList.add('input-error');
                                return;
                            }
                            retiroDate.classList.remove('input-error');
                            ingresoDate.classList.remove('input-error');
                        }
                    }

                    // ============================================
					// CONSTRUIR DATOS PARA ENVÍO
					// ============================================
					const udsName = uds.value.split(' - ')[0];
					const noveltyData = {
						contract:         contract.value,
						udsName:          udsName,
						udsFull:          uds.value,
						regional:         document.getElementById('regionalSelect')?.value  || '',
						modalidad:        document.getElementById('modalidadSelect')?.value || '',
						timestamp:        new Date().toISOString(),
						date:             new Date().toISOString().split('T')[0],
						cuentameStatus:   'pendiente',
						asociacionId:     AsociacionesModule.getPerfilActivo()?.id     || '',
						asociacionNombre: AsociacionesModule.getPerfilActivo()?.nombre || ''
					};

					// Determinar tipo
					if (isRetiro && isIngreso) {
						noveltyData.type = 'ambos';
						noveltyData.hasRetiro = true;
						noveltyData.hasIngreso = true;
					} else if (isRetiro) {
						noveltyData.type = 'retiro';
						noveltyData.hasRetiro = true;
						noveltyData.hasIngreso = false;
					} else if (isIngreso) {
						noveltyData.type = 'ingreso';
						noveltyData.hasRetiro = false;
						noveltyData.hasIngreso = true;
					}

					// Datos de retiro (solo si aplica)
					if (isRetiro) {
						const retiroDocType = document.getElementById('retiroDocType');
						const retiroDocNumber = document.getElementById('retiroDocNumber');
						const retiroFullName = document.getElementById('retiroFullName');
						const retiroDate = document.getElementById('retiroDate');
						const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');
						
						noveltyData.retiro = {
							docType: retiroDocType?.value || 'RC',
							document: retiroDocNumber?.value?.trim() || '',
							name: retiroFullName?.value?.trim() || '',
							gender: retiroGender?.value || '',
							retiroDate: retiroDate?.value || ''
						};
						
						// ✅ CORREGIDO: Asignar documento y nombre PRINCIPAL desde retiro
						noveltyData.document = noveltyData.retiro.document;
						noveltyData.name = noveltyData.retiro.name;
					}	

                    // Datos de ingreso (solo si aplica)
					if (isIngreso) {
						const ingresoDocType = document.getElementById('ingresoDocType');
						const ingresoDocNumber = document.getElementById('ingresoDocNumber');
						const ingresoFullName = document.getElementById('ingresoFullName');
						const ingresoDOB = document.getElementById('ingresoDOB');
						const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
						const ingresoDate = document.getElementById('ingresoDate');
						const ingresoAddress = document.getElementById('ingresoAddress');
						const ingresoPhone = document.getElementById('ingresoPhone');
						const acudienteName = document.getElementById('acudienteName');
						const acudienteDoc = document.getElementById('acudienteDoc');
						const acudienteDOB = document.getElementById('acudienteDOB');
						const ingresoComuna = document.getElementById('ingresoComuna');
						const ingresoBarrio = document.getElementById('ingresoBarrio');
						
						noveltyData.ingreso = {
							docType: ingresoDocType?.value || 'RC',
							document: ingresoDocNumber?.value?.trim() || '',
							name: ingresoFullName?.value?.trim() || '',
							dob: ingresoDOB?.value || '',
							age: document.getElementById('displayAge')?.value || '',
							gender: ingresoGender?.value || '',
							comuna: ingresoComuna?.value || '',
							barrio: ingresoBarrio?.value?.trim() || '',
							address: ingresoAddress?.value?.trim() || '',
							phone: ingresoPhone?.value?.trim() || '',
							acudiente: acudienteName?.value?.trim() || '',
							acudienteDoc: acudienteDoc?.value?.trim() || '',
							acudienteDOB: acudienteDOB?.value || '',
							ingresoDate: ingresoDate?.value || ''
						};
						
						// ✅ CORREGIDO: Solo asignar documento/name principal si NO hay retiro
						// (si hay ambos, ya se asignó desde retiro arriba)
						if (!isRetiro) {
							noveltyData.document = noveltyData.ingreso.document;
							noveltyData.name = noveltyData.ingreso.name;
						}
						
						// Nutrición solo si hay ingreso
						const nutricionFecha = document.getElementById('nutricionFecha');
						const nutricionPeso = document.getElementById('nutricionPeso');
						const nutricionTalla = document.getElementById('nutricionTalla');
						const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');
						const nutricionRegimen = document.getElementById('nutricionRegimen');
						const nutricionEPS = document.getElementById('nutricionEPS');
						const nutricionStatus = document.getElementById('nutricionStatus');
						
						const nutricionPendienteFlag = document.getElementById('nutricionPendiente');
						noveltyData.nutricion = {
							pendiente: nutricionPendienteFlag?.checked || false,
							fecha: nutricionFecha?.value || '',
							peso: nutricionPeso?.value || '',
							talla: nutricionTalla?.value || '',
							perimetroBraquial: nutricionPerimetroBraquial?.value || '',
							regimen: nutricionRegimen?.value || '',
							eps: nutricionEPS?.value || '',
							estadoNutricional: nutricionPendienteFlag?.checked ? '⏳ Pendiente' : (nutricionStatus?.textContent || 'No calculado')
						};
					}

                    // Preparar datos para Google Apps Script
                    const googleData = {
                        Contrato: contract.value,
                        UDS_Full: uds.value,
                        REPORTE_DETALLADO: formatData(),
                        _subject: `Novedad UDS: ${udsName}`
                    };

                    // Solo agregar datos de retiro si existe
                    if (isRetiro && noveltyData.retiro) {
                        googleData.retiro_tipo_doc = noveltyData.retiro.docType;
                        googleData.retiro_documento = noveltyData.retiro.document;
                        googleData.retiro_nombre = noveltyData.retiro.name;
                        googleData.retiro_fecha = noveltyData.retiro.retiroDate;
                        googleData._retiroGender = noveltyData.retiro.gender;
                    }

                    // Solo agregar datos de ingreso si existe
                    if (isIngreso && noveltyData.ingreso) {
                        googleData.ingreso_tipo_doc = noveltyData.ingreso.docType;
                        googleData.ingreso_documento = noveltyData.ingreso.document;
                        googleData.ingreso_nombre = noveltyData.ingreso.name;
                        googleData.ingreso_nacimiento = noveltyData.ingreso.dob;
                        googleData.edad_calculada = noveltyData.ingreso.age;
                        googleData.ingreso_fecha = noveltyData.ingreso.ingresoDate;
                        googleData._ingresoGender = noveltyData.ingreso.gender;
                        googleData.ingreso_comuna = noveltyData.ingreso.comuna;
                        googleData.ingreso_barrio = noveltyData.ingreso.barrio;
                        googleData.ingreso_direccion = noveltyData.ingreso.address;
                        googleData.ingreso_telefono = noveltyData.ingreso.phone;
                        googleData.acudiente_documento = noveltyData.ingreso.acudienteDoc;
                        googleData.acudiente_nombre = noveltyData.ingreso.acudiente;
                        googleData.acudiente_nacimiento = noveltyData.ingreso.acudienteDOB;
                        googleData.nutricion_fecha = noveltyData.nutricion.fecha;
                        googleData.nutricion_peso = noveltyData.nutricion.peso;
                        googleData.nutricion_talla = noveltyData.nutricion.talla;
                        googleData.nutricion_perimetro_braquial = noveltyData.nutricion.perimetroBraquial;
                        googleData.nutricion_regimen = noveltyData.nutricion.regimen;
                        googleData.nutricion_eps = noveltyData.nutricion.eps;
                    }

                    if (btn) {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner"></span> ENVIANDO...';
                    }

                    try {
                        // 1. Guardar en Firebase
                        await database.ref(AsociacionesModule.getRef('novelties')).push(noveltyData);
                        console.log('✅ Firebase OK');

                        // 2. Procesar archivo si existe
                        if (fileInput?.files?.length > 0) {
                            const file = fileInput.files[0];
                            
                            if (file.size > 8 * 1024 * 1024) {
                                throw new Error("El archivo excede 8MB. Use un archivo más pequeño.");
                            }

                            const base64 = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = e => resolve(e.target.result.split(',')[1]);
                                reader.onerror = () => reject(new Error("Error al leer archivo"));
                                reader.readAsDataURL(file);
                            });

                            googleData.file_base64 = base64;
                            googleData.file_type = file.type;
                            googleData.file_name = file.name;
                        }

                        // 3. Enviar a Google Apps Script
                        await enviarAGoogle(googleData, btn);

                    } catch (error) {
                        console.error('Error:', error);
                        showToast(error.message, "error");
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<span>Enviar Reporte Al Correo</span>';
                        }
                    }
                });
            }
        });

        // Función separada para envío a Google
		async function enviarAGoogle(data, btn) {
			const formBody = Object.keys(data)
				.map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key] || ''))
				.join('&');

			try {
				const response = await fetch(document.getElementById('noveltyForm').action, {
					method: 'POST',
					mode: 'no-cors',  // Necesario para Google Apps Script
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: formBody
				});

				// ✅ MOSTRAR PANEL DE RESUMEN ANTES DE LIMPIAR
				mostrarResumenEnvio();
				
				// Pequeña pausa para que el usuario vea el resumen antes de limpiar
				setTimeout(() => {
					// Resetear formulario
					document.getElementById('noveltyForm').reset();
					updateStyles();
					document.getElementById('sectionRetiro').classList.add('hidden');
					document.getElementById('sectionIngreso').classList.add('hidden');
					const displayAge = document.getElementById('displayAge');
					if (displayAge) displayAge.value = "Esperando fechas...";
					
					const nutricionIndicator = document.getElementById('nutricionIndicator');
					if (nutricionIndicator) nutricionIndicator.style.display = 'none';
					
					showToast('✅ ¡Éxito! Reporte enviado correctamente.', 'success');
				}, 500);

			} catch (error) {
				console.error('Error envío:', error);
				showToast("❌ Error de conexión con Google Apps Script.", "error");
				throw error;
			} finally {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = '<span>Enviar Reporte Al Correo</span>';
				}
			}
		}
        
        function inicializarGraficaOMS() {
            // Placeholder para inicialización de gráfica
            console.log('Gráfica OMS inicializada');
        }
		
		// Función para abrir modal de gráfica OMS desde el panel admin
		function abrirModalGraficaOMSAdmin() {
			const modal = document.getElementById('modalGraficaOMS');
			const GeneroInput = document.querySelector('input[name="_ingresoGender"]:checked');
			
			if (!GeneroInput) {
				showToast('Seleccione el género del beneficiario primero', 'warning');
				return;
			}
			
			document.body.classList.add('modal-open');
			
			const Genero = GeneroInput.value;
			const content = modal.querySelector('.modal-grafica-content');
			
			content.classList.remove('boy', 'girl');
			content.classList.add(Genero === 'M' ? 'boy' : 'girl');
			
			const Title = document.getElementById('modalGraficaTitle');
			const Icon = Genero === 'M' ? '👦' : '👧';
			Title.textContent = `Gráfica Peso/Talla OMS - ${Genero === 'M' ? 'NIÑOS' : 'NIÑAS'} ${Icon}`;
			
			modal.classList.add('active');
			
			requestAnimationFrame(() => {
				setTimeout(() => {
					dibujarGraficaEnModal(Genero);
				}, 100);
			});
		}
		// ============================================
		// FUNCIONES DEL PANEL DE RESUMEN DE ENVÍO
		// ============================================

		function mostrarResumenEnvio() {
			const panel = document.getElementById('resumenEnvioPanel');
			const body = document.getElementById('resumenPanelBody');
			
			if (!panel || !body) return;
			
			// Construir el contenido del resumen
			body.innerHTML = construirResumenEnvio();
			
			// Mostrar panel
			panel.style.display = 'flex';
			panel.classList.remove('cerrando');
			
			// Prevenir scroll del body
			document.body.classList.add('modal-open');
		}

		function cerrarResumenPanel() {
			const panel = document.getElementById('resumenEnvioPanel');
			if (!panel) return;
			
			panel.classList.add('cerrando');
			
			setTimeout(() => {
				panel.style.display = 'none';
				panel.classList.remove('cerrando');
				document.body.classList.remove('modal-open');
			}, 300);
		}

		function cerrarYContinuar() {
			cerrarResumenPanel();
		}

		function construirResumenEnvio() {
			const contract = document.getElementById('contractNumber')?.value || '';
			const udsFull = document.getElementById('mainUdsDropdown')?.value || '';
			const udsName = udsFull.split(' - ')[0] || '';
			const udsCode = udsFull.split(' - ')[1] || '';
			
			const checkRetiro = document.getElementById('checkRetiro')?.checked || false;
			const checkIngreso = document.getElementById('checkIngreso')?.checked || false;
			
			let html = '';
			
			// Info general
			html += `
				<div class="resumen-info-general">
					<div class="resumen-info-item">
						<span class="resumen-info-label">📋 Contrato</span>
						<span class="resumen-info-valor">${contract || 'No seleccionado'}</span>
					</div>
					<div class="resumen-info-item">
						<span class="resumen-info-label">🏫 UDS</span>
						<span class="resumen-info-valor">${udsName || 'No seleccionada'}</span>
					</div>
					${udsCode ? `
					<div class="resumen-info-item">
						<span class="resumen-info-label">🔢 Código</span>
						<span class="resumen-info-valor" style="font-family: monospace;">${udsCode}</span>
					</div>
					` : ''}
				</div>
			`;
			
			// Determinar tipo y badge
			let tipoBadge = '';
			let tipoClass = '';
			if (checkRetiro && checkIngreso) {
				tipoBadge = '<span class="resumen-tipo-badge ambos">🔄 AMBOS</span>';
				tipoClass = 'ambos';
			} else if (checkRetiro) {
				tipoBadge = '<span class="resumen-tipo-badge retiro">👤 RETIRO</span>';
				tipoClass = 'retiro';
			} else if (checkIngreso) {
				tipoBadge = '<span class="resumen-tipo-badge ingreso">👶 INGRESO</span>';
				tipoClass = 'ingreso';
			}
			
			// Sección de Retiro
			if (checkRetiro) {
				const retiroDocType = document.getElementById('retiroDocType')?.value || 'RC';
				const retiroDocNumber = document.getElementById('retiroDocNumber')?.value || '';
				const retiroFullName = document.getElementById('retiroFullName')?.value || '';
				const retiroDate = document.getElementById('retiroDate')?.value || '';
				const retiroGender = document.querySelector('input[name="_retiroGender"]:checked')?.value || '';
				
				html += `
					<div class="resumen-seccion-card resumen-seccion-retiro">
						<div class="resumen-seccion-header">
							<div class="resumen-seccion-icon">👤</div>
							<h4 class="resumen-seccion-title">Datos de Retiro</h4>
							${tipoClass === 'retiro' ? tipoBadge : ''}
						</div>
						<div class="resumen-datos-grid">
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">👤 Nombre del Beneficiario</div>
								<div class="resumen-dato-valor destacado">${retiroFullName.toUpperCase() || 'No ingresado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🆔 Documento</div>
								<div class="resumen-dato-valor documento">${retiroDocType} ${retiroDocNumber}</div>
							</div>
							<div>
								<div class="resumen-dato-label">⚧ Género</div>
								<div class="resumen-dato-valor">${retiroGender === 'M' ? 'Masculino' : retiroGender === 'F' ? 'Femenino' : 'No seleccionado'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">📅 Fecha de Retiro</div>
								<div class="resumen-dato-valor">${retiroDate || 'No ingresada'}</div>
							</div>
						</div>
					</div>
				`;
			}
			
			// Sección de Ingreso
			if (checkIngreso) {
				const ingresoDocType = document.getElementById('ingresoDocType')?.value || 'RC';
				const ingresoDocNumber = document.getElementById('ingresoDocNumber')?.value || '';
				const ingresoFullName = document.getElementById('ingresoFullName')?.value || '';
				const ingresoDOB = document.getElementById('ingresoDOB')?.value || '';
				const ingresoDate = document.getElementById('ingresoDate')?.value || '';
				const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked')?.value || '';
				const displayAge = document.getElementById('displayAge')?.value || '';
				const ingresoComuna = document.getElementById('ingresoComuna')?.value || '';
				const ingresoBarrio = document.getElementById('ingresoBarrio')?.value || '';
				const ingresoAddress = document.getElementById('ingresoAddress')?.value || '';
				const ingresoPhone = document.getElementById('ingresoPhone')?.value || '';
				
				html += `
					<div class="resumen-seccion-card resumen-seccion-ingreso">
						<div class="resumen-seccion-header">
							<div class="resumen-seccion-icon">👶</div>
							<h4 class="resumen-seccion-title">Datos del Niño</h4>
							${tipoClass === 'ingreso' ? tipoBadge : ''}
						</div>
						<div class="resumen-datos-grid">
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">👤 Nombre Completo</div>
								<div class="resumen-dato-valor destacado">${ingresoFullName.toUpperCase() || 'No ingresado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🆔 Documento</div>
								<div class="resumen-dato-valor documento">${ingresoDocType} ${ingresoDocNumber}</div>
							</div>
							<div>
								<div class="resumen-dato-label">⚧ Género</div>
								<div class="resumen-dato-valor">${ingresoGender === 'M' ? 'Masculino' : ingresoGender === 'F' ? 'Femenino' : 'No seleccionado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🎂 Fecha Nacimiento</div>
								<div class="resumen-dato-valor">${ingresoDOB || 'No ingresada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📏 Edad Calculada</div>
								<div class="resumen-dato-valor destacado">${displayAge !== 'Esperando fechas...' ? displayAge : 'No calculada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📅 Fecha Ingreso</div>
								<div class="resumen-dato-valor">${ingresoDate || 'No ingresada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📍 Comuna</div>
								<div class="resumen-dato-valor">${ingresoComuna || 'No seleccionada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🏘️ Barrio</div>
								<div class="resumen-dato-valor">${ingresoBarrio || 'No ingresado'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">🏠 Dirección</div>
								<div class="resumen-dato-valor">${ingresoAddress || 'No ingresada'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">📞 Teléfono</div>
								<div class="resumen-dato-valor">${ingresoPhone || 'No ingresado'}</div>
							</div>
						</div>
					</div>
				`;
				
				// Sección Acudiente
				const acudienteName = document.getElementById('acudienteName')?.value || '';
				const acudienteDoc = document.getElementById('acudienteDoc')?.value || '';
				const acudienteDOB = document.getElementById('acudienteDOB')?.value || '';
				
				if (acudienteName || acudienteDoc) {
					html += `
						<div class="resumen-seccion-card resumen-seccion-acudiente">
							<div class="resumen-seccion-header">
								<div class="resumen-seccion-icon">👨‍👩‍👧</div>
								<h4 class="resumen-seccion-title">Datos del Acudiente</h4>
							</div>
							<div class="resumen-datos-grid">
								<div class="resumen-dato-full">
									<div class="resumen-dato-label">👤 Nombre</div>
									<div class="resumen-dato-valor">${acudienteName.toUpperCase() || 'No ingresado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🆔 Documento</div>
									<div class="resumen-dato-valor documento">${acudienteDoc || 'No ingresado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🎂 Fecha Nacimiento</div>
									<div class="resumen-dato-valor">${acudienteDOB || 'No ingresada'}</div>
								</div>
							</div>
						</div>
					`;
				}
				
				// Sección Nutricional
				const nutricionFecha = document.getElementById('nutricionFecha')?.value || '';
				const nutricionPeso = document.getElementById('nutricionPeso')?.value || '';
				const nutricionTalla = document.getElementById('nutricionTalla')?.value || '';
				const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial')?.value || '';
				const nutricionRegimen = document.getElementById('nutricionRegimen')?.value || '';
				const nutricionEPS = document.getElementById('nutricionEPS')?.value || '';
				const nutricionStatus = document.getElementById('nutricionStatus')?.textContent || '';
				
				if (nutricionPeso || nutricionTalla) {
					// Determinar color del estado nutricional
					let estadoColor = '#94a3b8';
					let estadoBg = 'rgba(148, 163, 184, 0.1)';
					if (nutricionStatus.includes('Severa')) { estadoColor = '#dc2626'; estadoBg = 'rgba(220, 38, 38, 0.1)'; }
					else if (nutricionStatus.includes('Moderada')) { estadoColor = '#ef4444'; estadoBg = 'rgba(239, 68, 68, 0.1)'; }
					else if (nutricionStatus.includes('Riesgo') && nutricionStatus.includes('Desnutrición')) { estadoColor = '#f59e0b'; estadoBg = 'rgba(245, 158, 11, 0.1)'; }
					else if (nutricionStatus.includes('Normal')) { estadoColor = '#10b981'; estadoBg = 'rgba(16, 185, 129, 0.1)'; }
					else if (nutricionStatus.includes('Sobrepeso')) { estadoColor = '#f97316'; estadoBg = 'rgba(249, 115, 22, 0.1)'; }
					else if (nutricionStatus.includes('Obesidad')) { estadoColor = '#8b5cf6'; estadoBg = 'rgba(139, 92, 246, 0.1)'; }
					
					html += `
						<div class="resumen-seccion-card resumen-seccion-nutricional">
							<div class="resumen-seccion-header">
								<div class="resumen-seccion-icon">🍎</div>
								<h4 class="resumen-seccion-title">Seguimiento Nutricional</h4>
							</div>
							<div class="resumen-datos-grid">
								<div>
									<div class="resumen-dato-label">📅 Fecha Valoración</div>
									<div class="resumen-dato-valor">${nutricionFecha || 'No ingresada'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">⚖️ Peso</div>
									<div class="resumen-dato-valor destacado">${nutricionPeso ? nutricionPeso + ' kg' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">📏 Talla</div>
									<div class="resumen-dato-valor destacado">${nutricionTalla ? nutricionTalla + ' cm' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">💪 Perímetro Braquial</div>
									<div class="resumen-dato-valor">${nutricionPerimetroBraquial ? nutricionPerimetroBraquial + ' cm' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🏥 Régimen</div>
									<div class="resumen-dato-valor">${nutricionRegimen || 'No seleccionado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🏥 EPS</div>
									<div class="resumen-dato-valor">${nutricionEPS || 'No ingresada'}</div>
								</div>
								<div class="resumen-dato-full">
									<div class="resumen-dato-label">📊 Estado Nutricional</div>
									<div class="resumen-estado-nutricional" style="background: ${estadoBg}; color: ${estadoColor}; border: 1px solid ${estadoColor};">
										${nutricionStatus || 'No calculado'}
									</div>
								</div>
							</div>
						</div>
					`;
				}
			}
			
			// Si es tipo AMBOS, mostrar badge combinado
			if (tipoClass === 'ambos') {
				html = html.replace('</div>\n            </div>\n        </div>', 
					`</div>\n            </div>\n        </div>`);
				// El badge ya se muestra en la primera sección (retiro)
			}
			
			return html;
		}

		// Cerrar panel al hacer click fuera
		document.addEventListener('click', function(e) {
			const panel = document.getElementById('resumenEnvioPanel');
			if (panel && panel.style.display === 'flex' && !panel.contains(e.target)) {
				// Opcional: cerrar al hacer click fuera
				// cerrarResumenPanel();
			}
		});

		// Cerrar con Escape
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				const panel = document.getElementById('resumenEnvioPanel');
				if (panel && panel.style.display === 'flex') {
					cerrarResumenPanel();
				}
			}
		});
