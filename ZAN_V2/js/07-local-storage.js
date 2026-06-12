        // ===== LOCAL STORAGE =====
		function guardarLocal() {
		
		const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
		const data = {
			mes: document.getElementById('main-mes').value,
			contrato: document.getElementById('main-contrato').value,
			numSemanas: semanas,
			valorCupo: valorCupoBase,
			productosBase,
			proveedores,
			currentFileId: currentFileId,
			_metadata: {
				fechaGuardadoDraft: new Date().toISOString(),
				version: '2.0'
			},
			semanas: {}
		};

		for (let s = 1; s <= semanas; s++) {
			data.semanas[s] = {
				d: document.getElementById(`dias-${s}`)?.value || "",
				c: document.getElementById(`cupos-${s}`)?.value || "",
				items: {}
			};
			productosBase.forEach((p, i) => {
				data.semanas[s].items[p.nombre] = {
					f: document.getElementById(`fac-${s}-${i}`)?.value || "",
					q: document.getElementById(`cant-${s}-${i}`)?.value || "",
					p: document.getElementById(`punit-${s}-${i}`)?.value || p.precio
				};
			});
		}

		localStorage.setItem(`elite_draft_${currentUser}`, JSON.stringify(data));
		
		if (currentFileId) {
			localStorage.setItem(`elite_current_file_${currentUser}`, currentFileId);
		}
	}

		function cargarLocal() {
			const saved = localStorage.getItem(`elite_draft_${currentUser}`);
			
			const savedFileId = localStorage.getItem(`elite_current_file_${currentUser}`);
			if (savedFileId) {
				currentFileId = savedFileId;
			}
			
			if (saved) {
				const data = JSON.parse(saved);
				
				if (data.currentFileId) {
					currentFileId = data.currentFileId;
				}
				
				// Al cargar desde local, considerar esto como el último estado conocido
				// pero NO como guardado confirmado (el usuario debe presionar Guardar)
				ultimoGuardadoConfirmado = null; // Forzar al usuario a guardar explícitamente
				cambiosSinGuardar = true;
				
				restaurar(data);
			} else {
				initGrid();
			}
		}

        function restaurar(data) {
			if (data.proveedores) proveedores = data.proveedores;
			if (data.productosBase) productosBase = data.productosBase;
			if (data.valorCupo) valorCupoBase = data.valorCupo;

			document.getElementById('main-mes').value = data.mes || "Enero";
			document.getElementById('main-contrato').value = data.contrato || "";
			document.getElementById('num-semanas').value = data.numSemanas || 4;

			initGrid();

			for (let s = 1; s <= (data.numSemanas || 4); s++) {
				if (!data.semanas || !data.semanas[s]) continue;
				
				if (document.getElementById(`dias-${s}`)) 
					document.getElementById(`dias-${s}`).value = data.semanas[s].d || "";
				if (document.getElementById(`cupos-${s}`)) 
					document.getElementById(`cupos-${s}`).value = data.semanas[s].c || "";

				if (data.semanas[s].items) {
					productosBase.forEach((pb, i) => {
						const item = data.semanas[s].items[pb.nombre];
						if (item) {
							if (document.getElementById(`fac-${s}-${i}`)) 
								document.getElementById(`fac-${s}-${i}`).value = item.f || "";
							if (document.getElementById(`cant-${s}-${i}`)) 
								document.getElementById(`cant-${s}-${i}`).value = item.q || "";
							if (document.getElementById(`punit-${s}-${i}`)) 
								document.getElementById(`punit-${s}-${i}`).value = item.p || pb.precio;
						}
					});
				}
				calcular(s);
			}
			
			// Después de restaurar, verificar si hay pendientes de sincronización
			verificarPendientesAlIniciar();
			
			// Si no hay pendientes, mostrar cambios pendientes normales
			if (!hayPendientesSinSincronizar) {
				marcarCambio();
			}
		}
        
        let currentFileId = null;

