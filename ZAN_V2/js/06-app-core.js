        // ===== INICIALIZACIÓN =====
        window.onload = () => {
            const session = localStorage.getItem('elite_user');
            if (session) iniciarApp(session);
        };

        // ===== AUTENTICACIÓN =====
        function handleAuth(type) {
            const uInput = document.getElementById(type === 'login' ? 'user-login' : 'user-reg');
            const pInput = document.getElementById(type === 'login' ? 'pass-login' : 'pass-reg');
            const u = uInput.value.trim().toLowerCase();
            const p = pInput.value;

            if (!u || !p) {
                Toast.warning("Por favor ingrese usuario y contraseña");
                return;
            }

            if (type === 'register') {
                db.ref('users/' + u).once('value', s => {
                    if (s.exists()) {
                        Toast.warning("El usuario ya existe", { title: "Usuario duplicado" });
                    } else {
                        db.ref('users/' + u).set({ password: p });
                        Toast.success("Usuario registrado exitosamente");
                        toggleAuth(false);
                    }
                });
            } else {
                db.ref('users/' + u).once('value', s => {
                    if (s.exists() && s.val().password === p) {
                        localStorage.setItem('elite_user', u);
                        iniciarApp(u);
                    } else {
                        Toast.error("Usuario o contraseña incorrectos");
                    }
                });
            }
        }

        function iniciarApp(u) {
			currentUser = u;
			document.getElementById('sidebar-username').textContent = u.toUpperCase();
			document.getElementById('user-avatar').textContent = u.charAt(0).toUpperCase();
			document.getElementById('auth-screen').style.display = 'none';
			document.getElementById('app-content').style.display = 'block';

			if (window.innerWidth <= 768) {
				document.getElementById('sidebar').classList.add('collapsed');
				sidebarOpen = false;
			}

			// Cargar archivo actual si existe
			const savedFileId = localStorage.getItem(`elite_current_file_${currentUser}`);
			if (savedFileId) {
				currentFileId = savedFileId;
				console.log("Archivo actual recordado:", currentFileId);
			}

			// INICIALIZAR MONITOREO DE CONEXIÓN
			iniciarMonitoreoConexion();

			// VERIFICAR SI HAY PENDIENTES DE SINCRONIZAR
			verificarPendientesAlIniciar();

			inicializarDatos();
			
			// VERIFICAR SI ES PRIMERA VEZ O SI DEBE MOSTRAR TUTORIAL
			const tutorialVisto = localStorage.getItem(`tutorial_visto_${currentUser}`);
			if (tutorialVisto !== 'true') {
				setTimeout(() => {
					zanConfirm({ title: 'Tutorial de bienvenida', msg: 'Puedes volver a verlo desde el botón ? en cualquier momento.', tipo: 'info', okLabel: 'Ver tutorial', cancelLabel: 'Ahora no' }).then(ok => {
						if (ok) { startTutorial('completo'); } else { marcarTutorialVisto(); }
					});
				}, 1000);
			}
		}

		function verificarPendientesAlIniciar() {
			const pendienteJSON = localStorage.getItem(`elite_pending_sync_${currentUser}`);
			const draftJSON = localStorage.getItem(`elite_draft_${currentUser}`);
			
			if (pendienteJSON) {
				try {
					const data = JSON.parse(pendienteJSON);
					ultimoGuardadoConfirmado = JSON.parse(JSON.stringify(data)); // El pending es el último confirmado
					hayPendientesSinSincronizar = true;
					cambiosSinGuardar = false;
					
					// Verificar si el draft actual tiene cambios adicionales
					if (draftJSON) {
						const draft = JSON.parse(draftJSON);
						// Comparar draft vs pending para ver si hay cambios nuevos
						const draftStr = JSON.stringify(draft.semanas) + draft.mes + draft.contrato;
						const pendingStr = JSON.stringify(data.semanas) + data.mes + data.contrato;
						
						if (draftStr !== pendingStr) {
							// El draft tiene cambios diferentes al pending
							cambiosSinGuardar = true;
						}
					}
					
					if (!estaOnline()) {
						mostrarEstadoGuardadoLocal(data.mes, data.contrato);
					} else {
						setTimeout(() => {
							zanConfirm({ title: '📤 Datos pendientes', msg: `Contrato: ${data.contrato}\nMes: ${data.mes}\n\n¿Deseas sincronizarlos ahora?`, tipo: 'warning', okLabel: 'Sincronizar' }).then(ok => {
								if (ok) {
									sincronizarPendientes();
								} else {
									mostrarEstadoGuardadoLocal(data.mes, data.contrato);
								}
							});
						}, 1500);
					}
				} catch (e) {
					console.error("Error al verificar pendientes:", e);
					localStorage.removeItem(`elite_pending_sync_${currentUser}`);
				}
			}
		}

        function inicializarDatos() {
            const saved = localStorage.getItem(`elite_draft_${currentUser}`);
            
            if (saved) {
                const data = JSON.parse(saved);
                proveedores = data.proveedores || [];
                productosBase = data.productosBase || [];
                valorCupoBase = data.valorCupo || 8094;
            } else {
                proveedores = JSON.parse(JSON.stringify(PROVEEDORES_INICIALES));
                productosBase = JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
            }

            productosBase.forEach(p => {
                if (!getProveedorById(p.proveedor)) {
                    const primerProv = getProveedoresOrdenados()[0];
                    if (primerProv) p.proveedor = primerProv.id;
                }
            });

            cargarLocal();
        }

        function cerrarSesion() {
            localStorage.removeItem('elite_user');
            location.reload();
        }

        function toggleAuth(toReg) {
            document.getElementById('login-form').classList.toggle('hidden', toReg);
            document.getElementById('reg-form').classList.toggle('hidden', !toReg);
        }
		
		function debeMostrarTutorial() {
			if (!currentUser) return false;
			const tutorialVisto = localStorage.getItem(`tutorial_visto_${currentUser}`);
			if (tutorialVisto === 'true') {
				return false;
			}
			return true;
		}

		function marcarTutorialVisto() {
			if (!currentUser) return;
			localStorage.setItem(`tutorial_visto_${currentUser}`, 'true');
			tutorialYaVisto = true;
			console.log(`Tutorial marcado como visto para usuario: ${currentUser}`);
		}

		function resetTutorialVisto() {
			if (!currentUser) return;
			zanConfirm({ title: 'Resetear tutorial', msg: 'Se mostrará el tutorial la próxima vez que inicies sesión.', tipo: 'info', okLabel: 'Resetear' }).then(ok => {
				if (ok) {
					localStorage.removeItem(`tutorial_visto_${currentUser}`);
					tutorialYaVisto = false;
					Toast.info('El tutorial se mostrará en el próximo inicio de sesión.', { title: 'Tutorial reseteado' });
				}
			});
		}

        function toggleSidebar() {
			// No cerrar sidebar si el tutorial está mostrando elementos de navegación
			if (tutorialEnCurso && tutorialActivo && pasoActual < tutorialActivo.length) {
				const pasoActualObj = tutorialActivo[pasoActual];
				if (pasoActualObj && pasoActualObj.target && (
					pasoActualObj.target.includes('nav-') || 
					pasoActualObj.target === 'sidebar' ||
					pasoActualObj.target.includes('sidebar')
				)) {
					return;
				}
			}
			
			const sidebar = document.getElementById('sidebar');
			sidebarOpen = !sidebarOpen;

			if (window.innerWidth <= 768) {
				sidebar.classList.toggle('open', sidebarOpen);
				sidebar.classList.remove('collapsed');
			} else {
				sidebar.classList.toggle('collapsed', !sidebarOpen);
				sidebar.classList.remove('open');
			}
		}

        function toggleSidebarMobile() {
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                sidebarOpen = false;
            }
        }

        // ===== MODALES =====
        function toggleModal(id) {
            const modal = document.getElementById(id);
            const isOpen = modal.style.display === 'flex';
            modal.style.display = isOpen ? 'none' : 'flex';

            if (!isOpen) {
                if (id === 'modal-proveedores') renderizarProveedores();
                if (id === 'modal-productos') renderizarProductos();
            }
        }

        // ===== PROVEEDORES =====
        function renderizarProveedores() {
            const cont = document.getElementById('lista-proveedores');
            const ordenados = getProveedoresOrdenados();

            cont.innerHTML = ordenados.map((p, idx) => {
                const sigla = generarSigla(p.nombre);
                const esPrimero = idx === 0;
                const esUltimo = idx === ordenados.length - 1;

                return `
                    <div class="provider-config-item" style="border-color: ${p.color}" data-id="${p.id}">
                        <div class="provider-order">
                            <button class="order-btn" onclick="moverProveedor('${p.id}', -1)" ${esPrimero ? 'disabled' : ''}>
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="order-btn" onclick="moverProveedor('${p.id}', 1)" ${esUltimo ? 'disabled' : ''}>
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <input type="text" class="provider-name-input" value="${p.nombre}" 
                            onchange="actualizarNombreProveedor('${p.id}', this.value)" placeholder="Nombre proveedor">
                        <input type="color" class="provider-color-input" value="${p.color}" 
                            onchange="actualizarColorProveedor('${p.id}', this.value)">
                        <div class="sigla-preview" style="color: ${p.color}">${sigla}</div>
                        <button class="delete-btn" onclick="eliminarProveedor('${p.id}')" title="Eliminar proveedor">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');

            document.getElementById('cfg-valor-cupo').value = valorCupoBase;
        }

        function moverProveedor(id, direccion) {
            const prov = proveedores.find(p => p.id === id);
            const ordenados = getProveedoresOrdenados();
            const idx = ordenados.findIndex(p => p.id === id);

            if (direccion === -1 && idx > 0) {
                const prev = ordenados[idx - 1];
                const temp = prov.orden;
                prov.orden = prev.orden;
                prev.orden = temp;
            } else if (direccion === 1 && idx < ordenados.length - 1) {
                const next = ordenados[idx + 1];
                const temp = prov.orden;
                prov.orden = next.orden;
                next.orden = temp;
            }

            renderizarProveedores();
        }

        function actualizarNombreProveedor(id, nuevoNombre) {
            const prov = proveedores.find(p => p.id === id);
            if (prov) {
                prov.nombre = nuevoNombre;
                renderizarProveedores();
            }
        }

        function actualizarColorProveedor(id, nuevoColor) {
            const prov = proveedores.find(p => p.id === id);
            if (prov) {
                prov.color = nuevoColor;
                renderizarProveedores();
            }
        }

        function agregarProveedor() {
            const colores = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8e6cf', '#ffd93d', '#6bcb77'];
            const colorRandom = colores[Math.floor(Math.random() * colores.length)];
            const maxOrden = proveedores.length > 0 ? Math.max(...proveedores.map(p => p.orden)) : -1;

            const nuevoId = 'prov_' + Date.now();
            proveedores.push({
                id: nuevoId,
                nombre: 'Nuevo Proveedor',
                color: colorRandom,
                orden: maxOrden + 1
            });

            renderizarProveedores();
        }

        async function eliminarProveedor(id) {
            const prov = proveedores.find(p => p.id === id);
            if (!prov) return;

            const productosAsignados = productosBase.filter(p => p.proveedor === id).length;
            
            let mensaje = productosAsignados > 0 
                ? `¿Eliminar "${prov.nombre}"? Tiene ${productosAsignados} productos asignados que quedarán sin proveedor.`
                : `¿Eliminar "${prov.nombre}"?`;

            const _okElimProv = await zanConfirm({ title: 'Eliminar proveedor', msg: mensaje, tipo: 'danger', okLabel: 'Eliminar' });
            if (!_okElimProv) return;

            const proveedoresRestantes = proveedores.filter(p => p.id !== id);
            const nuevoProveedorId = proveedoresRestantes.length > 0 ? proveedoresRestantes[0].id : null;

            productosBase.forEach(p => {
                if (p.proveedor === id) {
                    p.proveedor = nuevoProveedorId;
                }
            });

            proveedores = proveedores.filter(p => p.id !== id);
            getProveedoresOrdenados().forEach((p, i) => p.orden = i);

            renderizarProveedores();
            renderizarProductos();
        }

        function guardarProveedores() {
            valorCupoBase = parseFloat(document.getElementById('cfg-valor-cupo').value) || 8094;
            toggleModal('modal-proveedores');
            initGrid(true);
            marcarCambio();
            Toast.success('Proveedores guardados correctamente');
        }

        // ===== PRODUCTOS =====
        function renderizarProductos() {
            const cont = document.getElementById('lista-productos-config');
            const provs = getProveedoresOrdenados();

            if (provs.length === 0) {
                cont.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">Primero debe crear al menos un proveedor</div>';
                document.getElementById('total-productos').textContent = 0;
                return;
            }

            cont.innerHTML = productosBase.map((p, i) => {
                const prov = getProveedorById(p.proveedor);
                const colorProv = prov ? prov.color : '#666';
                
                return `
                    <div class="product-config-item" style="border-color: ${colorProv}">
                        <input type="text" value="${p.nombre}" onchange="productosBase[${i}].nombre = this.value" placeholder="Nombre producto">
                        <input type="number" value="${p.precio}" onchange="productosBase[${i}].precio = parseFloat(this.value) || 0" placeholder="Precio">
                        <select onchange="productosBase[${i}].proveedor = this.value; renderizarProductos()" style="font-size: 9px;">
                            ${provs.map(pr => `<option value="${pr.id}" ${p.proveedor === pr.id ? 'selected' : ''}>${generarSigla(pr.nombre)} - ${pr.nombre}</option>`).join('')}
                        </select>
                        <label class="cl-checkbox">
                            <input type="checkbox" ${p.cl ? 'checked' : ''} onchange="productosBase[${i}].cl = this.checked">
                            <span>CL</span>
                        </label>
                        <button class="delete-btn" onclick="eliminarProducto(${i})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');

            document.getElementById('total-productos').textContent = productosBase.length;
        }

        function agregarProducto() {
            const provs = getProveedoresOrdenados();
            const provDefault = provs.length > 0 ? provs[0].id : null;

            productosBase.push({
                nombre: 'Nuevo Producto',
                precio: 0,
                cl: false,
                proveedor: provDefault
            });
            renderizarProductos();
        }

        async function eliminarProducto(index) {
            if (!await zanConfirm({ title: 'Eliminar producto', msg: '¿Eliminar este producto del listado?', tipo: 'danger', okLabel: 'Eliminar' })) return;
            productosBase.splice(index, 1);
            renderizarProductos();
        }

        function guardarProductos() {
            toggleModal('modal-productos');
            initGrid(true);
            marcarCambio();
            Toast.success('Productos guardados correctamente');
        }

        // ===== GRID PRINCIPAL =====
        function initGrid(preservarDatos = false) {
            let datosActuales = {};
            if (preservarDatos) {
                const semanasActuales = parseInt(document.getElementById('num-semanas').value) || 4;
                for (let s = 1; s <= semanasActuales; s++) {
                    datosActuales[s] = {
                        dias: document.getElementById(`dias-${s}`)?.value || "",
                        cupos: document.getElementById(`cupos-${s}`)?.value || "",
                        items: {}
                    };
                    productosBase.forEach((p, i) => {
                        datosActuales[s].items[i] = {
                            f: document.getElementById(`fac-${s}-${i}`)?.value || "",
                            q: document.getElementById(`cant-${s}-${i}`)?.value || "",
                            p: document.getElementById(`punit-${s}-${i}`)?.value || p.precio,
                            v: document.getElementById(`val-${s}-${i}`)?.value || ""
                        };
                    });
                }
            }

            const grid = document.getElementById('main-grid');
            const tabsNav = document.getElementById('semanas-tabs-nav');
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;

            grid.innerHTML = '';
            if (tabsNav) tabsNav.innerHTML = '';

            // Clase para layout de semanas (2x2 para 4, 2x3 para 5)
            grid.classList.remove('semanas-4', 'semanas-5', 'semanas-3', 'semanas-2', 'semanas-1', 'semanas-6');
            grid.classList.add(`semanas-${semanas}`);

            for (let s = 1; s <= semanas; s++) {
                let providersHTML = '';
                const provsOrdenados = getProveedoresOrdenados();

                provsOrdenados.forEach(prov => {
                    const productosProv = getProductosByProveedor(prov.id);
                    if (productosProv.length === 0) return;

                    const sigla = generarSigla(prov.nombre);
                    const productosHTML = productosProv.map(p => {
                        const globalIdx = productosBase.findIndex(pb => pb.nombre === p.nombre);
                        return `
                            <tr>
                                <td class="col-factura">
                                    <input type="text" id="fac-${s}-${globalIdx}" placeholder="Factura" onchange="marcarCambio()">
                                </td>
                                <td class="col-producto">
                                    <div class="product-info">
                                        <span class="product-name">${p.nombre}</span>
                                        <div class="product-badges">
                                            ${p.cl ? '<span class="badge badge-cl">CL</span>' : ''}
                                            <span class="badge badge-sigla" style="background: ${prov.color}30; color: ${prov.color};">${sigla}</span>
                                        </div>
                                    </div>
                                    <input type="hidden" id="punit-${s}-${globalIdx}" value="${p.precio}">
                                </td>
                                <td class="col-cantidad">
                                    <input type="number" id="cant-${s}-${globalIdx}" placeholder="0" oninput="calcular(${s})" onchange="marcarCambio()">
                                </td>
                                <td class="col-total">
                                    <input type="text" id="val-${s}-${globalIdx}" class="total-input" placeholder="$0" 
                                        oninput="ajustarPrecioInverso(${s}, ${globalIdx})" onchange="marcarCambio()">
                                </td>
                            </tr>
                        `;
                    }).join('');

                    providersHTML += `
                        <div class="provider-section" style="border-color: ${prov.color}30;">
                            <div class="provider-header provider-box-header" style="color: ${prov.color}; border-left: 4px solid ${prov.color};" 
                                onclick="toggleProvider('${s}-${prov.id}')">
                                <span style="color: var(--data-theme, inherit); filter: var(--prov-text-filter, none);">${prov.nombre} <small style="opacity:0.7;">(${sigla})</small></span>
                                <span class="provider-total" id="prov-total-${s}-${prov.id}">$0</span>
                            </div>
                            <div class="provider-content" id="prov-content-${s}-${prov.id}">
                                <table class="product-table">
                                    <thead>
                                        <tr>
                                            <th class="col-factura">FACTURA</th>
                                            <th class="col-producto">PRODUCTO</th>
                                            <th class="col-cantidad">CANT</th>
                                            <th class="col-total">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>${productosHTML}</tbody>
                                </table>
                            </div>
                        </div>
                    `;
                });

                // Tab button
                if (tabsNav) {
                    tabsNav.innerHTML += `
                        <button class="semana-tab-btn ${s === 1 ? 'active' : ''}" id="tab-btn-${s}" onclick="cambiarTab(${s})">
                            <span class="tab-label">SEM ${s}</span>
                            <span class="tab-meta" id="tab-meta-${s}">— d · — c</span>
                            <span class="tab-total" id="tab-total-${s}">$0</span>
                        </button>
                    `;
                }

                // Panel content
                grid.innerHTML += `
                    <div class="semana-panel ${s === 1 ? 'active' : ''}" id="panel-${s}">
                        <div class="panel-header">
                            <div class="panel-semana-title">
                                <i class="fa-solid fa-calendar-week"></i>
                                SEMANA ${s}
                            </div>
                            <div class="panel-info-row">
                                <div class="panel-info-chip">
                                    <label>Días</label>
                                    <input type="number" id="dias-${s}" placeholder="0" oninput="calcular(${s})" onchange="marcarCambio()">
                                </div>
                                <div class="panel-info-chip">
                                    <label>Cupos</label>
                                    <input type="number" id="cupos-${s}" placeholder="0" oninput="calcular(${s})" onchange="marcarCambio()">
                                </div>
                                <div class="panel-info-chip presupuesto-chip">
                                    <label>Presupuesto</label>
                                    <span class="pres-valor" id="pres-${s}">$0</span>
                                </div>
                                <button class="btn btn-sm btn-danger" onclick="limpiarSemana(${s})" style="background:rgba(255,70,85,0.1);" title="Limpiar semana">
                                    <i class="fa-solid fa-broom"></i>
                                </button>
                            </div>
                        </div>

                        ${providersHTML}

                        <div class="distribuidora-row">
                            <span class="distribuidora-value" style="color:var(--primary-gold); font-weight:bold;">DISTRIBUIDORA</span>
                            <input type="text" id="dist-${s}" class="distribuidora-value" readonly value="$0">
                        </div>
                    </div>
                `;
            }
            
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 768) {
                sidebar.classList.add('collapsed');
                sidebarOpen = false;
            } else {
                sidebar.classList.remove('open');
            }
            sidebarOpen = false;
            
            if (preservarDatos && Object.keys(datosActuales).length > 0) {
                for (let s = 1; s <= semanas; s++) {
                    if (!datosActuales[s]) continue;
                    
                    if (document.getElementById(`dias-${s}`)) 
                        document.getElementById(`dias-${s}`).value = datosActuales[s].dias;
                    if (document.getElementById(`cupos-${s}`)) 
                        document.getElementById(`cupos-${s}`).value = datosActuales[s].cupos;
                        
                    productosBase.forEach((p, i) => {
                        const item = datosActuales[s].items[i];
                        if (item) {
                            if (document.getElementById(`fac-${s}-${i}`)) 
                                document.getElementById(`fac-${s}-${i}`).value = item.f;
                            if (document.getElementById(`cant-${s}-${i}`)) 
                                document.getElementById(`cant-${s}-${i}`).value = item.q;
                            if (document.getElementById(`punit-${s}-${i}`)) 
                                document.getElementById(`punit-${s}-${i}`).value = item.p;
                            if (document.getElementById(`val-${s}-${i}`)) 
                                document.getElementById(`val-${s}-${i}`).value = item.v;
                        }
                    });
                    calcular(s);
                }
            } else {
                actualizarResumen();
            }
			if (!tutorialEnCurso) {
				const sidebar = document.getElementById('sidebar');
				if (window.innerWidth > 768) {
					sidebar.classList.add('collapsed');
					sidebarOpen = false;
				} else {
					sidebar.classList.remove('open');
				}
				sidebarOpen = false;
			}
        }
		
		// ===== CERRAR SIDEBAR AL HACER CLIC FUERA =====
		document.addEventListener('click', function(e) {
			// NO cerrar si el tutorial está activo
			if (tutorialEnCurso) return;
			
			const sidebar = document.getElementById('sidebar');
			const menuToggle = document.querySelector('.menu-toggle');
			
			// Si el tutorial está mostrando elementos de navegación, no cerrar
			if (tutorialActivo && pasoActual < tutorialActivo.length) {
				const pasoActualObj = tutorialActivo[pasoActual];
				if (pasoActualObj && pasoActualObj.target && (
					pasoActualObj.target.includes('nav-') || 
					pasoActualObj.target === 'sidebar' ||
					pasoActualObj.target.includes('sidebar')
				)) {
					return;
				}
			}
			
			// Verificar si el sidebar está abierto
			const isSidebarOpen = window.innerWidth > 768 
				? !sidebar.classList.contains('collapsed')
				: sidebar.classList.contains('open');
			
			// Verificar si el clic fue fuera del sidebar y fuera del botón de menú
			const clickFueraSidebar = !sidebar.contains(e.target);
			const clickFueraBoton = !menuToggle.contains(e.target);
			
			if (isSidebarOpen && clickFueraSidebar && clickFueraBoton) {
				// Cerrar sidebar según el modo (desktop o móvil)
				if (window.innerWidth > 768) {
					sidebar.classList.add('collapsed');
					sidebarOpen = false;
				} else {
					sidebar.classList.remove('open');
					sidebarOpen = false;
				}
			}
		});
		
        function cambiarSemanas() {
            initGrid(true);
            marcarCambio();
            
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 768) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('open');
            }
            sidebarOpen = false;
        }

        function toggleWeek(s) {
            const content = document.getElementById(`content-${s}`);
            const btn = document.getElementById(`btn-col-${s}`);
            const icon = document.getElementById(`icon-col-${s}`);

            const isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed) {
                content.classList.remove('collapsed');
                btn.classList.remove('collapsed-btn');
                icon.className = "fa-solid fa-chevron-down";
            } else {
                content.classList.add('collapsed');
                btn.classList.add('collapsed-btn');
                icon.className = "fa-solid fa-chevron-right";
            }
        }

        // ===== SISTEMA DE TABS =====
        function cambiarTab(s) {
            // Desactivar todos los tabs y paneles
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            for (let i = 1; i <= semanas; i++) {
                const btn = document.getElementById(`tab-btn-${i}`);
                const panel = document.getElementById(`panel-${i}`);
                if (btn) btn.classList.remove('active');
                if (panel) panel.classList.remove('active');
            }
            // Activar el seleccionado
            const btnActivo = document.getElementById(`tab-btn-${s}`);
            const panelActivo = document.getElementById(`panel-${s}`);
            if (btnActivo) btnActivo.classList.add('active');
            if (panelActivo) panelActivo.classList.add('active');
        }

        function actualizarTabIndicadores(s) {
            const dias = parseFloat(document.getElementById(`dias-${s}`)?.value) || 0;
            const cupos = parseFloat(document.getElementById(`cupos-${s}`)?.value) || 0;
            const distVal = document.getElementById(`dist-${s}`)?.value || '$0';
            
            const tabMeta = document.getElementById(`tab-meta-${s}`);
            if (tabMeta) {
                tabMeta.textContent = dias > 0 || cupos > 0 ? `${dias}d · ${cupos}c` : '— d · — c';
            }

            // Calcular total gastado en la semana
            let totalSemana = 0;
            productosBase.forEach((p, i) => {
                const val = document.getElementById(`val-${s}-${i}`);
                if (val) totalSemana += limpiarNum(val.value);
            });

            const tabTotal = document.getElementById(`tab-total-${s}`);
            if (tabTotal) {
                tabTotal.textContent = totalSemana > 0 ? formatter.format(totalSemana) : '$0';
            }

            // Marcar excedido en el tab
            const tabBtn = document.getElementById(`tab-btn-${s}`);
            const panel = document.getElementById(`panel-${s}`);
            const pres = parseFloat(document.getElementById(`dias-${s}`)?.value || 0) *
                         parseFloat(document.getElementById(`cupos-${s}`)?.value || 0) * valorCupoBase;
            const dist = pres - totalSemana;
            if (tabBtn) tabBtn.classList.toggle('excedido-tab', dist < 0 && pres > 0);
            if (panel) panel.classList.toggle('excedido', dist < 0 && pres > 0);
        }

        function toggleProvider(id) {
            const content = document.getElementById(`prov-content-${id}`);
            if (content) content.classList.toggle('collapsed');
        }

        function ajustarPrecioInverso(s, i) {
            const totalIngresado = limpiarNum(document.getElementById(`val-${s}-${i}`).value);
            const cantidad = parseFloat(document.getElementById(`cant-${s}-${i}`).value) || 0;
            if (cantidad > 0) {
                document.getElementById(`punit-${s}-${i}`).value = totalIngresado / cantidad;
            }
            calcular(s, false);
        }

        function calcular(s, formatear = true) {
            const d = parseFloat(document.getElementById(`dias-${s}`).value) || 0;
            const c = parseFloat(document.getElementById(`cupos-${s}`).value) || 0;
            const pres = d * c * valorCupoBase;

            const presElem = document.getElementById(`pres-${s}`);
            if (presElem) presElem.textContent = formatter.format(pres);

            let sumaProd = 0;

            getProveedoresOrdenados().forEach(prov => {
                const productosProv = getProductosByProveedor(prov.id);
                let totalProv = 0;

                productosProv.forEach(p => {
                    const globalIdx = productosBase.findIndex(pb => pb.nombre === p.nombre);
                    if (globalIdx === -1) return;

                    const cant = parseFloat(document.getElementById(`cant-${s}-${globalIdx}`)?.value) || 0;
                    const pUnit = parseFloat(document.getElementById(`punit-${s}-${globalIdx}`)?.value) || 0;
                    const total = cant * pUnit;

                    if (formatear) {
                        const valInput = document.getElementById(`val-${s}-${globalIdx}`);
                        if (valInput) valInput.value = formatter.format(total);
                    }

                    totalProv += total;
                    sumaProd += total;
                });

                const provTotalElem = document.getElementById(`prov-total-${s}-${prov.id}`);
                if (provTotalElem) provTotalElem.textContent = formatter.format(totalProv);
            });

            const dist = pres - sumaProd;
            const distElem = document.getElementById(`dist-${s}`);
            if (distElem) distElem.value = formatter.format(dist);

            const card = document.getElementById(`card-${s}`);
            if (card) card.classList.toggle('excedido', dist < 0);

            actualizarTabIndicadores(s);
            actualizarResumen();
        }

        // ===== RESUMEN MEJORADO CON RACIONES =====
        function actualizarResumen() {
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            
            let resumenProductos = {};
            
            productosBase.forEach(p => {
                resumenProductos[p.nombre] = {
                    cantidad: 0,
                    valor: 0,
                    cl: p.cl,
                    proveedor: p.proveedor,
                    unidad: detectarUnidad(p.nombre)
                };
            });

            let tPres = 0, tProdCL = 0, tProdOtros = 0;
            let racionesPorSemana = {};
            let totalRacionesMes = 0;

            for (let s = 1; s <= semanas; s++) {
                const pVal = document.getElementById(`pres-${s}`);
                if (pVal) tPres += limpiarNum(pVal.textContent);

                const dias = parseFloat(document.getElementById(`dias-${s}`)?.value) || 0;
                const cupos = parseFloat(document.getElementById(`cupos-${s}`)?.value) || 0;
                const racionesSemana = dias * cupos;
                racionesPorSemana[s] = {
                    dias: dias,
                    cupos: cupos,
                    raciones: racionesSemana
                };
                totalRacionesMes += racionesSemana;

                productosBase.forEach((p, i) => {
                    const cantInput = document.getElementById(`cant-${s}-${i}`);
                    const valInput = document.getElementById(`val-${s}-${i}`);
                    
                    if (!cantInput || !valInput) return;

                    const cant = parseFloat(cantInput.value) || 0;
                    const val = limpiarNum(valInput.value);

                    if (cant > 0) {
                        resumenProductos[p.nombre].cantidad += cant;
                        resumenProductos[p.nombre].valor += val;

                        if (p.cl) tProdCL += val;
                        else tProdOtros += val;
                    }
                });
            }

            const tDistBruto = tPres - tProdCL - tProdOtros;

            // ===== Descuento por Novedades (semanal) — módulo 10-descuentos.js =====
            let totalDescuentoActivo = 0;
            let semanasConDescuento = 0;
            let descuentoPorSemana = {};
            const descuentosDisponibles = typeof calcularTotalDescuentosSemana === 'function';
            const descuentosActivosGlobal = typeof descuentosGlobalActivo === 'undefined' ? true : descuentosGlobalActivo;
            if (descuentosDisponibles) {
                for (let s = 1; s <= semanas; s++) {
                    const dSemana = calcularTotalDescuentosSemana(s, true);
                    if (dSemana > 0) {
                        semanasConDescuento++;
                        descuentoPorSemana[s] = dSemana;
                    }
                    totalDescuentoActivo += dSemana;
                }
            }

            const tDist = tDistBruto - totalDescuentoActivo;
            const porcCL = tPres > 0 ? (tProdCL / tPres) * 100 : 0;
            const ledColor = porcCL >= 30 ? 'var(--success)' : 'var(--danger)';

            let htmlRaciones = '';
            for (let s = 1; s <= semanas; s++) {
                const r = racionesPorSemana[s];
                if (r.dias > 0 || r.cupos > 0) {
                    htmlRaciones += `
                        <div class="raciones-semana">
                            <span style="color: var(--text-dim);">Semana ${s}:</span>
                            <span style="color: var(--accent-cyan); font-weight: bold;">
                                ${r.dias} días × ${r.cupos} cupos = <span style="color: var(--primary-gold);">${r.raciones.toLocaleString()} raciones</span>
                            </span>
                        </div>
                    `;
                }
            }

            let htmlProveedores = '';
            const provsOrdenados = getProveedoresOrdenados();

            provsOrdenados.forEach(prov => {
                const productosDelProv = Object.entries(resumenProductos)
                    .filter(([nombre, datos]) => datos.proveedor === prov.id && (datos.cantidad > 0 || datos.valor > 0))
                    .sort((a, b) => b[1].valor - a[1].valor);

                if (productosDelProv.length === 0) return;

                const totalProv = productosDelProv.reduce((sum, [_, datos]) => sum + datos.valor, 0);
                const porcProv = tPres > 0 ? ((totalProv / tPres) * 100).toFixed(1) : 0;

                htmlProveedores += `
                    <div class="resumen-proveedor" style="border-color: ${prov.color}60;">
                        <div class="resumen-proveedor-header provider-box-header" style="color: ${prov.color}; border-left: 4px solid ${prov.color};"
                            onclick="toggleResumenProv('resumen-prov-${prov.id}')">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <i class="fa-solid fa-chevron-down collapse-icon" id="icon-resumen-${prov.id}"></i>
                                <span>${prov.nombre} (${generarSigla(prov.nombre)})</span>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span class="porcentaje-badge">${porcProv}% del total</span>
                                <span style="font-size:12px;">${formatter.format(totalProv)}</span>
                            </div>
                        </div>
                        <div class="resumen-proveedor-content" id="resumen-prov-${prov.id}">
                            ${productosDelProv.map(([nombre, datos]) => {
                                const porcProd = tPres > 0 ? ((datos.valor / tPres) * 100).toFixed(2) : 0;
                                return `
                                    <div class="producto-resumen">
                                        <span style="font-weight:500;">${nombre}</span>
                                        <span style="color:var(--text-dim); font-size:10px;">
                                            ${datos.cantidad.toLocaleString()} ${datos.unidad}
                                        </span>
                                        <span class="cl-indicator ${datos.cl ? 'cl-yes' : 'cl-no'}">
                                            ${datos.cl ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>'}
                                        </span>
                                        <span class="porcentaje-cl ${datos.cl ? '' : 'bajo'}">
                                            ${porcProd}%
                                        </span>
                                        <span style="color:var(--primary-gold); font-weight:bold; font-size:11px;">
                                            ${formatter.format(datos.valor)}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                            <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); text-align:right; font-size:11px; color:${prov.color};">
                                Total ${generarSigla(prov.nombre)}: <strong>${formatter.format(totalProv)}</strong> (${porcProv}%)
                            </div>
                        </div>
                    </div>
                `;
            });

            const sumCont = document.getElementById('summary-content');
            if (sumCont) {
                sumCont.innerHTML = `
                    <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:10px; margin-bottom:15px; border:1px solid ${ledColor};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <small style="color:var(--text-dim);">% COMPRAS LOCALES</small>
                                <div style="font-size:1.3em; color:${ledColor}; font-weight:bold;">${porcCL.toFixed(1)}%</div>
                            </div>
                            <div style="width:15px; height:15px; background:${ledColor}; border-radius:50%; box-shadow:0 0 10px ${ledColor};"></div>
                        </div>
                    </div>

                    <div style="margin-bottom:15px;">
                        <small style="color:var(--text-dim); display:block; margin-bottom:8px; font-size:10px; text-transform:uppercase;">
                            Detalle por Proveedor y Producto (clic para expandir/contraer):
                        </small>
                        ${htmlProveedores}
                    </div>

                    <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-top:15px;">
                        <table style="width:100%; font-size:10px;">
                            <tr style="color:var(--accent-cyan);">
                                <td><b>TOTAL COMPRAS LOCALES (CL)</b></td>
                                <td style="text-align:right;"><b>${formatter.format(tProdCL)}</b></td>
                                <td style="text-align:right; color:var(--success);"><b>${tPres > 0 ? ((tProdCL/tPres)*100).toFixed(1) : 0}%</b></td>
                            </tr>
                            <tr style="color:var(--text-dim);">
                                <td>OTROS PRODUCTOS</td>
                                <td style="text-align:right;">${formatter.format(tProdOtros)}</td>
                                <td style="text-align:right;">${tPres > 0 ? ((tProdOtros/tPres)*100).toFixed(1) : 0}%</td>
                            </tr>
                            <tr style="color:var(--success);">
                                <td><b>DISTRIBUIDORA</b></td>
                                <td style="text-align:right;"><b>${formatter.format(tDist)}</b></td>
                                <td style="text-align:right; color:var(--success);"><b>${tPres > 0 ? ((tDist/tPres)*100).toFixed(1) : 0}%</b></td>
                            </tr>
                            ${totalDescuentoActivo > 0 ? `
                            <tr style="color:var(--danger); font-size:9px;">
                                <td colspan="2">↳ Ya incluye descuento por novedades (${semanasConDescuento} semana${semanasConDescuento !== 1 ? 's' : ''})</td>
                                <td style="text-align:right;">-${formatter.format(totalDescuentoActivo)}</td>
                            </tr>` : ''}
                        </table>
                    </div>

                    <div class="descuentos-resumen-evidencia ${totalDescuentoActivo > 0 ? 'con-descuento' : ''}">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <i class="fa-solid fa-user-minus" style="color: var(--danger); font-size: 16px;"></i>
                                <span style="font-size: 12px; font-weight: bold; color: var(--danger); text-transform:uppercase;">Descuento por Novedades (semanal)</span>
                            </div>
                            <span class="descuento-estado-badge ${(descuentosDisponibles && totalDescuentoActivo > 0) ? 'si' : 'no'}">
                                ${(descuentosDisponibles && totalDescuentoActivo > 0) ? 'SE APLICÓ' : 'NO SE APLICÓ'}
                            </span>
                        </div>
                        ${(!descuentosDisponibles || totalDescuentoActivo === 0) ? `
                            <div style="color: var(--text-dim); text-align:center; font-size:10px; padding: 4px 0;">
                                ${!descuentosActivosGlobal && descuentosDisponibles ? 'Hay novedades registradas, pero el descuento global está desactivado.' : 'No hay novedades activas que descontar en las semanas registradas.'}
                            </div>
                        ` : `
                            <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:8px;">
                                ${Object.entries(descuentoPorSemana).map(([s, valor]) => `
                                    <div style="display:flex; justify-content:space-between; font-size:10.5px;">
                                        <span style="color:var(--text-dim);">Semana ${s}</span>
                                        <span style="color:var(--danger); font-weight:bold;">-${formatter.format(valor)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:8px;">
                                <span style="font-size:10px; color:var(--text-dim);">Total descontado de Distribuidora</span>
                                <span style="font-size:14px; font-weight:900; color:var(--danger);">-${formatter.format(totalDescuentoActivo)}</span>
                            </div>
                        `}
                    </div>

                    <div class="raciones-resumen">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <i class="fa-solid fa-utensils" style="color: var(--accent-cyan); font-size: 18px;"></i>
                            <span style="font-size: 14px; font-weight: bold; color: var(--accent-cyan);">CANTIDADES RACIONES</span>
                        </div>
                        ${htmlRaciones || '<div style="color: var(--text-dim); text-align: center; padding: 1px;">No hay datos de días/cupos ingresados</div>'}
                        <div class="raciones-total">
                            <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 5px;">TOTAL RACIONES DEL MES</div>
                            <div class="raciones-total-valor">${totalRacionesMes.toLocaleString()}</div>
                            <div style="font-size: 10px; color: var(--text-dim); margin-top: 5px;">
                                ${Object.values(racionesPorSemana).filter(r => r.raciones > 0).length} semanas con datos
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:15px; text-align:right; border-top:2px solid var(--primary-gold); padding-top:10px;">
                        <small style="color:var(--text-dim);">PRESUPUESTO TOTAL MES</small>
                        <div style="font-size:1.5em; color:var(--primary-gold); font-weight:bold;">${formatter.format(tPres)}</div>
                        <div style="font-size:10px; color:var(--text-dim); margin-top:5px;">
                            ${totalDescuentoActivo > 0
                                ? `100% distribuido entre compras, distribuidora y -${formatter.format(totalDescuentoActivo)} de descuento por novedades`
                                : '100% distribuido entre compras y distribuidora'}
                        </div>
                    </div>
                `;
            }

            const datosGrafico = Object.entries(resumenProductos)
                .filter(([_, datos]) => datos.valor > 0)
                .map(([nombre, datos]) => ({
                    nombre,
                    valor: datos.valor,
                    color: getProveedorById(datos.proveedor)?.color || '#666',
                    provId: datos.proveedor
                }));

            renderChart(datosGrafico, tDist, totalDescuentoActivo);
        }

        function toggleResumenProv(id) {
            const el = document.getElementById(id);
            const iconId = id.replace('resumen-prov-', 'icon-resumen-');
            const icon = document.getElementById(iconId);
            if (el) {
                el.classList.toggle('collapsed');
                if (icon) icon.classList.toggle('collapsed');
            }
        }

        function renderChart(datos, distVal, descuentoVal = 0) {
            const canvas = document.getElementById('chartGasto');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            let porProveedor = {};
            datos.forEach(d => {
                if (!porProveedor[d.provId]) {
                    porProveedor[d.provId] = 0;
                }
                porProveedor[d.provId] += d.valor;
            });

            const labels = Object.keys(porProveedor).map(id => generarSigla(getProveedorById(id)?.nombre || 'OTR'));
            const data = Object.values(porProveedor);
            const colors = Object.keys(porProveedor).map(id => getProveedorById(id)?.color || '#666');

            if (distVal > 0) {
                labels.push('DIST');
                data.push(distVal);
                colors.push('#00ff88');
            }

            if (descuentoVal > 0) {
                labels.push('DESC. NOVEDADES');
                data.push(descuentoVal);
                colors.push('#ff4655');
            }

            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors }] },
                options: {
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#fff', font: { size: 9 }, boxWidth: 10 } }
                    }
                }
            });
        }

        // ===== PANEL DE VALORES DISTRIBUIDORA =====
        function renderizarValoresDistribuidora() {
            const cont = document.getElementById('distribuidora-semanas');
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            const descuentosDisponibles = typeof calcularTotalDescuentosSemana === 'function';

            let html = '';
            let totalDescuentoGeneral = 0;
            let semanasConDescuento = 0;

            for (let s = 1; s <= semanas; s++) {
                const distVal = document.getElementById(`dist-${s}`)?.value || '$0';
                const descuentoSemana = descuentosDisponibles ? calcularTotalDescuentosSemana(s, true) : 0;
                if (descuentoSemana > 0) {
                    totalDescuentoGeneral += descuentoSemana;
                    semanasConDescuento++;
                }

                html += `
                    <div class="semana-checkbox" id="dist-check-${s}" onclick="toggleSeleccionDistribuidora(${s})">
                        <input type="checkbox" id="dist-checkbox-${s}" onchange="calcularTotalDistribuidora()">
                        <div style="flex:1;">
                            <div style="font-weight:bold; color:var(--primary-gold);">Semana ${s}</div>
                            <div style="font-size:10px; color:var(--text-dim);">Distribuidora: ${distVal}</div>
                            ${descuentoSemana > 0 ? `
                                <div style="font-size:9.5px; color:var(--danger); margin-top:2px;">
                                    <i class="fa-solid fa-user-minus"></i> Incluye descuento por novedades: -${formatter.format(descuentoSemana)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }

            cont.innerHTML = html;

            const notaDescuentos = document.getElementById('distribuidora-nota-descuentos');
            const notaHtml = totalDescuentoGeneral > 0
                ? `<i class="fa-solid fa-circle-info"></i> Los valores ya incluyen -${formatter.format(totalDescuentoGeneral)} en descuentos por novedades aplicados en ${semanasConDescuento} semana${semanasConDescuento !== 1 ? 's' : ''}.`
                : `<i class="fa-solid fa-circle-info"></i> No hay descuentos por novedades activos en este momento.`;
            if (notaDescuentos) {
                notaDescuentos.innerHTML = notaHtml;
                notaDescuentos.classList.toggle('con-descuento', totalDescuentoGeneral > 0);
            }

            calcularTotalDistribuidora();
        }

        function toggleSeleccionDistribuidora(s) {
            const checkbox = document.getElementById(`dist-checkbox-${s}`);
            const container = document.getElementById(`dist-check-${s}`);
            
            checkbox.checked = !checkbox.checked;
            container.classList.toggle('selected', checkbox.checked);
            
            calcularTotalDistribuidora();
        }

        function calcularTotalDistribuidora() {
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            let total = 0;
            let seleccionadas = 0;
            
            for (let s = 1; s <= semanas; s++) {
                const checkbox = document.getElementById(`dist-checkbox-${s}`);
                if (checkbox && checkbox.checked) {
                    const val = limpiarNum(document.getElementById(`dist-${s}`)?.value || "0");
                    total += val;
                    seleccionadas++;
                }
            }
            
            document.getElementById('total-distribuidora').innerHTML = `
                ${formatter.format(total)}
                <div style="font-size:12px; color:var(--text-dim); margin-top:5px;">
                    ${seleccionadas} semana${seleccionadas !== 1 ? 's' : ''} seleccionada${seleccionadas !== 1 ? 's' : ''}
                </div>
            `;
        }

        // ===== VALIDACIÓN DE FACTURAS =====
        function renderizarValidadorFacturas() {
            const cont = document.getElementById('facturas-content');
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            
            let datosPorProveedor = {};
            
            getProveedoresOrdenados().forEach(prov => {
                datosPorProveedor[prov.id] = {
                    proveedor: prov,
                    facturas: {}
                };
            });
            
            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const facInput = document.getElementById(`fac-${s}-${i}`);
                    const valInput = document.getElementById(`val-${s}-${i}`);
                    
                    if (!facInput || !valInput) return;
                    
                    const numFactura = facInput.value?.trim();
                    const valor = limpiarNum(valInput.value);
                    const cantidad = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    
                    if (numFactura && valor > 0) {
                        const provId = p.proveedor;
                        
                        if (!datosPorProveedor[provId].facturas[numFactura]) {
                            datosPorProveedor[provId].facturas[numFactura] = {
                                numero: numFactura,
                                productos: {},
                                total: 0,
                                semanas: new Set()
                            };
                        }
                        
                        const factura = datosPorProveedor[provId].facturas[numFactura];
                        
                        if (!factura.productos[p.nombre]) {
                            factura.productos[p.nombre] = {
                                nombre: p.nombre,
                                unidad: detectarUnidad(p.nombre),
                                cantidadTotal: 0,
                                valorTotal: 0,
                                detalle: []
                            };
                        }
                        
                        factura.productos[p.nombre].cantidadTotal += cantidad;
                        factura.productos[p.nombre].valorTotal += valor;
                        factura.productos[p.nombre].detalle.push({
                            semana: s,
                            cantidad: cantidad,
                            valor: valor
                        });
                        
                        factura.total += valor;
                        factura.semanas.add(s);
                    }
                });
            }
            
            const tieneDatos = Object.values(datosPorProveedor).some(
                prov => Object.keys(prov.facturas).length > 0
            );
            
            if (!tieneDatos) {
                cont.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">No hay facturas registradas</div>';
                return;
            }
            
            let html = '';
            
            Object.entries(datosPorProveedor).forEach(([provId, datosProv]) => {
                const facturas = Object.values(datosProv.facturas);
                if (facturas.length === 0) return;
                
                const prov = datosProv.proveedor;
                const color = prov.color;
                const totalProv = facturas.reduce((sum, f) => sum + f.total, 0);
                
                html += `
                    <div class="validacion-proveedor" style="border-color: ${color}30;">
                        <div class="validacion-proveedor-header provider-box-header" style="color: ${color}; border-left: 4px solid ${color};"
                            onclick="toggleValidacionProv('validacion-prov-${provId}')">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <i class="fa-solid fa-chevron-down collapse-icon" id="icon-validacion-${provId}"></i>
                                <span>${prov.nombre} (${generarSigla(prov.nombre)})</span>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span style="font-size:10px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:10px;">${facturas.length} factura${facturas.length !== 1 ? 's' : ''}</span>
                                <span style="font-weight:bold;">${formatter.format(totalProv)}</span>
                            </div>
                        </div>
                        <div class="validacion-proveedor-content" id="validacion-prov-${provId}">
                `;
                
                facturas.forEach(factura => {
                    const semanasArray = [...factura.semanas].sort((a,b) => a-b);
                    const productos = Object.values(factura.productos);
                    
                    html += `
                        <div class="factura-group" style="margin-bottom:10px;">
                            <div class="factura-header" onclick="toggleFacturaGroup('factura-detalle-${provId}-${factura.numero.replace(/\s+/g, '-')}')">
                                <div>
                                    <div style="font-weight:bold; color:var(--text-main);">${factura.numero}</div>
                                    <div style="font-size:9px; color:var(--text-dim);">Semanas: ${semanasArray.join(', ')}</div>
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <i class="fa-solid fa-chevron-down collapse-icon" id="icon-factura-${provId}-${factura.numero.replace(/\s+/g, '-')}"></i>
                                    <span class="factura-total">${formatter.format(factura.total)}</span>
                                </div>
                            </div>
                            <div class="factura-content" id="factura-detalle-${provId}-${factura.numero.replace(/\s+/g, '-')}">
                    `;
                    
                    productos.forEach(prod => {
                        html += `
                            <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                    <div class="producto-factura">
                                        <span class="producto-nombre">${prod.nombre}</span>
                                        <span class="producto-unidad">Total: ${prod.cantidadTotal} ${prod.unidad}</span>
                                    </div>
                                    <span style="color:var(--primary-gold); font-weight:bold; font-size:12px;">
                                        ${formatter.format(prod.valorTotal)}
                                    </span>
                                </div>
                                <div style="font-size:9px; color:var(--text-dim); padding-left:10px;">
                                    ${prod.detalle.map(d => `
                                        <div style="display:flex; justify-content:space-between; padding:2px 0;">
                                            <span>Semana ${d.semana}: ${d.cantidad} ${prod.unidad}</span>
                                            <span>${formatter.format(d.valor)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    });
                    
                    html += `
                                <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); text-align:right;">
                                    <small style="color:var(--text-dim);">Total factura:</small>
                                    <strong style="color:${color}; margin-left:10px; font-size:14px;">${formatter.format(factura.total)}</strong>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            cont.innerHTML = html;
        }

        function toggleValidacionProv(id) {
            const el = document.getElementById(id);
            const iconId = id.replace('validacion-prov-', 'icon-validacion-');
            const icon = document.getElementById(iconId);
            if (el) {
                el.classList.toggle('collapsed');
                if (icon) icon.classList.toggle('collapsed');
            }
        }

        function toggleFacturaGroup(id) {
            const el = document.getElementById(id);
            const iconId = id.replace('factura-detalle-', 'icon-factura-');
            const icon = document.getElementById(iconId);
            if (el) {
                el.classList.toggle('collapsed');
                if (icon) icon.classList.toggle('collapsed');
            }
        }

        // ===== EXPORTACIONES MEJORADAS =====
        function exportarCompleto() {
            const mes = document.getElementById('main-mes').value;
            const contrato = document.getElementById('main-contrato').value;
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;

            const wb = XLSX.utils.book_new();

            let tPresTotal = 0;
            let tProdCL = 0;
            let tProdOtros = 0;
            let tDistTotal = 0; // neta: ya incluye el descuento de novedades (dist-${s} viene descontado)
            let tDescuentoTotal = 0;
            let semanasConDescuentoExport = 0;
            let totalesPorProducto = {};
            let racionesPorSemana = {};
            let totalRacionesMes = 0;
            const descuentosDisponiblesExport = typeof calcularTotalDescuentosSemana === 'function';
            const descuentosActivosGlobalExport = typeof descuentosGlobalActivo === 'undefined' ? true : descuentosGlobalActivo;

            productosBase.forEach(p => {
                totalesPorProducto[p.nombre] = {
                    cantidad: 0,
                    valor: 0,
                    cl: p.cl,
                    proveedor: p.proveedor,
                    unidad: detectarUnidad(p.nombre)
                };
            });

            for (let s = 1; s <= semanas; s++) {
                const pVal = document.getElementById(`pres-${s}`);
                if (pVal) tPresTotal += limpiarNum(pVal.textContent);

                const distVal = document.getElementById(`dist-${s}`);
                const distNeta = distVal ? limpiarNum(distVal.value || "0") : 0;
                if (distVal) tDistTotal += distNeta;

                const descuentoSemana = descuentosDisponiblesExport ? calcularTotalDescuentosSemana(s, true) : 0;
                if (descuentoSemana > 0) semanasConDescuentoExport++;
                tDescuentoTotal += descuentoSemana;

                const dias = parseFloat(document.getElementById(`dias-${s}`)?.value) || 0;
                const cupos = parseFloat(document.getElementById(`cupos-${s}`)?.value) || 0;
                const racionesSemana = dias * cupos;
                racionesPorSemana[s] = {
                    dias: dias,
                    cupos: cupos,
                    raciones: racionesSemana,
                    presupuesto: dias * cupos * valorCupoBase,
                    distNeta: distNeta,
                    distBruta: distNeta + descuentoSemana,
                    descuento: descuentoSemana
                };
                totalRacionesMes += racionesSemana;

                productosBase.forEach((p, i) => {
                    const cantInput = document.getElementById(`cant-${s}-${i}`);
                    const valInput = document.getElementById(`val-${s}-${i}`);
                    
                    if (!cantInput || !valInput) return;

                    const cant = parseFloat(cantInput.value) || 0;
                    const val = limpiarNum(valInput.value);

                    if (cant > 0) {
                        totalesPorProducto[p.nombre].cantidad += cant;
                        totalesPorProducto[p.nombre].valor += val;

                        if (p.cl) tProdCL += val;
                        else tProdOtros += val;
                    }
                });
            }

            const totalGeneral = tPresTotal;
            const porcCLTotal = totalGeneral > 0 ? (tProdCL / totalGeneral * 100).toFixed(2) : 0;
            const porcOtrosTotal = totalGeneral > 0 ? (tProdOtros / totalGeneral * 100).toFixed(2) : 0;
            const porcDistTotal = totalGeneral > 0 ? (tDistTotal / totalGeneral * 100).toFixed(2) : 0;

            // HOJA 1: CONFIGURACIÓN
            const wsConfig = [
                ["ZAN - TABLA DE VALORES"],
                ["Fecha exportación:", new Date().toLocaleString('es-CO')],
                ["Mes:", mes],
                ["Contrato:", contrato],
                ["Semanas ejecutadas:", semanas],
                ["Valor cupo HCB:", valorCupoBase],
                [],
                ["TOTALES RESUMEN"],
                ["Presupuesto Total Mes:", totalGeneral, "100%"],
                ["Compras Locales (CL):", tProdCL, porcCLTotal + "%"],
                ["Otros Productos:", tProdOtros, porcOtrosTotal + "%"],
                ["Distribuidora (neta, con descuento aplicado):", tDistTotal, porcDistTotal + "%"],
                ["Total Raciones Mes:", totalRacionesMes],
                ["Suma Verificación:", tProdCL + tProdOtros + tDistTotal, "Debe ser igual al Presupuesto"],
                [],
                ["DESCUENTO POR NOVEDADES (SISTEMA SEMANAL)"],
                ["¿Se aplicó descuento?:", tDescuentoTotal > 0 ? "SÍ" : "NO"],
                ["Estado del descuento global:", descuentosActivosGlobalExport ? "ACTIVADO" : "DESACTIVADO"],
                ["Total descontado de Distribuidora:", tDescuentoTotal],
                ["Semanas con descuento aplicado:", `${semanasConDescuentoExport} / ${semanas}`],
                ["Detalle completo:", "ver hoja 'Novedades y Descuentos'"],
                [],
                ["PROVEEDORES CONFIGURADOS"],
                ["ID", "Nombre", "Sigla", "Color", "Orden"]
            ];

            getProveedoresOrdenados().forEach(p => {
                wsConfig.push([p.id, p.nombre, generarSigla(p.nombre), p.color, p.orden]);
            });

            wsConfig.push([], ["PRODUCTOS CONFIGURADOS"], ["Nombre", "Precio", "ProveedorID", "Proveedor", "CL", "Unidad"]);
            productosBase.forEach(p => {
                const prov = getProveedorById(p.proveedor);
                wsConfig.push([p.nombre, p.precio, p.proveedor, prov ? prov.nombre : 'SIN PROV', p.cl ? 'SI' : 'NO', detectarUnidad(p.nombre)]);
            });

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsConfig), "Configuración");

            // HOJA 2: DATOS SEMANALES
            const wsData = [["SEMANA", "DÍAS", "CUPOS", "RACIONES", "PRESUPUESTO", "PROVEEDOR", "SIGLA", "FACTURA", "PRODUCTO", "CANTIDAD", "VALOR_UNIT", "VALOR_TOTAL", "CL", "%_DEL_PRESUPUESTO_SEMANA", "DISTRIBUIDORA_BRUTA", "DESCUENTO_NOVEDADES", "DISTRIBUIDORA_NETA", "DESCUENTO_APLICADO"]];

            for (let s = 1; s <= semanas; s++) {
                const dias = document.getElementById(`dias-${s}`)?.value || "0";
                const cupos = document.getElementById(`cupos-${s}`)?.value || "0";
                const raciones = parseFloat(dias) * parseFloat(cupos);
                const presupuesto = limpiarNum(document.getElementById(`pres-${s}`)?.textContent || "0");
                const rSemana = racionesPorSemana[s] || { distNeta: 0, distBruta: 0, descuento: 0 };
                const distribuidoraNeta = rSemana.distNeta;
                const distribuidoraBruta = rSemana.distBruta;
                const descuentoSemana = rSemana.descuento;

                getProveedoresOrdenados().forEach(prov => {
                    const productosProv = getProductosByProveedor(prov.id);
                    productosProv.forEach(p => {
                        const globalIdx = productosBase.findIndex(pb => pb.nombre === p.nombre);
                        const fac = document.getElementById(`fac-${s}-${globalIdx}`)?.value || "";
                        const cant = parseFloat(document.getElementById(`cant-${s}-${globalIdx}`)?.value) || 0;
                        const valUnit = parseFloat(document.getElementById(`punit-${s}-${globalIdx}`)?.value) || p.precio;
                        const valTotal = limpiarNum(document.getElementById(`val-${s}-${globalIdx}`)?.value || "0");

                        if (cant > 0 || fac) {
                            const porcDelPresupuesto = presupuesto > 0 ? ((valTotal / presupuesto) * 100).toFixed(2) : 0;
                            
                            wsData.push([
                                s, dias, cupos, raciones, presupuesto,
                                prov.nombre, generarSigla(prov.nombre), fac, p.nombre,
                                cant, valUnit, valTotal, p.cl ? 'SI' : 'NO',
                                porcDelPresupuesto + '%', distribuidoraBruta, descuentoSemana,
                                distribuidoraNeta, descuentoSemana > 0 ? 'SI' : 'NO'
                            ]);
                        }
                    });
                });
            }

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Datos Semanales");

            // HOJA 3: RESUMEN POR PRODUCTO
            const wsResumen = [["PROVEEDOR", "SIGLA", "PRODUCTO", "UNIDAD", "CANTIDAD_TOTAL", "VALOR_TOTAL", "CL", "%_DEL_PRESUPUESTO_TOTAL", "%_CL_ACUMULADO"]];
            
            let acumuladoCL = 0;

            getProveedoresOrdenados().forEach(prov => {
                const productosProv = Object.entries(totalesPorProducto)
                    .filter(([_, datos]) => datos.proveedor === prov.id && datos.cantidad > 0)
                    .sort((a, b) => b[1].valor - a[1].valor);

                productosProv.forEach(([nombre, datos]) => {
                    const porcentaje = totalGeneral > 0 ? (datos.valor / totalGeneral * 100).toFixed(2) : 0;
                    
                    if (datos.cl) {
                        acumuladoCL += parseFloat(porcentaje);
                    }
                    
                    wsResumen.push([
                        prov.nombre,
                        generarSigla(prov.nombre),
                        nombre,
                        datos.unidad,
                        datos.cantidad,
                        datos.valor,
                        datos.cl ? 'SI' : 'NO',
                        porcentaje + '%',
                        datos.cl ? acumuladoCL.toFixed(2) + '%' : 'N/A'
                    ]);
                });
            });

            wsResumen.push([
                'DISTRIBUIDORA',
                'DIST',
                'Valor no asignado a productos (neto, con descuento aplicado)',
                'N/A',
                0,
                tDistTotal,
                'NO',
                porcDistTotal + '%',
                'N/A'
            ]);

            if (tDescuentoTotal > 0) {
                wsResumen.push([
                    'DESCUENTO NOVEDADES',
                    'DESC',
                    `Ya restado de Distribuidora (${semanasConDescuentoExport} semana${semanasConDescuentoExport !== 1 ? 's' : ''})`,
                    'N/A',
                    0,
                    -tDescuentoTotal,
                    'NO',
                    totalGeneral > 0 ? '-' + (tDescuentoTotal / totalGeneral * 100).toFixed(2) + '%' : 'N/A',
                    'N/A'
                ]);
            }

            wsResumen.push([]);
            wsResumen.push(["TOTALES", "", "", "", "", totalGeneral, "", "100%", porcCLTotal + "%"]);
            wsResumen.push(["", "", "", "", "", "", "", "", ""]);
            wsResumen.push(["DESGLOSE", "VALOR", "% DEL TOTAL", "RACIONES", "", "", "", "", ""]);
            wsResumen.push(["Compras Locales (CL)", tProdCL, porcCLTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Otros Productos", tProdOtros, porcOtrosTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Distribuidora (neta)", tDistTotal, porcDistTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Descuento Novedades (aplicado)", tDescuentoTotal > 0 ? -tDescuentoTotal : 0, tDescuentoTotal > 0 && totalGeneral > 0 ? '-' + (tDescuentoTotal / totalGeneral * 100).toFixed(2) + '%' : '0%', "", "", "", "", "", ""]);
            wsResumen.push(["Total Raciones Mes", "", "", totalRacionesMes, "", "", "", "", ""]);
            wsResumen.push(["TOTAL VERIFICACIÓN", tProdCL + tProdOtros + tDistTotal, (parseFloat(porcCLTotal) + parseFloat(porcOtrosTotal) + parseFloat(porcDistTotal)).toFixed(2) + "%", "", "", "", "", "", ""]);

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsResumen), "Resumen por Producto");

            // HOJA 4: RESUMEN DE RACIONES
            const wsRaciones = [["SEMANA", "DÍAS", "CUPOS", "RACIONES", "PRESUPUESTO", "VALOR_CUPO_HCB", "¿DESCUENTO_APLICADO?", "VALOR_DESCUENTO", "DISTRIBUIDORA_NETA"]];
            
            for (let s = 1; s <= semanas; s++) {
                const r = racionesPorSemana[s] || { dias: 0, cupos: 0, raciones: 0, presupuesto: 0, descuento: 0, distNeta: 0 };
                wsRaciones.push([s, r.dias, r.cupos, r.raciones, r.presupuesto, valorCupoBase, r.descuento > 0 ? 'SI' : 'NO', r.descuento, r.distNeta]);
            }
            
            wsRaciones.push([]);
            wsRaciones.push(["TOTALES", "", "", totalRacionesMes, tPresTotal, "", semanasConDescuentoExport > 0 ? 'SI' : 'NO', tDescuentoTotal, tDistTotal]);
            wsRaciones.push(["Promedio raciones/semana", "", "", semanas > 0 ? (totalRacionesMes / semanas).toFixed(2) : 0, "", "", "", "", ""]);

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsRaciones), "Resumen Raciones");

            // HOJA 4B: NOVEDADES Y DESCUENTOS (detalle del sistema de descuento semanal)
            if (descuentosDisponiblesExport) {
                const wsDescuentos = [[
                    "SEMANA", "TIPO_NOVEDAD", "DÍAS", "CUPOS/NIÑOS_AFECTADOS", "RACIONES_AFECTADAS",
                    "VALOR_RACIÓN", "VALOR_DESCUENTO", "¿ACTIVO?", "¿APLICA_A_DISTRIBUIDORA?", "NOTA"
                ]];

                for (let s = 1; s <= semanas; s++) {
                    const items = (typeof getDescuentosSemana === 'function') ? getDescuentosSemana(s) : [];
                    items.forEach(d => {
                        const info = (typeof TIPOS_DESCUENTO !== 'undefined' && TIPOS_DESCUENTO[d.tipo]) ? TIPOS_DESCUENTO[d.tipo].label : d.tipo;
                        const racionesItem = (parseFloat(d.dias) || 0) * (parseFloat(d.cupos) || 0);
                        const valorItem = (typeof calcularValorDescuento === 'function') ? calcularValorDescuento(d) : 0;
                        wsDescuentos.push([
                            s, info, d.dias, d.cupos, racionesItem, d.valorRacion, valorItem,
                            d.activo ? 'SI' : 'NO',
                            (d.activo && descuentosActivosGlobalExport) ? 'SI' : 'NO',
                            d.nota || ''
                        ]);
                    });
                }

                if (wsDescuentos.length === 1) {
                    wsDescuentos.push(["Sin novedades registradas en este archivo.", "", "", "", "", "", "", "", "", ""]);
                } else {
                    wsDescuentos.push([]);
                    wsDescuentos.push(["Estado descuento global:", descuentosActivosGlobalExport ? "ACTIVADO" : "DESACTIVADO"]);
                    wsDescuentos.push(["TOTAL DESCONTADO DE DISTRIBUIDORA:", "", "", "", "", "", tDescuentoTotal]);
                    wsDescuentos.push(["Semanas con descuento aplicado:", `${semanasConDescuentoExport} / ${semanas}`]);
                }

                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsDescuentos), "Novedades y Descuentos");
            }

            // HOJA 5: VALIDACIÓN DE FACTURAS
            const wsFacturas = [["PROVEEDOR", "SIGLA", "FACTURA", "PRODUCTO", "UNIDAD", "CANTIDAD_TOTAL", "VALOR_TOTAL", "SEMANAS"]];
            
            let datosPorProveedor = {};
            getProveedoresOrdenados().forEach(prov => {
                datosPorProveedor[prov.id] = { proveedor: prov, facturas: {} };
            });
            
            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const fac = document.getElementById(`fac-${s}-${i}`)?.value?.trim();
                    const val = limpiarNum(document.getElementById(`val-${s}-${i}`)?.value || "0");
                    const cant = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    
                    if (fac && val > 0) {
                        const provId = p.proveedor;
                        if (!datosPorProveedor[provId].facturas[fac]) {
                            datosPorProveedor[provId].facturas[fac] = {
                                numero: fac,
                                productos: {},
                                semanas: new Set()
                            };
                        }
                        
                        if (!datosPorProveedor[provId].facturas[fac].productos[p.nombre]) {
                            datosPorProveedor[provId].facturas[fac].productos[p.nombre] = {
                                nombre: p.nombre,
                                unidad: detectarUnidad(p.nombre),
                                cantidad: 0,
                                valor: 0
                            };
                        }
                        
                        datosPorProveedor[provId].facturas[fac].productos[p.nombre].cantidad += cant;
                        datosPorProveedor[provId].facturas[fac].productos[p.nombre].valor += val;
                        datosPorProveedor[provId].facturas[fac].semanas.add(s);
                    }
                });
            }
            
            Object.entries(datosPorProveedor).forEach(([provId, datosProv]) => {
                Object.entries(datosProv.facturas).forEach(([numFactura, factura]) => {
                    const prov = datosProv.proveedor;
                    const semanasUnicas = [...factura.semanas].sort((a,b) => a-b).join(', ');
                    
                    Object.values(factura.productos).forEach(prod => {
                        wsFacturas.push([
                            prov.nombre,
                            generarSigla(prov.nombre),
                            numFactura,
                            prod.nombre,
                            prod.unidad,
                            prod.cantidad,
                            prod.valor,
                            semanasUnicas
                        ]);
                    });
                });
            });

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsFacturas), "Validación Facturas");

            XLSX.writeFile(wb, `ZAN_Completo_${mes}_${contrato}.xlsx`);
        }

        // ===== EXPORTACIONES CONTABLES =====
        function exportarContabilidadCSV() {
            const datos = generarDatosContabilidad();
            
            let csv = "FECHA;MES;CONTRATO;SEMANA;PROVEEDOR;SIGLA;FACTURA;PRODUCTO;UNIDAD;CANTIDAD;VALOR_UNITARIO;VALOR_TOTAL;COMPRA_LOCAL\n";
            const fecha = new Date().toLocaleDateString('es-CO');

            datos.facturas.forEach(f => {
                csv += `${fecha};${datos.mes};${datos.contrato};${f.semana};${f.proveedor};${f.sigla};${f.factura};${f.producto};${f.unidad};${f.cantidad};${f.valorUnitario};${f.valorTotal};${f.compraLocal}\n`;
            });

            csv += "\nRESUMEN POR PROVEEDOR\n";
            csv += "PROVEEDOR;SIGLA;TOTAL_FACTURAS;CANTIDAD_ITEMS;MONTO_TOTAL\n";
            
            for (let provId in datos.porProveedor) {
                const prov = datos.porProveedor[provId];
                if (prov.total > 0) {
                    csv += `${prov.nombre};${prov.sigla};${prov.facturas.size};${prov.items};${prov.total}\n`;
                }
            }

            csv += `\nTOTAL GENERAL;;;${datos.totalItems};${datos.montoTotal}\n`;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Contabilidad_${datos.mes}_${datos.contrato}.csv`;
            link.click();
        }

        function exportarContabilidadExcel() {
            const datos = generarDatosContabilidad();
            const wb = XLSX.utils.book_new();

            const wsData = [["FECHA", "MES", "CONTRATO", "SEMANA", "PROVEEDOR", "SIGLA", "FACTURA", "PRODUCTO", "UNIDAD", "CANTIDAD", "VALOR_UNIT", "VALOR_TOTAL", "COMPRA_LOCAL"]];
            const fecha = new Date().toLocaleDateString('es-CO');
            
            datos.facturas.forEach(f => {
                wsData.push([fecha, datos.mes, datos.contrato, f.semana, f.proveedor, f.sigla, f.factura, f.producto, f.unidad, f.cantidad, f.valorUnitario, f.valorTotal, f.compraLocal]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Detalle");

            const wsRes = [["PROVEEDOR", "SIGLA", "TOTAL_FACTURAS", "CANTIDAD_ITEMS", "MONTO_TOTAL"]];
            for (let provId in datos.porProveedor) {
                const prov = datos.porProveedor[provId];
                if (prov.total > 0) wsRes.push([prov.nombre, prov.sigla, prov.facturas.size, prov.items, prov.total]);
            }
            wsRes.push(["TOTAL GENERAL", "", "", datos.totalItems, datos.montoTotal]);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsRes), "Resumen");

            const wsProd = [["PROVEEDOR", "PRODUCTO", "UNIDAD", "CANTIDAD_TOTAL", "VALOR_TOTAL", "CL"]];
            datos.porProducto.forEach(p => {
                wsProd.push([p.proveedor, p.producto, p.unidad, p.cantidad, p.valor, p.cl]);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsProd), "Por Producto");

            XLSX.writeFile(wb, `Contabilidad_${datos.mes}_${datos.contrato}.xlsx`);
        }

        function exportarFacturasCSV() {
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            const mes = document.getElementById('main-mes').value;
            const contrato = document.getElementById('main-contrato').value;
            
            let datosPorProveedor = {};
            
            getProveedoresOrdenados().forEach(prov => {
                datosPorProveedor[prov.id] = {
                    proveedor: prov,
                    facturas: {}
                };
            });
            
            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const facInput = document.getElementById(`fac-${s}-${i}`);
                    const valInput = document.getElementById(`val-${s}-${i}`);
                    
                    if (!facInput || !valInput) return;
                    
                    const numFactura = facInput.value?.trim();
                    const valor = limpiarNum(valInput.value);
                    const cantidad = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    
                    if (numFactura && valor > 0) {
                        const provId = p.proveedor;
                        
                        if (!datosPorProveedor[provId].facturas[numFactura]) {
                            datosPorProveedor[provId].facturas[numFactura] = {
                                numero: numFactura,
                                productos: {},
                                total: 0,
                                semanas: new Set()
                            };
                        }
                        
                        const factura = datosPorProveedor[provId].facturas[numFactura];
                        
                        if (!factura.productos[p.nombre]) {
                            factura.productos[p.nombre] = {
                                nombre: p.nombre,
                                unidad: detectarUnidad(p.nombre),
                                cantidadTotal: 0,
                                valorTotal: 0
                            };
                        }
                        
                        factura.productos[p.nombre].cantidadTotal += cantidad;
                        factura.productos[p.nombre].valorTotal += valor;
                        factura.total += valor;
                        factura.semanas.add(s);
                    }
                });
            }
            
            let csv = "MES;CONTRATO;PROVEEDOR;SIGLA;FACTURA;PRODUCTO;UNIDAD;CANTIDAD_TOTAL;VALOR_TOTAL;SEMANAS\n";
            
            Object.entries(datosPorProveedor).forEach(([provId, datosProv]) => {
                Object.entries(datosProv.facturas).forEach(([numFactura, factura]) => {
                    const prov = datosProv.proveedor;
                    const semanasUnicas = [...factura.semanas].sort((a,b) => a-b).join('-');
                    
                    Object.values(factura.productos).forEach(prod => {
                        csv += `${mes};${contrato};${prov.nombre};${generarSigla(prov.nombre)};${numFactura};${prod.nombre};${prod.unidad};${prod.cantidadTotal};${prod.valorTotal};${semanasUnicas}\n`;
                    });
                });
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Facturas_${mes}_${contrato}.csv`;
            link.click();
        }

        function exportarFacturasExcel() {
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            const mes = document.getElementById('main-mes').value;
            const contrato = document.getElementById('main-contrato').value;
            
            const wb = XLSX.utils.book_new();
            
            const wsResumen = [["MES", "CONTRATO", "PROVEEDOR", "SIGLA", "FACTURA", "PRODUCTO", "UNIDAD", "CANTIDAD_TOTAL", "VALOR_TOTAL", "SEMANAS"]];
            
            let datosPorProveedor = {};
            
            getProveedoresOrdenados().forEach(prov => {
                datosPorProveedor[prov.id] = {
                    proveedor: prov,
                    facturas: {}
                };
            });
            
            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const facInput = document.getElementById(`fac-${s}-${i}`);
                    const valInput = document.getElementById(`val-${s}-${i}`);
                    
                    if (!facInput || !valInput) return;
                    
                    const numFactura = facInput.value?.trim();
                    const valor = limpiarNum(valInput.value);
                    const cantidad = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    
                    if (numFactura && valor > 0) {
                        const provId = p.proveedor;
                        
                        if (!datosPorProveedor[provId].facturas[numFactura]) {
                            datosPorProveedor[provId].facturas[numFactura] = {
                                numero: numFactura,
                                productos: {},
                                total: 0,
                                semanas: new Set()
                            };
                        }
                        
                        const factura = datosPorProveedor[provId].facturas[numFactura];
                        
                        if (!factura.productos[p.nombre]) {
                            factura.productos[p.nombre] = {
                                nombre: p.nombre,
                                unidad: detectarUnidad(p.nombre),
                                cantidadTotal: 0,
                                valorTotal: 0
                            };
                        }
                        
                        factura.productos[p.nombre].cantidadTotal += cantidad;
                        factura.productos[p.nombre].valorTotal += valor;
                        factura.total += valor;
                        factura.semanas.add(s);
                    }
                });
            }
            
            Object.entries(datosPorProveedor).forEach(([provId, datosProv]) => {
                Object.entries(datosProv.facturas).forEach(([numFactura, factura]) => {
                    const prov = datosProv.proveedor;
                    const semanasUnicas = [...factura.semanas].sort((a,b) => a-b).join(', ');
                    
                    Object.values(factura.productos).forEach(prod => {
                        wsResumen.push([
                            mes, contrato, prov.nombre, generarSigla(prov.nombre),
                            numFactura, prod.nombre, prod.unidad,
                            prod.cantidadTotal, prod.valorTotal, semanasUnicas
                        ]);
                    });
                });
            });
            
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsResumen), "Resumen Facturas");

            const wsDetalle = [["PROVEEDOR", "FACTURA", "PRODUCTO", "SEMANA", "CANTIDAD", "VALOR"]];
            
            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const fac = document.getElementById(`fac-${s}-${i}`)?.value?.trim();
                    const val = limpiarNum(document.getElementById(`val-${s}-${i}`)?.value || "0");
                    const cant = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    
                    if (fac && val > 0) {
                        wsDetalle.push([
                            getProveedorById(p.proveedor)?.nombre || 'N/A',
                            fac,
                            p.nombre,
                            s,
                            cant,
                            val
                        ]);
                    }
                });
            }
            
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsDetalle), "Detalle por Semana");
            
            XLSX.writeFile(wb, `Facturas_${mes}_${contrato}.xlsx`);
        }

        function generarDatosContabilidad() {
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            const mes = document.getElementById('main-mes').value;
            const contrato = document.getElementById('main-contrato').value;

            let datos = {
                mes, contrato, totalFacturas: 0, montoTotal: 0, totalItems: 0,
                porProveedor: {}, porProducto: [], facturas: []
            };

            getProveedoresOrdenados().forEach(prov => {
                datos.porProveedor[prov.id] = {
                    nombre: prov.nombre,
                    sigla: generarSigla(prov.nombre),
                    total: 0,
                    facturas: new Set(),
                    items: 0
                };
            });

            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const fac = document.getElementById(`fac-${s}-${i}`)?.value?.trim();
                    const cant = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    const val = limpiarNum(document.getElementById(`val-${s}-${i}`)?.value || "0");

                    if (fac && cant > 0) {
                        datos.totalFacturas++;
                        datos.totalItems += cant;
                        datos.montoTotal += val;

                        const prov = datos.porProveedor[p.proveedor];
                        if (prov) {
                            prov.total += val;
                            prov.facturas.add(fac);
                            prov.items += cant;
                        }

                        datos.facturas.push({
                            semana: s,
                            proveedor: getProveedorById(p.proveedor)?.nombre || 'SIN PROV',
                            sigla: generarSigla(getProveedorById(p.proveedor)?.nombre || 'SIN'),
                            factura: fac,
                            producto: p.nombre,
                            unidad: detectarUnidad(p.nombre),
                            cantidad: cant,
                            valorUnitario: p.precio,
                            valorTotal: val,
                            compraLocal: p.cl ? 'SI' : 'NO'
                        });
                    }
                });
            }

            let prodMap = {};
            productosBase.forEach(p => {
                prodMap[p.nombre] = {
                    producto: p.nombre,
                    proveedor: getProveedorById(p.proveedor)?.nombre || 'SIN PROV',
                    unidad: detectarUnidad(p.nombre),
                    cantidad: 0,
                    valor: 0,
                    cl: p.cl ? 'SI' : 'NO'
                };
            });

            for (let s = 1; s <= semanas; s++) {
                productosBase.forEach((p, i) => {
                    const cant = parseFloat(document.getElementById(`cant-${s}-${i}`)?.value) || 0;
                    const val = limpiarNum(document.getElementById(`val-${s}-${i}`)?.value || "0");
                    if (cant > 0) {
                        prodMap[p.nombre].cantidad += cant;
                        prodMap[p.nombre].valor += val;
                    }
                });
            }

            datos.porProducto = Object.values(prodMap).filter(p => p.cantidad > 0);

            return datos;
        }

        // ===== IMPORTACIÓN COMPLETA =====
		function importarExcel(input) {
    if (!input.files[0]) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            console.log("Hojas disponibles:", workbook.SheetNames);
            
            // ===== FUNCIÓN AUXILIAR PARA PARSEAR DECIMALES =====
            function parseDecimal(valor) {
                if (valor === undefined || valor === null || valor === "") return 0;
                
                // Si ya es número, retornarlo directamente
                if (typeof valor === 'number') {
                    return valor;
                }
                
                // Si es string, procesarlo
                let str = String(valor).trim();
                
                // Detectar formato: si tiene coma y punto, determinar cuál es decimal
                const tieneComa = str.includes(',');
                const tienePunto = str.includes('.');
                
                if (tieneComa && tienePunto) {
                    const ultimaComa = str.lastIndexOf(',');
                    const ultimoPunto = str.lastIndexOf('.');
                    
                    if (ultimaComa > ultimoPunto) {
                        // Formato europeo: 1.234,56 → 1234.56
                        str = str.replace(/\./g, '').replace(',', '.');
                    } else {
                        // Formato americano: 1,234.56 → 1234.56
                        str = str.replace(/,/g, '');
                    }
                } else if (tieneComa && !tienePunto) {
                    // Podría ser: 12,34 (decimal) o 1234 (miles sin punto)
                    const partes = str.split(',');
                    if (partes.length === 2 && partes[1].length <= 2 && partes[1].length > 0) {
                        // Es decimal: 12,34 → 12.34
                        str = str.replace(',', '.');
                    } else {
                        // Es separador de miles: 1,234 → 1234
                        str = str.replace(/,/g, '');
                    }
                } else if (tienePunto && !tieneComa) {
                    // Podría ser: 12.34 (decimal) o 1.234 (miles)
                    const partes = str.split('.');
                    if (partes.length === 2 && partes[1].length <= 2 && partes[1].length > 0) {
                        // Es decimal: 12.34 → 12.34 (ya está bien)
                    } else {
                        // Es separador de miles: 1.234 → 1234
                        str = str.replace(/\./g, '');
                    }
                }
                
                return parseFloat(str) || 0;
            }
            
            // ===== 1. CARGAR CONFIGURACIÓN =====
            const wsConfig = workbook.Sheets["Configuración"];
            if (wsConfig) {
                const configData = XLSX.utils.sheet_to_json(wsConfig, { 
                    header: 1, 
                    defval: "",
                    raw: true 
                });
                
                console.log("Datos de configuración:", configData);
                
                let nuevosProveedores = [];
                let nuevosProductos = [];
                let enSeccionProveedores = false;
                let enSeccionProductos = false;
                let filaHeadersProveedores = -1;
                let filaHeadersProductos = -1;
                
                configData.forEach((fila, idx) => {
                    if (!fila || fila.length === 0) return;
                    
                    const primeraCelda = String(fila[0] || "").toUpperCase().trim();
                    
                    if (primeraCelda.includes("PROVEEDORES CONFIGURADOS") || 
                        (primeraCelda === "ID" && fila[1] === "Nombre")) {
                        enSeccionProveedores = true;
                        enSeccionProductos = false;
                        filaHeadersProveedores = idx;
                        return;
                    }
                    
                    if (primeraCelda.includes("PRODUCTOS CONFIGURADOS") ||
                        (primeraCelda === "Nombre" && fila[1] === "Precio")) {
                        enSeccionProveedores = false;
                        enSeccionProductos = true;
                        filaHeadersProductos = idx;
                        return;
                    }
                    
                    if (primeraCelda === "MES:" || primeraCelda === "MES") {
                        const valorMes = fila[1];
                        if (valorMes) document.getElementById('main-mes').value = valorMes;
                    }
                    if (primeraCelda === "CONTRATO:" || primeraCelda === "CONTRATO") {
                        const valorContrato = fila[1];
                        if (valorContrato) document.getElementById('main-contrato').value = String(valorContrato);
                    }
                    if (primeraCelda === "SEMANAS EJECUTADAS:" || primeraCelda === "SEMANAS EJECUTADAS") {
                        const valorSemanas = parseInt(fila[1]) || 4;
                        document.getElementById('num-semanas').value = valorSemanas;
                    }
                    if (primeraCelda === "VALOR CUPO HCB:" || primeraCelda === "VALOR CUPO HCB") {
                        valorCupoBase = parseFloat(fila[1]) || 8094;
                    }
                    
                    if (enSeccionProveedores && idx > filaHeadersProveedores && fila[0] && fila[0] !== "ID") {
                        const id = fila[0];
                        const nombre = fila[1];
                        const color = fila[3] || '#666666';
                        const orden = parseInt(fila[4]) || nuevosProveedores.length;
                        
                        if (id && nombre) {
                            nuevosProveedores.push({
                                id: String(id),
                                nombre: String(nombre),
                                color: String(color),
                                orden: orden
                            });
                        }
                    }
                    
                    if (enSeccionProductos && idx > filaHeadersProductos && fila[0] && fila[0] !== "Nombre") {
                        const nombre = fila[0];
                        const precio = parseDecimal(fila[1]);
                        const proveedorId = fila[2];
                        const cl = fila[4] === 'SI' || fila[4] === true || fila[4] === 1;
                        
                        if (nombre) {
                            nuevosProductos.push({
                                nombre: String(nombre),
                                precio: precio,
                                proveedor: proveedorId ? String(proveedorId) : null,
                                cl: cl
                            });
                        }
                    }
                });
                
                if (nuevosProveedores.length > 0) {
                    proveedores = nuevosProveedores.sort((a, b) => a.orden - b.orden);
                    console.log("Proveedores cargados:", proveedores);
                }
                
                if (nuevosProductos.length > 0) {
                    const provIdsValidos = new Set(proveedores.map(p => p.id));
                    
                    productosBase = nuevosProductos.map(p => {
                        let provAsignado = p.proveedor;
                        
                        if (!provAsignado || !provIdsValidos.has(provAsignado)) {
                            console.warn(`Proveedor ${p.proveedor} no encontrado para producto ${p.nombre}, asignando al primero disponible`);
                            provAsignado = proveedores[0]?.id || null;
                        }
                        
                        return {
                            nombre: p.nombre,
                            precio: p.precio,
                            proveedor: provAsignado,
                            cl: p.cl
                        };
                    }).filter(p => p.proveedor !== null);
                    
                    console.log("Productos cargados:", productosBase);
                }
            }
            
            // ===== 2. REINICIALIZAR GRID CON NUEVA CONFIGURACIÓN =====
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            initGrid(false);
            
            // ===== 3. CARGAR DATOS SEMANALES =====
            const wsData = workbook.Sheets["Datos Semanales"];
            if (wsData) {
                const rows = XLSX.utils.sheet_to_json(wsData, { 
                    header: 1, 
                    defval: "",
                    raw: false
                });
                
                console.log("Datos semanales - primeras filas:", rows.slice(0, 10));
                
                const IDX_SEMANA = 0;
                const IDX_DIAS = 1;
                const IDX_CUPOS = 2;
                const IDX_FACTURA = 7;
                const IDX_PRODUCTO = 8;
                const IDX_CANTIDAD = 9;
                const IDX_VALOR_UNIT = 10;
                const IDX_VALOR_TOTAL = 11;
                
                let datosPorSemana = {};
                
                rows.forEach((fila, idx) => {
                    if (!fila || fila.length < 9) return;
                    if (idx === 0) return;
                    
                    const semanaRaw = fila[IDX_SEMANA];
                    const semana = parseInt(semanaRaw);
                    
                    if (!semana || isNaN(semana) || semana < 1 || semana > 5) {
                        return;
                    }
                    
                    if (!datosPorSemana[semana]) {
                        datosPorSemana[semana] = {
                            dias: fila[IDX_DIAS],
                            cupos: fila[IDX_CUPOS],
                            items: []
                        };
                    }
                    
                    const nombreProducto = String(fila[IDX_PRODUCTO] || "").trim();
                    const factura = String(fila[IDX_FACTURA] || "").trim();
                    
                    const cantidad = parseDecimal(fila[IDX_CANTIDAD]);
                    const valorTotal = parseDecimal(fila[IDX_VALOR_TOTAL]);
                    const valorUnit = parseDecimal(fila[IDX_VALOR_UNIT]);
                    
                    console.log(`Fila ${idx}: "${fila[IDX_CANTIDAD]}" -> ${cantidad}, "${fila[IDX_VALOR_TOTAL]}" -> ${valorTotal}`);
                    
                    let valorUnitFinal = valorUnit;
                    if (valorUnitFinal === 0 && cantidad > 0 && valorTotal > 0) {
                        valorUnitFinal = valorTotal / cantidad;
                    }
                    
                    if (nombreProducto && (cantidad > 0 || factura || valorTotal > 0)) {
                        datosPorSemana[semana].items.push({
                            producto: nombreProducto,
                            factura: factura,
                            cantidad: cantidad,
                            valorTotal: valorTotal,
                            valorUnit: valorUnitFinal
                        });
                    }
                });
                
                console.log("Datos por semana procesados:", datosPorSemana);
                
                // Cargar datos en el grid
                for (let s = 1; s <= semanas; s++) {
                    const datosSem = datosPorSemana[s];
                    if (!datosSem) {
                        console.log(`No hay datos para semana ${s}`);
                        continue;
                    }
                    
                    // Cargar días y cupos
                    const diasInput = document.getElementById(`dias-${s}`);
                    const cuposInput = document.getElementById(`cupos-${s}`);
                    
                    if (diasInput && datosSem.dias !== undefined && datosSem.dias !== "") {
                        const diasValor = parseDecimal(datosSem.dias);
                        if (!isNaN(diasValor) && diasValor > 0) {
                            diasInput.value = diasValor;
                        }
                    }
                    
                    if (cuposInput && datosSem.cupos !== undefined && datosSem.cupos !== "") {
                        const cuposValor = parseDecimal(datosSem.cupos);
                        if (!isNaN(cuposValor) && cuposValor > 0) {
                            cuposInput.value = cuposValor;
                        }
                    }
                    
                    console.log(`Cargando ${datosSem.items.length} items en semana ${s}`);
                    
                    // Cargar cada producto
                    datosSem.items.forEach(item => {
                        const idxProducto = productosBase.findIndex(p => {
                            const nombreBase = p.nombre.trim().toLowerCase();
                            const nombreItem = item.producto.trim().toLowerCase();
                            return nombreBase === nombreItem || 
                                   nombreBase.replace(/\s+/g, '') === nombreItem.replace(/\s+/g, '');
                        });
                        
                        if (idxProducto !== -1) {
                            const facInput = document.getElementById(`fac-${s}-${idxProducto}`);
                            const cantInput = document.getElementById(`cant-${s}-${idxProducto}`);
                            const punitInput = document.getElementById(`punit-${s}-${idxProducto}`);
                            const valInput = document.getElementById(`val-${s}-${idxProducto}`);
                            
                            console.log(`Asignando a producto ${idxProducto} (${productosBase[idxProducto].nombre}):`, {
                                factura: item.factura,
                                cantidad: item.cantidad,
                                valorUnit: item.valorUnit,
                                valorTotal: item.valorTotal
                            });
                            
                            if (facInput) facInput.value = item.factura;
                            
                            // ===== CORRECCIÓN CRÍTICA: Asignar cantidad con decimales =====
                            if (cantInput) {
                                // El input type="number" requiere punto decimal, no coma
                                // toFixed(2) devuelve string con punto (ej: "12.34")
                                const cantidadFormateada = item.cantidad % 1 !== 0 
                                    ? item.cantidad.toFixed(2) 
                                    : String(item.cantidad);
                                
                                console.log(`Asignando cantidad: ${item.cantidad} -> "${cantidadFormateada}" al input`);
                                cantInput.value = cantidadFormateada;
                                
                                // Verificar que se asignó correctamente
                                setTimeout(() => {
                                    console.log(`Valor actual en input cant-${s}-${idxProducto}: "${cantInput.value}"`);
                                }, 0);
                            }
                            
                            if (punitInput) {
                                const precioAsignar = item.valorUnit > 0 ? item.valorUnit : productosBase[idxProducto].precio;
                                punitInput.value = precioAsignar;
                            }
                            
                            if (valInput && item.valorTotal > 0) {
                                valInput.value = formatter.format(item.valorTotal);
                            } else if (valInput && item.cantidad > 0) {
                                const precio = item.valorUnit > 0 ? item.valorUnit : productosBase[idxProducto].precio;
                                const totalCalculado = item.cantidad * precio;
                                valInput.value = formatter.format(totalCalculado);
                            }
                        } else {
                            console.warn(`Producto no encontrado en semana ${s}: "${item.producto}"`);
                            console.log("Productos disponibles:", productosBase.map(p => p.nombre));
                        }
                    });
                    
                    console.log(`Recalculando semana ${s}...`);
                    calcular(s);
                }
            }
            
            actualizarResumen();
            marcarCambio();
            
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            
            Toast.success(`Importación completada: ${proveedores.length} proveedores, ${productosBase.length} productos`, { title: 'Importación exitosa' });
            
        } catch (err) {
            console.error("Error en importación:", err);
            Toast.error('Error al importar: ' + err.message);
        }
    };
    
    reader.onerror = function(err) {
        console.error("Error leyendo archivo:", err);
        Toast.error("Error al leer el archivo");
    };
    
    reader.readAsBinaryString(input.files[0]);
}

        // ===== LIMPIAR TODO MEJORADO =====
        async function limpiarSemana(s) {
            if (!await zanConfirm({ title: `Limpiar Semana ${s}`, msg: 'Se borrarán todos los datos ingresados en esta semana.', tipo: 'danger', okLabel: 'Limpiar' })) return;
            
            productosBase.forEach((p, i) => {
                const fac = document.getElementById(`fac-${s}-${i}`);
                const cant = document.getElementById(`cant-${s}-${i}`);
                const punit = document.getElementById(`punit-${s}-${i}`);
                const val = document.getElementById(`val-${s}-${i}`);
                
                if (fac) fac.value = "";
                if (cant) cant.value = "";
                if (punit) punit.value = p.precio;
                if (val) val.value = "";
            });
            
            calcular(s);
            marcarCambio();
        }

        async function limpiarTodo() {
            if (!await zanConfirm({ title: 'Limpiar todo', msg: 'Se eliminarán todos los datos de semanas, días, cupos, contrato y configuración. Esta acción no se puede deshacer.', tipo: 'danger', okLabel: 'Limpiar todo' })) return;
            
            const semanas = parseInt(document.getElementById('num-semanas').value) || 4;
            
            document.getElementById('main-contrato').value = "";
            document.getElementById('main-mes').selectedIndex = 0;
            
            for (let s = 1; s <= semanas; s++) {
                const diasInput = document.getElementById(`dias-${s}`);
                const cuposInput = document.getElementById(`cupos-${s}`);
                if (diasInput) diasInput.value = "";
                if (cuposInput) cuposInput.value = "";
                
                productosBase.forEach((p, i) => {
                    const fac = document.getElementById(`fac-${s}-${i}`);
                    const cant = document.getElementById(`cant-${s}-${i}`);
                    const punit = document.getElementById(`punit-${s}-${i}`);
                    const val = document.getElementById(`val-${s}-${i}`);
                    
                    if (fac) fac.value = "";
                    if (cant) cant.value = "";
                    if (punit) punit.value = p.precio;
                    if (val) val.value = "";
                });
                
                calcular(s);
            }
            
            proveedores = JSON.parse(JSON.stringify(PROVEEDORES_INICIALES));
			productosBase = JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
			valorCupoBase = 8094;
			
			initGrid(false);
            
            localStorage.removeItem(`elite_draft_${currentUser}`);
            
            marcarCambio();
            actualizarResumen();
            
            Toast.success('Espacio de trabajo limpiado. Puedes empezar de nuevo.', { title: 'Limpieza completa' });
        }

