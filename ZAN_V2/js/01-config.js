// ZAN - Configuración Firebase, Variables Globales y AppState
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
