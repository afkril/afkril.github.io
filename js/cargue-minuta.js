// ==================== CARGUE DE MINUTA POR OPERADOR ====================
// Este módulo permite que cada operador (JER, Palmas, T3, Caguán, etc.)
// cargue SU PROPIA minuta/gramajes (vía Excel o JSON) de forma
// independiente al Editor de Gramajes general, y copiar la minuta de un
// operador a otro. La creación/edición/eliminación de operadores vive
// ahora en el módulo "Gestión de Operadores" (js/gestion-operadores.js).

// 🔗 Reemplaza esta URL por la de tu generador externo de minutas (JSON).
const URL_GENERADOR_MINUTAS = 'https://afkril.github.io/LISTA_MERCADO_V3/InsertMinuta.html';

let cargueParsedData = null;

function initCargueMinuta() {
	// Botón sutil hacia el generador externo
	const linkExterno = document.getElementById('linkGeneradorExterno');
	if (linkExterno) linkExterno.href = URL_GENERADOR_MINUTAS;

	const selectRegional = document.getElementById('cargueRegional');
	if (selectRegional) {
		selectRegional.value = currentRegional;
		poblarCargueModalidades();
	}

	const selectCopiaRegional = document.getElementById('copiaOrigenRegional');
	if (selectCopiaRegional) {
		selectCopiaRegional.value = currentRegional;
		poblarCopiaOrigenModalidades();
	}
}

// ==================== SELECTORES: OPERADOR / VERSIÓN DESTINO ====================
const CARGUE_NUEVA_VERSION = '__nueva__';

function poblarCargueModalidades() {
	const regional = document.getElementById('cargueRegional').value;
	const selectMod = document.getElementById('cargueModalidad');

	const modalidades = Object.keys(regionales[regional].modalidades);

	selectMod.innerHTML = modalidades.map(m =>
		`<option value="${m}">${regionales[regional].modalidades[m].titulo}</option>`
	).join('');

	if (modalidades.includes(currentModalidad)) {
		selectMod.value = currentModalidad;
	}

	poblarCargueOperadores();
}

// Destino de la carga: un operador, o la modalidad completa si no maneja operadores (op = '')
function cargueDestino() {
	const regional = document.getElementById('cargueRegional').value;
	const modalidad = document.getElementById('cargueModalidad').value;
	const op = document.getElementById('cargueOperador').value || '';
	return { regional, modalidad, op, node: vmTarget(regional, modalidad, op || null) };
}

function poblarCargueOperadores() {
	const regional = document.getElementById('cargueRegional').value;
	const modalidad = document.getElementById('cargueModalidad').value;
	const selectOp = document.getElementById('cargueOperador');

	const ops = regionales[regional]?.modalidades?.[modalidad]?.operadores || {};
	const opIds = Object.keys(ops);

	if (!opIds.length) {
		// Modalidad sin operadores: la minuta (y sus versiones) pertenece a la modalidad
		selectOp.innerHTML = '<option value="">— Minuta general de la modalidad —</option>';
		selectOp.value = '';
		poblarCargueVersiones();
		return;
	}

	selectOp.innerHTML = opIds.map(op =>
		`<option value="${op}">${operadoresNombres[op] || op.toUpperCase()}</option>`
	).join('');

	if (opIds.includes(currentOperador)) {
		selectOp.value = currentOperador;
	}

	poblarCargueVersiones();
}

// Lista las versiones del destino + opción "Crear nueva versión"
function poblarCargueVersiones(seleccion) {
	const { regional, modalidad, op } = cargueDestino();
	const selectVer = document.getElementById('cargueVersion');
	if (!selectVer) { actualizarInfoCargueActual(); return; }

	const versiones = vmListar(regional, modalidad, op || null);
	const sigId = vmSiguienteId(regional, modalidad, op || null);

	selectVer.innerHTML =
		versiones.map(v =>
			`<option value="${v.id}">V${v.numero}${v.vigencia ? ' · desde ' + vmFormatearFecha(v.vigencia) : ''} (${v.productos} productos)</option>`
		).join('') +
		`<option value="${CARGUE_NUEVA_VERSION}">➕ Crear nueva versión (V${vmNumero(sigId)})</option>`;

	// Por defecto: la versión activa si es el mismo destino; si no, la última existente
	const esActivo = regional === currentRegional && modalidad === currentModalidad && (op || null) === (currentOperador || null);
	let valor = seleccion;
	if (!valor || (valor !== CARGUE_NUEVA_VERSION && !versiones.some(v => v.id === valor))) {
		valor = (esActivo && versiones.some(v => v.id === currentVersionMinuta)) ? currentVersionMinuta : versiones[versiones.length - 1].id;
	}
	selectVer.value = valor;

	actualizarInfoCargueActual();
}

function cargueEsNueva() {
	const sel = document.getElementById('cargueVersion');
	return !!sel && sel.value === CARGUE_NUEVA_VERSION;
}

function actualizarInfoCargueActual() {
	const { regional, modalidad, op } = cargueDestino();
	const selVer = document.getElementById('cargueVersion');
	const nueva = cargueEsNueva();
	const verId = nueva ? null : (selVer ? selVer.value : 'v1');

	const db = nueva ? [] : vmGetDB(regional, modalidad, op || null, verId || 'v1');

	const countEl = document.getElementById('cargueProductosActuales');
	if (countEl) countEl.textContent = db.length;

	// Campos de nombre/fecha de la versión (nueva: vacíos con fecha de hoy; existente: sus datos)
	const nomEl = document.getElementById('cargueVersionNombre');
	const fecEl = document.getElementById('cargueVersionFecha');
	const sigId = vmSiguienteId(regional, modalidad, op || null);
	if (nueva) {
		if (nomEl) { nomEl.value = ''; nomEl.placeholder = `Versión ${vmNumero(sigId)}`; }
		if (fecEl) fecEl.value = new Date().toISOString().slice(0, 10);
	} else {
		const meta = vmListar(regional, modalidad, op || null).find(v => v.id === verId);
		if (nomEl) { nomEl.value = meta && meta.nombre !== `Versión ${meta.numero}` ? meta.nombre : ''; nomEl.placeholder = `Versión ${meta ? meta.numero : 1}`; }
		if (fecEl) fecEl.value = meta?.vigencia || '';
	}

	// Modo de carga: en una versión nueva no hay nada que "agregar"; se parte de cero (o de la copia)
	const modoEl = document.getElementById('cargueModo');
	if (modoEl) {
		modoEl.disabled = nueva;
		if (nueva) modoEl.value = 'reemplazar';
	}
	const btnEliminar = document.getElementById('cargueBtnEliminarVersion');
	if (btnEliminar) btnEliminar.style.display = (!nueva && verId && verId !== 'v1') ? '' : 'none';
	const btnMeta = document.getElementById('cargueBtnGuardarMeta');
	if (btnMeta) btnMeta.style.display = nueva ? 'none' : '';
	const hint = document.getElementById('cargueVersionHint');
	if (hint) {
		hint.textContent = nueva
			? `Se creará la V${vmNumero(sigId)} con lo que cargue o copie abajo. Las demás versiones y los directorios ya guardados no cambian.`
			: (verId === 'v1' ? 'La V1 es la minuta original; los directorios guardados sin versión usan esta.' : `Editando la V${vmNumero(verId)}: carga o cambios afectan solo a esta versión.`);
	}

	// Resetear estado de carga pendiente al cambiar de selección
	cargueParsedData = null;
	const dropzoneInfo = document.getElementById('cargueDropzoneInfo');
	if (dropzoneInfo) dropzoneInfo.textContent = '';
	const btnGuardar = document.getElementById('cargueBtnGuardar');
	if (btnGuardar) btnGuardar.disabled = true;
	const tabla = document.getElementById('cargueTablaPreview');
	if (tabla) tabla.innerHTML = '';
	const fileInput = document.getElementById('cargueFileInput');
	if (fileInput) fileInput.value = '';
	const textarea = document.getElementById('cargueTextarea');
	if (textarea) textarea.value = '';
	const fileNameDisplay = document.getElementById('cmFileNameDisplay');
	if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
}

// ==================== COPIAR MINUTA (operador/modalidad + VERSIÓN origen) ====================
function poblarCopiaOrigenModalidades() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const selectMod = document.getElementById('copiaOrigenModalidad');
	const modalidades = Object.keys(regionales[regional].modalidades);

	selectMod.innerHTML = modalidades.map(m =>
		`<option value="${m}">${regionales[regional].modalidades[m].titulo}</option>`
	).join('');

	poblarCopiaOrigenOperadores();
}

function poblarCopiaOrigenOperadores() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const modalidad = document.getElementById('copiaOrigenModalidad').value;
	const selectOp = document.getElementById('copiaOrigenOperador');

	const ops = regionales[regional]?.modalidades?.[modalidad]?.operadores || {};
	const opIds = Object.keys(ops);

	if (!opIds.length) {
		selectOp.innerHTML = '<option value="">— Minuta general de la modalidad —</option>';
	} else {
		selectOp.innerHTML = opIds.map(op =>
			`<option value="${op}">${operadoresNombres[op] || op.toUpperCase()}</option>`
		).join('');
	}
	poblarCopiaOrigenVersiones();
}

function poblarCopiaOrigenVersiones() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const modalidad = document.getElementById('copiaOrigenModalidad').value;
	const op = document.getElementById('copiaOrigenOperador').value || '';
	const selectVer = document.getElementById('copiaOrigenVersion');
	if (!selectVer) return;

	const versiones = vmListar(regional, modalidad, op || null);
	selectVer.innerHTML = versiones.map(v =>
		`<option value="${v.id}">V${v.numero}${v.vigencia ? ' · desde ' + vmFormatearFecha(v.vigencia) : ''} (${v.productos} productos)</option>`
	).join('');
	if (versiones.length) selectVer.value = versiones[versiones.length - 1].id;
}

function copiarMinutaDeOtroOperador() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const modalidad = document.getElementById('copiaOrigenModalidad').value;
	const op = document.getElementById('copiaOrigenOperador').value || '';
	const verId = (document.getElementById('copiaOrigenVersion') || {}).value || 'v1';

	const dbOrigen = vmGetDB(regional, modalidad, op || null, verId);
	if (!dbOrigen || !dbOrigen.length) {
		showToast('La minuta de origen no tiene productos para copiar', 'error');
		return;
	}

	const nombreOrigen = op ? (operadoresNombres[op] || op.toUpperCase()) : regionales[regional].modalidades[modalidad].titulo;
	const productos = JSON.parse(JSON.stringify(dbOrigen));
	mostrarPreviewCargue(productos);
	const info = document.getElementById('cargueDropzoneInfo');
	if (info) info.textContent = `✅ ${productos.length} productos copiados de ${regional.toUpperCase()} · ${modalidad.toUpperCase()} · ${nombreOrigen} · V${vmNumero(verId)}. Elija la versión destino y guarde.`;
	showToast(`Minuta de ${nombreOrigen} (V${vmNumero(verId)}) lista en la previsualización. Elija la versión destino y guarde.`, 'success');
}

// ==================== LECTURA DE ARCHIVO / JSON ====================
function handleCargueFile(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const data = new Uint8Array(e.target.result);
			const workbook = XLSX.read(data, { type: 'array' });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
			const productos = convertirFilasAMinuta(rows);
			mostrarPreviewCargue(productos);
		} catch (err) {
			showToast('Error leyendo el archivo Excel: ' + err.message, 'error');
		}
	};
	reader.onerror = function () {
		showToast('No se pudo leer el archivo', 'error');
	};
	reader.readAsArrayBuffer(file);
}

// Convierte filas de Excel (encabezados: Producto, Categoria, Unidad, M1..M25)
// al formato interno {n, c, u, g:{m1..m25}}
function convertirFilasAMinuta(rows) {
	const productos = [];

	rows.forEach(row => {
		const nombre = String(row['Producto'] ?? row['producto'] ?? row['PRODUCTO'] ?? '').trim();
		if (!nombre) return;

		const categoria = String(row['Categoria'] ?? row['Categoría'] ?? row['categoria'] ?? '').trim().toLowerCase();
		const unidad = String(row['Unidad'] ?? row['unidad'] ?? row['UNIDAD'] ?? '').trim();

		const gramajes = {};
		for (let i = 1; i <= 25; i++) {
			const raw = row['M' + i] ?? row['m' + i] ?? row['Menu' + i] ?? row['Menú ' + i];
			if (raw !== undefined && raw !== null && raw !== '') {
				const val = parseFloat(String(raw).replace(',', '.'));
				if (!isNaN(val) && val > 0) gramajes['m' + i] = val;
			}
		}

		const categoriasValidas = ['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia'];

		productos.push({
			n: nombre,
			c: categoriasValidas.includes(categoria) ? categoria : 'granos',
			u: unidad || 'gr',
			g: gramajes
		});
	});

	return productos;
}

function cargarDesdeTexto() {
	const texto = document.getElementById('cargueTextarea').value.trim();
	if (!texto) {
		showToast('Pegue el JSON de la minuta antes de previsualizar', 'error');
		return;
	}

	try {
		const productos = JSON.parse(texto);
		if (!Array.isArray(productos)) {
			throw new Error('El JSON debe ser un arreglo de productos, ej: [{"n":"...","c":"...","u":"...","g":{...}}]');
		}
		productos.forEach((p, i) => {
			if (!p.n) throw new Error(`El producto en la posición ${i + 1} no tiene nombre ("n")`);
		});
		mostrarPreviewCargue(productos);
	} catch (err) {
		showToast('JSON inválido: ' + err.message, 'error');
	}
}

function mostrarPreviewCargue(productos) {
	if (!productos || !productos.length) {
		showToast('No se encontraron productos válidos en el archivo/JSON', 'error');
		return;
	}

	cargueParsedData = productos;

	const filas = productos.slice(0, 50).map(p => `
		<tr>
			<td>${p.n}</td>
			<td>${p.c || '-'}</td>
			<td>${p.u || '-'}</td>
			<td style="text-align:center;">${Object.keys(p.g || {}).length}</td>
		</tr>
	`).join('');

	document.getElementById('cargueTablaPreview').innerHTML = `
		<div style="font-weight:600; margin-bottom:0.5rem;">Previsualización (${productos.length} productos)</div>
		<div style="overflow-x:auto;">
			<table class="cargue-table">
				<thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th># Menús con gramaje</th></tr></thead>
				<tbody>${filas}</tbody>
			</table>
		</div>
		${productos.length > 50 ? `<div style="padding:0.5rem 0; font-size:0.75rem; color:var(--text-secondary);">Mostrando 50 de ${productos.length} productos</div>` : ''}
	`;

	document.getElementById('cargueDropzoneInfo').textContent = `✅ ${productos.length} productos listos (revise el modo de carga antes de guardar)`;
	document.getElementById('cargueBtnGuardar').disabled = false;
}

// ==================== GUARDAR (AGREGAR o REEMPLAZAR) ====================

// Combina productos nuevos con la minuta existente por nombre (sin distinguir
// mayúsculas/tildes/espacios). Si el producto ya existe, se actualizan su
// categoría/unidad y se combinan sus gramajes (los menús nuevos sobreescriben,
// los que no vienen en la carga se conservan). Si no existe, se agrega al final.
function _normalizarNombre(n) {
	return String(n || '')
		.trim()
		.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _combinarProductos(dbExistente, productosNuevos) {
	const resultado = JSON.parse(JSON.stringify(dbExistente || []));
	const indicePorNombre = new Map();
	resultado.forEach((p, idx) => indicePorNombre.set(_normalizarNombre(p.n), idx));

	let agregados = 0;
	let actualizados = 0;

	productosNuevos.forEach(pNuevo => {
		const clave = _normalizarNombre(pNuevo.n);
		if (indicePorNombre.has(clave)) {
			const idx = indicePorNombre.get(clave);
			const existente = resultado[idx];
			if (pNuevo.c) existente.c = pNuevo.c;
			if (pNuevo.u) existente.u = pNuevo.u;
			existente.g = { ...(existente.g || {}), ...(pNuevo.g || {}) };
			actualizados++;
		} else {
			resultado.push(JSON.parse(JSON.stringify(pNuevo)));
			indicePorNombre.set(clave, resultado.length - 1);
			agregados++;
		}
	});

	return { resultado, agregados, actualizados };
}

// Lee nombre y fecha de la versión desde el formulario
function _cargueLeerMetaVersion() {
	return {
		nombre: ((document.getElementById('cargueVersionNombre') || {}).value || '').trim(),
		vigencia: ((document.getElementById('cargueVersionFecha') || {}).value || '').trim()
	};
}

function _cargueRefrescarTrasGuardar(regional, modalidad, op, verId, huboCambioDB) {
	const esActivo = regional === currentRegional && modalidad === currentModalidad && (op || null) === (currentOperador || null);
	if (esActivo) {
		vmLimpiarSnapshots();
		vmRevalidarVersionActiva(); // si se creó una versión más reciente, queda seleccionada
		if (huboCambioDB && verId === currentVersionMinuta) {
			limpiarVistas();
			if (document.querySelector('.section.active')?.id === 'section-editor') initEditor();
		}
		actualizarSelectorVersion();
	}
	poblarCargueVersiones(verId);
}

async function guardarMinutaOperador() {
	if (!cargueParsedData || !cargueParsedData.length) {
		showToast('No hay datos previsualizados para guardar', 'error');
		return;
	}

	const { regional, modalidad, op, node } = cargueDestino();
	const modo = document.getElementById('cargueModo').value; // 'agregar' | 'reemplazar'
	const nueva = cargueEsNueva();
	const meta = _cargueLeerMetaVersion();

	const tieneOperadores = Object.keys(regionales[regional]?.modalidades?.[modalidad]?.operadores || {}).length > 0;
	if (!regional || !modalidad || (tieneOperadores && !op) || !node) {
		showToast('Seleccione Regional, Modalidad y Operador (o cree uno en Gestión de Operadores)', 'error');
		return;
	}
	if (nueva && !meta.vigencia) {
		showToast('Defina la fecha de la nueva versión (vigente desde)', 'error');
		return;
	}

	const verId = nueva ? vmSiguienteId(regional, modalidad, op || null) : document.getElementById('cargueVersion').value;
	const etiquetaVer = `V${vmNumero(verId)}`;
	const nombreDestino = op ? (operadoresNombres[op] || op.toUpperCase()) : regionales[regional].modalidades[modalidad].titulo;
	const dbActual = nueva ? [] : vmGetDB(regional, modalidad, op || null, verId);

	let dbFinal;
	let mensajeConfirm;

	if (nueva) {
		dbFinal = cargueParsedData;
		mensajeConfirm = `¿CREAR la versión ${etiquetaVer} de la minuta de ${nombreDestino} (${regional.toUpperCase()} - ${modalidad.toUpperCase()}) con ${cargueParsedData.length} productos, vigente desde ${vmFormatearFecha(meta.vigencia)}?\n\nLas demás versiones y los directorios ya guardados no se modifican.`;
	} else if (modo === 'reemplazar') {
		dbFinal = cargueParsedData;
		mensajeConfirm = `¿REEMPLAZAR toda la minuta ${etiquetaVer} de ${nombreDestino} (${regional.toUpperCase()} - ${modalidad.toUpperCase()}) por estos ${cargueParsedData.length} productos?\n\nSe perderán los productos actuales de ESA versión que no estén en esta carga. Las otras versiones no cambian.`;
	} else {
		const { resultado, agregados, actualizados } = _combinarProductos(dbActual, cargueParsedData);
		dbFinal = resultado;
		mensajeConfirm = `¿Agregar esta carga a la minuta ${etiquetaVer} de ${nombreDestino}?\n\n` +
			`• ${agregados} producto(s) nuevo(s) se agregarán\n` +
			`• ${actualizados} producto(s) existente(s) se actualizarán (mismo nombre)\n` +
			`• El resto de la minuta ${etiquetaVer} (${dbActual.length} productos) se conserva intacta`;
	}

	if (!confirm(mensajeConfirm)) return;

	const btn = document.getElementById('cargueBtnGuardar');
	btn.classList.add('loading');

	try {
		const ahora = new Date().toISOString();
		const metaV = {
			numero: vmNumero(verId),
			nombre: meta.nombre || '',
			vigencia: meta.vigencia || '',
			creada: nueva ? ahora : (node.versiones?.[verId]?.creada || '')
		};

		// Memoria local
		vmSetDB(regional, modalidad, op || null, verId, dbFinal);
		if (!node.versiones) node.versiones = {};
		node.versiones[verId] = { ...(node.versiones[verId] || {}), ...metaV };
		if (verId !== 'v1') node.versiones[verId].db = dbFinal;
		else delete node.versiones.v1.db;

		// Firebase
		if (window.firebaseDB) {
			if (verId === 'v1') {
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, vmPath(regional, modalidad, op || null, 'v1', 'db')), dbFinal);
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, vmPath(regional, modalidad, op || null, 'v1', '')), metaV);
			} else {
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, vmPath(regional, modalidad, op || null, verId, '')), { ...metaV, db: dbFinal });
			}
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `modificaciones/${regional}/${modalidad}_${op || 'general'}_${verId}`),
				{
					timestamp: Date.now(),
					usuario: 'operador',
					modo: nueva ? 'nueva_version' : modo,
					versionMinuta: verId,
					vigencia: metaV.vigencia,
					productosCargados: cargueParsedData.length,
					totalProductos: dbFinal.length,
					regional,
					modalidad,
					operador: op || null
				}
			);
		} else {
			showToast('Firebase no disponible: los cambios solo quedaron guardados localmente en esta sesión', 'warning');
		}

		showToast(
			nueva
				? `Versión ${etiquetaVer} creada para ${nombreDestino} (${dbFinal.length} productos, desde ${vmFormatearFecha(metaV.vigencia)})`
				: `Minuta ${etiquetaVer} de ${nombreDestino} actualizada (${dbFinal.length} productos en total)`,
			'success'
		);

		_cargueRefrescarTrasGuardar(regional, modalidad, op, verId, true);
	} catch (err) {
		console.error('Error guardando minuta de operador:', err);
		showToast('Error al guardar: ' + err.message, 'error');
	} finally {
		btn.classList.remove('loading');
	}
}

// Guarda solo el nombre y la fecha de una versión existente (sin tocar sus productos)
async function guardarMetaVersion() {
	const { regional, modalidad, op, node } = cargueDestino();
	if (!node || cargueEsNueva()) return;
	const verId = document.getElementById('cargueVersion').value;
	const meta = _cargueLeerMetaVersion();

	const previo = node.versiones?.[verId] || {};
	const metaV = { numero: vmNumero(verId), nombre: meta.nombre, vigencia: meta.vigencia, creada: previo.creada || '' };
	if (!node.versiones) node.versiones = {};
	node.versiones[verId] = { ...previo, ...metaV };
	if (verId === 'v1') delete node.versiones.v1.db;

	try {
		if (window.firebaseDB) {
			const base = vmPath(regional, modalidad, op || null, verId, '');
			// Se actualizan solo los metadatos: los productos (db) no se vuelven a escribir
			for (const k of Object.keys(metaV)) {
				await window.firebaseSet(window.firebaseRef(window.firebaseDB, `${base}/${k}`), metaV[k]);
			}
		} else {
			showToast('Firebase no disponible: el cambio solo quedó local en esta sesión', 'warning');
		}
		showToast(`Datos de la V${vmNumero(verId)} guardados${meta.vigencia ? ' (vigente desde ' + vmFormatearFecha(meta.vigencia) + ')' : ''}`, 'success');
		_cargueRefrescarTrasGuardar(regional, modalidad, op, verId, false);
	} catch (err) {
		showToast('Error al guardar: ' + err.message, 'error');
	}
}

// Elimina una versión (nunca la V1). Avisa cuántos directorios guardados la usan.
async function eliminarVersionMinuta() {
	const { regional, modalidad, op, node } = cargueDestino();
	if (!node || cargueEsNueva()) return;
	const verId = document.getElementById('cargueVersion').value;
	if (verId === 'v1') { showToast('La V1 no se puede eliminar', 'warning'); return; }

	let usan = 0;
	try {
		const dirs = tabLoadDirectoriosGuardados();
		Object.values(dirs).forEach(d => {
			const c = d.configSemanal || {};
			if (vmVersionDeDirectorio(d) === verId && (c.regional || regional) === regional && (c.modalidad || modalidad) === modalidad && (c.operador || '') === (op || '')) usan++;
		});
	} catch {}

	const nombreDestino = op ? (operadoresNombres[op] || op.toUpperCase()) : regionales[regional].modalidades[modalidad].titulo;
	const resp = prompt(
		`Se eliminará PERMANENTEMENTE la V${vmNumero(verId)} de ${nombreDestino}.\n\n` +
		(usan ? `⚠️ ${usan} directorio(s) guardado(s) usan esta versión y pasarán a abrirse con la V1.\n\n` : '') +
		`Para continuar escriba exactamente: CONFIRMAR`
	);
	if (resp === null) return;
	if (resp.trim() !== 'CONFIRMAR') { showToast('Eliminación cancelada: la palabra de seguridad no coincide', 'warning'); return; }

	try {
		delete node.versiones[verId];
		if (window.firebaseDB) {
			await window.firebaseRemove(window.firebaseRef(window.firebaseDB, vmPath(regional, modalidad, op || null, verId, '')));
		}
		showToast(`Versión V${vmNumero(verId)} eliminada`, 'success');
		const esActivo = regional === currentRegional && modalidad === currentModalidad && (op || null) === (currentOperador || null);
		if (esActivo && currentVersionMinuta === verId) cambiarVersionMinuta('v1', { silencioso: true });
		vmLimpiarSnapshots();
		poblarCargueVersiones('v1');
		actualizarSelectorVersion();
	} catch (err) {
		showToast('Error al eliminar: ' + err.message, 'error');
	}
}

// ==================== DESCARGAR PLANTILLA EXCEL ====================
// Genera un archivo .xlsx con la estructura exacta que espera el cargue
// de minuta (hoja "Minuta" con encabezados + ejemplos, y hoja "Instrucciones").
function descargarPlantillaMinuta() {
	if (typeof XLSX === 'undefined') {
		showToast('No se pudo generar la plantilla: la librería Excel no está disponible', 'error');
		return;
	}

	const categoriasValidas = ['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia'];
	const totalMenus = 25;

	// ---------- Hoja 1: Minuta (encabezados + filas de ejemplo) ----------
	const encabezados = ['Producto', 'Categoria', 'Unidad'];
	for (let i = 1; i <= totalMenus; i++) encabezados.push('M' + i);

	const ejemplos = [
		{ n: 'Arroz', c: 'granos', u: 'gr', g: { m1: 60, m2: 60, m3: 45 } },
		{ n: 'Fríjol', c: 'granos', u: 'gr', g: { m1: 40 } },
		{ n: 'Pechuga de pollo', c: 'proteinas', u: 'gr', g: { m2: 80 } },
		{ n: 'Leche entera', c: 'lacteos', u: 'ml', g: { m1: 200, m3: 200 } },
		{ n: 'Zanahoria', c: 'verduras', u: 'gr', g: { m1: 30 } },
		{ n: 'Banano', c: 'frutas', u: 'gr', g: { m2: 100 } },
		{ n: 'Pan tajado', c: 'panaderia', u: 'gr', g: { m3: 25 } }
	];

	const filasEjemplo = ejemplos.map(p => {
		const fila = [p.n, p.c, p.u];
		for (let i = 1; i <= totalMenus; i++) fila.push(p.g['m' + i] ?? '');
		return fila;
	});

	const datosHoja = [encabezados, ...filasEjemplo];
	const wsMinuta = XLSX.utils.aoa_to_sheet(datosHoja);

	// Ancho de columnas para mejor legibilidad
	wsMinuta['!cols'] = [
		{ wch: 22 }, { wch: 14 }, { wch: 10 },
		...Array(totalMenus).fill({ wch: 7 })
	];

	// Estilo básico de encabezado (si la librería con soporte de estilos está cargada)
	for (let c = 0; c < encabezados.length; c++) {
		const addr = XLSX.utils.encode_cell({ r: 0, c });
		if (wsMinuta[addr]) {
			wsMinuta[addr].s = {
				font: { bold: true, color: { rgb: 'FFFFFF' } },
				fill: { fgColor: { rgb: '2563EB' } },
				alignment: { horizontal: 'center' }
			};
		}
	}

	// ---------- Hoja 2: Instrucciones ----------
	const instrucciones = [
		['CÓMO USAR ESTA PLANTILLA'],
		[''],
		['1. No cambie los nombres de las columnas de la fila 1 (Producto, Categoria, Unidad, M1...M25).'],
		['2. Borre las filas de ejemplo y escriba sus propios productos, una fila por producto.'],
		['3. "Categoria" debe ser exactamente una de: ' + categoriasValidas.join(', ') + '.'],
		['4. "Unidad" es libre (ej: gr, ml, un).'],
		['5. Cada columna M1, M2, M3... representa el gramaje del producto en ese número de menú.'],
		['   Deje la celda vacía si el producto no aplica para ese menú.'],
		['6. Puede borrar las columnas de menú que no use (por ejemplo, si solo maneja hasta M12).'],
		['7. Guarde el archivo como .xlsx y cárguelo en "Cargue de Minuta por Operador" → Opción 1: Excel.'],
		[''],
		['Categorías válidas: ' + categoriasValidas.join(', ')]
	];
	const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
	wsInstrucciones['!cols'] = [{ wch: 95 }];

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, wsMinuta, 'Minuta');
	XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

	XLSX.writeFile(wb, 'Plantilla_Cargue_Minuta.xlsx');
	showToast('Plantilla descargada. Complétela y súbala desde "Seleccionar archivo Excel"', 'success');
}

// ==================== UI: TABS EXCEL / JSON ====================
function cmCambiarTab(tab) {
	const btnExcel = document.getElementById('cmTabBtnExcel');
	const btnJson = document.getElementById('cmTabBtnJson');
	const panelExcel = document.getElementById('cmTabPanelExcel');
	const panelJson = document.getElementById('cmTabPanelJson');
	if (!btnExcel || !btnJson || !panelExcel || !panelJson) return;

	const esExcel = tab === 'excel';
	btnExcel.classList.toggle('active', esExcel);
	btnJson.classList.toggle('active', !esExcel);
	panelExcel.classList.toggle('active', esExcel);
	panelJson.classList.toggle('active', !esExcel);
}

// Muestra el nombre del archivo seleccionado en el botón personalizado
function cmMostrarNombreArchivo(event) {
	const display = document.getElementById('cmFileNameDisplay');
	if (!display) return;
	const file = event.target.files && event.target.files[0];
	display.textContent = file ? file.name : 'Ningún archivo seleccionado';
}

// ==================== UI: MODAL COPIAR MINUTA ====================
function abrirModalCopiarMinuta() {
	const overlay = document.getElementById('cmModalCopiarOverlay');
	const modal = document.getElementById('cmModalCopiar');
	if (overlay) overlay.style.display = 'block';
	if (modal) modal.style.display = 'block';
}

function cerrarModalCopiarMinuta() {
	const overlay = document.getElementById('cmModalCopiarOverlay');
	const modal = document.getElementById('cmModalCopiar');
	if (overlay) overlay.style.display = 'none';
	if (modal) modal.style.display = 'none';
}
