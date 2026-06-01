// ZAN Tabla de Valores - app.js
// Módulo principal de lógica y Firebase

        // ===== CONFIGURACIÓN FIREBASE =====
        const firebaseConfig = {
            apiKey: "AIzaSyBlbJPanxmKNq0NK3R6mzhMpBxOzA_qP7E",
            authDomain: "tabla-valores.firebaseapp.com",
            databaseURL: "https://tabla-valores-default-rtdb.firebaseio.com",
            projectId: "tabla-valores",
            storageBucket: "tabla-valores.firebasestorage.app",
            messagingSenderId: "880909110728",
            appId: "1:880909110728:web:b3c12dd212022825ab04fd"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // ===== VARIABLES GLOBALES =====
		let currentUser = "";
		let valorCupoBase = 8094;
		let chartInstance = null;
		let sidebarOpen = window.innerWidth > 768;
		let tutorialEnCurso = false;
		let tutorialYaVisto = false;

		// NUEVAS VARIABLES PARA SINCRONIZACIÓN OFFLINE
		let hayPendientesSinSincronizar = false;
		let sincronizacionEnProgreso = false;
		let ultimoGuardadoLocal = null;
		let ultimoGuardadoConfirmado = null;
		let cambiosSinGuardar = false; 
		let cambiosSinGuardarLocal = false;

        let proveedores = [];
        let productosBase = [];

        const PROVEEDORES_INICIALES = [
            { id: 'prov_1', nombre: 'Carnes Canaima', color: '#ff6b6b', orden: 0 },
            { id: 'prov_2', nombre: 'Surcolac', color: '#4ecdc4', orden: 1 },
            { id: 'prov_3', nombre: 'La granjita', color: '#ffe66d', orden: 2 },
            { id: 'prov_4', nombre: 'Panaderia', color: '#95e1d3', orden: 3 }
        ];

        const PRODUCTOS_INICIALES = [
            { nombre: "Pollo Libra", precio: 9000, cl: true, proveedor: 'prov_3' },
            { nombre: "Huevo Und", precio: 520, cl: true, proveedor: 'prov_3' },
            { nombre: "Molleja Libra", precio: 7000, cl: true, proveedor: 'prov_3' },
            { nombre: "Queso Libra", precio: 13000, cl: false, proveedor: 'prov_3' },
            { nombre: "Carne Cerdo Kilo", precio: 20000, cl: true, proveedor: 'prov_1' },
            { nombre: "Carne Res Kilo", precio: 26000, cl: true, proveedor: 'prov_1' },
            { nombre: "Higado Kilo", precio: 19000, cl: true, proveedor: 'prov_1' },
            { nombre: "Tilapia Kilo", precio: 24000, cl: true, proveedor: 'prov_1' },
            { nombre: "Leche Litro", precio: 3792, cl: true, proveedor: 'prov_2' },
            { nombre: "Yogurt Litro", precio: 5900, cl: true, proveedor: 'prov_2' },
            { nombre: "Pan Und", precio: 600, cl: false, proveedor: 'prov_4' }
        ];

        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        // ===== SISTEMA DE ESTADO CENTRALIZADO =====
        const AppState = (() => {
            const _data = {
                currentUser:                "",
                valorCupoBase:              8094,
                chartInstance:              null,
                sidebarOpen:                window.innerWidth > 768,
                tutorialEnCurso:            false,
                tutorialYaVisto:            false,
                hayPendientesSinSincronizar:false,
                sincronizacionEnProgreso:   false,
                ultimoGuardadoLocal:        null,
                ultimoGuardadoConfirmado:   null,
                cambiosSinGuardar:          false,
                cambiosSinGuardarLocal:     false,
                proveedores:                [],
                productosBase:              [],
                currentFileId:              null,
                carpetasCache:              {},
                currentPath:                'root',
                busquedaActual:             '',
                ordenActual:                'fecha-desc',
                vistaArchivosActual:        'list',
                pasoActual:                 0,
                tutorialActivo:             null,
                pasoActualTema:             0,
                tutorialTemaActivo:         null,
            };
            const _subs = {};
            return {
                get(key)       { return _data[key]; },
                set(key, val)  {
                    _data[key] = val;
                    if (_subs[key]) _subs[key].forEach(fn => fn(val));
                    // Keep legacy globals in sync so existing code still works
                    if (key in window._zanLegacy) window._zanLegacy[key](val);
                },
                subscribe(key, fn) {
                    if (!_subs[key]) _subs[key] = [];
                    _subs[key].push(fn);
                },
                getAll() { return {..._data}; }
            };
        })();

        // Legacy shim: write-back to keep named vars alive for functions not yet migrated
        window._zanLegacy = {
            currentUser:               v => { currentUser               = v; },
            valorCupoBase:             v => { valorCupoBase             = v; },
            chartInstance:             v => { chartInstance             = v; },
            sidebarOpen:               v => { sidebarOpen               = v; },
            tutorialEnCurso:           v => { tutorialEnCurso           = v; },
            tutorialYaVisto:           v => { tutorialYaVisto           = v; },
            hayPendientesSinSincronizar:v=>{ hayPendientesSinSincronizar= v; },
            sincronizacionEnProgreso:  v => { sincronizacionEnProgreso  = v; },
            ultimoGuardadoLocal:       v => { ultimoGuardadoLocal       = v; },
            ultimoGuardadoConfirmado:  v => { ultimoGuardadoConfirmado  = v; },
            cambiosSinGuardar:         v => { cambiosSinGuardar         = v; },
            cambiosSinGuardarLocal:    v => { cambiosSinGuardarLocal    = v; },
            proveedores:               v => { proveedores               = v; },
            productosBase:             v => { productosBase             = v; },
            currentFileId:             v => { currentFileId             = v; },
        };

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

        // ===== FUNCIONES DEL TUTORIAL =====

        function toggleHelpMenu() {
            const menu = document.getElementById('helpMenu');
            menu.classList.toggle('active');
            
            if (menu.classList.contains('active')) {
                setTimeout(() => {
                    document.addEventListener('click', cerrarHelpMenu);
                }, 100);
            }
        }

        function cerrarHelpMenu(e) {
            const menu = document.getElementById('helpMenu');
            const btn = document.getElementById('helpButton');
            
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.remove('active');
                document.removeEventListener('click', cerrarHelpMenu);
            }
        }

        function abrirSidebarParaTutorial() {
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 768) {
                sidebar.classList.remove('collapsed');
                sidebarOpen = true;
            } else {
                sidebar.classList.add('open');
                sidebarOpen = true;
            }
        }

        function startTutorial(tipo = 'completo') {
            document.getElementById('helpMenu').classList.remove('active');
            tutorialEnCurso = true;
            abrirSidebarParaTutorial();
            
            if (!TUTORIAL_STEPS[tipo]) {
                console.error('Tutorial no encontrado:', tipo);
                return;
            }
            
            tutorialActivo = TUTORIAL_STEPS[tipo];
            pasoActual = 0;
            
            document.getElementById('tutorialOverlay').classList.add('active');
            generarProgreso();
            mostrarPaso(0);
            document.getElementById('helpButton').classList.remove('pulse');
        }

        function generarProgreso() {
            const cont = document.getElementById('tutorialProgress');
            cont.innerHTML = tutorialActivo.map((_, i) => 
                `<div class="tutorial-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`
            ).join('');
        }

        function mostrarPaso(index) {
            if (index < 0 || index >= tutorialActivo.length) return;
            
            pasoActual = index;
            const paso = tutorialActivo[index];
            
            if (paso.target && (
                paso.target.includes('nav-') || 
                paso.target === 'sidebar' ||
                paso.target.includes('sidebar')
            )) {
                abrirSidebarParaTutorial();
            }
            
            document.getElementById('tutorialIcon').innerHTML = `<i class="fa-solid ${paso.icon || 'fa-circle-info'}"></i>`;
            document.getElementById('tutorialTitle').textContent = paso.title;
            document.getElementById('tutorialStep').textContent = `${index + 1}/${tutorialActivo.length}`;
            document.getElementById('tutorialContent').innerHTML = paso.content;
            
            const tipEl = document.getElementById('tutorialTip');
            if (paso.tip) {
                document.getElementById('tutorialTipText').textContent = paso.tip;
                tipEl.style.display = 'block';
            } else {
                tipEl.style.display = 'none';
            }
            
            document.getElementById('btnPrev').style.visibility = index === 0 ? 'hidden' : 'visible';
            
            if (index === tutorialActivo.length - 1) {
                document.getElementById('btnNext').classList.add('hidden');
                document.getElementById('btnFinish').classList.remove('hidden');
                document.getElementById('btnSkip').style.visibility = 'hidden';
            } else {
                document.getElementById('btnNext').classList.remove('hidden');
                document.getElementById('btnFinish').classList.add('hidden');
                document.getElementById('btnSkip').style.visibility = 'visible';
            }
            
            document.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i < index) dot.classList.add('completed');
                if (i === index) dot.classList.add('active');
            });
            
            posicionarTooltip(paso);
            
            if (paso.action) {
                setTimeout(() => paso.action(), 300);
            }
        }

        function posicionarTooltip(paso) {
            const tooltip = document.getElementById('tutorialTooltip');
            const spotlight = document.getElementById('tutorialSpotlight');
            
            tooltip.className = 'tutorial-tooltip active';
            
            if (paso.position === 'center' || !paso.target) {
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                spotlight.style.display = 'none';
                return;
            }
            
            const target = document.getElementById(paso.target) || document.querySelector(paso.target);
            if (!target) {
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                return;
            }
            
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const rect = target.getBoundingClientRect();
            
            spotlight.style.display = 'block';
            spotlight.style.left = `${rect.left - 10}px`;
            spotlight.style.top = `${rect.top - 10}px`;
            spotlight.style.width = `${rect.width + 20}px`;
            spotlight.style.height = `${rect.height + 20}px`;
            
            const margin = 20;
            let left, top;
            
            // Ajustar posición para evitar que se corte
            const tooltipWidth = 350;
            const tooltipHeight = 400;
            
            switch(paso.position) {
                case 'bottom':
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.bottom + margin;
                    tooltip.classList.add('top');
                    break;
                case 'top':
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.top - tooltipHeight - margin;
                    tooltip.classList.add('bottom');
                    break;
                case 'left':
                    left = rect.left - tooltipWidth - margin;
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    tooltip.classList.add('right');
                    break;
                case 'right':
                    left = rect.right + margin;
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    tooltip.classList.add('left');
                    break;
                default:
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.bottom + margin;
            }
            
            // Ajustar a límites de pantalla con margen de seguridad
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.transform = 'none';
        }

        function tutorialNext() {
            if (pasoActual < tutorialActivo.length - 1) {
                mostrarPaso(pasoActual + 1);
            }
        }

        function tutorialPrev() {
            if (pasoActual > 0) {
                mostrarPaso(pasoActual - 1);
            }
        }

        function tutorialSkip() {
            zanConfirm({ title: 'Saltar tutorial', msg: 'Puedes volver a verlo desde el botón ? en cualquier momento.', tipo: 'info', okLabel: 'Saltar' }).then(ok => {
                if (ok) {
                    tutorialEnCurso = false;
                    marcarTutorialVisto();
                    tutorialFinish();
                }
            });
        }

        function tutorialFinish() {
            document.getElementById('tutorialOverlay').classList.remove('active');
            document.getElementById('tutorialTooltip').classList.remove('active');
            document.getElementById('tutorialSpotlight').style.display = 'none';
            
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
            document.getElementById('overlay').style.display = 'none';
            
            tutorialEnCurso = false;
            cerrarSidebarSiAbierto();
            marcarTutorialVisto();
            document.getElementById('helpButton').classList.add('pulse');
        }
		
		// ===== DETECCIÓN DE CONEXIÓN =====
		function estaOnline() {
			return navigator.onLine;
		}

		function iniciarMonitoreoConexion() {
			window.addEventListener('online', () => {
				console.log("🌐 Conexión restablecida");
				mostrarNotificacionConexionRestablecida();
			});
			
			window.addEventListener('offline', () => {
				console.log("📴 Sin conexión");
				mostrarNotificacionSinConexion();
			});
		}

		function mostrarNotificacionSinConexion() {
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			
			if (dotTop) {
				dotTop.style.background = '#d4af37'; // Dorado
				dotTop.style.boxShadow = '0 0 8px #d4af37';
			}
			if (textTop) {
				textTop.textContent = "Sin conexión";
				textTop.style.color = '#d4af37';
			}
			if (dot) {
				dot.style.background = '#d4af37';
				dot.style.boxShadow = '0 0 5px #d4af37';
			}
			if (text) {
				text.textContent = "Sin conexión";
			}
		}

		function mostrarNotificacionConexionRestablecida() {
			// Solo mostrar diálogo si hay datos pendientes
			if (hayPendientesSinSincronizar && ultimoGuardadoLocal) {
				const contrato = ultimoGuardadoLocal.contrato || "Sin contrato";
				const mes = ultimoGuardadoLocal.mes || "Sin mes";
				
				zanConfirm({ title: '🌐 Conexión restablecida', msg: `¿Sincronizar ahora el contrato?\n📄 ${contrato}  📅 ${mes}`, tipo: 'info', okLabel: 'Sincronizar' }).then(ok => { if (ok) sincronizarPendientes(); });
			} else {
				// Solo actualizar indicador visual
				marcarSincronizado();
			}
		}
		
		

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
            
            return `
                <div class="file-item ${esActual ? 'active-file' : ''}" onclick="cargarArchivo('${archivo.key}')">
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
                        <button class="file-btn" onclick="cargarArchivo('${archivo.key}')" title="Abrir">
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
            
            return `
                <div class="file-card ${esActual ? 'active-file' : ''}" onclick="cargarArchivo('${archivo.key}')">
                    <div class="file-card-actions" onclick="event.stopPropagation()">
                        <button class="file-btn" onclick="cargarArchivo('${archivo.key}')" title="Abrir">
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

            const tDist = tPres - tProdCL - tProdOtros;
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
                        </table>
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
                            100% distribuido entre compras y distribuidora
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

            renderChart(datosGrafico, tDist);
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

        function renderChart(datos, distVal) {
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
            
            let html = '';
            for (let s = 1; s <= semanas; s++) {
                const distVal = document.getElementById(`dist-${s}`)?.value || '$0';
                html += `
                    <div class="semana-checkbox" id="dist-check-${s}" onclick="toggleSeleccionDistribuidora(${s})">
                        <input type="checkbox" id="dist-checkbox-${s}" onchange="calcularTotalDistribuidora()">
                        <div style="flex:1;">
                            <div style="font-weight:bold; color:var(--primary-gold);">Semana ${s}</div>
                            <div style="font-size:10px; color:var(--text-dim);">Distribuidora: ${distVal}</div>
                        </div>
                    </div>
                `;
            }
            
            cont.innerHTML = html;
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
            let tDistTotal = 0;
            let totalesPorProducto = {};
            let racionesPorSemana = {};
            let totalRacionesMes = 0;
            
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
                if (distVal) tDistTotal += limpiarNum(distVal.value || "0");

                const dias = parseFloat(document.getElementById(`dias-${s}`)?.value) || 0;
                const cupos = parseFloat(document.getElementById(`cupos-${s}`)?.value) || 0;
                const racionesSemana = dias * cupos;
                racionesPorSemana[s] = {
                    dias: dias,
                    cupos: cupos,
                    raciones: racionesSemana,
                    presupuesto: dias * cupos * valorCupoBase
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
                ["Distribuidora:", tDistTotal, porcDistTotal + "%"],
                ["Total Raciones Mes:", totalRacionesMes],
                ["Suma Verificación:", tProdCL + tProdOtros + tDistTotal, "Debe ser igual al Presupuesto"],
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
            const wsData = [["SEMANA", "DÍAS", "CUPOS", "RACIONES", "PRESUPUESTO", "PROVEEDOR", "SIGLA", "FACTURA", "PRODUCTO", "CANTIDAD", "VALOR_UNIT", "VALOR_TOTAL", "CL", "%_DEL_PRESUPUESTO_SEMANA", "DISTRIBUIDORA"]];

            for (let s = 1; s <= semanas; s++) {
                const dias = document.getElementById(`dias-${s}`)?.value || "0";
                const cupos = document.getElementById(`cupos-${s}`)?.value || "0";
                const raciones = parseFloat(dias) * parseFloat(cupos);
                const presupuesto = limpiarNum(document.getElementById(`pres-${s}`)?.textContent || "0");
                const distribuidora = limpiarNum(document.getElementById(`dist-${s}`)?.value || "0");

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
                                porcDelPresupuesto + '%', distribuidora
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
                'Valor no asignado a productos',
                'N/A',
                0,
                tDistTotal,
                'NO',
                porcDistTotal + '%',
                'N/A'
            ]);

            wsResumen.push([]);
            wsResumen.push(["TOTALES", "", "", "", "", totalGeneral, "", "100%", porcCLTotal + "%"]);
            wsResumen.push(["", "", "", "", "", "", "", "", ""]);
            wsResumen.push(["DESGLOSE", "VALOR", "% DEL TOTAL", "RACIONES", "", "", "", "", ""]);
            wsResumen.push(["Compras Locales (CL)", tProdCL, porcCLTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Otros Productos", tProdOtros, porcOtrosTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Distribuidora", tDistTotal, porcDistTotal + "%", "", "", "", "", "", ""]);
            wsResumen.push(["Total Raciones Mes", "", "", totalRacionesMes, "", "", "", "", ""]);
            wsResumen.push(["TOTAL VERIFICACIÓN", tProdCL + tProdOtros + tDistTotal, (parseFloat(porcCLTotal) + parseFloat(porcOtrosTotal) + parseFloat(porcDistTotal)).toFixed(2) + "%", "", "", "", "", "", ""]);

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsResumen), "Resumen por Producto");

            // HOJA 4: RESUMEN DE RACIONES
            const wsRaciones = [["SEMANA", "DÍAS", "CUPOS", "RACIONES", "PRESUPUESTO", "VALOR_CUPO_HCB"]];
            
            for (let s = 1; s <= semanas; s++) {
                const r = racionesPorSemana[s] || { dias: 0, cupos: 0, raciones: 0, presupuesto: 0 };
                wsRaciones.push([s, r.dias, r.cupos, r.raciones, r.presupuesto, valorCupoBase]);
            }
            
            wsRaciones.push([]);
            wsRaciones.push(["TOTALES", "", "", totalRacionesMes, tPresTotal, ""]);
            wsRaciones.push(["Promedio raciones/semana", "", "", semanas > 0 ? (totalRacionesMes / semanas).toFixed(2) : 0, "", ""]);

            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsRaciones), "Resumen Raciones");

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

        // ===== DRAWERS =====
        function toggleDrawer(id) {
            const drawer = document.getElementById(`drawer-${id}`);
            const overlay = document.getElementById('overlay');
            const isOpen = drawer.classList.contains('open');

            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));

            if (!isOpen) {
                drawer.classList.add('open');
                overlay.classList.add('active');
                if (id === 'archivo') {
                    currentPath = 'root';
                    busquedaActual = '';
                    document.getElementById('buscar-archivos').value = '';
                    listarCloud();
                }
                if (id === 'resumen') actualizarResumen();
                if (id === 'contabilidad') actualizarVistaContabilidad();
                if (id === 'distribuidora') renderizarValoresDistribuidora();
                if (id === 'facturas') renderizarValidadorFacturas();
            } else {
                overlay.classList.remove('active');
            }
        }

        function closeAllDrawers() {
            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
            document.getElementById('overlay').classList.remove('active');
        }

        function actualizarVistaContabilidad() {
            const datos = generarDatosContabilidad();
            const cont = document.getElementById('accounting-content');

            let html = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                    <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size:9px; color:var(--text-dim);">FACTURAS</div>
                        <div style="font-size:16px; color:var(--accent-cyan); font-weight:bold;">${datos.totalFacturas}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; text-align:center;">
                        <div style="font-size:9px; color:var(--text-dim);">MONTO TOTAL</div>
                        <div style="font-size:16px; color:var(--primary-gold); font-weight:bold;">${formatter.format(datos.montoTotal)}</div>
                    </div>
                </div>
            `;

            for (let provId in datos.porProveedor) {
                const prov = datos.porProveedor[provId];
                if (prov.total === 0) continue;

                const provInfo = getProveedorById(provId);
                
                html += `
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid ${provInfo?.color || '#666'};">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-weight:bold; color:${provInfo?.color || '#fff'};">${prov.nombre} (${prov.sigla})</span>
                            <span style="font-size:10px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:10px;">${prov.facturas.size} facturas</span>
                        </div>
                        <div style="font-size:14px; color:var(--primary-gold); font-weight:bold; margin-bottom:8px;">${formatter.format(prov.total)}</div>
                    </div>
                `;
            }

            cont.innerHTML = html;
        }
		// ===== MODO CLARO/OSCURO =====
        (function initTheme() {
            const saved = localStorage.getItem('zan_theme') || 'dark';
            applyTheme(saved);
        })();

        function applyTheme(mode) {
            const html = document.documentElement;
            const icons = document.querySelectorAll('#theme-icon');
            const labels = document.querySelectorAll('#theme-label');
            if (mode === 'light') {
                html.setAttribute('data-theme', 'light');
                icons.forEach(el => el.className = 'fa-solid fa-sun');
                labels.forEach(el => el.textContent = 'Modo Claro');
            } else {
                html.removeAttribute('data-theme');
                icons.forEach(el => el.className = 'fa-solid fa-moon');
                labels.forEach(el => el.textContent = 'Modo Oscuro');
            }
            localStorage.setItem('zan_theme', mode);
        }

        function toggleTheme() {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            applyTheme(isLight ? 'dark' : 'light');
        }

        // ===== HELPER: contraste de color de proveedor en modo claro =====
        // Cuando hay modo claro, el color del proveedor (elegido por el usuario para fondo oscuro)
        // puede ser demasiado claro. Esta función devuelve el color ajustado.
        function getProvColorForMode(hexColor) {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            if (!isLight) return hexColor;
            // Oscurecer el color para que sea legible sobre fondos claros
            return darkenColor(hexColor, 0.35);
        }

        function darkenColor(hex, amount) {
            let col = hex.replace('#', '');
            if (col.length === 3) col = col.split('').map(c => c+c).join('');
            const r = Math.max(0, Math.round(parseInt(col.substring(0,2),16) * (1-amount)));
            const g = Math.max(0, Math.round(parseInt(col.substring(2,4),16) * (1-amount)));
            const b = Math.max(0, Math.round(parseInt(col.substring(4,6),16) * (1-amount)));
            return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
        }

