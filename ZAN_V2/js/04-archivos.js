        // ===== SISTEMA DE ARCHIVOS MEJORADO CON CARPETAS =====
        let currentPath = 'root';
        let vistaArchivosActual = 'list'; // 'list' o 'grid'
        let archivosCache = [];
        let carpetasCache = {};
        let ordenActual = 'fecha-desc';
        let busquedaActual = '';

        async function listarCloud() {
            mostrarLoadingArchivos(true);
            
            try {
                const snap = await db.ref(`files/${currentUser}`).once('value');
                const archivos = [];
                
                if (!snap.exists()) {
                    mostrarEmptyStateArchivos(true);
                    return;
                }

                snap.forEach(child => {
                    const data = child.val();
                    archivos.push({
                        key: child.key,
                        ...data,
                        fechaObj: new Date(data._metadata?.fechaGuardado || data.fechaGuardado || Date.now()),
                        montoTotal: calcularMontoTotalArchivo(data)
                    });
                });

                archivosCache = archivos;
                organizarEnCarpetas(archivos);
                
                if (currentPath === 'root') {
                    renderizarVistaCarpetas();
                } else {
                    renderizarVistaArchivos(currentPath);
                }
                
            } catch (error) {
                console.error("Error cargando archivos:", error);
                mostrarErrorArchivos("Error al cargar los archivos");
            } finally {
                mostrarLoadingArchivos(false);
            }
        }

        function organizarEnCarpetas(archivos) {
            carpetasCache = {};
            
            archivos.forEach(archivo => {
                // Organizar por mes (ej: "Abril 2026")
                const mes = archivo.mes || 'Sin mes';
                const anio = archivo.fechaObj.getFullYear();
                const nombreCarpeta = `${mes} ${anio}`;
                
                if (!carpetasCache[nombreCarpeta]) {
                    carpetasCache[nombreCarpeta] = {
                        nombre: nombreCarpeta,
                        archivos: [],
                        fechaUltima: archivo.fechaObj,
                        montoTotal: 0,
                        mes: archivo.mes,
                        anio: anio
                    };
                }
                
                carpetasCache[nombreCarpeta].archivos.push(archivo);
                carpetasCache[nombreCarpeta].montoTotal += archivo.montoTotal || 0;
                
                if (archivo.fechaObj > carpetasCache[nombreCarpeta].fechaUltima) {
                    carpetasCache[nombreCarpeta].fechaUltima = archivo.fechaObj;
                }
            });
        }

        function renderizarVistaCarpetas() {
			const contenedor = document.getElementById('vista-carpetas');
			const vistaArchivos = document.getElementById('vista-archivos');
			
			contenedor.style.display = 'grid';
			vistaArchivos.style.display = 'none';
			
			actualizarBreadcrumbs('root');
			
			// Aplicar búsqueda si hay
			let carpetas = Object.values(carpetasCache);
			if (busquedaActual) {
				const termino = busquedaActual.toLowerCase();
				carpetas = carpetas.filter(c => 
					c.nombre.toLowerCase().includes(termino) ||
					c.archivos.some(a => (a.contrato || '').toLowerCase().includes(termino))
				);
			}
			
			// Aplicar ordenamiento
			carpetas = ordenarCarpetas(carpetas);
			
			if (carpetas.length === 0) {
				mostrarEmptyStateArchivos(true);
				return;
			}
			
			mostrarEmptyStateArchivos(false);
			
			// Limpiar y usar event listeners en lugar de onclick inline
			contenedor.innerHTML = '';
			
			carpetas.forEach(carpeta => {
				const esActual = currentFileId && carpeta.archivos.some(a => a.key === currentFileId);
				const count = carpeta.archivos.length;
				const fechaStr = carpeta.fechaUltima.toLocaleDateString('es-CO', {day: 'numeric', month: 'short'});
				
				const card = document.createElement('div');
				card.className = `folder-card ${esActual ? 'active' : ''}`;
				
				card.innerHTML = `
					${count > 0 ? `<span class="folder-count">${count}</span>` : ''}
					<div class="folder-icon">
						<i class="fa-solid fa-folder${esActual ? '-open' : ''}"></i>
					</div>
					<div class="folder-name">${carpeta.mes || 'Sin mes'}</div>
					<div class="folder-meta">
						${carpeta.anio} • ${fechaStr}<br>
						<span style="color: var(--primary-gold);">${formatter.format(carpeta.montoTotal)}</span>
					</div>
				`;
				
				// Usar addEventListener en lugar de onclick inline para evitar problemas con espacios
				card.addEventListener('click', function() {
					navegarA('carpeta', carpeta.nombre);
				});
				
				contenedor.appendChild(card);
			});
		}

        function renderizarVistaArchivos(nombreCarpeta) {
            const contenedorCarpetas = document.getElementById('vista-carpetas');
            const contenedorArchivos = document.getElementById('vista-archivos');
            
            contenedorCarpetas.style.display = 'none';
            contenedorArchivos.style.display = 'block';
            
            actualizarBreadcrumbs('carpeta', nombreCarpeta);
            
            const carpeta = carpetasCache[nombreCarpeta];
            if (!carpeta) {
                navegarA('root');
                return;
            }
            
            // Aplicar búsqueda y ordenamiento
            let archivos = [...carpeta.archivos];
            if (busquedaActual) {
                const termino = busquedaActual.toLowerCase();
                archivos = archivos.filter(a => 
                    (a.contrato || '').toLowerCase().includes(termino) ||
                    (a.mes || '').toLowerCase().includes(termino)
                );
            }
            archivos = ordenarArchivos(archivos);
            
            // Renderizar info del header
            const totalArchivos = archivos.length;
            const montoTotal = archivos.reduce((sum, a) => sum + (a.montoTotal || 0), 0);
            const archivosActivos = archivos.filter(a => a.key === currentFileId).length;
            
            document.getElementById('folder-info').innerHTML = `
                <div>
                    <h4 style="margin: 0 0 5px 0; color: var(--primary-gold); font-size: 14px;">${nombreCarpeta}</h4>
                    <div style="font-size: 9px; color: var(--text-dim);">
                        ${carpeta.archivos.length} archivo${carpeta.archivos.length !== 1 ? 's' : ''} en total • 
                        Mostrando ${totalArchivos}
                    </div>
                </div>
                <div class="folder-stats">
                    <div class="stat-item">
                        <span class="stat-value">${formatter.format(montoTotal)}</span>
                        <span class="stat-label">Monto Total</span>
                    </div>
                    ${archivosActivos > 0 ? `
                    <div class="stat-item" style="color: var(--accent-cyan);">
                        <span class="stat-value"><i class="fa-solid fa-check-circle"></i></span>
                        <span class="stat-label">Abierto</span>
                    </div>
                    ` : ''}
                </div>
            `;
            
            // Renderizar lista o grid
            const listaContenedor = document.getElementById('lista-archivos-detalle');
            
            if (vistaArchivosActual === 'grid') {
                listaContenedor.className = 'files-grid-view';
                listaContenedor.innerHTML = archivos.map(archivo => renderizarCardArchivo(archivo)).join('');
            } else {
                listaContenedor.className = 'files-list';
                listaContenedor.innerHTML = archivos.map(archivo => renderizarItemArchivo(archivo)).join('');
            }
        }

        function renderizarItemArchivo(archivo) {
            const esActual = archivo.key === currentFileId;
            const fechaStr = archivo.fechaObj.toLocaleDateString('es-CO');
            const horaStr = archivo.fechaObj.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});

            // Determinar función de carga según modo
            const clickFn = (typeof _modoBoceto !== 'undefined' && _modoBoceto) ? 'cargarBoceto' : 'cargarArchivo';

            return `
                <div class="file-item ${esActual ? 'active-file' : ''}" onclick="${clickFn}('${archivo.key}')">
                    <div class="file-icon">
                        <i class="fa-solid fa-file-invoice-dollar"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${archivo.contrato || 'Sin contrato'}</div>
                        <div class="file-details">
                            <span class="file-detail-item"><i class="fa-regular fa-calendar"></i> ${fechaStr}</span>
                            <span class="file-detail-item"><i class="fa-regular fa-clock"></i> ${horaStr}</span>
                            <span class="file-detail-item"><i class="fa-solid fa-tag"></i> ${archivo.mes || 'N/A'}</span>
                            <span class="file-detail-item" style="color: var(--primary-gold); font-weight: 600;">
                                <i class="fa-solid fa-sack-dollar"></i> ${formatter.format(archivo.montoTotal || 0)}
                            </span>
                            ${archivo.numSemanas ? `<span class="file-detail-item"><i class="fa-solid fa-calendar-week"></i> ${archivo.numSemanas} semanas</span>` : ''}
                        </div>
                    </div>
                    <div class="file-actions" onclick="event.stopPropagation()">
                        <button class="file-btn" onclick="${clickFn}('${archivo.key}')" title="Abrir">
                            <i class="fa-solid fa-folder-open"></i>
                        </button>
                        <button class="file-btn delete" onclick="borrarArchivo('${archivo.key}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        function renderizarCardArchivo(archivo) {
            const esActual = archivo.key === currentFileId;
            const fechaStr = archivo.fechaObj.toLocaleDateString('es-CO');

            // Determinar función de carga según modo
            const clickFn = (typeof _modoBoceto !== 'undefined' && _modoBoceto) ? 'cargarBoceto' : 'cargarArchivo';

            return `
                <div class="file-card ${esActual ? 'active-file' : ''}" onclick="${clickFn}('${archivo.key}')">
                    <div class="file-card-actions" onclick="event.stopPropagation()">
                        <button class="file-btn" onclick="${clickFn}('${archivo.key}')" title="Abrir">
                            <i class="fa-solid fa-folder-open"></i>
                        </button>
                        <button class="file-btn delete" onclick="borrarArchivo('${archivo.key}')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <div class="file-card-icon">
                        <i class="fa-solid fa-file-invoice-dollar"></i>
                    </div>
                    <div class="file-card-name">${archivo.contrato || 'Sin contrato'}</div>
                    <div class="file-card-date">${fechaStr} • ${formatter.format(archivo.montoTotal || 0)}</div>
                </div>
            `;
        }

        function navegarA(destino, parametro = null) {
            // Limpiar búsqueda al navegar
            busquedaActual = '';
            document.getElementById('buscar-archivos').value = '';
            
            if (destino === 'root') {
                currentPath = 'root';
                renderizarVistaCarpetas();
            } else if (destino === 'carpeta') {
                currentPath = parametro;
                renderizarVistaArchivos(parametro);
            }
        }

        function actualizarBreadcrumbs(nivel, parametro = null) {
			const contenedor = document.getElementById('breadcrumbs');
			contenedor.innerHTML = '';
			
			if (nivel === 'root') {
				const span = document.createElement('span');
				span.className = 'breadcrumb-item active';
				span.innerHTML = '<i class="fa-solid fa-house"></i> Inicio';
				span.addEventListener('click', () => navegarA('root'));
				contenedor.appendChild(span);
			} else if (nivel === 'carpeta') {
				const homeSpan = document.createElement('span');
				homeSpan.className = 'breadcrumb-item';
				homeSpan.innerHTML = '<i class="fa-solid fa-house"></i> Inicio';
				homeSpan.addEventListener('click', () => navegarA('root'));
				contenedor.appendChild(homeSpan);
				
				const separator = document.createElement('span');
				separator.className = 'breadcrumb-separator';
				separator.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
				contenedor.appendChild(separator);
				
				const folderSpan = document.createElement('span');
				folderSpan.className = 'breadcrumb-item active';
				folderSpan.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${parametro}`;
				contenedor.appendChild(folderSpan);
			}
		}

        function ordenarCarpetas(carpetas) {
            switch(ordenActual) {
                case 'fecha-desc':
                    return carpetas.sort((a, b) => b.fechaUltima - a.fechaUltima);
                case 'fecha-asc':
                    return carpetas.sort((a, b) => a.fechaUltima - b.fechaUltima);
                case 'nombre-asc':
                    return carpetas.sort((a, b) => a.nombre.localeCompare(b.nombre));
                case 'nombre-desc':
                    return carpetas.sort((a, b) => b.nombre.localeCompare(a.nombre));
                case 'monto-desc':
                    return carpetas.sort((a, b) => b.montoTotal - a.montoTotal);
                default:
                    return carpetas;
            }
        }

        function ordenarArchivos(archivos) {
            switch(ordenActual) {
                case 'fecha-desc':
                    return archivos.sort((a, b) => b.fechaObj - a.fechaObj);
                case 'fecha-asc':
                    return archivos.sort((a, b) => a.fechaObj - b.fechaObj);
                case 'nombre-asc':
                    return archivos.sort((a, b) => (a.contrato || '').localeCompare(b.contrato || ''));
                case 'nombre-desc':
                    return archivos.sort((a, b) => (b.contrato || '').localeCompare(a.contrato || ''));
                case 'monto-desc':
                    return archivos.sort((a, b) => (b.montoTotal || 0) - (a.montoTotal || 0));
                default:
                    return archivos;
            }
        }

        function aplicarFiltroOrden() {
            ordenActual = document.getElementById('filtro-orden').value;
            
            if (currentPath === 'root') {
                renderizarVistaCarpetas();
            } else {
                renderizarVistaArchivos(currentPath);
            }
        }

        function filtrarArchivos(termino) {
            busquedaActual = termino;
            
            if (currentPath === 'root') {
                renderizarVistaCarpetas();
            } else {
                renderizarVistaArchivos(currentPath);
            }
        }

        function toggleVistaArchivos() {
            vistaArchivosActual = vistaArchivosActual === 'list' ? 'grid' : 'list';
            document.getElementById('btn-vista-icon').className = vistaArchivosActual === 'list' ? 'fa-solid fa-list' : 'fa-solid fa-grid-2';
            
            if (currentPath !== 'root') {
                renderizarVistaArchivos(currentPath);
            }
        }

        function calcularMontoTotalArchivo(data) {
            let total = 0;
            if (data.semanas) {
                Object.values(data.semanas).forEach(semana => {
                    if (semana.items) {
                        Object.values(semana.items).forEach(item => {
                            const cant = parseFloat(item.q) || 0;
                            const precio = parseFloat(item.p) || 0;
                            total += cant * precio;
                        });
                    }
                });
            }
            return total;
        }

        function mostrarLoadingArchivos(mostrar) {
            document.getElementById('loading-files').style.display = mostrar ? 'block' : 'none';
            document.getElementById('vista-carpetas').style.display = mostrar ? 'none' : 'grid';
            document.getElementById('vista-archivos').style.display = 'none';
            document.getElementById('empty-state').style.display = 'none';
        }

        function mostrarEmptyStateArchivos(mostrar) {
            document.getElementById('empty-state').style.display = mostrar ? 'block' : 'none';
            document.getElementById('vista-carpetas').style.display = mostrar ? 'none' : 'grid';
            document.getElementById('vista-archivos').style.display = 'none';
            document.getElementById('loading-files').style.display = 'none';
        }

        function mostrarErrorArchivos(mensaje) {
            document.getElementById('vista-carpetas').innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <p>${mensaje}</p>
                </div>
            `;
            document.getElementById('vista-carpetas').style.display = 'grid';
            document.getElementById('vista-archivos').style.display = 'none';
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('loading-files').style.display = 'none';
        }

