// ════════════════════════════════════════════════════════════════
// SISTEMA DE TUTORIAL GUIADO
// Botón flotante + menú de temas + recorrido paso a paso (spotlight)
// Iconografía: solo silueta/outline (misma línea que el menú lateral),
// sin emojis en ningún texto ni icono.
// No depende de que otras funciones existan: todo se llama con safeCall().
// ════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Utilidades ──────────────────────────────────────────────
    function safeCall(fnName) {
        var args = Array.prototype.slice.call(arguments, 1);
        try {
            if (typeof window[fnName] === 'function') {
                return window[fnName].apply(window, args);
            }
        } catch (e) { /* silencioso: el tutorial nunca debe romper la app */ }
    }

    function ensureDirPanelOpen() {
        var panel = document.getElementById('panel-paso1');
        if (panel && getComputedStyle(panel).display === 'none') {
            safeCall('toggleDirPanel', 'panel-paso1', 'chevron-paso1');
        }
    }

    function isVisible(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        var cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
        return true;
    }

    function svg(inner) {
        return '<svg viewBox="0 0 24 24">' + inner + '</svg>';
    }

    // ── Iconografía plana (mismos trazos que el menú lateral) ───
    var ICONS = {
        // Reutilizados literalmente de la navegación principal
        semanal:     svg('<path d="M7 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2M7 2v20M7 6H4"/><path d="M17 2c-2.2 0-4 2.7-4 6 0 2.2 1.1 3.4 2.2 4V22"/>'),
        mensual:     svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
        actas:       svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>'),
        proveedores: svg('<path d="M2 21V11l5 3V11l5 3V11l5 3v7H2z"/><path d="M17 21V9l4-2v14"/>'),
        gramajes:    svg('<path d="M12 3v18M7 21h10M12 3l-2.5 2.5M12 3l2.5 2.5"/><path d="M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z"/>'),
        cargue:      svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>'),
        operadores:  svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>'),
        minutaPatron: svg('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>'),
        calendario:  svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 13.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 15.3l2-.3z"/>'),
        // Nuevos, en el mismo estilo (outline, sin relleno)
        completo:    svg('<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/>'),
        perfil:      svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
        reset:       svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>'),
        close:       svg('<path d="M18 6 6 18M6 6l12 12"/>'),
        check:       svg('<path d="M20 6 9 17l-5-5"/>'),
        help:        svg('<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 2-3 4"/><path d="M12 17h.01"/>'),
        chevronLeft: svg('<path d="M15 18l-6-6 6-6"/>'),
        chevronRight: svg('<path d="M9 18l6-6-6-6"/>')
    };

    // ── Contenido: temas y pasos ────────────────────────────────
    var TUT_TOPICS = {

        completo: {
            icon: ICONS.completo,
            label: 'Tutorial completo',
            steps: [
                {
                    title: 'Bienvenido a App · Lista Mercado',
                    text: 'Este recorrido rápido te muestra todo lo que puedes hacer: generar listas semanales y mensuales, el sistema de actas, proveedores, minutas y operadores. También puedes saltar directo a un tema desde el botón de ayuda.'
                },
                { selector: '#profileChipBtn', title: 'Perfil activo', text: 'Todo lo que generes usa la Regional, Modalidad y Operador seleccionados aquí. Puedes cambiarlo cuando lo necesites.' },
                { section: 'calculator', selector: '[data-section="calculator"]', title: 'Minutas Semanales', text: 'Genera la lista de mercado de una semana según cupos, minuta y días de entrega.' },
                { section: 'calculator', selector: '#btnGenerar', title: 'Generar lista semanal', text: 'Define cupos, semana y días arriba, y pulsa aquí para calcular la lista automáticamente.' },
                { section: 'monthly', selector: '[data-section="monthly"]', title: 'Listado Mensual', text: 'Consolida varias semanas en una sola lista de compras del mes completo.' },
                { section: 'directorio', selector: '[data-section="directorio"]', title: 'Directorio UDS (Actas)', text: 'El corazón del sistema de actas: cargas las Unidades de Servicio (UDS) y generas sus actas de entrega en 3 pasos.' },
                { section: 'directorio', before: ensureDirPanelOpen, selector: '#panel-paso1', title: 'Paso 1 · Configuración', text: 'Define Regional, Modalidad, fecha y proveedor que aplican a todo el directorio.' },
                { section: 'directorio', selector: '#section-directorio .dir-toolbar-grid', title: 'Paso 2 · Cargar UDS', text: 'Sube un CSV/Excel con las unidades de servicio o agrégalas manualmente.' },
                { section: 'directorio', selector: '#tab-dir-sticky-bar', fallbackSelector: '#tab-dir-empty-state', title: 'Paso 3 · Generar actas', text: 'Ajusta coberturas y datos de cada UDS, y genera las actas por separado o unificadas en un solo Excel.', fallbackText: 'Cuando cargues UDS aquí podrás ajustar coberturas y generar las actas por separado o unificadas.' },
                { section: 'proveedores', selector: '[data-section="proveedores"]', title: 'Proveedores', text: 'Registra a quienes entregan los alimentos, para reutilizarlos rápido al configurar el Directorio.' },
                { section: 'cargue', selector: '[data-section="cargue"]', title: 'Agregar Minutas', text: 'Carga la minuta (gramajes) propia de cada operador, por Excel o JSON.' },
                { section: 'gestion-operadores', selector: '[data-section="gestion-operadores"]', title: 'Gestión de Operadores', text: 'Crea, edita y elimina operadores de todas las Regionales y Modalidades desde una sola tabla.' },
                { section: 'editor', selector: '[data-section="editor"]', title: 'Editor de Gramajes', text: 'Ajusta los gramajes base de la minuta patrón por producto y por menú.' },
                { section: 'calendar', selector: '[data-section="calendar"]', title: 'Calendario Festivos', text: 'Consulta días hábiles y festivos de Colombia para planear tus entregas.' },
                { section: 'saved', selector: '[data-section="saved"]', title: 'Guardadas', text: 'Aquí encuentras todas las listas semanales y mensuales que hayas guardado.' },
                { title: 'Recorrido terminado', text: 'Ya conoces las herramientas principales. Vuelve a este recorrido o abre un tema puntual cuando quieras desde el botón de ayuda del lado izquierdo.' }
            ]
        },

        perfil: {
            icon: ICONS.perfil,
            label: 'Elegir Perfil',
            onExit: function () { safeCall('togglePerfilModal', false); },
            steps: [
                { before: function () { safeCall('togglePerfilModal', false); }, selector: '#profileChipBtn', title: 'Tu perfil activo', text: 'Este chip muestra la Regional, Modalidad y Operador con los que trabajas ahora. Todo lo que generes usa este contexto. Haz clic para cambiarlo.' },
                { before: function () { safeCall('togglePerfilModal', true); }, delay: 200, selector: '.perfil-modal-body .perfil-step:nth-of-type(1)', title: 'Regional', text: 'Elige la Regional: NEIVA o GAITANA. Cada una tiene sus propios operadores y datos.' },
                { before: function () { safeCall('togglePerfilModal', true); }, selector: '.perfil-modal-body .perfil-step:nth-of-type(2)', title: 'Modalidad', text: 'Elige la modalidad del servicio: HCB, CDI o HI. Cambia los productos y gramajes disponibles.' },
                { before: function () { safeCall('togglePerfilModal', true); }, selector: '#perfilStepOperador', title: 'Operador', text: 'Si la modalidad lo requiere, selecciona el operador. Solo se muestran los creados para esa Regional y Modalidad.' },
                { before: function () { safeCall('togglePerfilModal', true); }, selector: '.perfil-modal-done', title: 'Guardar selección', text: 'Pulsa "Listo" para aplicar el perfil. Lo verás reflejado en el chip y en el indicador de configuración de cada sección.' }
            ]
        },

        semanal: {
            icon: ICONS.semanal,
            label: 'Generar Lista Semanal',
            steps: [
                { section: 'calculator', selector: '#num-p', title: 'Cupos (niños)', text: 'Ingresa el número de cupos o niños beneficiarios. Cada cantidad se calcula multiplicando el gramaje por este número.' },
                { section: 'calculator', selector: '#sem', title: 'Minuta / Semana', text: 'Elige la semana de la minuta patrón a usar (Semana 1 a 5). Cada una tiene su propio ciclo de menús (M1-M5, M6-M10, etc.).' },
                { section: 'calculator', selector: '.days-selector', title: 'Días a incluir', text: 'Marca los días de entrega. Puedes desmarcar festivos o días no laborales.' },
                { section: 'calculator', selector: '#statusIndicator', title: 'Perfil activo', text: 'Aquí ves la Regional, Modalidad y Operador con los que se generará la lista. Si no es el correcto, cámbialo desde el chip de perfil.' },
                { section: 'calculator', selector: '#btnGenerar', title: 'Generar lista', text: 'Con todo listo, pulsa "Generar" y la app calculará automáticamente los productos y cantidades por categoría.' },
                { section: 'calculator', selector: '#resultContainer .table-actions', fallbackSelector: '#weeklyEmptyState', title: 'Exportar y guardar', text: 'Ya generada, exporta a Excel o guarda la lista para consultarla luego en "Guardadas".', fallbackText: 'Cuando generes la lista, aquí aparecerán los botones para exportar a Excel o guardar la lista.' }
            ]
        },

        mensual: {
            icon: ICONS.mensual,
            label: 'Generar Lista Mensual',
            steps: [
                { section: 'monthly', selector: '#monthly-num-p', title: 'Cupos (niños)', text: 'Igual que en la semanal: ingresa el número de cupos para calcular las cantidades totales del mes.' },
                { section: 'monthly', selector: '#weeksSelector', title: 'Semanas y días', text: 'Activa las semanas que quieras incluir en el consolidado mensual y, dentro de cada una, los días específicos de entrega.' },
                { section: 'monthly', selector: '#btnGenerarMensual', title: 'Generar mensual', text: 'Genera el consolidado de todas las semanas seleccionadas en una sola lista de compras del mes.' },
                { section: 'saved', selector: '[data-section="saved"]', title: 'Consulta tus listas', text: 'Tanto las listas semanales como las mensuales que guardes aparecen aquí, con un contador de cuántas tienes.' }
            ]
        },

        actas: {
            icon: ICONS.actas,
            label: 'Sistema de Actas',
            steps: [
                { section: 'directorio', before: ensureDirPanelOpen, selector: '#panel-paso1', title: 'Paso 1 · Configuración global', text: 'Define Regional, Centro Zonal, Modalidad, Servicio, Municipio, fecha de solicitud y modo de leche/yogurt. Estos datos se repiten en todas las actas del directorio.' },
                { section: 'directorio', before: ensureDirPanelOpen, selector: '#tab-dir-proveedor-select', title: 'Proveedor y quien entrega', text: 'Selecciona un proveedor ya registrado (tema "Crear Proveedores") o completa manualmente nombre, documento, entidad y NIT de quien entrega los alimentos.' },
                { section: 'directorio', selector: '#section-directorio .dir-toolbar-grid', title: 'Paso 2 · Cargar Unidades (UDS)', text: 'Sube un CSV/Excel con las UDS, carga datos de ejemplo, agrégalas manualmente una por una, o descarga la plantilla base en Excel.' },
                { section: 'directorio', selector: '#tab-dir-preview-container', fallbackSelector: '#tab-dir-empty-state', title: 'Paso 3 · Ajustar coberturas y datos', text: 'En la vista previa, edita la columna "Cobertura" para ajustar los cupos de cada UDS, y usa "Acciones" para editar o eliminar cualquier registro antes de generar las actas.', fallbackText: 'Cuando cargues UDS (Paso 2), aquí aparecerá la vista previa donde ajustas cobertura y datos de cada unidad antes de generar las actas.' },
                { section: 'directorio', selector: '#tab-dir-sticky-bar', fallbackSelector: '#tab-dir-empty-state', title: 'Generar actas', text: 'Con el directorio listo, genera las actas: "Una por una" descarga un Excel independiente por cada UDS; "Unificar" genera un solo Excel con una hoja por cada UDS.', fallbackText: 'Cuando tengas UDS cargadas, aparecerá esta barra con dos botones: "Una por una" (un Excel por UDS) o "Unificar" (un solo Excel con todas las hojas).' }
            ]
        },

        proveedores: {
            icon: ICONS.proveedores,
            label: 'Crear Proveedores',
            steps: [
                { section: 'proveedores', selector: '#prov-nombre', title: 'Crear proveedor', text: 'Registra aquí el nombre completo de quien entrega los alimentos.' },
                { section: 'proveedores', selector: '#prov-documento', title: 'Documento de identidad', text: 'Identifica a la persona responsable de la entrega, por ejemplo: CC 1234567890.' },
                { section: 'proveedores', selector: '#prov-entidad', title: 'Entidad y NIT', text: 'La entidad administradora o prestadora y su NIT quedarán impresos en las actas generadas.' },
                { section: 'proveedores', selector: '.prov-btn-primary[onclick="provGuardar()"]', title: 'Guardar proveedor', text: 'Al guardar, el proveedor queda disponible para seleccionarlo rápidamente desde el Directorio de actas.' },
                { section: 'proveedores', selector: '#prov-table-wrap', fallbackSelector: '#prov-empty-state', title: 'Proveedores registrados', text: 'Aquí verás la lista de proveedores guardados, con opciones para editar o eliminar cada uno.', fallbackText: 'Cuando guardes proveedores, aparecerán listados aquí con opciones para editar o eliminar.' }
            ]
        },

        gramajes: {
            icon: ICONS.gramajes,
            label: 'Editar Minutas',
            steps: [
                { section: 'editor', selector: '#editorInfo', title: 'Editor de Gramajes', text: 'Edita los gramajes (cantidad de cada producto por niño) de la minuta patrón, según la Regional y Modalidad activas.' },
                { section: 'editor', selector: '#editorProductSelect', title: 'Elegir producto', text: 'Selecciona el producto a editar. Verás su categoría y unidad de medida automáticamente.' },
                { section: 'editor', selector: '#matrixContainer', title: 'Matriz de gramajes', text: 'Ajusta el gramaje del producto para cada Menú (M1 a M25), organizados por semana. Los cambios quedan marcados hasta que los guardes.' },
                { section: 'editor', selector: '#btnGuardarFirebase', title: 'Guardar en Firebase', text: 'Guarda los cambios para que se apliquen de inmediato en la generación de listas semanales y mensuales.' },
                { section: 'editor', selector: '.btn-warning[onclick="restaurarValoresOriginales()"]', title: 'Restaurar originales', text: 'Si te equivocas, este botón regresa todos los gramajes a sus valores de fábrica.' }
            ]
        },

        cargue: {
            icon: ICONS.cargue,
            label: 'Agregar Minutas',
            steps: [
                { section: 'cargue', selector: '.cm-card-target', title: 'Elige el operador destino', text: 'Selecciona Regional, Modalidad y Operador al que le vas a cargar su minuta propia. El estado de productos actuales se muestra en la tarjeta.' },
                { section: 'cargue', selector: '#cargueModo', title: 'Modo de carga', text: '"Agregar" suma productos nuevos sin borrar los existentes. "Reemplazar" borra la minuta actual del operador y la sustituye por completo.' },
                { section: 'cargue', selector: '.cm-tabs', title: 'Excel o JSON', text: 'Carga la minuta subiendo un archivo Excel (columnas Producto, Categoría, Unidad, M1..M25) o pegando un JSON con el mismo formato.' },
                { section: 'cargue', selector: '.cm-file-wrapper', title: 'Subir archivo', text: 'Selecciona el archivo Excel del operador. Puedes descargar antes la plantilla para no equivocarte con las columnas.' },
                { section: 'cargue', selector: '#cargueTablaPreview', fallbackSelector: '#cargueBtnGuardar', title: 'Revisar antes de guardar', text: 'Antes de guardar, revisa la previsualización de los productos que se cargarán.', fallbackText: 'Cuando cargues un archivo o JSON, aquí aparecerá la previsualización de los productos antes de guardarlos.' },
                { section: 'cargue', selector: '#cargueBtnGuardar', title: 'Guardar minuta', text: 'Guarda la minuta del operador en Firebase. Recuerda: crear, editar o eliminar operadores se hace en "Gestión de Operadores", no aquí.' },
                { section: 'cargue', selector: '[onclick="abrirModalCopiarMinuta()"]', title: 'Copiar minuta entre operadores', text: '¿Dos operadores usan la misma minuta? Usa "Copiar minuta" para duplicarla de un operador a otro sin volver a cargar el archivo.' }
            ]
        },

        operadores: {
            icon: ICONS.operadores,
            label: 'Gestionar Operadores',
            onExit: function () { safeCall('goCerrarModal'); },
            steps: [
                { section: 'gestion-operadores', before: function () { safeCall('goCerrarModal'); }, selector: '.go-btn-agregar', title: 'Crear operador', text: 'Pulsa aquí para abrir el formulario y crear un nuevo operador: Regional, Modalidad, nombre, código y color identificador.' },
                { section: 'gestion-operadores', before: function () { safeCall('goAbrirModalAgregar'); }, delay: 180, selector: '#goModalRegional', title: 'Regional y Modalidad', text: 'Elige la Regional y Modalidad del nuevo operador. Estos datos no se podrán cambiar después de creado.' },
                { section: 'gestion-operadores', before: function () { safeCall('goAbrirModalAgregar'); }, selector: '#goModalNombre', title: 'Nombre y código', text: 'Escribe el nombre del operador. El código interno se genera solo y debe ser único dentro de la misma modalidad.' },
                { section: 'gestion-operadores', before: function () { safeCall('goAbrirModalAgregar'); }, selector: '#goModalColor', title: 'Color identificador', text: 'Elige un color para reconocer rápido al operador en tablas y botones de toda la app.' },
                { section: 'gestion-operadores', before: function () { safeCall('goAbrirModalAgregar'); }, selector: '#goModalBtnGuardar', title: 'Crear operador', text: 'Al guardar, el operador queda disponible en el chip de perfil, en "Agregar Minutas" y en el Editor de Gramajes.' },
                { section: 'gestion-operadores', before: function () { safeCall('goCerrarModal'); }, selector: '.go-table-wrap', fallbackSelector: '.go-empty-state', title: 'Editar o eliminar', text: 'En la tabla, usa las acciones de cada fila para editar los datos de un operador o eliminarlo. Los filtros de arriba ayudan a encontrarlo por Regional, Modalidad o nombre.', fallbackText: 'Cuando existan operadores, la tabla aparecerá aquí con acciones por fila para editar o eliminar cada uno.' }
            ]
        },

        minutaPatron: {
            icon: ICONS.minutaPatron,
            label: 'Ver Minuta Patrón',
            steps: [
                { selector: 'a[data-section="Minuta"]', title: 'Minuta Patrón', text: 'Este enlace abre en una pestaña nueva la Minuta Patrón completa: el ciclo oficial de menús (M1 a M25) con todos los productos y gramajes base que usa la app.' }
            ]
        },

        calendario: {
            icon: ICONS.calendario,
            label: 'Ver Calendario',
            steps: [
                { section: 'calendar', selector: '#calendarNav', title: 'Navegar meses', text: 'Usa estas flechas para moverte entre meses y revisar días hábiles y festivos.' },
                { section: 'calendar', selector: '#calendarGrid', title: 'Vista del mes', text: 'Cada día indica si es festivo, fin de semana o el día de hoy, según la leyenda de abajo.' },
                { section: 'calendar', selector: '.calendar-legend', title: 'Leyenda', text: 'Los colores identifican fines de semana, festivos y el día actual, para planear mejor tus fechas de entrega.' }
            ]
        }
    };

    var TOPIC_ORDER = ['completo', 'perfil', 'semanal', 'mensual', 'actas', 'proveedores', 'gramajes', 'cargue', 'operadores', 'minutaPatron', 'calendario'];

    // ── Estado ──────────────────────────────────────────────────
    var state = { topicId: null, topic: null, stepIndex: 0 };
    var els = {};
    var STORAGE_KEY = 'tutDoneTopics_v1';
    var SEEN_KEY = 'tutFabSeen_v1';

    function getDone() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }
    function markDone(id) {
        var d = getDone();
        if (d.indexOf(id) === -1) { d.push(id); }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
    }
    function resetDone() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // ── Construcción del DOM ───────────────────────────────────
    function buildDom() {
        var fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'tut-fab';
        fab.id = 'tutFab';
        fab.title = 'Tutorial y ayuda';
        fab.innerHTML = ICONS.help;
        try { if (!localStorage.getItem(SEEN_KEY)) fab.classList.add('tut-fab-pulse'); } catch (e) {}

        var menuOverlay = document.createElement('div');
        menuOverlay.className = 'tut-menu-overlay';
        menuOverlay.id = 'tutMenuOverlay';

        var menu = document.createElement('div');
        menu.className = 'tut-menu';
        menu.id = 'tutMenu';
        menu.innerHTML = '<div class="tut-menu-header">Centro de ayuda</div><div id="tutMenuItems"></div>';

        var catcher = document.createElement('div');
        catcher.className = 'tut-catcher';
        catcher.id = 'tutCatcher';

        var spotlight = document.createElement('div');
        spotlight.className = 'tut-spotlight';
        spotlight.id = 'tutSpotlight';

        var card = document.createElement('div');
        card.className = 'tut-card';
        card.id = 'tutCard';
        card.innerHTML =
            '<div class="tut-card-topline">' +
                '<span class="tut-card-progress" id="tutProgress"></span>' +
                '<button type="button" class="tut-card-close" id="tutCardClose" title="Cerrar">' + ICONS.close + '</button>' +
            '</div>' +
            '<div class="tut-card-title"><span class="tut-card-icon" id="tutCardIcon"></span><span class="tut-card-title-text" id="tutTitle"></span></div>' +
            '<div class="tut-card-text" id="tutText"></div>' +
            '<div class="tut-card-dots" id="tutDots"></div>' +
            '<div class="tut-card-nav">' +
                '<button type="button" class="tut-btn tut-btn-ghost" id="tutPrevBtn">' + ICONS.chevronLeft + '<span>Atrás</span></button>' +
                '<button type="button" class="tut-btn tut-btn-skip" id="tutSkipBtn">Saltar</button>' +
                '<button type="button" class="tut-btn tut-btn-primary" id="tutNextBtn"><span id="tutNextLabel">Siguiente</span>' + ICONS.chevronRight + '</button>' +
            '</div>';

        document.body.appendChild(fab);
        document.body.appendChild(menuOverlay);
        document.body.appendChild(menu);
        document.body.appendChild(catcher);
        document.body.appendChild(spotlight);
        document.body.appendChild(card);

        els.fab = fab;
        els.menuOverlay = menuOverlay;
        els.menu = menu;
        els.menuItems = menu.querySelector('#tutMenuItems');
        els.catcher = catcher;
        els.spotlight = spotlight;
        els.card = card;
        els.progress = card.querySelector('#tutProgress');
        els.cardIcon = card.querySelector('#tutCardIcon');
        els.title = card.querySelector('#tutTitle');
        els.text = card.querySelector('#tutText');
        els.dots = card.querySelector('#tutDots');
        els.prevBtn = card.querySelector('#tutPrevBtn');
        els.skipBtn = card.querySelector('#tutSkipBtn');
        els.nextBtn = card.querySelector('#tutNextBtn');
        els.nextLabel = card.querySelector('#tutNextLabel');
        els.closeBtn = card.querySelector('#tutCardClose');

        renderMenuItems();
        wireEvents();
    }

    function renderMenuItems() {
        var done = getDone();
        var html = '';
        TOPIC_ORDER.forEach(function (id) {
            var t = TUT_TOPICS[id];
            if (!t) return;
            var isDone = done.indexOf(id) !== -1;
            html += '<button type="button" class="tut-menu-item' + (isDone ? ' tut-done' : '') + '" data-topic="' + id + '">' +
                        '<span class="tut-menu-icon">' + t.icon + '</span>' +
                        '<span class="tut-menu-label">' + t.label + '</span>' +
                        (isDone ? '<span class="tut-menu-check">' + ICONS.check + '</span>' : '') +
                    '</button>';
        });
        html += '<div class="tut-menu-divider"></div>';
        html += '<button type="button" class="tut-menu-item tut-menu-ghost" data-action="reset"><span class="tut-menu-icon">' + ICONS.reset + '</span><span class="tut-menu-label">Resetear tutorial</span></button>';
        html += '<button type="button" class="tut-menu-item tut-menu-danger" data-action="close"><span class="tut-menu-icon">' + ICONS.close + '</span><span class="tut-menu-label">Cerrar menú</span></button>';
        els.menuItems.innerHTML = html;
    }

    // ── Menú ────────────────────────────────────────────────────
    function openMenu() {
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
        els.fab.classList.remove('tut-fab-pulse');
        renderMenuItems();
        els.menuOverlay.classList.add('open');
        els.menu.classList.add('open');
        els.fab.classList.add('tut-fab-active');
    }
    function closeMenu() {
        els.menuOverlay.classList.remove('open');
        els.menu.classList.remove('open');
        els.fab.classList.remove('tut-fab-active');
    }
    function toggleMenu() {
        if (els.menu.classList.contains('open')) closeMenu(); else openMenu();
    }

    // ── Motor del recorrido ────────────────────────────────────
    function startTopic(id) {
        var topic = TUT_TOPICS[id];
        if (!topic) return;
        closeMenu();
        state.topicId = id;
        state.topic = topic;
        state.stepIndex = 0;
        document.body.classList.add('tutorial-active');
        els.catcher.classList.add('active');
        els.fab.classList.add('tut-fab-hidden');
        goToStep(0);
    }

    function goToStep(idx) {
        var steps = state.topic.steps;
        if (idx < 0 || idx >= steps.length) return;
        state.stepIndex = idx;
        showStepAt(idx);
    }

    function showStepAt(idx) {
        var step = state.topic.steps[idx];
        if (step.section) { safeCall('showSection', step.section); }
        if (step.before) { try { step.before(); } catch (e) {} }

        setTimeout(function () {
            var el = null;
            var usedFallback = false;
            if (step.selector) {
                var candidate = document.querySelector(step.selector);
                if (candidate && isVisible(candidate)) el = candidate;
            }
            if (!el && step.fallbackSelector) {
                var fb = document.querySelector(step.fallbackSelector);
                if (fb) { el = fb; usedFallback = true; }
            }
            if (el) {
                try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch (e) {}
                setTimeout(function () { renderStep(step, idx, el, usedFallback); }, 300);
            } else {
                renderStep(step, idx, null, usedFallback);
            }
        }, step.delay || 70);
    }

    function fillCard(step, idx, usedFallback) {
        var total = state.topic.steps.length;
        els.progress.textContent = 'Paso ' + (idx + 1) + ' de ' + total;
        els.cardIcon.innerHTML = state.topic.icon || '';
        els.title.textContent = step.title || '';
        els.text.textContent = (usedFallback && step.fallbackText) ? step.fallbackText : (step.text || '');

        var dotsHtml = '';
        for (var i = 0; i < total; i++) {
            dotsHtml += '<span class="tut-card-dot' + (i === idx ? ' tut-dot-active' : '') + '"></span>';
        }
        els.dots.innerHTML = dotsHtml;

        els.prevBtn.disabled = idx === 0;
        els.nextLabel.textContent = idx === total - 1 ? 'Finalizar' : (idx === 0 ? 'Comenzar' : 'Siguiente');
    }

    function positionForElement(r) {
        var pad = 8, gap = 14;
        var vw = window.innerWidth, vh = window.innerHeight;
        var cw = els.card.offsetWidth, ch = els.card.offsetHeight;

        var spaceBelow = vh - (r.top + r.height) - pad;
        var spaceAbove = r.top - pad;
        var spaceRight = vw - (r.left + r.width) - pad;
        var spaceLeft = r.left - pad;

        var top, left;
        if (spaceBelow >= ch + gap || (spaceBelow >= spaceAbove && spaceBelow >= 90)) {
            top = r.top + r.height + pad + gap;
            left = r.left + r.width / 2 - cw / 2;
        } else if (spaceAbove >= ch + gap) {
            top = r.top - pad - gap - ch;
            left = r.left + r.width / 2 - cw / 2;
        } else if (spaceRight >= cw + gap) {
            left = r.left + r.width + pad + gap;
            top = r.top + r.height / 2 - ch / 2;
        } else if (spaceLeft >= cw + gap) {
            left = r.left - pad - gap - cw;
            top = r.top + r.height / 2 - ch / 2;
        } else {
            top = Math.max(vh - ch - 12, 12);
            left = r.left + r.width / 2 - cw / 2;
        }

        left = Math.min(Math.max(left, 10), vw - cw - 10);
        top = Math.min(Math.max(top, 10), vh - ch - 10);
        return { top: top, left: left };
    }

    function renderStep(step, idx, el, usedFallback) {
        fillCard(step, idx, usedFallback);

        if (el) {
            var r = el.getBoundingClientRect();
            var pad = 8;
            var top = Math.max(r.top - pad, 4);
            var left = Math.max(r.left - pad, 4);
            var width = Math.min(r.width + pad * 2, window.innerWidth - left - 4);
            var height = Math.min(r.height + pad * 2, window.innerHeight - top - 4);

            els.spotlight.classList.remove('tut-spot-center');
            els.spotlight.style.top = top + 'px';
            els.spotlight.style.left = left + 'px';
            els.spotlight.style.width = width + 'px';
            els.spotlight.style.height = height + 'px';
            els.spotlight.classList.add('active');

            els.card.classList.remove('tut-card-center');
            els.card.classList.add('active');
            els.card.style.opacity = '0';
            requestAnimationFrame(function () {
                var pos = positionForElement(r);
                els.card.style.top = pos.top + 'px';
                els.card.style.left = pos.left + 'px';
                requestAnimationFrame(function () { els.card.style.opacity = ''; });
            });
        } else {
            els.spotlight.style.top = '50%';
            els.spotlight.style.left = '50%';
            els.spotlight.style.width = '0px';
            els.spotlight.style.height = '0px';
            els.spotlight.classList.add('active');
            els.spotlight.classList.add('tut-spot-center');

            els.card.classList.add('tut-card-center');
            els.card.style.top = '';
            els.card.style.left = '';
            els.card.classList.add('active');
        }
    }

    function next() {
        var total = state.topic.steps.length;
        if (state.stepIndex >= total - 1) { finish(); return; }
        goToStep(state.stepIndex + 1);
    }
    function prev() {
        if (state.stepIndex <= 0) return;
        goToStep(state.stepIndex - 1);
    }

    function closeTutorial(didFinish) {
        if (state.topic) {
            if (didFinish && state.topicId) markDone(state.topicId);
            if (state.topic.onExit) { try { state.topic.onExit(); } catch (e) {} }
        }
        state.topicId = null;
        state.topic = null;
        state.stepIndex = 0;
        els.spotlight.classList.remove('active', 'tut-spot-center');
        els.card.classList.remove('active', 'tut-card-center');
        els.card.style.opacity = '';
        els.catcher.classList.remove('active');
        document.body.classList.remove('tutorial-active');
        els.fab.classList.remove('tut-fab-hidden');
    }
    function finish() { closeTutorial(true); }

    // ── Reposicionar en resize/scroll mientras un paso está activo ──
    function reflow() {
        if (!state.topic) return;
        var step = state.topic.steps[state.stepIndex];
        if (!step || !step.selector) return;
        var el = document.querySelector(step.selector);
        if (el && isVisible(el)) renderStep(step, state.stepIndex, el, false);
    }
    var reflowTimer = null;
    function scheduleReflow() {
        clearTimeout(reflowTimer);
        reflowTimer = setTimeout(reflow, 120);
    }

    // ── Eventos ─────────────────────────────────────────────────
    function wireEvents() {
        els.fab.addEventListener('click', toggleMenu);
        els.menuOverlay.addEventListener('click', closeMenu);

        els.menuItems.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-topic],[data-action]');
            if (!btn) return;
            if (btn.dataset.topic) { startTopic(btn.dataset.topic); return; }
            if (btn.dataset.action === 'reset') {
                resetDone();
                renderMenuItems();
                return;
            }
            if (btn.dataset.action === 'close') { closeMenu(); return; }
        });

        els.nextBtn.addEventListener('click', next);
        els.prevBtn.addEventListener('click', prev);
        els.skipBtn.addEventListener('click', function () { closeTutorial(false); });
        els.closeBtn.addEventListener('click', function () { closeTutorial(false); });
        els.catcher.addEventListener('click', function () { closeTutorial(false); });

        window.addEventListener('resize', scheduleReflow);
        window.addEventListener('scroll', scheduleReflow, true);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (state.topic) { closeTutorial(false); }
            else if (els.menu.classList.contains('open')) { closeMenu(); }
        });
    }

    // ── API pública (por si se quiere lanzar desde otro botón) ──
    window.tutAbrirMenu = openMenu;
    window.tutIniciar = startTopic;

    function init() {
        if (document.getElementById('tutFab')) return;
        buildDom();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
