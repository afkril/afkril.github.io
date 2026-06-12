        // ===== UTILIDADES =====
        function limpiarNum(t) {
            if (t === null || t === undefined) return 0;
            if (typeof t === 'number') return t;
            let limpio = String(t)
                .replace(/\$/g, "")
                .replace(/\./g, "")
                .replace(/,/g, ".")
                .replace(/[^0-9.-]+/g, "");
            return parseFloat(limpio) || 0;
        }

        function generarSigla(nombre) {
            if (!nombre) return 'XXX';
            const palabrasIgnorar = ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'un', 'una', 'al'];
            const palabras = nombre.toUpperCase()
                .replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, '')
                .split(/\s+/)
                .filter(p => p.length > 0 && !palabrasIgnorar.includes(p.toLowerCase()));
            
            if (palabras.length === 0) return 'XXX';
            if (palabras.length === 1) return palabras[0].substring(0, 3);
            
            let sigla = '';
            for (let i = 0; i < Math.min(3, palabras.length); i++) {
                sigla += palabras[i][0];
            }
            return sigla;
        }

        function getProveedoresOrdenados() {
            return [...proveedores].sort((a, b) => a.orden - b.orden);
        }

        function getProveedorById(id) {
            return proveedores.find(p => p.id === id);
        }

        function getProductosByProveedor(provId) {
            return productosBase.filter(p => p.proveedor === provId);
        }

        function detectarUnidad(nombreProducto) {
            const nombre = nombreProducto.toLowerCase();
            if (nombre.includes('kilo')) return 'kg';
            if (nombre.includes('libra')) return 'lb';
            if (nombre.includes('litro')) return 'lt';
            return 'und';
        }

        function marcarCambio() {
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			
			// Siempre guardar en draft local automáticamente (para no perder datos)
			guardarLocal();
			
			// Verificar si hay diferencias respecto al último guardado confirmado
			const tieneCambiosNuevos = detectarCambiosRespectoUltimoGuardado();
			
			if (!tieneCambiosNuevos) {
				// No hay cambios nuevos, mantener estado actual
				return;
			}
			
			cambiosSinGuardar = true;
			
			if (hayPendientesSinSincronizar) {
				// Ya hay guardado local previo SIN subir a Firebase + nuevas modificaciones
				if (dot) {
					dot.classList.add('unsaved');
					dot.style.background = '#ff4655';
					dot.style.boxShadow = '0 0 8px #ff4655';
					text.textContent = "Cambios pendientes por guardar en local";
					text.style.color = '#ff4655';
				}
				if (dotTop) {
					dotTop.classList.add('unsaved');
					dotTop.style.background = '#ff4655';
					dotTop.style.boxShadow = '0 0 12px #ff4655';
					textTop.textContent = "Cambios pendientes por guardar en local";
					textTop.style.color = '#ff4655';
					textTop.style.fontWeight = 'bold';
				}
			} else {
				// Hay internet pero aún no se ha presionado Guardar
				if (dot) {
					dot.classList.add('unsaved');
					text.textContent = "Cambios pendientes";
				}
				if (dotTop) {
					dotTop.classList.add('unsaved');
					dotTop.style.background = 'var(--danger)';
					dotTop.style.boxShadow = '0 0 8px var(--danger)';
					textTop.textContent = "Cambios pendientes";
					textTop.style.color = 'var(--danger)';
				}
			}
		}
		
		function detectarCambiosRespectoUltimoGuardado() {
			// Si no hay último guardado confirmado, cualquier dato es un cambio
			if (!ultimoGuardadoConfirmado) {
				// Verificar si hay datos en el formulario (no está vacío)
				const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
				for (let s = 1; s <= semanas; s++) {
					if (document.getElementById(`dias-${s}`)?.value) return true;
					if (document.getElementById(`cupos-${s}`)?.value) return true;
					for (let i = 0; i < productosBase.length; i++) {
						if (document.getElementById(`cant-${s}-${i}`)?.value) return true;
						if (document.getElementById(`fac-${s}-${i}`)?.value) return true;
					}
				}
				return false;
			}
			
			// Comparar datos actuales vs último guardado confirmado
			const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
			const guardado = ultimoGuardadoConfirmado;
			
			// Comparar metadata básica
			if (document.getElementById('main-mes')?.value !== guardado.mes) return true;
			if (document.getElementById('main-contrato')?.value !== guardado.contrato) return true;
			if (semanas !== (guardado.numSemanas || 4)) return true;
			if (valorCupoBase !== (guardado.valorCupo || 8094)) return true;
			
			// Comparar datos por semana
			for (let s = 1; s <= semanas; s++) {
				const diasActual = document.getElementById(`dias-${s}`)?.value || "";
				const cuposActual = document.getElementById(`cupos-${s}`)?.value || "";
				const diasGuardado = guardado.semanas?.[s]?.d || "";
				const cuposGuardado = guardado.semanas?.[s]?.c || "";
				
				if (diasActual !== diasGuardado) return true;
				if (cuposActual !== cuposGuardado) return true;
				
				for (let i = 0; i < productosBase.length; i++) {
					const cantActual = document.getElementById(`cant-${s}-${i}`)?.value || "";
					const facActual = document.getElementById(`fac-${s}-${i}`)?.value || "";
					const punitActual = document.getElementById(`punit-${s}-${i}`)?.value || "";
					
					const itemGuardado = guardado.semanas?.[s]?.items?.[productosBase[i].nombre];
					const cantGuardado = itemGuardado?.q || "";
					const facGuardado = itemGuardado?.f || "";
					const punitGuardado = itemGuardado?.p || "";
					
					if (cantActual !== String(cantGuardado)) return true;
					if (facActual !== String(facGuardado)) return true;
					if (punitActual !== String(punitGuardado)) return true;
				}
			}
			
			return false;
		}

		function marcarSincronizado() {
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			
			if (dot) {
				dot.classList.remove('unsaved');
				text.textContent = "Sincronizado";
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
		}

