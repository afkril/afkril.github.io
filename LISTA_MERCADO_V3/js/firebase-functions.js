// ==================== FIREBASE FUNCIONES ====================
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

			// ── Carga inicial con get() (una sola lectura, no listener continuo) ──
			const dbRef = window.firebaseRef(window.firebaseDB, 'regionales');
			window.firebaseGet(dbRef).then((snapshot) => {
				if (snapshot.exists()) {
					_applyRegionalesSnapshot(snapshot.val());
					updateFirebaseStatus(true);
				} else {
					guardarOriginalesFirebase();
				}
			}).catch((error) => {
				console.error('Error Firebase init:', error);
				updateFirebaseStatus(false);
			});
		}

		// Aplica datos de Firebase a la estructura local
		function _applyRegionalesSnapshot(data) {
			if (data.neiva?.modalidades) {
				Object.keys(data.neiva.modalidades).forEach(mod => {
					if (data.neiva.modalidades[mod].db) {
						regionales.neiva.modalidades[mod].db = data.neiva.modalidades[mod].db;
					}
				});
			}
			if (data.gaitana?.modalidades) {
				Object.keys(data.gaitana.modalidades).forEach(mod => {
					if (data.gaitana.modalidades[mod].db) {
						regionales.gaitana.modalidades[mod].db = data.gaitana.modalidades[mod].db;
					}
				});
			}
		}

		// Listener en tiempo real – sólo se activa cuando el editor está abierto
		let _editorOnValueUnsub = null;
		function _attachEditorRealtime() {
			if (_editorOnValueUnsub || !window.firebaseDB) return;
			const dbRef = window.firebaseRef(window.firebaseDB, 'regionales');
			_editorOnValueUnsub = window.firebaseOnValue(dbRef, (snapshot) => {
				if (snapshot.exists()) {
					_applyRegionalesSnapshot(snapshot.val());
					updateFirebaseStatus(true);
					if (currentEditingProduct !== null) loadProductMatrix();
				}
			}, (error) => {
				console.error('Error Firebase realtime:', error);
				updateFirebaseStatus(false);
			});
		}
		function _detachEditorRealtime() {
			if (_editorOnValueUnsub) {
				_editorOnValueUnsub();   // onValue devuelve la función unsubscribe
				_editorOnValueUnsub = null;
			}
		}

        function updateFirebaseStatus(connected) {
            AppState.setFirebaseConnected(connected);
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
				
				Object.keys(baseDatabase.neiva.modalidades).forEach(mod => {
					dataToSave.neiva.modalidades[mod] = {
						db: baseDatabase.neiva.modalidades[mod].db
					};
				});
				
				Object.keys(baseDatabase.gaitana.modalidades).forEach(mod => {
					dataToSave.gaitana.modalidades[mod] = {
						db: baseDatabase.gaitana.modalidades[mod].db
					};
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
				// Guardar en la ruta correcta: regionales/{regional}/modalidades/{modalidad}/db
				const updatePath = `regionales/${currentRegional}/modalidades/${currentModalidad}/db`;
				
				await window.firebaseSet(
					window.firebaseRef(window.firebaseDB, updatePath), 
					getCurrentDB()
				);

				// Guardar timestamp de modificación
				await window.firebaseSet(
					window.firebaseRef(window.firebaseDB, `modificaciones/${currentRegional}/${currentModalidad}`), 
					{
						timestamp: Date.now(),
						usuario: 'admin',
						camposModificados: modifiedFields.size,
						regional: currentRegional,
						modalidad: currentModalidad
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
						 regionales[currentRegional].modalidades[currentModalidad].titulo + 
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
					
					// Verificar que existen los datos para esta regional y modalidad
					if (!originales[currentRegional]?.modalidades?.[currentModalidad]?.db) {
						showToast('No se encontraron valores originales para esta modalidad', 'error');
						return;
					}
					
					const dbOriginales = originales[currentRegional].modalidades[currentModalidad].db;
					
					// Restaurar solo la modalidad actual
					regionales[currentRegional].modalidades[currentModalidad].db = JSON.parse(JSON.stringify(dbOriginales));
					
					// Actualizar Firebase
					await window.firebaseSet(
						window.firebaseRef(window.firebaseDB, `regionales/${currentRegional}/modalidades/${currentModalidad}/db`),
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
							 regionales[currentRegional].modalidades[currentModalidad].titulo, 'success');
				} else {
					showToast('No se encontraron valores originales en Firebase', 'error');
				}
			} catch (error) {
				console.error('Error restaurando:', error);
				showToast('Error al restaurar: ' + error.message, 'error');
			}
		}

