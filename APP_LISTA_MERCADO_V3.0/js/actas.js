        // ==================== MÓDULO ACTAS F3.MT1.PP ====================

        const CAT_LABEL = {
            granos: 'Grano',
            proteinas: 'Proteína',
            lacteos: 'Lácteos',
            verduras: 'Verdura',
            frutas: 'Fruta',
            panaderia: 'Pan'
        };

        // ==================== CONFIGURACIÓN DEL FORMATO DE ACTA ====================
        // Preferencias configurables por el usuario para la generación del Excel del
        // acta (F3.MT1.PP). Se guardan en localStorage y se aplican a TODAS las vías
        // de generación (individual, "todas las actas" y el archivo unificado).
        var ACTA_FORMATO_CONFIG_KEY = 'acta_formato_config_v1';
        var DEFAULT_ACTA_FORMATO_CONFIG = {
            orientacion: 'horizontal',      // 'horizontal' (apaisado) | 'vertical' (oficio)
            colorAutocompletado: '#e3f0d9', // color de fondo de las celdas que se autocompletan
            marcarCumpleX: true,            // true = escribe "X" en la columna CUMPLE; false = la deja en blanco
            tamanoFuenteAuto: null          // null = usar el tamaño por defecto según orientación (16 vertical / 12 horizontal)
        };

        function cargarConfigActaFormato() {
            try {
                var raw = localStorage.getItem(ACTA_FORMATO_CONFIG_KEY);
                if (!raw) return Object.assign({}, DEFAULT_ACTA_FORMATO_CONFIG);
                var parsed = JSON.parse(raw);
                return Object.assign({}, DEFAULT_ACTA_FORMATO_CONFIG, parsed);
            } catch(e) { return Object.assign({}, DEFAULT_ACTA_FORMATO_CONFIG); }
        }

        function guardarConfigActaFormato(cfg) {
            try { localStorage.setItem(ACTA_FORMATO_CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
        }

        // Tamaño de letra efectivo de las celdas autocompletadas (producto/cantidad),
        // según config.tamanoFuenteAuto (si el usuario lo fijó) o el valor por defecto
        // recomendado para cada orientación (16 vertical, 12 horizontal).
        function tamanoFuenteEfectivo(cfg) {
            if (cfg && cfg.tamanoFuenteAuto && parseFloat(cfg.tamanoFuenteAuto) > 0) return parseFloat(cfg.tamanoFuenteAuto);
            return (cfg && cfg.orientacion === 'vertical') ? 16 : 12;
        }

        // Número de filas base de productos que trae cada plantilla antes de clonar
        // filas extra (la plantilla horizontal trae 6 filas fijas; la vertical, 7).
        function filasBaseSegunOrientacion(cfg) {
            return (cfg && cfg.orientacion === 'vertical') ? 7 : 6;
        }

        // ── Estado transitorio de la UI del modal (mientras está abierto) ───────────
        var _cfgActaUI = {
            color: '#e3f0d9',
            fuente: 12,
            fuenteManual: false,   // true = el usuario tocó el slider; no se auto-ajusta al cambiar orientación
            orientacion: 'horizontal',
            cumpleAuto: true
        };

        // Datos de ejemplo para la vista previa en vivo del modal
        var _CFGACTA_PREVIEW_ITEMS = [
            { nombre: 'Leche', cantidad: 10 },
            { nombre: 'Cereal', cantidad: 20 },
            { nombre: 'Fruta', cantidad: 15 },
            { nombre: 'Verdura', cantidad: 8 },
            { nombre: 'Huevo', cantidad: 12 }
        ];

        // ── Abrir / cerrar el modal de configuración de formato ─────────────────────
        function abrirConfigActaFormato() {
            var cfg = cargarConfigActaFormato();
            _cfgActaUI.color = cfg.colorAutocompletado || '#e3f0d9';
            _cfgActaUI.orientacion = cfg.orientacion === 'vertical' ? 'vertical' : 'horizontal';
            _cfgActaUI.cumpleAuto = cfg.marcarCumpleX !== false;
            _cfgActaUI.fuenteManual = !!(cfg.tamanoFuenteAuto && parseFloat(cfg.tamanoFuenteAuto) > 0);
            _cfgActaUI.fuente = _cfgActaUI.fuenteManual ? parseFloat(cfg.tamanoFuenteAuto) : tamanoFuenteEfectivo(cfg);

            var elOrientH = document.getElementById('cfg-acta-orient-h');
            var elOrientV = document.getElementById('cfg-acta-orient-v');
            var elCumpleAuto = document.getElementById('cfg-acta-cumple-auto');
            var elCumpleManual = document.getElementById('cfg-acta-cumple-manual');
            var elColor = document.getElementById('cfg-acta-color');
            var elFuente = document.getElementById('cfg-acta-fuente');
            if (elOrientH) elOrientH.checked = _cfgActaUI.orientacion !== 'vertical';
            if (elOrientV) elOrientV.checked = _cfgActaUI.orientacion === 'vertical';
            if (elCumpleAuto) elCumpleAuto.checked = _cfgActaUI.cumpleAuto;
            if (elCumpleManual) elCumpleManual.checked = !_cfgActaUI.cumpleAuto;
            if (elColor) elColor.value = _cfgActaUI.color;
            if (elFuente) elFuente.value = _cfgActaUI.fuente;

            actualizarSwatchSeleccionadoActa();
            actualizarClasesTarjetasActa();
            actualizarBubbleFuenteActa();
            renderPreviewConfigActa();

            var overlay = document.getElementById('config-acta-overlay');
            var panel = document.getElementById('config-acta-panel');
            if (overlay) overlay.style.display = 'block';
            if (panel) panel.style.display = 'flex';
        }

        function cerrarConfigActaFormato() {
            var overlay = document.getElementById('config-acta-overlay');
            var panel = document.getElementById('config-acta-panel');
            if (overlay) overlay.style.display = 'none';
            if (panel) panel.style.display = 'none';
        }

        // ── Handlers de cada control (actualizan el estado y refrescan la vista previa) ──
        function onCambioOrientacionActa() {
            var elOrientV = document.getElementById('cfg-acta-orient-v');
            _cfgActaUI.orientacion = (elOrientV && elOrientV.checked) ? 'vertical' : 'horizontal';
            // Si el usuario no fijó manualmente el tamaño de letra, seguimos el recomendado
            // para la nueva orientación (16 vertical / 12 horizontal).
            if (!_cfgActaUI.fuenteManual) {
                _cfgActaUI.fuente = _cfgActaUI.orientacion === 'vertical' ? 16 : 12;
                var elFuente = document.getElementById('cfg-acta-fuente');
                if (elFuente) elFuente.value = _cfgActaUI.fuente;
                actualizarBubbleFuenteActa();
            }
            actualizarClasesTarjetasActa();
            renderPreviewConfigActa();
        }

        function onCambioCumpleActa() {
            var elCumpleAuto = document.getElementById('cfg-acta-cumple-auto');
            _cfgActaUI.cumpleAuto = !!(elCumpleAuto && elCumpleAuto.checked);
            actualizarClasesTarjetasActa();
            renderPreviewConfigActa();
        }

        function seleccionarColorActa(hex, btnEl) {
            _cfgActaUI.color = hex;
            var elColor = document.getElementById('cfg-acta-color');
            if (elColor) elColor.value = hex;
            actualizarSwatchSeleccionadoActa();
            renderPreviewConfigActa();
        }

        function onColorPersonalizadoActa(hex) {
            seleccionarColorActa(hex, null);
        }

        function actualizarSwatchSeleccionadoActa() {
            var row = document.getElementById('cfgacta-color-row');
            if (!row) return;
            var swatches = row.querySelectorAll('.cfgacta-swatch');
            var esPreset = false;
            swatches.forEach(function(sw) {
                var color = sw.getAttribute('data-color');
                var match = color && color.toLowerCase() === _cfgActaUI.color.toLowerCase();
                sw.classList.toggle('is-selected', !!match);
                if (match) esPreset = true;
            });
            var custom = document.getElementById('cfgacta-swatch-custom');
            if (custom) {
                custom.classList.toggle('is-selected', !esPreset);
                custom.style.background = esPreset ? '' : _cfgActaUI.color;
                var plus = document.getElementById('cfg-acta-color-plus');
                if (plus) plus.style.display = esPreset ? '' : 'none';
            }
        }

        function ajustarFuenteActa(delta) {
            var nuevo = Math.max(8, Math.min(32, (parseFloat(_cfgActaUI.fuente) || 12) + delta));
            _cfgActaUI.fuente = nuevo;
            _cfgActaUI.fuenteManual = true;
            var elFuente = document.getElementById('cfg-acta-fuente');
            if (elFuente) elFuente.value = nuevo;
            actualizarBubbleFuenteActa();
            renderPreviewConfigActa();
        }

        function onSliderFuenteActa(val) {
            _cfgActaUI.fuente = parseFloat(val) || 12;
            _cfgActaUI.fuenteManual = true;
            actualizarBubbleFuenteActa();
            renderPreviewConfigActa();
        }

        function actualizarBubbleFuenteActa() {
            var bubble = document.getElementById('cfg-acta-fuente-bubble');
            var elFuente = document.getElementById('cfg-acta-fuente');
            if (bubble) bubble.textContent = _cfgActaUI.fuente + ' pt';
            if (elFuente) {
                // Posicionar la burbuja alineada con el pulgar del slider
                var min = parseFloat(elFuente.min) || 8, max = parseFloat(elFuente.max) || 32;
                var pct = (( _cfgActaUI.fuente - min) / (max - min)) * 100;
                if (bubble) bubble.style.left = 'calc(' + pct + '% )';
            }
        }

        function actualizarClasesTarjetasActa() {
            var cardH = document.getElementById('cfgacta-card-orient-h');
            var cardV = document.getElementById('cfgacta-card-orient-v');
            if (cardH) cardH.classList.toggle('is-selected', _cfgActaUI.orientacion !== 'vertical');
            if (cardV) cardV.classList.toggle('is-selected', _cfgActaUI.orientacion === 'vertical');

            var cardAuto = document.getElementById('cfgacta-card-cumple-auto');
            var cardManual = document.getElementById('cfgacta-card-cumple-manual');
            if (cardAuto) cardAuto.classList.toggle('is-selected', _cfgActaUI.cumpleAuto);
            if (cardManual) cardManual.classList.toggle('is-selected', !_cfgActaUI.cumpleAuto);
        }

        // Redibuja la tabla de "vista previa en vivo" con el color, tamaño de letra
        // y modo de CUMPLE actualmente seleccionados en el modal.
        function renderPreviewConfigActa() {
            var tbody = document.getElementById('cfgacta-preview-tbody');
            if (!tbody) return;
            var color = _cfgActaUI.color;
            var fontSize = _cfgActaUI.fuente + 'px';
            var cumpleTexto = _cfgActaUI.cumpleAuto ? 'X' : '';

            // Encabezado también se tiñe con el color, igual que en el Excel real
            var thead = tbody.parentElement.querySelector('thead');
            if (thead) {
                thead.querySelectorAll('th').forEach(function(th) {
                    th.style.background = color;
                });
            }

            tbody.innerHTML = _CFGACTA_PREVIEW_ITEMS.map(function(it) {
                return '<tr>'
                    + '<td style="background:' + color + ';font-size:' + fontSize + ';font-weight:600;">' + it.nombre + '</td>'
                    + '<td style="background:' + color + ';font-size:' + fontSize + ';">' + it.cantidad + '</td>'
                    + '<td style="background:' + color + ';font-size:' + fontSize + ';font-weight:700;">' + cumpleTexto + '</td>'
                    + '</tr>';
            }).join('');
        }

        // ── Restaurar a la configuración recomendada por defecto ────────────────────
        function restaurarConfigActaFormatoRecomendada() {
            _cfgActaUI.color = DEFAULT_ACTA_FORMATO_CONFIG.colorAutocompletado;
            _cfgActaUI.orientacion = DEFAULT_ACTA_FORMATO_CONFIG.orientacion;
            _cfgActaUI.cumpleAuto = DEFAULT_ACTA_FORMATO_CONFIG.marcarCumpleX;
            _cfgActaUI.fuenteManual = false;
            _cfgActaUI.fuente = tamanoFuenteEfectivo(DEFAULT_ACTA_FORMATO_CONFIG);

            var elOrientH = document.getElementById('cfg-acta-orient-h');
            var elOrientV = document.getElementById('cfg-acta-orient-v');
            var elCumpleAuto = document.getElementById('cfg-acta-cumple-auto');
            var elCumpleManual = document.getElementById('cfg-acta-cumple-manual');
            var elColor = document.getElementById('cfg-acta-color');
            var elFuente = document.getElementById('cfg-acta-fuente');
            if (elOrientH) elOrientH.checked = true;
            if (elOrientV) elOrientV.checked = false;
            if (elCumpleAuto) elCumpleAuto.checked = true;
            if (elCumpleManual) elCumpleManual.checked = false;
            if (elColor) elColor.value = _cfgActaUI.color;
            if (elFuente) elFuente.value = _cfgActaUI.fuente;

            actualizarSwatchSeleccionadoActa();
            actualizarClasesTarjetasActa();
            actualizarBubbleFuenteActa();
            renderPreviewConfigActa();
            if (typeof showToast === 'function') showToast('↺ Configuración recomendada restaurada', 'info');
        }

        function guardarConfigActaFormatoDesdeUI() {
            var cfg = {
                colorAutocompletado: _cfgActaUI.color,
                marcarCumpleX: !!_cfgActaUI.cumpleAuto,
                orientacion: _cfgActaUI.orientacion === 'vertical' ? 'vertical' : 'horizontal',
                tamanoFuenteAuto: _cfgActaUI.fuenteManual ? parseFloat(_cfgActaUI.fuente) : null
            };
            guardarConfigActaFormato(cfg);
            cerrarConfigActaFormato();
            if (typeof showToast === 'function') showToast('✅ Configuración de formato de acta guardada', 'success');
        }

        function getActaDatos() {
            var fuente = document.getElementById('acta-fuente').value;
            var items = [];
            var currentData = window.__actaCurrentData || null;
            var monthlyData = window.__actaMonthlyData || null;
            var currentRegional = window.__actaRegional || 'neiva';
            if (fuente === 'semanal' && currentData) {
                var sorted = Object.entries(currentData).sort(function(a,b){ return (ORDER_CATEGORIES[a[1].c]||99)-(ORDER_CATEGORIES[b[1].c]||99); });
                sorted.forEach(function(entry) {
                    var name = entry[0]; var item = entry[1];
                    var _esLeche = name.toLowerCase().trim()==='leche'; var _esYogurt = name.toLowerCase().trim()==='yogurt';
                    var _cants = _esLeche ? formatLecheConModo(item.qTotal,(document.getElementById('leche-modo-semanal')||{}).value||'ml') : (_esYogurt ? formatYogurtConModo(item.qTotal,(document.getElementById('yogurt-modo-semanal')||{}).value||'und150') : redondearComercial(item.qTotal,item.u,name));
                    items.push({ nombre: name, componente: CAT_LABEL[item.c]||item.c, cantSolicitada: _cants, categoria: item.c });
                });
            } else if (fuente === 'mensual' && monthlyData) {
                var sorted2 = Object.entries(monthlyData).sort(function(a,b){ return (ORDER_CATEGORIES[a[1].c]||99)-(ORDER_CATEGORIES[b[1].c]||99); });
                sorted2.forEach(function(entry) {
                    var name = entry[0]; var item = entry[1];
                    var total = Object.values(item.weeks).reduce(function(s,w){ return s+(w.qTotal||0); },0);
                    items.push({ nombre: name, componente: CAT_LABEL[item.c]||item.c, cantSolicitada: formatCompacto(total, item.u, name), categoria: item.c });
                });
            }
            return items;
        }

        function generarVistaActa() {
            document.getElementById('ap-regional').textContent = currentRegional==='neiva'?'NEIVA':'GAITANA';
            document.getElementById('ap-centrozonal').textContent = document.getElementById('acta-centrozonal').value||'NEIVA';
            document.getElementById('ap-modalidad').textContent = document.getElementById('acta-modalidad').value||'HCB';
            document.getElementById('ap-servicio').textContent = document.getElementById('acta-servicio').value||'COMUNITARIO';
            document.getElementById('ap-municipio').textContent = document.getElementById('acta-municipio').value||'NEIVA';
            document.getElementById('ap-responsable').textContent = document.getElementById('acta-responsable').value||'';
            document.getElementById('ap-telefono').textContent = document.getElementById('acta-telefono').value||'';
            document.getElementById('ap-entidad').textContent = document.getElementById('acta-entidad').value||'';
            document.getElementById('ap-unidad').textContent = document.getElementById('acta-unidad').value||'';
            document.getElementById('ap-codigo').textContent = document.getElementById('acta-codigo').value||'';
            document.getElementById('acta-obs-print').textContent = document.getElementById('acta-observaciones').value||'';

            // Fecha fija del formato (NO se actualiza con la fecha actual)
            var fechaDoc = '27/04/2026';
            document.getElementById('acta-print-fecha-doc').textContent = fechaDoc;

            var fs = document.getElementById('acta-fecha-solicitud').value;
            var fechaFmt = fs ? new Date(fs+'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

            var items = getActaDatos();
            var tbody = document.getElementById('acta-body-rows');
            tbody.innerHTML = '';
            var numFilas = Math.max(items.length, 10);

            for (var i=0; i<numFilas; i++) {
                var item = items[i] || null;
                var rowBg = (i%2===0) ? '#ffffff' : '#e2efda';
                var tr = document.createElement('tr');
                tr.style.background = rowBg;

                var compVal   = item ? item.componente.replace(/"/g,'&quot;') : '';
                var nombVal   = item ? item.nombre.replace(/"/g,'&quot;') : '';
                var cantVal   = item ? item.cantSolicitada : '';
                var numOrden  = i+1;

                var html = '';
                html += '<td class="acta-col-num" style="text-align:center;background:'+rowBg+';">'+numOrden+'</td>';
                html += '<td class="acta-col-fecha" style="background:'+rowBg+';"><input class="acta-input" type="text" value="'+(item?fechaFmt:'')+'" placeholder="dd/mm/aaaa"></td>';
                html += '<td class="acta-col-comp acta-green"><input class="acta-input" type="text" style="background:transparent;" value="'+compVal+'" placeholder="Componente..."></td>';
                html += '<td class="acta-col-alim" style="background:'+rowBg+';"><input class="acta-input" type="text" value="'+nombVal+'" placeholder="Alimento..."></td>';
                html += '<td class="acta-col-lote" style="background:'+rowBg+';"><input class="acta-input" type="text" placeholder="Lote"></td>';
                html += '<td class="acta-col-venc" style="background:'+rowBg+';"><input class="acta-input" type="text" placeholder="dd/mm/aaaa"></td>';
                html += '<td class="acta-col-cant acta-green"><input class="acta-input" type="text" style="background:transparent;" value="'+cantVal+'" placeholder="Cant. solicitada"></td>';
                html += '<td class="acta-col-fecha2" style="background:'+rowBg+';"><input class="acta-input" type="text" placeholder="dd/mm/aaaa"></td>';
                html += '<td class="acta-col-recib acta-green"><input class="acta-input" type="text" style="background:transparent;" value="'+cantVal+'" placeholder="Cant. recibida"></td>';
                html += '<td class="acta-col-cumple" style="text-align:center;background:'+rowBg+';"><input class="acta-input" type="text" style="text-align:center;" placeholder="&#10003;"></td>';
                html += '<td style="text-align:center;background:'+rowBg+';width:45px;"><input class="acta-input" type="text" style="text-align:center;"></td>';
                html += '<td style="text-align:center;background:'+rowBg+';width:45px;"><input class="acta-input" type="text" style="text-align:center;"></td>';
                html += '<td style="text-align:center;background:'+rowBg+';width:45px;"><input class="acta-input" type="text" style="text-align:center;"></td>';
                tr.innerHTML = html;
                tbody.appendChild(tr);
            }

            document.getElementById('acta-print-area').style.display = 'block';
            showToast('Vista previa generada. Puede editar los campos antes de exportar.','success');
            document.getElementById('acta-print-area').scrollIntoView({behavior:'smooth',block:'start'});
        }


		// Cerrar con ESC — gestionado por modal JS abajo


        // =============================================
        // TEMPLATE XLSX BASE64 (formato original ICBF)
        // =============================================
        var ACTA_TEMPLATE_B64 = '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';

        // Plantilla VERTICAL (oficio) del acta F3.MT1.PP - formato aportado por el usuario,
        // con los tamaños de celda/columna exactos de ese archivo. Se usa cuando la
        // configuración de formato de acta tiene orientacion='vertical'.
        var ACTA_TEMPLATE_VERTICAL_B64 = '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';

        // =============================================
        // DIRECTORIO STATE
        // =============================================
        var directorioUDS = [];

        // =============================================
        // MODAL ACTA (individual)
        // =============================================
        function abrirModalActa(fuente) {
            fuente = fuente || 'semanal';
            document.getElementById('acta-modal-fuente-val').value = fuente;
            document.getElementById('acta-modal-fuente-badge').textContent = fuente === 'mensual' ? 'Lista Mensual' : 'Lista Semanal';
            try {
                var statusMod = document.getElementById('statusModalidad');
                if (statusMod) {
                    var txt = statusMod.textContent.replace(/[^A-Za-z]/g,'').toUpperCase();
                    if (txt) document.getElementById('am-modalidad').value = txt;
                }
            } catch(e) {}
            // Sincronizar modo de leche y yogurt desde el panel principal
            try {
                var srcId = fuente === 'mensual' ? 'leche-modo-mensual' : 'leche-modo-semanal';
                var srcEl = document.getElementById(srcId);
                var dstEl = document.getElementById('am-leche-modo');
                if (srcEl && dstEl) dstEl.value = srcEl.value;
                var srcYId = fuente === 'mensual' ? 'yogurt-modo-mensual' : 'yogurt-modo-semanal';
                var srcYEl = document.getElementById(srcYId);
                var dstYEl = document.getElementById('am-yogurt-modo');
                if (srcYEl && dstYEl) dstYEl.value = srcYEl.value;
            } catch(e) {}
            document.getElementById('acta-modal-overlay').style.display = 'block';
            document.getElementById('acta-modal-panel').style.display = 'block';
            document.body.style.overflow = 'hidden';
            setTimeout(function(){ var el=document.getElementById('am-responsable'); if(el) el.focus(); }, 120);
        }

        function cerrarModalActa() {
            document.getElementById('acta-modal-overlay').style.display = 'none';
            document.getElementById('acta-modal-panel').style.display = 'none';
            document.body.style.overflow = '';
        }

        function generarActaDesdeModal() {
            var fuente = document.getElementById('acta-modal-fuente-val').value;
            var coberturaVal = document.getElementById('am-cobertura') ? parseInt(document.getElementById('am-cobertura').value) || 0 : 0;
            var lecheModo = document.getElementById('am-leche-modo') ? document.getElementById('am-leche-modo').value : 'ml';
            var yogurtModo = document.getElementById('am-yogurt-modo') ? document.getElementById('am-yogurt-modo').value : 'und150';
            var items = obtenerItemsActa(fuente, coberturaVal > 0 ? coberturaVal : null, lecheModo, yogurtModo);
            var params = {
                responsable:    document.getElementById('am-responsable').value,
                telefono:       document.getElementById('am-telefono').value,
                entidad:        document.getElementById('am-entidad').value,
                unidad:         document.getElementById('am-unidad').value,
                codigo:         document.getElementById('am-codigo').value,
                fechaSolicitud: document.getElementById('am-fecha-solicitud').value,
                municipio:      document.getElementById('am-municipio').value,
                centrozonal:    document.getElementById('am-centrozonal').value,
                modalidad:      document.getElementById('am-modalidad').value,
                servicio:       document.getElementById('am-servicio').value,
                observaciones:  document.getElementById('am-observaciones').value,
                regional:       (window.currentRegional||'neiva') === 'neiva' ? 'NEIVA' : 'GAITANA',
                entregaNombre:  document.getElementById('am-entrega-nombre') ? document.getElementById('am-entrega-nombre').value : '',
                entregaDoc:     document.getElementById('am-entrega-doc') ? document.getElementById('am-entrega-doc').value : '',
                entregaEntidad: document.getElementById('am-entrega-entidad') ? document.getElementById('am-entrega-entidad').value : '',
                entregaNit:     document.getElementById('am-entrega-nit') ? document.getElementById('am-entrega-nit').value : '',
                recibeNombre:   document.getElementById('am-responsable') ? document.getElementById('am-responsable').value : '',
                recibeDoc:      ''
            };
            cerrarModalActa();
            generarActaExcelXML(items, params, null);
        }

        // =============================================
        // OBTENER ITEMS DE LISTA GENERADA
        // =============================================
        function formatLecheConModo(mlTotal, lecheModo) {
            if (!lecheModo || lecheModo === 'ml') return Math.round(mlTotal) + ' ml';
            if (lecheModo === 'litros') return Math.round(mlTotal / 1000) + ' L';
            if (lecheModo === 'bolsas900') return Math.ceil(mlTotal / 900) + ' bolsa(s) 900ml';
            return Math.round(mlTotal) + ' ml';
        }

        // yogurtTotal: total en unidades de 150cc (como vienen en los datos)
        // yogurtModo: 'und150' (unidades de 150ml) | 'litros' (litros enteros)
        function formatYogurtConModo(yogurtTotal, yogurtModo) {
            if (!yogurtModo || yogurtModo === 'und150') return Math.ceil(yogurtTotal) + ' und 150ml';
            if (yogurtModo === 'litros') return Math.round(yogurtTotal * 0.15) + ' L';
            return Math.ceil(yogurtTotal) + ' und 150ml';
        }

        // Categorías que ajustan cantidad según cobertura del directorio.
        // Granos, frutas y verduras usan gramaje completo sin importar los cupos.
        var CATS_CON_COBERTURA = { 'lacteos': true, 'proteinas': true, 'panaderia': true };

        function obtenerItemsActa(fuente, coberturaOverride, lecheModo, yogurtModo) {
            lecheModo = lecheModo || 'ml';
            yogurtModo = yogurtModo || 'und150';
            var items = [];
            if (fuente === 'semanal' && currentData) {
                var sorted = Object.entries(currentData).sort(function(a,b){
                    return (ORDER_CATEGORIES[a[1].c]||99)-(ORDER_CATEGORIES[b[1].c]||99);
                });
                sorted.forEach(function(entry) {
                    var name = entry[0]; var item = entry[1];
                    // Solo incluir productos de categorías activas (filtros aplicados)
                    if (activeFilters && !activeFilters.has(item.c)) return;
                    // Solo recalcular por cobertura en lácteos, proteínas y panadería
                    var aplicarCobertura = coberturaOverride && CATS_CON_COBERTURA[item.c];
                    var qTotal = aplicarCobertura ? calcularQTotalConCobertura(item, fuente, name, coberturaOverride) : item.qTotal;
                    var esLeche = name.toLowerCase().trim() === 'leche';
                    var esYogurt = name.toLowerCase().trim() === 'yogurt';
                    var cantSugerida = esLeche ? formatLecheConModo(qTotal, lecheModo) : (esYogurt ? formatYogurtConModo(qTotal, yogurtModo) : redondearComercial(qTotal, item.u, name));
                    var idRef = currentRegional + '_' + name.replace(/\s/g,'');
                    var entregaRaw = localStorage.getItem(ENTREGA_KEY_PREFIX + idRef);
                    var cantRecibida;
                    if (entregaRaw && entregaRaw.trim()) {
                        if (aplicarCobertura) {
                            // Recalcular el valor de entrega digitado según la cobertura del directorio
                            var entregaRecalc = recalcularEntregaConCobertura(entregaRaw.trim(), item, name, coberturaOverride, esLeche, lecheModo, esYogurt, yogurtModo);
                            cantRecibida = entregaRecalc || entregaRaw.trim();
                        } else {
                            cantRecibida = entregaRaw.trim();
                        }
                    } else {
                        cantRecibida = cantSugerida;
                    }
                    items.push({
                        componente: CAT_LABEL[item.c]||item.c,
                        nombre: name,
                        cantSolicitada: cantSugerida,
                        cantRecibida: cantRecibida,
                        cantEntregaDigitada: (entregaRaw && entregaRaw.trim()) ? cantRecibida : ''
                    });
                });
            } else if (fuente === 'mensual' && monthlyData) {
                var sorted2 = Object.entries(monthlyData).sort(function(a,b){
                    return (ORDER_CATEGORIES[a[1].c]||99)-(ORDER_CATEGORIES[b[1].c]||99);
                });
                sorted2.forEach(function(entry) {
                    var name = entry[0]; var item = entry[1];
                    // Solo incluir productos de categorías activas
                    if (monthlyActiveFilters && !monthlyActiveFilters.has(item.c)) return;
                    // Solo recalcular por cobertura en lácteos, proteínas y panadería
                    var aplicarCoberturaMens = coberturaOverride && CATS_CON_COBERTURA[item.c];
                    var total = Object.values(item.weeks||{}).reduce(function(s,w){ return s+(w.qTotal||0); },0);
                    if (aplicarCoberturaMens) {
                        total = calcularQTotalMensualConCobertura(item, coberturaOverride);
                    }
                    var esLeche = name.toLowerCase().trim() === 'leche';
                    var esYogurt = name.toLowerCase().trim() === 'yogurt';
                    var cantStr = esLeche ? formatLecheConModo(total, lecheModo) : (esYogurt ? formatYogurtConModo(total, yogurtModo) : redondearComercial(total, item.u, name));
                    var idBase = currentRegional + '_monthly_' + name.replace(/\s/g,'');
                    var totalEntrega = 0; var hasEntrega = false;
                    // Determinar cobertura original (número de niños de la lista base) para el recálculo proporcional
                    Object.keys(item.weeks||{}).forEach(function(wk) {
                        var rawWk = localStorage.getItem(ENTREGA_KEY_PREFIX + idBase + '_w' + wk) || '';
                        if (rawWk) {
                            var v = parseFloat(rawWk);
                            if (!isNaN(v) && v > 0) { totalEntrega += v; hasEntrega = true; }
                        }
                    });
                    var cantRecibida;
                    if (hasEntrega) {
                        if (aplicarCoberturaMens && total > 0) {
                            // Recalcular proporcionalmente: factorUsuario * nuevoTotalConCobertura
                            var factorUsuarioMensual = totalEntrega / total;
                            var totalNuevoMensual = calcularQTotalMensualConCobertura(item, coberturaOverride);
                            var totalEntregaRecalc = factorUsuarioMensual * totalNuevoMensual;
                            cantRecibida = esLeche ? formatLecheConModo(totalEntregaRecalc, lecheModo) : (esYogurt ? formatYogurtConModo(totalEntregaRecalc, yogurtModo) : redondearComercial(totalEntregaRecalc, item.u, name));
                        } else {
                            cantRecibida = esLeche ? formatLecheConModo(totalEntrega, lecheModo) : (esYogurt ? formatYogurtConModo(totalEntrega, yogurtModo) : redondearComercial(totalEntrega, item.u, name));
                        }
                    } else {
                        cantRecibida = cantStr;
                    }
                    items.push({
                        componente: CAT_LABEL[item.c]||item.c,
                        nombre: name,
                        cantSolicitada: cantStr,
                        cantRecibida: cantRecibida,
                        cantEntregaDigitada: hasEntrega ? cantRecibida : ''
                    });
                });
            }
            return items;
        }

        // Extrae el número de un texto de entrega como "13 Und", "650 gr", "650", "1 Lb", "½ Lb"
        // Retorna el valor numérico o null si no se puede parsear
        function parsearNumeroEntrega(texto) {
            if (!texto) return null;
            var t = texto.trim();
            // Caso libras: "½ Lb" = 250g, "1 Lb" = 500g, "1 ½ Lb" = 750g, "2 Lb" = 1000g, etc.
            var mLb = t.match(/^(\d+)\s*½\s*[Ll]b$/);
            if (mLb) return parseInt(mLb[1]) * 500 + 250;
            if (/^½\s*[Ll]b$/i.test(t)) return 250;
            var mLibra = t.match(/^(\d+(?:\.\d+)?)\s*[Ll]b$/);
            if (mLibra) return parseFloat(mLibra[1]) * 500;
            // Número seguido de unidad: "13 Und", "650 gr", "1200 ml", o solo número: "13", "650"
            var mNum = t.match(/^([\d]+(?:[.,]\d+)?)/);
            if (mNum) return parseFloat(mNum[1].replace(',', '.'));
            return null;
        }

        // Convierte el valor digitado de entrega a ml (para leche) segun el modo activo.
        // Ej: en modo bolsas900, "13" = 13 bolsas = 13*900 ml = 11700 ml.
        function entregaToMlLeche(numEntrega, lecheModo) {
            if (!lecheModo || lecheModo === 'ml') return numEntrega;
            if (lecheModo === 'litros') return numEntrega * 1000;
            if (lecheModo === 'bolsas900') return numEntrega * 900;
            return numEntrega;
        }

        // Recalcula el valor de entrega digitado (texto libre) segun la cobertura del directorio.
        // Usa la proporcion: factorUsuario = entregaEnUnidadBase / qTotalOriginal
        // y aplica ese factor al nuevo qTotal calculado con la cobertura del directorio.
        function recalcularEntregaConCobertura(entregaRaw, item, name, cobertura, esLeche, lecheModo, esYogurt, yogurtModo) {
            var numEntrega = parsearNumeroEntrega(entregaRaw);
            if (numEntrega === null || numEntrega <= 0) return null;

            // Para leche: convertir el numero digitado a ml para comparar con item.qTotal (que siempre es ml)
            var numEntregaBase = esLeche ? entregaToMlLeche(numEntrega, lecheModo) : numEntrega;

            if (!item.qTotal || item.qTotal <= 0) return null;

            // Factor del usuario: que proporcion del total sugerido entrego
            // Si entrego igual al sugerido, factor = 1 → recalculo = nuevo qTotal completo
            var factorUsuario = numEntregaBase / item.qTotal;

            // Nuevo qTotal para la cobertura del directorio
            var qTotalNuevo;
            if (item.qIndividual && item.qIndividual > 0) {
                qTotalNuevo = item.qIndividual * cobertura;
            } else {
                qTotalNuevo = item.qTotal * cobertura / Math.max(1, cobertura);
            }

            var qRecalculado = factorUsuario * qTotalNuevo;

            if (esLeche) return formatLecheConModo(qRecalculado, lecheModo);
            if (esYogurt) return formatYogurtConModo(qRecalculado, yogurtModo);
            return redondearComercial(qRecalculado, item.u, name);
        }

        // Recalcula qTotal para un producto usando cobertura personalizada
        function calcularQTotalConCobertura(item, fuente, name, cobertura) {
            // Usar qIndividual (gramos por niño acumulados) si existe
            if (item.qIndividual && item.qIndividual > 0) {
                return item.qIndividual * cobertura;
            }
            if (item.grPorNino) return item.grPorNino * cobertura;
            // Fallback: proporcional
            return item.qTotal * cobertura / Math.max(1, item.ninos || cobertura);
        }

        function calcularQTotalMensualConCobertura(item, cobertura) {
            var total = 0;
            Object.values(item.weeks||{}).forEach(function(w) {
                if (w.qIndividual && w.qIndividual > 0) total += w.qIndividual * cobertura;
                else if (w.grPorNino) total += w.grPorNino * cobertura;
                else total += (w.qTotal || 0) * cobertura / Math.max(1, w.ninos || cobertura);
            });
            return total;
        }

        // =============================================
        // GENERADOR EXCEL USANDO TEMPLATE ORIGINAL (JSZip + XML)
        // =============================================
function construirActaSheetXML(sheetXmlOriginal, items, params, layoutCfg) {
            // Función pura: recibe una copia fresca del XML de la hoja plantilla (sheet1.xml)
            // y los datos de un acta (items + params), y devuelve el XML de la hoja ya
            // diligenciada. No toca el zip ni realiza descargas — así puede reutilizarse
            // tanto para generar actas individuales como para construir un libro unificado
            // con varias hojas (una por UDS) sin que la configuración de una afecte a la otra.
            //
            // layoutCfg (opcional) permite adaptar la función a distintas plantillas de
            // formato de acta:
            //   - dataRows: nº de filas de productos que trae la plantilla ANTES de clonar
            //               filas extra (6 en la plantilla horizontal, 7 en la vertical).
            //               Todas las secciones posteriores (separador, observaciones,
            //               firmas, pie) están, en ambas plantillas, desplazadas siempre
            //               los mismos "dataRows + N" renglones respecto al inicio.
            //   - marcarCumpleX: true escribe "X" en la columna CUMPLE; false la deja en blanco.
            //   - orientacion: 'horizontal' | 'vertical' — controla el pageSetup final.
            layoutCfg = layoutCfg || {};
            var TMPL_DATA_ROWS = layoutCfg.dataRows || 6;
            var marcarCumpleX = layoutCfg.marcarCumpleX !== false;
            var orientacionActa = layoutCfg.orientacion === 'vertical' ? 'vertical' : 'horizontal';
            var sheetXml = sheetXmlOriginal;

                // ── Eliminar validaciones de datos del template (listas desplegables no deseadas) ──
                // El template tiene una validacion extendida (x14:dataValidations) en la celda I12
                // con lista de genero (Femenino/Masculino/Intersexual) que no es necesaria.
                // Hay que eliminar tanto el bloque estandar como el extendido (x14:).
                sheetXml = sheetXml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/g, '');
                // Eliminar bloque extendido x14:dataValidations dentro de extLst
                sheetXml = sheetXml.replace(/<x14:dataValidations[\s\S]*?<\/x14:dataValidations>/g, '');
                // Limpiar extLst si quedo vacio
                sheetXml = sheetXml.replace(/<extLst>\s*<\/extLst>/g, '');
                sheetXml = sheetXml.replace(/<ext[^>]*>\s*<\/ext>/g, '');

                // ── XML escape helper ──────────────────────────────────────────
                function escXml(s) {
                    return String(s)
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
                        .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
                }

                // ── Safe cell writer (handles self-closing AND full tags) ───────
                function setCellInline(xml, cellRef, value) {
                    if (value === null || value === undefined || value === '') return xml;
                    var escaped = escXml(value);
                    var openTag = '<c r="' + cellRef + '"';
                    var si = xml.indexOf(openTag);
                    if (si === -1) return xml;
                    var gt = xml.indexOf('>', si);
                    if (gt === -1) return xml;
                    var ei = (xml[gt - 1] === '/') ? gt + 1 : (xml.indexOf('</c>', si) + 4);
                    if (ei < 4) return xml;
                    var tagStr = xml.substring(si, gt + 1);
                    var sm = tagStr.match(/\ss="(\d+)"/);
                    var sAttr = sm ? ' s="' + sm[1] + '"' : '';
                    var newCell = '<c r="' + cellRef + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' + escaped + '</t></is></c>';
                    return xml.substring(0, si) + newCell + xml.substring(ei);
                }

                // ── Cell writer that INSERTS if cell doesn't exist in row ──────
                function setCellOrInsert(xml, cellRef, value) {
                    if (value === null || value === undefined || value === '') return xml;
                    // Try normal update first
                    var openTag = '<c r="' + cellRef + '"';
                    if (xml.indexOf(openTag) !== -1) return setCellInline(xml, cellRef, value);
                    // Cell not found — parse col/row and insert into the row tag
                    var colMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
                    if (!colMatch) return xml;
                    var rowNum = colMatch[2];
                    var rowTag = '<row r="' + rowNum + '"';
                    var rowStart = xml.indexOf(rowTag);
                    if (rowStart === -1) return xml; // row itself missing, skip
                    var rowClose = xml.indexOf('</row>', rowStart);
                    if (rowClose === -1) return xml;
                    var escaped = escXml(value);
                    var newCell = '<c r="' + cellRef + '" t="inlineStr"><is><t xml:space="preserve">' + escaped + '</t></is></c>';
                    return xml.substring(0, rowClose) + newCell + xml.substring(rowClose);
                }

                // ── Safe numeric cell writer ───────────────────────────────────
                function setCellNum(xml, cellRef, num) {
                    var openTag = '<c r="' + cellRef + '"';
                    var si = xml.indexOf(openTag);
                    if (si === -1) return xml;
                    var gt = xml.indexOf('>', si);
                    if (gt === -1) return xml;
                    var ei = (xml[gt - 1] === '/') ? gt + 1 : (xml.indexOf('</c>', si) + 4);
                    if (ei < 4) return xml;
                    var tagStr = xml.substring(si, gt + 1);
                    var sm = tagStr.match(/\ss="(\d+)"/);
                    var sAttr = sm ? ' s="' + sm[1] + '"' : '';
                    var newCell = '<c r="' + cellRef + '"' + sAttr + '><v>' + num + '</v></c>';
                    return xml.substring(0, si) + newCell + xml.substring(ei);
                }

                // ── Date serial ────────────────────────────────────────────────
                function setCellDate(xml, cellRef, dateStr) {
                    if (!dateStr) return xml;
                    var p = dateStr.split('/');
                    if (p.length !== 3) return xml;
                    var serial = Math.round((new Date(+p[2], +p[1]-1, +p[0]) - new Date(1899,11,30)) / 86400000);
                    return setCellNum(xml, cellRef, serial);
                }

                // ── Format fecha solicitud ─────────────────────────────────────
                var fs = params.fechaSolicitud || '';
                var fechaFmt = '';
                if (fs) { var fp = fs.split('-'); if (fp.length === 3) fechaFmt = fp[2]+'/'+fp[1]+'/'+fp[0]; }
                var todayFmt = '27/04/2026'; // Fecha fija del formato (NO se actualiza con la fecha actual)

                // ── Fill header ────────────────────────────────────────────────
                sheetXml = setCellDate(sheetXml, 'N1', todayFmt);
                sheetXml = setCellInline(sheetXml, 'B4', params.regional    || 'NEIVA');
                sheetXml = setCellInline(sheetXml, 'D4', params.centrozonal || 'NEIVA');
                sheetXml = setCellInline(sheetXml, 'H4', params.modalidad   || 'HCB');
                sheetXml = setCellInline(sheetXml, 'J4', params.servicio    || 'COMUNITARIO');
                sheetXml = setCellInline(sheetXml, 'L4', params.municipio   || 'NEIVA');
                sheetXml = setCellInline(sheetXml, 'B5', params.responsable || '');
                sheetXml = setCellInline(sheetXml, 'E5', params.telefono    || '');
                sheetXml = setCellInline(sheetXml, 'I5', params.entidad     || '');
                sheetXml = setCellInline(sheetXml, 'K5', params.unidad      || '');
                sheetXml = setCellInline(sheetXml, 'M5', params.codigo      || '');

                // ── AutoFit columns for directory data (ajuste de página) ──────
                // Solo se aplica en la plantilla horizontal: la plantilla vertical trae
                // sus propios anchos de columna (los del archivo de formato aportado) y
                // deben respetarse tal cual, sin sobreescribirlos.
                if (orientacionActa !== 'vertical') {
                // Build a <cols> block that enables bestFit on key columns
                var colsBlock = '<cols>'
                    + '<col min="2" max="2" width="28" bestFit="1" customWidth="1"/>'  // B: Regional/Responsable
                    + '<col min="4" max="4" width="22" bestFit="1" customWidth="1"/>'  // D: CentroZonal
                    + '<col min="5" max="5" width="16" bestFit="1" customWidth="1"/>'  // E: Teléfono
                    + '<col min="7" max="7" width="18" bestFit="1" customWidth="1"/>'  // G: Cantidad
                    + '<col min="9" max="9" width="36" bestFit="1" customWidth="1"/>'  // I: Entidad (nombre largo)
                    + '<col min="11" max="11" width="30" bestFit="1" customWidth="1"/>' // K: Unidad Servicio
                    + '<col min="13" max="13" width="16" bestFit="1" customWidth="1"/>' // M: Código
                    + '</cols>';
                // Insert or replace existing <cols> block
                var colsStart = sheetXml.indexOf('<cols>');
                var colsEnd   = sheetXml.indexOf('</cols>');
                if (colsStart !== -1 && colsEnd !== -1) {
                    sheetXml = sheetXml.substring(0, colsStart) + colsBlock + sheetXml.substring(colsEnd + 7);
                } else {
                    // Insert before <sheetData>
                    var sdPos = sheetXml.indexOf('<sheetData>');
                    if (sdPos !== -1) {
                        sheetXml = sheetXml.substring(0, sdPos) + colsBlock + sheetXml.substring(sdPos);
                    }
                }
                }

                // ── Row shifting when items > TMPL_DATA_ROWS ────────────────────
                // Plantilla horizontal: filas de datos 7-12 (6 filas), separador 13, obs 14-15,
                //                       firmas 16-23, pie 24-28.
                // Plantilla vertical:   filas de datos 7-13 (7 filas), separador 14, obs 15-16,
                //                       firmas 17-24, pie 25-29.
                // En ambas plantillas todo lo posterior a los datos está desplazado siempre
                // "TMPL_DATA_ROWS + N" filas respecto al inicio, así que las constantes se
                // calculan a partir de TMPL_DATA_ROWS en vez de estar fijas en 6/12/13/etc.
                var lastBaseDataRow = TMPL_DATA_ROWS + 6;  // última fila de datos de la plantilla (12 ó 13)
                var rowSepBase      = TMPL_DATA_ROWS + 7;  // fila separadora justo después de los datos (13 ó 14)
                var nItems = items.length;
                var nRows  = Math.max(nItems, TMPL_DATA_ROWS);
                var nExtra = nRows - TMPL_DATA_ROWS; // rows to insert

                if (nExtra > 0) {
                    // Extract last base data row as clone template
                    var r12s = sheetXml.indexOf('<row r="' + lastBaseDataRow + '"');
                    var r12e = sheetXml.indexOf('</row>', r12s) + 6;
                    var row12tmpl = sheetXml.substring(r12s, r12e);

                    // Build cloned rows (lastBaseDataRow+1)..(lastBaseDataRow+nExtra)
                    var cloned = '';
                    for (var ex = 1; ex <= nExtra; ex++) {
                        var nr = lastBaseDataRow + ex;
                        var newRow = row12tmpl.split('r="' + lastBaseDataRow + '"').join('r="' + nr + '"');
                        'ABCDEFGHIJKLMN'.split('').forEach(function(col) {
                            newRow = newRow.split('r="' + col + lastBaseDataRow + '"').join('r="' + col + nr + '"');
                        });
                        cloned += newRow;
                    }

                    // Renumber all rows >= rowSepBase by +nExtra
                    // Process from the end to avoid double-replacement
                    // Find insertion point: just before the old separator row
                    var ins = sheetXml.indexOf('<row r="' + rowSepBase + '"');

                    // Shift rows rowSepBase..99 → renumber each one
                    var tail = sheetXml.substring(ins);
                    // Renumber row references: r="NN" and r="XNN"
                    // We go in descending order to avoid collision
                    for (var rn = 99; rn >= rowSepBase; rn--) {
                        // Row tag: <row r="NN"
                        tail = tail.split('<row r="' + rn + '"').join('<row r="' + (rn + nExtra) + '"');
                        // Cell refs: r="ANN" through r="NNN"
                        'ABCDEFGHIJKLMN'.split('').forEach(function(col) {
                            tail = tail.split('r="' + col + rn + '"').join('r="' + col + (rn + nExtra) + '"');
                        });
                    }

                    sheetXml = sheetXml.substring(0, ins) + cloned + tail;

                    // Update merge cells: shift all cell references with row >= rowSepBase
                    var mcStart = sheetXml.indexOf('<mergeCells');
                    var mcEnd   = sheetXml.indexOf('</mergeCells>') + 13;
                    if (mcStart !== -1) {
                        var mcBlock = sheetXml.substring(mcStart, mcEnd);
                        // Replace each cell ref that has row >= rowSepBase
                        mcBlock = mcBlock.replace(/([A-N])([0-9]+)/g, function(match, col, rowStr) {
                            var r = parseInt(rowStr);
                            return r >= rowSepBase ? col + (r + nExtra) : match;
                        });

                        // Add the CUMPLE (J:K) and NO CUMPLE (L:N) merges that every
                        // data row needs — the clone above only copies cell content,
                        // it does not create these merges for the new rows, which is
                        // what made the "CUMPLE" / "NO CUMPLE" boxes look descuadrado
                        // beyond row 12 (6 filas).
                        var newMerges = '';
                        for (var mx = 1; mx <= nExtra; mx++) {
                            var mrow = lastBaseDataRow + mx;
                            newMerges += '<mergeCell ref="J' + mrow + ':K' + mrow + '"/><mergeCell ref="L' + mrow + ':N' + mrow + '"/>';
                        }
                        mcBlock = mcBlock.replace('</mergeCells>', newMerges + '</mergeCells>');
                        mcBlock = mcBlock.replace(/count="(\d+)"/, function(m, cnt) {
                            return 'count="' + (parseInt(cnt) + nExtra * 2) + '"';
                        });

                        sheetXml = sheetXml.substring(0, mcStart) + mcBlock + sheetXml.substring(mcEnd);
                    }

                    // Update dataValidations: shift all sqRef row numbers >= rowSepBase
                    var dvStart = sheetXml.indexOf('<dataValidations');
                    var dvEnd   = sheetXml.indexOf('</dataValidations>');
                    if (dvStart !== -1 && dvEnd !== -1) {
                        dvEnd += 18; // length of '</dataValidations>'
                        var dvBlock = sheetXml.substring(dvStart, dvEnd);
                        dvBlock = dvBlock.replace(/([A-N])([0-9]+)/g, function(match, col, rowStr) {
                            var r = parseInt(rowStr);
                            return r >= rowSepBase ? col + (r + nExtra) : match;
                        });
                        // Also update sqRef attribute that may have ranges like "I12:I12"
                        // which are in the data rows (rows 7-12) — these should also shift
                        // if their row is exactly 12 (the last data row before cloning)
                        sheetXml = sheetXml.substring(0, dvStart) + dvBlock + sheetXml.substring(dvEnd);
                    }
                }

                // ── Fill data rows ─────────────────────────────────────────────
                var COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
                for (var i = 0; i < nRows; i++) {
                    var rn = 7 + i;
                    var item = i < items.length ? items[i] : null;

                    // Column A: No. orden
                    sheetXml = setCellNum(sheetXml, 'A' + rn, i + 1);

                    if (item) {
                        sheetXml = setCellInline(sheetXml, 'B' + rn, fechaFmt);
                        sheetXml = setCellInline(sheetXml, 'C' + rn, item.componente || '');
                        sheetXml = setCellInline(sheetXml, 'D' + rn, item.nombre     || '');
                        // E = Lote (blank), F = Fecha Venc (blank)
                        // G = CANTIDAD SOLICITADA: si hay entrega digitada usar esa, sino usar sugerida
                        var cantParaActa = (item.cantEntregaDigitada && item.cantEntregaDigitada.trim()) ? item.cantEntregaDigitada.trim() : item.cantSolicitada;
                        sheetXml = setCellInline(sheetXml, 'G' + rn, cantParaActa || '');
                        // H = Fecha Recepción (blank)
                        // I = CANTIDAD RECIBIDA: mismo valor que G
                        sheetXml = setCellInline(sheetXml, 'I' + rn, cantParaActa || '');
                        // J = Cumple → "X" si la config lo indica; si no, se deja en blanco
                        if (marcarCumpleX) sheetXml = setCellOrInsert(sheetXml, 'J' + rn, 'X');
                    }
                }

                // ── Observaciones ──────────────────────────────────────────────
                // Obs row is (TMPL_DATA_ROWS+8) + nExtra (merged A:N, dos filas)
                var obsRow = (TMPL_DATA_ROWS + 8) + nExtra;
                var obsText = 'OBSERVACIONES: ' + (params.observaciones || '');
                sheetXml = setCellInline(sheetXml, 'A' + obsRow, obsText);

                // ── Firmas / Datos de entrega ──────────────────────────────────
                // Template ICBF firma rows (offsets relativos a TMPL_DATA_ROWS, shifted by nExtra). Layout:
                //   Fila "Firma:___" (A:C merge) | "Firma:___" (G:H merge)
                //   r19: LABEL A:C | DATA VERDE → D:E  | LABEL G:H | DATA VERDE → I:J
                //   r20: LABEL A:C | DATA VERDE → D:E  | LABEL G:H | DATA VERDE → I:J
                //   r21: LABEL A:C | DATA VERDE → D:E
                //   r23: LABEL A   | DATA VERDE → B:C
                // Data goes into the GREEN cells (D/I/B), NOT into the label cells (A/G).
                var r19 = (TMPL_DATA_ROWS + 13) + nExtra;
                var r20 = (TMPL_DATA_ROWS + 14) + nExtra;
                var r21 = (TMPL_DATA_ROWS + 15) + nExtra;
                var r23 = (TMPL_DATA_ROWS + 17) + nExtra;
                if (params.entregaNombre)  sheetXml = setCellOrInsert(sheetXml, 'D' + r19, params.entregaNombre);
                if (params.recibeNombre)   sheetXml = setCellOrInsert(sheetXml, 'I' + r19, params.recibeNombre);
                if (params.entregaDoc)     sheetXml = setCellOrInsert(sheetXml, 'D' + r20, params.entregaDoc);
                if (params.recibeDoc)      sheetXml = setCellOrInsert(sheetXml, 'I' + r20, params.recibeDoc);
                if (params.entregaEntidad) sheetXml = setCellOrInsert(sheetXml, 'D' + r21, params.entregaEntidad);
                if (params.entregaNit)     sheetXml = setCellOrInsert(sheetXml, 'B' + r23, params.entregaNit);

                // ── Update dimension ───────────────────────────────────────────
                var lastDataRow = (TMPL_DATA_ROWS + 22) + nExtra;
                var newDim = 'ref="A1:N' + lastDataRow + '"';
                var dimS = sheetXml.indexOf('ref="A1:N');
                if (dimS !== -1) {
                    var dimE = sheetXml.indexOf('"', dimS + 9) + 1;
                    sheetXml = sheetXml.substring(0, dimS) + newDim + sheetXml.substring(dimE);
                }

                // ── Page setup: márgenes 0.2" todos los lados, centrado ─────
                var newMargins = '<pageMargins left="0.2" right="0.2" top="0.2" bottom="0.2" header="0.2" footer="0.2"/>';
                sheetXml = sheetXml.replace(/<pageMargins[^\/]*\/>/, newMargins);

                // printOptions: centrar horizontal y verticalmente en la página
                var printOpts = '<printOptions horizontalCentered="1" verticalCentered="1"/>';
                if (sheetXml.indexOf('<printOptions') === -1) {
                    // Insertar antes de <pageMargins>
                    sheetXml = sheetXml.replace('<pageMargins', printOpts + '<pageMargins');
                } else {
                    sheetXml = sheetXml.replace(/<printOptions[^\/]*\/>/, printOpts);
                }

                // pageSetup: A4 (paperSize=9). Horizontal → apaisado, ajustado a 1x1 página.
                // Vertical → oficio (retrato), con la escala fija de la plantilla aportada.
                var newPageSetup = (orientacionActa === 'vertical')
                    ? '<pageSetup paperSize="9" scale="40" orientation="portrait" r:id="rId1"/>'
                    : '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1" r:id="rId1"/>';
                sheetXml = sheetXml.replace(/<pageSetup[^\/]*\/>/, newPageSetup);

                // Habilitar/deshabilitar fitToPage en sheetProperties > pageSetUpPr
                // (horizontal usa "ajustar a 1x1"; vertical usa la escala fija de arriba)
                var fitToPageVal = (orientacionActa === 'vertical') ? '0' : '1';
                if (sheetXml.indexOf('pageSetUpPr') === -1) {
                    // Insertar sheetProperties antes de <sheetViews>
                    sheetXml = sheetXml.replace(/<sheetViews>/, '<sheetProperties><pageSetUpPr fitToPage="' + fitToPageVal + '"/></sheetProperties><sheetViews>');
                } else {
                    sheetXml = sheetXml.replace(/fitToPage="[^"]*"/, 'fitToPage="' + fitToPageVal + '"');
                }

            return sheetXml;
        }

        // =============================================
        // HELPERS DE ESTILO: color de autocompletado y tamaño de letra
        // =============================================
        // Ambas funciones son "seguras": sólo tocan los estilos (cellXfs) realmente
        // usados en las filas base de productos (7..6+dataRows) de la plantilla,
        // clonándolos con la modificación deseada en vez de sobreescribir estilos
        // compartidos con otras zonas de la hoja (encabezado, título, etc.).

        function _extraerBloque(xml, tagAbre, tagCierra) {
            var s = xml.indexOf(tagAbre);
            if (s === -1) return null;
            var e = xml.indexOf(tagCierra, s);
            if (e === -1) return null;
            e += tagCierra.length;
            return { start: s, end: e, text: xml.substring(s, e) };
        }

        // Cambia el color de fondo de las celdas de las filas de productos (A..N,
        // filas 7..6+dataRows) al color hexadecimal indicado en layoutCfg.colorAutocompletado.
        function aplicarColorAutocompletado(stylesXml, sheetXmlOriginal, layoutCfg) {
            var dataRows = layoutCfg.dataRows || 6;
            var colorHex = (layoutCfg.colorAutocompletado || '#e3f0d9').replace('#', '').toUpperCase();
            if (!/^[0-9A-F]{6}$/.test(colorHex)) colorHex = 'E3F0D9';

            var xfsBloque = _extraerBloque(stylesXml, '<cellXfs', '</cellXfs>');
            var fillsBloque = _extraerBloque(stylesXml, '<fills', '</fills>');
            if (!xfsBloque || !fillsBloque) return { stylesXml: stylesXml, sheetXml: sheetXmlOriginal };

            var xfEntries = xfsBloque.text.match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [];
            var fillsCountMatch = fillsBloque.text.match(/<fills count="(\d+)"/);
            var fillsCount = fillsCountMatch ? parseInt(fillsCountMatch[1]) : 0;

            // 1. Nuevo fill sólido con el color elegido
            var newFillId = fillsCount;
            var newFillXml = '<fill><patternFill patternType="solid"><fgColor rgb="FF' + colorHex + '"/><bgColor indexed="64"/></patternFill></fill>';
            var fillsInner = fillsBloque.text.replace(/^<fills[^>]*>/, '').replace(/<\/fills>$/, '');
            var newFillsBlock = '<fills count="' + (fillsCount + 1) + '">' + fillsInner + newFillXml + '</fills>';
            stylesXml = stylesXml.substring(0, fillsBloque.start) + newFillsBlock + stylesXml.substring(fillsBloque.end);
            // El bloque de cellXfs puede haberse desplazado si fills aparece antes; volvemos a localizarlo
            xfsBloque = _extraerBloque(stylesXml, '<cellXfs', '</cellXfs>');
            xfEntries = xfsBloque.text.match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [];

            // 2. Detectar los estilos (s=) usados en las filas de productos
            var idMap = {};
            var nuevos = [];
            var nextIdx = xfEntries.length;
            for (var r = 7; r <= 6 + dataRows; r++) {
                var rowRe = new RegExp('<row r="' + r + '"[^>]*>([\\s\\S]*?)</row>');
                var rowM = sheetXmlOriginal.match(rowRe);
                if (!rowM) continue;
                var cellRe = /<c r="[A-N]\d+" s="(\d+)"/g, cm;
                while ((cm = cellRe.exec(rowM[1]))) {
                    var oldId = cm[1];
                    if (idMap[oldId] === undefined) {
                        var origXf = xfEntries[parseInt(oldId)];
                        if (!origXf) continue;
                        var clonado = origXf;
                        if (/fillId="\d+"/.test(clonado)) {
                            clonado = clonado.replace(/fillId="\d+"/, 'fillId="' + newFillId + '"');
                        } else {
                            clonado = clonado.replace('<xf ', '<xf fillId="' + newFillId + '" ');
                        }
                        if (!/applyFill="1"/.test(clonado)) {
                            clonado = clonado.replace('<xf ', '<xf applyFill="1" ');
                        }
                        nuevos.push(clonado);
                        idMap[oldId] = nextIdx;
                        nextIdx++;
                    }
                }
            }

            if (nuevos.length) {
                var xfsInner = xfsBloque.text.replace(/^<cellXfs[^>]*>/, '').replace(/<\/cellXfs>$/, '');
                var newCount = xfEntries.length + nuevos.length;
                var newXfsBlock = '<cellXfs count="' + newCount + '">' + xfsInner + nuevos.join('') + '</cellXfs>';
                stylesXml = stylesXml.substring(0, xfsBloque.start) + newXfsBlock + stylesXml.substring(xfsBloque.end);
            }

            // 3. Reescribir únicamente las celdas de las filas base de productos con el nuevo id de estilo
            var sheetXml = sheetXmlOriginal;
            for (var r2 = 7; r2 <= 6 + dataRows; r2++) {
                Object.keys(idMap).forEach(function(oldId) {
                    var re2 = new RegExp('(<c r="[A-N]' + r2 + '" s=")' + oldId + '(")', 'g');
                    sheetXml = sheetXml.replace(re2, '$1' + idMap[oldId] + '$2');
                });
            }

            return { stylesXml: stylesXml, sheetXml: sheetXml };
        }

        // Cambia el tamaño de letra de las fuentes usadas específicamente en las
        // filas de productos (no toca títulos ni encabezados que compartan otros fontId).
        function aplicarTamanoFuenteAutocompletado(stylesXml, sheetXmlOriginal, layoutCfg) {
            var dataRows = layoutCfg.dataRows || 6;
            var fontSize = tamanoFuenteEfectivo(layoutCfg);

            var xfsBloque = _extraerBloque(stylesXml, '<cellXfs', '</cellXfs>');
            var fontsBloque = _extraerBloque(stylesXml, '<fonts', '</fonts>');
            if (!xfsBloque || !fontsBloque) return stylesXml;

            var xfEntries = xfsBloque.text.match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [];
            var fontEntries = fontsBloque.text.match(/<font>[\s\S]*?<\/font>/g) || [];

            var fontIds = {};
            for (var r = 7; r <= 6 + dataRows; r++) {
                var rowRe = new RegExp('<row r="' + r + '"[^>]*>([\\s\\S]*?)</row>');
                var rowM = sheetXmlOriginal.match(rowRe);
                if (!rowM) continue;
                var cellRe = /<c r="[A-N]\d+" s="(\d+)"/g, cm;
                while ((cm = cellRe.exec(rowM[1]))) {
                    var xf = xfEntries[parseInt(cm[1])];
                    if (!xf) continue;
                    var fm = xf.match(/fontId="(\d+)"/);
                    if (fm) fontIds[fm[1]] = true;
                }
            }

            var cambiado = false;
            Object.keys(fontIds).forEach(function(fid) {
                var idx = parseInt(fid);
                if (fontEntries[idx] && /<sz val="[\d.]+"\s*\/>/.test(fontEntries[idx])) {
                    fontEntries[idx] = fontEntries[idx].replace(/<sz val="[\d.]+"\s*\/>/, '<sz val="' + fontSize + '"/>');
                    cambiado = true;
                }
            });

            if (cambiado) {
                var fontsInner = fontsBloque.text.replace(/^<fonts[^>]*>/, '<fonts count="' + fontEntries.length + '">').replace(/<\/fonts>$/, '');
                var newFontsBlock = fontsInner === fontsBloque.text ? fontEntries.join('') : fontsInner.replace(/^(<fonts count="\d+"[^>]*>)/, '$1') ;
                // Reconstrucción simple y robusta: preservar atributos originales de <fonts ...>
                var fontsOpenTagMatch = fontsBloque.text.match(/^<fonts[^>]*>/);
                var fontsOpenTag = fontsOpenTagMatch ? fontsOpenTagMatch[0] : '<fonts count="' + fontEntries.length + '">';
                fontsOpenTag = fontsOpenTag.replace(/count="\d+"/, 'count="' + fontEntries.length + '"');
                var rebuilt = fontsOpenTag + fontEntries.join('') + '</fonts>';
                stylesXml = stylesXml.substring(0, fontsBloque.start) + rebuilt + stylesXml.substring(fontsBloque.end);
            }

            return stylesXml;
        }

        // Decodifica la plantilla correcta (horizontal/vertical) según la config, y
        // devuelve el zip JSZip ya cargado + el sheetXml original de esa plantilla.
        async function cargarPlantillaActa(cfg) {
            var b64 = (cfg.orientacion === 'vertical') ? ACTA_TEMPLATE_VERTICAL_B64 : ACTA_TEMPLATE_B64;
            var binaryStr = atob(b64);
            var bytes = new Uint8Array(binaryStr.length);
            for (var i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            var zip = await JSZip.loadAsync(bytes.buffer);
            var sheetXmlOriginal = await zip.file('xl/worksheets/sheet1.xml').async('string');
            return { zip: zip, sheetXmlOriginal: sheetXmlOriginal };
        }

        // Aplica a un zip+sheetXml ya cargados los parches de estilo (color, tamaño
        // de letra, wrapText) según la config de formato de acta, y devuelve el
        // sheetXml patcheado (el zip se modifica in-place con el styles.xml final)
        // junto con el layoutCfg listo para pasar a construirActaSheetXML.
        async function prepararEstiloActa(zip, sheetXmlOriginal, cfg) {
            var layoutCfg = {
                dataRows: filasBaseSegunOrientacion(cfg),
                marcarCumpleX: cfg.marcarCumpleX !== false,
                orientacion: cfg.orientacion === 'vertical' ? 'vertical' : 'horizontal',
                colorAutocompletado: cfg.colorAutocompletado,
                tamanoFuenteAuto: cfg.tamanoFuenteAuto
            };
            var sheetXml = sheetXmlOriginal;
            try {
                var stylesXml = await zip.file('xl/styles.xml').async('string');

                // Color de fondo de las celdas de productos
                var resColor = aplicarColorAutocompletado(stylesXml, sheetXml, layoutCfg);
                stylesXml = resColor.stylesXml;
                sheetXml = resColor.sheetXml;

                // Tamaño de letra de las celdas de productos
                stylesXml = aplicarTamanoFuenteAutocompletado(stylesXml, sheetXml, layoutCfg);

                // Habilitar wrapText en las alineaciones existentes
                stylesXml = stylesXml.replace(/<alignment([^/]*?)\/>/g, function(m, attrs) {
                    if (attrs.indexOf('wrapText') === -1) return '<alignment' + attrs + ' wrapText="1"/>';
                    return m;
                });

                zip.file('xl/styles.xml', stylesXml);
            } catch (styleErr) {
                console.warn('No se pudo parchear styles.xml:', styleErr);
            }
            return { sheetXml: sheetXml, layoutCfg: layoutCfg };
        }

        async function generarActaExcelXML(items, params, nombreArchivo) {
            if (!window.JSZip) {
                showToast('JSZip no disponible. Recarga la página.', 'error');
                return;
            }

            try {
                var cfg = cargarConfigActaFormato();

                // Decode template (horizontal u vertical, según configuración)
                var plantilla = await cargarPlantillaActa(cfg);
                var zip = plantilla.zip;

                // ── Patch styles.xml: color de autocompletado, tamaño de letra, wrapText ──
                var prep = await prepararEstiloActa(zip, plantilla.sheetXmlOriginal, cfg);

                var sheetXml = construirActaSheetXML(prep.sheetXml, items, params, prep.layoutCfg);


                // ── Write & download ───────────────────────────────────────────
                zip.file('xl/worksheets/sheet1.xml', sheetXml);

                var blob = await zip.generateAsync({
                    type: 'blob',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    compression: 'DEFLATE'
                });

                var today2 = new Date();
                var dateStr = today2.getFullYear() + '-' + String(today2.getMonth()+1).padStart(2,'0') + '-' + String(today2.getDate()).padStart(2,'0');
                var safeName = (params.unidad || params.responsable || 'Acta')
                    .replace(/[^a-zA-Z0-9À-ɏ _-]/g, '').trim().substring(0, 30);
                var filename = nombreArchivo || ('Acta_F3MT1PP_' + (params.regional||'') + '_' + safeName + '_' + dateStr + '.xlsx');

                var url = URL.createObjectURL(blob);
                var a2 = document.createElement('a');
                a2.href = url; a2.download = filename; a2.click();
                setTimeout(function() { URL.revokeObjectURL(url); }, 3000);

                if (typeof showToast === 'function') showToast('✅ Acta generada: ' + filename, 'success');
                return blob;

            } catch(err) {
                console.error('Error generando acta:', err);
                if (typeof showToast === 'function') showToast('❌ Error: ' + err.message, 'error');
                throw err;
            }
        }

        // =============================================
        // UNIFICAR ACTAS (un solo archivo .xlsx, una hoja por UDS)
        // =============================================
        // Esta función es completamente independiente de generarActaExcelXML /
        // construirActaSheetXML en cuanto a configuración: usa la MISMA lógica de
        // diligenciamiento por hoja (construirActaSheetXML) pero arma un único
        // libro con varias hojas, sin afectar ni ser afectada por la generación
        // de actas separadas o por las generadas de forma individual desde el
        // directorio.
        //
        // listaUDS: [{ items: [...], params: {...} }, ...] — uno por cada UDS.
        // opts.nombreArchivo: nombre opcional del archivo final.
        async function generarActaUnificada(listaUDS, opts) {
            opts = opts || {};
            if (!window.JSZip) {
                showToast('JSZip no disponible. Recarga la página.', 'error');
                return;
            }
            if (!listaUDS || listaUDS.length === 0) {
                showToast('No hay UDS para unificar', 'warning');
                return;
            }

            function escXmlAttr(s) {
                return String(s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
            }

            try {
                var cfg = cargarConfigActaFormato();

                // Decode template (independiente de cualquier zip usado para actas separadas)
                var plantilla = await cargarPlantillaActa(cfg);
                var zip = plantilla.zip;

                var sheetXmlOriginal = plantilla.sheetXmlOriginal;
                var sheetRels = await zip.file('xl/worksheets/_rels/sheet1.xml.rels').async('string');
                var workbookXml = await zip.file('xl/workbook.xml').async('string');
                var workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
                var contentTypes = await zip.file('[Content_Types].xml').async('string');
                var appXml = await zip.file('docProps/app.xml').async('string');

                // ── Patch styles.xml una sola vez para todo el libro (mismo ajuste visual que las actas separadas) ──
                var prep = await prepararEstiloActa(zip, sheetXmlOriginal, cfg);
                sheetXmlOriginal = prep.sheetXml;
                var layoutCfg = prep.layoutCfg;

                // ── Generar nombres de hoja únicos y válidos para Excel (máx 31 car., sin \/?*[]:) ──
                var usedNames = {};
                function nombreHojaPara(params, idx) {
                    var base = String(params.unidad || params.responsable || ('Acta ' + (idx + 1)));
                    base = base.replace(/[\\/\?\*\[\]:]/g, '').trim();
                    if (!base) base = 'Acta ' + (idx + 1);
                    base = base.substring(0, 31);
                    var name = base, n = 2;
                    while (usedNames[name]) {
                        var suffix = ' (' + n + ')';
                        name = base.substring(0, Math.max(0, 31 - suffix.length)) + suffix;
                        n++;
                    }
                    usedNames[name] = true;
                    return name;
                }

                // ── Hoja 1: se reutiliza sheet1.xml (misma relación rId1 ya existente) ──
                var primerNombre = nombreHojaPara(listaUDS[0].params, 0);
                var sheetXml0 = construirActaSheetXML(sheetXmlOriginal, listaUDS[0].items, listaUDS[0].params, layoutCfg);
                zip.file('xl/worksheets/sheet1.xml', sheetXml0);

                var nombresHojas = [primerNombre];
                var nuevosSheetTags = '';
                var nuevosRelTags = '';
                var nuevosContentTypeTags = '';
                var nextSheetIdNum = 200; // IDs internos altos para no chocar con sheetId 7 (hoja1) y 5 (Hoja1 oculta)

                for (var idx = 1; idx < listaUDS.length; idx++) {
                    var uds = listaUDS[idx];
                    var filledXml = construirActaSheetXML(sheetXmlOriginal, uds.items, uds.params, layoutCfg);
                    var fileName = 'sheetActa' + idx + '.xml';
                    var rId = 'rIdActa' + idx;
                    var sheetIdNum = nextSheetIdNum++;
                    var nombreHoja = nombreHojaPara(uds.params, idx);
                    nombresHojas.push(nombreHoja);

                    zip.file('xl/worksheets/' + fileName, filledXml);
                    zip.file('xl/worksheets/_rels/' + fileName + '.rels', sheetRels);

                    nuevosSheetTags += '<sheet name="' + escXmlAttr(nombreHoja) + '" sheetId="' + sheetIdNum + '" r:id="' + rId + '"/>';
                    nuevosRelTags += '<Relationship Id="' + rId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/' + fileName + '"/>';
                    nuevosContentTypeTags += '<Override PartName="/xl/worksheets/' + fileName + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
                }

                // ── workbook.xml: renombrar la primera hoja e insertar las nuevas justo después ──
                var sheet1TagRegex = /<sheet name="[^"]*" sheetId="7" r:id="rId1"\/>/;
                var sheet1TagNuevo = '<sheet name="' + escXmlAttr(primerNombre) + '" sheetId="7" r:id="rId1"/>';
                workbookXml = workbookXml.replace(sheet1TagRegex, sheet1TagNuevo + nuevosSheetTags);

                workbookRels = workbookRels.replace('</Relationships>', nuevosRelTags + '</Relationships>');
                contentTypes = contentTypes.replace('</Types>', nuevosContentTypeTags + '</Types>');

                // ── docProps/app.xml: actualizar conteo y títulos de hojas (incluye "Hoja1" oculta que ya existía) ──
                var todosLosTitulos = nombresHojas.concat(['Hoja1']);
                var titlesXml = todosLosTitulos.map(function(t) { return '<vt:lpstr>' + escXmlAttr(t) + '</vt:lpstr>'; }).join('');
                appXml = appXml.replace(
                    /<vt:vector size="\d+" baseType="variant">[\s\S]*?<\/vt:vector>/,
                    '<vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Hojas de c\u00e1lculo</vt:lpstr></vt:variant><vt:variant><vt:i4>' + todosLosTitulos.length + '</vt:i4></vt:variant></vt:vector>'
                );
                appXml = appXml.replace(
                    /<vt:vector size="\d+" baseType="lpstr">[\s\S]*?<\/vt:vector>/,
                    '<vt:vector size="' + todosLosTitulos.length + '" baseType="lpstr">' + titlesXml + '</vt:vector>'
                );

                zip.file('xl/workbook.xml', workbookXml);
                zip.file('xl/_rels/workbook.xml.rels', workbookRels);
                zip.file('[Content_Types].xml', contentTypes);
                zip.file('docProps/app.xml', appXml);

                var blob = await zip.generateAsync({
                    type: 'blob',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    compression: 'DEFLATE'
                });

                var today2 = new Date();
                var dateStr = today2.getFullYear() + '-' + String(today2.getMonth() + 1).padStart(2, '0') + '-' + String(today2.getDate()).padStart(2, '0');
                var filename = opts.nombreArchivo || ('Actas_Unificadas_' + dateStr + '.xlsx');

                var url = URL.createObjectURL(blob);
                var a2 = document.createElement('a');
                a2.href = url; a2.download = filename; a2.click();
                setTimeout(function() { URL.revokeObjectURL(url); }, 3000);

                if (typeof showToast === 'function') showToast('✅ Archivo unificado generado: ' + filename + ' (' + listaUDS.length + ' hojas)', 'success');
                return blob;

            } catch (err) {
                console.error('Error generando acta unificada:', err);
                if (typeof showToast === 'function') showToast('❌ Error al unificar: ' + err.message, 'error');
                throw err;
            }
        }

        function generarActaExcelDirecto() {
            var fuente = document.getElementById('acta-fuente') ? document.getElementById('acta-fuente').value : 'semanal';
            abrirModalActa(fuente);
        }
        function exportarActaExcel() { generarActaExcelDirecto(); }

        // =============================================
        // DIRECTORIO SISTEMA
        // =============================================
        function abrirDirectorio() {
            cerrarModalActa();
            document.getElementById('directorio-overlay').style.display = 'block';
            document.getElementById('directorio-panel').style.display = 'block';
            document.body.style.overflow = 'hidden';
            // Pre-fill fecha with today
            var hoy = new Date();
            var df = document.getElementById('dir-fecha');
            if (df && !df.value) {
                df.value = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
            }
            // Pre-fill fuente
            var dirFuente = document.getElementById('dir-fuente');
            if (dirFuente) {
                var hasSemanal = (typeof currentData !== "undefined" && currentData && Object.keys(currentData).length > 0);
                var hasMensual = (typeof monthlyData !== "undefined" && monthlyData && Object.keys(monthlyData).length > 0);
                if (hasMensual && !hasSemanal) dirFuente.value = 'mensual';
                else dirFuente.value = 'semanal';
            }
            renderizarDirectorio();
        }

        function cerrarDirectorio() {
            document.getElementById('directorio-overlay').style.display = 'none';
            document.getElementById('directorio-panel').style.display = 'none';
            document.body.style.overflow = '';
        }

        function abrirEditorManual() {
            var el = document.getElementById('dir-editor-manual');
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        function agregarUDSManual() {
            var resp = document.getElementById('man-responsable').value.trim();
            if (!resp) { showToast('El nombre del responsable es requerido','warning'); return; }
            directorioUDS.push({
                responsable: resp,
                telefono:    document.getElementById('man-telefono').value.trim(),
                entidad:     document.getElementById('man-entidad').value.trim(),
                unidad:      document.getElementById('man-unidad').value.trim(),
                codigo:      document.getElementById('man-codigo').value.trim(),
                documentoId: document.getElementById('man-documentoId').value.trim(),
                cobertura:   parseInt(document.getElementById('man-cobertura').value) || 0
            });
            // Clear fields
            ['man-responsable','man-telefono','man-entidad','man-unidad','man-codigo','man-documentoId','man-cobertura'].forEach(function(id){
                document.getElementById(id).value = '';
            });
            renderizarDirectorio();
            showToast('UDS agregada al directorio','success');
        }

        // ─── MÓDULO: Directorio UDS ──
        async function limpiarDirectorio() {
            try {
                await mostrarConfirm('Se eliminarán TODAS las UDS del directorio. Esta acción no se puede deshacer.', {
                    titulo: '¿Limpiar directorio?', icono: '📂', btnOk: 'Sí, limpiar todo'
                });
            } catch { return; }
            directorioUDS = [];
            renderizarDirectorio();
        }

        async function eliminarUDS(idx) {
            try {
                await mostrarConfirm('Se eliminará esta UDS del directorio.', {
                    titulo: '¿Eliminar UDS?', icono: '🗑️', btnOk: 'Sí, eliminar'
                });
            } catch { return; }
            directorioUDS.splice(idx, 1);
            renderizarDirectorio();
        }

        function renderizarDirectorio() {
            var count = directorioUDS.length;
            document.getElementById('dir-count').textContent = count;
            document.getElementById('dir-count-btn').textContent = count;
            if (document.getElementById('dir-count-btn-uni')) document.getElementById('dir-count-btn-uni').textContent = count;
            
            var empty = document.getElementById('dir-empty-state');
            var preview = document.getElementById('dir-preview-container');
            
            if (count === 0) {
                empty.style.display = 'block';
                preview.style.display = 'none';
                return;
            }
            empty.style.display = 'none';
            preview.style.display = 'block';
            
            var tbody = document.getElementById('dir-preview-body');
            tbody.innerHTML = directorioUDS.map(function(uds, i) {
                var cobStr = uds.cobertura > 0 ? '<span style="background:rgba(16,185,129,0.15);color:#10b981;border-radius:0.25rem;padding:0.1rem 0.35rem;font-size:0.65rem;font-weight:700;">' + uds.cobertura + ' niños</span>' : '<span style="color:var(--text-secondary);font-size:0.7rem;">—</span>';
                return '<tr style="border-bottom:1px solid var(--border);">' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-secondary);">' + (i+1) + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-primary);font-weight:500;">' + escHtml(uds.responsable) + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-secondary);">' + escHtml(uds.telefono||'—') + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-secondary);">' + escHtml(uds.unidad||'—') + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-secondary);">' + escHtml(uds.codigo||'—') + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;color:var(--text-secondary);font-size:0.7rem;">' + escHtml(uds.documentoId||'—') + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;text-align:center;">' + cobStr + '</td>' +
                    '<td style="padding:0.4rem 0.6rem;text-align:center;">' +
                        '<button onclick="generarActaIndividual(' + i + ')" style="padding:0.2rem 0.5rem;' +
                            'background:rgba(5,150,105,0.12);border:1px solid rgba(5,150,105,0.3);' +
                            'color:#10b981;border-radius:0.3rem;cursor:pointer;font-size:0.7rem;margin-right:0.25rem;">📥 Excel</button>' +
                        '<button onclick="event.stopPropagation();eliminarUDS(' + i + ')" style="padding:0.2rem 0.5rem;' +
                            'background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);' +
                            'color:#ef4444;border-radius:0.3rem;cursor:pointer;font-size:0.7rem;">✕</button>' +
                    '</td></tr>';
            }).join('');
        }

        function escHtml(str) {
            return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function importarDirectorio(input) {
            var file = input.files[0];
            if (!file) return;
            
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'csv') {
                var reader = new FileReader();
                reader.onload = function(e) {
                    parsearCSVDirectorio(e.target.result);
                };
                reader.readAsText(file, 'UTF-8');
            } else if (ext === 'xlsx' || ext === 'xls') {
                var reader2 = new FileReader();
                reader2.onload = function(e) {
                    try {
                        var wb = XLSX.read(e.target.result, {type:'array'});
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        var csv = XLSX.utils.sheet_to_csv(ws);
                        parsearCSVDirectorio(csv);
                    } catch(err) {
                        showToast('Error leyendo Excel: ' + err.message, 'error');
                    }
                };
                reader2.readAsArrayBuffer(file);
            }
        }

        function parsearCSVDirectorio(csvText) {
            var lines = csvText.split('\n').filter(function(l){ return l.trim(); });
            if (lines.length < 2) { showToast('CSV vacío o inválido','error'); return; }

            // Auto-detect separator: semicolon or comma
            var firstLine = lines[0];
            var sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

            // Normalize header: strip accents, lowercase, alphanumeric only
            function normHead(h) {
                return h.trim().toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                    .replace(/[^a-z0-9]/g,'');
            }

            var rawHeader = firstLine.split(sep).map(function(h){ return h.trim().replace(/^"|"$/g,''); });
            var header = rawHeader.map(normHead);

            var colMap = { resp:-1, tel:-1, ent:-1, uni:-1, cod:-1, cob:-1, doc:-1 };
            header.forEach(function(h, i) {
                // IMPORTANT: check documento/cedula BEFORE entidad to avoid false match
                // e.g. 'documentoidentidad' contains 'entidad' — must detect as doc, not ent
                if (h.includes('responsable') || h.includes('nombre')) colMap.resp = i;
                else if (h.includes('telefono') || h.includes('tel') || h.includes('phone') || h.includes('celular')) colMap.tel = i;
                else if (h.includes('documento') || h.includes('cedula') || h.includes('identificacion') || h.includes('docidentidad') || h === 'documentoidentidad' || h.includes('docid')) colMap.doc = i;
                else if (h === 'entidad' || h.includes('prestador') || (h.includes('entidad') && !h.includes('doc'))) colMap.ent = i;
                else if (h.includes('unidad') || h.includes('servicio')) colMap.uni = i;
                else if (h.includes('codigo') || h.includes('cuentame') || h === 'cod' || h === 'id' || h.includes('codigouds')) colMap.cod = i;
                else if (h.includes('cobertura') || h.includes('ninos') || h.includes('cupos') || h.includes('cantidad')) colMap.cob = i;
            });

            // Fallback: fixed order Responsable,Teléfono,Entidad,Unidad,Código,Cobertura,Documento
            if (colMap.resp === -1) { colMap.resp=0; colMap.tel=1; colMap.ent=2; colMap.uni=3; colMap.cod=4; colMap.cob=5; colMap.doc=6; }
            // Extra fallback: if doc still not found, try last column
            if (colMap.doc === -1 && header.length >= 7) colMap.doc = header.length - 1;

            var newUDS = [];
            for (var i=1; i<lines.length; i++) {
                var cols = lines[i].split(sep).map(function(c){ return c.trim().replace(/^"|"$/g,'').trim(); });
                if (!cols[colMap.resp]) continue;
                newUDS.push({
                    responsable:  cols[colMap.resp] || '',
                    telefono:     cols[colMap.tel]  || '',
                    entidad:      cols[colMap.ent]  || '',
                    unidad:       cols[colMap.uni]  || '',
                    codigo:       colMap.cod >= 0 && cols[colMap.cod] ? cols[colMap.cod] : '',
                    cobertura:    colMap.cob >= 0 ? (parseInt(cols[colMap.cob]) || 0) : 0,
                    documentoId:  colMap.doc >= 0 ? (cols[colMap.doc] || '') : ''
                });
            }

            // Deduplicación
            var existingKeys = directorioUDS.map(function(u){ return u.responsable + '|' + u.unidad; });
            var sinDuplicados = newUDS.filter(function(u){ return !existingKeys.includes(u.responsable + '|' + u.unidad); });
            var duplicados = newUDS.length - sinDuplicados.length;

            directorioUDS = directorioUDS.concat(sinDuplicados);
            renderizarDirectorio();
            // Also update tab view if visible
            if (document.getElementById('section-directorio') && document.getElementById('section-directorio').classList.contains('active')) tabRenderizarDirectorio();
            var msg = sinDuplicados.length + ' UDS importadas';
            if (duplicados > 0) msg += ' (' + duplicados + ' duplicadas ignoradas)';
            showToast(msg, 'success');
            document.getElementById('dir-file-input').value = '';
        }

        function descargarPlantillaDirectorio() {
            try {
                var wb = XLSX.utils.book_new();                
                // Hoja de datos
                var data = [
                    ['Responsable', 'Teléfono', 'Entidad', 'Unidad', 'Código', 'Cobertura', 'Documento Identidad'],
                    ['María García López', '3101234567', 'ICBF Regional Huila', 'HCB Girasoles',  '410001', 13, 'CC 51234567'],
                    ['Ana Lucía Torres',   '3209876543', 'Asoc. Madres ICBF',   'HCB Las Palmas', '410003', 11, 'CC 41098765']
                ];
                var ws = XLSX.utils.aoa_to_sheet(data);
                ws['!cols'] = [{wch:30},{wch:15},{wch:30},{wch:25},{wch:12},{wch:12},{wch:22}];
                XLSX.utils.book_append_sheet(wb, ws, 'Directorio');
                XLSX.writeFile(wb, 'Plantilla_Directorio_UDS.xlsx');
                showToast('✅ Plantilla descargada. Diligénciela y súbala con el botón "Subir CSV/Excel"', 'success');
            } catch(e) {
                showToast('Error generando plantilla: ' + e.message, 'error');
            }
        }

        function cargarDirectorioEjemplo() {
            directorioUDS = [
                { responsable:'María García López',    telefono:'3101234567', entidad:'ICBF Regional Huila', unidad:'HCB Girasoles',    codigo:'410001', documentoId:'CC 51234567',  cobertura:13 },
                { responsable:'Ana Lucía Torres',      telefono:'3209876543', entidad:'Asoc. Madres ICBF',   unidad:'HCB Las Palmas',   codigo:'410003', documentoId:'CC 41098765',  cobertura:11 }
            ]
            renderizarDirectorio();
            showToast('5 UDS de ejemplo cargadas','success');
        }

        function getParamsFijos() {
            return {
                regional:       document.getElementById('dir-regional').value    || 'NEIVA',
                centrozonal:    document.getElementById('dir-centrozonal').value || 'NEIVA',
                modalidad:      document.getElementById('dir-modalidad').value   || 'HCB',
                servicio:       document.getElementById('dir-servicio').value    || 'COMUNITARIO',
                municipio:      document.getElementById('dir-municipio').value   || 'NEIVA',
                fechaSolicitud: document.getElementById('dir-fecha').value       || '',
                entregaNombre:  document.getElementById('dir-entrega-nombre')  ? document.getElementById('dir-entrega-nombre').value  : '',
                entregaDoc:     document.getElementById('dir-entrega-doc')     ? document.getElementById('dir-entrega-doc').value     : '',
                entregaEntidad: document.getElementById('dir-entrega-entidad') ? document.getElementById('dir-entrega-entidad').value : '',
                entregaNit:     document.getElementById('dir-entrega-nit')     ? document.getElementById('dir-entrega-nit').value     : ''
            };
        }

        async function generarActaIndividual(idx) {
            var uds = directorioUDS[idx];
            var fuente = document.getElementById('dir-fuente').value || 'semanal';
            var coberturaUDS = uds.cobertura && uds.cobertura > 0 ? uds.cobertura : null;
            var lecheModo = document.getElementById('dir-leche-modo') ? document.getElementById('dir-leche-modo').value : 'ml';
            var yogurtModo = document.getElementById('dir-yogurt-modo') ? document.getElementById('dir-yogurt-modo').value : 'und150';
            var items = obtenerItemsActa(fuente, coberturaUDS, lecheModo, yogurtModo);
            // Añadir datos de quien recibe desde el directorio
            uds.recibeNombre = uds.responsable || '';
            uds.recibeDoc    = uds.documentoId  || '';
            if (items.length === 0) {
                showToast('No hay productos en la lista generada. Genere primero la lista semanal/mensual.','warning');
                return;
            }
            var fijos = getParamsFijos();
            var params = Object.assign({}, fijos, uds);
            params.observaciones = '';
            await generarActaExcelXML(items, params, null);
        }

        async function generarTodasLasActas() {
            if (directorioUDS.length === 0) { showToast('Directorio vacío','warning'); return; }
            var fuente = document.getElementById('dir-fuente').value || 'semanal';
            var lecheModo = document.getElementById('dir-leche-modo') ? document.getElementById('dir-leche-modo').value : 'ml';
            var yogurtModo = document.getElementById('dir-yogurt-modo') ? document.getElementById('dir-yogurt-modo').value : 'und150';
            // Check if any item would exist with current filters
            var itemsTest = obtenerItemsActa(fuente, null, lecheModo, yogurtModo);
            if (itemsTest.length === 0) {
                showToast('No hay productos. Genere primero la lista ' + fuente + '.','warning');
                return;
            }
            var fijos = getParamsFijos();
            showToast('Generando ' + directorioUDS.length + ' actas...', 'success');
            
            for (var i=0; i<directorioUDS.length; i++) {
                var uds = directorioUDS[i];
                var coberturaUDS = uds.cobertura && uds.cobertura > 0 ? uds.cobertura : null;
                var items = obtenerItemsActa(fuente, coberturaUDS, lecheModo);
                var params = Object.assign({}, fijos, uds, {observaciones:'', recibeNombre: uds.responsable||'', recibeDoc: uds.documentoId||''});
                try {
                    var items = obtenerItemsActa(fuente, coberturaUDS, lecheModo, yogurtModo);
                    await generarActaExcelXML(items, params, null);
                    await new Promise(function(r){ setTimeout(r, 600); });
                } catch(e) {
                    showToast('Error en UDS ' + (i+1) + ': ' + e.message, 'error');
                }
            }
            showToast('✅ ' + directorioUDS.length + ' actas generadas exitosamente', 'success');
        }

        // Igual que generarTodasLasActas() pero exporta UN SOLO archivo .xlsx con
        // una hoja por UDS, en lugar de descargar un archivo por cada una.
        // No comparte estado con generarTodasLasActas: arma su propia lista de
        // items/params y llama a generarActaUnificada.
        async function generarDirectorioUnificado() {
            if (directorioUDS.length === 0) { showToast('Directorio vacío','warning'); return; }
            var fuente = document.getElementById('dir-fuente').value || 'semanal';
            var lecheModo = document.getElementById('dir-leche-modo') ? document.getElementById('dir-leche-modo').value : 'ml';
            var yogurtModo = document.getElementById('dir-yogurt-modo') ? document.getElementById('dir-yogurt-modo').value : 'und150';
            var itemsTest = obtenerItemsActa(fuente, null, lecheModo, yogurtModo);
            if (itemsTest.length === 0) {
                showToast('No hay productos. Genere primero la lista ' + fuente + '.','warning');
                return;
            }
            var fijos = getParamsFijos();
            showToast('Unificando ' + directorioUDS.length + ' actas en un solo archivo...', 'success');

            var listaUDS = [];
            for (var i = 0; i < directorioUDS.length; i++) {
                var uds = directorioUDS[i];
                var coberturaUDS = uds.cobertura && uds.cobertura > 0 ? uds.cobertura : null;
                var items = obtenerItemsActa(fuente, coberturaUDS, lecheModo, yogurtModo);
                var params = Object.assign({}, fijos, uds, {observaciones:'', recibeNombre: uds.responsable||'', recibeDoc: uds.documentoId||''});
                listaUDS.push({ items: items, params: params });
            }
            try {
                await generarActaUnificada(listaUDS);
            } catch(e) {
                showToast('Error al unificar actas: ' + e.message, 'error');
            }
        }

        // ESC closes all modals
        
        // ── Atajo Ctrl+S / Cmd+S para guardar en Firebase (Editor de Gramajes) ──
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const editorSection = document.getElementById('section-editor');
                if (editorSection && editorSection.classList.contains('active')) {
                    e.preventDefault();
                    if (typeof guardarCambiosFirebase === 'function') {
                        guardarCambiosFirebase();
                        showToast('💾 Guardando en Firebase...', 'info');
                    }
                }
            }
        });

document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                cerrarModalActa();
                cerrarDirectorio();
            }
        });

        // =============================================
        // TAB DIRECTORIO — Pestaña completa
        // =============================================
        
        // Toggle plegable paneles del directorio
        function toggleDirPanel(panelId, chevronId) {
            var panel = document.getElementById(panelId);
            var chevron = document.getElementById(chevronId);
            if (!panel) return;
            var isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : '';
            if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
        }

        var TAB_DIR_STORAGE_KEY = 'directorios_guardados_v1'; // base key, se sobreescribe con UID al iniciar sesión
        var PROVEEDORES_STORAGE_KEY = 'proveedores_lista_v1'; // base key, se sobreescribe con UID al iniciar sesión
        var SAVED_LISTS_STORAGE_KEY = 'smartMenu_savedLists'; // base key, se sobreescribe con UID al iniciar sesión
        var ENTREGA_KEY_PREFIX = 'entrega_'; // base prefix, se sobreescribe con UID al iniciar sesión
        var _currentUserUID = null; // UID del usuario activo

        function setDirStorageKeyForUser(uid) {
            _currentUserUID = uid;
            TAB_DIR_STORAGE_KEY = 'directorios_guardados_v1_' + uid;
            PROVEEDORES_STORAGE_KEY = 'proveedores_lista_v1_' + uid;
            SAVED_LISTS_STORAGE_KEY = 'smartMenu_savedLists_' + uid;
            ENTREGA_KEY_PREFIX = 'entrega_' + uid + '_';
        }

        function resetStorageKeysToAnon() {
            _currentUserUID = null;
            TAB_DIR_STORAGE_KEY = 'directorios_guardados_v1';
            PROVEEDORES_STORAGE_KEY = 'proveedores_lista_v1';
            SAVED_LISTS_STORAGE_KEY = 'smartMenu_savedLists';
            ENTREGA_KEY_PREFIX = 'entrega_';
        }

        function tabGetParamsFijos() {
            return {
                regional:       document.getElementById('tab-dir-regional').value    || 'NEIVA',
                centrozonal:    document.getElementById('tab-dir-centrozonal').value || 'NEIVA',
                modalidad:      document.getElementById('tab-dir-modalidad').value   || 'HCB',
                servicio:       document.getElementById('tab-dir-servicio').value    || 'COMUNITARIO',
                municipio:      document.getElementById('tab-dir-municipio').value   || 'NEIVA',
                fechaSolicitud: document.getElementById('tab-dir-fecha').value       || '',
                entregaNombre:  document.getElementById('tab-dir-entrega-nombre').value  || '',
                entregaDoc:     document.getElementById('tab-dir-entrega-doc').value     || '',
                entregaEntidad: document.getElementById('tab-dir-entrega-entidad').value || '',
                entregaNit:     document.getElementById('tab-dir-entrega-nit').value     || '',
                fuente:         document.getElementById('tab-dir-fuente').value          || 'semanal',
                lecheModo:      document.getElementById('tab-dir-leche-modo').value      || 'ml',
                yogurtModo:     document.getElementById('tab-dir-yogurt-modo') ? document.getElementById('tab-dir-yogurt-modo').value : 'und150'
            };
        }

        function tabGetContextoSemana() {
            // Capture current selected days and week info
            var dias = Array.from(document.querySelectorAll('.d-ch:checked')).map(function(cb){ return parseInt(cb.value); });
            var semanaEl = document.querySelector('.week-selector-btn.active, [data-week].active');
            var semanaNum = semanaEl ? (semanaEl.dataset.week || '') : '';
            // Try to get week label from the UI
            var semanaLabel = '';
            var labelEl = document.getElementById('semana-label') || document.querySelector('.semana-label');
            if (labelEl) semanaLabel = labelEl.textContent;
            return { dias: dias, semanaNum: semanaNum, semanaLabel: semanaLabel };
        }

        // Captura la configuración con la que se generó (o se generaría) el listado
        // semanal de "Generar Listado de Mercado": regional/modalidad/operador activos
        // en la app, semana, niños (cobertura) y días marcados.
        function tabGetConfigGeneracionSemanal() {
            var semEl = document.getElementById('sem');
            var ninosEl = document.getElementById('num-p');
            var lecheEl = document.getElementById('leche-modo-semanal');
            var yogurtEl = document.getElementById('yogurt-modo-semanal');
            return {
                regional:  (typeof currentRegional !== 'undefined') ? currentRegional : '',
                modalidad: (typeof currentModalidad !== 'undefined') ? currentModalidad : '',
                operador:  (typeof currentOperador !== 'undefined') ? currentOperador : null,
                semana:    semEl ? semEl.value : '1',
                ninos:     ninosEl ? ninosEl.value : '',
                dias:      Array.from(document.querySelectorAll('.d-ch:checked')).map(function(cb){ return parseInt(cb.value); }),
                lecheModoSemanal:  lecheEl ? lecheEl.value : '',
                yogurtModoSemanal: yogurtEl ? yogurtEl.value : ''
            };
        }

        // Toma una "foto" de los valores digitados en la columna "Entrega" del
        // listado semanal generado (persistidos normalmente en localStorage de forma
        // global) para que queden atados a este directorio específico.
        function tabGetGramajesEntrega() {
            var out = {};
            var prefix = ENTREGA_KEY_PREFIX + ((typeof currentRegional !== 'undefined') ? currentRegional : '') + '_';
            if (typeof currentData === 'object' && currentData && Object.keys(currentData).length) {
                Object.keys(currentData).forEach(function(name) {
                    var idRef = currentRegional + '_' + name.replace(/\s/g, '');
                    var v = localStorage.getItem(ENTREGA_KEY_PREFIX + idRef);
                    if (v) out[idRef] = v;
                });
            } else {
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (k && k.indexOf(prefix) === 0) out[k.substring(ENTREGA_KEY_PREFIX.length)] = localStorage.getItem(k);
                }
            }
            return out;
        }

        // Aplica de vuelta una configuración de generación semanal guardada: cambia
        // regional/modalidad/operador de la app, semana, niños y días marcados, y
        // restaura los valores de la columna "Entrega" en localStorage. No genera el
        // listado por sí sola (ver tabIrAGenerarSemanalDesdeDirectorio).
        function tabAplicarConfigSemanalGuardada(cfg, gramajesEntrega) {
            if (cfg) {
                if (cfg.regional && cfg.regional !== currentRegional) cambiarRegional(cfg.regional);
                if (cfg.modalidad && cfg.modalidad !== currentModalidad) cambiarModalidad(cfg.modalidad);
                if (cfg.operador) {
                    var opsDisponibles = regionales[currentRegional]?.modalidades?.[currentModalidad]?.operadores || {};
                    if (opsDisponibles[cfg.operador]) cambiarOperador(cfg.operador);
                }
                var semEl = document.getElementById('sem');
                if (semEl && cfg.semana) semEl.value = cfg.semana;
                var ninosEl = document.getElementById('num-p');
                if (ninosEl && cfg.ninos) ninosEl.value = cfg.ninos;
                if (Array.isArray(cfg.dias) && cfg.dias.length) {
                    document.querySelectorAll('.d-ch').forEach(function(cb) {
                        cb.checked = cfg.dias.indexOf(parseInt(cb.value)) !== -1;
                    });
                }
                var lecheEl = document.getElementById('leche-modo-semanal');
                if (lecheEl && cfg.lecheModoSemanal) lecheEl.value = cfg.lecheModoSemanal;
                var yogurtEl = document.getElementById('yogurt-modo-semanal');
                if (yogurtEl && cfg.yogurtModoSemanal) yogurtEl.value = cfg.yogurtModoSemanal;
            }
            if (gramajesEntrega) {
                Object.keys(gramajesEntrega).forEach(function(idRef) {
                    localStorage.setItem(ENTREGA_KEY_PREFIX + idRef, gramajesEntrega[idRef]);
                });
            }
        }

        function tabLoadDirectoriosGuardados() {
            try { return JSON.parse(localStorage.getItem(TAB_DIR_STORAGE_KEY) || '{}'); } catch(e) { return {}; }
        }

        function tabSaveDirectoriosGuardados(obj) {
            localStorage.setItem(TAB_DIR_STORAGE_KEY, JSON.stringify(obj));
            // Auto-sync to Firebase if user is logged in
            if (window.currentUser && window.firebaseDB) {
                try {
                    const uid = window.currentUser.uid;
                    const dirRef = window.firebaseRef(window.firebaseDB, 'user_dirs/' + uid);
                    window.firebaseSet(dirRef, obj || {});
                } catch(e) { /* silent */ }
            }
        }

        function tabRefreshSelect() {
            // Keep hidden select in sync (for compatibility)
            var dirs = tabLoadDirectoriosGuardados();
            var sel = document.getElementById('tab-dir-select');
            var current = sel.value;
            sel.innerHTML = '<option value="">— Seleccionar directorio —</option>';
            var ordenMeses = MESES_NOMBRES.concat(['Sin mes']);
            var porMes = {};
            Object.keys(dirs).forEach(function(name) {
                var d = dirs[name];
                var mes = d.mes || (function(){
                    var m = MESES_NOMBRES.find(function(mn){ return name.indexOf(mn) !== -1; });
                    return m || 'Sin mes';
                })();
                if (!porMes[mes]) porMes[mes] = [];
                porMes[mes].push({ name: name, d: d });
            });
            var mesesOrdenados = Object.keys(porMes).sort(function(a,b){
                return ordenMeses.indexOf(a) - ordenMeses.indexOf(b);
            });
            mesesOrdenados.forEach(function(mes) {
                var group = document.createElement('optgroup');
                group.label = mes;
                porMes[mes].forEach(function(item) {
                    var opt = document.createElement('option');
                    opt.value = item.name;
                    opt.textContent = item.name;
                    group.appendChild(opt);
                });
                sel.appendChild(group);
            });
            if (current && dirs[current]) sel.value = current;
        }

        function tabAbrirPanelCarpetas() {
            var dirs = tabLoadDirectoriosGuardados();
            var names = Object.keys(dirs);

            var ordenMeses = MESES_NOMBRES.concat(['Sin mes']);

            // ─── Árbol: Mes ➡️ Contrato ➡️ Semanas ───
            var arbol = {};
            names.forEach(function(name) {
                var d = dirs[name];
                var mes = d.mes || (function(){
                    var m = MESES_NOMBRES.find(function(mn){ return name.indexOf(mn) !== -1; });
                    return m || 'Sin mes';
                })();
                var contrato = (d.contrato || '').trim() || 'Sin contrato';
                if (!arbol[mes]) arbol[mes] = {};
                if (!arbol[mes][contrato]) arbol[mes][contrato] = [];
                arbol[mes][contrato].push({ name: name, d: d });
            });

            var mesesOrdenados = Object.keys(arbol).sort(function(a,b){
                return ordenMeses.indexOf(a) - ordenMeses.indexOf(b);
            });

            var bodyHtml = '';
            var idSeq = 0;
            if (names.length === 0) {
                bodyHtml = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);font-size:0.85rem;">No hay directorios guardados</div>';
            } else {
                mesesOrdenados.forEach(function(mes) {
                    var contratos = arbol[mes];
                    var contratoKeys = Object.keys(contratos).sort(function(a,b){ return a.localeCompare(b); });
                    var mesId = 'cpm-' + (idSeq++);

                    bodyHtml += '<div style="margin-bottom:0.4rem;">';
                    // Carpeta de MES (abierta por defecto)
                    bodyHtml += '<div class="cp-toggle" data-toggle="' + mesId + '" style="display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0.3rem;cursor:pointer;border-radius:0.35rem;user-select:none;">';
                    bodyHtml += '<span class="cp-chevron" id="chev-' + mesId + '" style="font-size:0.6rem;color:var(--text-secondary);display:inline-block;transition:transform 0.15s;transform:rotate(90deg);">&#9654;</span>';
                    bodyHtml += '<span style="font-size:1rem;">&#128197;</span>';
                    bodyHtml += '<span style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;flex:1;">' + escHtml(mes) + '</span>';
                    bodyHtml += '<span style="font-size:0.6rem;color:var(--text-secondary);background:var(--bg-dark);padding:0.1rem 0.45rem;border-radius:1rem;flex-shrink:0;">' + contratoKeys.length + ' contrato' + (contratoKeys.length===1?'':'s') + '</span>';
                    bodyHtml += '</div>';

                    bodyHtml += '<div id="' + mesId + '" style="padding-left:0.9rem;border-left:1px dashed var(--border);margin-left:0.6rem;">';

                    contratoKeys.forEach(function(contrato) {
                        var entries = contratos[contrato].slice().sort(function(a,b){
                            var sa = parseInt((a.d.semana||'').replace(/\D/g,''), 10) || 0;
                            var sb = parseInt((b.d.semana||'').replace(/\D/g,''), 10) || 0;
                            return sa - sb;
                        });
                        var contId = 'cpc-' + (idSeq++);

                        bodyHtml += '<div style="margin-bottom:0.2rem;">';
                        // Carpeta de CONTRATO (colapsada por defecto)
                        bodyHtml += '<div class="cp-toggle" data-toggle="' + contId + '" style="display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.4rem;cursor:pointer;border-radius:0.35rem;user-select:none;">';
                        bodyHtml += '<span class="cp-chevron" id="chev-' + contId + '" style="font-size:0.58rem;color:var(--text-secondary);display:inline-block;transition:transform 0.15s;">&#9654;</span>';
                        bodyHtml += '<span style="font-size:0.95rem;">&#128193;</span>';
                        bodyHtml += '<span style="font-size:0.78rem;font-weight:600;color:var(--text-primary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Contrato ' + escHtml(contrato) + '</span>';
                        bodyHtml += '<span style="font-size:0.58rem;color:var(--text-secondary);background:var(--bg-dark);padding:0.1rem 0.4rem;border-radius:1rem;flex-shrink:0;">' + entries.length + '</span>';
                        bodyHtml += '</div>';

                        bodyHtml += '<div id="' + contId + '" style="display:none;padding-left:0.9rem;border-left:1px dashed var(--border);margin-left:0.6rem;">';

                        entries.forEach(function(item) {
                            var info = item.d.uds ? (item.d.uds.length + ' UDS') : '';
                            var fechaMeta = item.d.fecha ? new Date(item.d.fecha).toLocaleDateString('es-CO', {day:'2-digit',month:'short'}) : '';
                            var meta = [fechaMeta, info].filter(Boolean).join(' · ');
                            var nameEsc = escHtml(item.name);
                            var semanaLabel = escHtml(item.d.semana || item.name);
                            // Use data-name attribute to avoid JS injection in onclick
                            bodyHtml += '<div class="cp-item" data-name="' + nameEsc + '" style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.55rem;border-radius:0.4rem;cursor:pointer;border:1px solid transparent;transition:background 0.15s;">';
                            bodyHtml += '<span style="font-size:0.9rem;flex-shrink:0;">&#128196;</span>';
                            bodyHtml += '<div style="flex:1;min-width:0;">';
                            bodyHtml += '<div style="font-size:0.76rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + semanaLabel + '</div>';
                            if (meta) bodyHtml += '<div style="font-size:0.62rem;color:var(--text-secondary);">' + escHtml(meta) + '</div>';
                            bodyHtml += '</div>';
                            bodyHtml += '<button class="cp-del" data-name="' + nameEsc + '" style="flex-shrink:0;padding:0.1rem 0.35rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;" title="Eliminar">&#x2715;</button>';
                            bodyHtml += '</div>';
                        });

                        bodyHtml += '</div></div>';
                    });

                    bodyHtml += '</div></div>';
                });
            }

            // Remove any existing panel
            cerrarPanelCarpetas();

            var overlay = document.createElement('div');
            overlay.id = 'panel-carpetas-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9998;backdrop-filter:blur(3px);';
            overlay.onclick = function(e){ if(e.target===overlay) cerrarPanelCarpetas(); };

            var panel = document.createElement('div');
            panel.id = 'panel-carpetas';
            panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-card);border:1px solid var(--border);border-radius:1rem;width:min(460px,94vw);max-height:80vh;display:flex;flex-direction:column;z-index:9999;box-shadow:0 25px 60px rgba(0,0,0,0.5);overflow:hidden;';

            var header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--border);flex-shrink:0;';
            header.innerHTML = '<div style="display:flex;align-items:center;gap:0.6rem;"><span style="font-size:1.2rem;">&#128194;</span><div><div style="font-weight:700;font-size:0.95rem;">Directorios Guardados</div><div style="font-size:0.65rem;color:var(--text-secondary);">' + names.length + ' directorio(s)</div></div></div><button id="cp-close-btn" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.2rem;line-height:1;padding:0.2rem 0.4rem;">&#x2715;</button>';

            var body = document.createElement('div');
            body.style.cssText = 'overflow-y:auto;padding:1rem 1.25rem;flex:1;';
            body.innerHTML = bodyHtml;

            panel.appendChild(header);
            panel.appendChild(body);
            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            // Event delegation: toggles de carpetas, clic en items y botones de eliminar
            body.addEventListener('click', function(e) {
                var toggleHeader = e.target.closest('.cp-toggle');
                if (toggleHeader) {
                    var targetId = toggleHeader.getAttribute('data-toggle');
                    var content = document.getElementById(targetId);
                    var chev = document.getElementById('chev-' + targetId);
                    if (content) {
                        var isOpen = content.style.display !== 'none';
                        content.style.display = isOpen ? 'none' : '';
                        if (chev) chev.style.transform = isOpen ? '' : 'rotate(90deg)';
                    }
                    return;
                }
                var delBtn = e.target.closest('.cp-del');
                if (delBtn) {
                    e.stopPropagation();
                    tabEliminarDesdePanel(delBtn.getAttribute('data-name'));
                    return;
                }
                var item = e.target.closest('.cp-item');
                if (item) {
                    tabCargarDesdePanel(item.getAttribute('data-name'));
                }
            });
            body.addEventListener('mouseover', function(e) {
                var item = e.target.closest('.cp-item');
                if (item) { item.style.background = 'var(--bg-hover)'; return; }
                var hdr = e.target.closest('.cp-toggle');
                if (hdr) hdr.style.background = 'var(--bg-hover)';
            });
            body.addEventListener('mouseout', function(e) {
                var item = e.target.closest('.cp-item');
                if (item) { item.style.background = ''; return; }
                var hdr = e.target.closest('.cp-toggle');
                if (hdr) hdr.style.background = '';
            });

            document.getElementById('cp-close-btn').onclick = cerrarPanelCarpetas;
        }

        function cerrarPanelCarpetas() {
            var ov = document.getElementById('panel-carpetas-overlay');
            var pn = document.getElementById('panel-carpetas');
            if (ov) ov.remove();
            if (pn) pn.remove();
        }

        function tabCargarDesdePanel(nombre) {
            // Set hidden select value and load
            var sel = document.getElementById('tab-dir-select');
            sel.value = nombre;
            cerrarPanelCarpetas();
            tabCargarDirectorioGuardado();
        }

        async function tabEliminarDesdePanel(nombre) {
            try {
                await mostrarConfirm('Se eliminará el directorio "' + nombre + '" de los guardados.', {
                    titulo: '¿Eliminar directorio?', icono: '📂', btnOk: 'Sí, eliminar'
                });
            } catch { return; }
            var dirs = tabLoadDirectoriosGuardados();
            delete dirs[nombre];
            tabSaveDirectoriosGuardados(dirs);
            tabRefreshSelect();
            // If it was the loaded one, clear label
            var lbl = document.getElementById('tab-dir-loaded-label');
            if (lbl && lbl.textContent.indexOf(nombre) !== -1) {
                lbl.style.display = 'none';
                document.getElementById('tab-dir-select').value = '';
                document.getElementById('tab-btn-save-modified').style.display = 'none';
            }
            cerrarPanelCarpetas();
            showToast('Directorio "' + nombre + '" eliminado', 'success');
            // Reopen to refresh
            tabAbrirPanelCarpetas();
        }

        async function tabEliminarDirectorioGuardadoActual() {
            var nombre = document.getElementById('tab-dir-select').value;
            if (!nombre) { showToast('No hay directorio cargado para eliminar','warning'); return; }
            try {
                await mostrarConfirm('Se eliminará el directorio "' + nombre + '" de los guardados.', {
                    titulo: '¿Eliminar directorio?', icono: '📂', btnOk: 'Sí, eliminar'
                });
            } catch { return; }
            var dirs = tabLoadDirectoriosGuardados();
            var regionalDirElim = (dirs[nombre] && dirs[nombre].datosFijos && dirs[nombre].datosFijos.regional) || (typeof currentRegional !== 'undefined' ? currentRegional : '');
            var totalUDSElim = (dirs[nombre] && dirs[nombre].uds && dirs[nombre].uds.length) || 0;
            delete dirs[nombre];
            tabSaveDirectoriosGuardados(dirs);
            tabRefreshSelect();
            document.getElementById('tab-btn-save-modified').style.display = 'none';
            var lbl = document.getElementById('tab-dir-loaded-label');
            if (lbl) lbl.style.display = 'none';
            showToast('Directorio "' + nombre + '" eliminado', 'success');

            // Registrar en auditoría (no bloqueante)
            if (typeof registrarAuditoria === 'function') {
                registrarAuditoria('ELIMINAR_DIRECTORIO', regionalDirElim, 'directorio', {
                    nombreDirectorio: nombre,
                    totalUDS: totalUDSElim
                }).catch(function(e) { console.error('Error en auditoría:', e); });
            }
        }

        var MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        function tabGuardarDirectorio(overwrite) {
            if (directorioUDS.length === 0) { showToast('El directorio está vacío','warning'); return; }
            if (overwrite) {
                var nombre = document.getElementById('tab-dir-select').value;
                if (!nombre) { showToast('No hay directorio cargado para sobreescribir','warning'); return; }
                var dirs = tabLoadDirectoriosGuardados();
                dirs[nombre] = {
                    nombre: nombre,
                    fecha: new Date().toISOString(),
                    uds: JSON.parse(JSON.stringify(directorioUDS)),
                    datosFijos: tabGetParamsFijos(),
                    contextoSemana: tabGetContextoSemana(),
                    configSemanal: tabGetConfigGeneracionSemanal(),
                    gramajesEntrega: tabGetGramajesEntrega(),
                    mes: dirs[nombre] ? dirs[nombre].mes : '',
                    semana: dirs[nombre] ? dirs[nombre].semana : '',
                    contrato: dirs[nombre] ? dirs[nombre].contrato : ''
                };
                tabSaveDirectoriosGuardados(dirs);
                tabRefreshSelect();
                document.getElementById('tab-dir-select').value = nombre;
                showToast('✅ Directorio "' + nombre + '" guardado (' + directorioUDS.length + ' UDS)', 'success');

                // Registrar en auditoría (no bloqueante)
                if (typeof registrarAuditoria === 'function') {
                    var regionalDir2 = (dirs[nombre].datosFijos && dirs[nombre].datosFijos.regional) || (typeof currentRegional !== 'undefined' ? currentRegional : '');
                    registrarAuditoria('ACTUALIZAR_DIRECTORIO', regionalDir2, 'directorio', {
                        nombreDirectorio: nombre,
                        totalUDS: directorioUDS.length
                    }).catch(function(e) { console.error('Error en auditoría:', e); });
                }
                return;
            }
            // Mostrar modal de guardado estructurado
            tabMostrarModalGuardar();
        }

        function tabMostrarModalGuardar() {
            var hoy = new Date();
            var mesActual = MESES_NOMBRES[hoy.getMonth()];
            var semanaEl = document.querySelector('[data-week].active, .week-selector-btn.active');
            var semanaNum = semanaEl ? (semanaEl.dataset.week || '1') : '1';

            var modal = document.createElement('div');
            modal.id = 'modal-guardar-dir';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
            modal.innerHTML = `
              <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:1rem;padding:1.5rem;min-width:320px;max-width:420px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <div style="font-weight:700;font-size:1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">💾 Guardar Directorio</div>
                <div style="margin-bottom:0.75rem;">
                  <label style="font-size:0.65rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:0.25rem;">Número de Contrato</label>
                  <input id="mgd-contrato" type="text" placeholder="Ej: 41006652024" style="width:100%;padding:0.5rem 0.75rem;background:var(--bg-dark);border:1px solid var(--border);border-radius:0.375rem;color:var(--text-primary);font-size:0.85rem;font-family:inherit;outline:none;">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem;">
                  <div>
                    <label style="font-size:0.65rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:0.25rem;">Semana</label>
                    <select id="mgd-semana" style="width:100%;padding:0.5rem 0.6rem;background:var(--bg-dark);border:1px solid var(--border);border-radius:0.375rem;color:var(--text-primary);font-size:0.82rem;font-family:inherit;outline:none;">
                      <option value="Semana 1" ${semanaNum=='1'?'selected':''}>Semana 1</option>
                      <option value="Semana 2" ${semanaNum=='2'?'selected':''}>Semana 2</option>
                      <option value="Semana 3" ${semanaNum=='3'?'selected':''}>Semana 3</option>
                      <option value="Semana 4" ${semanaNum=='4'?'selected':''}>Semana 4</option>
                      <option value="Semana 5" ${semanaNum=='5'?'selected':''}>Semana 5</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:0.65rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:0.25rem;">Mes</label>
                    <select id="mgd-mes" style="width:100%;padding:0.5rem 0.6rem;background:var(--bg-dark);border:1px solid var(--border);border-radius:0.375rem;color:var(--text-primary);font-size:0.82rem;font-family:inherit;outline:none;">
                      ${MESES_NOMBRES.map(function(m){ return '<option value="'+m+'"'+(m===mesActual?' selected':'')+'>'+m+'</option>'; }).join('')}
                    </select>
                  </div>
                </div>
                <div id="mgd-preview" style="font-size:0.75rem;color:#818cf8;margin-bottom:1rem;padding:0.4rem 0.6rem;background:rgba(99,102,241,0.08);border-radius:0.375rem;border:1px solid rgba(99,102,241,0.2);"></div>
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                  <button onclick="document.getElementById('modal-guardar-dir').remove()" style="padding:0.45rem 1rem;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:0.375rem;cursor:pointer;font-family:inherit;font-size:0.82rem;">Cancelar</button>
                  <button onclick="tabConfirmarGuardarModal()" style="padding:0.45rem 1.2rem;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:0.375rem;cursor:pointer;font-family:inherit;font-size:0.82rem;font-weight:700;">💾 Guardar</button>
                </div>
              </div>`;
            document.body.appendChild(modal);

            function actualizarPreview() {
                var c = document.getElementById('mgd-contrato').value.trim() || '___';
                var s = document.getElementById('mgd-semana').value;
                var m = document.getElementById('mgd-mes').value;
                document.getElementById('mgd-preview').textContent = '📂 ' + c + ' ' + s + ' ' + m;
            }
            document.getElementById('mgd-contrato').addEventListener('input', actualizarPreview);
            document.getElementById('mgd-semana').addEventListener('change', actualizarPreview);
            document.getElementById('mgd-mes').addEventListener('change', actualizarPreview);
            actualizarPreview();
            document.getElementById('mgd-contrato').focus();
        }

        function tabConfirmarGuardarModal() {
            var contrato = document.getElementById('mgd-contrato').value.trim();
            var semana = document.getElementById('mgd-semana').value;
            var mes = document.getElementById('mgd-mes').value;
            if (!contrato) { showToast('Ingrese el número de contrato','warning'); return; }
            var nombre = contrato + ' ' + semana + ' ' + mes;
            var dirs = tabLoadDirectoriosGuardados();
            if (dirs[nombre] && !confirm('Ya existe un directorio con este nombre. ¿Sobreescribir?')) return;
            dirs[nombre] = {
                nombre: nombre,
                contrato: contrato,
                semana: semana,
                mes: mes,
                fecha: new Date().toISOString(),
                uds: JSON.parse(JSON.stringify(directorioUDS)),
                datosFijos: tabGetParamsFijos(),
                contextoSemana: tabGetContextoSemana(),
                configSemanal: tabGetConfigGeneracionSemanal(),
                gramajesEntrega: tabGetGramajesEntrega()
            };
            tabSaveDirectoriosGuardados(dirs);
            tabRefreshSelect();
            document.getElementById('tab-dir-select').value = nombre;
            document.getElementById('tab-btn-save-modified').style.display = 'inline-block';
            // El directorio recién creado pasa a ser el "cargado": actualizar la etiqueta visible
            // para que no siga mostrando el nombre del directorio anterior.
            var lblNuevo = document.getElementById('tab-dir-loaded-label');
            if (lblNuevo) { lblNuevo.textContent = '📂 ' + nombre; lblNuevo.style.display = 'block'; lblNuevo.title = nombre; }
            sincronizarConPanelFlotante();
            document.getElementById('modal-guardar-dir').remove();
            showToast('✅ Directorio "' + nombre + '" guardado (' + directorioUDS.length + ' UDS)', 'success');

            // Registrar en auditoría (no bloqueante)
            if (typeof registrarAuditoria === 'function') {
                var regionalDir = (dirs[nombre].datosFijos && dirs[nombre].datosFijos.regional) || (typeof currentRegional !== 'undefined' ? currentRegional : '');
                registrarAuditoria('CREAR_DIRECTORIO', regionalDir, 'directorio', {
                    nombreDirectorio: nombre,
                    contrato: contrato,
                    semana: semana,
                    mes: mes,
                    totalUDS: directorioUDS.length
                }).catch(function(e) { console.error('Error en auditoría:', e); });
            }
        }

        // ── Compatibilidad con directorios guardados desde la versión 1 ──
        // En v1 la config semanal y los gramajes de entrega se guardaban
        // anidados en "configSnapshot" (configSnapshot.configSemanal /
        // configSnapshot.entregasSemanal), con nombres de campo distintos a
        // los que usa v2 (configSemanal / gramajesEntrega). Esta función
        // detecta el formato viejo y lo traduce al formato que espera
        // tabAplicarConfigSemanalGuardada, sin tocar los datos originales.
        function tabObtenerConfigSemanalCompat(d) {
            if (d.configSemanal || d.gramajesEntrega) {
                // Ya está en formato v2
                return { configSemanal: d.configSemanal || null, gramajesEntrega: d.gramajesEntrega || null };
            }
            var snap = d.configSnapshot;
            if (!snap || !snap.configSemanal) return { configSemanal: null, gramajesEntrega: null };
            var cs = snap.configSemanal;
            var configSemanal = {
                regional:  cs.regional  || '',
                modalidad: cs.modalidad || '',
                operador:  cs.operador  || null,
                semana:    cs.semana    || '1',
                ninos:     cs.cupos     || '',
                dias:      Array.isArray(cs.dias) ? cs.dias : [],
                lecheModoSemanal:  cs.lecheModo  || '',
                yogurtModoSemanal: cs.yogurtModo || ''
            };
            var gramajesEntrega = {};
            if (snap.entregasSemanal) {
                var regionalPrefix = cs.regional || '';
                Object.keys(snap.entregasSemanal).forEach(function(name) {
                    var val = snap.entregasSemanal[name];
                    if (val && val !== '') {
                        var idRef = regionalPrefix + '_' + name.replace(/\s/g, '');
                        gramajesEntrega[idRef] = val;
                    }
                });
            }
            return { configSemanal: configSemanal, gramajesEntrega: gramajesEntrega };
        }

        function tabCargarDirectorioGuardado() {
            var nombre = document.getElementById('tab-dir-select').value;
            if (!nombre) { showToast('Seleccione un directorio para cargar','warning'); return; }
            var dirs = tabLoadDirectoriosGuardados();
            var d = dirs[nombre];
            if (!d) { showToast('Directorio no encontrado','error'); return; }
            // Load UDS
            directorioUDS = JSON.parse(JSON.stringify(d.uds || []));
            // Load datos fijos
            if (d.datosFijos) {
                var f = d.datosFijos;
                if (f.regional)       document.getElementById('tab-dir-regional').value       = f.regional;
                if (f.centrozonal)    document.getElementById('tab-dir-centrozonal').value    = f.centrozonal;
                if (f.modalidad)      document.getElementById('tab-dir-modalidad').value      = f.modalidad;
                if (f.servicio)       document.getElementById('tab-dir-servicio').value       = f.servicio;
                if (f.municipio)      document.getElementById('tab-dir-municipio').value      = f.municipio;
                if (f.fechaSolicitud) document.getElementById('tab-dir-fecha').value          = f.fechaSolicitud;
                if (f.entregaNombre)  document.getElementById('tab-dir-entrega-nombre').value = f.entregaNombre;
                if (f.entregaDoc)     document.getElementById('tab-dir-entrega-doc').value    = f.entregaDoc;
                if (f.entregaEntidad) document.getElementById('tab-dir-entrega-entidad').value= f.entregaEntidad;
                if (f.entregaNit)     document.getElementById('tab-dir-entrega-nit').value    = f.entregaNit;
                if (f.fuente)    { var el = document.getElementById('tab-dir-fuente');    if (el) el.value = f.fuente; }
                if (f.lecheModo) { var el2 = document.getElementById('tab-dir-leche-modo'); if (el2) el2.value = f.lecheModo; }
                if (f.yogurtModo) { var el3 = document.getElementById('tab-dir-yogurt-modo'); if (el3) el3.value = f.yogurtModo; }
                // Sincronizar leche/yogurt también a los selectores de lista semanal y mensual
                if (f.lecheModo) {
                    var elS = document.getElementById('leche-modo-semanal'); if (elS) elS.value = f.lecheModo;
                    var elM = document.getElementById('leche-modo-mensual'); if (elM) elM.value = f.lecheModo;
                }
                if (f.yogurtModo) {
                    var elYS = document.getElementById('yogurt-modo-semanal'); if (elYS) elYS.value = f.yogurtModo;
                    var elYM = document.getElementById('yogurt-modo-mensual'); if (elYM) elYM.value = f.yogurtModo;
                }
            }
            // Show context
            if (d.contextoSemana) {
                var ctx = d.contextoSemana;
                var dias = (ctx.dias || []).map(function(n){ return ['','Lun','Mar','Mié','Jue','Vie'][n] || n; }).join(', ');
                var info = 'Guardado con: ';
                if (ctx.semanaLabel) info += ctx.semanaLabel + ' — ';
                if (dias) info += 'Días: ' + dias;
                info += '<br><span style="color:var(--warning,#f59e0b)">Las actas se generarán con la semana/días actualmente activos en la lista</span>';
                document.getElementById('tab-dir-context-info').innerHTML = info;
            }
            // Restaurar configuración de generación semanal (regional, modalidad,
            // operador, semana, niños, días) y los gramajes digitados en "Entrega".
            // tabObtenerConfigSemanalCompat traduce automáticamente el formato
            // legado de la v1 (configSnapshot) si el directorio viene de ahí.
            var _configCompat = tabObtenerConfigSemanalCompat(d);
            tabAplicarConfigSemanalGuardada(_configCompat.configSemanal, _configCompat.gramajesEntrega);

            tabRenderizarDirectorio();
            document.getElementById('tab-btn-save-modified').style.display = 'inline-block';
            // Update loaded label
            var lbl = document.getElementById('tab-dir-loaded-label');
            if (lbl) { lbl.textContent = '📂 ' + nombre; lbl.style.display = 'block'; lbl.title = nombre; }
            showToast('✅ Directorio "' + nombre + '" cargado (' + directorioUDS.length + ' UDS)', 'success');
            // Also sync to the floating panel
            sincronizarConPanelFlotante();

            // Ir directo a "Generar Listado de Mercado" semanal con la config restaurada
            if (_configCompat.configSemanal) {
                showSection('calculator');
                setTimeout(function() { generar(); }, 50);
            }
        }

        // tabEliminarDirectorioGuardado replaced by tabEliminarDirectorioGuardadoActual

        function tabToggleEditorManual() {
            var el = document.getElementById('tab-dir-editor-manual');
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        function tabAgregarUDSManual() {
            var resp = document.getElementById('tab-man-responsable').value.trim();
            if (!resp) { showToast('El nombre del responsable es requerido','warning'); return; }
            directorioUDS.push({
                responsable: resp,
                telefono:    document.getElementById('tab-man-telefono').value.trim(),
                entidad:     document.getElementById('tab-man-entidad').value.trim(),
                unidad:      document.getElementById('tab-man-unidad').value.trim(),
                codigo:      document.getElementById('tab-man-codigo').value.trim(),
                documentoId: document.getElementById('tab-man-documentoId').value.trim(),
                cobertura:   parseInt(document.getElementById('tab-man-cobertura').value) || 0
            });
            ['tab-man-responsable','tab-man-telefono','tab-man-entidad','tab-man-unidad','tab-man-codigo','tab-man-documentoId','tab-man-cobertura'].forEach(function(id){ document.getElementById(id).value = ''; });
            tabRenderizarDirectorio();
            showToast('UDS agregada','success');
        }

        async function tabLimpiarDirectorio() {
            try {
                await mostrarConfirm('Se eliminarán TODAS las UDS del directorio. Esta acción no se puede deshacer.', {
                    titulo: '¿Limpiar directorio?', icono: '📂', btnOk: 'Sí, limpiar todo'
                });
            } catch { return; }
            directorioUDS = [];
            tabRenderizarDirectorio();
        }

        async function tabEliminarUDS(idx) {
            try {
                await mostrarConfirm('Se eliminará esta UDS del directorio de actas.', {
                    titulo: '¿Eliminar UDS?', icono: '🗑️', btnOk: 'Sí, eliminar'
                });
            } catch { return; }
            directorioUDS.splice(idx, 1);
            tabRenderizarDirectorio();
        }

        // Actualiza únicamente los contadores (Vista Previa / Total UDS / Total cupos)
        // sin re-renderizar toda la tabla, para que se vean al instante al editar la cobertura.
        function tabActualizarContadoresDirectorio() {
            var count = directorioUDS.length;
            var totalCupos = directorioUDS.reduce(function(acc, u){ return acc + (parseInt(u.cobertura) || 0); }, 0);
            var countEl = document.getElementById('tab-dir-count');
            var cuposEl = document.getElementById('tab-dir-cupos');
            if (countEl) countEl.textContent = count;
            if (cuposEl) cuposEl.textContent = totalCupos;
            var statsEl = document.getElementById('tab-dir-sticky-stats');
            if (statsEl) {
                statsEl.innerHTML = 'Total UDS: <b>' + count + '</b><br>Total cupos: <b>' + totalCupos + '</b><br>';
            }
        }

        function tabRenderizarDirectorio() {
            var count = directorioUDS.length;
            var countEl = document.getElementById('tab-dir-count');
            var cuposEl = document.getElementById('tab-dir-cupos');
            var countBtnEl = document.getElementById('tab-dir-count-btn');
            var countBtnUniEl = document.getElementById('tab-dir-count-btn-uni');
            var totalCuposPreview = directorioUDS.reduce(function(acc, u){ return acc + (parseInt(u.cobertura) || 0); }, 0);
            if (countEl) countEl.textContent = count;
            if (cuposEl) cuposEl.textContent = totalCuposPreview;
            if (countBtnEl) countBtnEl.textContent = count;
            if (countBtnUniEl) countBtnUniEl.textContent = count;

            var empty = document.getElementById('tab-dir-empty-state');
            var preview = document.getElementById('tab-dir-preview-container');
            var stickyBar = document.getElementById('tab-dir-sticky-bar');
            if (!empty || !preview) return;

            if (count === 0) {
                empty.style.display = 'block';
                preview.style.display = 'none';
                if (stickyBar) stickyBar.style.display = 'none';
                return;
            }
            empty.style.display = 'none';
            preview.style.display = 'block';
            if (stickyBar) stickyBar.style.display = 'flex';

            var statsEl = document.getElementById('tab-dir-sticky-stats');
            if (statsEl) {
                var totalCupos = directorioUDS.reduce(function(acc, u){ return acc + (parseInt(u.cobertura) || 0); }, 0);
                statsEl.innerHTML = 'Total UDS: <b>' + count + '</b><br>Total cupos: <b>' + totalCupos + '</b><br>';
            }

            var tbody = document.getElementById('tab-dir-preview-body');
            tbody.innerHTML = directorioUDS.map(function(uds, i) {
                var cob = uds.cobertura > 0 ? uds.cobertura : 0;
                return '<tr>' +
                    '<td class="dir-td-center" style="color:var(--text-secondary);">' + (i+1) + '</td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.responsable) + '" onchange="directorioUDS[' + i + '].responsable=this.value" title="Editar responsable"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.telefono||'') + '" onchange="directorioUDS[' + i + '].telefono=this.value" style="width:6rem;"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.unidad||'') + '" onchange="directorioUDS[' + i + '].unidad=this.value"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.codigo||'') + '" onchange="directorioUDS[' + i + '].codigo=this.value" style="width:6rem;"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.documentoId||'') + '" onchange="directorioUDS[' + i + '].documentoId=this.value" style="width:8rem;"></td>' +
                    '<td class="dir-td-center"><input class="dir-editable" type="number" min="0" value="' + cob + '" oninput="directorioUDS[' + i + '].cobertura=parseInt(this.value)||0; tabActualizarContadoresDirectorio()" style="width:4rem;text-align:center;background:rgba(16,185,129,0.08);color:#10b981;font-weight:700;"></td>' +
                    '<td class="dir-td-center" style="white-space:nowrap;">' +
                        '<button class="dir-action-btn" onclick="tabGenerarActaIndividualTab(' + i + ')" style="background:rgba(5,150,105,0.1);border-color:rgba(5,150,105,0.3);color:#10b981;" title="Generar acta">📥</button>' +
                        '<button class="dir-action-btn" onclick="tabEliminarUDS(' + i + ')" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2);color:#ef4444;" title="Eliminar">✕</button>' +
                    '</td></tr>';
            }).join('');
        }

        // Restablece la cobertura de todas las UDS del directorio al valor por defecto (13).
        async function tabResetCobertura() {
            if (directorioUDS.length === 0) return;
            try {
                await mostrarConfirm('Se restablecerá la cobertura de las ' + directorioUDS.length + ' UDS del directorio al valor por defecto (13).', {
                    titulo: '¿Restablecer cobertura?', icono: '↺', btnOk: 'Sí, restablecer'
                });
            } catch { return; }
            directorioUDS.forEach(function(uds){ uds.cobertura = 13; });
            tabRenderizarDirectorio();
            showToast('Cobertura restablecida a 13 en todas las UDS', 'success');
        }

        // Ordena el directorio de mayor a menor según la cobertura.
        function tabOrdenarPorCobertura() {
            if (directorioUDS.length === 0) return;
            directorioUDS.sort(function(a, b){ return (parseInt(b.cobertura) || 0) - (parseInt(a.cobertura) || 0); });
            tabRenderizarDirectorio();
        }

        function tabImportarDirectorio(input) {
            var file = input.files[0];
            if (!file) return;
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'csv') {
                var reader = new FileReader();
                reader.onload = function(e) { parsearCSVDirectorio(e.target.result); tabRenderizarDirectorio(); };
                reader.readAsText(file, 'UTF-8');
            } else if (ext === 'xlsx' || ext === 'xls') {
                var reader2 = new FileReader();
                reader2.onload = function(e) {
                    try {
                        var wb = XLSX.read(e.target.result, {type:'array'});
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        var csv = XLSX.utils.sheet_to_csv(ws);
                        parsearCSVDirectorio(csv); tabRenderizarDirectorio();
                    } catch(err) { showToast('Error leyendo Excel: ' + err.message, 'error'); }
                };
                reader2.readAsArrayBuffer(file);
            }
            input.value = '';
        }

        function tabCargarDirectorioEjemplo() {
            cargarDirectorioEjemplo(); // reuse existing function
            tabRenderizarDirectorio();
        }

        // ==================== PROVEEDORES ====================
        function provLoadAll() {
            try { return JSON.parse(localStorage.getItem(PROVEEDORES_STORAGE_KEY) || '[]'); } catch(e) { return []; }
        }
        function provSaveAll(arr) {
            localStorage.setItem(PROVEEDORES_STORAGE_KEY, JSON.stringify(arr));
            // Auto-sync a Firebase si hay usuario activo
            if (window.currentUser && window.firebaseDB) {
                try {
                    const uid = window.currentUser.uid;
                    const ref = window.firebaseRef(window.firebaseDB, 'user_proveedores/' + uid);
                    window.firebaseSet(ref, arr || []);
                } catch(e) { /* silent */ }
            }
        }

        function provGuardar() {
            var nombre    = (document.getElementById('prov-nombre').value    || '').trim();
            var documento = (document.getElementById('prov-documento').value || '').trim();
            var entidad   = (document.getElementById('prov-entidad').value   || '').trim();
            var nit       = (document.getElementById('prov-nit').value       || '').trim();
            if (!nombre)    { showToast('El nombre del proveedor es requerido', 'warning'); return; }
            if (!documento) { showToast('El documento es requerido', 'warning'); return; }
            if (!entidad)   { showToast('La entidad es requerida', 'warning'); return; }
            var lista = provLoadAll();
            var idx = parseInt(document.getElementById('prov-edit-index').value);
            var obj = { nombre: nombre, documento: documento, entidad: entidad, nit: nit };
            if (idx >= 0 && idx < lista.length) {
                lista[idx] = obj;
                showToast('✅ Proveedor actualizado', 'success');
            } else {
                lista.push(obj);
                showToast('✅ Proveedor agregado', 'success');
            }
            provSaveAll(lista);
            provCancelarEdicion();
            provRenderizar();
            provRefreshSelectDirectorio();
        }

        function provCancelarEdicion() {
            document.getElementById('prov-edit-index').value = '-1';
            document.getElementById('prov-nombre').value = '';
            document.getElementById('prov-documento').value = '';
            document.getElementById('prov-entidad').value = '';
            document.getElementById('prov-nit').value = '';
            document.getElementById('prov-form-title').textContent = '➕ Agregar Proveedor';
            document.getElementById('prov-btn-cancelar').style.display = 'none';
        }

        function provEditarFila(idx) {
            var lista = provLoadAll();
            if (!lista[idx]) return;
            var p = lista[idx];
            document.getElementById('prov-edit-index').value = idx;
            document.getElementById('prov-nombre').value    = p.nombre    || '';
            document.getElementById('prov-documento').value = p.documento || '';
            document.getElementById('prov-entidad').value   = p.entidad   || '';
            document.getElementById('prov-nit').value       = p.nit       || '';
            document.getElementById('prov-form-title').textContent = '✏️ Editar Proveedor';
            document.getElementById('prov-btn-cancelar').style.display = 'inline-flex';
            document.getElementById('prov-nombre').focus();
            document.getElementById('prov-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // ─── MÓDULO: Proveedores ──
        async function provEliminar(idx) {
            var lista = provLoadAll();
            if (!lista[idx]) return;
            try {
        await mostrarConfirm('Se eliminará al proveedor "' + lista[idx].nombre + '" de forma permanente.', {
            titulo: '¿Eliminar proveedor?', icono: '🏭', btnOk: 'Sí, eliminar'
        });
    } catch { return; }
            lista.splice(idx, 1);
            provSaveAll(lista);
            provRenderizar();
            provRefreshSelectDirectorio();
            showToast('Proveedor eliminado', 'success');
        }

        function provRenderizar() {
            var lista = provLoadAll();
            var countEl = document.getElementById('prov-count');
            if (countEl) countEl.textContent = lista.length;
            var empty = document.getElementById('prov-empty-state');
            var tableWrap = document.getElementById('prov-table-wrap');
            if (!empty || !tableWrap) return;
            if (lista.length === 0) {
                empty.style.display = 'block';
                tableWrap.style.display = 'none';
                return;
            }
            empty.style.display = 'none';
            tableWrap.style.display = 'block';
            var tbody = document.getElementById('prov-table-body');
            tbody.innerHTML = lista.map(function(p, i) {
                return '<tr>' +
                    '<td style="color:var(--text-secondary);">' + (i+1) + '</td>' +
                    '<td style="font-weight:600;">' + escHtml(p.nombre || '') + '</td>' +
                    '<td>' + escHtml(p.documento || '') + '</td>' +
                    '<td>' + escHtml(p.entidad || '') + '</td>' +
                    '<td style="color:var(--text-secondary);">' + escHtml(p.nit || '') + '</td>' +
                    '<td style="text-align:center;white-space:nowrap;">' +
                        '<button onclick="provEditarFila(' + i + ')" style="padding:0.15rem 0.45rem;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);color:#f59e0b;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;margin-right:0.2rem;">✏️ Editar</button>' +
                        '<button onclick="provEliminar(' + i + ')" style="padding:0.15rem 0.45rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;">✕</button>' +
                    '</td></tr>';
            }).join('');
        }

        // Actualiza el select de proveedores en el panel de directorio
        function provRefreshSelectDirectorio() {
            var sel = document.getElementById('tab-dir-proveedor-select');
            if (!sel) return;
            var lista = provLoadAll();
            var current = sel.value;
            sel.innerHTML = '<option value="">— Seleccionar proveedor (opcional) —</option>';
            lista.forEach(function(p, i) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = p.nombre + (p.entidad ? '  ·  ' + p.entidad : '');
                sel.appendChild(opt);
            });
            if (current !== '') sel.value = current;
        }

        // Autocompletado al seleccionar proveedor en directorio
        function provSeleccionarEnDirectorio(val) {
            if (val === '') return; // selección vacía: no limpiar los campos manualmente llenados
            var lista = provLoadAll();
            var idx = parseInt(val);
            if (isNaN(idx) || !lista[idx]) return;
            var p = lista[idx];
            document.getElementById('tab-dir-entrega-nombre').value  = p.nombre    || '';
            document.getElementById('tab-dir-entrega-doc').value     = p.documento || '';
            document.getElementById('tab-dir-entrega-entidad').value = p.entidad   || '';
            document.getElementById('tab-dir-entrega-nit').value     = p.nit       || '';
        }
        // ==================== FIN PROVEEDORES ====================



        function tabGetFuenteParams() {
            return {
                fuente: document.getElementById('tab-dir-fuente').value || 'semanal',
                lecheModo: document.getElementById('tab-dir-leche-modo').value || 'ml',
                yogurtModo: document.getElementById('tab-dir-yogurt-modo') ? document.getElementById('tab-dir-yogurt-modo').value : 'und150'
            };
        }

        async function tabGenerarActaIndividualTab(idx) {
            var uds = directorioUDS[idx];
            var fp = tabGetFuenteParams();
            var coberturaUDS = uds.cobertura > 0 ? uds.cobertura : null;
            var items = obtenerItemsActa(fp.fuente, coberturaUDS, fp.lecheModo, fp.yogurtModo);
            if (items.length === 0) { showToast('No hay productos en la lista. Genere primero la lista.','warning'); return; }
            var fijos = tabGetParamsFijos();
            var params = Object.assign({}, fijos, uds, {observaciones:'', recibeNombre: uds.responsable||'', recibeDoc: uds.documentoId||''});
            await generarActaExcelXML(items, params, null);
        }

        async function tabGenerarTodasLasActas() {
            if (directorioUDS.length === 0) { showToast('Directorio vacío','warning'); return; }
            var fp = tabGetFuenteParams();
            var itemsTest = obtenerItemsActa(fp.fuente, null, fp.lecheModo, fp.yogurtModo);
            if (itemsTest.length === 0) { showToast('No hay productos. Genere primero la lista ' + fp.fuente + '.','warning'); return; }
            var fijos = tabGetParamsFijos();
            showToast('Generando ' + directorioUDS.length + ' actas...', 'success');
            for (var i=0; i<directorioUDS.length; i++) {
                var uds = directorioUDS[i];
                var coberturaUDS = uds.cobertura > 0 ? uds.cobertura : null;
                var items = obtenerItemsActa(fp.fuente, coberturaUDS, fp.lecheModo, fp.yogurtModo);
                var params = Object.assign({}, fijos, uds, {observaciones:'', recibeNombre: uds.responsable||'', recibeDoc: uds.documentoId||''});
                try {
                    await generarActaExcelXML(items, params, null);
                    await new Promise(function(r){ setTimeout(r, 600); });
                } catch(e) { showToast('Error en UDS ' + (i+1) + ': ' + e.message, 'error'); }
            }
            showToast('✅ ' + directorioUDS.length + ' actas generadas exitosamente', 'success');
        }

        // Igual que tabGenerarTodasLasActas() pero exporta UN SOLO archivo .xlsx con
        // una hoja por UDS. Independiente por completo de tabGenerarTodasLasActas y
        // de generarDirectorioUnificado (panel flotante): cada una arma su propia
        // lista de items/params sin compartir configuración.
        async function tabGenerarDirectorioUnificado() {
            if (directorioUDS.length === 0) { showToast('Directorio vacío','warning'); return; }
            var fp = tabGetFuenteParams();
            var itemsTest = obtenerItemsActa(fp.fuente, null, fp.lecheModo, fp.yogurtModo);
            if (itemsTest.length === 0) { showToast('No hay productos. Genere primero la lista ' + fp.fuente + '.','warning'); return; }
            var fijos = tabGetParamsFijos();
            showToast('Unificando ' + directorioUDS.length + ' actas en un solo archivo...', 'success');

            var listaUDS = [];
            for (var i = 0; i < directorioUDS.length; i++) {
                var uds = directorioUDS[i];
                var coberturaUDS = uds.cobertura > 0 ? uds.cobertura : null;
                var items = obtenerItemsActa(fp.fuente, coberturaUDS, fp.lecheModo, fp.yogurtModo);
                var params = Object.assign({}, fijos, uds, {observaciones:'', recibeNombre: uds.responsable||'', recibeDoc: uds.documentoId||''});
                listaUDS.push({ items: items, params: params });
            }
            try {
                await generarActaUnificada(listaUDS);
            } catch(e) {
                showToast('Error al unificar actas: ' + e.message, 'error');
            }
        }

        function sincronizarConPanelFlotante() {
            // Sync tab data to the floating panel inputs
            var map = {
                'tab-dir-regional': 'dir-regional',
                'tab-dir-centrozonal': 'dir-centrozonal',
                'tab-dir-modalidad': 'dir-modalidad',
                'tab-dir-servicio': 'dir-servicio',
                'tab-dir-municipio': 'dir-municipio',
                'tab-dir-fecha': 'dir-fecha',
                'tab-dir-entrega-nombre': 'dir-entrega-nombre',
                'tab-dir-entrega-doc': 'dir-entrega-doc',
                'tab-dir-entrega-entidad': 'dir-entrega-entidad',
                'tab-dir-entrega-nit': 'dir-entrega-nit',
                'tab-dir-fuente': 'dir-fuente',
                'tab-dir-leche-modo': 'dir-leche-modo',
                'tab-dir-yogurt-modo': 'dir-yogurt-modo'
            };
            Object.keys(map).forEach(function(tabId) {
                var tabEl = document.getElementById(tabId);
                var panelEl = document.getElementById(map[tabId]);
                if (tabEl && panelEl) panelEl.value = tabEl.value;
            });
        }

        // Also sync data from floating panel → tab when opening directorio tab
        function sincronizarDesdePanel() {
            var map = {
                'dir-regional': 'tab-dir-regional',
                'dir-centrozonal': 'tab-dir-centrozonal',
                'dir-modalidad': 'tab-dir-modalidad',
                'dir-servicio': 'tab-dir-servicio',
                'dir-municipio': 'tab-dir-municipio',
                'dir-fecha': 'tab-dir-fecha',
                'dir-entrega-nombre': 'tab-dir-entrega-nombre',
                'dir-entrega-doc': 'tab-dir-entrega-doc',
                'dir-entrega-entidad': 'tab-dir-entrega-entidad',
                'dir-entrega-nit': 'tab-dir-entrega-nit',
                'dir-fuente': 'tab-dir-fuente',
                'dir-leche-modo': 'tab-dir-leche-modo',
                'dir-yogurt-modo': 'tab-dir-yogurt-modo'
            };
            Object.keys(map).forEach(function(panelId) {
                var panelEl = document.getElementById(panelId);
                var tabEl = document.getElementById(map[panelId]);
                if (panelEl && tabEl && panelEl.value) tabEl.value = panelEl.value;
            });
        }

        // =============================================
        // EXPORTAR/IMPORTAR DIRECTORIOS COMO EXCEL
        // =============================================
        async function tabExportarDirectoriosExcel() {
            var dirs = tabLoadDirectoriosGuardados();
            var nombres = Object.keys(dirs);
            if (nombres.length === 0) { showToast('No hay directorios guardados para exportar', 'warning'); return; }

            if (typeof XLSX === 'undefined') { showToast('Librería XLSX no disponible', 'error'); return; }

            var wb = XLSX.utils.book_new();

            // Hoja 1: Índice de directorios
            var idxRows = [['Nombre', 'Contrato', 'Semana', 'Mes', 'Fecha Guardado', 'Total UDS']];
            nombres.forEach(function(nom) {
                var d = dirs[nom];
                idxRows.push([
                    nom,
                    d.contrato || '',
                    d.semana || '',
                    d.mes || '',
                    d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '',
                    (d.uds || []).length
                ]);
            });
            var wsIdx = XLSX.utils.aoa_to_sheet(idxRows);
            XLSX.utils.book_append_sheet(wb, wsIdx, 'Índice');

            // Hoja 2: Datos Fijos (primera que tenga)
            var primerDir = dirs[nombres[0]];
            if (primerDir && primerDir.datosFijos) {
                var f = primerDir.datosFijos;
                var fixedRows = [
                    ['⚙️ DATOS FIJOS DEL ACTA (aplican a todas)', ''],
                    ['Regional', f.regional || ''],
                    ['Centro Zonal', f.centrozonal || ''],
                    ['Modalidad', f.modalidad || ''],
                    ['Servicio', f.servicio || ''],
                    ['Municipio', f.municipio || ''],
                    ['Fecha Solicitud', f.fechaSolicitud || ''],
                    ['', ''],
                    ['✍️ DATOS DE QUIEN ENTREGA', ''],
                    ['Nombre', f.entregaNombre || ''],
                    ['Documento', f.entregaDoc || ''],
                    ['Entidad', f.entregaEntidad || ''],
                    ['NIT', f.entregaNit || ''],
                    ['Fuente', f.fuente || ''],
                    ['Modo Leche', f.lecheModo || '']
                ];
                var wsFixed = XLSX.utils.aoa_to_sheet(fixedRows);
                wsFixed['!cols'] = [{wch:25},{wch:40}];
                XLSX.utils.book_append_sheet(wb, wsFixed, 'Datos Fijos');
            }

            // Una hoja por directorio con todas las UDS
            nombres.forEach(function(nom) {
                var d = dirs[nom];
                var uds = d.uds || [];
                var sheetName = nom.substring(0, 31).replace(/[\/\\\?\*\[\]]/g,'_');
                var rows = [
                    ['Directorio: ' + nom],
                    ['Contrato:', d.contrato||'', 'Semana:', d.semana||'', 'Mes:', d.mes||''],
                    [],
                    ['#','Responsable','Teléfono','Entidad','Unidad de Servicio','Código','Documento ID','Cobertura']
                ];
                uds.forEach(function(u, i) {
                    rows.push([i+1, u.responsable||'', u.telefono||'', u.entidad||'', u.unidad||'', u.codigo||'', u.documentoId||'', u.cobertura||0]);
                });
                // Datos fijos al final
                if (d.datosFijos) {
                    var ff = d.datosFijos;
                    rows.push([]);
                    rows.push(['⚙️ DATOS FIJOS DEL ACTA']);
                    rows.push(['Regional', ff.regional||'', 'Centro Zonal', ff.centrozonal||'']);
                    rows.push(['Modalidad', ff.modalidad||'', 'Servicio', ff.servicio||'']);
                    rows.push(['Municipio', ff.municipio||'', 'Fecha Solicitud', ff.fechaSolicitud||'']);
                    rows.push([]);
                    rows.push(['✍️ DATOS DE QUIEN ENTREGA']);
                    rows.push(['Nombre', ff.entregaNombre||'', 'Documento', ff.entregaDoc||'']);
                    rows.push(['Entidad', ff.entregaEntidad||'', 'NIT', ff.entregaNit||'']);
                    rows.push(['Fuente', ff.fuente||'', 'Modo Leche', ff.lecheModo||'']);
                }
                // Configuración de generación del listado semanal (regional/modalidad/
                // operador de la app, semana, niños, días) — para poder retomar el
                // directorio exactamente donde quedó. tabObtenerConfigSemanalCompat
                // traduce automáticamente el formato legado de la v1 si aplica.
                var _configCompatExp = tabObtenerConfigSemanalCompat(d);
                if (_configCompatExp.configSemanal) {
                    var cs = _configCompatExp.configSemanal;
                    rows.push([]);
                    rows.push(['🗓️ CONFIGURACIÓN DE GENERACIÓN SEMANAL']);
                    rows.push(['Regional App', cs.regional||'', 'Modalidad App', cs.modalidad||'']);
                    rows.push(['Operador', cs.operador||'', 'Semana', cs.semana||'']);
                    rows.push(['Niños', cs.ninos||'', 'Días', (cs.dias||[]).join(',')]);
                    rows.push(['Modo Leche Semanal', cs.lecheModoSemanal||'', 'Modo Yogurt Semanal', cs.yogurtModoSemanal||'']);
                }
                // Gramajes digitados en la columna "Entrega" del listado semanal,
                // guardados como JSON para restaurarlos tal cual al reimportar.
                if (_configCompatExp.gramajesEntrega && Object.keys(_configCompatExp.gramajesEntrega).length) {
                    rows.push([]);
                    rows.push(['📦 GRAMAJES DE ENTREGA (JSON — no editar a mano)']);
                    rows.push([JSON.stringify(_configCompatExp.gramajesEntrega)]);
                }
                var ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{wch:4},{wch:28},{wch:14},{wch:22},{wch:28},{wch:10},{wch:14},{wch:10}];
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            var today = new Date();
            var dateStr2 = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
            XLSX.writeFile(wb, 'Directorios_UDS_' + dateStr2 + '.xlsx');
            showToast('✅ Directorios exportados a Excel (' + nombres.length + ' directorios)', 'success');
        }

        function tabImportarDirectoriosExcel(input) {
            var file = input.files[0];
            if (!file) return;
            if (typeof XLSX === 'undefined') { showToast('Librería XLSX no disponible', 'error'); return; }
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var wb = XLSX.read(e.target.result, {type:'array'});
                    var dirs = tabLoadDirectoriosGuardados();
                    var imported = 0;
                    var datosFijosGlobal = null;

                    // Leer hoja Datos Fijos si existe
                    if (wb.SheetNames.indexOf('Datos Fijos') !== -1) {
                        var wf = wb.Sheets['Datos Fijos'];
                        var rowsF = XLSX.utils.sheet_to_json(wf, {header:1, defval:''});
                        datosFijosGlobal = {};
                        var fieldMap = {
                            'Regional': 'regional', 'Centro Zonal': 'centrozonal',
                            'Modalidad': 'modalidad', 'Servicio': 'servicio',
                            'Municipio': 'municipio', 'Fecha Solicitud': 'fechaSolicitud',
                            'Nombre': 'entregaNombre', 'Documento': 'entregaDoc',
                            'Entidad': 'entregaEntidad', 'NIT': 'entregaNit',
                            'Fuente': 'fuente', 'Modo Leche': 'lecheModo'
                        };
                        rowsF.forEach(function(row) {
                            if (row[0] && fieldMap[row[0]]) datosFijosGlobal[fieldMap[row[0]]] = String(row[1]||'');
                        });
                    }

                    // Procesar cada hoja (excepto Índice y Datos Fijos)
                    wb.SheetNames.forEach(function(sheetName) {
                        if (sheetName === 'Índice' || sheetName === 'Datos Fijos') return;
                        var ws = wb.Sheets[sheetName];
                        var rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
                        if (rows.length < 4) return;

                        // Row 0: "Directorio: NOMBRE"
                        var nomFull = String(rows[0][0]||'').replace(/^Directorio:\s*/,'').trim();
                        if (!nomFull) nomFull = sheetName;

                        // Row 1: contrato/semana/mes
                        var contrato='', semana='', mes='';
                        var r1 = rows[1] || [];
                        for (var ci=0; ci<r1.length-1; ci++) {
                            var lbl = String(r1[ci]||'').trim().replace(':','');
                            var val = String(r1[ci+1]||'').trim();
                            if (lbl==='Contrato') contrato=val;
                            else if (lbl==='Semana') semana=val;
                            else if (lbl==='Mes') mes=val;
                        }

                        // Find header row (has "Responsable" in col 0 or col 1)
                        var headerIdx = -1;
                        var headerOffset = 1; // default: col0=#, col1=Responsable
                        for (var ri=0; ri<rows.length; ri++) {
                            var r0 = String(rows[ri][0]||'').trim().toLowerCase();
                            var r1 = String(rows[ri][1]||'').trim().toLowerCase();
                            if (r1 === 'responsable') { headerIdx=ri; headerOffset=1; break; }
                            if (r0 === 'responsable') { headerIdx=ri; headerOffset=0; break; }
                        }
                        if (headerIdx === -1) return;

                        // Read UDS rows
                        var uds = [];
                        var datosFijosDir = datosFijosGlobal ? JSON.parse(JSON.stringify(datosFijosGlobal)) : {};
                        var configSemanalDir = null;
                        var gramajesEntregaDir = null;
                        var seccionActual = null; // null | 'fijos' | 'config' | 'gramajes'
                        for (var ri2=headerIdx+1; ri2<rows.length; ri2++) {
                            var row = rows[ri2];
                            var col0 = String(row[0]||'').trim();
                            // Detectar cambio de sección
                            if (col0.indexOf('DATOS FIJOS') !== -1 || col0.indexOf('QUIEN ENTREGA') !== -1) { seccionActual='fijos'; continue; }
                            if (col0.indexOf('CONFIGURACIÓN DE GENERACIÓN SEMANAL') !== -1) { seccionActual='config'; configSemanalDir = configSemanalDir || {}; continue; }
                            if (col0.indexOf('GRAMAJES DE ENTREGA') !== -1) { seccionActual='gramajes'; continue; }
                            if (seccionActual === 'fijos') {
                                var fixedFieldMap = {
                                    'Regional':'regional','Centro Zonal':'centrozonal','Modalidad':'modalidad','Servicio':'servicio',
                                    'Municipio':'municipio','Fecha Solicitud':'fechaSolicitud','Nombre':'entregaNombre',
                                    'Documento':'entregaDoc','Entidad':'entregaEntidad','NIT':'entregaNit','Fuente':'fuente','Modo Leche':'lecheModo'
                                };
                                if (col0 && fixedFieldMap[col0]) datosFijosDir[fixedFieldMap[col0]] = String(row[1]||'');
                                if (row[2] && fixedFieldMap[String(row[2]).trim()]) datosFijosDir[fixedFieldMap[String(row[2]).trim()]] = String(row[3]||'');
                                continue;
                            }
                            if (seccionActual === 'config') {
                                var cfgFieldMap = {
                                    'Regional App':'regional', 'Modalidad App':'modalidad', 'Operador':'operador',
                                    'Semana':'semana', 'Niños':'ninos', 'Días':'dias',
                                    'Modo Leche Semanal':'lecheModoSemanal', 'Modo Yogurt Semanal':'yogurtModoSemanal'
                                };
                                var _aplicarCfg = function(lbl, val) {
                                    var key = cfgFieldMap[lbl];
                                    if (!key) return;
                                    configSemanalDir[key] = (key === 'dias')
                                        ? String(val||'').split(',').filter(function(s){return s!=='';}).map(function(n){return parseInt(n);})
                                        : String(val||'');
                                };
                                if (col0) _aplicarCfg(col0, row[1]);
                                if (row[2]) _aplicarCfg(String(row[2]).trim(), row[3]);
                                continue;
                            }
                            if (seccionActual === 'gramajes') {
                                if (col0) {
                                    try { gramajesEntregaDir = JSON.parse(col0); } catch(e) { gramajesEntregaDir = null; }
                                }
                                seccionActual = null; // el JSON ocupa una sola fila
                                continue;
                            }
                            // UDS row: col0 is number (if headerOffset=1) or responsable (if headerOffset=0)
                            var num = parseInt(col0);
                            if (headerOffset === 1) {
                                // Format with # column: col0=#, col1=resp, col2=tel, col3=ent, col4=uni, col5=cod, col6=doc, col7=cob
                                if (isNaN(num) || !row[1]) continue;
                                uds.push({
                                    responsable: String(row[1]||'').trim(),
                                    telefono:    String(row[2]||'').trim(),
                                    entidad:     String(row[3]||'').trim(),
                                    unidad:      String(row[4]||'').trim(),
                                    codigo:      String(row[5]||'').trim(),
                                    documentoId: String(row[6]||'').trim(),
                                    cobertura:   parseInt(row[7]||0)||0
                                });
                            } else {
                                // Format without # column (plantilla simple): col0=resp, col1=tel, col2=ent, col3=uni, col4=cod, col5=cob, col6=doc
                                if (!row[0] || String(row[0]).trim() === '') continue;
                                uds.push({
                                    responsable: String(row[0]||'').trim(),
                                    telefono:    String(row[1]||'').trim(),
                                    entidad:     String(row[2]||'').trim(),
                                    unidad:      String(row[3]||'').trim(),
                                    codigo:      String(row[4]||'').trim(),
                                    cobertura:   parseInt(row[5]||0)||0,
                                    documentoId: String(row[6]||'').trim()
                                });
                            }
                        }

                        if (uds.length === 0 && Object.keys(datosFijosDir).length === 0) return;

                        dirs[nomFull] = {
                            nombre: nomFull,
                            contrato: contrato,
                            semana: semana,
                            mes: mes,
                            fecha: new Date().toISOString(),
                            uds: uds,
                            datosFijos: datosFijosDir,
                            configSemanal: configSemanalDir,
                            gramajesEntrega: gramajesEntregaDir
                        };
                        imported++;
                    });

                    tabSaveDirectoriosGuardados(dirs);
                    tabRefreshSelect();
                    showToast('✅ ' + imported + ' directorio(s) importado(s) desde Excel', 'success');
                } catch(err) {
                    showToast('❌ Error importando: ' + err.message, 'error');
                    console.error(err);
                }
            };
            reader.readAsArrayBuffer(file);
            input.value = '';
        }

        // Initialize tab on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Init date
            var hoy = new Date();
            var dateStr = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
            var df = document.getElementById('tab-dir-fecha');
            if (df && !df.value) df.value = dateStr;
            // Load saved directories list
            tabRefreshSelect();
            tabRenderizarDirectorio();
            // Load providers dropdown
            provRefreshSelectDirectorio();
            // Initialize auth UI
            initAuthUI();
        });

        // ═══════════════════════════════════════════════════════════════════
        //  AUTH SYSTEM - Login / Register / User State
        // ═══════════════════════════════════════════════════════════════════

        function initAuthUI() {
            // The onAuthStateChanged listener set in the module will call
            // onUserLoggedIn / onUserLoggedOut
            // Initially show login wall until auth resolves
            showLoginOverlay();
        }

        function showLoginOverlay() {
            document.getElementById('auth-overlay').style.display = 'flex';
            document.getElementById('auth-form-login').style.display = 'block';
            document.getElementById('auth-form-register').style.display = 'none';
            document.body.classList.add('auth-overlay-active');
        }

        function hideLoginOverlay() {
            document.getElementById('auth-overlay').style.display = 'none';
            document.body.classList.remove('auth-overlay-active');
        }

        function switchAuthTab(tab) {
            const loginForm = document.getElementById('auth-form-login');
            const regForm = document.getElementById('auth-form-register');
            const forgotForm = document.getElementById('auth-form-forgot');
            const headerLogin = document.getElementById('auth-header-login');
            const headerCompact = document.getElementById('auth-header-compact');
            const headerCompactTitle = document.getElementById('auth-header-compact-title');

            loginForm.style.display = 'none';
            regForm.style.display = 'none';
            forgotForm.style.display = 'none';

            if (tab === 'login') {
                loginForm.style.display = 'block';
                headerLogin.style.display = 'block';
                headerCompact.style.display = 'none';
            } else {
                headerLogin.style.display = 'none';
                headerCompact.style.display = 'flex';
                if (tab === 'register') {
                    regForm.style.display = 'block';
                    headerCompactTitle.textContent = 'Crear cuenta';
                } else if (tab === 'forgot') {
                    forgotForm.style.display = 'block';
                    headerCompactTitle.textContent = 'Recuperar clave';
                }
            }
            clearAuthErrors();
        }

        function clearAuthErrors() {
            document.getElementById('auth-error-login').textContent = '';
            document.getElementById('auth-error-register').textContent = '';
            const ef = document.getElementById('auth-error-forgot');
            const of = document.getElementById('auth-ok-forgot');
            if (ef) ef.textContent = '';
            if (of) of.textContent = '';
        }

        function showAuthError(id, msg) {
            document.getElementById(id).textContent = msg;
        }

        // Convierte un nombre de usuario a email interno para Firebase Auth
        // (comportamiento legado, se usa como último recurso si no hay dato en la base de datos)
        function usuarioAEmail(usuario) {
            // Si ya parece un email, lo usa directo; si no, lo convierte
            if (usuario.indexOf('@') !== -1) return usuario.toLowerCase().trim();
            // Limpiar: solo alfanumérico, puntos, guiones
            var limpio = usuario.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
            return limpio + '@app.local';
        }

        // Busca en la base de datos el correo real que usa Firebase Authentication para iniciar
        // sesión de esta cuenta (authEmailActual). Las cuentas nuevas usan directamente su correo
        // real; las cuentas antiguas siguen usando su correo local (@app.local) hasta que un
        // administrador las migre desde el panel administrativo.
        async function resolverEmailDeUsuario(usuarioInput) {
            if (usuarioInput.indexOf('@') !== -1) return usuarioInput.toLowerCase().trim();
            try {
                const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, 'usuarios'));
                if (snap.exists()) {
                    const data = snap.val();
                    const match = Object.values(data).find(u => (u.usuario || '').toLowerCase().trim() === usuarioInput.toLowerCase().trim());
                    if (match && match.authEmailActual) return match.authEmailActual;
                }
            } catch (e) { console.error('Error resolviendo email de usuario:', e); }
            // Fallback: comportamiento legado
            return usuarioAEmail(usuarioInput);
        }

        async function doLogin() {
            const usuario = document.getElementById('auth-email-login').value.trim();
            const pass = document.getElementById('auth-pass-login').value;
            if (!usuario || !pass) { showAuthError('auth-error-login','Completa todos los campos'); return; }
            const btn = document.getElementById('auth-btn-login');
            btn.disabled = true; btn.textContent = 'Ingresando...';
            try {
                const email = await resolverEmailDeUsuario(usuario);
                await window.firebaseSignIn(window.firebaseAuth, email, pass);
                // onUserLoggedIn will be called by onAuthStateChanged
            } catch(e) {
                let msg = 'Usuario o clave incorrectos';
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'Usuario o clave incorrectos';
                else if (e.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
                else if (e.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Intente más tarde';
                showAuthError('auth-error-login', msg);
            }
            btn.disabled = false; btn.textContent = 'Ingresar';
        }

        async function doRegister() {
            const nombre = document.getElementById('auth-nombre-register').value.trim();
            const usuario = document.getElementById('auth-email-register').value.trim();
            const correo = document.getElementById('auth-correo-register').value.trim().toLowerCase();
            const pass = document.getElementById('auth-pass-register').value;
            const pass2 = document.getElementById('auth-pass-register2').value;
            if (!nombre || !usuario || !correo || !pass) { showAuthError('auth-error-register','Completa todos los campos'); return; }
            const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
            if (!correoValido) { showAuthError('auth-error-register','Ingresa un correo electrónico válido'); return; }
            if (pass !== pass2) { showAuthError('auth-error-register','Las claves no coinciden'); return; }
            if (pass.length < 6) { showAuthError('auth-error-register','La clave debe tener al menos 6 caracteres'); return; }
            const btn = document.getElementById('auth-btn-register');
            btn.disabled = true; btn.textContent = 'Creando cuenta...';
            try {
                // El correo real ingresado por el usuario se usa DIRECTAMENTE como email de acceso en
                // Firebase Authentication (ya no se genera un correo local @app.local). Esto permite que
                // "Recuperar clave" funcione de forma genuina, ya que Firebase envía el enlace de
                // restablecimiento directamente a este correo.
                const cred = await window.firebaseCreateUser(window.firebaseAuth, correo, pass);
                await window.firebaseUpdateProfile(cred.user, { displayName: nombre });
                // Save user profile to DB
                const uid = cred.user.uid;
                const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid);
                await window.firebaseSet(userRef, {
                    nombre: nombre,
                    usuario: usuario,
                    correo: correo,
                    email: correo,
                    // authEmailActual es el correo que Firebase Authentication usa realmente para
                    // iniciar sesión de esta cuenta; para cuentas nuevas coincide con "correo".
                    authEmailActual: correo,
                    // NOTA: se guarda una copia de la clave en la base de datos únicamente para que el
                    // panel administrativo pueda mostrarla/editarla desde "Gestión de Claves", y para
                    // poder migrar el correo de cuentas antiguas de forma segura. Firebase Authentication
                    // guarda la clave real de forma segura y NO es legible desde aquí; esta copia es solo
                    // un registro de referencia para el equipo administrativo.
                    clave: pass,
                    rol: 'usuario',
                    creadoEn: new Date().toISOString(),
                    ultimoIngreso: new Date().toISOString()
                });
                // Log login
                logUserLogin(uid, nombre, correo);
            } catch(e) {
                let msg = 'Error al crear cuenta';
                if (e.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado';
                else if (e.code === 'auth/invalid-email') msg = 'Correo electrónico inválido';
                else if (e.code === 'auth/weak-password') msg = 'La clave es muy débil';
                showAuthError('auth-error-register', msg);
            }
            btn.disabled = false; btn.textContent = 'Crear cuenta';
        }

        async function doLogout() {
            try {
                await window.firebaseSignOut(window.firebaseAuth);
            } catch(e) { console.error(e); }
        }

        // ── Recuperar clave (correo obligatorio) ──
        async function enviarRecuperacionClave() {
            const correo = document.getElementById('auth-correo-forgot').value.trim().toLowerCase();
            const errEl = document.getElementById('auth-error-forgot');
            const okEl = document.getElementById('auth-ok-forgot');
            errEl.textContent = ''; okEl.textContent = '';
            if (!correo) { errEl.textContent = 'Ingresa tu correo electrónico'; return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { errEl.textContent = 'Ingresa un correo electrónico válido'; return; }
            const btn = document.getElementById('auth-btn-forgot');
            btn.disabled = true; btn.textContent = 'Enviando...';
            try {
                await window.firebaseSendPasswordReset(window.firebaseAuth, correo);
                okEl.textContent = '✅ Enlace enviado. Revisa tu correo (incluida la carpeta de spam).';
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    // Por seguridad no confirmamos si el correo existe o no
                    okEl.textContent = '✅ Si el correo está registrado, recibirás un enlace en unos minutos.';
                } else if (e.code === 'auth/invalid-email') {
                    errEl.textContent = 'Correo electrónico inválido';
                } else {
                    errEl.textContent = 'No se pudo enviar el enlace. Intenta de nuevo más tarde.';
                }
            }
            btn.disabled = false; btn.textContent = 'Enviar enlace de recuperación';
        }

        // ── Cambiar mi clave (usuario ya autenticado) ──
        function abrirCambiarClave() {
            document.getElementById('change-pass-actual').value = '';
            document.getElementById('change-pass-nueva').value = '';
            document.getElementById('change-pass-nueva2').value = '';
            document.getElementById('change-pass-error').textContent = '';
            document.getElementById('change-pass-overlay').style.display = 'flex';
        }

        function cerrarCambiarClave() {
            document.getElementById('change-pass-overlay').style.display = 'none';
        }

        async function guardarCambioClaveUsuario() {
            const actual = document.getElementById('change-pass-actual').value;
            const nueva = document.getElementById('change-pass-nueva').value;
            const nueva2 = document.getElementById('change-pass-nueva2').value;
            const errEl = document.getElementById('change-pass-error');
            errEl.textContent = '';
            if (!actual || !nueva || !nueva2) { errEl.textContent = 'Completa todos los campos'; return; }
            if (nueva !== nueva2) { errEl.textContent = 'Las claves nuevas no coinciden'; return; }
            if (nueva.length < 6) { errEl.textContent = 'La nueva clave debe tener al menos 6 caracteres'; return; }
            const btn = document.getElementById('change-pass-btn-guardar');
            btn.disabled = true; btn.textContent = 'Guardando...';
            try {
                await window.firebaseCambiarClavePropia(actual, nueva);
                // Mantener sincronizada la copia de referencia usada por el panel administrativo
                const user = window.firebaseAuth.currentUser;
                if (user) {
                    await window.firebaseSet(window.firebaseRef(window.firebaseDB, 'usuarios/' + user.uid + '/clave'), nueva);
                }
                showToast('Clave actualizada correctamente', 'success');
                cerrarCambiarClave();
            } catch (e) {
                let msg = 'No se pudo cambiar la clave';
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'La clave actual no es correcta';
                else if (e.code === 'auth/weak-password') msg = 'La nueva clave es muy débil';
                errEl.textContent = msg;
            }
            btn.disabled = false; btn.textContent = 'Guardar';
        }

        function logUserLogin(uid, nombre, email) {
            try {
                const logRef = window.firebaseRef(window.firebaseDB, 'user_logins/' + Date.now() + '_' + uid.substring(0,8));
                window.firebaseSet(logRef, {
                    uid: uid,
                    nombre: nombre || 'Sin nombre',
                    email: email || '',
                    timestamp: new Date().toISOString(),
                    fecha: new Date().toLocaleDateString('es-CO'),
                    hora: new Date().toLocaleTimeString('es-CO')
                });
                // Leer el último ingreso previo (antes de sobreescribirlo) para mostrarlo en "Mi Perfil"
                const userRef = window.firebaseRef(window.firebaseDB, 'usuarios/' + uid + '/ultimoIngreso');
                window.firebaseGet(userRef).then(snap => {
                    const previo = snap && snap.exists() ? snap.val() : null;
                    window._perfilUltimoIngresoPrevio = previo;
                    _actualizarCamposPerfilModal();
                }).catch(() => {});
                // Update last login on user profile
                window.firebaseSet(userRef, new Date().toISOString());
            } catch(e) { console.error('Error logging login', e); }
        }

        // Sincroniza los campos de texto del modal "Mi Perfil" con los datos disponibles.
        function _actualizarCamposPerfilModal() {
            const previo = window._perfilUltimoIngresoPrevio;
            const el = document.getElementById('profile-modal-ultimo-ingreso');
            if (!el) return;
            if (previo) {
                try {
                    el.textContent = new Date(previo).toLocaleString('es-CO');
                } catch(e) {
                    el.textContent = previo;
                }
            } else {
                el.textContent = 'Primer ingreso';
            }
        }

        function onUserLoggedIn(user) {
            hideLoginOverlay();
            // Establecer keys de almacenamiento exclusivos para este usuario
            setDirStorageKeyForUser(user.uid);
            // Update user info display
            const displayName = user.displayName || user.email || 'Usuario';
            const email = user.email || '';
            const inicial = displayName.charAt(0).toUpperCase();

            document.getElementById('user-display-name').textContent = displayName;
            document.getElementById('user-display-email').textContent = email;
            document.getElementById('user-avatar-letter').textContent = inicial;

            document.getElementById('user-display-name-lg').textContent = displayName;
            document.getElementById('user-display-email-lg').textContent = email;
            document.getElementById('user-avatar-letter-lg').textContent = inicial;

            document.getElementById('user-display-name-modal').textContent = displayName;
            document.getElementById('user-display-email-modal').textContent = email;
            document.getElementById('user-avatar-letter-modal').textContent = inicial;
            document.getElementById('profile-modal-email').textContent = email || '—';

            document.getElementById('userProfile').style.display = 'block';
            window._perfilUsuarioActual = { displayName, email, uid: user.uid };
            _actualizarCamposPerfilModal();
            _actualizarRegionalPerfilModal();
            // Log login event
            logUserLogin(user.uid, user.displayName, user.email);
            // Load user's directories from Firebase
            loadUserDirectories(user.uid);
            // Load user's proveedores from Firebase
            loadUserProveedores(user.uid);
            // Load user's savedLists from Firebase
            loadUserSavedLists(user.uid);
        }

        // Muestra en el modal de perfil la Regional/Modalidad activa actualmente
        function _actualizarRegionalPerfilModal() {
            const el = document.getElementById('profile-modal-regional');
            if (!el) return;
            try {
                const regional = (typeof currentRegional !== 'undefined' && currentRegional) ? currentRegional.toUpperCase() : (document.body.classList.contains('reg-gaitana') ? 'GAITANA' : 'NEIVA');
                const modalidad = (typeof currentModalidad !== 'undefined' && currentModalidad) ? currentModalidad.toUpperCase() : '';
                el.textContent = modalidad ? `${regional} · ${modalidad}` : regional;
            } catch(e) {
                el.textContent = '—';
            }
        }

        function abrirPerfilModal() {
            _actualizarCamposPerfilModal();
            _actualizarRegionalPerfilModal();
            document.getElementById('profile-modal-overlay').style.display = 'flex';
        }

        function cerrarPerfilModal() {
            document.getElementById('profile-modal-overlay').style.display = 'none';
        }

        function onUserLoggedOut() {
            showLoginOverlay();
            document.getElementById('userProfile').style.display = 'none';
            document.getElementById('userProfile').classList.remove('open');
            // Limpiar todos los datos en memoria al cerrar sesión
            try { tabSaveDirectoriosGuardados({}); tabRefreshSelect(); } catch(e) {}
            try { savedLists = []; updateSavedCount(); showSavedLists(); } catch(e) {}
            try { provSaveAllLocal([]); provRenderizar(); } catch(e) {}
            // Reset todas las keys a anónimo
            resetStorageKeysToAnon();
        }

        function loadUserDirectories(uid) {
            try {
                const dirRef = window.firebaseRef(window.firebaseDB, 'user_dirs/' + uid);
                window.firebaseOnValue(dirRef, (snap) => {
                    if (snap.exists()) {
                        // Cargar SOLO los directorios del usuario desde Firebase (no mezclar con otros)
                        const data = snap.val();
                        tabSaveDirectoriosGuardados(data);
                        tabRefreshSelect();
                        tabRenderizarDirectorio();
                    } else {
                        // Sin datos en Firebase: limpiar local para este usuario
                        tabSaveDirectoriosGuardados({});
                        tabRefreshSelect();
                    }
                }, { onlyOnce: true });
            } catch(e) { console.error('Error loading user dirs', e); }
        }

        // Guarda proveedores solo en localStorage (sin disparar sync Firebase, para evitar loop)
        function provSaveAllLocal(arr) {
            localStorage.setItem(PROVEEDORES_STORAGE_KEY, JSON.stringify(arr));
        }

        function loadUserProveedores(uid) {
            try {
                const ref = window.firebaseRef(window.firebaseDB, 'user_proveedores/' + uid);
                window.firebaseOnValue(ref, (snap) => {
                    if (snap.exists()) {
                        const data = snap.val();
                        const arr = Array.isArray(data) ? data : Object.values(data);
                        provSaveAllLocal(arr);
                    } else {
                        provSaveAllLocal([]);
                    }
                    try { provRenderizar(); provRefreshSelectDirectorio(); } catch(e) {}
                }, { onlyOnce: true });
            } catch(e) { console.error('Error loading user proveedores', e); }
        }

        function loadUserSavedLists(uid) {
            try {
                const ref = window.firebaseRef(window.firebaseDB, 'user_savedlists/' + uid);
                window.firebaseOnValue(ref, (snap) => {
                    if (snap.exists()) {
                        const data = snap.val();
                        savedLists = Array.isArray(data) ? data : Object.values(data);
                    } else {
                        savedLists = [];
                    }
                    // Sincronizar en localStorage del usuario
                    localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
                    try { updateSavedCount(); showSavedLists(); } catch(e) {}
                }, { onlyOnce: true });
            } catch(e) { console.error('Error loading user savedLists', e); }
        }


        

        // Hook into existing save functions to also save to Firebase
        const _origTabSave = typeof tabSaveDirectoriosGuardados === 'function' ? tabSaveDirectoriosGuardados : null;

        // ═══════════════════════════════════════════════════════════════════
        //  ADMIN PANEL - moved to login-style overlay
        // ═══════════════════════════════════════════════════════════════════

        function abrirAdmin() {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector('.nav-item[data-section="admin"]')?.classList.add('active');
            if (typeof toggleNavGroup === 'function') toggleNavGroup('admin', true);
            // Check if already admin-logged-in this session
            if (sessionStorage.getItem('adminLoggedIn') === 'true') {
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-dashboard').style.display = 'block';
                setupAuditoriaListener();
                sincronizarPendientes();
                cargarRegistrosAdmin();
                cargarListaUsuariosAdmin();
            } else {
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('admin-login').style.display = 'block';
                document.getElementById('admin-dashboard').style.display = 'none';
                document.getElementById('admin-clave').value = '';
                document.getElementById('admin-error').style.display = 'none';
                setTimeout(() => document.getElementById('admin-clave').focus(), 100);
            }
        }

        function cerrarAdmin() {
            document.getElementById('admin-panel').style.display = 'none';
        }

        function validarAdmin() {
            const clave = document.getElementById('admin-clave').value;
            if (clave === CLAVE_ADMIN) {
                sessionStorage.setItem('adminLoggedIn', 'true');
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-dashboard').style.display = 'block';
                const dot = document.getElementById('admin-fb-dot');
                const txt = document.getElementById('admin-fb-text');
                if (window.firebaseDB) {
                    dot.style.background = '#10b981';
                    dot.style.boxShadow = '0 0 6px #10b981';
                    txt.textContent = 'Firebase conectado';
                } else {
                    dot.style.background = '#ef4444';
                    txt.textContent = 'Sin conexión Firebase';
                }
                setupAuditoriaListener();
                sincronizarPendientes();
                cargarRegistrosAdmin();
                cargarListaUsuariosAdmin();
            } else {
                document.getElementById('admin-error').style.display = 'block';
                setTimeout(() => { document.getElementById('admin-error').style.display = 'none'; }, 3000);
            }
        }

        function cargarListaUsuariosAdmin() {
            if (!window.firebaseDB) return;
            const tbody = document.getElementById('admin-usuarios-tbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-secondary);">Cargando usuarios...</td></tr>';
            const usersRef = window.firebaseRef(window.firebaseDB, 'usuarios');
            window.firebaseGet(usersRef).then(snap => {
                if (!snap.exists()) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-secondary);">Sin usuarios registrados</td></tr>'; return; }
                const data = snap.val();
                const users = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
                users.sort((a,b) => (b.ultimoIngreso || '').localeCompare(a.ultimoIngreso || ''));
                // Se guarda en memoria para poder leerla al editar/cancelar sin volver a pedir a Firebase
                window._adminUsuariosCache = {};
                users.forEach(u => { window._adminUsuariosCache[u.uid] = u; });
                tbody.innerHTML = users.map(u => `
                    <tr style="border-bottom:1px solid var(--border);" id="admin-user-row-${u.uid}">
                        <td style="padding:0.4rem 0.6rem;">
                            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:0.7rem;font-weight:700;">${(u.nombre||u.email||'?').charAt(0).toUpperCase()}</div>
                        </td>
                        <td style="padding:0.4rem 0.6rem;font-size:0.78rem;">${u.nombre||'—'}</td>
                        <td style="padding:0.4rem 0.6rem;" id="admin-user-correo-cell-${u.uid}">
                            ${renderCorreoCellHtml(u)}
                        </td>
                        <td style="padding:0.4rem 0.6rem;font-size:0.72rem;color:var(--text-secondary);">${u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
                        <td style="padding:0.4rem 0.6rem;"><span style="background:rgba(16,185,129,0.1);color:#10b981;padding:0.1rem 0.4rem;border-radius:0.25rem;font-size:0.68rem;">${u.rol||'usuario'}</span></td>
                        <td style="padding:0.4rem 0.6rem;" id="admin-user-clave-cell-${u.uid}">
                            ${renderClaveCellHtml(u)}
                        </td>
                    </tr>
                `).join('');
                document.getElementById('admin-usuarios-count').textContent = users.length + ' usuarios';
            }).catch(e => { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--danger);">Error cargando usuarios</td></tr>'; });

            // Also load login history count
            const loginsRef = window.firebaseRef(window.firebaseDB, 'user_logins');
            window.firebaseGet(loginsRef).then(snap => {
                const count = snap.exists() ? Object.keys(snap.val()).length : 0;
                const el = document.getElementById('admin-logins-count');
                if (el) el.textContent = count + ' ingresos';
            }).catch(()=>{});
        }

        // ── Celda de correo: muestra el correo actual + si es un correo local (@app.local)
        //    muestra una advertencia y botón para migrarlo a un correo real. Si hay una migración
        //    en curso (correoPendiente) muestra el estado "pendiente de confirmación" con un botón
        //    para volver a comprobar si el usuario ya confirmó el enlace. ──
        function renderCorreoCellHtml(u) {
            const correoMostrar = u.correo || u.email || '—';
            const esLocal = /@app\.local$/i.test(u.authEmailActual || u.email || '');

            if (u.correoPendiente) {
                return `<span style="font-size:0.75rem;color:var(--text-secondary);">${correoMostrar}</span>
                    <div style="font-size:0.65rem;color:#f59e0b;margin-top:0.2rem;">⏳ Pendiente: <strong>${u.correoPendiente}</strong></div>
                    <div style="margin-top:0.25rem;display:flex;gap:0.3rem;">
                        <button onclick="verificarMigracionCorreoAdmin('${u.uid}')" title="Comprobar si ya confirmó" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#818cf8;border-radius:0.3rem;cursor:pointer;padding:0.15rem 0.4rem;font-size:0.65rem;">🔄 Verificar</button>
                        <button onclick="cancelarMigracionCorreoAdmin('${u.uid}')" title="Cancelar solicitud pendiente" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:0.3rem;cursor:pointer;padding:0.15rem 0.4rem;font-size:0.65rem;">✕ Cancelar</button>
                    </div>`;
            }

            const advertencia = esLocal
                ? `<div style="font-size:0.62rem;color:#f59e0b;margin-top:0.15rem;">⚠️ Correo local (sin recuperación real)</div>`
                : '';
            return `<span style="font-size:0.75rem;color:var(--text-secondary);" id="admin-user-correo-txt-${u.uid}">${correoMostrar}</span>
                <button onclick="mostrarEdicionCorreo('${u.uid}')" title="Cambiar correo" style="margin-left:0.3rem;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#818cf8;border-radius:0.3rem;cursor:pointer;padding:0.15rem 0.4rem;font-size:0.68rem;">✏️</button>
                ${advertencia}`;
        }

        function mostrarEdicionCorreo(uid) {
            const cell = document.getElementById('admin-user-correo-cell-' + uid);
            if (!cell) return;
            const u = window._adminUsuariosCache?.[uid] || {};
            const esLocal = /@app\.local$/i.test(u.authEmailActual || u.email || '');
            cell.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.3rem;">
                    <input type="email" id="admin-user-correo-input-${uid}" value="${(u.correo || u.email || '').replace(/"/g,'&quot;')}" placeholder="nombre@correo.com" style="width:150px;padding:0.25rem 0.4rem;background:var(--bg-dark);border:1px solid var(--border);border-radius:0.3rem;color:var(--text-primary);font-size:0.72rem;outline:none;">
                    <button onclick="guardarCorreoUsuarioAdmin('${uid}')" title="Guardar" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;border-radius:0.3rem;cursor:pointer;padding:0.2rem 0.4rem;font-size:0.7rem;">💾</button>
                    <button onclick="cargarListaUsuariosAdmin()" title="Cancelar" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:0.3rem;cursor:pointer;padding:0.2rem 0.4rem;font-size:0.7rem;">✕</button>
                </div>
                <div style="font-size:0.62rem;color:var(--text-secondary);margin-top:0.2rem;max-width:230px;line-height:1.35;">
                    ${esLocal
                        ? 'Esta cuenta usa un correo local (@app.local). Al guardar se enviará un enlace de verificación al correo nuevo; el cambio real solo se aplica cuando el usuario lo confirma desde su bandeja de entrada.'
                        : 'Esto actualiza el correo real de acceso de Firebase Authentication para esta cuenta.'}
                </div>
            `;
            setTimeout(() => document.getElementById('admin-user-correo-input-' + uid)?.focus(), 50);
        }

        async function guardarCorreoUsuarioAdmin(uid) {
            const input = document.getElementById('admin-user-correo-input-' + uid);
            if (!input) return;
            const nuevoCorreo = input.value.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo)) {
                showToast('Ingresa un correo electrónico válido', 'error');
                return;
            }
            const u = window._adminUsuariosCache?.[uid];
            if (!u) { showToast('No se encontró el usuario', 'error'); return; }

            const authEmailActual = u.authEmailActual || u.email;
            if (!authEmailActual) { showToast('No hay un correo de acceso registrado para esta cuenta', 'error'); return; }

            const esLocal = /@app\.local$/i.test(authEmailActual);

            if (!esLocal) {
                // El correo de acceso real ya es válido: solo actualizamos el registro de referencia.
                try {
                    await window.firebaseUpdate(window.firebaseRef(window.firebaseDB, 'usuarios/' + uid), {
                        correo: nuevoCorreo,
                        email: nuevoCorreo
                    });
                    if (window._adminUsuariosCache[uid]) {
                        window._adminUsuariosCache[uid].correo = nuevoCorreo;
                        window._adminUsuariosCache[uid].email = nuevoCorreo;
                    }
                    showToast('Correo de referencia actualizado. Nota: el acceso real de Firebase sigue siendo ' + authEmailActual + '.', 'success');
                    cargarListaUsuariosAdmin();
                } catch (e) {
                    showToast('Error al guardar el correo: ' + e.message, 'error');
                }
                return;
            }

            // Cuenta con correo local: se requiere enviar verificación al correo nuevo
            if (!u.clave) {
                showToast('No se puede migrar: no hay una clave guardada para esta cuenta. Primero fije una clave en la columna "Clave".', 'error');
                return;
            }

            showToast('Enviando enlace de verificación al nuevo correo...', 'success');
            try {
                await window.adminEnviarVerificacionCorreoUsuario(authEmailActual, u.clave, nuevoCorreo);
                await window.firebaseUpdate(window.firebaseRef(window.firebaseDB, 'usuarios/' + uid), {
                    correoPendiente: nuevoCorreo,
                    correoPendienteDesde: new Date().toISOString()
                });
                if (window._adminUsuariosCache[uid]) {
                    window._adminUsuariosCache[uid].correoPendiente = nuevoCorreo;
                }
                showToast('✅ Se envió un enlace de verificación a ' + nuevoCorreo + '. El usuario debe abrirlo desde ese correo para confirmar el cambio (revisar también spam). Usa "🔄 Verificar" luego para actualizar el estado.', 'success');
                cargarListaUsuariosAdmin();
            } catch (e) {
                console.error('Error enviando verificación de correo:', e);
                let msg = 'No se pudo enviar la verificación de correo';
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'La clave guardada para este usuario ya no es correcta; actualícela primero en la columna "Clave"';
                else if (e.code === 'auth/email-already-in-use') msg = 'Ese correo ya está en uso por otra cuenta';
                else if (e.code === 'auth/invalid-email') msg = 'Correo electrónico inválido';
                else if (e.code === 'auth/too-many-requests') msg = 'Demasiados intentos seguidos; espera unos minutos e inténtalo de nuevo';
                else if (e.code === 'auth/user-not-found') msg = 'El correo de acceso guardado (' + authEmailActual + ') ya no existe en Firebase; revisa el campo "authEmailActual" de esta cuenta';
                else if (e.code === 'auth/requires-recent-login') msg = 'Firebase pidió reautenticación reciente; intenta de nuevo';
                else if (e.code) msg = 'Error de Firebase (' + e.code + '): ' + (e.message || '');
                else if (e.message) msg = e.message;
                showToast(msg, 'error');
            }
        }

        // Comprueba si el usuario ya confirmó el enlace de verificación de su nuevo correo
        async function verificarMigracionCorreoAdmin(uid) {
            const u = window._adminUsuariosCache?.[uid];
            if (!u || !u.correoPendiente) return;
            if (!u.clave) {
                showToast('No se puede verificar: falta la clave guardada de este usuario', 'error');
                return;
            }
            const authEmailActual = u.authEmailActual || u.email;
            showToast('Comprobando estado...', 'success');
            try {
                const confirmado = await window.adminVerificarMigracionCorreo(authEmailActual, u.correoPendiente, u.clave);
                if (confirmado) {
                    await window.firebaseUpdate(window.firebaseRef(window.firebaseDB, 'usuarios/' + uid), {
                        correo: u.correoPendiente,
                        email: u.correoPendiente,
                        authEmailActual: u.correoPendiente,
                        correoPendiente: null,
                        correoPendienteDesde: null
                    });
                    showToast('✅ Correo confirmado y actualizado correctamente', 'success');
                    cargarListaUsuariosAdmin();
                } else {
                    showToast('Aún no ha sido confirmado. Pide al usuario que revise su correo (y spam) y haga clic en el enlace.', 'error');
                }
            } catch (e) {
                showToast('No se pudo comprobar el estado: ' + (e.message || 'error desconocido'), 'error');
            }
        }

        // Cancela una solicitud de verificación de correo pendiente (el enlace enviado simplemente dejará de usarse)
        async function cancelarMigracionCorreoAdmin(uid) {
            try {
                await mostrarConfirm('Se cancelará la solicitud de cambio de correo pendiente para este usuario.', {
                    titulo: '¿Cancelar solicitud?', icono: '✕', btnOk: 'Sí, cancelar'
                });
            } catch { return; }
            await window.firebaseUpdate(window.firebaseRef(window.firebaseDB, 'usuarios/' + uid), {
                correoPendiente: null,
                correoPendienteDesde: null
            });
            showToast('Solicitud cancelada', 'success');
            cargarListaUsuariosAdmin();
        }

        // ── Celda de clave: modo "oculta" (por defecto) / edición ──
        function renderClaveCellHtml(u) {
            if (!u.clave) {
                return `<span style="font-size:0.7rem;color:var(--text-secondary);font-style:italic;">Sin registro</span>
                    <button onclick="mostrarEdicionClave('${u.uid}')" title="Fijar clave" style="margin-left:0.35rem;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#818cf8;border-radius:0.3rem;cursor:pointer;padding:0.15rem 0.4rem;font-size:0.68rem;">✏️ Fijar</button>`;
            }
            return `<span style="font-family:monospace;font-size:0.75rem;" id="admin-user-clave-txt-${u.uid}">••••••••</span>
                <button onclick="toggleVerClave('${u.uid}')" title="Mostrar/ocultar clave" style="margin-left:0.3rem;background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.75rem;">👁️</button>
                <button onclick="mostrarEdicionClave('${u.uid}')" title="Cambiar clave" style="margin-left:0.15rem;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#818cf8;border-radius:0.3rem;cursor:pointer;padding:0.15rem 0.4rem;font-size:0.68rem;">✏️</button>`;
        }

        function toggleVerClave(uid) {
            const el = document.getElementById('admin-user-clave-txt-' + uid);
            if (!el) return;
            const u = window._adminUsuariosCache?.[uid];
            if (!u) return;
            const oculto = el.textContent.indexOf('•') !== -1;
            el.textContent = oculto ? (u.clave || '') : '••••••••';
        }

        function mostrarEdicionClave(uid) {
            const cell = document.getElementById('admin-user-clave-cell-' + uid);
            if (!cell) return;
            const u = window._adminUsuariosCache?.[uid] || {};
            cell.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.3rem;">
                    <input type="text" id="admin-user-clave-input-${uid}" value="${u.clave ? u.clave.replace(/"/g,'&quot;') : ''}" placeholder="Nueva clave (mín. 6 caract.)" style="width:140px;padding:0.25rem 0.4rem;background:var(--bg-dark);border:1px solid var(--border);border-radius:0.3rem;color:var(--text-primary);font-size:0.72rem;font-family:monospace;outline:none;">
                    <button onclick="guardarClaveUsuarioAdmin('${uid}')" title="Guardar" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;border-radius:0.3rem;cursor:pointer;padding:0.2rem 0.4rem;font-size:0.7rem;">💾</button>
                    <button onclick="cargarListaUsuariosAdmin()" title="Cancelar" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:0.3rem;cursor:pointer;padding:0.2rem 0.4rem;font-size:0.7rem;">✕</button>
                </div>
                <div style="font-size:0.62rem;color:var(--text-secondary);margin-top:0.2rem;max-width:220px;line-height:1.35;">
                    Esto actualiza el registro visible para el equipo administrativo. No reemplaza la clave real de acceso (Firebase Authentication) del usuario.
                </div>
            `;
            setTimeout(() => document.getElementById('admin-user-clave-input-' + uid)?.focus(), 50);
        }

        async function guardarClaveUsuarioAdmin(uid) {
            const input = document.getElementById('admin-user-clave-input-' + uid);
            if (!input) return;
            const nuevaClave = input.value.trim();
            if (nuevaClave.length < 6) {
                showToast('La clave debe tener al menos 6 caracteres', 'error');
                return;
            }
            if (!window.firebaseDB) {
                showToast('Firebase no disponible', 'error');
                return;
            }
            try {
                await window.firebaseSet(
                    window.firebaseRef(window.firebaseDB, 'usuarios/' + uid + '/clave'),
                    nuevaClave
                );
                if (window._adminUsuariosCache && window._adminUsuariosCache[uid]) {
                    window._adminUsuariosCache[uid].clave = nuevaClave;
                }
                showToast('Clave actualizada en el registro administrativo', 'success');
                cargarListaUsuariosAdmin();
            } catch (e) {
                showToast('Error al guardar la clave: ' + e.message, 'error');
            }
        }

