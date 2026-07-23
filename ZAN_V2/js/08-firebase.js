        // ===== FIREBASE =====
        async function guardarFirebase() {
			const mes = document.getElementById('main-mes').value;
			const contrato = document.getElementById('main-contrato').value;
			
			if (!contrato || contrato.trim() === "") {
				Toast.warning("Ingresa un ID de contrato antes de guardar");
				document.getElementById('main-contrato').focus();
				return;
			}
			
			// Preparar datos para guardar
			const id = `${mes}_${contrato}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
			
			const data = {
				_metadata: {
					fechaGuardado: new Date().toISOString(),
					usuario: currentUser,
					version: '2.0',
					fileId: id,
					displayName: `${mes} - ${contrato}`,
					sincronizado: false
				},
				mes: mes,
				contrato: contrato,
				numSemanas: parseInt(document.getElementById('num-semanas').value) || 4,
				valorCupo: valorCupoBase,
				proveedores: JSON.parse(JSON.stringify(proveedores)),
				productosBase: JSON.parse(JSON.stringify(productosBase)),
				semanas: {}
			};
			
			const semanas = data.numSemanas;
			for (let s = 1; s <= semanas; s++) {
				data.semanas[s] = {
					d: document.getElementById(`dias-${s}`)?.value || "",
					c: document.getElementById(`cupos-${s}`)?.value || "",
					items: {}
				};
				
				productosBase.forEach((p, i) => {
					const cant = document.getElementById(`cant-${s}-${i}`)?.value || "";
					const val = document.getElementById(`val-${s}-${i}`)?.value || "";
					const fac = document.getElementById(`fac-${s}-${i}`)?.value || "";
					const punit = document.getElementById(`punit-${s}-${i}`)?.value || p.precio;
					
					if (cant || val || fac) {
						data.semanas[s].items[p.nombre] = {
							f: fac,
							q: cant,
							p: punit
						};
					}
				});
			}
			
			// ESTE ES EL MOMENTO CLAVE: El usuario presionó "Guardar"
			// Guardar como último confirmado
			ultimoGuardadoConfirmado = JSON.parse(JSON.stringify(data));
			cambiosSinGuardar = false;
			
			// SIEMPRE guardar en draft local
			localStorage.setItem(`elite_draft_${currentUser}`, JSON.stringify(data));
			
			// Verificar conexión
			if (!estaOnline()) {
				// SIN INTERNET: Guardar como pendiente de sincronización
				localStorage.setItem(`elite_pending_sync_${currentUser}`, JSON.stringify(data));
				hayPendientesSinSincronizar = true;
				mostrarEstadoGuardadoLocal(mes, contrato);
				return;
			}
			
			// CON INTERNET: Intentar subir a Firebase
			try {
				await db.ref(`files/${currentUser}/${id}`).set(data);
				
				// Éxito en Firebase
				currentFileId = id;
				localStorage.setItem(`elite_current_file_${currentUser}`, id);
				localStorage.removeItem(`elite_pending_sync_${currentUser}`);
				
				hayPendientesSinSincronizar = false;
				
				mostrarEstadoSincronizado();
				Toast.success(`${mes} - ${contrato}`, { title: '✓ Guardado en la nube' });
				
				if (document.getElementById('drawer-archivo').classList.contains('open')) {
					listarCloud();
				}
				
			} catch (error) {
				console.error("Error al guardar en Firebase:", error);
				
				// Falló Firebase, guardar como pendiente
				localStorage.setItem(`elite_pending_sync_${currentUser}`, JSON.stringify(data));
				hayPendientesSinSincronizar = true;
				mostrarEstadoGuardadoLocal(mes, contrato);
				
				Toast.warning('Datos guardados localmente. Se sincronizarán al recuperar conexión.', { title: 'Sin conexión' });
			}
		}

		function mostrarEstadoGuardadoLocal(mes, contrato) {
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			
			// Determinar mensaje según si hay cambios sin guardar
			const mensaje = cambiosSinGuardar 
				? "Cambios pendientes por guardar en local" 
				: "Guardado local (sin Internet)";
			
			const color = cambiosSinGuardar ? '#ff4655' : '#d4af37';
			
			if (dotTop) {
				dotTop.style.background = color;
				dotTop.style.boxShadow = `0 0 12px ${color}`;
			}
			if (textTop) {
				textTop.textContent = mensaje;
				textTop.style.color = color;
				textTop.style.fontWeight = cambiosSinGuardar ? 'bold' : '500';
			}
			if (dot) {
				dot.style.background = color;
				dot.style.boxShadow = `0 0 8px ${color}`;
			}
			if (text) {
				text.textContent = mensaje;
				text.style.color = color;
			}
			
			// Actualizar botón de guardar en sidebar
			const btnGuardar = document.querySelector('#nav-guardar span');
			if (btnGuardar) {
				if (cambiosSinGuardar) {
					btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk" style="color: #ff4655;"></i> Guardar cambios';
				} else {
					btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk" style="color: #d4af37;"></i> Guardado local';
				}
			}
			
			actualizarVisibilidadBotonSincronizar();
		}

		function mostrarEstadoSincronizando() {
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			
			if (dotTop) {
				dotTop.style.background = '#00f2ff';
				dotTop.style.boxShadow = '0 0 12px #00f2ff';
			}
			if (textTop) {
				textTop.textContent = "Sincronizando...";
				textTop.style.color = '#00f2ff';
			}
		}

		function mostrarEstadoSincronizado() {
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			
			if (dot) {
				dot.classList.remove('unsaved');
				dot.style.background = '#00ff88';
				dot.style.boxShadow = '0 0 5px #00ff88';
				text.textContent = "Sincronizado";
				text.style.color = 'var(--text-dim)';
			}
			if (dotTop) {
				dotTop.classList.remove('unsaved');
				dotTop.style.background = 'var(--success)';
				dotTop.style.boxShadow = '0 0 8px var(--success)';
				textTop.textContent = "Sincronizado";
				textTop.style.color = 'var(--text-dim)';
				textTop.style.fontWeight = 'normal';
			}
			
			// Restaurar botón de guardar
			const btnGuardar = document.querySelector('#nav-guardar span');
			if (btnGuardar) {
				btnGuardar.innerHTML = 'Guardar';
			}
			
			hayPendientesSinSincronizar = false;
			cambiosSinGuardar = false;
			
			actualizarVisibilidadBotonSincronizar();
		}
		
		async function sincronizarPendientes() {
			if (sincronizacionEnProgreso) return;
			if (!estaOnline()) {
				Toast.warning("Sin conexión a Internet. Intenta más tarde.");
				return;
			}
			
			const pendienteJSON = localStorage.getItem(`elite_pending_sync_${currentUser}`);
			if (!pendienteJSON) {
				hayPendientesSinSincronizar = false;
				cambiosSinGuardar = false;
				return;
			}
			
			sincronizacionEnProgreso = true;
			mostrarEstadoSincronizando();
			
			try {
				const data = JSON.parse(pendienteJSON);
				const id = data._metadata?.fileId || `${data.mes}_${data.contrato}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
				
				data._metadata.fechaSincronizacion = new Date().toISOString();
				data._metadata.sincronizado = true;
				
				await db.ref(`files/${currentUser}/${id}`).set(data);
				
				currentFileId = id;
				localStorage.setItem(`elite_current_file_${currentUser}`, id);
				localStorage.removeItem(`elite_pending_sync_${currentUser}`);
				
				hayPendientesSinSincronizar = false;
				// Mantener cambiosSinGuardar según si hay modificaciones nuevas
				
				mostrarEstadoSincronizado();
				
				Toast.success(`${data.mes} - ${data.contrato}`, { title: '✓ Sincronizado' });
				
				if (document.getElementById('drawer-archivo').classList.contains('open')) {
					listarCloud();
				}
				
			} catch (error) {
				console.error("Error en sincronización:", error);
				Toast.error('Error al sincronizar: ' + error.message);
				
				hayPendientesSinSincronizar = true;
				mostrarEstadoGuardadoLocal(ultimoGuardadoConfirmado?.mes, ultimoGuardadoConfirmado?.contrato);
				
			} finally {
				sincronizacionEnProgreso = false;
				actualizarVisibilidadBotonSincronizar();
			}
		}
		
		function actualizarVisibilidadBotonSincronizar() {
			const btnSync = document.getElementById('nav-sincronizar');
			if (btnSync) {
				btnSync.style.display = hayPendientesSinSincronizar ? 'flex' : 'none';
			}
		}

        async function cargarArchivo(key) {
			const snap = await db.ref(`files/${currentUser}/${key}`).once('value');
			const data = snap.val();

			if (!data) {
				Toast.error("No se encontraron datos para este archivo");
				return;
			}

			currentFileId = key;
			localStorage.setItem(`elite_current_file_${currentUser}`, key);

			// Si venimos de la pantalla en blanco, ocultarla ahora
			if (typeof _desdePantallaBlanca !== 'undefined') _desdePantallaBlanca = false;
			if (typeof ocultarPantallaInicio === 'function') ocultarPantallaInicio();
			
			if (data.proveedores) proveedores = data.proveedores;
			if (data.productosBase) productosBase = data.productosBase;
			if (data.valorCupo) valorCupoBase = data.valorCupo;
			
			document.getElementById('main-mes').value = data.mes || "Enero";
			document.getElementById('main-contrato').value = data.contrato || "";
			document.getElementById('num-semanas').value = data.numSemanas || 4;
			
			initGrid(false);
			
			const semanas = data.numSemanas || 4;
			for (let s = 1; s <= semanas; s++) {
				if (!data.semanas || !data.semanas[s]) continue;
				
				const semData = data.semanas[s];
				
				if (document.getElementById(`dias-${s}`)) 
					document.getElementById(`dias-${s}`).value = semData.d || "";
				if (document.getElementById(`cupos-${s}`)) 
					document.getElementById(`cupos-${s}`).value = semData.c || "";

				if (semData.items) {
					Object.entries(semData.items).forEach(([nombreProducto, item]) => {
						const idxProducto = productosBase.findIndex(p => 
							p.nombre.trim().toLowerCase() === nombreProducto.trim().toLowerCase()
						);
						
						if (idxProducto !== -1) {
							if (document.getElementById(`fac-${s}-${idxProducto}`)) 
								document.getElementById(`fac-${s}-${idxProducto}`).value = item.f || "";
							if (document.getElementById(`cant-${s}-${idxProducto}`)) 
								document.getElementById(`cant-${s}-${idxProducto}`).value = item.q || "";
							if (document.getElementById(`punit-${s}-${idxProducto}`)) 
								document.getElementById(`punit-${s}-${idxProducto}`).value = item.p || productosBase[idxProducto].precio;
							
							const cant = parseFloat(item.q) || 0;
							const precio = parseFloat(item.p) || productosBase[idxProducto].precio;
							const total = cant * precio;
							
							if (document.getElementById(`val-${s}-${idxProducto}`) && total > 0) 
								document.getElementById(`val-${s}-${idxProducto}`).value = formatter.format(total);
						}
					});
				}
				
				calcular(s);
			}
			
			actualizarResumen();
			marcarSincronizado();
			closeAllDrawers();
			
			const nombreArchivo = data.displayName || `${data.mes} - ${data.contrato}`;
			Toast.info(`Ahora editando: ${nombreArchivo}`, { title: 'Archivo cargado' });
		}

        async function borrarArchivo(key) {
			if (!await zanConfirm({ title: "Eliminar registro", msg: "¿Eliminar este archivo permanentemente? No se puede recuperar.", tipo: "danger", okLabel: "Eliminar" })) return;
			
			await db.ref(`files/${currentUser}/${key}`).remove();
			
			if (key === currentFileId) {
				currentFileId = null;
				localStorage.removeItem(`elite_current_file_${currentUser}`);
			}
			
			listarCloud();
		}

