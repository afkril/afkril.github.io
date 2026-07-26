
        // ===== SISTEMA DE TOAST =====
        const Toast = (() => {
            const ICONS = {
                success: 'fa-solid fa-circle-check',
                error:   'fa-solid fa-circle-xmark',
                warning: 'fa-solid fa-triangle-exclamation',
                info:    'fa-solid fa-circle-info',
            };
            const TITLES = { success: 'Listo', error: 'Error', warning: 'Atención', info: 'Info' };
            let _idSeq = 0;

            function show(msg, tipo = 'info', opts = {}) {
                const {
                    title    = opts.title || TITLES[tipo] || 'Aviso',
                    duration = opts.duration ?? 3800,
                } = opts;

                const container = document.getElementById('zan-toast-container');
                const id = 'zt_' + (++_idSeq);

                const el = document.createElement('div');
                el.className = `zan-toast ${tipo}`;
                el.id = id;
                el.innerHTML = `
                    <span class="zan-toast-icon"><i class="${ICONS[tipo] || ICONS.info}"></i></span>
                    <div class="zan-toast-body">
                        <div class="zan-toast-title">${title}</div>
                        <div class="zan-toast-msg">${msg}</div>
                    </div>
                    <button class="zan-toast-close" onclick="Toast._remove('${id}')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="zan-toast-bar" style="animation-duration:${duration}ms"></div>
                `;
                container.appendChild(el);

                if (duration > 0) {
                    setTimeout(() => Toast._remove(id), duration);
                }
                return id;
            }

            function _remove(id) {
                const el = document.getElementById(id);
                if (!el || el.classList.contains('hiding')) return;
                el.classList.add('hiding');
                setTimeout(() => el.remove(), 320);
            }

            return {
                show,
                _remove,
                success: (msg, opts) => show(msg, 'success', opts),
                error:   (msg, opts) => show(msg, 'error',   opts),
                warning: (msg, opts) => show(msg, 'warning', opts),
                info:    (msg, opts) => show(msg, 'info',    opts),
            };
        })();

        // ===== MODAL DE CONFIRMACIÓN (reemplaza confirm()) =====
        function zanConfirm(opts) {
            return new Promise(resolve => {
                const {
                    title   = '¿Estás seguro?',
                    msg     = '',
                    tipo    = 'danger',
                    okLabel = 'Confirmar',
                    cancelLabel = 'Cancelar',
                } = (typeof opts === 'string') ? { msg: opts } : opts;

                const ICONS = { danger: 'fa-solid fa-trash', warning: 'fa-solid fa-triangle-exclamation', info: 'fa-solid fa-circle-question' };
                const overlay = document.getElementById('zan-confirm-overlay');
                document.getElementById('zan-confirm-icon').className    = `zan-confirm-icon ${tipo}`;
                document.getElementById('zan-confirm-icon-i').className  = ICONS[tipo] || ICONS.danger;
                document.getElementById('zan-confirm-title').textContent = title;
                document.getElementById('zan-confirm-msg').textContent   = msg;
                const okBtn = document.getElementById('zan-confirm-ok');
                okBtn.textContent = okLabel;
                okBtn.className   = `zan-confirm-btn confirm-${tipo}`;
                document.getElementById('zan-confirm-cancel').textContent = cancelLabel;

                overlay.classList.add('active');

                const cleanup = (result) => {
                    overlay.classList.remove('active');
                    okBtn.replaceWith(okBtn.cloneNode(true));       // remove old listener
                    document.getElementById('zan-confirm-cancel').replaceWith(
                        document.getElementById('zan-confirm-cancel').cloneNode(true)
                    );
                    resolve(result);
                };

                // Re-query after clone
                document.getElementById('zan-confirm-ok').addEventListener('click',     () => cleanup(true),  { once: true });
                document.getElementById('zan-confirm-cancel').addEventListener('click', () => cleanup(false), { once: true });
                overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); }, { once: true });
            });
        }
        
        const TUTORIAL_STEPS = {
			
            completo: [
                {
                    id: 'bienvenida',
                    title: '¡Bienvenido a ZAN!',
                    icon: 'fa-hand-wave',
                    content: 'Este es el sistema de gestión de compras y presupuestos. Te guiaré paso a paso por todas las funcionalidades principales.',
                    tip: 'Puedes acceder a este tutorial en cualquier momento desde el botón de ayuda (?) en la esquina inferior derecha.',
                    position: 'center'
                },
                {
                    id: 'semanas',
                    target: 'week-selector',
                    title: 'Configuración de Semanas',
                    icon: 'fa-calendar-week',
                    content: 'Aquí seleccionas cuántas semanas trabajarás en el mes. Puedes elegir entre 1 y 5 semanas según tu necesidad.',
                    tip: 'Cada semana es independiente y tiene su propio presupuesto calculado automáticamente.',
                    position: 'bottom'
                },
                {
                    id: 'mes-contrato',
                    target: 'contract-info',
                    title: 'Mes y Contrato',
                    icon: 'fa-file-contract',
                    content: 'Selecciona el mes de trabajo e ingresa el ID del contrato. Estos datos aparecerán en todos los reportes exportados.',
                    position: 'bottom'
                },
                {
                    id: 'tabla-semanal',
                    target: 'main-grid',
                    title: 'Tablas Semanales',
                    icon: 'fa-table',
                    content: 'Cada semana muestra los proveedores y sus productos. Ingresa: <strong>Factura</strong>, <strong>Cantidad</strong> y el sistema calcula el <strong>Total</strong> automáticamente.',
                    tip: 'Los badges muestran: CL (Compra Local) y las siglas del proveedor.',
                    position: 'top'
                },
                {
                    id: 'proveedores',
                    target: 'nav-proveedores',
                    title: 'Gestionar Proveedores',
                    icon: 'fa-truck-field',
                    content: 'Crea, edita y organiza tus proveedores. Puedes:<br>• Cambiar nombres y colores<br>• Reordenar con flechas<br>• Eliminar proveedores no usados',
                    tip: 'El orden de proveedores aquí se refleja en las tablas semanales.',
                    position: 'right',
                    action: () => toggleModal('modal-proveedores')
                },
                {
					id: 'productos',
					target: 'lista-productos-config',
					title: 'Listado de Productos',
					icon: 'fa-list-check',
					content: 'Administra todos los productos disponibles. Cada producto debe tener:<br>• <strong>Nombre</strong> (ej: Pollo Libra)<br>• <strong>Precio</strong> unitario<br>• <strong>Proveedor</strong> asignado<br>• Indicador <strong>CL</strong> (Compra Local)',
					tip: 'Los productos aparecerán automáticamente en las tablas de su proveedor asignado.',
					position: 'left',
					action: () => {
						document.getElementById('modal-proveedores').style.display = 'none';
						toggleModal('modal-productos');
						renderizarProductos();
						setTimeout(() => {
							const paso = tutorialActivo[pasoActual];
							if (paso && paso.target) {
								posicionarTooltip(paso);
							}
						}, 500);
					}
				},
                {
                    id: 'cl-explicacion',
                    title: '¿Qué es CL (Compra Local)?',
                    icon: 'fa-leaf',
                    content: '<strong>CL = Compra Local</strong><br><br>Indica que el producto se adquiere dentro de la región/localidad, cumpliendo con requisitos de:<br>• Apoyo a productores locales<br>• Menor huella de carbono<br>• Frescura y trazabilidad<br><br>En el resumen se calcula el <strong>% de compras locales</strong> del total.',
                    tip: 'Productos CL se marcan con check verde ✓ en los reportes.',
                    position: 'center',
					action: () => {
						document.getElementById('modal-proveedores').style.display = 'none';
						document.getElementById('modal-productos').style.display = 'none';
					}
                },
				
                {
                    id: 'resumen',
                    target: 'nav-resumen',
                    title: 'Resumen y Análisis',
                    icon: 'fa-chart-pie',
                    content: 'Visualiza el análisis completo de gastos:<br>• Total por proveedor y producto<br>• Cantidades acumuladas (kg, lb, und)<br>• Indicador CL por producto<br>• Gráfico de distribución<br>• % de compras locales<br>• <strong>Raciones totales por semana</strong>',
                    tip: 'Los paneles de proveedores son plegables. Haz clic en el encabezado para expandir/contraer.',
                    position: 'right',
                    action: () => toggleDrawer('resumen')
                },
                {
                    id: 'exportar',
                    target: 'nav-exportar',
                    title: 'Exportar Datos',
                    icon: 'fa-file-export',
                    content: 'Exporta toda la información en formato Excel con 5 hojas:<br>1. <strong>Configuración</strong> (proveedores y productos)<br>2. <strong>Datos Semanales</strong> (todas las transacciones)<br>3. <strong>Resumen por Producto</strong> (consolidado)<br>4. <strong>Resumen de Raciones</strong><br>5. <strong>Validación de Facturas</strong>',
                    tip: 'El archivo exportado incluye toda la configuración y puede importarse en otro dispositivo.',
                    position: 'right'
                },
                {
                    id: 'importar',
                    target: 'nav-importar',
                    title: 'Importar Datos',
                    icon: 'fa-file-import',
                    content: 'Restaura datos desde un archivo Excel exportado previamente. Se importa:<br>• Configuración de proveedores<br>• Listado de productos<br>• Todas las transacciones semanales<br>• Mes y contrato<br>• Valor de ración HCB',
                    tip: 'Útil para respaldar información o transferir entre dispositivos.',
                    position: 'right'
                },
                {
                    id: 'contabilidad',
                    target: 'nav-contabilidad',
                    title: 'Exportar Contabilidad',
                    icon: 'fa-calculator',
                    content: 'Formato especial para el área financiera:<br>• Detalle de facturas por proveedor<br>• Cantidades y valores totales<br>• Indicador de compra local (SI/NO)<br>• Resumen ejecutivo por proveedor',
                    tip: 'Incluye tanto CSV (datos planos) como Excel (con formato).',
                    position: 'right',
                    action: () => toggleDrawer('contabilidad')
                },
                {
                    id: 'final',
                    title: '¡Tutorial Completado!',
                    icon: 'fa-trophy',
                    content: 'Ya conoces todas las funcionalidades de ZAN. Recuerda:<br><br>• El botón <strong>?</strong> siempre está disponible para volver a ver este tutorial<br>• Guarda en la nube periódicamente<br>• Exporta respaldos semanales<br><br>¡Empieza a gestionar tus compras de manera eficiente!',
                    tip: '¿Tienes dudas? Revisa secciones específicas desde el menú de ayuda.',
                    position: 'center'
                }
            ],
            
            // Tutorial de sistema plegable
            plegable: [
                {
                    id: 'plegable-intro',
                    title: 'Sistema de Paneles Plegables',
                    icon: 'fa-folder-tree',
                    content: 'ZAN utiliza un sistema de colapso para organizar la información de manera eficiente. Puedes expandir o contraer secciones según necesites.',
                    position: 'center'
                },
                {
                    target: 'main-grid',
                    title: 'Colapsar Semanas',
                    icon: 'fa-calendar-week',
                    content: 'Cada tarjeta de semana tiene un botón <i class="fa-solid fa-chevron-down"></i> en la esquina superior izquierda. Haz clic para:<br>• <strong>Contraer</strong> la semana y ver solo el encabezado<br>• <strong>Expandir</strong> para ver todos los proveedores y productos',
                    tip: 'Útil cuando trabajas con muchas semanas y quieres enfocarte en una específica.',
                    position: 'top'
                },
                {
                    target: 'main-grid',
                    title: 'Colapsar Proveedores',
                    icon: 'fa-truck-field',
                    content: 'Dentro de cada semana, cada proveedor tiene su propio botón de colapso en el encabezado colorido. Haz clic en el nombre del proveedor para:<br>• Ocultar/mostrar sus productos<br>• Ver solo el total del proveedor',
                    tip: 'Los colores de los proveedores ayudan a identificarlos rápidamente.',
                    position: 'top'
                },
                {
                    target: 'nav-resumen',
                    title: 'Resumen Plegable',
                    icon: 'fa-chart-pie',
                    content: 'En el panel de resumen, los proveedores también son plegables. Esto te permite:<br>• Ver el total general primero<br>• Expandir solo los proveedores que te interesan revisar<br>• Navegar más rápido por muchos productos',
                    tip: 'Los paneles del Análisis Detallado y Validación de Facturas son plegables.',
                    position: 'right',
                    action: () => toggleDrawer('resumen')
                },
                {
                    id: 'plegable-final',
                    title: '¡Navegación Eficiente!',
                    icon: 'fa-check-circle',
                    content: 'El sistema plegable te permite:<br><br>✓ Trabajar con menos desplazamiento<br>✓ Enfocarte en lo que necesitas<br>✓ Tener una vista general rápida<br>✓ Personalizar tu espacio de trabajo<br><br>Todos los estados de colapso se mantienen mientras trabajas.',
                    tip: 'Práctica recomendada: Colapsa las semanas pasadas y mantén expandida solo la semana actual.',
                    position: 'center',
                    action: () => closeAllDrawers()
                }
            ],

            // Tutorial de precios dinámicos por semana
            precios: [
                {
                    id: 'precios-intro',
                    title: 'Precios Variables por Semana',
                    icon: 'fa-tags',
                    content: 'Aunque cada producto tiene un precio base configurado, puedes modificar el precio de cualquier producto para una semana específica sin afectar las demás.',
                    position: 'center'
                },
                {
                    target: 'main-grid',
                    title: 'Modificar Precio en Tabla',
                    icon: 'fa-pen-to-square',
                    content: 'Para cambiar el precio de un producto en una semana específica:<br><br>1. Ingresa la <strong>cantidad</strong> (ej: 1)<br>2. En la columna <strong>Total</strong>, escribe el valor real de la compra<br>3. El sistema calculará automáticamente el precio unitario',
                    tip: 'Ejemplo: Si el huevo está a $470 pero esta semana pagaste $450, escribe cantidad 1 y total $450.',
                    position: 'top'
                },
                {
                    target: 'main-grid',
                    title: 'Cálculo Inverso',
                    icon: 'fa-calculator',
                    content: 'El sistema detecta cuando modificas el valor total y recalcula el precio unitario:<br><br><strong>Fórmula:</strong> Precio Unitario = Total ÷ Cantidad<br><br>Esto se guarda solo para esa semana. Las demás semanas mantienen su precio original.',
                    tip: 'El precio modificado se muestra en azul claro para indicar que es diferente al base.',
                    position: 'top'
                },
                {
                    id: 'precios-ejemplo',
                    title: 'Ejemplo Práctico',
                    icon: 'fa-lightbulb',
                    content: '<strong>Escenario:</strong> Huevo base = $470/unidad<br><br><strong>Semana 1:</strong> Compras 100 unidades a $450<br>→ Cantidad: 100, Total: $45,000<br>→ Precio unitario se ajusta a $450<br><br><strong>Semana 2:</strong> Compras 100 unidades a $470<br>→ Cantidad: 100, Total: $47,000<br>→ Precio vuelve al base o lo ajustas<br><br>Cada semana es independiente.',
                    tip: 'Esta función es útil cuando los precios fluctúan semanalmente.',
                    position: 'center'
                },
                {
                    id: 'precios-final',
                    title: '¡Flexibilidad Total!',
                    icon: 'fa-check-circle',
                    content: 'Recuerda:<br><br>✓ Los precios base se configuran en "Listado de Productos"<br>✓ Los precios por semana se ajustan en las tablas<br>✓ Los cambios se guardan automáticamente en local<br>✓ Al exportar, se registran los precios reales de cada semana',
                    tip: 'Si necesitas revertir al precio base, borra el valor total y vuelve a ingresar la cantidad.',
                    position: 'center'
                }
            ],
            
            // Tutoriales específicos por tema
            proveedores: [
                {
                    id: 'prov-intro',
                    title: 'Gestión de Proveedores',
                    icon: 'fa-truck-field',
                    content: 'Los proveedores son las empresas o personas que te venden productos. Cada producto debe estar asignado a un proveedor.',
                    position: 'center'
                },
                {
                    target: 'nav-proveedores',
                    title: 'Acceder a Proveedores',
                    icon: 'fa-arrow-pointer',
                    content: 'Haz clic aquí para abrir el panel de gestión de proveedores.',
                    position: 'right',
                    action: () => toggleModal('modal-proveedores')
                },
                {
                    target: 'lista-proveedores',
                    title: 'Crear y Editar',
                    icon: 'fa-pen-to-square',
                    content: '• <strong>Nombre:</strong> Identificación del proveedor<br>• <strong>Color:</strong> Para visualización en tablas<br>• <strong>Orden:</strong> Usa las flechas para reorganizar<br>• <strong>Sigla:</strong> Se genera automáticamente',
                    tip: 'Ejemplo: "Carnes Canaima" → sigla "CCA"',
                    position: 'left'
                },
                {
                    target: 'lista-proveedores',
                    title: 'Eliminar Proveedores',
                    icon: 'fa-trash',
                    content: 'Al eliminar un proveedor, sus productos se reasignan al primer proveedor de la lista. Asegúrate de reasignarlos manualmente si es necesario.',
                    position: 'left'
                }
            ],
            
            productos: [
                {
                    id: 'prod-intro',
                    title: 'Gestión de Productos',
                    icon: 'fa-list-check',
                    content: 'Los productos son los ítems que compras a los proveedores. Cada uno debe tener precio, unidad y proveedor asignado.',
                    position: 'center'
                },
                {
                    target: 'nav-productos',
                    title: 'Acceder a Productos',
                    icon: 'fa-arrow-pointer',
                    content: 'Haz clic aquí para gestionar tu catálogo de productos.',
                    position: 'right',
                    action: () => toggleModal('modal-productos')
                },
                {
                    target: 'lista-productos-config',
                    title: 'Configurar Producto',
                    icon: 'fa-box',
                    content: '• <strong>Nombre:</strong> Incluye la unidad (Libra, Kilo, Und)<br>• <strong>Precio:</strong> Valor unitario de compra<br>• <strong>Proveedor:</strong> Quién lo suministra<br>• <strong>CL:</strong> ¿Es compra local?',
                    tip: 'La unidad se detecta automáticamente: kg, lb, lt, und',
                    position: 'left'
                }
            ],
            
            cl: [
                {
                    id: 'cl-full',
                    title: 'Compras Locales (CL)',
                    icon: 'fa-leaf',
                    content: '<strong>CL = Compra Local</strong><br><br>Es un indicador que identifica productos adquiridos dentro de la región, cumpliendo con políticas de:<br><br>🌱 <strong>Sostenibilidad:</strong> Menor transporte, menos emisiones<br>💚 <strong>Economía local:</strong> Apoyo a productores regionales<br>📋 <strong>Requisitos institucionales:</strong> Muchos contratos exigen % mínimo de CL<br><br>En el resumen se calcula automáticamente el porcentaje de compras locales.',
                    tip: 'Productos CL se destacan con badge verde en todas las vistas.',
                    position: 'center'
                }
            ],
            
            resumen: [
                {
                    id: 'res-intro',
                    title: 'Análisis de Gastos',
                    icon: 'fa-chart-pie',
                    content: 'El resumen consolidado te muestra el panorama completo de tus compras del mes.',
                    position: 'center'
                },
                {
                    target: 'nav-resumen',
                    title: 'Ver Resumen',
                    icon: 'fa-arrow-pointer',
                    content: 'Abre el panel de análisis desde aquí o desde el menú lateral.',
                    position: 'right',
                    action: () => toggleDrawer('resumen')
                },
                {
                    target: 'summary-content',
                    title: 'Detalle por Proveedor',
                    icon: 'fa-list',
                    content: 'Cada proveedor muestra:<br>• Productos comprados<br>• Cantidad total (suma de todas las semanas)<br>• Valor total gastado<br>• Indicador CL (✓ o ✗)<br>• <strong>% de participación</strong> en el total<br><br><strong>NUEVO:</strong> Los paneles son plegables. Haz clic en el encabezado para expandir/contraer.',
                    tip: 'Las cantidades se suman automáticamente: 100 huevos semana 1 + 150 semana 2 = 250 huevos total',
                    position: 'left'
                },
                {
                    target: 'chartGasto',
                    title: 'Gráfico Visual',
                    icon: 'fa-chart-simple',
                    content: 'Visualiza la distribución de gastos por proveedor en un gráfico circular. El color corresponde a cada proveedor.',
                    position: 'top'
                }
            ],
            
            exportar: [
                {
                    id: 'exp-intro',
                    title: 'Exportar Datos',
                    icon: 'fa-file-export',
                    content: 'El sistema genera archivos Excel profesionales con toda tu información organizada.',
                    position: 'center'
                },
                {
                    target: 'nav-exportar',
                    title: 'Exportar Completo',
                    icon: 'fa-file-excel',
                    content: 'Genera un archivo Excel con 5 hojas:<br><br>1. <strong>Configuración:</strong> Proveedores y productos base<br>2. <strong>Datos Semanales:</strong> Todas las facturas y cantidades<br>3. <strong>Resumen:</strong> Consolidado por producto con % CL<br>4. <strong>Raciones:</strong> Resumen de raciones por semana<br>5. <strong>Facturas:</strong> Validación de facturas',
                    tip: 'Este archivo puede importarse posteriormente como respaldo completo.',
                    position: 'right'
                },
                {
                    target: 'nav-importar',
                    title: 'Importar Datos',
                    icon: 'fa-file-import',
                    content: 'Restaura toda la configuración y datos desde un archivo Excel exportado previamente. Útil para:<br>• Respaldos<br>• Transferir entre dispositivos<br>• Recuperar información',
                    position: 'right'
                }
            ],
            
            contabilidad: [
                {
                    id: 'cont-intro',
                    title: 'Exportación Contable',
                    icon: 'fa-calculator',
                    content: 'Formato especial diseñado para el área financiera y contable de tu organización.',
                    position: 'center'
                },
                {
                    target: 'nav-contabilidad',
                    title: 'Formato Contable',
                    icon: 'fa-file-invoice-dollar',
                    content: 'Incluye:<br>• Fecha, mes y contrato<br>• Proveedor y número de factura<br>• Producto, cantidad y valores<br>• Indicador CL (SI/NO)<br>• Resumen por proveedor',
                    tip: 'Disponible en CSV (para sistemas contables) y Excel (para revisión humana).',
                    position: 'right',
                    action: () => toggleDrawer('contabilidad')
                }
            ]
        };

        let tutorialActivo = null;
        let pasoActual = 0;
