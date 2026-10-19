// ==================== INICIO (DASHBOARD) ====================
// Módulo autocontenido para el apartado "Inicio":
// 1. Acciones rápidas aleatorias  2. Actividad reciente  3. Consejos dinámicos
// 4. Estado de configuración visual  5. Banner rotativo  6. Fondo vivo

// ---------------------------------------------------------------
// 1) REGISTRO DE ACTIVIDAD RECIENTE (local, ligero, independiente
//    de la auditoría de admin.js)
// ---------------------------------------------------------------
const INI_ACTIVIDAD_KEY = 'smartMenu_actividadReciente';
const INI_ACTIVIDAD_MAX = 12;
const INI_ACTIVIDAD_VISIBLES = 4;

const INI_TIPOS_ACTIVIDAD = {
	lista:     { color: '#10b981', icon: '<path d="M20 6L9 17l-5-5"/>' },
	mensual:   { color: '#f59e0b', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M7.5 15h2M12 15h4.5"/>' },
	editar:    { color: '#3b82f6', icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' },
	operador:  { color: '#8b5cf6', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
	gramaje:   { color: '#f59e0b', icon: '<path d="M21 8V5a1 1 0 0 0-1-1h-3M3 8V5a1 1 0 0 1 1-1h3M3 16v3a1 1 0 0 0 1 1h3m10 0h3a1 1 0 0 0 1-1v-3"/><rect x="7" y="7" width="10" height="10" rx="1"/>' },
	eliminar:  { color: '#ef4444', icon: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' },
	cargue:    { color: '#22d3ee', icon: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>' },
	directorio:{ color: '#ec4899', icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>' },
	acta:      { color: '#14b8a6', icon: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3"/><path d="M9 13l2 2 4-4"/>' }
};

// Tipos que se guardan y muestran únicamente en este dispositivo/usuario
// (no tienen equivalente en la auditoría global de Firebase).
const INI_TIPOS_SOLO_LOCAL = ['acta', 'cargue', 'directorio', 'editar'];

// Guarda una actividad y re-renderiza el widget si Inicio está visible.
// Uso desde otros módulos: registrarActividadInicio('lista', 'Lista Semana 4 generada')
function registrarActividadInicio(tipo, titulo) {
	try {
		let lista = JSON.parse(localStorage.getItem(INI_ACTIVIDAD_KEY)) || [];
		lista.unshift({ tipo: INI_TIPOS_ACTIVIDAD[tipo] ? tipo : 'editar', titulo: titulo, ts: Date.now() });
		lista = lista.slice(0, INI_ACTIVIDAD_MAX);
		localStorage.setItem(INI_ACTIVIDAD_KEY, JSON.stringify(lista));
	} catch (e) { /* almacenamiento no disponible: silencioso */ }

	const seccion = document.getElementById('section-inicio');
	if (seccion && seccion.classList.contains('active')) renderInicioActividad();
}

function iniTiempoRelativo(ts) {
	const diffMs = Date.now() - ts;
	const min = Math.floor(diffMs / 60000);
	if (min < 1) return 'Justo ahora';
	if (min < 60) return `Hace ${min} min`;
	const horas = Math.floor(min / 60);
	if (horas < 24) return `Hace ${horas} h`;
	const dias = Math.floor(horas / 24);
	if (dias === 1) return 'Ayer';
	if (dias < 7) return `Hace ${dias} días`;
	return new Date(ts).toLocaleDateString('es-CO');
}

// Traduce los registros de auditoría global (Firebase, todos los usuarios)
// a entradas visibles en el widget de Actividad reciente. Cubre: operadores
// creados/editados/eliminados, gramajes actualizados y listas semanales o
// mensuales generadas — todo lo demás (actas, cargues, directorio) se queda
// en el registro local, ya que es "solo el usuario que ingresa".
const INI_ACCIONES_AUDITORIA = {
	CREAR_OPERADOR:        { tipo: 'operador', texto: d => `Operador agregado: ${d.operadorNombre || '—'}` },
	EDITAR_OPERADOR:       { tipo: 'operador', texto: d => `Operador editado: ${d.operadorNombreNuevo || '—'}` },
	ELIMINAR_OPERADOR:     { tipo: 'eliminar', texto: d => `Operador eliminado: ${d.operadorNombre || '—'}` },
	GENERAR_LISTA:         { tipo: 'lista',    texto: d => `Lista semanal generada: Semana ${d.semana ?? '—'}` },
	GENERAR_LISTA_MENSUAL: { tipo: 'mensual',  texto: d => {
		const n = (d.semanas || []).length;
		return `Lista mensual generada${n ? ` (${n} semana${n === 1 ? '' : 's'})` : ''}`;
	}},
	ACTUALIZAR_GRAMAJE:    { tipo: 'gramaje',  texto: d => `Gramajes actualizados: ${d.titulo || (d.modalidad ? d.modalidad.toUpperCase() : '—')}` }
};

function iniNombreRegional(codigo) {
	try {
		if (typeof regionales !== 'undefined' && regionales[codigo]?.titulo) {
			return regionales[codigo].titulo.replace('Regional ', '');
		}
	} catch (e) { /* silencioso */ }
	return codigo || '';
}

function iniObtenerEntradasGlobales() {
	if (typeof registrosAuditoria === 'undefined' || !Array.isArray(registrosAuditoria)) return [];
	return registrosAuditoria
		.filter(r => INI_ACCIONES_AUDITORIA[r.accion])
		.slice(0, 30)
		.map(r => {
			const def = INI_ACCIONES_AUDITORIA[r.accion];
			const regNombre = iniNombreRegional(r.regional);
			return {
				tipo: def.tipo,
				titulo: def.texto(r.detalles || {}) + (regNombre ? ` · ${regNombre}` : ''),
				ts: r.timestamp || r.id || Date.now(),
				global: true
			};
		});
}

function renderInicioActividad() {
	const cont = document.getElementById('iniActividadList');
	if (!cont) return;

	let local = [];
	try { local = JSON.parse(localStorage.getItem(INI_ACTIVIDAD_KEY)) || []; } catch (e) { local = []; }
	// Evita duplicar en pantalla lo que ya llega desde la auditoría global
	// (operador/lista/gramaje): del registro local solo se muestra lo que
	// es realmente personal (actas, cargues, directorio, otros).
	local = local.filter(item => INI_TIPOS_SOLO_LOCAL.includes(item.tipo));

	const combinada = local.concat(iniObtenerEntradasGlobales())
		.sort((a, b) => b.ts - a.ts)
		.slice(0, INI_ACTIVIDAD_VISIBLES);

	if (!combinada.length) {
		cont.innerHTML = '<div class="ini-empty-mini">Aún no hay actividad registrada.<br>Tus últimas acciones aparecerán aquí.</div>';
		return;
	}

	cont.innerHTML = combinada.map(item => {
		const meta = INI_TIPOS_ACTIVIDAD[item.tipo] || INI_TIPOS_ACTIVIDAD.editar;
		return `
			<div class="ini-timeline-item">
				<div class="ini-timeline-dot" style="background:${meta.color};box-shadow:0 0 8px ${meta.color}99;">
					<svg viewBox="0 0 24 24">${meta.icon}</svg>
				</div>
				<div>
					<div class="ini-timeline-title">${item.titulo}${item.global ? ' <span class="ini-timeline-badge">Todos</span>' : ''}</div>
					<div class="ini-timeline-time">${iniTiempoRelativo(item.ts)}</div>
				</div>
			</div>`;
	}).join('');
}

// ---------------------------------------------------------------
// 3) CONSEJOS DINÁMICOS (10 consejos, rotación automática + manual,
//    inicio aleatorio en cada apertura de la app)
// ---------------------------------------------------------------
const INI_TIPS = [
	'Puedes seleccionar varios días al generar tu lista para ahorrar tiempo.',
	'Cambia de Regional u Operador desde el chip "Perfil activo" sin perder tu configuración.',
	'El Editor de Gramajes te permite ajustar cantidades por producto y por modalidad.',
	'Guarda tus listas generadas para reutilizarlas o compararlas más adelante en "Guardadas".',
	'En el Listado Mensual puedes combinar varias semanas en una sola lista consolidada.',
	'Usa el Directorio UDS para calcular coberturas reales por número de niños atendidos.',
	'El Calendario de Festivos ayuda a excluir automáticamente los días no hábiles.',
	'Con "Cargue de Minuta por Operador" puedes registrar entregas específicas de cada operador.',
	'Activa el Modo Oscuro desde el panel lateral para cuidar tu vista en jornadas largas.',
	'Revisa "Gestión de Operadores" para crear o editar operadores sin afectar la minuta base.'
];

let iniTipIndex = 0;
let iniTipTimer = null;

function renderConsejo() {
	const iconoEl = document.getElementById('iniTipTexto');
	const counterEl = document.getElementById('iniTipCounter');
	if (!iconoEl) return;
	iconoEl.textContent = INI_TIPS[iniTipIndex];
	if (counterEl) counterEl.textContent = `${iniTipIndex + 1} / ${INI_TIPS.length}`;
}

function iniConsejoIr(delta) {
	iniTipIndex = (iniTipIndex + delta + INI_TIPS.length) % INI_TIPS.length;
	renderConsejo();
	iniReiniciarTimerConsejo();
}

function iniReiniciarTimerConsejo() {
	if (iniTipTimer) clearInterval(iniTipTimer);
	iniTipTimer = setInterval(() => {
		iniTipIndex = (iniTipIndex + 1) % INI_TIPS.length;
		renderConsejo();
	}, 9000);
}

// ---------------------------------------------------------------
// 4) ESTADO DE CONFIGURACIÓN (visual, con íconos y chips de color)
// ---------------------------------------------------------------
function renderInicioConfig() {
	const cont = document.getElementById('iniConfigStrip');
	if (!cont || typeof regionales === 'undefined') return;

	const regTitulo = (regionales[currentRegional]?.titulo || currentRegional).replace('Regional ', '');
	const regColor = currentRegional === 'gaitana' ? '#10b981' : '#3b82f6';
	const modSiglas = currentModalidad ? currentModalidad.toUpperCase() : '—';
	const opNombre = currentOperador ? (operadoresNombres[currentOperador] || currentOperador.toUpperCase()) : null;

	const chips = [
		{ icon: '<circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>', label: 'Regional', value: regTitulo.toUpperCase(), color: regColor },
		{ icon: '<path d="M3 9l9-6 9 6-9 6-9-6z"/><path d="M3 9v6l9 6 9-6V9"/>', label: 'Modalidad', value: modSiglas, color: '#8b5cf6' }
	];
	if (opNombre) {
		chips.push({ icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>', label: 'Operador', value: opNombre, color: '#f97316' });
	}

	cont.innerHTML = `
		<div class="ini-config-strip-chips">
			${chips.map(c => `
				<div class="ini-config-chip">
					<span class="ini-config-chip-icon" style="color:${c.color};"><svg viewBox="0 0 24 24">${c.icon}</svg></span>
					<span class="ini-config-chip-label">${c.label}</span>
					<span class="ini-config-chip-value">${c.value}</span>
				</div>
			`).join('')}
		</div>
		<button type="button" class="ini-config-strip-cta" onclick="showSection('calculator')">
			<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
			Todo listo para generar
		</button>`;
}

// ---------------------------------------------------------------
// 1) ACCIONES RÁPIDAS ALEATORIAS (4 de 10, elegidas una vez por
//    apertura de la aplicación)
// ---------------------------------------------------------------
const INI_ACCIONES = [
	{ section: 'calculator', title: 'Minutas Semanales', desc: 'Generar la lista de esta semana', color: '#8b5cf6', icon: '<path d="M7 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2M7 2v20M7 6H4"/><path d="M17 2c-2.2 0-4 2.7-4 6 0 2.2 1.1 3.4 2.2 4V22"/>' },
	{ section: 'monthly', title: 'Listado Mensual', desc: 'Consolidar varias semanas del mes', color: '#f59e0b', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
	{ section: 'directorio', title: 'Directorio UDS', desc: 'Gestionar unidades y coberturas', color: '#ec4899', icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>' },
	{ section: 'proveedores', title: 'Proveedores', desc: 'Gestionar la base de proveedores', color: '#10b981', icon: '<path d="M2 21V11l5 3V11l5 3V11l5 3v7H2z"/><path d="M17 21V9l4-2v14"/>' },
	{ section: 'editor', title: 'Editor de Gramajes', desc: 'Configurar gramajes por producto', color: '#3b82f6', icon: '<path d="M12 3v18M7 21h10M12 3l-2.5 2.5M12 3l2.5 2.5"/><path d="M5 7h14"/>' },
	{ section: 'cargue', title: 'Agregar Minutas', desc: 'Cargue de minuta por operador', color: '#22d3ee', icon: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>' },
	{ section: 'gestion-operadores', title: 'Gestión de Operadores', desc: 'Administrar operadores y permisos', color: '#f97316', icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>' },
	{ section: 'calendar', title: 'Calendario Festivos', desc: 'Consultar días festivos del año', color: '#eab308', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 13.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 15.3l2-.3z"/>' },
	{ section: 'saved', title: 'Listas Guardadas', desc: 'Ver y reutilizar listas anteriores', color: '#a855f7', icon: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>' },
	{ href: 'https://afkril.github.io/MINUTA_PATRON.html', title: 'Ver Minuta Patrón', desc: 'Consultar la minuta patrón de referencia', color: '#06b6d4', icon: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>' }
];

let iniAccionesElegidas = null;

function iniElegirAccionesAleatorias() {
	const copia = INI_ACCIONES.slice();
	for (let i = copia.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copia[i], copia[j]] = [copia[j], copia[i]];
	}
	iniAccionesElegidas = copia.slice(0, 4);
}

function renderInicioAccionesRapidas() {
	const cont = document.getElementById('iniAccionesGrid');
	if (!cont) return;
	if (!iniAccionesElegidas) iniElegirAccionesAleatorias();

	cont.innerHTML = iniAccionesElegidas.map(a => {
		const tag = a.href ? 'a' : 'button';
		const attrs = a.href
			? `href="${a.href}" target="_blank" rel="noopener noreferrer"`
			: `type="button" onclick="showSection('${a.section}')"`;
		return `
			<${tag} class="ini-quick-card" ${attrs}>
				<div class="ini-quick-icon" style="background:${a.color}22;color:${a.color};"><svg viewBox="0 0 24 24">${a.icon}</svg></div>
				<div class="ini-quick-body">
					<div class="ini-quick-body-title">${a.title}</div>
					<div class="ini-quick-body-desc">${a.desc}</div>
				</div>
				<div class="ini-quick-chevron"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>
			</${tag}>`;
	}).join('');
}

// ---------------------------------------------------------------
// 5) BANNER ROTATIVO + 6) FONDO VIVO (partículas / cubos)
// ---------------------------------------------------------------
const INI_BANNER_ICONS = [
	// Carrito
	'<path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h7.2a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
	// Cajas flotando
	'<path d="M4 8l6-3 6 3-6 3-6-3z"/><path d="M4 8v6l6 3 6-3V8"/><path d="M10 11v6"/><path d="M15 15l4-2v5l-4 2z"/><path d="M15 15l4-2"/>',
	// Frutas holográficas
	'<circle cx="9" cy="14" r="5"/><path d="M9 9c0-2 1-3 2.5-3.5"/><circle cx="17" cy="9" r="3.5"/><path d="M17 5.5c0-1.2.7-2 1.8-2.3"/>',
	// Calendario
	'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h2M8 17h2M14 14h2M14 17h2"/>',
	// Clipboard
	'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8.5 12h7M8.5 15.5h7M8.5 8.5h4"/>',
	// Supermercado
	'<path d="M4 9l1-5h14l1 5"/><path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 20v-5h6v5"/>'
];

let iniBannerIndex = 0;
let iniBannerTimer = null;
const INI_BANNER_COUNT = 6;

// Genera las 12 imágenes de banner (6 claro + 6 oscuro) dentro del stage.
// El CSS decide cuál set se muestra según data-theme; el JS solo mueve
// la clase .active en sincronía con el ícono/los dots rotativos.
function renderHeroBanners() {
	const stage = document.getElementById('iniHeroBannerStage');
	if (!stage) return;
	let html = '';
	for (let i = 1; i <= INI_BANNER_COUNT; i++) {
		const n = String(i).padStart(2, '0');
		html += `<div class="ini-hero-banner-img claro${i === 1 ? ' active' : ''}" style="background-image:url('img/banners/banner-claro-${n}.png')"></div>`;
	}
	for (let i = 1; i <= INI_BANNER_COUNT; i++) {
		const n = String(i).padStart(2, '0');
		html += `<div class="ini-hero-banner-img oscuro${i === 1 ? ' active' : ''}" style="background-image:url('img/banners/banner-oscuro-${n}.png')"></div>`;
	}
	stage.innerHTML = html;
}

function renderHeroIconos() {
	const stage = document.getElementById('iniHeroIconStage');
	if (!stage) return;
	stage.innerHTML = INI_BANNER_ICONS.map((path, i) =>
		`<svg viewBox="0 0 24 24" class="${i === 0 ? 'ini-icon-active' : ''}">${path}</svg>`
	).join('');

	const dots = document.getElementById('iniHeroDots');
	if (dots) {
		dots.innerHTML = INI_BANNER_ICONS.map((_, i) =>
			`<span class="ini-hero-dot${i === 0 ? ' active' : ''}"></span>`
		).join('');
	}
}

function iniRotarBanner() {
	const stage = document.getElementById('iniHeroIconStage');
	const dots = document.getElementById('iniHeroDots');
	if (!stage) return;
	const svgs = stage.querySelectorAll('svg');
	const dotEls = dots ? dots.querySelectorAll('.ini-hero-dot') : [];
	if (!svgs.length) return;

	svgs[iniBannerIndex]?.classList.remove('ini-icon-active');
	dotEls[iniBannerIndex]?.classList.remove('active');

	const bannerStage = document.getElementById('iniHeroBannerStage');
	const claroEls = bannerStage ? bannerStage.querySelectorAll('.claro') : [];
	const oscuroEls = bannerStage ? bannerStage.querySelectorAll('.oscuro') : [];
	claroEls[iniBannerIndex]?.classList.remove('active');
	oscuroEls[iniBannerIndex]?.classList.remove('active');

	iniBannerIndex = (iniBannerIndex + 1) % svgs.length;

	svgs[iniBannerIndex]?.classList.add('ini-icon-active');
	dotEls[iniBannerIndex]?.classList.add('active');
	claroEls[iniBannerIndex]?.classList.add('active');
	oscuroEls[iniBannerIndex]?.classList.add('active');
}

// Fondo vivo: genera partículas con posiciones/duraciones aleatorias (una sola vez)
function renderFondoVivo() {
	const cont = document.getElementById('iniHeroParticles');
	if (!cont) return;
	let html = '';
	for (let i = 0; i < 16; i++) {
		const left = Math.random() * 100;
		const duracion = (6 + Math.random() * 6).toFixed(1);
		const delay = (Math.random() * 8).toFixed(1);
		const drift = Math.round((Math.random() - 0.5) * 60);
		const bottom = Math.random() * 40;
		html += `<span class="ini-fv-particle" style="left:${left}%;bottom:${bottom}%;animation-duration:${duracion}s;animation-delay:-${delay}s;--ini-drift:${drift}px;"></span>`;
	}
	cont.innerHTML = html;
}

// ---------------------------------------------------------------
// SALUDO DINÁMICO (según hora del día) + FECHA DE HOY
// ---------------------------------------------------------------
function iniSaludoPorHora() {
	const h = new Date().getHours();
	if (h < 12) return 'Buenos días';
	if (h < 19) return 'Buenas tardes';
	return 'Buenas noches';
}

function renderInicioSaludo() {
	const nombreEl = document.getElementById('iniSaludoNombre');
	if (!nombreEl) return;
	let nombre = 'de nuevo';
	try {
		const displayName = window._perfilUsuarioActual?.displayName
			|| document.getElementById('user-display-name')?.textContent?.trim();
		if (displayName) nombre = displayName.split(' ')[0];
	} catch (e) { /* usar valor por defecto */ }
	nombreEl.textContent = nombre;

	const saludoEl = document.getElementById('iniSaludoPalabra');
	if (saludoEl) saludoEl.textContent = iniSaludoPorHora();

	const fechaEl = document.getElementById('iniHeroFecha');
	if (fechaEl) {
		try {
			const txt = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
			fechaEl.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
		} catch (e) { fechaEl.textContent = ''; }
	}
}

// ---------------------------------------------------------------
// MINI CALENDARIO DE LA SEMANA (L a D, festivos, día actual y
// número de semana dentro del mes — ver referencia visual)
// ---------------------------------------------------------------
const INI_DIAS_LETRA = ['L', 'M', 'M', 'J', 'V'];
const INI_DIAS_COMPLETOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Los festivos solo están cargados para 2026 (js/festivos.js). Si el año
// no coincide, simplemente no se marca ningún festivo en la cuadrícula.
function iniBuscarFestivo(dateStr) {
	try {
		if (typeof festivos2026 !== 'undefined' && dateStr.indexOf('2026-') === 0) {
			return festivos2026.find(f => f.fecha === dateStr) || null;
		}
	} catch (e) { /* silencioso */ }
	return null;
}

function iniLunesDeSemana(fecha) {
	const d = new Date(fecha);
	d.setHours(0, 0, 0, 0);
	const dow = d.getDay(); // 0=domingo..6=sábado
	const diff = (dow === 0) ? -6 : 1 - dow;
	d.setDate(d.getDate() + diff);
	return d;
}

// Lunes de la PRÓXIMA semana (la semana calendario siguiente a la actual).
function iniLunesProximaSemana(fecha) {
	const lunesActual = iniLunesDeSemana(fecha);
	lunesActual.setDate(lunesActual.getDate() + 7);
	return lunesActual;
}

// El último viernes de cada mes es día no laboral interno ("Día GET").
function iniEsUltimoViernesDelMes(fecha) {
	if (fecha.getDay() !== 5) return false;
	const siguienteViernes = new Date(fecha);
	siguienteViernes.setDate(fecha.getDate() + 7);
	return siguienteViernes.getMonth() !== fecha.getMonth();
}

// Número de semana DENTRO DEL MES (no del año), en bloques de lunes a
// viernes. La Semana 1 de un mes arranca en su primer lunes.
// Ej.: si el 1 de agosto cae en sábado, el primer lunes es el 3, así que
// "del 3 al 7 de agosto" es la Semana 1.
function iniSemanaDelMes(lunes) {
	const anio = lunes.getFullYear();
	const mes = lunes.getMonth();
	const primerLunes = new Date(anio, mes, 1);
	const dowPrimero = primerLunes.getDay();
	const offset = (dowPrimero === 0) ? 1 : (dowPrimero === 1 ? 0 : 8 - dowPrimero);
	primerLunes.setDate(1 + offset);
	const numero = Math.round((lunes - primerLunes) / (7 * 24 * 60 * 60 * 1000)) + 1;
	return { numero, mes, anio };
}

function iniFormatRangoSemana(lunes) {
	const viernes = new Date(lunes);
	viernes.setDate(viernes.getDate() + 4);
	if (typeof nombresMeses === 'undefined') return '';
	const mLunes = nombresMeses[lunes.getMonth()].toLowerCase();
	const mViernes = nombresMeses[viernes.getMonth()].toLowerCase();
	if (lunes.getMonth() === viernes.getMonth()) {
		return `${lunes.getDate()} al ${viernes.getDate()} de ${mLunes}`;
	}
	return `${lunes.getDate()} ${mLunes.slice(0, 3)}. – ${viernes.getDate()} ${mViernes.slice(0, 3)}.`;
}

function renderCalendarioSemanaInicio() {
	const grid = document.getElementById('iniWeekGrid');
	if (!grid) return;

	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const lunes = iniLunesProximaSemana(hoy);
	const { numero: semanaNum, mes } = iniSemanaDelMes(lunes);

	let html = '';
	let alertaFestivo = null;
	let alertaGET = null;
	for (let i = 0; i < 5; i++) {
		const dia = new Date(lunes);
		dia.setDate(lunes.getDate() + i);
		const dateStr = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
		const esHoy = dia.getTime() === hoy.getTime();
		const festivo = iniBuscarFestivo(dateStr);
		const esGET = !festivo && iniEsUltimoViernesDelMes(dia);

		if (festivo && !alertaFestivo) alertaFestivo = { dia, festivo };
		if (esGET && !alertaGET) alertaGET = { dia };

		const clases = ['ini-week-day'];
		if (esHoy) clases.push('is-today');
		if (festivo) clases.push('is-holiday');
		if (esGET) clases.push('is-get');

		let tooltip = '';
		if (festivo) tooltip = festivo.nombre;
		else if (esGET) tooltip = 'Día GET · último viernes del mes (no laborable)';

		html += `
			<div class="${clases.join(' ')}"${tooltip ? ` title="${tooltip}"` : ''}>
				<span class="ini-week-day-letter">${INI_DIAS_LETRA[i]}</span>
				<span class="ini-week-day-num">${dia.getDate()}</span>
				${esGET ? '<span class="ini-week-day-get">GET</span>' : ''}
				${esHoy ? '<span class="ini-week-day-dot"></span>' : ''}
			</div>`;
	}
	grid.innerHTML = html;

	const labelEl = document.getElementById('iniWeekLabel');
	if (labelEl && typeof nombresMeses !== 'undefined') {
		labelEl.innerHTML = `Semana ${semanaNum} de ${nombresMeses[mes]} <span>· ${iniFormatRangoSemana(lunes)}</span>`;
	}

	const todayEl = document.getElementById('iniWeekToday');
	if (todayEl) {
		const dowHoy = hoy.getDay();
		const idx = (dowHoy === 0) ? 6 : dowHoy - 1;
		todayEl.textContent = `Hoy: ${INI_DIAS_COMPLETOS[idx]} ${hoy.getDate()}`;
	}

	const tipTitleEl = document.getElementById('iniWeekTipTitle');
	const tipDescEl = document.getElementById('iniWeekTipDesc');
	if (tipTitleEl && tipDescEl) {
		if (alertaFestivo) {
			const idx = (alertaFestivo.dia.getDay() === 0) ? 6 : alertaFestivo.dia.getDay() - 1;
			tipTitleEl.textContent = `Festivo la próxima semana: ${alertaFestivo.festivo.nombre}`;
			tipDescEl.textContent = `${INI_DIAS_COMPLETOS[idx]} ${alertaFestivo.dia.getDate()} · ten en cuenta este día no hábil al planear entregas.`;
		} else if (alertaGET) {
			tipTitleEl.textContent = `Día GET el viernes ${alertaGET.dia.getDate()}`;
			tipDescEl.textContent = 'Último viernes del mes: no se trabaja ese día.';
		} else {
			tipTitleEl.textContent = 'Prepara tu lista para la próxima semana';
			tipDescEl.textContent = 'No olvides verificar gramajes y operadores.';
		}
	}
}

// ---------------------------------------------------------------
// INICIALIZACIÓN (lazy, llamada desde showSection en navegacion.js)
// ---------------------------------------------------------------
function initInicio() {
	renderInicioSaludo();
	renderHeroIconos();
	renderHeroBanners();
	renderFondoVivo();
	if (iniBannerTimer) clearInterval(iniBannerTimer);
	iniBannerTimer = setInterval(iniRotarBanner, 4000);

	iniTipIndex = Math.floor(Math.random() * INI_TIPS.length);
	renderConsejo();
	iniReiniciarTimerConsejo();

	renderInicioAccionesRapidas();
	renderInicioActividad();
	renderInicioConfig();
	renderCalendarioSemanaInicio();
}

// Re-render ligero para visitas posteriores a Inicio dentro de la misma sesión
// (los datos de configuración/actividad pueden haber cambiado).
function refrescarInicio() {
	renderInicioSaludo();
	renderInicioActividad();
	renderInicioConfig();
	renderCalendarioSemanaInicio();
}

// La sección "Inicio" ya viene marcada como activa en el HTML (es la vista de
// entrada de la app), por lo que su inicialización no pasa por showSection()
// como el resto de secciones: se dispara aquí mismo al cargar la página.
document.addEventListener('DOMContentLoaded', () => {
	initInicio();
	if (typeof _sectionInitialized === 'object') _sectionInitialized['inicio'] = true;
});
