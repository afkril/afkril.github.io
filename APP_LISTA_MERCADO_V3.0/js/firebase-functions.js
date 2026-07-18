        // ==================== FIREBASE ====================
        function initFirebase() {
            // Esperar a que Firebase esté disponible
            const checkFirebase = setInterval(() => {
                if (window.firebaseDB) {
                    clearInterval(checkFirebase);
                    setupFirebaseListeners();
                }
            }, 100);
        }

        function setupFirebaseListeners() {
			if (!window.firebaseDB) return;
			
			const dbRef = window.firebaseRef(window.firebaseDB, 'regionales');

			// Escucha en tiempo real la lista compartida de operadores eliminados.
			// Así, si un usuario elimina un operador, cualquier otro usuario/caché
			// que tenga la app abierta (o la abra después) deja de verlo, incluso
			// si ese operador viene "de fábrica" en database.js.
			const eliminadosRef = window.firebaseRef(window.firebaseDB, 'operadoresEliminados');
			window.firebaseOnValue(eliminadosRef, (snapshot) => {
				operadoresEliminadosRemotos = snapshot.exists() ? snapshot.val() : {};
				aplicarOperadoresEliminados();
				reconstruirOperadoresConfig();
				actualizarSelectorOperador();
				actualizarIndicadorEstado();
			});
			
			window.firebaseOnValue(dbRef, (snapshot) => {
				if (snapshot.exists()) {
					const data = snapshot.val();
					
					// Actualizar datos para cada regional y modalidad (incluye operadores)
					['neiva', 'gaitana'].forEach(reg => {
						if (!data[reg]?.modalidades) return;
						Object.keys(data[reg].modalidades).forEach(mod => {
							const remoteMod = data[reg].modalidades[mod];
							if (!regionales[reg]?.modalidades?.[mod]) return;

							if (remoteMod.db) {
								regionales[reg].modalidades[mod].db = remoteMod.db;
							}

							if (remoteMod.operadores) {
								// Fusionar (no pisar operadores locales creados aún no confirmados por Firebase)
								regionales[reg].modalidades[mod].operadores = {
									...(regionales[reg].modalidades[mod].operadores || {}),
									...remoteMod.operadores
								};
							}
						});
					});

					// Los operadores eliminados localmente no deben reaparecer aunque
					// Firebase todavía tenga un snapshot antiguo en caché.
					aplicarOperadoresEliminados();
					reconstruirOperadoresConfig();
					actualizarSelectorOperador();

					updateFirebaseStatus(true);
					
					// Si el editor está abierto, recargar
					const activeSection = document.querySelector('.section.active')?.id;
					if (activeSection === 'section-editor' && currentEditingProduct !== null) {
						loadProductMatrix();
					}
					if (activeSection === 'section-cargue') {
						actualizarInfoCargueActual();
					}
				} else {
					guardarOriginalesFirebase();
				}
			}, (error) => {
				console.error('Error Firebase:', error);
				updateFirebaseStatus(false);
			});
		}

        function updateFirebaseStatus(connected) {
            firebaseConnected = connected;
            const statusEl = document.getElementById('firebaseStatus');
            const statusText = document.getElementById('firebaseStatusText');
            
            if (connected) {
                statusEl.className = 'firebase-status connected';
                statusText.textContent = 'Conectado';
            } else {
                statusEl.className = 'firebase-status disconnected';
                statusText.textContent = 'Desconectado';
            }
        }

        async function guardarOriginalesFirebase() {
			if (!window.firebaseDB) return;
			
			try {
				// Guardar estructura completa con modalidades
				const dataToSave = {
					neiva: { modalidades: {} },
					gaitana: { modalidades: {} }
				};
				
				['neiva', 'gaitana'].forEach(reg => {
					Object.keys(baseDatabase[reg].modalidades).forEach(mod => {
						const modData = baseDatabase[reg].modalidades[mod];
						dataToSave[reg].modalidades[mod] = { db: modData.db };
						if (modData.operadores) {
							dataToSave[reg].modalidades[mod].operadores = modData.operadores;
						}
					});
				});
				
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, 'originales'), baseDatabase);
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, 'regionales'), dataToSave);
				
				updateFirebaseStatus(true);
			} catch (error) {
				console.error('Error guardando originales:', error);
				updateFirebaseStatus(false);
			}
		}

        async function guardarCambiosFirebase() {
			if (!window.firebaseDB) {
				showToast('Firebase no disponible', 'error');
				return;
			}

			const btn = document.getElementById('btnGuardarFirebase');
			btn.classList.add('loading');

			try {
				// Guardar en la ruta correcta (respeta el operador activo, si aplica)
				const updatePath = getCurrentDBPath();
				
				await window.firebaseSet(
					window.firebaseRef(window.firebaseDB, updatePath), 
					getCurrentDB()
				);

				// Guardar timestamp de modificación
				const modKey = currentOperador ? `${currentModalidad}_${currentOperador}` : currentModalidad;
				await window.firebaseSet(
					window.firebaseRef(window.firebaseDB, `modificaciones/${currentRegional}/${modKey}`), 
					{
						timestamp: Date.now(),
						usuario: 'admin',
						camposModificados: modifiedFields.size,
						regional: currentRegional,
						modalidad: currentModalidad,
						operador: currentOperador || null
					}
				);

				// Limpiar estado de cambios SOLO para esta modalidad/regional
				const keysToRemove = [];
				modifiedFields.forEach(key => {
					if (key.startsWith(`${currentRegional}_${currentModalidad}_`)) {
						keysToRemove.push(key);
					}
				});
				keysToRemove.forEach(key => modifiedFields.delete(key));
				
				updateChangeIndicator();
				
				// Recargar lista si está visible
				if (currentData) {
					generar();
				}
				if (monthlyData) {
					generarMensual();
				}

				showToast('Cambios guardados en Firebase correctamente', 'success');
			} catch (error) {
				console.error('Error guardando:', error);
				showToast('Error al guardar: ' + error.message, 'error');
			} finally {
				btn.classList.remove('loading');
			}
		}

        async function restaurarValoresOriginales() {
			if (!confirm('¿Está seguro de restaurar los valores originales para ' + 
						 regionales[currentRegional].titulo + ' - ' + 
						 getCurrentTitle() + 
						 '? Se perderán todas las modificaciones.')) {
				return;
			}

			if (!window.firebaseDB) {
				showToast('Firebase no disponible', 'error');
				return;
			}

			try {
				const snapshot = await window.firebaseGet(window.firebaseRef(window.firebaseDB, 'originales'));
				if (snapshot.exists()) {
					const originales = snapshot.val();

					// Ruta original: respeta el operador activo, si aplica
					const dbOriginales = currentOperador
						? originales[currentRegional]?.modalidades?.[currentModalidad]?.operadores?.[currentOperador]?.db
						: originales[currentRegional]?.modalidades?.[currentModalidad]?.db;

					if (!dbOriginales) {
						showToast('No se encontraron valores originales para esta selección', 'error');
						return;
					}

					// Restaurar solo la selección actual (modalidad u operador)
					if (currentOperador) {
						regionales[currentRegional].modalidades[currentModalidad].operadores[currentOperador].db = JSON.parse(JSON.stringify(dbOriginales));
					} else {
						regionales[currentRegional].modalidades[currentModalidad].db = JSON.parse(JSON.stringify(dbOriginales));
					}
					
					// Actualizar Firebase
					await window.firebaseSet(
						window.firebaseRef(window.firebaseDB, getCurrentDBPath()),
						dbOriginales
					);

					// Recargar editor si está abierto
					if (currentEditingProduct !== null) {
						loadProductMatrix();
					}

					// Limpiar campos modificados de esta modalidad
					const keysToRemove = [];
					modifiedFields.forEach(key => {
						if (key.startsWith(`${currentRegional}_${currentModalidad}_`)) {
							keysToRemove.push(key);
						}
					});
					keysToRemove.forEach(key => modifiedFields.delete(key));
					updateChangeIndicator();

					// Recargar listas si están visibles
					if (currentData) generar();
					if (monthlyData) generarMensual();

					showToast('Valores originales restaurados para ' + 
							 getCurrentTitle(), 'success');
				} else {
					showToast('No se encontraron valores originales en Firebase', 'error');
				}
			} catch (error) {
				console.error('Error restaurando:', error);
				showToast('Error al restaurar: ' + error.message, 'error');
			}
		}

