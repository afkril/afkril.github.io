// ==================== VERSIONES DE MINUTA ====================
// Cada "destino" de minuta (un operador, o la modalidad si no maneja operadores)
// puede tener varias versiones:
//
//   destino.db                    -> VERSIÓN 1 (la que ya existía; no se migra ni se mueve)
//   destino.versiones.v1          -> metadatos de la V1 { numero, nombre, vigencia }  (sin db)
//   destino.versiones.v2, v3...   -> { numero, nombre, vigencia, creada, db:[...] }
//
// Los ids son 'v1', 'v2'... (con letra) para que Firebase no los convierta en arreglo.
// `vigencia` es una fecha 'YYYY-MM-DD' ("vigente desde") definida por el usuario.
//
// La versión activa de la app vive en `currentVersionMinuta` (globals.js) y
// getCurrentDB()/getCurrentDBPath() ya la respetan, así que Editor de Gramajes,
// listado semanal/mensual, panel de detalles e intercambios trabajan con ella.

const VM_DEFAULT = 'v1';
let _vmTargetKey = null;            // destino para el cual se resolvió la versión activa
const _vmUltimaConocida = {};        // última versión vista por destino (detecta versiones nuevas)
const _vmSnapshots = {};            // "originales" de versiones > V1 (para marcar cambios en el editor)

// ---------- Utilidades básicas ----------
function vmNumero(id) { return parseInt(String(id || 'v1').replace(/\D/g, ''), 10) || 1; }
function vmId(numero) { return 'v' + numero; }
function vmEtiqueta(id) { return 'V' + vmNumero(id); }

function vmFormatearFecha(iso) {
	if (!iso) return '';
	const p = String(iso).split('-');
	if (p.length !== 3) return iso;
	return `${p[2]}/${p[1]}/${p[0]}`;
}

// Nodo que contiene la minuta: el operador (si se indica) o la modalidad.
function vmTarget(regional, modalidad, operador) {
	const mod = regionales?.[regional]?.modalidades?.[modalidad];
	if (!mod) return null;
	if (operador) return mod.operadores?.[operador] || null;
	return mod;
}

function vmTargetKey(regional, modalidad, operador) {
	return `${regional}_${modalidad}_${operador || '-'}`;
}

// Lista de versiones del destino, ordenadas: [{id, numero, nombre, vigencia, productos, creada}]
function vmListar(regional, modalidad, operador) {
	const t = vmTarget(regional, modalidad, operador);
	if (!t) return [];
	const meta = t.versiones || {};
	const res = [{
		id: 'v1', numero: 1,
		nombre: meta.v1?.nombre || 'Versión 1',
		vigencia: meta.v1?.vigencia || '',
		productos: (t.db || []).length,
		creada: meta.v1?.creada || ''
	}];
	Object.keys(meta).forEach(id => {
		if (id === 'v1') return;
		const v = meta[id];
		if (!v || typeof v !== 'object') return;
		res.push({
			id, numero: v.numero || vmNumero(id),
			nombre: v.nombre || ('Versión ' + vmNumero(id)),
			vigencia: v.vigencia || '',
			productos: (v.db || []).length,
			creada: v.creada || ''
		});
	});
	return res.sort((a, b) => a.numero - b.numero);
}

function vmExiste(regional, modalidad, operador, id) {
	return vmListar(regional, modalidad, operador).some(v => v.id === id);
}

function vmSiguienteId(regional, modalidad, operador) {
	const nums = vmListar(regional, modalidad, operador).map(v => v.numero);
	return vmId(Math.max(...nums, 1) + 1);
}

// Productos de una versión concreta (referencia viva, no copia)
function vmGetDB(regional, modalidad, operador, id) {
	const t = vmTarget(regional, modalidad, operador);
	if (!t) return [];
	if (!id || id === 'v1') return t.db || [];
	if (t.versiones?.[id]) return t.versiones[id].db || (t.versiones[id].db = []);
	return t.db || [];
}

function vmSetDB(regional, modalidad, operador, id, db) {
	const t = vmTarget(regional, modalidad, operador);
	if (!t) return;
	if (!id || id === 'v1') { t.db = db; return; }
	if (!t.versiones) t.versiones = {};
	if (!t.versiones[id]) t.versiones[id] = { numero: vmNumero(id) };
	t.versiones[id].db = db;
}

// Ruta Firebase. sub: 'db' (productos) | '' (objeto completo de la versión) | 'meta' (solo metadatos de V1)
function vmPath(regional, modalidad, operador, id, sub) {
	const base = operador
		? `regionales/${regional}/modalidades/${modalidad}/operadores/${operador}`
		: `regionales/${regional}/modalidades/${modalidad}`;
	if (!id || id === 'v1') return sub === 'db' ? `${base}/db` : `${base}/versiones/v1`;
	return sub === 'db' ? `${base}/versiones/${id}/db` : `${base}/versiones/${id}`;
}

// Versión que rige en una fecha: la de mayor número con vigencia <= fecha (V1 si ninguna aplica).
function vmVigenteEn(regional, modalidad, operador, fechaISO) {
	const f = fechaISO || new Date().toISOString().slice(0, 10);
	let elegida = 'v1';
	vmListar(regional, modalidad, operador).forEach(v => {
		if (v.vigencia && v.vigencia <= f) elegida = v.id;
	});
	return elegida;
}

// ---------- Versión activa ----------
function _vmLastKey(regional, modalidad, operador) {
	return `smartMenu_lastVersion_${vmTargetKey(regional, modalidad, operador)}`;
}

// Resuelve la versión activa cuando cambia el destino (regional/modalidad/operador)
// o cuando la versión activa dejó de existir. Se llama desde actualizarSelectorOperador().
function vmUltimaId(regional, modalidad, operador) {
	const l = vmListar(regional, modalidad, operador);
	return l.length ? l[l.length - 1].id : VM_DEFAULT;
}

// Al cambiar de regional/modalidad/operador queda SIEMPRE la versión más reciente
// registrada para ese destino (para no olvidar cambiarla). Los directorios guardados
// no se ven afectados: al abrirse aplican su propia versión.
function sincronizarVersionActiva() {
	const key = vmTargetKey(currentRegional, currentModalidad, currentOperador);
	if (_vmTargetKey !== key) {
		_vmTargetKey = key;
		currentVersionMinuta = vmUltimaId(currentRegional, currentModalidad, currentOperador);
		_vmUltimaConocida[key] = currentVersionMinuta;
	}
	if (!vmExiste(currentRegional, currentModalidad, currentOperador, currentVersionMinuta)) {
		currentVersionMinuta = vmUltimaId(currentRegional, currentModalidad, currentOperador);
	}
	actualizarSelectorVersion();
}

// Cambia la versión activa. opts: { silencioso, sinLimpiar }
function cambiarVersionMinuta(id, opts) {
	opts = opts || {};
	if (!vmExiste(currentRegional, currentModalidad, currentOperador, id)) {
		if (!opts.silencioso) showToast('Esa versión de minuta ya no existe para este operador', 'error');
		id = VM_DEFAULT;
	}
	const cambio = id !== currentVersionMinuta;
	currentVersionMinuta = id;
	_vmTargetKey = vmTargetKey(currentRegional, currentModalidad, currentOperador);
	try { localStorage.setItem(_vmLastKey(currentRegional, currentModalidad, currentOperador), id); } catch {}

	actualizarSelectorVersion();
	if (!cambio) return false;

	if (!opts.sinLimpiar) limpiarVistas();
	const activeSection = document.querySelector('.section.active')?.id;
	if (activeSection === 'section-editor') initEditor();
	if (!opts.silencioso) showToast(`Minuta ${vmEtiqueta(id)} activa`, 'success');
	return true;
}

function vmVersionActual() {
	return vmListar(currentRegional, currentModalidad, currentOperador).find(v => v.id === currentVersionMinuta) || null;
}

// "Originales" de la versión activa (para el Editor de Gramajes). V1 -> baseDatabase (database.js).
function vmBaseSnapshot(regional, modalidad, operador, id) {
	const key = `${vmTargetKey(regional, modalidad, operador)}_${id}`;
	if (!_vmSnapshots[key]) _vmSnapshots[key] = JSON.parse(JSON.stringify(vmGetDB(regional, modalidad, operador, id)));
	return _vmSnapshots[key];
}
function vmLimpiarSnapshots() { Object.keys(_vmSnapshots).forEach(k => delete _vmSnapshots[k]); }

// Si la versión activa fue eliminada (p. ej. desde otro equipo) vuelve a V1.
function vmRevalidarVersionActiva() {
	const key = vmTargetKey(currentRegional, currentModalidad, currentOperador);
	const ultima = vmUltimaId(currentRegional, currentModalidad, currentOperador);
	const conocida = _vmUltimaConocida[key];
	// Apareció una versión más reciente (creada aquí o desde otro equipo) y se estaba en la anterior más reciente: pasar a la nueva
	if (conocida && conocida !== ultima && currentVersionMinuta === conocida && vmNumero(ultima) > vmNumero(conocida)) {
		cambiarVersionMinuta(ultima, { silencioso: false });
	} else if (!vmExiste(currentRegional, currentModalidad, currentOperador, currentVersionMinuta)) {
		currentVersionMinuta = ultima;
	}
	_vmUltimaConocida[key] = ultima;
	actualizarSelectorVersion();
}

// ---------- UI: selector en el perfil + badges ----------
function actualizarSelectorVersion() {
	const cont = document.getElementById('versionSelector');
	const versiones = vmListar(currentRegional, currentModalidad, currentOperador);

	if (cont) {
		cont.innerHTML = versiones.map(v => {
			const activo = v.id === currentVersionMinuta;
			const tip = `${v.nombre}${v.vigencia ? ' · vigente desde ' + vmFormatearFecha(v.vigencia) : ''} · ${v.productos} productos`;
			return `<button type="button" class="reg-btn ver-btn${activo ? ' active' : ''}" title="${tip}" onclick="cambiarVersionMinuta('${v.id}')">
				V${v.numero}${v.vigencia ? `<span class="ver-btn-fecha">${vmFormatearFecha(v.vigencia)}</span>` : ''}
			</button>`;
		}).join('');
	}

	const actual = versiones.find(v => v.id === currentVersionMinuta) || versiones[0];
	const texto = actual ? `📋 Minuta V${actual.numero}` : '';
	const titulo = actual ? `${actual.nombre}${actual.vigencia ? ' · vigente desde ' + vmFormatearFecha(actual.vigencia) : ''}` : '';
	['statusVersion', 'statusVersionMensual'].forEach(id => {
		const el = document.getElementById(id);
		if (!el) return;
		el.textContent = texto; el.title = titulo;
		el.style.display = actual ? 'inline-flex' : 'none';
	});
	['statusVersionDivider', 'statusVersionDividerMensual'].forEach(id => {
		const el = document.getElementById(id);
		if (el) el.style.display = actual ? '' : 'none';
	});

	// Editor de Gramajes
	const edItem = document.getElementById('editorVersionItem');
	const edVal = document.getElementById('editorVersion');
	if (edItem && edVal && actual) {
		edItem.style.display = 'flex';
		edVal.textContent = `V${actual.numero}${actual.vigencia ? ' · desde ' + vmFormatearFecha(actual.vigencia) : ''}`;
	}

	if (typeof actualizarChipPerfil === 'function') actualizarChipPerfil();
	if (typeof vmActualizarSelectorDirectorio === 'function') vmActualizarSelectorDirectorio();
}

// Opciones <option> con las versiones del destino activo (para selects de directorio)
function vmOpcionesHtml(seleccionada) {
	return vmListar(currentRegional, currentModalidad, currentOperador).map(v =>
		`<option value="${v.id}"${v.id === seleccionada ? ' selected' : ''}>V${v.numero}${v.vigencia ? ' · desde ' + vmFormatearFecha(v.vigencia) : ''} (${v.productos} prod.)</option>`
	).join('');
}

// ---------- Directorios ----------
function vmVersionDeDirectorio(d) {
	if (!d) return VM_DEFAULT;
	return d.versionMinuta || d.configSemanal?.versionMinuta || VM_DEFAULT; // sin dato => V1
}

// Aplica a la app la versión con la que se guardó un directorio (V1 si no tiene).
function vmAplicarVersionDirectorio(d) {
	const id = vmVersionDeDirectorio(d);
	if (!vmExiste(currentRegional, currentModalidad, currentOperador, id)) {
		showToast(`La minuta ${vmEtiqueta(id)} de este directorio ya no existe; se usa V1`, 'warning');
		cambiarVersionMinuta(VM_DEFAULT, { silencioso: true });
		return;
	}
	cambiarVersionMinuta(id, { silencioso: true });
}
