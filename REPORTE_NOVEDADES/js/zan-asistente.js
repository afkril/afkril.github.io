/* ==========================================================================
   ZAN · ASISTENTE VIRTUAL DEL FORMULARIO DE NOVEDADES (solo operadores)

   Se carga DESPUÉS de core.js, duplicados-v2.js, nutricional.js y novedades.js.
   No modifica esos archivos: se "engancha" envolviendo funciones globales
   (showToast, autocompletar, calcularEstadoNutricional...) y escuchando eventos.

   18 estados de ánimo (sprites en img/zan/zan_<estado>.webp):
     idle      guía normal / esperando al usuario
     idle2     escuchando: consejos y cambio Retiro/Ingreso
     watch     observador: mientras escribe en un campo
     thinking  procesando: guardando el reporte
     happy     avance correcto: paso completado, archivo adjuntado
     done      formulario completo, listo para guardar
     sent      ¡reporte enviado exitosamente!
     sad       sin conexión / reporte en cola
     alert     aviso: duplicado, edad > 5 años, clic sobre Zan, despertar
     error     fallo: error de envío, cierre de mes
     missing   FALTA INFORMACIÓN (selección pendiente, radio sin marcar...)
     required  CAMPO DE ESCRITURA OBLIGATORIO
     attach    RECUERDA ADJUNTAR ARCHIVO
     erase     borrando: quitar archivo/sección, limpiar formulario
     data      datos: autocompletar, estado nutricional, gráfica OMS
     lifted    LEVANTADO por una mano: mientras lo arrastras
     sit       sentado: inactividad
     sleep     dormido: mucha inactividad

   Minimizar: el botón ✕ del globo lo esconde 5 minutos (se guarda en
   localStorage, así que sobrevive a recargar la página) y luego reanuda solo.
   Todos los tiempos se ajustan en ZAN_OP_CONFIG.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ZanOperador) return;

  // ------------------------------------------------------------------------
  // CONFIGURACIÓN
  // ------------------------------------------------------------------------
  var CFG = {
    spriteBase: 'img/zan/zan_',      // ruta de los sprites (WebP con transparencia)
    spriteExt: '.webp',
    minimizeMs: 5 * 60 * 1000,       // minimizado: vuelve solo a los 5 minutos
    sitAfterMs: 90 * 1000,           // inactividad para sentarse
    sleepAfterMs: 3 * 60 * 1000,     // inactividad para dormirse
    tipAfterMs: 20 * 1000,           // inactividad mínima antes de un consejo
    tipEveryMs: 50 * 1000,           // tiempo mínimo entre consejos
    tipShowMs: 12 * 1000,            // cuánto se queda visible un consejo
    happyMs: 2200,
    infoMs: 5000,
    alertMs: 6000,
    problemMs: 8000,                 // required / missing / attach / error
    sentMs: 9000,
    dataMs: 4500,
    eraseMs: 2600,
    clickMs: 1500,
    autoHideBubbleMobileMs: 9000     // en móvil el globo se esconde solo (toca a Zan para verlo)
  };
  if (window.ZAN_OP_CONFIG) Object.keys(window.ZAN_OP_CONFIG).forEach(function (k) { CFG[k] = window.ZAN_OP_CONFIG[k]; });

  var STATES = ['idle', 'idle2', 'watch', 'thinking', 'happy', 'done', 'sent', 'sad', 'alert', 'error',
                'missing', 'required', 'attach', 'erase', 'data', 'lifted', 'sit', 'sleep'];
  // tono del globo según el estado
  var TONE = { happy: 'ok', done: 'ok', sent: 'ok', missing: 'warn', attach: 'warn', alert: 'warn', sad: 'warn',
               required: 'bad', error: 'bad' };
  // prioridades: un aviso importante no lo pisa uno menor
  var PRIO = { sent: 90, error: 80, required: 70, missing: 70, attach: 70, alert: 60, sad: 60, thinking: 55,
               data: 50, erase: 45, happy: 40, lifted: 100, idle2: 10, idle: 5, watch: 5 };

  var LS_SNOOZE = 'zanOp_snoozeUntil';
  var LS_POS = 'zanOp_pos';

  // ------------------------------------------------------------------------
  // UTILIDADES
  // ------------------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var e = $(id); return e && e.value ? String(e.value).trim() : ''; };
  var chk = function (id) { var e = $(id); return !!(e && e.checked); };
  var radio = function (name) { var e = document.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : ''; };
  var hasFile = function (id) { var e = $(id); return !!(e && e.files && e.files.length); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var clean = function (s) { return String(s || '').replace(/^[^A-Za-z0-9\u00C0-\u017F¿¡]+/, '').replace(/\s+/g, ' ').trim(); };
  var isSmall = function () { return window.matchMedia && window.matchMedia('(max-width: 640px)').matches; };
  var safe = function (fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { console.warn('[Zan]', e); } }; };

  // ------------------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------------------
  var root, sayEl, bubble, textEl, pills, avatar, img, chip, chipTime, chipFace;

  function buildDom() {
    root = document.createElement('div');
    root.id = 'zanOp';
    root.setAttribute('data-state', 'idle');
    root.innerHTML =
      '<div class="zanop-say" id="zanOpSay">' +
        '<div class="zanop-bubble" role="status" aria-live="polite">' +
          '<div class="zanop-head">' +
            '<div class="zanop-name"><span>Zan</span><span class="zanop-badge">Asistente</span></div>' +
            '<button type="button" class="zanop-min" id="zanOpMin" title="Minimizar (vuelvo en 5 minutos)" aria-label="Minimizar asistente">✕</button>' +
          '</div>' +
          '<div class="zanop-text" id="zanOpText"></div>' +
          '<div class="zanop-pills" id="zanOpPills">' +
            '<div class="zanop-pill" title="1 · Ubicación"></div>' +
            '<div class="zanop-pill" title="2 · Qué reportar"></div>' +
            '<div class="zanop-pill" title="3 · Datos"></div>' +
            '<div class="zanop-pill" title="4 · Enviar"></div>' +
          '</div>' +
        '</div>' +
        '<div class="zanop-tail"></div>' +
      '</div>' +
      '<div class="zanop-avatar zanop-float" id="zanOpAvatar" title="Zan (arrástrame si te estorbo)">' +
        '<img class="zanop-img" id="zanOpImg" alt="Zan, asistente virtual" draggable="false">' +
      '</div>';
    document.body.appendChild(root);

    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'zanop-chip';
    chip.id = 'zanOpChip';
    chip.hidden = true;
    chip.setAttribute('aria-label', 'Volver a mostrar a Zan');
    chip.innerHTML = '<span class="zanop-chip-face"></span>' +
      '<span class="zanop-chip-text"><span>Zan minimizado</span><small>vuelve en <span class="zanop-chip-time">5:00</span> · toca para llamarlo</small></span>';
    document.body.appendChild(chip);

    sayEl = $('zanOpSay');
    bubble = root.querySelector('.zanop-bubble');
    textEl = $('zanOpText');
    pills = Array.prototype.slice.call($('zanOpPills').children);
    avatar = $('zanOpAvatar');
    img = $('zanOpImg');
    chipTime = chip.querySelector('.zanop-chip-time');
    chipFace = chip.querySelector('.zanop-chip-face');
    chipFace.style.backgroundImage = 'url("' + CFG.spriteBase + 'idle' + CFG.spriteExt + '")';
  }

  // Precarga: primero idle, el resto en segundo plano
  function preload() {
    var i = 0;
    var next = function () {
      if (i >= STATES.length) return;
      var im = new Image();
      im.onload = im.onerror = function () { setTimeout(next, 30); };
      im.src = CFG.spriteBase + STATES[i++] + CFG.spriteExt;
    };
    setTimeout(next, 400);
  }

  // ------------------------------------------------------------------------
  // MOTOR DE ESTADOS
  //   base  = guía permanente calculada a partir del formulario
  //   temp  = mensaje pasajero (con prioridad y duración)
  // ------------------------------------------------------------------------
  var S = {
    minimized: false, sprite: null, html: '', step: 0,
    base: { state: 'idle', html: '', step: 0 },
    temp: null, tempTimer: null,
    busy: false, busyTimer: null,
    lastActivity: Date.now(), lastTip: 0, tipsSeen: {},
    dragging: false, bubbleTimer: null, snoozeUntil: 0,
    lastErase: 0, lastNutri: 0
  };

  function setSprite(state) {
    if (!STATES.includes(state)) state = 'idle';
    root.setAttribute('data-tone', TONE[state] || '');
    avatar.setAttribute('data-state', state);
    avatar.classList.toggle('zanop-float', state !== 'sit' && state !== 'sleep');
    if (state === S.sprite) return;
    S.sprite = state;
    root.setAttribute('data-state', state);
    img.src = CFG.spriteBase + state + CFG.spriteExt;
    img.classList.remove('zanop-pop'); void img.offsetWidth; img.classList.add('zanop-pop');
  }

  function setText(html, step, fromTemp) {
    if (html !== S.html) {
      S.html = html;
      textEl.innerHTML = html;
      textEl.classList.remove('zanop-swap'); void textEl.offsetWidth; textEl.classList.add('zanop-swap');
      if (fromTemp || !isSmall()) showBubble(true);   // en móvil, escribir no debe tapar el formulario
    }
    if (typeof step === 'number') {
      S.step = step;
      pills.forEach(function (p, i) {
        p.className = 'zanop-pill' + (i < step ? ' is-done' : (i === step ? ' is-active' : ''));
      });
    }
  }

  // En móvil el globo tapa el formulario: se esconde solo tras unos segundos
  function showBubble(fromChange) {
    if (S.minimized) return;
    sayEl.hidden = false;
    clearTimeout(S.bubbleTimer);
    if (isSmall() && fromChange !== 'sticky') {
      S.bubbleTimer = setTimeout(function () { if (!S.dragging) sayEl.hidden = true; }, CFG.autoHideBubbleMobileMs);
    }
  }

  function tempActive() { return S.temp && S.temp.until > Date.now(); }

  // Pinta lo que corresponda ahora mismo (temporal si hay, si no la guía base)
  function paint() {
    if (S.minimized) return;
    if (S.dragging) return;
    if (tempActive()) {
      setSprite(S.temp.state);
      setText(S.temp.html, S.base.step, true);
    } else {
      S.temp = null;
      setSprite(S.base.state);
      setText(S.base.html, S.base.step);
    }
  }

  // Mensaje pasajero
  function flash(state, html, ms, prio) {
    if (S.minimized) return;
    prio = prio == null ? (PRIO[state] || 30) : prio;
    if (tempActive() && S.temp.prio > prio) return;          // no pisar algo más importante
    clearTimeout(S.tempTimer);
    S.temp = { state: state, html: html, prio: prio, until: Date.now() + ms };
    S.tempTimer = setTimeout(function () { S.temp = null; recompute(); }, ms + 20);
    paint();
  }

  // Cambia la guía base (estado "de fondo")
  function setBase(state, html, step) {
    S.base = { state: state, html: html, step: step };
    paint();
  }

  // ------------------------------------------------------------------------
  // LECTURA DEL FORMULARIO
  // ------------------------------------------------------------------------
  function docOk(v) { return v.length >= 7 && v.length <= 10; }
  function nameOk(v) { return v.trim().split(/\s+/).filter(Boolean).length >= 2; }

  // Réplica ligera de las validaciones del envío (novedades.js) para poder guiar antes de enviar
  function computeMissing() {
    var req = [], files = [], soft = [];
    var R = chk('checkRetiro'), I = chk('checkIngreso');

    if (R) {
      if (!val('retiroDocNumber')) req.push('Documento (retiro)');
      else if (!docOk(val('retiroDocNumber'))) req.push('Documento (retiro): 7 a 10 dígitos');
      if (!val('retiroFullName')) req.push('Nombre (retiro)');
      else if (!nameOk(val('retiroFullName'))) req.push('Nombre completo (retiro)');
      if (!val('retiroDate')) req.push('Fecha de retiro');
      if (!radio('_retiroGender')) req.push('Género (retiro)');
      if (!hasFile('retiroFormatoFile')) files.push('Formato de retiro voluntario');
      if (!hasFile('retiroRamFile')) soft.push('el RAM diligenciado');
    }
    if (I) {
      if (!val('ingresoDocNumber')) req.push('Documento (ingreso)');
      else if (!docOk(val('ingresoDocNumber'))) req.push('Documento (ingreso): 7 a 10 dígitos');
      if (!val('ingresoFullName')) req.push('Nombre (ingreso)');
      else if (!nameOk(val('ingresoFullName'))) req.push('Nombre completo (ingreso)');
      if (!val('ingresoDOB')) req.push('Fecha de nacimiento');
      if (!radio('_ingresoGender')) req.push('Género (ingreso)');
      if (!val('ingresoDate')) req.push('Fecha de ingreso');
      if (!val('ingresoComuna')) req.push('Comuna');
      if (!val('ingresoBarrio')) req.push('Barrio');
      if (!val('ingresoAddress')) req.push('Dirección');
      if (!val('ingresoPhone')) req.push('Teléfono');
      if (!val('acudienteName')) req.push('Nombre del acudiente');
      if (!val('acudienteDoc')) req.push('Documento del acudiente');
      if (!val('acudienteDOB')) req.push('Nacimiento del acudiente');

      if (!chk('nutricionPendiente')) {
        if (!val('nutricionFecha')) req.push('Fecha de valoración');
        if (!val('nutricionPeso')) req.push('Peso');
        if (!val('nutricionTalla')) req.push('Talla');
        if (!val('nutricionPerimetroBraquial')) req.push('Perímetro braquial');
      }
      var prem = $('prematurezWrapper');
      if (prem && !prem.classList.contains('hidden')) {
        var pr = radio('antecedente_prematurez');
        if (!pr) req.push('Antecedente de prematurez');
        else if (pr === 'SI' && !val('edadGestacional')) req.push('Edad gestacional');
      }
      var dis = radio('_discapacidadTiene');
      if (!dis) req.push('¿Tiene discapacidad?');
      else if (dis === 'SI') {
        var dNames = ['discapacidad_certificada', 'discapacidad_registro_localizacion', 'discapacidad_requiere_ayuda_persona',
                      'discapacidad_requiere_ayuda_tecnica', 'discapacidad_cuenta_ayuda_tecnica', 'discapacidad_requiere_terapia'];
        var dPend = dNames.some(function (n) { return !radio(n); }) || !val('discapacidadEntidad') || !val('discapacidadCategoria');
        if (dPend) req.push('Datos de discapacidad');
      }
      if (!hasFile('fileInput')) soft.push('el soporte documental');
    }
    if ((R || I) && !val('correoRespuesta')) req.push('Correo de respuesta');

    if (R && I && val('retiroDate') && val('ingresoDate') && val('retiroDate') >= val('ingresoDate')) {
      req.push('La fecha de retiro debe ser anterior a la de ingreso');
    }
    return { req: req, files: files, soft: soft };
  }

  function listHtml(items, max) {
    max = max || 4;
    var shown = items.slice(0, max).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
    var more = items.length > max ? '<li>y ' + (items.length - max) + ' más…</li>' : '';
    return '<ul>' + shown + more + '</ul>';
  }

  // Ayuda contextual del campo que tiene el foco
  var FIELD_HINTS = {
    retiroDocNumber: 'Solo números, de 7 a 10 dígitos. Reviso si ya existe en la base y te aviso si hay duplicado.',
    ingresoDocNumber: 'Solo números, de 7 a 10 dígitos. Si ya estuvo registrado, te ofrezco <b>autocompletar</b> sus datos.',
    retiroFullName: 'Escribe nombres y apellidos completos (mínimo dos palabras).',
    ingresoFullName: 'Escribe nombres y apellidos completos (mínimo dos palabras).',
    retiroDate: 'Fecha real de la salida. Si reportas retiro e ingreso, el retiro va antes.',
    ingresoDate: 'Fecha real de la entrada a la UDS. Si reportas retiro e ingreso, debe ser posterior al retiro.',
    ingresoDOB: 'La primera infancia llega hasta los 5 años; si se pasa, te aviso.',
    ingresoComuna: 'Elige la comuna donde vive el beneficiario.',
    ingresoBarrio: 'Escribe el nombre del barrio.',
    ingresoAddress: 'Dirección completa, tal como la dice el acudiente.',
    ingresoPhone: 'Un teléfono de contacto que sí funcione.',
    acudienteDoc: 'Documento de la madre o acudiente responsable.',
    acudienteName: 'Nombre completo de la madre o acudiente.',
    acudienteDOB: 'Fecha de nacimiento de la madre o acudiente.',
    nutricionFecha: 'Fecha en que se tomaron las medidas.',
    nutricionPeso: 'Peso entre 5 y 30 kg. Uso un punto para decimales (12.5).',
    nutricionTalla: 'Talla entre 50 y 130 cm. Con peso y talla calculo el estado nutricional.',
    nutricionPerimetroBraquial: 'Perímetro braquial entre 6 y 30 cm.',
    edadGestacional: 'Semanas de gestación al nacer: entre 3 y 36.',
    correoRespuesta: 'Ahí te llega la respuesta de esta novedad. Revísalo bien.'
  };

  var WIZARD = [
    ['regionalSelect', '<b>Paso 1 · Regional.</b> Elige la <b>Regional</b> donde se reporta la novedad. 📍'],
    ['modalidadSelect', '<b>Paso 2 · Modalidad.</b> Ahora dime la <b>Modalidad</b> (tipo de servicio) de tu UDS.'],
    ['contractNumber', '<b>Paso 3 · Contrato.</b> Selecciona el <b>Contrato</b> al que pertenece la UDS.'],
    ['mainUdsDropdown', '<b>Paso 4 · UDS.</b> Elige tu <b>UDS</b>. Es la última parte de la ubicación. 🏫']
  ];

  // Calcula la guía base según el estado del formulario
  function recompute() {
    if (S.minimized) return;
    var focused = document.activeElement;
    var typing = focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName) && focused.form && focused.form.id === 'noveltyForm';

    if (S.busy) { paint(); return; }

    // 1) Ubicación
    for (var i = 0; i < WIZARD.length; i++) {
      var sel = $(WIZARD[i][0]);
      if (sel && !sel.disabled && !sel.value) { setBase('idle', WIZARD[i][1], 0); return; }
      if (sel && sel.disabled && !sel.value) { setBase('idle', WIZARD[i][1], 0); return; }
    }

    // 2) Qué reportar
    var R = chk('checkRetiro'), I = chk('checkIngreso');
    if (!R && !I) {
      setBase('idle', '<b>Paso 5 · ¿Qué vas a reportar?</b> Marca <b>Retirar</b> o <b>Ingresar beneficiario</b> (puedes marcar los dos). 📝', 1);
      return;
    }

    var tipo = (R && I) ? '<b>Retiro</b> + <b>Ingreso</b>' : (R ? '<b>Retiro</b>' : '<b>Ingreso</b>');
    var m = computeMissing();
    var hint = '';
    if (typing && FIELD_HINTS[focused.id]) hint = '<div class="zanop-hint">' + FIELD_HINTS[focused.id] + '</div>';

    // 3) Datos pendientes
    if (m.req.length) {
      setBase(typing ? 'watch' : 'idle',
        'Reportando ' + tipo + '. Faltan <b>' + m.req.length + '</b> dato' + (m.req.length > 1 ? 's' : '') + ' obligatorio' + (m.req.length > 1 ? 's' : '') + ':' +
        listHtml(m.req) + hint, 2);
      return;
    }
    // 4) Archivo obligatorio pendiente
    if (m.files.length) {
      setBase('attach',
        '<b>¡Casi listo!</b> Solo falta adjuntar: <b>' + esc(m.files.join(', ')) + '</b>. Arrástralo al recuadro punteado o toca para elegirlo. 📎' + hint, 2);
      return;
    }
    // 5) Todo completo
    var soft = m.soft.length ? '<div class="zanop-hint">Opcional: aún no adjuntas ' + esc(m.soft.join(' ni ')) + '. Si lo tienes, es buen momento.</div>' : '';
    setBase('done', '<b>¡Formulario completo!</b> Revisa los datos y pulsa <b>Guardar Reporte</b>. ✅' + soft + hint, 3);
  }
  var recomputeSoon = (function () {
    var t; return function () { clearTimeout(t); t = setTimeout(safe(recompute), 140); };
  })();

  // ------------------------------------------------------------------------
  // REACCIONES A MENSAJES DEL SISTEMA (showToast)
  // ------------------------------------------------------------------------
  function labelOf(el) {
    if (!el) return '';
    var f = el.closest && el.closest('.cf-field');
    var l = f && f.querySelector('.cf-microlabel');
    var t = l ? l.textContent : (el.getAttribute && (el.getAttribute('placeholder') || el.getAttribute('name'))) || '';
    return clean(String(t).replace(/\*/g, ''));
  }
  function offendingField() {
    var a = document.activeElement;
    if (a && a.classList && a.classList.contains('input-error')) return a;
    return document.querySelector('.input-error');
  }

  var onToast = safe(function (msg, type) {
    var t = norm(msg), c = esc(clean(msg));

    if (type === 'error') {
      endBusy();
      if (/cierre de mes/.test(t)) {
        return flash('error', '<b>Cierre de mes.</b> En estos días el sistema no recibe novedades. Intenta después de que termine el periodo. 🔒', CFG.problemMs);
      }
      if (/adjuntar|archivo|soporte|formato de retiro/.test(t)) {
        return flash('attach', '<b>¡No olvides el archivo!</b> ' + c + '. Arrástralo al recuadro punteado (PDF o imagen, máx. 8 MB). 📎', CFG.problemMs);
      }
      if (/obligatori|debe tener entre|nombre y apellidos|debe estar entre|debe ser anterior/.test(t)) {
        setTimeout(safe(function () {
          var lab = labelOf(offendingField());
          var body = /obligatori/.test(t) && lab
            ? '<b>' + esc(lab) + '</b> es obligatorio. Lo marqué en rojo: escríbelo y seguimos. ✍️'
            : c + '. Corrígelo en el campo marcado en rojo. ✍️';
          flash('required', '<b>Campo obligatorio.</b> ' + body, CFG.problemMs);
        }), 90);
        return;
      }
      if (/seleccione|indique|responda|al menos una|asociacion/.test(t)) {
        return flash('missing', '<b>Falta información.</b> ' + c + '. 🔎', CFG.problemMs);
      }
      return flash('error', '<b>Algo no salió bien.</b> ' + c, CFG.problemMs);
    }

    if (type === 'success') {
      if (/reporte enviado|exito/.test(t)) {
        endBusy();
        return flash('sent', '<b>¡Reporte enviado exitosamente!</b> 🎉 Quedó guardado y el resumen apareció en el panel lateral. ¿Seguimos con otro?', CFG.sentMs);
      }
      if (/autocompletad/.test(t)) return; // lo maneja el wrapper de autocompletar
      return flash('happy', c, CFG.happyMs + 1200);
    }

    if (type === 'warning') {
      if (/asociacion/.test(t)) return flash('missing', '<b>Falta información.</b> ' + c, CFG.problemMs);
      if (/edad supera|5 anos/.test(t)) return flash('alert', '<b>¡Ojo con la edad!</b> Supera los 5 años (primera infancia). Verifica la fecha de nacimiento. 🎂', CFG.alertMs);
      if (/ya existe/.test(t)) return flash('alert', '<b>Posible duplicado.</b> ' + c + '. Revisa el aviso bajo el documento. 👀', CFG.alertMs);
      return flash('alert', c, CFG.alertMs);
    }

    // info
    if (/limpio/.test(t)) return flash('erase', '<b>Formulario limpio.</b> Borré todo lo escrito y volvemos al paso 1. 🧹', CFG.eraseMs + 1200);
    if (/conexion inestable|guardo de forma segura/.test(t)) {
      endBusy();
      return flash('sad', '<b>Sin señal estable.</b> Tu reporte quedó guardado de forma segura y se enviará solo cuando vuelva la conexión. 📶', CFG.sentMs);
    }
    if (/encontrado en base/.test(t)) return flash('data', '<b>Lo encontré en la base de datos.</b> ' + c, CFG.dataMs);
    if (/sin conexion|sin senal/.test(t)) return flash('sad', c, CFG.alertMs);
    return; // otros avisos informativos no cambian a Zan
  });

  // Errores mostrados con showFeedback (validación de fechas en tiempo real)
  var onFeedback = safe(function (msg, type) {
    if (type === 'success') return;
    flash('alert', '<b>Revisa las fechas.</b> ' + esc(clean(msg)) + ' 📅', CFG.problemMs);
  });

  // ------------------------------------------------------------------------
  // ENVÍO (barra de progreso EnvioProgresoUI)
  // ------------------------------------------------------------------------
  var PROGRESS_MSG = {
    preparando: 'Preparando tu reporte y comprimiendo los archivos… ⚙️',
    guardando: 'Guardando en la base de datos. <b>No cierres la página.</b> 💾',
    correo: '¡Guardado! Ahora envío el correo de notificación… 📧',
    encolado: 'Sin confirmación a tiempo: lo dejo guardado en cola para reintentar. 📶'
  };
  function setBusy() {
    S.busy = true;
    clearTimeout(S.busyTimer);
    S.busyTimer = setTimeout(endBusy, 90 * 1000);   // seguro anti-bloqueo
  }
  // Termina el estado "procesando" y suelta el mensaje de progreso si aún está en pantalla
  function endBusy() {
    S.busy = false;
    clearTimeout(S.busyTimer);
    if (S.temp && S.temp.state === 'thinking') { clearTimeout(S.tempTimer); S.temp = null; recompute(); }
  }
  var onProgress = safe(function (estado) {
    if (estado === 'preparando') setBusy();
    if (S.busy && PROGRESS_MSG[estado]) flash('thinking', PROGRESS_MSG[estado], 20000, 95);
    if (estado === 'correo-error') flash('alert', 'El correo tardó en salir, pero <b>el reporte ya está guardado</b>. Se reintenta solo. 📧', CFG.alertMs, 65);
  });

  // ------------------------------------------------------------------------
  // ENGANCHES A FUNCIONES GLOBALES (sin modificar los archivos originales)
  // ------------------------------------------------------------------------
  function wrap(obj, name, after, before) {
    var fn = obj && obj[name];
    if (typeof fn !== 'function' || fn.__zanWrapped) return false;
    var w = function () {
      var args = arguments;
      if (before) { try { before.apply(this, args); } catch (e) { console.warn('[Zan]', e); } }
      var r = fn.apply(this, args);
      if (after) { try { after.call(this, args, r); } catch (e) { console.warn('[Zan]', e); } }
      return r;
    };
    w.__zanWrapped = true;
    try { obj[name] = w; return true; } catch (e) { return false; }
  }

  function hookGlobals() {
    wrap(window, 'showToast', function (a) { onToast(a[0], a[1] || 'info'); });
    wrap(window, 'showFeedback', function (a) { onFeedback(a[0], a[1]); });

    // Envío: barra de progreso
    if (typeof EnvioProgresoUI !== 'undefined' && EnvioProgresoUI) {
      wrap(EnvioProgresoUI, 'mostrar', function () { onProgress('preparando'); });
      wrap(EnvioProgresoUI, 'setEstado', function (a) { onProgress(a[0]); });
      wrap(EnvioProgresoUI, 'ocultar', function () { setTimeout(function () { if (S.busy) endBusy(); }, 3000); });
    }

    // Autocompletar desde registro anterior
    if (typeof DuplicadosModule !== 'undefined' && DuplicadosModule) {
      wrap(DuplicadosModule, 'autocompletar', function (a) {
        var n = document.querySelectorAll('.dup-autofilled').length;
        if (n > 0) {
          flash('data', '<b>Autocompleté ' + n + ' campo' + (n > 1 ? 's' : '') + '</b> con un registro anterior. ' +
            'Verifica que la <b>dirección, teléfono y demás datos</b> sigan vigentes. 🗂️', CFG.dataMs + 2500);
        } else {
          flash('idle2', 'No encontré datos adicionales para autocompletar. Toca escribirlos a mano. ✍️', CFG.infoMs);
        }
        recomputeSoon();
      });
    }

    // Estado nutricional y gráfica OMS
    wrap(window, 'calcularEstadoNutricional', function () {
      setTimeout(safe(function () {
        var ind = $('nutricionIndicator'), st = $('nutricionStatus');
        if (!ind || !st || ind.style.display === 'none') return;
        var txt = (st.textContent || '').trim();
        if (!txt || txt === '--') return;
        var now = Date.now();
        if (now - S.lastNutri < 6000) return;
        S.lastNutri = now;
        flash('data', '<b>Estado nutricional calculado:</b> ' + esc(txt) + '. Puedes ver la posición en la curva con <b>Ver Gráfica OMS</b>. 📊', CFG.dataMs);
      }), 200);
    });
    wrap(window, 'abrirModalGrafica', function () {
      flash('data', 'La gráfica OMS muestra en qué punto de la curva está el niño con su peso y talla. 📈', CFG.dataMs);
    });
  }

  // ------------------------------------------------------------------------
  // EVENTOS DEL FORMULARIO
  // ------------------------------------------------------------------------
  var WIZARD_IDS = ['regionalSelect', 'modalidadSelect', 'contractNumber', 'mainUdsDropdown'];
  var lastWizard = 0;

  function hookForm() {
    var form = $('noveltyForm');
    if (!form) return;

    // Retiro / Ingreso
    ['checkRetiro', 'checkIngreso'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', safe(function () {
        var esRetiro = id === 'checkRetiro';
        if (el.checked) {
          flash('idle2', esRetiro
            ? '<b>Retiro.</b> Pediré documento, nombre, fecha, género y el <b>formato de retiro voluntario</b> (adjunto). 📤'
            : '<b>Ingreso.</b> Pediré datos del beneficiario, ubicación, acudiente, nutrición y discapacidad. 📥',
            CFG.infoMs + 1000);
        } else {
          flash('erase', 'Quitaste <b>' + (esRetiro ? 'el Retiro' : 'el Ingreso') + '</b>: esa sección ya no se enviará. 🗑️', CFG.eraseMs + 600);
        }
        recomputeSoon();
      }));
    });

    // Ubicación (regional → modalidad → contrato → UDS)
    WIZARD_IDS.forEach(function (id, idx) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', safe(function () {
        if (!el.value) return;
        var all = WIZARD_IDS.every(function (i) { var e = $(i); return e && e.value; });
        if (all) flash('happy', '<b>¡Ubicación completa!</b> Ya sé dónde reportar. Ahora elige qué vas a reportar. 🎯', CFG.happyMs + 1400);
        else flash('happy', '¡Bien! ✔', CFG.happyMs);
        lastWizard = idx;
      }));
    });

    // Archivos adjuntos
    form.addEventListener('change', safe(function (e) {
      var t = e.target;
      if (t && t.type === 'file') {
        if (t.files && t.files.length) {
          flash('happy', '<b>Archivo adjuntado:</b> ' + esc(t.files[0].name) + ' 📎✔', CFG.happyMs + 1200);
        } else {
          flash('erase', 'Quitaste el archivo. Recuerda que el <b>formato de retiro</b> es obligatorio si reportas un retiro. 📎', CFG.eraseMs + 800);
        }
      }
      recomputeSoon();
    }), true);

    // Vaciar un campo escrito = "borrando"
    var prevLen = {};
    form.addEventListener('input', safe(function (e) {
      var t = e.target;
      if (!t || !t.id) return;
      if (t.tagName === 'INPUT' && /^(text|tel|number|email)$/.test(t.type)) {
        var was = prevLen[t.id] || 0, now = (t.value || '').length;
        prevLen[t.id] = now;
        if (was > 0 && now === 0 && Date.now() - S.lastErase > 6000 && t.type !== 'number') {
          S.lastErase = Date.now();
          flash('erase', 'Borraste <b>' + esc(labelOf(t) || 'el campo') + '</b>. Escríbelo de nuevo cuando lo tengas. ✏️', CFG.eraseMs);
        }
      }
      recomputeSoon();
    }), true);

    // Campos obligatorios nativos (required / correo): Zan también avisa
    form.addEventListener('invalid', safe(function (e) {
      if (form.querySelector(':invalid') !== e.target) return;   // solo el primero (el que recibe el foco)
      var lab = labelOf(e.target) || (e.target.name || 'un campo');
      var isSel = e.target.tagName === 'SELECT';
      flash(isSel ? 'missing' : 'required',
        isSel ? '<b>Falta información.</b> Selecciona una opción en <b>' + esc(lab) + '</b>. 🔎'
              : '<b>Campo obligatorio.</b> Escribe <b>' + esc(lab) + '</b> para poder continuar. ✍️',
        CFG.problemMs);
    }), true);

    // Foco: Zan observa y da la ayuda del campo
    form.addEventListener('focusin', safe(function () { recomputeSoon(); }), true);
    form.addEventListener('focusout', safe(function () { setTimeout(recompute, 200); }), true);
    form.addEventListener('click', recomputeSoon, true);

    // Avisos de duplicado (bajo el documento)
    ['retiroDupWarning', 'ingresoDupWarning'].forEach(function (id) {
      var box = $(id);
      if (!box || !window.MutationObserver) return;
      var last = '';
      new MutationObserver(safe(function () {
        if (box.classList.contains('hidden') || !box.innerHTML.trim() || box.querySelector('.dup-loading')) return;
        var sig = box.textContent.slice(0, 80);
        if (sig === last) return;
        last = sig;
        flash('alert', '<b>Este documento ya aparece en la base de datos.</b> Lee el aviso bajo el campo' +
          (box.querySelector('[onclick*="autocompletar"]') ? ' y, si quieres, usa <b>Autocompletar</b> para no escribir todo' : '') + '. 👀', CFG.alertMs + 1500);
      })).observe(box, { childList: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  // Conexión
  function hookNetwork() {
    window.addEventListener('offline', safe(function () {
      flash('sad', '<b>Perdí la conexión.</b> Puedes seguir llenando el formulario: si no hay señal al enviar, lo guardo y lo mando solo. 📶', CFG.sentMs, 62);
    }));
    window.addEventListener('online', safe(function () {
      flash('happy', '<b>¡Volvió la conexión!</b> Sincronizo lo pendiente. 🌐', CFG.infoMs, 62);
    }));
  }

  // ------------------------------------------------------------------------
  // CONSEJOS (aparecen cuando no haces nada)
  // ------------------------------------------------------------------------
  var TIPS = {
    ubicacion: [
      'Las listas van en cascada: primero <b>Regional</b>, luego <b>Modalidad</b>, <b>Contrato</b> y <b>UDS</b>.',
      'Puedes tocar una miga de pan (ej. <b>Regional: …</b>) para volver a cambiar un paso.',
      'Si te equivocaste, el botón de <b>limpiar formulario</b> borra todo y empieza de cero.'
    ],
    accion: [
      'Puedes marcar <b>Retiro</b> e <b>Ingreso</b> a la vez, por ejemplo en un cambio de beneficiario.',
      'Sin conexión no pasa nada: el reporte se guarda y se envía solo cuando regrese la señal.'
    ],
    retiro: [
      'El <b>formato de retiro voluntario</b> es obligatorio. El RAM diligenciado es opcional pero suma.',
      'Al escribir el documento reviso la base de datos y te aviso si el beneficiario ya existe.',
      'El documento va solo con números, de 7 a 10 dígitos.'
    ],
    ingreso: [
      'Si el documento ya estuvo registrado, toca <b>Autocompletar</b> y me encargo de llenar lo demás.',
      'Con <b>fecha de nacimiento</b> calculo la edad; la primera infancia llega hasta los 5 años.',
      'Con peso y talla calculo el estado nutricional; <b>Ver Gráfica OMS</b> lo muestra en la curva.',
      '¿No tienes las medidas todavía? Marca <b>Dato Pendiente</b> y las completas después desde el panel.',
      'El <b>correo de respuesta</b> es donde te llega la contestación de la novedad.'
    ],
    general: [
      'Si te estorbo, arrástrame a otro lado o minimízame con la ✕: vuelvo solo en 5 minutos. 🐾',
      'Los campos con <b>*</b> son obligatorios; los que faltan te los marco en rojo al guardar.',
      'Antes de enviar, revisa el <b>documento</b> y los <b>nombres</b>: son los errores más comunes.'
    ]
  };
  function tipContext() {
    for (var i = 0; i < WIZARD_IDS.length; i++) { var e = $(WIZARD_IDS[i]); if (!e || !e.value) return 'ubicacion'; }
    var R = chk('checkRetiro'), I = chk('checkIngreso');
    if (!R && !I) return 'accion';
    return I ? 'ingreso' : 'retiro';
  }
  function pickTip() {
    var ctx = tipContext();
    for (var pass = 0; pass < 2; pass++) {
      var keys = [ctx, 'general'];
      for (var k = 0; k < keys.length; k++) {
        var left = TIPS[keys[k]].filter(function (t) { return !S.tipsSeen[t]; });
        if (left.length) { var t = left[Math.floor(Math.random() * left.length)]; S.tipsSeen[t] = 1; return t; }
      }
      S.tipsSeen = {};
    }
    return null;
  }

  // ¿Hay un modal / overlay tapando el formulario?
  function blocked() {
    var q = function (id, test) { var e = $(id); return e && test(e); };
    return q('epOverlay', function (e) { return e.classList.contains('is-open'); }) ||
           q('consultaUdsOverlay', function (e) { return e.classList.contains('is-open'); }) ||
           q('claveModalOverlay', function (e) { return getComputedStyle(e).display !== 'none'; }) ||
           q('bloqueoOverlay', function (e) { return getComputedStyle(e).display !== 'none'; });
  }

  // ------------------------------------------------------------------------
  // INACTIVIDAD, RELOJ Y MINIMIZAR
  // ------------------------------------------------------------------------
  function activity() {
    var was = S.sprite;
    S.lastActivity = Date.now();
    if (S.minimized) return;
    if (was === 'sit' || was === 'sleep') {
      S.temp = null;
      flash('alert', was === 'sleep' ? '<b>¡Ya desperté!</b> ¿En qué seguimos? 👀' : '<b>¡Aquí sigo!</b> ¿Continuamos? 🐾', 1400, 20);
    }
  }

  function tick() {
    var now = Date.now();
    if (S.minimized) {
      var left = S.snoozeUntil - now;
      if (left <= 0) { resume(true); return; }
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      chipTime.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      return;
    }
    if (S.busy || S.dragging || blocked()) { S.lastActivity = S.busy ? now : S.lastActivity; return; }
    var idle = now - S.lastActivity;
    if (idle >= CFG.sleepAfterMs) {
      if (S.sprite !== 'sleep') { S.temp = null; setBase('sleep', '<b>Zzz…</b> Me dio sueño esperando. Toca cualquier cosa y despierto. 💤', S.base.step); }
    } else if (idle >= CFG.sitAfterMs) {
      if (S.sprite !== 'sit' && S.sprite !== 'sleep') { S.temp = null; setBase('sit', '<b>Sigo por aquí.</b> Avísame cuando quieras continuar. 🪑', S.base.step); }
    } else {
      // Consejos
      var ae = document.activeElement;
      var typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
      if ((S.sprite === 'sit' || S.sprite === 'sleep')) { recompute(); }
      if (!tempActive() && !typing && sayEl && !sayEl.hidden &&
          idle >= CFG.tipAfterMs && now - S.lastTip >= CFG.tipEveryMs) {
        var tip = pickTip();
        if (tip) {
          S.lastTip = now;
          flash('idle2', '<span class="zanop-tag">💡 Consejo</span> ' + tip, CFG.tipShowMs, 10);
        }
      }
    }
  }

  function minimize() {
    S.snoozeUntil = Date.now() + CFG.minimizeMs;
    try { localStorage.setItem(LS_SNOOZE, String(S.snoozeUntil)); } catch (e) { /* modo privado */ }
    applyMinimized(true);
  }
  function applyMinimized(animate) {
    S.minimized = true;
    clearTimeout(S.tempTimer); S.temp = null;
    var done = function () { root.hidden = true; chip.hidden = false; tick(); };
    if (animate) { root.classList.add('zanop-leaving'); setTimeout(done, 240); } else done();
  }
  function resume(auto) {
    try { localStorage.removeItem(LS_SNOOZE); } catch (e) { /* noop */ }
    S.minimized = false; S.snoozeUntil = 0;
    chip.hidden = true; root.hidden = false;
    root.classList.remove('zanop-leaving');
    clampPosition();
    S.lastActivity = Date.now();
    S.sprite = null; S.html = '';
    recompute();
    flash('alert', auto
      ? '<b>¡Ya volví!</b> Pasaron 5 minutos. Sigo aquí para ayudarte con la novedad. 👋'
      : '<b>¡Aquí estoy!</b> Retomemos donde íbamos. 👋', 3500, 30);
  }

  // ------------------------------------------------------------------------
  // ARRASTRAR (estado "lifted": una mano lo levanta) Y POSICIÓN
  // ------------------------------------------------------------------------
  var drag = { on: false, moved: false, sx: 0, sy: 0, left0: 0, bottom0: 0 };

  function clampPosition() {
    var r = root.getBoundingClientRect();
    var left = parseFloat(root.style.left), bottom = parseFloat(root.style.bottom);
    if (isNaN(left) || isNaN(bottom)) return;
    var maxLeft = Math.max(8, window.innerWidth - r.width - 8);
    var maxBottom = Math.max(8, window.innerHeight - r.height - 8);
    root.style.left = Math.min(Math.max(8, left), maxLeft) + 'px';
    root.style.bottom = Math.min(Math.max(8, bottom), maxBottom) + 'px';
  }
  function restorePosition() {
    try {
      var p = JSON.parse(localStorage.getItem(LS_POS) || 'null');
      if (p && isFinite(p.left) && isFinite(p.bottom)) { root.style.left = p.left + 'px'; root.style.bottom = p.bottom + 'px'; clampPosition(); }
    } catch (e) { /* noop */ }
  }
  function savePosition() {
    try { localStorage.setItem(LS_POS, JSON.stringify({ left: parseFloat(root.style.left), bottom: parseFloat(root.style.bottom) })); } catch (e) { /* noop */ }
  }

  function hookDrag() {
    avatar.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var r = root.getBoundingClientRect();
      drag = { on: true, moved: false, sx: e.clientX, sy: e.clientY, left0: r.left, bottom0: window.innerHeight - r.bottom };
      try { avatar.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    avatar.addEventListener('pointermove', function (e) {
      if (!drag.on) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!drag.moved) {
        drag.moved = true; S.dragging = true;
        avatar.classList.add('is-dragging');
        setSprite('lifted');
        setText('<b>¡Ey!</b> ¡Bájame con cuidado! 🙀 Suéltame donde no estorbe.', S.base.step);
        showBubble('sticky');
      }
      root.style.left = (drag.left0 + dx) + 'px';
      root.style.bottom = (drag.bottom0 - dy) + 'px';
      clampPosition();
    });
    var end = function (e) {
      if (!drag.on) return;
      var moved = drag.moved;
      drag.on = false;
      try { avatar.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      avatar.classList.remove('is-dragging');
      if (moved) {
        S.dragging = false; savePosition();
        S.html = ''; S.sprite = null;
        flash('happy', '<b>¡Gracias!</b> Aquí me quedo. 😺', 1800, 45);
      } else {
        // Clic simple: se sorprende un momento (o muestra el globo en móvil)
        if (isSmall() && sayEl.hidden) { showBubble('sticky'); return; }
        flash('alert', pickPoke(), CFG.clickMs + 800, 25);
      }
    };
    avatar.addEventListener('pointerup', end);
    avatar.addEventListener('pointercancel', end);
    window.addEventListener('resize', safe(clampPosition));
  }
  var pokes = ['<b>¡Ay!</b> Me asustaste. 😳 ¿Necesitas algo?', '<b>¿Sí?</b> Dime, ¿en qué te ayudo con la novedad? 🐾', '<b>¡Hey!</b> Estoy atento a tu formulario. 👀'];
  var pokeI = 0;
  function pickPoke() { return pokes[(pokeI++) % pokes.length]; }

  // ------------------------------------------------------------------------
  // ARRANQUE
  // ------------------------------------------------------------------------
  function init() {
    if (!document.body || $('zanOp')) return;
    buildDom();
    preload();
    restorePosition();

    $('zanOpMin').addEventListener('click', function (e) { e.stopPropagation(); minimize(); });
    chip.addEventListener('click', function () { resume(false); });
    hookDrag();
    hookGlobals();
    hookForm();
    hookNetwork();

    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input', 'change', 'drop'].forEach(function (ev) {
      document.addEventListener(ev, safe(activity), true);
    });
    setInterval(safe(tick), 1000);

    // ¿Quedó minimizado antes de recargar?
    var until = 0;
    try { until = parseInt(localStorage.getItem(LS_SNOOZE) || '0', 10) || 0; } catch (e) { /* noop */ }
    if (until > Date.now()) {
      S.snoozeUntil = until;
      applyMinimized(false);
      return;
    }

    setSprite('idle');
    recompute();
    flash('alert', '<b>¡Hola! Soy Zan.</b> 👋 Te acompaño a reportar tu novedad y te aviso si falta algo antes de enviarla.', 4500, 30);
  }

  // API pública (para que el programador pueda dar órdenes a Zan desde cualquier módulo)
  window.ZanOperador = {
    states: STATES.slice(),
    config: CFG,
    /** Zan reacciona un momento: ZanOperador.say('sent', '<b>¡Listo!</b>', 5000) */
    say: function (state, html, ms) { flash(state, html, ms || CFG.infoMs, PRIO[state]); },
    refresh: recompute,
    minimize: minimize,
    resume: function () { resume(false); },
    isMinimized: function () { return S.minimized; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
