// ==================== SISTEMA AUDITORIA Y ADMIN ====================

		const CLAVE_ADMIN = 'ZAN';
		let registrosAuditoria = [];
		let auditoriaListener = null;

		// Referencia a Firebase para auditoría
		function getAuditoriaRef() {
			if (!window.firebaseDB) return null;
			return window.firebaseRef(window.firebaseDB, 'auditoria');
		}

		// Obtener información del dispositivo
		function getDeviceInfo() {
			return {
				userAgent: navigator.userAgent,
				plataforma: navigator.platform,
				idioma: navigator.language,
				nucleos: navigator.hardwareConcurrency || 'unknown',
				memoria: navigator.deviceMemory || 'unknown',
				pantalla: `${screen.width}x${screen.height}`,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
			};
		}

		// Generar ID único de dispositivo
		function getDeviceId() {
			let deviceId = localStorage.getItem('smartMenu_deviceId');
			if (!deviceId) {
				deviceId = 'DEV_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
				localStorage.setItem('smartMenu_deviceId', deviceId);
			}
			return deviceId;
		}

		// Registrar acción en auditoría - SIEMPRE en Firebase
		async function registrarAuditoria(accion, regional, tipo, detalles = {}) {
			// Obtener IP
			let ip = 'unknown';
			try {
				const response = await fetch('https://api.ipify.org?format=json');
				const data = await response.json();
				ip = data.ip;
			} catch (e) {
				console.log('No se pudo obtener IP, usando fallback');
				// Fallback: intentar con otro servicio
				try {
					const resp2 = await fetch('https://ipapi.co/json/');
					const data2 = await resp2.json();
					ip = data2.ip;
				} catch (e2) {
					ip = 'unknown_' + Date.now();
				}
			}

			const registro = {
				id: Date.now(),
				fecha: new Date().toISOString(),
				fechaLocal: new Date().toLocaleString('es-CO'),
				timestamp: Date.now(),
				ip: ip,
				deviceInfo: getDeviceInfo(),
				deviceId: getDeviceId(),
				accion: accion,
				regional: regional,
				modalidad: currentModalidad,
				tipo: tipo,
				detalles: detalles,
				url: window.location.href,
				userAgent: navigator.userAgent
			};

			// GUARDAR PRIMERO EN FIREBASE (fuente principal)
			if (window.firebaseDB) {
				try {
					await window.firebaseSet(
						window.firebaseRef(window.firebaseDB, `auditoria/${registro.id}`), 
						registro
					);
					console.log('✅ Registro guardado en Firebase:', registro.id);
					
					// También guardar en localStorage como backup
					const backup = JSON.parse(localStorage.getItem('smartMenu_auditoria_backup') || '[]');
					backup.unshift(registro);
					if (backup.length > 100) backup.pop(); // Solo últimos 100 en backup
					localStorage.setItem('smartMenu_auditoria_backup', JSON.stringify(backup));
					
				} catch (error) {
					console.error('❌ Error guardando en Firebase:', error);
					// Si falla Firebase, guardar en localStorage temporalmente
					const pendientes = JSON.parse(localStorage.getItem('smartMenu_auditoria_pendientes') || '[]');
					pendientes.push(registro);
					localStorage.setItem('smartMenu_auditoria_pendientes', JSON.stringify(pendientes));
					showToast('Error de conexión. Registro pendiente de sincronizar.', 'warning');
				}
			} else {
				console.warn('Firebase no disponible, guardando localmente');
				const pendientes = JSON.parse(localStorage.getItem('smartMenu_auditoria_pendientes') || '[]');
				pendientes.push(registro);
				localStorage.setItem('smartMenu_auditoria_pendientes', JSON.stringify(pendientes));
			}

			return registro;
		}

		// Sincronizar registros pendientes
		async function sincronizarPendientes() {
			const pendientes = JSON.parse(localStorage.getItem('smartMenu_auditoria_pendientes') || '[]');
			if (pendientes.length === 0 || !window.firebaseDB) return;
			
			console.log(`Sincronizando ${pendientes.length} registros pendientes...`);
			
			const exitosos = [];
			for (const reg of pendientes) {
				try {
					await window.firebaseSet(
						window.firebaseRef(window.firebaseDB, `auditoria/${reg.id}`), 
						reg
					);
					exitosos.push(reg.id);
					console.log('✅ Sincronizado:', reg.id);
				} catch (e) {
					console.error('❌ Fallo sincronización:', reg.id);
				}
			}
			
			// Eliminar los que se sincronizaron
			const restantes = pendientes.filter(r => !exitosos.includes(r.id));
			localStorage.setItem('smartMenu_auditoria_pendientes', JSON.stringify(restantes));
			
			if (exitosos.length > 0) {
				showToast(`${exitosos.length} registros sincronizados con Firebase`, 'success');
			}
		}

		// Configurar listener de Firebase para auditoría en tiempo real
		function setupAuditoriaListener() {
			if (!window.firebaseDB) {
				console.warn('Firebase no disponible para auditoría');
				return;
			}
			
			const auditoriaRef = getAuditoriaRef();
			if (!auditoriaRef) return;
			
			// Cancelar listener anterior si existe
			if (auditoriaListener) {
				// No hay método directo para cancelar, pero podemos ignorar callbacks
			}
			
			console.log('👂 Configurando listener de auditoría...');
			
			window.firebaseOnValue(auditoriaRef, (snapshot) => {
				const data = [];
				if (snapshot.exists()) {
					snapshot.forEach((childSnapshot) => {
						data.push(childSnapshot.val());
					});
				}
				
				// Ordenar por fecha descendente
				data.sort((a, b) => b.timestamp - a.timestamp);
				
				registrosAuditoria = data;
				console.log(`📊 ${data.length} registros cargados de Firebase`);
				
				// Si el admin está abierto, actualizar vista
				if (document.getElementById('admin-dashboard').style.display === 'block') {
					cargarRegistrosAdmin();
				}
			}, (error) => {
				console.error('Error cargando auditoría:', error);
			});
		}

		// Modificar función generar() para registrar
		const generarOriginal = generar;
		generar = function() {
			const sem = parseInt(document.getElementById('sem').value);
			const personas = parseInt(document.getElementById('num-p').value) || 0;
			const dias = Array.from(document.querySelectorAll('.d-ch:checked')).map(cb => parseInt(cb.value));
			
			// Llamar función original PRIMERO
			const resultado = generarOriginal.apply(this, arguments);
			
			// Luego registrar en auditoría (no bloqueante)
			registrarAuditoria('GENERAR_LISTA', currentRegional, 'semanal', {
				semana: sem,
				personas: personas,
				diasSeleccionados: dias,
				totalProductos: currentData ? Object.keys(currentData).length : 0
			}).catch(e => console.error('Error en auditoría:', e));
			
			return resultado;
		};

		// Modificar función generarMensual() para registrar
		const generarMensualOriginal = generarMensual;
		generarMensual = function() {
			const semanas = Array.from(monthlyActiveWeeks.keys());
			const personas = parseInt(document.getElementById('monthly-num-p').value) || 0;
			
			// Llamar función original PRIMERO
			const resultado = generarMensualOriginal.apply(this, arguments);
			
			// Luego registrar en auditoría (no bloqueante)
			registrarAuditoria('GENERAR_LISTA_MENSUAL', currentRegional, 'mensual', {
				semanas: semanas,
				personas: personas,
				totalProductos: monthlyData ? Object.keys(monthlyData).length : 0
			}).catch(e => console.error('Error en auditoría:', e));
			
			return resultado;
		};

		// ==================== PANEL ADMIN ====================

		// Paginación admin
		let adminPaginaActual = 1;
		const ADMIN_POR_PAGINA = 30;

		function cargarRegistrosAdmin() {
			const tbody = document.getElementById('admin-registros-tbody');
			const filtroRegional = document.getElementById('admin-filter-regional').value;
			const filtroTipo = document.getElementById('admin-filter-tipo').value;
			const filtroModalidad = document.getElementById('admin-filter-modalidad').value;
			const filtroBuscar = document.getElementById('admin-filter-buscar').value.toLowerCase();
			const filtroFechaDesde = document.getElementById('admin-filter-fecha-desde').value;
			const filtroFechaHasta = document.getElementById('admin-filter-fecha-hasta').value;

			const hoy = new Date().toDateString();
			const stats = {
				totalHistorico: 0,
				totalHoy: 0,
				neiva: 0,
				gaitana: 0,
				mensual: 0,
				semanal: 0,
				ipsUnicas: new Set(),
				porModalidad: { hcb: 0, cdi: 0, hi: 0, unknown: 0 },
				porIP: {},
				porDia: {}
			};

			const registros = registrosAuditoria || [];
			
			if (registros.length === 0) {
				tbody.innerHTML = `<tr><td colspan="9" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
					<div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
					Cargando registros de Firebase...<br>
					<small style="font-size: 0.7rem;">Si no aparecen datos en unos segundos, verifica la conexión a Firebase</small>
				</td></tr>`;
				actualizarStatsAdmin(stats);
				actualizarWidgetsSecundarios(stats);
				return;
			}

			// Calcular stats globales (sin filtros)
			registros.forEach(reg => {
				stats.totalHistorico++;
				const fechaReg = new Date(reg.fecha).toDateString();
				if (fechaReg === hoy) stats.totalHoy++;
				if (reg.regional === 'neiva') stats.neiva++;
				if (reg.regional === 'gaitana') stats.gaitana++;
				if (reg.tipo === 'mensual') stats.mensual++;
				if (reg.tipo === 'semanal') stats.semanal++;
				if (reg.ip && reg.ip !== 'N/A') {
					stats.ipsUnicas.add(reg.ip);
					stats.porIP[reg.ip] = (stats.porIP[reg.ip] || 0) + 1;
				}
				const mod = (reg.modalidad || 'unknown').toLowerCase();
				if (stats.porModalidad[mod] !== undefined) stats.porModalidad[mod]++;
				else stats.porModalidad.unknown++;

				// Actividad por día (últimos 7 días)
				const fechaObj = new Date(reg.fecha);
				const diffDias = Math.floor((new Date() - fechaObj) / (1000 * 60 * 60 * 24));
				if (diffDias < 7) {
					const diaKey = fechaObj.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
					stats.porDia[diaKey] = (stats.porDia[diaKey] || 0) + 1;
				}
			});

			// Filtrar registros
			const filtrados = registros.filter(reg => {
				if (filtroRegional !== 'todos' && reg.regional !== filtroRegional) return false;
				if (filtroTipo !== 'todos' && reg.tipo !== filtroTipo) return false;
				if (filtroModalidad !== 'todos' && (reg.modalidad || '').toLowerCase() !== filtroModalidad) return false;
				if (filtroFechaDesde) {
					const regDate = reg.fecha.split('T')[0];
					if (regDate < filtroFechaDesde) return false;
				}
				if (filtroFechaHasta) {
					const regDate = reg.fecha.split('T')[0];
					if (regDate > filtroFechaHasta) return false;
				}
				if (filtroBuscar) {
					const buscarEn = [
						reg.ip,
						reg.deviceId,
						reg.deviceInfo?.plataforma,
						reg.deviceInfo?.userAgent,
						reg.deviceInfo?.timezone,
						reg.modalidad
					].join(' ').toLowerCase();
					if (!buscarEn.includes(filtroBuscar)) return false;
				}
				return true;
			});

			// Paginación
			const totalFiltrados = filtrados.length;
			const totalPaginas = Math.ceil(totalFiltrados / ADMIN_POR_PAGINA);
			if (adminPaginaActual > totalPaginas) adminPaginaActual = 1;
			const inicio = (adminPaginaActual - 1) * ADMIN_POR_PAGINA;
			const fin = inicio + ADMIN_POR_PAGINA;
			const pagina = filtrados.slice(inicio, fin);

			// Actualizar contadores
			const hayFiltros = filtroRegional !== 'todos' || filtroTipo !== 'todos' || filtroModalidad !== 'todos' || filtroBuscar || filtroFechaDesde || filtroFechaHasta;
			document.getElementById('admin-count-label').textContent = hayFiltros
				? `Mostrando ${totalFiltrados} de ${stats.totalHistorico} registros (filtrados)`
				: `Mostrando todos los registros: ${stats.totalHistorico} total`;
			document.getElementById('admin-paginacion-info').textContent = totalPaginas > 1
				? `Página ${adminPaginaActual} de ${totalPaginas}`
				: '';

			// Generar filas
			let html = '';
			if (pagina.length === 0) {
				html = `<tr><td colspan="9" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
					<div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
					No hay registros con los filtros aplicados
				</td></tr>`;
			} else {
				pagina.forEach((reg, idx) => {
					const regionalColor = reg.regional === 'neiva' ? '#2563eb' : '#059669';
					const fecha = new Date(reg.fecha);
					const fechaStr = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
					const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
					const esPar = idx % 2 === 0;

					let detallesTexto = '';
					if (reg.detalles) {
						if (reg.detalles.semana) detallesTexto += `Sem ${reg.detalles.semana} `;
						if (reg.detalles.semanas?.length) detallesTexto += `Sems ${reg.detalles.semanas.join('+')} `;
						if (reg.detalles.personas) detallesTexto += `• ${reg.detalles.personas}👦 `;
						if (reg.detalles.totalProductos) detallesTexto += `• ${reg.detalles.totalProductos}🛒`;
					}

					const modalidadColors = { hcb: '#f97316', cdi: '#06b6d4', hi: '#ec4899' };
					const modColor = modalidadColors[(reg.modalidad || '').toLowerCase()] || '#6b7280';
					const modLabel = (reg.modalidad || 'N/A').toUpperCase();

					// Detectar SO/navegador simplificado
					const ua = reg.deviceInfo?.userAgent || '';
					let soBrief = '❓';
					if (/Android/i.test(ua)) soBrief = '🤖 Android';
					else if (/iPhone|iPad|iPod/i.test(ua)) soBrief = '🍎 iOS';
					else if (/Windows/i.test(ua)) soBrief = '🪟 Win';
					else if (/Mac/i.test(ua)) soBrief = '🍎 Mac';
					else if (/Linux/i.test(ua)) soBrief = '🐧 Linux';

					const regIdx = inicio + idx;
					html += `
						<tr style="border-bottom: 1px solid var(--border); background: ${esPar ? 'transparent' : 'rgba(255,255,255,0.02)'}; transition: background 0.15s;" 
							onmouseover="this.style.background='rgba(99,102,241,0.06)'" 
							onmouseout="this.style.background='${esPar ? 'transparent' : 'rgba(255,255,255,0.02)'}'">
							<td style="padding: 0.5rem 0.75rem; white-space: nowrap;">
								<div style="font-weight: 600; font-size: 0.75rem;">${fechaStr}</div>
								<div style="font-size: 0.7rem; color: var(--text-secondary); font-family: monospace;">${horaStr}</div>
							</td>
							<td style="padding: 0.5rem 0.75rem;">
								<div style="font-family: monospace; font-size: 0.7rem; color: #60a5fa; font-weight: 600;">${reg.ip || 'N/A'}</div>
								<div style="font-size: 0.65rem; color: var(--text-secondary);">${soBrief}</div>
							</td>
							<td style="padding: 0.5rem 0.75rem; max-width: 140px;">
								<div style="font-size: 0.7rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reg.deviceId || ''}">${(reg.deviceId || 'N/A').substring(0, 18)}${(reg.deviceId || '').length > 18 ? '…' : ''}</div>
								<div style="font-size: 0.65rem; color: var(--text-secondary);">${reg.deviceInfo?.pantalla || ''} ${reg.deviceInfo?.timezone ? '• ' + reg.deviceInfo.timezone.split('/').pop() : ''}</div>
							</td>
							<td style="padding: 0.5rem 0.75rem;">
								<span style="background: rgba(99,102,241,0.12); color: #818cf8; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; white-space: nowrap;">
									${reg.accion === 'GENERAR_LISTA' ? '📋 Semanal' : '📅 Mensual'}
								</span>
							</td>
							<td style="padding: 0.5rem 0.75rem;">
								<span style="background: ${regionalColor}20; color: ${regionalColor}; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; white-space: nowrap;">
									${reg.regional === 'neiva' ? '🏢' : '🌿'} ${reg.regional || 'N/A'}
								</span>
							</td>
							<td style="padding: 0.5rem 0.75rem;">
								<span style="background: ${reg.tipo === 'mensual' ? '#8b5cf6' : '#f59e0b'}18; color: ${reg.tipo === 'mensual' ? '#a78bfa' : '#fbbf24'}; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">
									${reg.tipo || 'N/A'}
								</span>
							</td>
							<td style="padding: 0.5rem 0.75rem;">
								<span style="background: ${modColor}18; color: ${modColor}; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.7rem; font-weight: 700;">
									${modLabel}
								</span>
							</td>
							<td style="padding: 0.5rem 0.75rem; font-size: 0.7rem; color: var(--text-secondary); max-width: 130px;">
								${detallesTexto || '—'}
							</td>
							<td style="padding: 0.5rem 0.75rem; text-align: center;">
								<button onclick="verDetalleRegistro(${regIdx})" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; border-radius: 0.375rem; cursor: pointer; padding: 0.2rem 0.5rem; font-size: 0.7rem; transition: all 0.2s;" 
									onmouseover="this.style.background='rgba(99,102,241,0.3)'" 
									onmouseout="this.style.background='rgba(99,102,241,0.15)'">
									🔍
								</button>
							</td>
						</tr>
					`;
				});
			}

			tbody.innerHTML = html;

			// Renderizar paginación
			renderizarPaginacionAdmin(totalPaginas);

			// Actualizar estadísticas y widgets
			actualizarStatsAdmin(stats);
			actualizarWidgetsSecundarios(stats);
		}

		function actualizarStatsAdmin(stats) {
			const total = stats.totalHistorico || 0;
			document.getElementById('stat-total-historico').textContent = total;
			document.getElementById('stat-total-hoy').textContent = stats.totalHoy;
			document.getElementById('stat-hoy-fecha').textContent = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
			document.getElementById('stat-neiva').textContent = stats.neiva;
			document.getElementById('stat-neiva-pct').textContent = total > 0 ? `${Math.round(stats.neiva * 100 / total)}% del total` : '—';
			document.getElementById('stat-gaitana').textContent = stats.gaitana;
			document.getElementById('stat-gaitana-pct').textContent = total > 0 ? `${Math.round(stats.gaitana * 100 / total)}% del total` : '—';
			document.getElementById('stat-mensual').textContent = stats.mensual;
			document.getElementById('stat-mensual-pct').textContent = total > 0 ? `${stats.semanal} semanales` : '—';
			document.getElementById('stat-ips-unicas').textContent = stats.ipsUnicas.size;

			// Estado Firebase
			const dot = document.getElementById('admin-fb-dot');
			const txt = document.getElementById('admin-fb-text');
			if (window.firebaseDB) {
				dot.style.background = '#10b981';
				dot.style.boxShadow = '0 0 6px #10b981';
				txt.textContent = 'Firebase conectado';
			} else {
				dot.style.background = '#ef4444';
				txt.textContent = 'Sin conexión';
			}
		}

		function actualizarWidgetsSecundarios(stats) {
			// Top IPs
			const topIPs = Object.entries(stats.porIP)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5);
			const maxIP = topIPs[0]?.[1] || 1;
			const ipHTML = topIPs.length > 0
				? topIPs.map(([ip, count]) => `
					<div style="margin-bottom: 0.5rem;">
						<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
							<span style="font-family: monospace; color: #60a5fa; font-size: 0.7rem;">${ip}</span>
							<span style="font-weight: 700; color: var(--text-primary); font-size: 0.75rem;">${count}</span>
						</div>
						<div style="height: 4px; background: var(--bg-dark); border-radius: 2px; overflow: hidden;">
							<div style="height: 100%; width: ${Math.round(count * 100 / maxIP)}%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 2px; transition: width 0.5s;"></div>
						</div>
					</div>
				`).join('')
				: '<div style="color: var(--text-secondary); text-align: center; padding: 0.5rem; font-size: 0.7rem;">Sin datos</div>';
			document.getElementById('admin-top-ips').innerHTML = ipHTML;

			// Por modalidad
			const modColors = { hcb: '#f97316', cdi: '#06b6d4', hi: '#ec4899', unknown: '#6b7280' };
			const modLabels = { hcb: '🏠 HCB', cdi: '🏫 CDI', hi: '👶 HI', unknown: '❓ N/D' };
			const totalMod = Object.values(stats.porModalidad).reduce((a, b) => a + b, 0) || 1;
			const modHTML = Object.entries(stats.porModalidad)
				.filter(([, v]) => v > 0)
				.sort((a, b) => b[1] - a[1])
				.map(([mod, count]) => `
					<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
						<span style="background: ${modColors[mod]}20; color: ${modColors[mod]}; padding: 0.15rem 0.5rem; border-radius: 1rem; font-size: 0.65rem; font-weight: 700; min-width: 50px; text-align: center;">${modLabels[mod] || mod}</span>
						<div style="flex: 1; height: 6px; background: var(--bg-dark); border-radius: 3px; overflow: hidden;">
							<div style="height: 100%; width: ${Math.round(count * 100 / totalMod)}%; background: ${modColors[mod]}; border-radius: 3px;"></div>
						</div>
						<span style="font-weight: 700; font-size: 0.75rem; min-width: 24px; text-align: right;">${count}</span>
					</div>
				`).join('') || '<div style="color: var(--text-secondary); font-size: 0.7rem; text-align: center; padding: 0.5rem;">Sin datos</div>';
			document.getElementById('admin-por-modalidad').innerHTML = modHTML;

			// Actividad últimos 7 días
			const diasEntries = Object.entries(stats.porDia).sort((a, b) => {
				// ordenar por fecha aproximada
				return 0;
			});
			const maxDia = Math.max(...diasEntries.map(([, v]) => v), 1);
			const diaHTML = diasEntries.length > 0
				? diasEntries.map(([dia, count]) => `
					<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
						<span style="font-size: 0.65rem; color: var(--text-secondary); min-width: 80px;">${dia}</span>
						<div style="flex: 1; height: 5px; background: var(--bg-dark); border-radius: 3px; overflow: hidden;">
							<div style="height: 100%; width: ${Math.round(count * 100 / maxDia)}%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 3px;"></div>
						</div>
						<span style="font-size: 0.7rem; font-weight: 700; min-width: 20px; text-align: right;">${count}</span>
					</div>
				`).join('')
				: '<div style="color: var(--text-secondary); font-size: 0.7rem; text-align: center; padding: 0.5rem;">Sin actividad reciente</div>';
			document.getElementById('admin-actividad-reciente').innerHTML = diaHTML;
		}

		function renderizarPaginacionAdmin(totalPaginas) {
			const container = document.getElementById('admin-paginacion');
			if (totalPaginas <= 1) { container.innerHTML = ''; return; }
			let html = '';
			for (let i = 1; i <= totalPaginas; i++) {
				const esActual = i === adminPaginaActual;
				html += `<button onclick="irAPaginaAdmin(${i})" style="min-width: 32px; height: 32px; border-radius: 0.375rem; border: 1px solid ${esActual ? '#6366f1' : 'var(--border)'}; background: ${esActual ? '#6366f1' : 'var(--bg-card)'}; color: ${esActual ? 'white' : 'var(--text-secondary)'}; cursor: pointer; font-size: 0.75rem; font-weight: ${esActual ? '700' : '400'}; transition: all 0.2s;">${i}</button>`;
			}
			container.innerHTML = html;
		}

		function irAPaginaAdmin(pagina) {
			adminPaginaActual = pagina;
			cargarRegistrosAdmin();
		}

		function filtrarRegistros() {
			adminPaginaActual = 1;
			cargarRegistrosAdmin();
		}

		function limpiarFiltrosAdmin() {
			document.getElementById('admin-filter-regional').value = 'todos';
			document.getElementById('admin-filter-tipo').value = 'todos';
			document.getElementById('admin-filter-modalidad').value = 'todos';
			document.getElementById('admin-filter-fecha-desde').value = '';
			document.getElementById('admin-filter-fecha-hasta').value = '';
			document.getElementById('admin-filter-buscar').value = '';
			adminPaginaActual = 1;
			cargarRegistrosAdmin();
		}

		function refrescarAdmin() {
			if (window.firebaseDB) {
				sincronizarPendientes();
			}
			cargarRegistrosAdmin();
			showToast('Panel actualizado', 'success');
		}

		// Ver detalle completo de un registro
		function verDetalleRegistro(idx) {
			const reg = registrosAuditoria[idx];
			if (!reg) return;
			const modal = document.getElementById('admin-detail-modal');
			const content = document.getElementById('admin-detail-content');

			const ua = reg.deviceInfo?.userAgent || 'N/A';
			let navegador = 'Desconocido';
			if (/Chrome\/(\d+)/i.test(ua)) navegador = `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] || ''}`;
			else if (/Firefox\/(\d+)/i.test(ua)) navegador = `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] || ''}`;
			else if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) navegador = 'Safari';
			else if (/Edge\/(\d+)/i.test(ua)) navegador = `Edge ${ua.match(/Edge\/(\d+)/)?.[1] || ''}`;

			const seccion = (key, label, val) => val && val !== 'N/A' && val !== 'unknown'
				? `<div style="display: flex; gap: 0.5rem; padding: 0.375rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
						<span style="min-width: 130px; color: var(--text-secondary); font-size: 0.75rem;">${label}</span>
						<span style="font-weight: 500; font-size: 0.75rem; word-break: break-all;">${val}</span>
					</div>` : '';

			const diasStr = reg.detalles?.diasSeleccionados
				? reg.detalles.diasSeleccionados.map(d => ['','Lun','Mar','Mié','Jue','Vie'][d]).join(', ')
				: '';

			content.innerHTML = `
				<div style="margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(99,102,241,0.08); border-radius: 0.5rem; border-left: 3px solid #6366f1;">
					<div style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Registro #${reg.id}</div>
					<div style="font-weight: 700; font-size: 0.9rem;">${reg.fechaLocal || new Date(reg.fecha).toLocaleString('es-CO')}</div>
				</div>

				<div style="margin-bottom: 0.875rem;">
					<div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; font-weight: 600;">🌐 Red</div>
					${seccion('ip', 'Dirección IP', reg.ip)}
					${seccion('url', 'URL de acceso', reg.url)}
				</div>

				<div style="margin-bottom: 0.875rem;">
					<div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; font-weight: 600;">💻 Dispositivo</div>
					${seccion('dev', 'Device ID', reg.deviceId)}
					${seccion('plat', 'Plataforma', reg.deviceInfo?.plataforma)}
					${seccion('nav', 'Navegador', navegador)}
					${seccion('pant', 'Pantalla', reg.deviceInfo?.pantalla)}
					${seccion('tz', 'Zona Horaria', reg.deviceInfo?.timezone)}
					${seccion('mem', 'Memoria RAM', reg.deviceInfo?.memoria !== 'unknown' ? reg.deviceInfo?.memoria + ' GB' : null)}
					${seccion('cpu', 'Núcleos CPU', reg.deviceInfo?.nucleos !== 'unknown' ? reg.deviceInfo?.nucleos : null)}
					${seccion('lang', 'Idioma', reg.deviceInfo?.idioma)}
				</div>

				<div style="margin-bottom: 0.875rem;">
					<div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; font-weight: 600;">📋 Acción</div>
					${seccion('accion', 'Acción', reg.accion)}
					${seccion('reg', 'Regional', reg.regional?.toUpperCase())}
					${seccion('mod', 'Modalidad', reg.modalidad?.toUpperCase())}
					${seccion('tipo', 'Tipo de lista', reg.tipo?.toUpperCase())}
					${seccion('sem', 'Semana', reg.detalles?.semana ? `Semana ${reg.detalles.semana}` : null)}
					${seccion('sems', 'Semanas', reg.detalles?.semanas?.length ? reg.detalles.semanas.join(', ') : null)}
					${seccion('dias', 'Días seleccionados', diasStr || null)}
					${seccion('pers', 'Niños', reg.detalles?.personas ? `${reg.detalles.personas} niños` : null)}
					${seccion('prod', 'Productos', reg.detalles?.totalProductos ? `${reg.detalles.totalProductos} productos` : null)}
				</div>

				<details style="margin-top: 0.5rem;">
					<summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-secondary); padding: 0.375rem 0;">Ver User Agent completo</summary>
					<div style="font-family: monospace; font-size: 0.65rem; color: var(--text-secondary); word-break: break-all; margin-top: 0.375rem; padding: 0.5rem; background: var(--bg-dark); border-radius: 0.375rem; line-height: 1.5;">${ua}</div>
				</details>
			`;

			modal.style.display = 'flex';
			document.body.style.overflow = 'hidden';
		}

		function cerrarDetalleRegistro() {
			document.getElementById('admin-detail-modal').style.display = 'none';
			document.body.style.overflow = '';
		}

		async function exportarRegistros() {
			// Obtener registros frescos de Firebase
			if (window.firebaseDB) {
				try {
					const snapshot = await window.firebaseGet(getAuditoriaRef());
					if (snapshot.exists()) {
						const data = [];
						snapshot.forEach((child) => data.push(child.val()));
						data.sort((a, b) => b.timestamp - a.timestamp);
						registrosAuditoria = data;
					}
				} catch (e) {
					console.error('Error obteniendo datos frescos:', e);
				}
			}
			
			if (registrosAuditoria.length === 0) {
				showToast('No hay registros para exportar', 'error');
				return;
			}

			const data = registrosAuditoria.map(reg => ({
				'Fecha': reg.fechaLocal || new Date(reg.fecha).toLocaleString('es-CO'),
				'IP': reg.ip || 'N/A',
				'Device ID': reg.deviceId || 'N/A',
				'Plataforma': reg.deviceInfo?.plataforma || 'Unknown',
				'Navegador': (reg.deviceInfo?.userAgent || '').substring(0, 100),
				'Pantalla': reg.deviceInfo?.pantalla || 'N/A',
				'Zona Horaria': reg.deviceInfo?.timezone || 'N/A',
				'Acción': reg.accion,
				'Regional': (reg.regional || '').toUpperCase(),
				'Modalidad': (reg.modalidad || 'N/A').toUpperCase(),
				'Tipo': (reg.tipo || '').toUpperCase(),
				'Semana(s)': reg.detalles?.semana || (reg.detalles?.semanas ? reg.detalles.semanas.join(', ') : ''),
				'Días seleccionados': reg.detalles?.diasSeleccionados ? reg.detalles.diasSeleccionados.map(d => ['','Lun','Mar','Mié','Jue','Vie'][d]).join(',') : '',
				'Personas': reg.detalles?.personas || '',
				'Productos': reg.detalles?.totalProductos || '',
				'URL': reg.url || ''
			}));

			const ws = XLSX.utils.json_to_sheet(data);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
			XLSX.writeFile(wb, `Auditoria_Minutas_${new Date().toISOString().split('T')[0]}.xlsx`);
			showToast(`${data.length} registros exportados`, 'success');
		}

		async function limpiarRegistros() {
			try {
				await mostrarConfirm('Se eliminarán TODOS los registros de auditoría de Firebase. Esta acción es irreversible.', {
					titulo: '⚠️ Eliminar registros de auditoría', icono: '🔥', btnOk: 'Sí, eliminar todo'
				});
			} catch { return; }
			
			if (!window.firebaseDB) {
				showToast('Firebase no disponible', 'error');
				return;
			}
			
			try {
				// Eliminar todo el nodo de auditoría
				await window.firebaseSet(getAuditoriaRef(), null);
				
				// Limpiar variables locales
				registrosAuditoria = [];
				localStorage.removeItem('smartMenu_auditoria_backup');
				localStorage.removeItem('smartMenu_auditoria_pendientes');
				
				cargarRegistrosAdmin();
				showToast('Registros eliminados de Firebase', 'success');
			} catch (error) {
				console.error('Error eliminando:', error);
				showToast('Error al eliminar: ' + error.message, 'error');
			}
		}

		// Cerrar modales con ESC (mejorado - cubre TODOS los modales)
		document.addEventListener('keydown', (e) => {
			if (e.key !== 'Escape') return;
			// Prioridad: modal detalle admin > panel admin > modal guardar lista > panel detalle producto > modal auth
			const detailModal = document.getElementById('admin-detail-modal');
			if (detailModal && detailModal.style.display === 'flex') {
				cerrarDetalleRegistro(); return;
			}
			const adminPanel = document.getElementById('admin-panel');
			if (adminPanel && adminPanel.style.display === 'block') {
				cerrarAdmin(); return;
			}
			// Modal guardar lista
			const saveModal = document.getElementById('saveListModal');
			if (saveModal && saveModal.style.display !== 'none') {
				cerrarModalGuardar(); return;
			}
			// Panel detalle producto
			const detailPanel = document.getElementById('detailPanel');
			if (detailPanel && detailPanel.classList.contains('open')) {
				cerrarDetalleProducto(); return;
			}
			// Modal de autenticación
			const authModal = document.getElementById('auth-modal');
			if (authModal && authModal.style.display !== 'none') {
				document.getElementById('auth-modal').style.display = 'none'; return;
			}
			// Confirmación de dialogo custom si está abierto
			const confirmDialog = document.getElementById('confirm-dialog-overlay');
			if (confirmDialog && confirmDialog.style.display !== 'none') {
				_confirmDialogReject && _confirmDialogReject();
				document.getElementById('confirm-dialog-overlay').style.display = 'none'; return;
			}
		});

		// Cerrar modal detalle al hacer clic fuera
		document.getElementById('admin-detail-modal').addEventListener('click', function(e) {
			if (e.target === this) cerrarDetalleRegistro();
		});

		// Inicializar auditoría cuando Firebase esté listo
		function initAuditoria() {
			const checkFirebase = setInterval(() => {
				if (window.firebaseDB) {
					clearInterval(checkFirebase);
					console.log('✅ Firebase detectado, inicializando auditoría...');
					setupAuditoriaListener();
					sincronizarPendientes();
				}
			}, 500);
			
			// Timeout después de 10 segundos
			setTimeout(() => {
				clearInterval(checkFirebase);
				if (!window.firebaseDB) {
					console.warn('⚠️ Firebase no disponible después de 10s');
				}
			}, 10000);
		}

		// Llamar inicialización
		initAuditoria();	

