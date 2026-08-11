// ============================================================
// SEGUIMIENTO.JS — Centro de Seguimiento y Respuesta de Novedades
// ------------------------------------------------------------
// Añade, sin tocar el flujo existente de "cuentameStatus":
//   1. Catálogo de 7 estados con plantillas de correo editables
//      (guardadas en Firebase, con fallback a los valores por defecto).
//   2. Modal de "Respuesta rápida" (usable desde la tabla o el detalle).
//   3. Panel de comunicación dentro del detalle de cada novedad
//      (6ª tarjeta), con historial de correos enviados.
//   4. Envío de correo reutilizando el MISMO Google Apps Script que
//      ya usa el formulario (nueva acción action=responder). Ver el
//      snippet .gs que se entrega aparte para pegarlo en el proyecto
//      de Apps Script.
//   5. Editor de plantillas dentro de la pestaña "Configuración".
//
// Datos nuevos por novedad en Firebase:
//   correoRespuesta: string
//   seguimiento: {
//       estadoInterno: 'pendiente' | 'en_proceso' | 'vinculado' |
//                       'duplicado' | 'info_incompleta' |
//                       'pendiente_soporte' | 'no_procede',
//       historial: { pushId: { fecha, estadoInterno, destinatario,
//                               asunto, mensaje, resultado } }
//   }
//
// Nota: el estado de comunicación mostrado en la tabla solo puede
// distinguir "Sin enviar" / "Enviado", porque este sistema no recibe
// respuestas entrantes (no hay backend de lectura de correo) — solo
// envía. Para saber si la madre comunitaria ya respondió habría que
// seguir revisando el correo directamente.
// ============================================================

const SeguimientoModule = (() => {

    const ESTADOS_DEFAULT = {
        pendiente:         { emoji: '🟠', label: 'Pendiente de revisión',     color: '#f59e0b',
            mensaje: 'Su solicitud de {{tipo}} correspondiente a {{nombre}} fue recibida correctamente y actualmente se encuentra en proceso de revisión.' },
        en_proceso:        { emoji: '🔵', label: 'En proceso de vinculación', color: '#3b82f6',
            mensaje: 'La novedad de {{tipo}} de {{nombre}} ha sido validada y actualmente se encuentra en proceso de vinculación del participante.' },
        vinculado:         { emoji: '🟢', label: 'Vinculación realizada',     color: '#10b981',
            mensaje: 'Se informa que el proceso de vinculación de {{nombre}} fue realizado satisfactoriamente.\n\nLa novedad queda registrada como finalizada.' },
        duplicado:         { emoji: '🔴', label: 'Participante duplicado',    color: '#ef4444',
            mensaje: 'Durante la validación se identificó que {{nombre}} ya se encuentra registrado en el sistema. Por favor verificar la información reportada.' },
        info_incompleta:   { emoji: '🟡', label: 'Información incompleta',   color: '#ca8a04',
            mensaje: 'Para continuar con el proceso de {{tipo}} de {{nombre}} es necesario completar la siguiente información. Por favor enviar los documentos o datos faltantes a la mayor brevedad.' },
        pendiente_soporte: { emoji: '🟣', label: 'Pendiente por soporte',     color: '#a855f7',
            mensaje: 'Para continuar con el proceso de {{nombre}} se requiere adjuntar el documento solicitado.' },
        no_procede:        { emoji: '⚫', label: 'Novedad no procedente',     color: '#475569',
            mensaje: 'La novedad de {{tipo}} reportada para {{nombre}} no puede ser procesada. Por favor comunicarse con el área administrativa para más información.' },
        desvinculacion_pendiente: { emoji: '🟤', label: 'Desvinculación pendiente', color: '#b45309',
            mensaje: 'El proceso de desvinculación de {{nombre}} se encuentra pendiente de gestión. Le notificaremos tan pronto como se complete el trámite.' },
        desvinculacion_realizada: { emoji: '🟥', label: 'Desvinculación realizada', color: '#be123c',
            mensaje: 'Se informa que el proceso de desvinculación del participante fue realizado satisfactoriamente.\n\nLa novedad queda registrada como finalizada.' }
    };

    let _plantillas = null;
    let _idModalActual = null;

    // ── Plantillas: carga/guardado por asociación ───────────────
    async function _cargarPlantillas() {
        const perfil = AsociacionesModule.getPerfilActivo();
        if (!perfil || typeof database === 'undefined') {
            _plantillas = JSON.parse(JSON.stringify(ESTADOS_DEFAULT));
            return _plantillas;
        }
        try {
            const snap = await database.ref(AsociacionesModule.getRef('plantillasRespuesta')).once('value');
            const guardadas = snap.val() || {};
            _plantillas = {};
            Object.keys(ESTADOS_DEFAULT).forEach(key => {
                _plantillas[key] = { ...ESTADOS_DEFAULT[key], ...(guardadas[key] || {}) };
            });
        } catch (e) {
            console.warn('[Seguimiento] No se pudieron cargar plantillas, usando por defecto:', e);
            _plantillas = JSON.parse(JSON.stringify(ESTADOS_DEFAULT));
        }
        return _plantillas;
    }

    function getPlantillas() { return _plantillas || ESTADOS_DEFAULT; }
    function getEstadoSeg(key) { return getPlantillas()[key] || getPlantillas().pendiente; }

    async function guardarPlantilla(key, mensaje) {
        const perfil = AsociacionesModule.getPerfilActivo();
        if (!perfil) { showToast('Selecciona una asociación primero', 'warning'); return; }
        if (!getPlantillas()[key]) return;
        getPlantillas()[key].mensaje = mensaje;
        try {
            await database.ref(`${AsociacionesModule.getRef('plantillasRespuesta')}/${key}/mensaje`).set(mensaje);
            showToast('💾 Plantilla guardada', 'success');
        } catch (e) {
            showToast('Error al guardar plantilla: ' + e.message, 'error');
        }
    }

    // ── Helpers de datos de la novedad ───────────────────────────
    // Devuelve un array con cada persona involucrada en la novedad: para
    // "retiro" o "ingreso" trae solo una; para "ambos" trae LAS DOS (son
    // beneficiarios distintos: quien se retira y quien ingresa).
    function _personasDe(n) {
        const out = [];
        const fmtFecha = (f) => f ? (typeof formatDateDMY === 'function' ? formatDateDMY(f) : f) : '';
        if (n.type === 'retiro' || n.type === 'ambos' || n.hasRetiro) {
            const r = n.retiro || n;
            out.push({
                rol: 'retiro',
                nombre: (r.name || 'Beneficiario').toUpperCase(),
                rc: r.document ? `${r.docType || 'RC'} ${r.document}` : '-',
                fecha: fmtFecha(r.retiroDate || n.retiroDate || '')
            });
        }
        if (n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) {
            const i = n.ingreso || n;
            out.push({
                rol: 'ingreso',
                nombre: (i.name || 'Beneficiario').toUpperCase(),
                rc: i.document ? `${i.docType || 'RC'} ${i.document}` : '-',
                fecha: fmtFecha(i.ingresoDate || n.ingresoDate || '')
            });
        }
        return out;
    }

    function _nombreDe(n) {
        if (n.type === 'ambos') {
            const personas = _personasDe(n);
            const r = personas.find(p => p.rol === 'retiro');
            const i = personas.find(p => p.rol === 'ingreso');
            if (r && i) return `${r.nombre} (retiro) y ${i.nombre} (ingreso)`;
        }
        return (n.name || n.ingreso?.name || n.retiro?.name || 'Beneficiario').toUpperCase();
    }
    function _tipoDe(n) {
        if (n.type === 'ambos') return 'Ingreso y Retiro';
        if (n.type === 'retiro') return 'Retiro';
        return 'Ingreso';
    }
    function _buscarNovelty(id) {
        const listas = [];
        if (typeof currentNovelties !== 'undefined') listas.push(currentNovelties);
        if (typeof archivedNovelties !== 'undefined') listas.push(archivedNovelties);
        for (const lista of listas) {
            const found = (lista || []).find(n => n.id === id);
            if (found) return found;
        }
        return null;
    }
    function _historialArray(n) {
        return _historialEntries(n);
    }

    // Igual que antes, pero conservando el pushId de Firebase (necesario para poder
    // eliminar una respuesta puntual del historial).
    function _historialEntries(n) {
        const h = n?.seguimiento?.historial;
        if (!h) return [];
        return Object.entries(h)
            .map(([pushId, v]) => ({ pushId, ...v }))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    // Datos adicionales del beneficiario/UDS que se muestran como contexto rápido
    // en el modal de respuesta y en la bandeja de seguimiento. Cuando la novedad
    // es "ambos", el RC combina el de la persona que se retira y el de la que
    // ingresa (son dos beneficiarios distintos).
    function _datosExtra(novelty) {
        let codigoUds = '';
        if (novelty.udsFull && novelty.udsFull.includes(' - ')) {
            codigoUds = novelty.udsFull.split(' - ')[1] || '';
        }
        const personas = _personasDe(novelty);
        const retiroP = personas.find(p => p.rol === 'retiro');
        const ingresoP = personas.find(p => p.rol === 'ingreso');

        let rc = '-';
        if (retiroP && ingresoP) rc = `${retiroP.rc} (retiro) / ${ingresoP.rc} (ingreso)`;
        else if (retiroP) rc = retiroP.rc;
        else if (ingresoP) rc = ingresoP.rc;
        else if (novelty.document) rc = `${novelty.docType || 'RC'} ${novelty.document}`;

        return {
            rc,
            codigoUds: codigoUds || '-',
            contrato: novelty.contract || '-',
            regional: novelty.regional || '-',
            fechaRetiro: retiroP?.fecha || '',
            fechaIngreso: ingresoP?.fecha || ''
        };
    }

    // Texto legible de la(s) fecha(s) relevante(s) — para "ambos" muestra las dos.
    function _fechaDisplay(novelty, d) {
        if (novelty.type === 'ambos') {
            const partes = [];
            if (d.fechaRetiro) partes.push(`Retiro ${d.fechaRetiro}`);
            if (d.fechaIngreso) partes.push(`Ingreso ${d.fechaIngreso}`);
            return partes.join(' · ') || 'N/A';
        }
        return novelty.type === 'retiro' ? (d.fechaRetiro || 'N/A') : (d.fechaIngreso || 'N/A');
    }

    // ── Badges usados en la tabla de Novedades Activas ──────────
    function badgeComunicacion(n) {
        const hist = _historialArray(n);
        if (hist.length === 0) return `<span class="comm-badge comm-badge--sin">⚪ Sin enviar</span>`;
        return `<span class="comm-badge comm-badge--enviado">🟡 Enviado (${hist.length})</span>`;
    }

    function chipEstadoInterno(n) {
        const key = n.seguimiento?.estadoInterno || 'pendiente';
        const info = getEstadoSeg(key);
        return `<span class="seg-chip" style="background:${info.color}22;color:${info.color}">${info.emoji} ${info.label}</span>`;
    }

    function botonResponder(id) {
        return `<button type="button" class="comm-reply-btn" onclick="event.stopPropagation(); SeguimientoModule.abrirRespuestaRapida('${id}')">📧 Responder</button>`;
    }

    // ── Modal de Respuesta Rápida (inyectado dinámicamente) ──────
    function _asegurarModal() {
        if (document.getElementById('quickReplyOverlay')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = `
        <div id="quickReplyOverlay" class="quick-reply-overlay" style="display:none" onclick="if(event.target===this) SeguimientoModule.cerrarRespuestaRapida()">
          <div class="quick-reply-modal">
            <button class="qr2-close" onclick="SeguimientoModule.cerrarRespuestaRapida()" title="Cerrar">×</button>
            <div class="qr2-sidebar">
                <div class="qr2-sidebar-icon">📨</div>
                <h2>Responder<br>novedad</h2>
                <p>Responde de forma rápida y efectiva</p>
                <div class="qr2-illustration">
                    <svg viewBox="0 0 120 120" width="90" height="90" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="60" cy="60" r="58" fill="rgba(255,255,255,0.12)"/>
                        <path d="M28 44l32 20 32-20" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
                        <rect x="24" y="38" width="72" height="48" rx="8" stroke="#fff" stroke-width="3" opacity="0.9"/>
                        <path d="M78 30l14-8-4 16z" fill="#fff" opacity="0.85"/>
                    </svg>
                </div>
                <div class="qr2-tip">
                    <div class="qr2-tip-icon">💡</div>
                    <div>
                        <strong>Tip</strong>
                        <p>Tu respuesta será enviada al correo del solicitante en cuanto la envíes.</p>
                    </div>
                </div>
            </div>
            <div class="qr2-main" id="quickReplyBody"></div>
            <div class="qr2-aside" id="quickReplyAside"></div>
          </div>
        </div>`;
        document.body.appendChild(wrap.firstElementChild);
    }

    function _tipoColor(novelty) {
        if (novelty.type === 'ambos') return '#3b82f6';
        if (novelty.type === 'retiro') return '#ef4444';
        return '#10b981';
    }

    function abrirRespuestaRapida(id) {
        const novelty = _buscarNovelty(id);
        if (!novelty) { showToast('No se encontró la novedad', 'error'); return; }
        _idModalActual = id;
        _asegurarModal();
        document.getElementById('quickReplyBody').innerHTML = _renderFormularioRespuesta(novelty);
        document.getElementById('quickReplyAside').innerHTML = _renderResumenLateral(novelty);
        document.getElementById('quickReplyOverlay').style.display = 'flex';
        document.body.classList.add('modal-open');
        _aplicarPlantilla(novelty.seguimiento?.estadoInterno || 'pendiente');
        _actualizarAside();
    }

    function cerrarRespuestaRapida() {
        const ov = document.getElementById('quickReplyOverlay');
        if (ov) ov.style.display = 'none';
        // Solo quita el bloqueo de scroll si no hay otro modal (el de detalle) abierto
        const viewModal = document.getElementById('viewModal');
        if (!viewModal || viewModal.style.display === 'none') {
            document.body.classList.remove('modal-open');
        }
        _idModalActual = null;
    }

    function _renderFormularioRespuesta(novelty) {
        const correo = novelty.correoRespuesta || '';
        const estadoActual = novelty.seguimiento?.estadoInterno || 'pendiente';
        const opciones = Object.keys(getPlantillas()).map(key => {
            const info = getEstadoSeg(key);
            return `<option value="${key}" ${key === estadoActual ? 'selected' : ''}>${info.emoji} ${info.label}</option>`;
        }).join('');
        const d = _datosExtra(novelty);
        const color = _tipoColor(novelty);
        const fecha = _fechaDisplay(novelty, d);

        return `
        <button class="qr2-close qr2-close--mobile" onclick="SeguimientoModule.cerrarRespuestaRapida()" title="Cerrar">×</button>
        <div class="qr2-main-head">
            <div class="qr2-main-icon">📧</div>
            <div>
                <h3>Responder novedad</h3>
                <p>Completa la información para enviar una respuesta rápida.</p>
            </div>
        </div>

        <div class="qr2-section">
            <div class="qr2-section-title">🔓 1. Información de la respuesta</div>
            <div class="qr2-summary-strip">
                <div class="qr2-summary-item">
                    <span class="qr2-summary-label">Tipo</span>
                    <span class="qr2-summary-val"><i class="qr2-dot" style="background:${color}"></i>${_tipoDe(novelty)}</span>
                </div>
                <div class="qr2-summary-item">
                    <span class="qr2-summary-label">Contrato</span>
                    <span class="qr2-summary-val">${d.contrato}</span>
                </div>
                <div class="qr2-summary-item">
                    <span class="qr2-summary-label">Código UDS</span>
                    <span class="qr2-summary-val">${d.codigoUds}</span>
                </div>
                <div class="qr2-summary-item">
                    <span class="qr2-summary-label">Regional</span>
                    <span class="qr2-summary-val">${d.regional}</span>
                </div>
                <div class="qr2-summary-item">
                    <span class="qr2-summary-label">${novelty.type === 'ambos' ? 'Fechas' : 'Fecha'}</span>
                    <span class="qr2-summary-val">${fecha || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="qr2-grid-2">
            <div class="qr-field">
                <label>Para (Correo del solicitante) *</label>
                <input type="email" id="qrTo" value="${correo}" placeholder="correo@ejemplo.com">
                ${!correo ? '<small class="qr-warning">⚠️ Esta novedad no tiene correo de respuesta registrado. Escríbelo manualmente.</small>' : ''}
            </div>
            <div class="qr-field">
                <label>Beneficiario</label>
                <input type="text" value="${_nombreDe(novelty)} — ${_tipoDe(novelty)}" disabled>
            </div>
        </div>

        <div class="qr2-grid-2">
            <div class="qr-field">
                <label>Estado de la novedad *</label>
                <select id="qrEstado" onchange="SeguimientoModule.onCambioEstadoModal(this.value)">${opciones}</select>
            </div>
            <div class="qr-field">
                <label>Asunto *</label>
                <input type="text" id="qrAsunto" value="Re: Novedad ${_tipoDe(novelty)} - ${_nombreDe(novelty)}" oninput="SeguimientoModule.actualizarResumenLateral()">
            </div>
        </div>

        <div class="qr-field">
            <label>Mensaje *</label>
            <textarea id="qrMensaje" rows="8" oninput="SeguimientoModule.actualizarResumenLateral()"></textarea>
        </div>

        <div class="qr-actions">
            <button class="qr-btn-cancel" onclick="SeguimientoModule.cerrarRespuestaRapida()">✕ Cancelar</button>
            <button class="qr-btn-send" onclick="SeguimientoModule.enviarRespuesta()">📧 Enviar respuesta</button>
        </div>`;
    }

    // ── Columna derecha: resumen en vivo de la novedad y del mensaje ──
    function _renderResumenLateral(novelty) {
        const d = _datosExtra(novelty);
        const color = _tipoColor(novelty);
        const fecha = _fechaDisplay(novelty, d);

        return `
        <div class="qr2-aside-title">ℹ️ Resumen de la novedad</div>
        <div class="qr2-aside-rows">
            <div class="qr2-aside-row"><span>🏷️ Tipo:</span><strong><i class="qr2-dot" style="background:${color}"></i>${_tipoDe(novelty)}</strong></div>
            <div class="qr2-aside-row"><span>📄 Contrato:</span><strong>${d.contrato}</strong></div>
            <div class="qr2-aside-row"><span>🔢 Código UDS:</span><strong>${d.codigoUds}</strong></div>
            <div class="qr2-aside-row"><span>🌎 Regional:</span><strong>${d.regional}</strong></div>
            <div class="qr2-aside-row"><span>${novelty.type === 'ambos' ? '📅 Fechas:' : '📅 Fecha:'}</span><strong>${fecha || 'N/A'}</strong></div>
        </div>

        <hr class="qr2-aside-divider">

        <div class="qr2-aside-block">
            <div class="qr2-aside-label">Beneficiario:</div>
            <div class="qr2-aside-value">${_nombreDe(novelty)} — ${_tipoDe(novelty)}</div>
        </div>
        <div class="qr2-aside-block">
            <div class="qr2-aside-label">Estado actual:</div>
            <div id="qrAsideEstado"></div>
        </div>
        <div class="qr2-aside-block">
            <div class="qr2-aside-label">Asunto:</div>
            <div class="qr2-aside-value" id="qrAsideAsunto">-</div>
        </div>

        <hr class="qr2-aside-divider">


        <a href="#" class="qr2-aside-link" onclick="event.preventDefault(); SeguimientoModule.verDetalleDesdeRespuesta();">👁️ Ver detalles completos</a>`;
    }

    function actualizarResumenLateral() { _actualizarAside(); }

    function _actualizarAside() {
        const estadoKey = document.getElementById('qrEstado')?.value || 'pendiente';
        const asunto = document.getElementById('qrAsunto')?.value?.trim() || '-';
        const mensaje = document.getElementById('qrMensaje')?.value?.trim() || '-';
        const info = getEstadoSeg(estadoKey);

        const chipEstado = document.getElementById('qrAsideEstado');
        if (chipEstado) {
            chipEstado.innerHTML = `<span class="seg-chip" style="background:${info.color}22;color:${info.color}">${info.emoji} ${info.label}</span>`;
        }
        const asideAsunto = document.getElementById('qrAsideAsunto');
        if (asideAsunto) asideAsunto.textContent = asunto;

        const asideMensaje = document.getElementById('qrAsideMensaje');
        if (asideMensaje) asideMensaje.innerHTML = mensaje.replace(/\n/g, '<br>');
    }

    function verDetalleDesdeRespuesta() {
        const novelty = _buscarNovelty(_idModalActual);
        if (!novelty) return;
        const esArchivada = (typeof archivedNovelties !== 'undefined' ? archivedNovelties : []).some(n => n.id === novelty.id);
        cerrarRespuestaRapida();
        if (typeof viewNoveltyDetails === 'function') viewNoveltyDetails(novelty, esArchivada);
    }

    function onCambioEstadoModal(key) { _aplicarPlantilla(key); _actualizarAside(); }

    function _aplicarPlantilla(key) {
        const info = getEstadoSeg(key);
        const ta = document.getElementById('qrMensaje');
        const novelty = _buscarNovelty(_idModalActual);
        if (ta) ta.value = _construirMensajeCompleto(novelty, info.mensaje);
        _actualizarAside();
    }

    // Datos generales del beneficiario que se usan para personalizar el mensaje
    function _datosMensaje(novelty) {
        const d = _datosExtra(novelty);
        return {
            nombre: _nombreDe(novelty),
            tipo: _tipoDe(novelty),
            rc: d.rc,
            fechaRetiro: d.fechaRetiro,
            fechaIngreso: d.fechaIngreso,
            contrato: d.contrato,
            regional: d.regional
        };
    }

    // Reemplaza los tokens dentro del texto de una plantilla usando los datos
    // reales de la novedad:
    //   {{nombre}}, {{rc}}, {{fecha}}, {{tipo}}, {{contrato}}, {{regional}}
    //   → cuando la novedad es "ambos" combinan la info de las dos personas.
    //   {{nombreRetiro}} / {{rcRetiro}} / {{fechaRetiro}}
    //   {{nombreIngreso}} / {{rcIngreso}} / {{fechaIngreso}}
    //   → para referirse puntualmente a quien se retira o a quien ingresa.
    function _interpolar(texto, novelty) {
        if (!novelty) return texto || '';
        const m = _datosMensaje(novelty);
        const personas = _personasDe(novelty);
        const retiroP = personas.find(p => p.rol === 'retiro');
        const ingresoP = personas.find(p => p.rol === 'ingreso');

        let fechaContextual;
        if (novelty.type === 'ambos') {
            const partes = [];
            if (m.fechaRetiro) partes.push(`retiro ${m.fechaRetiro}`);
            if (m.fechaIngreso) partes.push(`ingreso ${m.fechaIngreso}`);
            fechaContextual = partes.join(' / ');
        } else {
            fechaContextual = novelty.type === 'retiro' ? m.fechaRetiro : m.fechaIngreso;
        }

        return (texto || '')
            .replace(/\{\{\s*nombre\s*\}\}/gi, m.nombre)
            .replace(/\{\{\s*rc\s*\}\}/gi, m.rc)
            .replace(/\{\{\s*fecha\s*\}\}/gi, fechaContextual || 'N/A')
            .replace(/\{\{\s*tipo\s*\}\}/gi, m.tipo)
            .replace(/\{\{\s*contrato\s*\}\}/gi, m.contrato)
            .replace(/\{\{\s*regional\s*\}\}/gi, m.regional)
            .replace(/\{\{\s*nombreRetiro\s*\}\}/gi, retiroP?.nombre || 'N/A')
            .replace(/\{\{\s*rcRetiro\s*\}\}/gi, retiroP?.rc || 'N/A')
            .replace(/\{\{\s*fechaRetiro\s*\}\}/gi, retiroP?.fecha || 'N/A')
            .replace(/\{\{\s*nombreIngreso\s*\}\}/gi, ingresoP?.nombre || 'N/A')
            .replace(/\{\{\s*rcIngreso\s*\}\}/gi, ingresoP?.rc || 'N/A')
            .replace(/\{\{\s*fechaIngreso\s*\}\}/gi, ingresoP?.fecha || 'N/A');
    }

    // Bloque de "Datos generales" que se antepone al cuerpo del mensaje. Cuando
    // la novedad es "ambos" describe a las DOS personas por separado (quien se
    // retira y quien ingresa), cada una con su propio RC y fecha.
    function _bloqueDatosGenerales(novelty) {
        if (novelty.type === 'ambos') {
            const personas = _personasDe(novelty);
            const retiroP = personas.find(p => p.rol === 'retiro');
            const ingresoP = personas.find(p => p.rol === 'ingreso');
            const lineas = [];
            if (retiroP) lineas.push(`• Beneficiario que se retira: ${retiroP.nombre} (${retiroP.rc}) — Fecha de retiro: ${retiroP.fecha || 'N/A'}`);
            if (ingresoP) lineas.push(`• Beneficiario que ingresa: ${ingresoP.nombre} (${ingresoP.rc}) — Fecha de ingreso: ${ingresoP.fecha || 'N/A'}`);
            return lineas.join('\n');
        }
        const m = _datosMensaje(novelty);
        const lineas = [`• Beneficiario: ${m.nombre}`, `• RC: ${m.rc}`];
        if (novelty.type === 'retiro') {
            lineas.push(`• Fecha de retiro: ${m.fechaRetiro || 'N/A'}`);
        } else {
            lineas.push(`• Fecha de ingreso: ${m.fechaIngreso || 'N/A'}`);
        }
        return lineas.join('\n');
    }

    function _construirMensajeCompleto(novelty, cuerpo) {
        const cuerpoFinal = _interpolar(cuerpo, novelty);
        if (!novelty) return `Buen día,\n\n${cuerpoFinal}\n\nCordialmente,\nÁrea Administrativa`;
        return `Buen día,\n\nDatos generales de la novedad:\n${_bloqueDatosGenerales(novelty)}\n\n${cuerpoFinal}\n\nCordialmente,\nÁrea Administrativa`;
    }

    // ── Envío (Google Apps Script existente + registro en Firebase) ──
    async function enviarRespuesta() {
        const id = _idModalActual;
        if (!id) return;

        const to = document.getElementById('qrTo')?.value?.trim();
        const estado = document.getElementById('qrEstado')?.value || 'pendiente';
        const asunto = document.getElementById('qrAsunto')?.value?.trim();
        const mensaje = document.getElementById('qrMensaje')?.value?.trim();

        if (!to) { showToast('❌ Falta el correo de destino', 'error'); return; }
        if (!mensaje) { showToast('❌ El mensaje no puede estar vacío', 'error'); return; }

        const btn = document.querySelector('.qr-btn-send');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

        const perfil = AsociacionesModule.getPerfilActivo();
        const googleUrl = perfil?.google_url;

        try {
            if (googleUrl) {
                const body = new URLSearchParams({
                    action: 'responder',
                    novedadId: id,
                    to, subject: asunto, message: mensaje, estado
                }).toString();
                // mode:'no-cors' → igual que el resto de la app: no podemos leer
                // la respuesta, así que asumimos éxito si el fetch no lanza error.
                await fetch(googleUrl, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body
                });
            } else {
                console.warn('[Seguimiento] Esta asociación no tiene google_url configurada; solo se registrará el historial.');
            }

            const path = `${AsociacionesModule.getRef('novelties')}/${id}`;
            await database.ref(`${path}/seguimiento/estadoInterno`).set(estado);
            await database.ref(`${path}/seguimiento/historial`).push({
                fecha: new Date().toISOString(),
                estadoInterno: estado,
                destinatario: to,
                asunto: asunto || '',
                mensaje,
                resultado: googleUrl ? 'enviado' : 'solo_registrado'
            });

            showToast('📧 Respuesta enviada', 'success');
            cerrarRespuestaRapida();
            if (typeof loadNoveltiesTable === 'function') loadNoveltiesTable();

            // Si el detalle de esta misma novedad está abierto, refrescarlo
            if (typeof currentNoveltyData !== 'undefined' && currentNoveltyData && currentNoveltyData.id === id) {
                const actualizada = _buscarNovelty(id);
                if (actualizada && typeof viewNoveltyDetails === 'function') viewNoveltyDetails(actualizada, false);
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error al enviar: ' + e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '📧 Enviar respuesta'; }
        }
    }

    // ── Tarjeta 6 del detalle: panel de comunicación + historial ────
    function renderPanelComunicacion(novelty) {
        const hist = _historialEntries(novelty);
        const correo = novelty.correoRespuesta || '';
        const d = _datosExtra(novelty);

        const historialHTML = hist.length ? hist.map(h => `
            <div class="seg-hist-item" id="seg-hist-${h.pushId}">
                <div class="seg-hist-top" onclick="SeguimientoModule.toggleHistorialItem('${h.pushId}')">
                    <span>${getEstadoSeg(h.estadoInterno).emoji} ${getEstadoSeg(h.estadoInterno).label}</span>
                    <span class="seg-hist-actions">
                        <span class="seg-hist-fecha">${new Date(h.fecha).toLocaleString('es-CO')}</span>
                        <button type="button" class="seg-hist-btn" title="Minimizar / expandir" onclick="event.stopPropagation(); SeguimientoModule.toggleHistorialItem('${h.pushId}')">▾</button>
                        <button type="button" class="seg-hist-btn seg-hist-btn--del" title="Eliminar esta respuesta" onclick="event.stopPropagation(); SeguimientoModule.eliminarHistorialItem('${novelty.id}','${h.pushId}')">🗑️</button>
                    </span>
                </div>
                <div class="seg-hist-body">
                    <div class="seg-hist-to">Para: ${h.destinatario || '-'}</div>
                    <div class="seg-hist-msg">${(h.mensaje || '').replace(/\n/g, '<br>')}</div>
                </div>
            </div>`).join('') : '<div class="seg-hist-empty">Sin correos enviados todavía.</div>';

        return `
        <div class="detail-card-compact card-seguimiento-c" style="grid-column: 1 / -1;">
            <div class="card-header-c">
                <div class="card-icon-c">📧</div>
                <h4 class="card-title-c">Seguimiento y Comunicación</h4>
                ${chipEstadoInterno(novelty)}
            </div>
            <div class="data-grid-c">
                <div class="data-item-c full-width-c">
                    <span class="data-label-c">📧 Correo de respuesta</span>
                    <span class="data-value-c">${correo || '<em style="color:#94a3b8">No registrado</em>'}</span>
                </div>
                <div class="data-item-c"><span class="data-label-c">🆔 RC</span><span class="data-value-c">${d.rc}</span></div>
                <div class="data-item-c"><span class="data-label-c">🔢 Código UDS</span><span class="data-value-c">${d.codigoUds}</span></div>
                <div class="data-item-c"><span class="data-label-c">📄 Contrato</span><span class="data-value-c">${d.contrato}</span></div>
                <div class="data-item-c"><span class="data-label-c">🌎 Regional</span><span class="data-value-c">${d.regional}</span></div>
            </div>
            <div class="seg-hist-list">${historialHTML}</div>
            <div class="seg-panel-actions">
                <button class="qr-btn-send" onclick="SeguimientoModule.abrirRespuestaRapida('${novelty.id}')">📧 Responder / Cambiar estado</button>
            </div>
        </div>`;
    }

    function toggleHistorialItem(pushId) {
        const el = document.getElementById(`seg-hist-${pushId}`);
        if (el) el.classList.toggle('seg-hist-item--collapsed');
    }

    async function eliminarHistorialItem(novedadId, pushId) {
        if (!confirm('¿Eliminar esta respuesta del historial? Esta acción no se puede deshacer.')) return;
        try {
            const path = `${AsociacionesModule.getRef('novelties')}/${novedadId}`;
            await database.ref(`${path}/seguimiento/historial/${pushId}`).remove();

            const novelty = _buscarNovelty(novedadId);
            if (novelty && novelty.seguimiento && novelty.seguimiento.historial) {
                delete novelty.seguimiento.historial[pushId];
            }

            showToast('🗑️ Respuesta eliminada del historial', 'success');

            if (typeof currentNoveltyData !== 'undefined' && currentNoveltyData && currentNoveltyData.id === novedadId
                && typeof viewNoveltyDetails === 'function') {
                viewNoveltyDetails(novelty || currentNoveltyData, false);
            }
            if (typeof loadNoveltiesTable === 'function') loadNoveltiesTable();
            renderBandeja();
        } catch (e) {
            showToast('Error al eliminar: ' + e.message, 'error');
        }
    }

    // ── Editor de plantillas dentro de "Configuración" ───────────
    function renderEditorPlantillas() {
        const wrap = document.getElementById('plantillasRespuestaWrap');
        if (!wrap) return;
        const plantillas = getPlantillas();
        wrap.innerHTML = `
        <div class="config-bloqueo-card">
            <h3 class="config-bloqueo-title"><span>📧</span> Plantillas de Respuesta a Novedades</h3>
            <div style="font-size:12px;color:#78716c;margin-bottom:14px;">
                Este texto se sugiere automáticamente al elegir el estado en "Responder". Puedes usar
                <code>{{nombre}}</code>, <code>{{rc}}</code>, <code>{{fecha}}</code>, <code>{{tipo}}</code>,
                <code>{{contrato}}</code> y <code>{{regional}}</code> — se reemplazan por los datos reales de
                cada novedad. En novedades de tipo <strong>Ambos</strong> (retiro + ingreso), estos tokens
                combinan la información de las dos personas; si quieres referirte a cada una por separado
                usa <code>{{nombreRetiro}}</code>, <code>{{rcRetiro}}</code>, <code>{{fechaRetiro}}</code>,
                <code>{{nombreIngreso}}</code>, <code>{{rcIngreso}}</code> y <code>{{fechaIngreso}}</code>.
                Además, cada correo incluye automáticamente un bloque con los datos generales antes de este texto.
            </div>
            ${Object.keys(plantillas).map(key => {
                const info = plantillas[key];
                return `
                <div class="plantilla-row">
                    <label class="plantilla-label" style="color:${info.color}">${info.emoji} ${info.label}</label>
                    <textarea id="plantilla-${key}" rows="2">${info.mensaje}</textarea>
                    <button class="qr-btn-cancel" onclick="SeguimientoModule.guardarPlantilla('${key}', document.getElementById('plantilla-${key}').value)">💾 Guardar</button>
                </div>`;
            }).join('')}
        </div>`;
    }

    // ── 📬 Bandeja de Seguimiento (sección propia del sidebar) ──────
    const GRUPOS = {
        enProceso:  ['en_proceso', 'pendiente_soporte', 'desvinculacion_pendiente'],
        esperando:  ['info_incompleta'],
        finalizadas: ['vinculado', 'duplicado', 'no_procede', 'desvinculacion_realizada']
    };

    let _bandejaFiltroEstado = '';
    let _bandejaBusqueda = '';

    function _todasLasNovedades() {
        return [
            ...(typeof currentNovelties !== 'undefined' ? (currentNovelties || []) : []),
            ...(typeof archivedNovelties !== 'undefined' ? (archivedNovelties || []) : [])
        ];
    }

    function calcularEstadisticas() {
        const todas = _todasLasNovedades();
        const stats = { pendientes: 0, enProceso: 0, esperando: 0, finalizadas: 0, correos: 0 };
        todas.forEach(n => {
            const estado = n.seguimiento?.estadoInterno || 'pendiente';
            stats.correos += _historialEntries(n).length;
            if (GRUPOS.enProceso.includes(estado)) stats.enProceso++;
            else if (GRUPOS.esperando.includes(estado)) stats.esperando++;
            else if (GRUPOS.finalizadas.includes(estado)) stats.finalizadas++;
            else stats.pendientes++;
        });
        return stats;
    }

    function _filaBandeja(n) {
        const d = _datosExtra(n);
        const hist = _historialEntries(n);
        const ultima = hist[0];
        return `
        <tr>
            <td><strong>${_nombreDe(n)}</strong></td>
            <td>${_tipoDe(n)}</td>
            <td>${d.rc}</td>
            <td>${d.codigoUds}</td>
            <td>${d.contrato}</td>
            <td>${d.regional}</td>
            <td>${chipEstadoInterno(n)}</td>
            <td style="text-align:center">${hist.length}</td>
            <td>${ultima ? new Date(ultima.fecha).toLocaleString('es-CO') : '<em style="color:#94a3b8">Sin actividad</em>'}</td>
            <td>
                ${botonResponder(n.id)}
                <button type="button" class="comm-reply-btn" style="background:#475569" onclick="event.stopPropagation(); SeguimientoModule.verDetalleDesdeBandeja('${n.id}')">👁️ Ver</button>
            </td>
        </tr>`;
    }

    function renderBandeja() {
        const statsWrap = document.getElementById('segBandejaStats');
        const tbody = document.getElementById('segBandejaTableBody');
        if (!statsWrap || !tbody) return; // la sección aún no está en el DOM (o no es visible)

        const selEstado = document.getElementById('segBandejaFiltroEstado');
        if (selEstado && selEstado.dataset.poblado !== '1') {
            Object.keys(getPlantillas()).forEach(key => {
                const info = getEstadoSeg(key);
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = `${info.emoji} ${info.label}`;
                selEstado.appendChild(opt);
            });
            selEstado.dataset.poblado = '1';
        }

        const s = calcularEstadisticas();
        statsWrap.innerHTML = `
            <div class="seg-stat-card seg-stat-card--amber"><div class="seg-stat-num">${s.pendientes}</div><div class="seg-stat-label">🟠 Pendientes de respuesta</div></div>
            <div class="seg-stat-card seg-stat-card--blue"><div class="seg-stat-num">${s.enProceso}</div><div class="seg-stat-label">🔵 En proceso</div></div>
            <div class="seg-stat-card seg-stat-card--yellow"><div class="seg-stat-num">${s.esperando}</div><div class="seg-stat-label">🟡 Esperando información</div></div>
            <div class="seg-stat-card seg-stat-card--green"><div class="seg-stat-num">${s.finalizadas}</div><div class="seg-stat-label">🟢 Finalizadas</div></div>
            <div class="seg-stat-card seg-stat-card--slate"><div class="seg-stat-num">${s.correos}</div><div class="seg-stat-label">📧 Correos enviados</div></div>
        `;

        let todas = _todasLasNovedades();
        if (_bandejaFiltroEstado) {
            todas = todas.filter(n => (n.seguimiento?.estadoInterno || 'pendiente') === _bandejaFiltroEstado);
        }
        if (_bandejaBusqueda) {
            const q = _bandejaBusqueda.toLowerCase();
            todas = todas.filter(n => {
                const d = _datosExtra(n);
                return _nombreDe(n).toLowerCase().includes(q)
                    || d.rc.toLowerCase().includes(q)
                    || d.contrato.toLowerCase().includes(q)
                    || d.regional.toLowerCase().includes(q)
                    || d.codigoUds.toLowerCase().includes(q);
            });
        }
        todas.sort((a, b) => {
            const fa = _historialEntries(a)[0]?.fecha || a.timestamp || '';
            const fb = _historialEntries(b)[0]?.fecha || b.timestamp || '';
            return new Date(fb) - new Date(fa);
        });

        tbody.innerHTML = todas.length
            ? todas.map(n => _filaBandeja(n)).join('')
            : `<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:20px;">No hay novedades que coincidan con el filtro.</td></tr>`;

        actualizarBadgeSidebar();
    }

    function actualizarBadgeSidebar() {
        const badge = document.getElementById('countSeguimientoPendientes');
        if (!badge) return;
        const s = calcularEstadisticas();
        badge.textContent = s.pendientes;
        badge.style.display = s.pendientes > 0 ? '' : 'none';
    }

    function filtrarBandeja() {
        _bandejaBusqueda = document.getElementById('segBandejaBusqueda')?.value?.trim() || '';
        _bandejaFiltroEstado = document.getElementById('segBandejaFiltroEstado')?.value || '';
        renderBandeja();
    }

    function verDetalleDesdeBandeja(id) {
        const n = _buscarNovelty(id);
        if (n && typeof viewNoveltyDetails === 'function') viewNoveltyDetails(n, false);
    }

    // ── Init ──────────────────────────────────────────────────────
    async function init() {
        _asegurarModal();
        await _cargarPlantillas();
        renderEditorPlantillas();
        if (typeof AsociacionesModule !== 'undefined' && AsociacionesModule.onPerfilCargado) {
            AsociacionesModule.onPerfilCargado(async () => {
                await _cargarPlantillas();
                renderEditorPlantillas();
            });
        }
    }

    return {
        init, getPlantillas, getEstadoSeg, guardarPlantilla,
        badgeComunicacion, chipEstadoInterno, botonResponder,
        abrirRespuestaRapida, cerrarRespuestaRapida, onCambioEstadoModal,
        enviarRespuesta, renderPanelComunicacion, renderEditorPlantillas,
        toggleHistorialItem, eliminarHistorialItem,
        renderBandeja, filtrarBandeja, verDetalleDesdeBandeja, calcularEstadisticas,
        actualizarBadgeSidebar, actualizarResumenLateral, verDetalleDesdeRespuesta
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Pequeño retraso para dejar que Firebase/Asociaciones inicien primero
    setTimeout(() => SeguimientoModule.init(), 300);
});
