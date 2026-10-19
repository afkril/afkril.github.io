// ==================== GESTIÓN DE OPERADORES ====================
// Módulo independiente del "Cargue de Minuta": centraliza en una sola tabla
// dinámica el alta, edición (nombre/color) y eliminación de operadores de
// todas las regionales y modalidades, con filtros, búsqueda y paginación.

const GO_COLORES_SUGERIDOS = ['#f59e0b', '#2563eb', '#059669', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899'];
const GO_PAGE_SIZE = 10;

let goFiltroRegional = '';
let goFiltroModalidad = '';
let goBusqueda = '';
let goPaginaActual = 1;
let goModoModal = 'crear'; // 'crear' | 'editar'
let goEditando = null;     // { regional, modalidad, codigo } cuando goModoModal === 'editar'

// ==================== INICIALIZACIÓN ====================
function initGestionOperadores() {
	goPoblarFiltroRegional();
	goPoblarFiltroModalidad();
	goPaginaActual = 1;
	goRenderTabla();
}

function goPoblarFiltroRegional() {
	const sel = document.getElementById('goFiltroRegional');
	if (!sel) return;
	const valorPrevio = sel.value;
	sel.innerHTML = '<option value="">Todas las regionales</option>' +
		Object.keys(regionales).map(r => `<option value="${r}">${regionales[r].titulo}</option>`).join('');
	sel.value = valorPrevio || '';
}

function goPoblarFiltroModalidad() {
	const selReg = document.getElementById('goFiltroRegional');
	const sel = document.getElementById('goFiltroModalidad');
	if (!sel) return;
	const regional = selReg ? selReg.value : '';
	const valorPrevio = sel.value;

	let modalidades = [];
	if (regional) {
		modalidades = Object.keys(regionales[regional].modalidades);
	} else {
		const set = new Set();
		Object.keys(regionales).forEach(r => Object.keys(regionales[r].modalidades).forEach(m => set.add(m)));
		modalidades = Array.from(set);
	}

	sel.innerHTML = '<option value="">Todas las modalidades</option>' +
		modalidades.map(m => {
			const titulo = regional ? regionales[regional].modalidades[m].titulo : m.toUpperCase();
			return `<option value="${m}">${titulo}</option>`;
		}).join('');
	sel.value = valorPrevio || '';
}

function goCambioFiltroRegional() {
	goPoblarFiltroModalidad();
	goFiltroRegional = document.getElementById('goFiltroRegional').value;
	goFiltroModalidad = document.getElementById('goFiltroModalidad').value;
	goPaginaActual = 1;
	goRenderTabla();
}

function goCambioFiltroModalidad() {
	goFiltroModalidad = document.getElementById('goFiltroModalidad').value;
	goPaginaActual = 1;
	goRenderTabla();
}

function goCambioBusqueda() {
	goBusqueda = (document.getElementById('goBusqueda').value || '').trim().toLowerCase();
	goPaginaActual = 1;
	goRenderTabla();
}

function goLimpiarFiltros() {
	goFiltroRegional = '';
	goFiltroModalidad = '';
	goBusqueda = '';
	const selReg = document.getElementById('goFiltroRegional');
	const selMod = document.getElementById('goFiltroModalidad');
	const inputBusqueda = document.getElementById('goBusqueda');
	if (selReg) selReg.value = '';
	if (inputBusqueda) inputBusqueda.value = '';
	goPoblarFiltroModalidad();
	if (selMod) selMod.value = '';
	goPaginaActual = 1;
	goRenderTabla();
}

// ==================== OBTENCIÓN Y FILTRADO DE DATOS ====================
function goObtenerListaOperadores() {
	const lista = [];
	Object.keys(regionales).forEach(regional => {
		const modalidades = regionales[regional].modalidades || {};
		Object.keys(modalidades).forEach(modalidad => {
			const ops = modalidades[modalidad].operadores || {};
			Object.keys(ops).forEach(codigo => {
				const op = ops[codigo];
				lista.push({
					regional,
					regionalTitulo: regionales[regional].titulo,
					modalidad,
					modalidadTitulo: modalidades[modalidad].titulo,
					codigo,
					nombre: operadoresNombres[codigo] || op.nombre || codigo.toUpperCase(),
					color: op.color || '#f59e0b',
					productos: (op.db || []).length
				});
			});
		});
	});
	// Orden alfabético por nombre para una tabla predecible
	lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
	return lista;
}

function goObtenerListaFiltrada() {
	let lista = goObtenerListaOperadores();
	if (goFiltroRegional) lista = lista.filter(o => o.regional === goFiltroRegional);
	if (goFiltroModalidad) lista = lista.filter(o => o.modalidad === goFiltroModalidad);
	if (goBusqueda) {
		lista = lista.filter(o =>
			o.nombre.toLowerCase().includes(goBusqueda) ||
			o.codigo.toLowerCase().includes(goBusqueda)
		);
	}
	return lista;
}

function _goIniciales(nombre) {
	const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
	if (!partes.length) return '??';
	if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
	return (partes[0][0] + partes[1][0]).toUpperCase();
}

// ==================== RENDER DE TABLA ====================
function goRenderTabla() {
	const tbody = document.getElementById('goTableBody');
	const tableWrap = document.getElementById('goTableWrap');
	const emptyState = document.getElementById('goEmptyState');
	const contador = document.getElementById('goContador');
	const paginacion = document.getElementById('goPaginacion');
	if (!tbody || !tableWrap || !emptyState) return;

	const listaCompleta = goObtenerListaFiltrada();
	const total = listaCompleta.length;

	if (contador) {
		const totalGeneral = goObtenerListaOperadores().length;
		contador.textContent = (goFiltroRegional || goFiltroModalidad || goBusqueda)
			? `${total} de ${totalGeneral} operadores`
			: `${totalGeneral} operador${totalGeneral === 1 ? '' : 'es'} registrado${totalGeneral === 1 ? '' : 's'}`;
	}

	if (!total) {
		tableWrap.style.display = 'none';
		emptyState.style.display = 'flex';
		if (paginacion) paginacion.innerHTML = '';
		return;
	}
	tableWrap.style.display = 'block';
	emptyState.style.display = 'none';

	const totalPaginas = Math.max(1, Math.ceil(total / GO_PAGE_SIZE));
	if (goPaginaActual > totalPaginas) goPaginaActual = totalPaginas;
	const inicio = (goPaginaActual - 1) * GO_PAGE_SIZE;
	const pagina = listaCompleta.slice(inicio, inicio + GO_PAGE_SIZE);

	tbody.innerHTML = pagina.map(op => {
		const iniciales = _goIniciales(op.nombre);
		return `
			<tr>
				<td>
					<div class="go-operador-cell">
						<div class="go-avatar" style="background:${op.color};">${iniciales}</div>
						<div>
							<div class="go-operador-nombre">${escHtml(op.nombre)}</div>
							<div class="go-operador-codigo">ID: ${escHtml(op.codigo)}</div>
						</div>
					</div>
				</td>
				<td><span class="go-chip">${escHtml(op.regionalTitulo)}</span></td>
				<td><span class="go-chip">${escHtml(op.modalidadTitulo)}</span></td>
				<td>
					<div class="go-color-cell">
						<span class="go-color-swatch" style="background:${op.color};"></span>
						<span class="go-color-hex">${op.color.toUpperCase()}</span>
					</div>
				</td>
				
				<td>
					<div class="go-actions-cell">
						<button class="go-action-btn go-edit" title="Editar operador" onclick="goAbrirModalEditar('${op.regional}','${op.modalidad}','${op.codigo}')">✏️</button>
						<button class="go-action-btn go-delete" title="Eliminar operador" onclick="goEliminarOperador('${op.regional}','${op.modalidad}','${op.codigo}')">🗑️</button>
					</div>
				</td>
			</tr>
		`;
	}).join('');

	if (paginacion) goRenderPaginacion(total, totalPaginas);
}

function goRenderPaginacion(total, totalPaginas) {
	const paginacion = document.getElementById('goPaginacion');
	if (!paginacion) return;

	const inicio = (goPaginaActual - 1) * GO_PAGE_SIZE + 1;
	const fin = Math.min(goPaginaActual * GO_PAGE_SIZE, total);

	let botones = '';
	for (let p = 1; p <= totalPaginas; p++) {
		// Evitar listas de botones enormes: mostrar solo un rango razonable
		if (totalPaginas > 7 && Math.abs(p - goPaginaActual) > 2 && p !== 1 && p !== totalPaginas) {
			if (p === 2 || p === totalPaginas - 1) botones += `<span style="padding:0 0.2rem;">…</span>`;
			continue;
		}
		botones += `<button class="${p === goPaginaActual ? 'active' : ''}" onclick="goIrAPagina(${p})">${p}</button>`;
	}

	paginacion.innerHTML = `
		<div>Mostrando ${inicio}–${fin} de ${total}</div>
		<div class="go-pagination-btns">
			<button ${goPaginaActual === 1 ? 'disabled' : ''} onclick="goIrAPagina(${goPaginaActual - 1})">‹</button>
			${botones}
			<button ${goPaginaActual === totalPaginas ? 'disabled' : ''} onclick="goIrAPagina(${goPaginaActual + 1})">›</button>
		</div>
	`;
}

function goIrAPagina(p) {
	goPaginaActual = p;
	goRenderTabla();
}

// ==================== MODAL CREAR / EDITAR ====================
function goPoblarModalidadesModal() {
	const selReg = document.getElementById('goModalRegional');
	const selMod = document.getElementById('goModalModalidad');
	if (!selReg || !selMod) return;
	const regional = selReg.value;
	const modalidades = Object.keys(regionales[regional].modalidades);
	selMod.innerHTML = modalidades.map(m =>
		`<option value="${m}">${regionales[regional].modalidades[m].titulo}</option>`
	).join('');
}

function goActualizarPreviewColor() {
	const color = document.getElementById('goModalColor').value;
	const preview = document.getElementById('goModalColorPreview');
	if (preview) {
		preview.style.background = color;
		preview.style.borderColor = color;
	}
}

function goElegirColor(color) {
	const input = document.getElementById('goModalColor');
	if (input) input.value = color;
	goActualizarPreviewColor();
}

function goAbrirModalAgregar() {
	goModoModal = 'crear';
	goEditando = null;

	document.getElementById('goModalTitulo').textContent = '🆕 Agregar operador';
	document.getElementById('goModalBtnGuardar').textContent = '➕ Crear operador';

	const selReg = document.getElementById('goModalRegional');
	const selMod = document.getElementById('goModalModalidad');
	const inputNombre = document.getElementById('goModalNombre');
	const inputCodigo = document.getElementById('goModalCodigo');
	const inputColor = document.getElementById('goModalColor');

	// Reconstruye las opciones de Regional: goAbrirModalEditar las deja
	// reducidas a una sola opción (la del operador editado) y deshabilitadas.
	selReg.innerHTML = Object.keys(regionales).map(r =>
		`<option value="${r}">${regionales[r].titulo}</option>`
	).join('');

	selReg.disabled = false;
	selMod.disabled = false;
	inputCodigo.disabled = false;
	inputCodigo.value = '';
	inputCodigo.placeholder = 'Se genera solo';
	inputNombre.value = '';
	inputColor.value = '#f59e0b';

	selReg.value = goFiltroRegional || currentRegional || Object.keys(regionales)[0];
	goPoblarModalidadesModal();
	if (goFiltroModalidad) selMod.value = goFiltroModalidad;

	goActualizarPreviewColor();
	document.getElementById('goCodigoNota').style.display = 'block';
	document.getElementById('goRegModNota').style.display = 'none';

	goAbrirModal();
	inputNombre.focus();
}

function goAbrirModalEditar(regional, modalidad, codigo) {
	const operadorData = regionales[regional]?.modalidades?.[modalidad]?.operadores?.[codigo];
	if (!operadorData) {
		showToast('El operador seleccionado ya no existe', 'error');
		return;
	}

	goModoModal = 'editar';
	goEditando = { regional, modalidad, codigo };

	document.getElementById('goModalTitulo').textContent = '✏️ Editar operador';
	document.getElementById('goModalBtnGuardar').textContent = '💾 Guardar cambios';

	const selReg = document.getElementById('goModalRegional');
	const selMod = document.getElementById('goModalModalidad');
	const inputNombre = document.getElementById('goModalNombre');
	const inputCodigo = document.getElementById('goModalCodigo');
	const inputColor = document.getElementById('goModalColor');

	selReg.innerHTML = `<option value="${regional}">${regionales[regional].titulo}</option>`;
	selReg.value = regional;
	selReg.disabled = true;

	selMod.innerHTML = `<option value="${modalidad}">${regionales[regional].modalidades[modalidad].titulo}</option>`;
	selMod.value = modalidad;
	selMod.disabled = true;

	inputCodigo.value = codigo;
	inputCodigo.disabled = true;
	inputNombre.value = operadoresNombres[codigo] || operadorData.nombre || codigo.toUpperCase();
	inputColor.value = operadorData.color || '#f59e0b';

	goActualizarPreviewColor();
	document.getElementById('goCodigoNota').style.display = 'none';
	document.getElementById('goRegModNota').style.display = 'block';

	goAbrirModal();
	inputNombre.focus();
}

function goAbrirModal() {
	const overlay = document.getElementById('goModalOverlay');
	const modal = document.getElementById('goModal');
	if (overlay) overlay.style.display = 'block';
	if (modal) modal.style.display = 'block';
}

function goCerrarModal() {
	const overlay = document.getElementById('goModalOverlay');
	const modal = document.getElementById('goModal');
	if (overlay) overlay.style.display = 'none';
	if (modal) modal.style.display = 'none';
	goEditando = null;
}

function _goGenerarCodigoOperador(nombre, existentes) {
	let base = nombre
		.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '')
		.slice(0, 20);
	if (!base) base = 'operador';

	let codigo = base;
	let sufijo = 2;
	while (existentes.includes(codigo)) {
		codigo = base + sufijo;
		sufijo++;
	}
	return codigo;
}

// ==================== GUARDAR (CREAR o EDITAR) ====================
async function goGuardarOperador() {
	if (goModoModal === 'editar') {
		await _goGuardarEdicion();
	} else {
		await _goCrearOperador();
	}
}

async function _goCrearOperador() {
	const regional = document.getElementById('goModalRegional').value;
	const modalidad = document.getElementById('goModalModalidad').value;
	const nombre = document.getElementById('goModalNombre').value.trim();
	let codigo = document.getElementById('goModalCodigo').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
	const color = document.getElementById('goModalColor')?.value || '#f59e0b';

	if (!nombre) {
		showToast('Escriba un nombre para el nuevo operador', 'error');
		return;
	}

	const modData = regionales[regional].modalidades[modalidad];
	if (!modData.operadores) modData.operadores = {};
	const existentes = Object.keys(modData.operadores);

	if (!codigo) {
		codigo = _goGenerarCodigoOperador(nombre, existentes);
	} else if (existentes.includes(codigo)) {
		showToast(`Ya existe un operador con el código "${codigo}" en esta modalidad`, 'error');
		return;
	}

	try {
		await mostrarConfirm(
			`¿Crear el operador "${nombre}" (código: ${codigo}) para ${regionales[regional].titulo} - ${modData.titulo}?\n\nSe creará con la minuta base de la modalidad (editable después).`,
			{ titulo: '¿Crear operador?', icono: '🆕', btnOk: 'Sí, crear', colorOk: 'linear-gradient(135deg,#059669,#10b981)' }
		);
	} catch { return; }

	const dbBase = JSON.parse(JSON.stringify(modData.db || []));
	modData.operadores[codigo] = {
		titulo: `${modData.titulo} — Operador ${nombre}`,
		db: dbBase,
		color: color
	};

	if (!operadoresConfig[regional]) operadoresConfig[regional] = {};
	if (!operadoresConfig[regional][modalidad]) operadoresConfig[regional][modalidad] = [];
	operadoresConfig[regional][modalidad].push(codigo);
	operadoresNombres[codigo] = nombre;

	desmarcarOperadorEliminado(regional, modalidad, codigo);

	if (window.firebaseDB) {
		try {
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${codigo}`),
				{ titulo: modData.operadores[codigo].titulo, nombre: nombre, db: dbBase, color: color }
			);
		} catch (err) {
			showToast('Operador creado localmente, pero falló la sincronización con Firebase: ' + err.message, 'error');
		}
	} else {
		showToast('Operador creado localmente. No hay conexión con Firebase, así que otros usuarios no lo verán hasta que este equipo se reconecte.', 'error');
	}

	showToast(`Operador "${nombre}" creado correctamente`, 'success');

	if (typeof registrarAuditoria === 'function') {
		registrarAuditoria('CREAR_OPERADOR', regional, 'operador', {
			operador: codigo,
			operadorNombre: nombre,
			modalidad: modalidad
		}).catch(e => console.error('Error en auditoría:', e));
	}

	goCerrarModal();
	goPaginaActual = 1;
	goRenderTabla();
	_goRefrescarDependencias(regional, modalidad);
}

async function _goGuardarEdicion() {
	const { regional, modalidad, codigo } = goEditando || {};
	if (!codigo) {
		showToast('No hay operador seleccionado para editar', 'error');
		return;
	}

	const modData = regionales[regional]?.modalidades?.[modalidad];
	const operadorData = modData?.operadores?.[codigo];
	if (!operadorData) {
		showToast('El operador seleccionado ya no existe', 'error');
		return;
	}

	const nuevoNombre = document.getElementById('goModalNombre').value.trim();
	const nuevoColor = document.getElementById('goModalColor')?.value || '#f59e0b';

	if (!nuevoNombre) {
		showToast('Escriba un nombre para el operador', 'error');
		return;
	}

	const nombreAnterior = operadoresNombres[codigo] || codigo.toUpperCase();

	operadoresNombres[codigo] = nuevoNombre;
	operadorData.color = nuevoColor;
	operadorData.titulo = `${modData.titulo} — Operador ${nuevoNombre}`;

	if (window.firebaseDB) {
		try {
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${codigo}/nombre`),
				nuevoNombre
			);
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${codigo}/color`),
				nuevoColor
			);
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${codigo}/titulo`),
				operadorData.titulo
			);
		} catch (err) {
			showToast('Operador actualizado localmente, pero falló la sincronización con Firebase: ' + err.message, 'error');
		}
	} else {
		showToast('Operador actualizado localmente. No hay conexión con Firebase, así que otros usuarios no lo verán hasta que este equipo se reconecte.', 'error');
	}

	showToast(`Operador "${nuevoNombre}" actualizado correctamente`, 'success');

	if (typeof registrarAuditoria === 'function') {
		registrarAuditoria('EDITAR_OPERADOR', regional, 'operador', {
			operador: codigo,
			operadorNombreAnterior: nombreAnterior,
			operadorNombreNuevo: nuevoNombre,
			modalidad: modalidad
		}).catch(e => console.error('Error en auditoría:', e));
	}

	goCerrarModal();
	goRenderTabla();
	_goRefrescarDependencias(regional, modalidad);
}

// ==================== ELIMINAR (CON CONFIRMACIÓN) ====================
async function goEliminarOperador(regional, modalidad, codigo) {
	const modData = regionales[regional]?.modalidades?.[modalidad];
	const operadorData = modData?.operadores?.[codigo];
	if (!operadorData) {
		showToast('El operador seleccionado ya no existe', 'error');
		return;
	}

	const nombreOp = operadoresNombres[codigo] || codigo.toUpperCase();

	try {
		await mostrarConfirm(
			`Se eliminará permanentemente el operador "${nombreOp}" (${regionales[regional].titulo} — ${modData.titulo}) junto con su minuta de ${operadorData.db.length} productos. Esta acción no se puede deshacer.`,
			{ titulo: '¿Eliminar operador?', icono: '🗑️', btnOk: 'Sí, eliminar', palabraConfirmacion: 'CONFIRMAR' }
		);
	} catch {
		return;
	}

	delete modData.operadores[codigo];

	if (operadoresConfig[regional]?.[modalidad]) {
		operadoresConfig[regional][modalidad] = operadoresConfig[regional][modalidad].filter(op => op !== codigo);
	}
	delete operadoresNombres[codigo];

	marcarOperadorEliminado(regional, modalidad, codigo);

	if (window.firebaseDB && window.firebaseRemove) {
		try {
			await window.firebaseRemove(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${codigo}`)
			);
		} catch (err) {
			showToast('Operador eliminado localmente, pero falló la sincronización con Firebase: ' + err.message, 'error');
		}
	} else {
		showToast('Operador eliminado localmente. No hay conexión con Firebase, así que otros usuarios seguirán viéndolo hasta que este equipo se reconecte.', 'error');
	}

	showToast(`Operador "${nombreOp}" eliminado correctamente`, 'success');

	if (typeof registrarAuditoria === 'function') {
		registrarAuditoria('ELIMINAR_OPERADOR', regional, 'operador', {
			operador: codigo,
			operadorNombre: nombreOp,
			modalidad: modalidad,
			productosEliminados: operadorData.db.length
		}).catch(e => console.error('Error en auditoría:', e));
	}

	if (regional === currentRegional && modalidad === currentModalidad && currentOperador === codigo) {
		currentOperador = null;
	}

	goRenderTabla();
	_goRefrescarDependencias(regional, modalidad);
}

// Refresca selectores de otros módulos (Cargue de Minuta, chip de perfil, etc.)
// que dependen de la lista de operadores de la regional/modalidad afectada.
function _goRefrescarDependencias(regional, modalidad) {
	const cargueRegional = document.getElementById('cargueRegional');
	const cargueModalidad = document.getElementById('cargueModalidad');
	if (cargueRegional && cargueModalidad && regional === cargueRegional.value && modalidad === cargueModalidad.value) {
		if (typeof poblarCargueOperadores === 'function') poblarCargueOperadores();
	}
	if (regional === currentRegional && modalidad === currentModalidad) {
		if (typeof actualizarSelectorOperador === 'function') actualizarSelectorOperador();
		if (typeof actualizarIndicadorEstado === 'function') actualizarIndicadorEstado();
		if (typeof actualizarChipPerfil === 'function') actualizarChipPerfil();
	}
}
