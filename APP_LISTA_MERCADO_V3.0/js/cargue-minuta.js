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

// ==================== SELECTORES: OPERADOR DESTINO ====================
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

function poblarCargueOperadores() {
	const regional = document.getElementById('cargueRegional').value;
	const modalidad = document.getElementById('cargueModalidad').value;
	const selectOp = document.getElementById('cargueOperador');

	const ops = regionales[regional]?.modalidades?.[modalidad]?.operadores || {};
	const opIds = Object.keys(ops);

	if (!opIds.length) {
		selectOp.innerHTML = '<option value="">Sin operadores — cree uno abajo</option>';
		actualizarInfoCargueActual();
		return;
	}

	selectOp.innerHTML = opIds.map(op =>
		`<option value="${op}">${operadoresNombres[op] || op.toUpperCase()}</option>`
	).join('');

	if (opIds.includes(currentOperador)) {
		selectOp.value = currentOperador;
	}

	actualizarInfoCargueActual();
}

function actualizarInfoCargueActual() {
	const regional = document.getElementById('cargueRegional').value;
	const modalidad = document.getElementById('cargueModalidad').value;
	const op = document.getElementById('cargueOperador').value;

	const db = regionales[regional]?.modalidades?.[modalidad]?.operadores?.[op]?.db || [];

	const countEl = document.getElementById('cargueProductosActuales');
	if (countEl) countEl.textContent = db.length;

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

// ==================== COPIAR MINUTA ENTRE OPERADORES ====================
function poblarCopiaOrigenModalidades() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const selectMod = document.getElementById('copiaOrigenModalidad');
	const modalidadesConOperadores = Object.keys(regionales[regional].modalidades)
		.filter(m => regionales[regional].modalidades[m].operadores && Object.keys(regionales[regional].modalidades[m].operadores).length);

	if (!modalidadesConOperadores.length) {
		selectMod.innerHTML = '<option value="">Sin operadores en esta regional</option>';
		document.getElementById('copiaOrigenOperador').innerHTML = '';
		return;
	}

	selectMod.innerHTML = modalidadesConOperadores.map(m =>
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

	selectOp.innerHTML = opIds.map(op =>
		`<option value="${op}">${operadoresNombres[op] || op.toUpperCase()} (${ops[op].db.length} productos)</option>`
	).join('');
}

function copiarMinutaDeOtroOperador() {
	const regional = document.getElementById('copiaOrigenRegional').value;
	const modalidad = document.getElementById('copiaOrigenModalidad').value;
	const op = document.getElementById('copiaOrigenOperador').value;

	if (!op) {
		showToast('Seleccione un operador de origen', 'error');
		return;
	}

	const dbOrigen = regionales[regional]?.modalidades?.[modalidad]?.operadores?.[op]?.db;
	if (!dbOrigen || !dbOrigen.length) {
		showToast('El operador de origen no tiene productos para copiar', 'error');
		return;
	}

	const productos = JSON.parse(JSON.stringify(dbOrigen));
	mostrarPreviewCargue(productos);
	showToast(`Minuta de ${operadoresNombres[op] || op} lista en la previsualización. Elija el modo de carga y guarde en el operador destino.`, 'success');
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

async function guardarMinutaOperador() {
	if (!cargueParsedData || !cargueParsedData.length) {
		showToast('No hay datos previsualizados para guardar', 'error');
		return;
	}

	const regional = document.getElementById('cargueRegional').value;
	const modalidad = document.getElementById('cargueModalidad').value;
	const op = document.getElementById('cargueOperador').value;
	const modo = document.getElementById('cargueModo').value; // 'agregar' | 'reemplazar'

	if (!regional || !modalidad || !op) {
		showToast('Seleccione Regional, Modalidad y Operador (o cree uno nuevo arriba)', 'error');
		return;
	}

	const nombreOp = operadoresNombres[op] || op.toUpperCase();
	const dbActual = regionales[regional].modalidades[modalidad].operadores[op].db || [];

	let dbFinal;
	let mensajeConfirm;

	if (modo === 'reemplazar') {
		dbFinal = cargueParsedData;
		mensajeConfirm = `¿REEMPLAZAR toda la minuta del operador ${nombreOp} (${regional.toUpperCase()} - ${modalidad.toUpperCase()}) por estos ${cargueParsedData.length} productos?\n\nSe perderán los productos actuales que no estén en esta carga.`;
	} else {
		const { resultado, agregados, actualizados } = _combinarProductos(dbActual, cargueParsedData);
		dbFinal = resultado;
		mensajeConfirm = `¿Agregar esta carga a la minuta del operador ${nombreOp}?\n\n` +
			`• ${agregados} producto(s) nuevo(s) se agregarán\n` +
			`• ${actualizados} producto(s) existente(s) se actualizarán (mismo nombre)\n` +
			`• El resto de la minuta actual (${dbActual.length} productos) se conserva intacta`;
	}

	if (!confirm(mensajeConfirm)) return;

	const btn = document.getElementById('cargueBtnGuardar');
	btn.classList.add('loading');

	try {
		regionales[regional].modalidades[modalidad].operadores[op].db = dbFinal;

		if (window.firebaseDB) {
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `regionales/${regional}/modalidades/${modalidad}/operadores/${op}/db`),
				dbFinal
			);
			await window.firebaseSet(
				window.firebaseRef(window.firebaseDB, `modificaciones/${regional}/${modalidad}_${op}`),
				{
					timestamp: Date.now(),
					usuario: 'operador',
					modo,
					productosCargados: cargueParsedData.length,
					totalProductos: dbFinal.length,
					regional,
					modalidad,
					operador: op
				}
			);
		} else {
			showToast('Firebase no disponible: los cambios solo quedaron guardados localmente en esta sesión', 'warning');
		}

		showToast(`Minuta del operador ${nombreOp} actualizada (${dbFinal.length} productos en total)`, 'success');

		if (regional === currentRegional && modalidad === currentModalidad && op === currentOperador) {
			limpiarVistas();
			if (document.querySelector('.section.active')?.id === 'section-editor') {
				initEditor();
			}
		}

		actualizarInfoCargueActual();
	} catch (err) {
		console.error('Error guardando minuta de operador:', err);
		showToast('Error al guardar: ' + err.message, 'error');
	} finally {
		btn.classList.remove('loading');
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
