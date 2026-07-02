// ==================== ACTAS + DIRECTORIO + PROVEEDORES ====================
        // =============================================
        // TEMPLATE XLSX BASE64 (formato original ICBF)
        // =============================================
        var ACTA_TEMPLATE_B64 = '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';

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
async function generarActaExcelXML(items, params, nombreArchivo) {
            if (!window.JSZip) {
                showToast('JSZip no disponible. Recarga la página.', 'error');
                return;
            }

            try {
                // Decode template
                var binaryStr = atob(ACTA_TEMPLATE_B64);
                var bytes = new Uint8Array(binaryStr.length);
                for (var i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

                var zip = await JSZip.loadAsync(bytes.buffer);
                var sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

                // ── Patch styles.xml: fuente sz=12, color relleno e3f0d9, wrapText en header ──
                try {
                    var stylesXml = await zip.file('xl/styles.xml').async('string');
                    // Cambiar tamaño de fuente a 12 para estilos de filas de datos (sz 8-11)
                    stylesXml = stylesXml.replace(/<sz val="([89]|10|11)"\s*\/>/g, '<sz val="12"/>');
                    // Reemplazar colores de relleno verde claro de filas de ítems → e3f0d9
                    stylesXml = stylesXml.replace(/E2EFDA/gi, 'e3f0d9');
                    stylesXml = stylesXml.replace(/D9EAD3/gi, 'e3f0d9');
                    stylesXml = stylesXml.replace(/EBF1DE/gi, 'e3f0d9');
                    // Habilitar wrapText en todos los xf existentes que tengan alineación
                    // Agregar wrapText="1" a alignment existentes o crear si no hay
                    stylesXml = stylesXml.replace(/<alignment([^/]*?)\/>/g, function(m, attrs) {
                        if (attrs.indexOf('wrapText') === -1) return '<alignment' + attrs + ' wrapText="1"/>';
                        return m;
                    });
                    zip.file('xl/styles.xml', stylesXml);
                } catch(styleErr) { console.warn('No se pudo parchear styles.xml:', styleErr); }

                // ── Eliminar validaciones de datos del template (listas desplegables no deseadas) ──
                // El template tiene una validacion extendida (x14:dataValidations) en la celda I12
                // con lista de genero (Femenino/Masculino/Intersexual) que referencia "Hoja1!$B$1:$B$3".
                // Hay que eliminar tanto el bloque estandar como el extendido (x14:) y todo el extLst.
                sheetXml = sheetXml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/g, '');
                // Eliminar TODA la sección extLst (contiene el x14:dataValidations con ref a Hoja1)
                sheetXml = sheetXml.replace(/<extLst>[\s\S]*?<\/extLst>/g, '');
                // Por si quedó algún x14 suelto
                sheetXml = sheetXml.replace(/<x14:dataValidations[\s\S]*?<\/x14:dataValidations>/g, '');

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
                var hoy = new Date();
                var todayFmt = String(hoy.getDate()).padStart(2,'0')+'/'+String(hoy.getMonth()+1).padStart(2,'0')+'/'+hoy.getFullYear();

                // ── Fill header ────────────────────────────────────────────────
                sheetXml = setCellDate(sheetXml, 'N1', "27/04/2026");
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

                // ── Row shifting when items > 6 ────────────────────────────────
                // Template: data rows 7-12 (6 rows), sep row 13, obs rows 14-15,
                //           signatures rows 16-23, footer rows 24-28
                var TMPL_DATA_ROWS = 6;
                var nItems = items.length;
                var nRows  = Math.max(nItems, TMPL_DATA_ROWS);
                var nExtra = nRows - TMPL_DATA_ROWS; // rows to insert

                if (nExtra > 0) {
                    // Extract row 12 as clone template
                    var r12s = sheetXml.indexOf('<row r="12"');
                    var r12e = sheetXml.indexOf('</row>', r12s) + 6;
                    var row12tmpl = sheetXml.substring(r12s, r12e);

                    // Build cloned rows 13..(12+nExtra)
                    var cloned = '';
                    for (var ex = 1; ex <= nExtra; ex++) {
                        var nr = 12 + ex;
                        var newRow = row12tmpl.split('r="12"').join('r="' + nr + '"');
                        'ABCDEFGHIJKLMN'.split('').forEach(function(col) {
                            newRow = newRow.split('r="' + col + '12"').join('r="' + col + nr + '"');
                        });
                        cloned += newRow;
                    }

                    // Renumber all rows >= 13 by +nExtra
                    // Process from the end to avoid double-replacement
                    // Find insertion point: just before the old row 13
                    var ins = sheetXml.indexOf('<row r="13"');

                    // Shift rows 13..28 → renumber each one
                    var tail = sheetXml.substring(ins);
                    // Renumber row references: r="NN" and r="XNN" for rows 13-99
                    // We go in descending order to avoid collision
                    for (var rn = 99; rn >= 13; rn--) {
                        // Row tag: <row r="NN"
                        tail = tail.split('<row r="' + rn + '"').join('<row r="' + (rn + nExtra) + '"');
                        // Cell refs: r="ANN" through r="NNN"
                        'ABCDEFGHIJKLMN'.split('').forEach(function(col) {
                            tail = tail.split('r="' + col + rn + '"').join('r="' + col + (rn + nExtra) + '"');
                        });
                    }

                    sheetXml = sheetXml.substring(0, ins) + cloned + tail;

                    // Update merge cells: shift all cell references with row >= 13
                    var mcStart = sheetXml.indexOf('<mergeCells');
                    var mcEnd   = sheetXml.indexOf('</mergeCells>') + 13;
                    if (mcStart !== -1) {
                        var mcBlock = sheetXml.substring(mcStart, mcEnd);
                        // Replace each cell ref that has row >= 13
                        mcBlock = mcBlock.replace(/([A-N])([0-9]+)/g, function(match, col, rowStr) {
                            var r = parseInt(rowStr);
                            return r >= 13 ? col + (r + nExtra) : match;
                        });
                        sheetXml = sheetXml.substring(0, mcStart) + mcBlock + sheetXml.substring(mcEnd);
                    }

                    // ── Add merge cells for the cloned data rows (rows 13..12+nExtra) ──
                    // Each cloned row (copied from row 12) needs J:K and L:N merges,
                    // matching the pattern of data rows 7-12 in the template.
                    // Without this, Excel detects missing merges and triggers a repair warning.
                    var mcStartFix = sheetXml.indexOf('<mergeCells');
                    var mcEndFix   = sheetXml.indexOf('</mergeCells>');
                    if (mcStartFix !== -1 && mcEndFix !== -1) {
                        var newMergesForClones = '';
                        for (var ex2 = 1; ex2 <= nExtra; ex2++) {
                            var nr2 = 12 + ex2;
                            newMergesForClones += '<mergeCell ref="J' + nr2 + ':K' + nr2 + '"/>';
                            newMergesForClones += '<mergeCell ref="L' + nr2 + ':N' + nr2 + '"/>';
                        }
                        // Insert new merges just before </mergeCells>
                        sheetXml = sheetXml.substring(0, mcEndFix) + newMergesForClones + sheetXml.substring(mcEndFix);
                        // Update the count attribute to reflect new total
                        sheetXml = sheetXml.replace(/<mergeCells count="\d+"/, function(m) {
                            var oldCount = parseInt(m.match(/\d+/)[0]);
                            return '<mergeCells count="' + (oldCount + nExtra * 2) + '"';
                        });
                    }

                    // Update dataValidations: shift all sqRef row numbers >= 13
                    var dvStart = sheetXml.indexOf('<dataValidations');
                    var dvEnd   = sheetXml.indexOf('</dataValidations>');
                    if (dvStart !== -1 && dvEnd !== -1) {
                        dvEnd += 18; // length of '</dataValidations>'
                        var dvBlock = sheetXml.substring(dvStart, dvEnd);
                        dvBlock = dvBlock.replace(/([A-N])([0-9]+)/g, function(match, col, rowStr) {
                            var r = parseInt(rowStr);
                            return r >= 13 ? col + (r + nExtra) : match;
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
                        // J = Cumple → "x"
                        sheetXml = setCellOrInsert(sheetXml, 'J' + rn, 'X');
                    }
                }

                // ── Observaciones ──────────────────────────────────────────────
                // Obs row is 14 + nExtra (merged A:N, rows 14-15+nExtra)
                var obsRow = 14 + nExtra;
                var obsText = 'OBSERVACIONES: ' + (params.observaciones || '');
                sheetXml = setCellInline(sheetXml, 'A' + obsRow, obsText);

                // ── Firmas / Datos de entrega ──────────────────────────────────
                // Template ICBF firma rows (shifted by nExtra). Layout:
                //   Row 17: "Firma:___" (A17:C17 merge) | "Firma:___" (G17:H17 merge)
                //   Row 19: LABEL A19:C19 | DATA VERDE → D19:E19  | LABEL G19:H19 | DATA VERDE → I19:J19
                //   Row 20: LABEL A20:C20 | DATA VERDE → D20:E20  | LABEL G20:H20 | DATA VERDE → I20:J20
                //   Row 21: LABEL A21:C21 | DATA VERDE → D21:E21
                //   Row 23: LABEL A23     | DATA VERDE → B23:C23
                // Data goes into the GREEN cells (D/I/B), NOT into the label cells (A/G).
                var r19 = 19 + nExtra;
                var r20 = 20 + nExtra;
                var r21 = 21 + nExtra;
                var r23 = 23 + nExtra;
                if (params.entregaNombre)  sheetXml = setCellOrInsert(sheetXml, 'D' + r19, params.entregaNombre);
                if (params.recibeNombre)   sheetXml = setCellOrInsert(sheetXml, 'I' + r19, params.recibeNombre);
                if (params.entregaDoc)     sheetXml = setCellOrInsert(sheetXml, 'D' + r20, params.entregaDoc);
                if (params.recibeDoc)      sheetXml = setCellOrInsert(sheetXml, 'I' + r20, params.recibeDoc);
                if (params.entregaEntidad) sheetXml = setCellOrInsert(sheetXml, 'D' + r21, params.entregaEntidad);
                if (params.entregaNit)     sheetXml = setCellOrInsert(sheetXml, 'B' + r23, params.entregaNit);

                // ── Update dimension ───────────────────────────────────────────
                var lastDataRow = 28 + nExtra;
                var newDim = 'ref="A1:N' + lastDataRow + '"';
                var dimS = sheetXml.indexOf('ref="A1:N');
                if (dimS !== -1) {
                    var dimE = sheetXml.indexOf('"', dimS + 9) + 1;
                    sheetXml = sheetXml.substring(0, dimS) + newDim + sheetXml.substring(dimE);
                }

                // ── Page setup: A4 landscape, fit 1×1, márgenes 1" todos los lados, centrado ─────
                // Márgenes en pulgadas: izquierda=1, derecha=1, arriba=1, abajo=1
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

                // pageSetup: A4 (paperSize=9), landscape, ajustar a 1 ancho × 1 alto (sin escala fija)
                var newPageSetup = '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1" r:id="rId1"/>';
                sheetXml = sheetXml.replace(/<pageSetup[^\/]*\/>/, newPageSetup);

                // Habilitar fitToPage en sheetProperties > pageSetUpPr
                if (sheetXml.indexOf('pageSetUpPr') === -1) {
                    // Insertar sheetProperties antes de <sheetViews>
                    sheetXml = sheetXml.replace(/<sheetViews>/, '<sheetProperties><pageSetUpPr fitToPage="1"/></sheetProperties><sheetViews>');
                } else {
                    sheetXml = sheetXml.replace(/fitToPage="[^"]*"/, 'fitToPage="1"');
                }

                // ── Write & download ───────────────────────────────────────────
                zip.file('xl/worksheets/sheet1.xml', sheetXml);

                var base64data = await zip.generateAsync({
                    type: 'base64',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    compression: 'DEFLATE'
                });

                var today2 = new Date();
                var dateStr = today2.getFullYear() + '-' + String(today2.getMonth()+1).padStart(2,'0') + '-' + String(today2.getDate()).padStart(2,'0');
                var safeName = (params.unidad || params.responsable || 'Acta')
                    .replace(/[^a-zA-Z0-9À-ɏ _-]/g, '').trim().substring(0, 30);
                var filename = nombreArchivo || ('Acta_F3MT1PP_' + (params.regional||'') + '_' + safeName + '_' + dateStr + '.xlsx');

                // Usar data URI para evitar que Windows marque el archivo con candado
                var a2 = document.createElement('a');
                a2.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + base64data;
                a2.download = filename;
                a2.click();

                if (typeof showToast === 'function') showToast('✅ Acta generada: ' + filename, 'success');
                return base64data;

            } catch(err) {
                console.error('Error generando acta:', err);
                if (typeof showToast === 'function') showToast('❌ Error: ' + err.message, 'error');
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


        // =============================================
        // GENERAR TODAS LAS ACTAS EN UN SOLO EXCEL
        // =============================================
        async function _generarTodasEnUnExcel(dirUDS, fuente, lecheModo, yogurtModo, fijos, prefijo) {
            if (!window.JSZip) { showToast('JSZip no disponible. Recarga la página.', 'error'); return; }
            var n = dirUDS.length;
            showToast('Generando ' + n + ' actas en un solo archivo...', 'success');
            try {
                // Cargar template base una sola vez
                var binaryStr = atob(ACTA_TEMPLATE_B64);
                var bytes = new Uint8Array(binaryStr.length);
                for (var bi = 0; bi < binaryStr.length; bi++) bytes[bi] = binaryStr.charCodeAt(bi);

                // ZIP maestro donde construiremos el workbook multi-hoja
                var zipMaestro = await JSZip.loadAsync(bytes.buffer);

                // Eliminar la hoja 2 del template (el template tiene 2 hojas, pero nosotros
                // construiremos todas las hojas desde cero para evitar conflictos)
                zipMaestro.remove('xl/worksheets/sheet2.xml');

                // Parchear styles.xml una sola vez
                try {
                    var stylesXml = await zipMaestro.file('xl/styles.xml').async('string');
                    stylesXml = stylesXml.replace(/<sz val="([89]|10|11)"\s*\/>/g, '<sz val="12"/>');
                    stylesXml = stylesXml.replace(/E2EFDA/gi, 'e3f0d9').replace(/D9EAD3/gi, 'e3f0d9').replace(/EBF1DE/gi, 'e3f0d9');
                    stylesXml = stylesXml.replace(/<alignment([^\/]*?)\/>/g, function(m, attrs) {
                        return attrs.indexOf('wrapText') === -1 ? '<alignment' + attrs + ' wrapText="1"/>' : m;
                    });
                    zipMaestro.file('xl/styles.xml', stylesXml);
                } catch(styleErr) { console.warn('styles.xml patch error:', styleErr); }

                var wbXml  = await zipMaestro.file('xl/workbook.xml').async('string');
                var wbRels = await zipMaestro.file('xl/_rels/workbook.xml.rels').async('string');
                var ctXml  = await zipMaestro.file('[Content_Types].xml').async('string');

                var sheetEntries = '';
                var relsEntries  = '';

                for (var i = 0; i < n; i++) {
                    var uds = dirUDS[i];
                    var coberturaUDS = uds.cobertura && uds.cobertura > 0 ? uds.cobertura : null;
                    var items = obtenerItemsActa(fuente, coberturaUDS, lecheModo, yogurtModo);
                    var params = Object.assign({}, fijos, uds, {
                        observaciones: '',
                        recibeNombre:  uds.responsable || '',
                        recibeDoc:     uds.documentoId || ''
                    });

                    var sheetNum  = i + 1;
                    var rId       = 'rId' + sheetNum;
                    var sheetFile = 'sheet' + sheetNum + '.xml';

                    // Generar sheetXml usando una copia limpia del template
                    var zipCopia = await JSZip.loadAsync(bytes.buffer);
                    var sheetXml = await _buildSheetXml(zipCopia, items, params);

                    zipMaestro.file('xl/worksheets/' + sheetFile, sheetXml);

                    // CORRECCIÓN CLAVE: cada hoja necesita su propio printerSettings único.
                    // Compartir el mismo printerSettings1.bin entre varias hojas hace que Excel
                    // detecte un conflicto de relaciones y active la reparación automática.
                    // Solución: copiar el binario de impresora con nombre único por hoja
                    // y apuntar cada _rels a su propio archivo.
                    var psFile = 'printerSettings' + sheetNum + '.bin';
                    try {
                        var psBin = await zipMaestro.file('xl/printerSettings/printerSettings1.bin').async('uint8array');
                        zipMaestro.file('xl/printerSettings/' + psFile, psBin);
                    } catch(psErr) { /* sin impresora, no crítico */ }

                    // Rels por hoja: rId1 → printerSettings propio, rId2 → drawing compartido
                    var perSheetRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
                        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/printerSettings" Target="../printerSettings/' + psFile + '"/>'
                        + '</Relationships>';
                    zipMaestro.file('xl/worksheets/_rels/' + sheetFile + '.rels', perSheetRels);

                    // Nombre de pestaña (máx 31 chars, sin caracteres inválidos Excel)
                    var tabName = ((uds.unidad || uds.responsable || ('Acta ' + sheetNum)) + '')
                        .replace(/[:\\\/\?\*\[\]]/g, '').trim().substring(0, 28) || ('Acta ' + sheetNum);

                    sheetEntries += '<sheet name="' + tabName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
                        + '" sheetId="' + sheetNum + '" r:id="' + rId + '"/>';
                    relsEntries  += '<Relationship Id="' + rId
                        + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"'
                        + ' Target="worksheets/' + sheetFile + '"/>';
                }

                // Actualizar workbook.xml — reemplazar <sheets>
                wbXml = wbXml.replace(/<sheets>[\s\S]*?<\/sheets>/, '<sheets>' + sheetEntries + '</sheets>');
                zipMaestro.file('xl/workbook.xml', wbXml);

                // Reconstruir workbook.xml.rels conservando relaciones que NO son worksheets
                // CORRECCIÓN: el regex anterior fallaba con relaciones que tienen atributos adicionales.
                // Ahora filtramos por el tipo de relación worksheet explícitamente.
                var otrasRels = '';
                var relMatches = wbRels.match(/<Relationship[^>]+\/>/g) || [];
                relMatches.forEach(function(rel) {
                    if (rel.indexOf('/worksheet') === -1) otrasRels += rel;
                });
                zipMaestro.file('xl/_rels/workbook.xml.rels',
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    + relsEntries + otrasRels + '</Relationships>');

                // Actualizar [Content_Types].xml — reemplazar overrides de worksheet.
                // NOTA: el template ya tiene <Default Extension="bin" .../>  que cubre
                // TODOS los .bin, así que NO hay que agregar Overrides para printerSettings.
                // FIX: el regex anterior usaba [^\/]* que falla porque el ContentType
                // contiene barras (.../spreadsheetml/...). Usar [^>]* para matchear hasta />.
                ctXml = ctXml.replace(/<Override PartName="\/xl\/worksheets\/[^"]*"[^>]*\/>/g, '');
                // Limpiar también cualquier Override residual de printerSettings
                ctXml = ctXml.replace(/<Override PartName="\/xl\/printerSettings\/[^"]*"[^>]*\/>/g, '');
                var newOverrides = '';
                for (var j = 1; j <= n; j++) {
                    newOverrides += '<Override PartName="/xl/worksheets/sheet' + j + '.xml"'
                        + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
                }
                ctXml = ctXml.replace('</Types>', newOverrides + '</Types>');
                zipMaestro.file('[Content_Types].xml', ctXml);

                // Generar y descargar
                var base64data = await zipMaestro.generateAsync({
                    type: 'base64',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    compression: 'DEFLATE'
                });
                var today2 = new Date();
                var dateStr = today2.getFullYear() + '-'
                    + String(today2.getMonth()+1).padStart(2,'0') + '-'
                    + String(today2.getDate()).padStart(2,'0');
                var filename = (prefijo||'Actas') + '_Directorio_' + n + 'UDS_' + dateStr + '.xlsx';

                // Usar data URI en lugar de blob URL para evitar que Windows marque
                // el archivo como descargado de internet (Zone.Identifier / candado)
                var a2 = document.createElement('a');
                a2.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + base64data;
                a2.download = filename;
                a2.click();
                showToast('✅ ' + n + ' actas en un solo archivo: ' + filename, 'success');

            } catch(err) {
                console.error('Error generando actas multi-hoja:', err);
                showToast('❌ Error: ' + err.message, 'error');
            }
        }

        // Construye el sheetXml de UNA acta reutilizando la lógica de generarActaExcelXML
        // pero recibe el zip de la copia del template y devuelve solo el XML procesado.
        async function _buildSheetXml(zip, items, params) {
            var sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

            // Eliminar validaciones de datos (estándar y extendidas x14)
            // El template tiene una validación en I12 que referencia "Hoja1!$B$1:$B$3"
            // (lista género). Al eliminar Hoja1 del workbook multi-hoja, Excel lanza error.
            // Eliminamos tanto el bloque estándar como el x14 dentro del extLst.
            sheetXml = sheetXml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/g, '');
            // Eliminar TODA la sección extLst (contiene el x14:dataValidations)
            sheetXml = sheetXml.replace(/<extLst>[\s\S]*?<\/extLst>/g, '');
            // Por si quedó algún x14 suelto
            sheetXml = sheetXml.replace(/<x14:dataValidations[\s\S]*?<\/x14:dataValidations>/g, '');

            function escXml(s) {
                return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/\r/g,'&#13;').replace(/\n/g,'&#10;');
            }
            function setCellInline(xml, ref, val) {
                if (!val && val !== 0) return xml;
                var esc = escXml(val);
                var si = xml.indexOf('<c r="' + ref + '"');
                if (si === -1) return xml;
                var gt = xml.indexOf('>', si);
                var ei = xml[gt-1]==='/' ? gt+1 : xml.indexOf('</c>',si)+4;
                if (ei < 4) return xml;
                var sm = xml.substring(si, gt+1).match(/\ss="(\d+)"/);
                var sA = sm ? ' s="'+sm[1]+'"' : '';
                return xml.substring(0,si)+'<c r="'+ref+'"'+sA+' t="inlineStr"><is><t xml:space="preserve">'+esc+'</t></is></c>'+xml.substring(ei);
            }
            function setCellOrInsert(xml, ref, val) {
                if (!val && val !== 0) return xml;
                if (xml.indexOf('<c r="'+ref+'"') !== -1) return setCellInline(xml, ref, val);
                var m = ref.match(/^([A-Z]+)(\d+)$/); if (!m) return xml;
                var rowTag = '<row r="'+m[2]+'"';
                var rs = xml.indexOf(rowTag); if (rs===-1) return xml;
                var rc = xml.indexOf('</row>',rs); if (rc===-1) return xml;
                var esc = escXml(val);
                return xml.substring(0,rc)+'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+esc+'</t></is></c>'+xml.substring(rc);
            }
            function setCellNum(xml, ref, num) {
                var si = xml.indexOf('<c r="'+ref+'"'); if (si===-1) return xml;
                var gt = xml.indexOf('>',si);
                var ei = xml[gt-1]==='/' ? gt+1 : xml.indexOf('</c>',si)+4;
                if (ei<4) return xml;
                var sm = xml.substring(si,gt+1).match(/\ss="(\d+)"/);
                var sA = sm ? ' s="'+sm[1]+'"' : '';
                return xml.substring(0,si)+'<c r="'+ref+'"'+sA+'><v>'+num+'</v></c>'+xml.substring(ei);
            }
            function setCellDate(xml, ref, dateStr) {
                if (!dateStr) return xml;
                var p = dateStr.split('/'); if (p.length!==3) return xml;
                var serial = Math.round((new Date(+p[2],+p[1]-1,+p[0])-new Date(1899,11,30))/86400000);
                return setCellNum(xml, ref, serial);
            }

            var fs = params.fechaSolicitud||''; var fechaFmt='';
            if (fs) { var fp=fs.split('-'); if(fp.length===3) fechaFmt=fp[2]+'/'+fp[1]+'/'+fp[0]; }

            sheetXml = setCellDate(sheetXml,'N1',"27/04/2026");
            sheetXml = setCellInline(sheetXml,'B4',params.regional    ||'NEIVA');
            sheetXml = setCellInline(sheetXml,'D4',params.centrozonal ||'NEIVA');
            sheetXml = setCellInline(sheetXml,'H4',params.modalidad   ||'HCB');
            sheetXml = setCellInline(sheetXml,'J4',params.servicio    ||'COMUNITARIO');
            sheetXml = setCellInline(sheetXml,'L4',params.municipio   ||'NEIVA');
            sheetXml = setCellInline(sheetXml,'B5',params.responsable ||'');
            sheetXml = setCellInline(sheetXml,'E5',params.telefono    ||'');
            sheetXml = setCellInline(sheetXml,'I5',params.entidad     ||'');
            sheetXml = setCellInline(sheetXml,'K5',params.unidad      ||'');
            sheetXml = setCellInline(sheetXml,'M5',params.codigo      ||'');

            var colsBlock='<cols>'
                +'<col min="2" max="2" width="28" bestFit="1" customWidth="1"/>'
                +'<col min="4" max="4" width="22" bestFit="1" customWidth="1"/>'
                +'<col min="5" max="5" width="16" bestFit="1" customWidth="1"/>'
                +'<col min="7" max="7" width="18" bestFit="1" customWidth="1"/>'
                +'<col min="9" max="9" width="36" bestFit="1" customWidth="1"/>'
                +'<col min="11" max="11" width="30" bestFit="1" customWidth="1"/>'
                +'<col min="13" max="13" width="16" bestFit="1" customWidth="1"/>'
                +'</cols>';
            var csS=sheetXml.indexOf('<cols>'), csE=sheetXml.indexOf('</cols>');
            if(csS!==-1&&csE!==-1) sheetXml=sheetXml.substring(0,csS)+colsBlock+sheetXml.substring(csE+7);
            else { var sdP=sheetXml.indexOf('<sheetData>'); if(sdP!==-1) sheetXml=sheetXml.substring(0,sdP)+colsBlock+sheetXml.substring(sdP); }

            // Row shift
            var TMPL_DATA_ROWS=6, nItems=items.length, nRows=Math.max(nItems,TMPL_DATA_ROWS), nExtra=nRows-TMPL_DATA_ROWS;
            if (nExtra>0) {
                var r12s=sheetXml.indexOf('<row r="12"'), r12e=sheetXml.indexOf('</row>',r12s)+6;
                var row12tmpl=sheetXml.substring(r12s,r12e);
                var cloned='';
                for(var ex=1;ex<=nExtra;ex++){
                    var nr=12+ex;
                    var newRow=row12tmpl.split('r="12"').join('r="'+nr+'"');
                    'ABCDEFGHIJKLMN'.split('').forEach(function(col){ newRow=newRow.split('r="'+col+'12"').join('r="'+col+nr+'"'); });
                    cloned+=newRow;
                }
                var ins=sheetXml.indexOf('<row r="13"');
                var tail=sheetXml.substring(ins);
                for(var rn=99;rn>=13;rn--){
                    tail=tail.split('<row r="'+rn+'"').join('<row r="'+(rn+nExtra)+'"');
                    'ABCDEFGHIJKLMN'.split('').forEach(function(col){
                        tail=tail.split('r="'+col+rn+'"').join('r="'+col+(rn+nExtra)+'"');
                    });
                }
                sheetXml=sheetXml.substring(0,ins)+cloned+tail;
                var mcS=sheetXml.indexOf('<mergeCells'), mcE=sheetXml.indexOf('</mergeCells>')+13;
                if(mcS!==-1){
                    var mcB=sheetXml.substring(mcS,mcE);
                    mcB=mcB.replace(/([A-N])([0-9]+)/g,function(m,col,rowStr){ var r=parseInt(rowStr); return r>=13?col+(r+nExtra):m; });
                    sheetXml=sheetXml.substring(0,mcS)+mcB+sheetXml.substring(mcE);
                    // Add merge cells for cloned data rows (13..12+nExtra): J:K and L:N per row
                    var mcEndClone = sheetXml.indexOf('</mergeCells>');
                    if (mcEndClone !== -1) {
                        var newMC = '';
                        for (var ex2=1; ex2<=nExtra; ex2++) {
                            var nr2 = 12+ex2;
                            newMC += '<mergeCell ref="J'+nr2+':K'+nr2+'"/><mergeCell ref="L'+nr2+':N'+nr2+'"/>';
                        }
                        sheetXml = sheetXml.substring(0, mcEndClone) + newMC + sheetXml.substring(mcEndClone);
                        sheetXml = sheetXml.replace(/<mergeCells count="\d+"/, function(m) {
                            var oldC = parseInt(m.match(/\d+/)[0]);
                            return '<mergeCells count="'+(oldC + nExtra*2)+'"';
                        });
                    }
                }
            }

            // Fill data rows
            for(var i=0;i<nRows;i++){
                var rn=7+i; var item=i<items.length?items[i]:null;
                sheetXml=setCellNum(sheetXml,'A'+rn,i+1);
                if(item){
                    sheetXml=setCellInline(sheetXml,'B'+rn,fechaFmt);
                    sheetXml=setCellInline(sheetXml,'C'+rn,item.componente||'');
                    sheetXml=setCellInline(sheetXml,'D'+rn,item.nombre||'');
                    var cantParaActa=(item.cantEntregaDigitada&&item.cantEntregaDigitada.trim())?item.cantEntregaDigitada.trim():item.cantSolicitada;
                    sheetXml=setCellInline(sheetXml,'G'+rn,cantParaActa||'');
                    sheetXml=setCellInline(sheetXml,'I'+rn,cantParaActa||'');
                    sheetXml=setCellOrInsert(sheetXml,'J'+rn,'X');
                }
            }

            var obsRow=14+nExtra;
            sheetXml=setCellInline(sheetXml,'A'+obsRow,'OBSERVACIONES: '+(params.observaciones||''));

            var r19=19+nExtra,r20=20+nExtra,r21=21+nExtra,r23=23+nExtra;
            if(params.entregaNombre)  sheetXml=setCellOrInsert(sheetXml,'D'+r19,params.entregaNombre);
            if(params.recibeNombre)   sheetXml=setCellOrInsert(sheetXml,'I'+r19,params.recibeNombre);
            if(params.entregaDoc)     sheetXml=setCellOrInsert(sheetXml,'D'+r20,params.entregaDoc);
            if(params.recibeDoc)      sheetXml=setCellOrInsert(sheetXml,'I'+r20,params.recibeDoc);
            if(params.entregaEntidad) sheetXml=setCellOrInsert(sheetXml,'D'+r21,params.entregaEntidad);
            if(params.entregaNit)     sheetXml=setCellOrInsert(sheetXml,'B'+r23,params.entregaNit);

            var lastDataRow=28+nExtra;
            var dimS=sheetXml.indexOf('ref="A1:N');
            if(dimS!==-1){ var dimE=sheetXml.indexOf('"',dimS+9)+1; sheetXml=sheetXml.substring(0,dimS)+'ref="A1:N'+lastDataRow+'"'+sheetXml.substring(dimE); }

            sheetXml=sheetXml.replace(/<pageMargins[^\/]*\/>/,'<pageMargins left="0.2" right="0.2" top="0.2" bottom="0.2" header="0.2" footer="0.2"/>');
            var printOpts='<printOptions horizontalCentered="1" verticalCentered="1"/>';
            if(sheetXml.indexOf('<printOptions')===-1) sheetXml=sheetXml.replace('<pageMargins',printOpts+'<pageMargins');
            else sheetXml=sheetXml.replace(/<printOptions[^\/]*\/>/,printOpts);
            sheetXml=sheetXml.replace(/<pageSetup[^\/]*\/>/,'<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1" r:id="rId1"/>');
            if(sheetXml.indexOf('pageSetUpPr')===-1)
                sheetXml=sheetXml.replace(/<sheetViews>/,'<sheetProperties><pageSetUpPr fitToPage="1"/></sheetProperties><sheetViews>');
            else sheetXml=sheetXml.replace(/fitToPage="[^"]*"/,'fitToPage="1"');

            return sheetXml;
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
            var itemsTest = obtenerItemsActa(fuente, null, lecheModo, yogurtModo);
            if (itemsTest.length === 0) {
                showToast('No hay productos. Genere primero la lista ' + fuente + '.','warning');
                return;
            }
            var fijos = getParamsFijos();
            await _generarTodasEnUnExcel(directorioUDS, fuente, lecheModo, yogurtModo, fijos, 'Acta_F3MT1PP');
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

        function tabToggleLeftPanel(wrapId) {
            var wrap = document.getElementById(wrapId);
            if (!wrap) return;
            var hidden = wrap.style.display === 'none';
            wrap.style.display = hidden ? '' : 'none';
            // Update button appearance
            var btnMap = { 'panel-datos-fijos-wrap': 'toggle-btn-fijos', 'panel-datos-entrega-wrap': 'toggle-btn-entrega' };
            var btn = document.getElementById(btnMap[wrapId]);
            if (!btn) return;
            if (hidden) {
                btn.style.opacity = '1';
                btn.style.textDecoration = 'none';
            } else {
                btn.style.opacity = '0.45';
                btn.style.textDecoration = 'line-through';
            }
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
            var porMes = {};
            names.forEach(function(name) {
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

            var bodyHtml = '';
            if (names.length === 0) {
                bodyHtml = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);font-size:0.85rem;">No hay directorios guardados</div>';
            } else {
                mesesOrdenados.forEach(function(mes) {
                    bodyHtml += '<div style="margin-bottom:0.75rem;">';
                    bodyHtml += '<div style="font-size:0.65rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;padding:0.3rem 0;border-bottom:1px solid var(--border);margin-bottom:0.35rem;">&#128197; ' + escHtml(mes) + '</div>';
                    bodyHtml += '<div style="display:flex;flex-direction:column;gap:0.25rem;">';
                    porMes[mes].forEach(function(item) {
                        var info = item.d.uds ? (item.d.uds.length + ' UDS') : '';
                        var semana = item.d.semana || '';
                        var fechaMeta = item.d.fecha ? new Date(item.d.fecha).toLocaleDateString('es-CO', {day:'2-digit',month:'short'}) : '';
                        var meta = [semana, info, fechaMeta].filter(Boolean).join(' · ');
                        var nameEsc = escHtml(item.name);
                        // Use data-name attribute to avoid JS injection in onclick
                        bodyHtml += '<div class="cp-item" data-name="' + nameEsc + '" style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.6rem;border-radius:0.4rem;cursor:pointer;border:1px solid transparent;transition:background 0.15s;">';
                        bodyHtml += '<span style="font-size:1rem;flex-shrink:0;">&#128193;</span>';
                        bodyHtml += '<div style="flex:1;min-width:0;">';
                        bodyHtml += '<div style="font-size:0.78rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nameEsc + '</div>';
                        if (meta) bodyHtml += '<div style="font-size:0.63rem;color:var(--text-secondary);">' + escHtml(meta) + '</div>';
                        bodyHtml += '</div>';
                        bodyHtml += '<button class="cp-del" data-name="' + nameEsc + '" style="flex-shrink:0;padding:0.1rem 0.35rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;" title="Eliminar">&#x2715;</button>';
                        bodyHtml += '</div>';
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

            // Event delegation: click on items and delete buttons
            body.addEventListener('click', function(e) {
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
                if (item) item.style.background = 'var(--bg-hover)';
            });
            body.addEventListener('mouseout', function(e) {
                var item = e.target.closest('.cp-item');
                if (item) item.style.background = '';
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
            delete dirs[nombre];
            tabSaveDirectoriosGuardados(dirs);
            tabRefreshSelect();
            document.getElementById('tab-btn-save-modified').style.display = 'none';
            var lbl = document.getElementById('tab-dir-loaded-label');
            if (lbl) lbl.style.display = 'none';
            showToast('Directorio "' + nombre + '" eliminado', 'success');
        }

        var MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // ── Captura snapshot de config+entregas de la lista activa ──
        // ── Elimina TODAS las claves de entrega del prefijo activo ──
        function _limpiarEntregasLocalStorage() {
            var keysToDelete = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(ENTREGA_KEY_PREFIX) === 0) {
                    keysToDelete.push(k);
                }
            }
            keysToDelete.forEach(function(k) { localStorage.removeItem(k); });
        }

        function _capturarConfigYEntregas() {
            var snapshot = {};
            if (currentData) {
                snapshot.configSemanal = _expConfigSemanal();
                snapshot.entregasSemanal = _expGetEntregasSemanal();
            }
            if (monthlyData) {
                snapshot.configMensual = _expConfigMensual();
                snapshot.entregasMensual = _expGetEntregasMensual();
            }
            return snapshot;
        }

        // ── Restaura config+entregas de un snapshot guardado ─────────
        function _restaurarConfigYEntregas(snapshot) {
            if (!snapshot) return;

            if (snapshot.configSemanal) {
                var cs = snapshot.configSemanal;
                if (cs.regional)   cambiarRegional(cs.regional);
                if (cs.modalidad) {
                    var ml = cs.modalidad.toLowerCase();
                    if (['hcb','cdi','hi'].indexOf(ml) !== -1) cambiarModalidad(ml);
                }
                var semEl = document.getElementById('sem');
                if (semEl && cs.semana) semEl.value = cs.semana;
                var numPEl = document.getElementById('num-p');
                if (numPEl && cs.cupos) numPEl.value = cs.cupos;
                if (cs.dias && cs.dias.length > 0) {
                    document.querySelectorAll('.d-ch').forEach(function(cb) {
                        cb.checked = cs.dias.indexOf(parseInt(cb.value)) !== -1;
                    });
                }
                if (cs.lecheModo) {
                    var elLS = document.getElementById('leche-modo-semanal'); if (elLS) elLS.value = cs.lecheModo;
                    var elLD = document.getElementById('tab-dir-leche-modo'); if (elLD) elLD.value = cs.lecheModo;
                    var elLM = document.getElementById('leche-modo-mensual'); if (elLM) elLM.value = cs.lecheModo;
                }
                if (cs.yogurtModo) {
                    var elYS = document.getElementById('yogurt-modo-semanal'); if (elYS) elYS.value = cs.yogurtModo;
                    var elYD = document.getElementById('tab-dir-yogurt-modo'); if (elYD) elYD.value = cs.yogurtModo;
                    var elYM2 = document.getElementById('yogurt-modo-mensual'); if (elYM2) elYM2.value = cs.yogurtModo;
                }
            }

            if (snapshot.entregasSemanal) {
                var regional = (snapshot.configSemanal && snapshot.configSemanal.regional) || currentRegional;
                Object.keys(snapshot.entregasSemanal).forEach(function(name) {
                    var val = snapshot.entregasSemanal[name];
                    if (val && val !== '') {
                        var idRef = regional + '_' + name.replace(/\s/g, '');
                        localStorage.setItem(ENTREGA_KEY_PREFIX + idRef, val);
                    }
                });
            }

            if (snapshot.configMensual) {
                var cm = snapshot.configMensual;
                var numPM = document.getElementById('monthly-num-p'); if (numPM && cm.cupos) numPM.value = cm.cupos;
                var elLMm = document.getElementById('leche-modo-mensual'); if (elLMm && cm.lecheModo) elLMm.value = cm.lecheModo;
                var elYMm = document.getElementById('yogurt-modo-mensual'); if (elYMm && cm.yogurtModo) elYMm.value = cm.yogurtModo;
                if (cm.semanas) {
                    try {
                        monthlyActiveWeeks.clear();
                        for (var i = 1; i <= 5; i++) {
                            var card = document.getElementById('week-' + i);
                            var checkbox = document.getElementById('check-week-' + i);
                            if (card) { card.classList.remove('active'); if (checkbox) checkbox.checked = false; }
                        }
                        cm.semanas.forEach(function(s) {
                            var wkNum = s.semana;
                            var daysSet = new Set(s.dias || []);
                            monthlyActiveWeeks.set(wkNum, daysSet);
                            var card2 = document.getElementById('week-' + wkNum);
                            var checkbox2 = document.getElementById('check-week-' + wkNum);
                            if (card2) {
                                card2.classList.add('active');
                                if (checkbox2) checkbox2.checked = true;
                                daysSet.forEach(function(d) {
                                    var chip = card2.querySelector('.week-day-chip[data-day="' + d + '"]');
                                    if (chip) chip.classList.add('selected');
                                });
                            }
                        });
                    } catch(ex) { console.warn('Error restaurando semanas mensuales:', ex); }
                }
            }

            if (snapshot.entregasMensual) {
                var regionalM = (snapshot.configMensual && snapshot.configMensual.regional) || currentRegional;
                Object.keys(snapshot.entregasMensual).forEach(function(name) {
                    var idBase = regionalM + '_monthly_' + name.replace(/\s/g, '');
                    Object.keys(snapshot.entregasMensual[name]).forEach(function(wKey) {
                        var val2 = snapshot.entregasMensual[name][wKey];
                        if (val2 && val2 !== '') {
                            localStorage.setItem(ENTREGA_KEY_PREFIX + idBase + '_' + wKey, val2);
                        }
                    });
                });
            }
        }

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
                    configSnapshot: _capturarConfigYEntregas(),
                    mes: dirs[nombre] ? dirs[nombre].mes : '',
                    semana: dirs[nombre] ? dirs[nombre].semana : '',
                    contrato: dirs[nombre] ? dirs[nombre].contrato : ''
                };
                tabSaveDirectoriosGuardados(dirs);
                tabRefreshSelect();
                document.getElementById('tab-dir-select').value = nombre;
                showToast('✅ Directorio "' + nombre + '" guardado (' + directorioUDS.length + ' UDS)', 'success');
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
                configSnapshot: _capturarConfigYEntregas()
            };
            tabSaveDirectoriosGuardados(dirs);
            tabRefreshSelect();
            document.getElementById('tab-dir-select').value = nombre;
            document.getElementById('tab-btn-save-modified').style.display = 'inline-block';
            document.getElementById('modal-guardar-dir').remove();
            showToast('✅ Directorio "' + nombre + '" guardado (' + directorioUDS.length + ' UDS)', 'success');
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
            tabRenderizarDirectorio();
            document.getElementById('tab-btn-save-modified').style.display = 'inline-block';
            // Limpiar TODAS las entregas del localStorage antes de cargar las del nuevo directorio
            _limpiarEntregasLocalStorage();
            // Restaurar configuración de lista y valores de entrega guardados con este directorio
            if (d.configSnapshot) {
                _restaurarConfigYEntregas(d.configSnapshot);
                showToast('✅ Directorio "' + nombre + '" cargado (' + directorioUDS.length + ' UDS) — config y entregas restauradas', 'success');
            } else {
                showToast('✅ Directorio "' + nombre + '" cargado (' + directorioUDS.length + ' UDS)', 'success');
            }
            // Update loaded label
            var lbl = document.getElementById('tab-dir-loaded-label');
            if (lbl) { lbl.textContent = '📂 ' + nombre; lbl.style.display = 'block'; lbl.title = nombre; }
            // Also sync to the floating panel
            sincronizarConPanelFlotante();
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

        function tabRenderizarDirectorio() {
            var count = directorioUDS.length;
            var totalCobertura = directorioUDS.reduce(function(sum, uds) { return sum + (parseInt(uds.cobertura) || 0); }, 0);
            var countEl = document.getElementById('tab-dir-count');
            var countBtnEl = document.getElementById('tab-dir-count-btn');
            var coberturaEl = document.getElementById('tab-dir-cobertura-total');
            if (countEl) countEl.textContent = count;
            if (countBtnEl) countBtnEl.textContent = count;
            if (coberturaEl) coberturaEl.textContent = totalCobertura;

            var empty = document.getElementById('tab-dir-empty-state');
            var preview = document.getElementById('tab-dir-preview-container');
            if (!empty || !preview) return;

            if (count === 0) { empty.style.display = 'block'; preview.style.display = 'none'; return; }
            empty.style.display = 'none';
            preview.style.display = 'block';

            var tbody = document.getElementById('tab-dir-preview-body');
            tbody.innerHTML = directorioUDS.map(function(uds, i) {
                var cob = uds.cobertura > 0 ? uds.cobertura : 0;
                return '<tr>' +
                    '<td style="color:var(--text-secondary);">' + (i+1) + '</td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.responsable) + '" onchange="directorioUDS[' + i + '].responsable=this.value" title="Editar responsable"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.telefono||'') + '" onchange="directorioUDS[' + i + '].telefono=this.value" style="width:6rem;"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.unidad||'') + '" onchange="directorioUDS[' + i + '].unidad=this.value"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.codigo||'') + '" onchange="directorioUDS[' + i + '].codigo=this.value" style="width:6rem;"></td>' +
                    '<td><input class="dir-editable" value="' + escHtml(uds.documentoId||'') + '" onchange="directorioUDS[' + i + '].documentoId=this.value" style="width:8rem;"></td>' +
                    '<td style="text-align:center;"><input class="dir-editable" type="number" min="0" value="' + cob + '" onchange="directorioUDS[' + i + '].cobertura=parseInt(this.value)||0;var c=document.getElementById(\'tab-dir-cobertura-total\');if(c)c.textContent=directorioUDS.reduce(function(s,u){return s+(parseInt(u.cobertura)||0);},0);" style="width:4rem;text-align:center;background:rgba(16,185,129,0.08);color:#10b981;font-weight:700;"></td>' +
                    '<td style="text-align:center;white-space:nowrap;">' +
                        '<button onclick="tabGenerarActaIndividualTab(' + i + ')" style="padding:0.15rem 0.4rem;background:rgba(5,150,105,0.1);border:1px solid rgba(5,150,105,0.3);color:#10b981;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;margin-right:0.2rem;" title="Generar acta">📥</button>' +
                        '<button onclick="tabEliminarUDS(' + i + ')" style="padding:0.15rem 0.4rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:0.25rem;cursor:pointer;font-size:0.65rem;" title="Eliminar">✕</button>' +
                    '</td></tr>';
            }).join('');
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
            await _generarTodasEnUnExcel(directorioUDS, fp.fuente, fp.lecheModo, fp.yogurtModo, fijos, 'Acta_F3MT1PP');
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
        // v2 — incluye configuración completa de lista semanal/mensual:
        //      regional, modalidad, semana, días, cupos, modo leche/yogurt,
        //      productos con cantidad sugerida Y entrega digitada.
        // =============================================

        // ── Helpers internos ──────────────────────────────────────────
        function _expGetEntregasSemanal() {
            // Recolectar todas las entregas de la lista semanal activa
            var entregas = {};
            if (!currentData) return entregas;
            Object.keys(currentData).forEach(function(name) {
                var idRef = currentRegional + '_' + name.replace(/\s/g, '');
                var v = localStorage.getItem(ENTREGA_KEY_PREFIX + idRef);
                if (v !== null && v !== '') entregas[name] = v;
            });
            return entregas;
        }

        function _expGetEntregasMensual() {
            // Recolectar entregas de la lista mensual activa, por semana
            var entregas = {}; // { nombreProducto: { w1: val, w2: val, ... } }
            if (!monthlyData) return entregas;
            var semanas = Array.from(monthlyActiveWeeks.keys());
            Object.keys(monthlyData).forEach(function(name) {
                var idBase = currentRegional + '_monthly_' + name.replace(/\s/g, '');
                semanas.forEach(function(wk) {
                    var v = localStorage.getItem(ENTREGA_KEY_PREFIX + idBase + '_w' + wk);
                    if (v !== null && v !== '') {
                        if (!entregas[name]) entregas[name] = {};
                        entregas[name]['w' + wk] = v;
                    }
                });
            });
            return entregas;
        }

        function _expConfigSemanal() {
            return {
                tipoLista:  'semanal',
                regional:   currentRegional,
                modalidad:  currentModalidad,
                semana:     (document.getElementById('sem') || {}).value || '1',
                cupos:      (document.getElementById('num-p') || {}).value || '0',
                dias:       Array.from(document.querySelectorAll('.d-ch:checked')).map(function(cb){ return parseInt(cb.value); }),
                lecheModo:  (document.getElementById('leche-modo-semanal') || {}).value || 'ml',
                yogurtModo: (document.getElementById('yogurt-modo-semanal') || {}).value || 'und150'
            };
        }

        function _expConfigMensual() {
            var semanas = [];
            monthlyActiveWeeks.forEach(function(days, week) {
                semanas.push({ semana: week, dias: Array.from(days) });
            });
            return {
                tipoLista:  'mensual',
                regional:   currentRegional,
                modalidad:  currentModalidad,
                cupos:      (document.getElementById('monthly-num-p') || {}).value || '0',
                semanas:    semanas,
                lecheModo:  (document.getElementById('leche-modo-mensual') || {}).value || 'ml',
                yogurtModo: (document.getElementById('yogurt-modo-mensual') || {}).value || 'und150'
            };
        }

        // ── EXPORTAR ─────────────────────────────────────────────────
        async function tabExportarDirectoriosExcel() {
            var dirs = tabLoadDirectoriosGuardados();
            var nombres = Object.keys(dirs);
            if (nombres.length === 0) { showToast('No hay directorios guardados para exportar', 'warning'); return; }
            if (typeof XLSX === 'undefined') { showToast('Librería XLSX no disponible', 'error'); return; }

            var wb = XLSX.utils.book_new();

            // ── Hoja: Índice ──────────────────────────────────────────
            var idxRows = [['Nombre', 'Contrato', 'Semana', 'Mes', 'Fecha Guardado', 'Total UDS']];
            nombres.forEach(function(nom) {
                var d = dirs[nom];
                idxRows.push([nom, d.contrato||'', d.semana||'', d.mes||'',
                    d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '', (d.uds||[]).length]);
            });
            var wsIdx = XLSX.utils.aoa_to_sheet(idxRows);
            wsIdx['!cols'] = [{wch:36},{wch:16},{wch:12},{wch:14},{wch:18},{wch:10}];
            XLSX.utils.book_append_sheet(wb, wsIdx, 'Índice');

            // ── Hoja: Configuración Lista (semanal o mensual activa) ──
            var tieneListaSemanal  = !!currentData;
            var tieneListaMensual  = !!monthlyData;
            var configRows = [['⚙️ CONFIGURACIÓN DE LISTA — v2', '']];

            if (tieneListaSemanal) {
                var cfgS = _expConfigSemanal();
                var entregasS = _expGetEntregasSemanal();
                configRows.push(['', '']);
                configRows.push(['▶ LISTA SEMANAL', '']);
                configRows.push(['Tipo Lista', 'semanal']);
                configRows.push(['Regional', cfgS.regional]);
                configRows.push(['Modalidad', cfgS.modalidad]);
                configRows.push(['Semana', cfgS.semana]);
                configRows.push(['Cupos (personas)', cfgS.cupos]);
                configRows.push(['Días seleccionados', cfgS.dias.join(',')]);
                configRows.push(['Modo Leche', cfgS.lecheModo]);
                configRows.push(['Modo Yogurt', cfgS.yogurtModo]);
                configRows.push(['', '']);
                configRows.push(['PRODUCTOS SEMANAL', '', '']);
                configRows.push(['Producto', 'Unidad', 'Cant. Sugerida (texto)', 'Cant. Total (num)', 'Cant. Individual', 'Entrega Digitada', 'Categoría']);
                var ORDER_CAT_EXP = { granos:1, lacteos:2, proteinas:3, verduras:4, frutas:5, panaderia:6 };
                var sortedS = Object.entries(currentData).sort(function(a,b){
                    return (ORDER_CAT_EXP[a[1].c]||99) - (ORDER_CAT_EXP[b[1].c]||99);
                });
                sortedS.forEach(function(pair) {
                    var name = pair[0]; var item = pair[1];
                    var sugerido = '';
                    try {
                        if (name.toLowerCase().trim() === 'leche') {
                            sugerido = formatLecheConModo(item.qTotal, cfgS.lecheModo);
                        } else if (name.toLowerCase().trim() === 'yogurt') {
                            sugerido = formatYogurtConModo(item.qTotal, cfgS.yogurtModo);
                        } else {
                            sugerido = redondearComercial(item.qTotal, item.u, name);
                        }
                    } catch(ex) { sugerido = item.qTotal.toFixed(2) + ' ' + item.u; }
                    configRows.push([name, item.u, sugerido, item.qTotal.toFixed(2), item.qIndividual.toFixed(2), entregasS[name]||'', item.c]);
                });
            }

            if (tieneListaMensual) {
                var cfgM = _expConfigMensual();
                var entregasM = _expGetEntregasMensual();
                var sortedWeeksM = cfgM.semanas.map(function(s){ return s.semana; }).sort(function(a,b){return a-b;});
                configRows.push(['', '']);
                configRows.push(['▶ LISTA MENSUAL', '']);
                configRows.push(['Tipo Lista', 'mensual']);
                configRows.push(['Regional', cfgM.regional]);
                configRows.push(['Modalidad', cfgM.modalidad]);
                configRows.push(['Cupos (personas)', cfgM.cupos]);
                configRows.push(['Modo Leche', cfgM.lecheModo]);
                configRows.push(['Modo Yogurt', cfgM.yogurtModo]);
                // Guardar semanas y días como JSON para reimportación exacta
                configRows.push(['Semanas JSON', JSON.stringify(cfgM.semanas)]);
                configRows.push(['', '']);
                // Encabezado tabla mensual: columnas dinámicas por semana
                var headM = ['Producto', 'Unidad', 'Categoría'];
                sortedWeeksM.forEach(function(wk) {
                    headM.push('S' + wk + ' Sug. (texto)');
                    headM.push('S' + wk + ' Sug. (num)');
                    headM.push('S' + wk + ' Entrega');
                });
                headM.push('Total Sugerido'); headM.push('Total Entrega');
                configRows.push(['PRODUCTOS MENSUAL'].concat(new Array(headM.length - 1).fill('')));
                configRows.push(headM);
                var ORDER_CAT_EXPM = { granos:1, lacteos:2, proteinas:3, verduras:4, frutas:5, panaderia:6 };
                var sortedM = Object.entries(monthlyData).sort(function(a,b){
                    return (ORDER_CAT_EXPM[a[1].c]||99) - (ORDER_CAT_EXPM[b[1].c]||99);
                });
                sortedM.forEach(function(pair) {
                    var name = pair[0]; var item = pair[1];
                    var rowM = [name, item.u, item.c];
                    var totalSugNum = 0; var totalEntrega = 0;
                    var sugTextos = [];
                    sortedWeeksM.forEach(function(wk) {
                        var wkData = item.weeks[wk];
                        if (wkData) {
                            var sugTxt = '';
                            try {
                                if (name.toLowerCase().trim() === 'leche') sugTxt = formatLecheConModo(wkData.qTotal, cfgM.lecheModo);
                                else if (name.toLowerCase().trim() === 'yogurt') sugTxt = formatYogurtConModo(wkData.qTotal, cfgM.yogurtModo);
                                else sugTxt = redondearComercial(wkData.qTotal, item.u, name);
                            } catch(ex) { sugTxt = wkData.qTotal.toFixed(2) + ' ' + item.u; }
                            var entVal = (entregasM[name] && entregasM[name]['w' + wk]) ? entregasM[name]['w' + wk] : '';
                            rowM.push(sugTxt);
                            rowM.push(wkData.qTotal.toFixed(2));
                            rowM.push(entVal);
                            totalSugNum += wkData.qTotal;
                            totalEntrega += parseFloat(entVal) || 0;
                            sugTextos.push(sugTxt);
                        } else {
                            rowM.push('-'); rowM.push(''); rowM.push('');
                        }
                    });
                    rowM.push(totalSugNum > 0 ? totalSugNum.toFixed(2) + ' ' + item.u : '-');
                    rowM.push(totalEntrega > 0 ? totalEntrega.toFixed(2) : '-');
                    configRows.push(rowM);
                });
            }

            if (!tieneListaSemanal && !tieneListaMensual) {
                configRows.push(['', '']);
                configRows.push(['⚠️ No hay lista semanal ni mensual generada al momento de exportar.', '']);
                configRows.push(['Genere una lista antes de exportar para incluir los productos y cantidades.', '']);
            }

            var wsCfg = XLSX.utils.aoa_to_sheet(configRows);
            wsCfg['!cols'] = [{wch:28},{wch:10},{wch:22},{wch:16},{wch:16},{wch:16},{wch:12}];
            XLSX.utils.book_append_sheet(wb, wsCfg, 'Config Lista');

            // ── Hoja: Datos Fijos ─────────────────────────────────────
            var primerDir = dirs[nombres[0]];
            if (primerDir && primerDir.datosFijos) {
                var f = primerDir.datosFijos;
                var fixedRows = [
                    ['⚙️ DATOS FIJOS DEL ACTA (aplican a todas)', ''],
                    ['Regional', f.regional||''], ['Centro Zonal', f.centrozonal||''],
                    ['Modalidad', f.modalidad||''], ['Servicio', f.servicio||''],
                    ['Municipio', f.municipio||''], ['Fecha Solicitud', f.fechaSolicitud||''],
                    ['', ''],
                    ['✍️ DATOS DE QUIEN ENTREGA', ''],
                    ['Nombre', f.entregaNombre||''], ['Documento', f.entregaDoc||''],
                    ['Entidad', f.entregaEntidad||''], ['NIT', f.entregaNit||''],
                    ['Fuente', f.fuente||''], ['Modo Leche', f.lecheModo||''],
                    ['Modo Yogurt', f.yogurtModo||'']
                ];
                var wsFixed = XLSX.utils.aoa_to_sheet(fixedRows);
                wsFixed['!cols'] = [{wch:25},{wch:40}];
                XLSX.utils.book_append_sheet(wb, wsFixed, 'Datos Fijos');
            }

            // ── Una hoja por directorio (UDS) ─────────────────────────
            nombres.forEach(function(nom) {
                var d = dirs[nom];
                var uds = d.uds || [];
                var sheetName = nom.substring(0,31).replace(/[\/\\\?\*\[\]]/g,'_');
                var rows = [
                    ['Directorio: ' + nom],
                    ['Contrato:', d.contrato||'', 'Semana:', d.semana||'', 'Mes:', d.mes||''],
                    [],
                    ['#','Responsable','Teléfono','Entidad','Unidad de Servicio','Código','Documento ID','Cobertura']
                ];
                uds.forEach(function(u, i) {
                    rows.push([i+1, u.responsable||'', u.telefono||'', u.entidad||'', u.unidad||'', u.codigo||'', u.documentoId||'', u.cobertura||0]);
                });
                if (d.datosFijos) {
                    var ff = d.datosFijos;
                    rows.push([]); rows.push(['⚙️ DATOS FIJOS DEL ACTA']);
                    rows.push(['Regional', ff.regional||'', 'Centro Zonal', ff.centrozonal||'']);
                    rows.push(['Modalidad', ff.modalidad||'', 'Servicio', ff.servicio||'']);
                    rows.push(['Municipio', ff.municipio||'', 'Fecha Solicitud', ff.fechaSolicitud||'']);
                    rows.push([]); rows.push(['✍️ DATOS DE QUIEN ENTREGA']);
                    rows.push(['Nombre', ff.entregaNombre||'', 'Documento', ff.entregaDoc||'']);
                    rows.push(['Entidad', ff.entregaEntidad||'', 'NIT', ff.entregaNit||'']);
                    rows.push(['Fuente', ff.fuente||'', 'Modo Leche', ff.lecheModo||'']);
                    rows.push(['Modo Yogurt', ff.yogurtModo||'', '', '']);
                }
                // ── Guardar configSnapshot (config+entregas) del directorio ──
                if (d.configSnapshot) {
                    rows.push([]); rows.push(['📦 CONFIG_SNAPSHOT_JSON', JSON.stringify(d.configSnapshot)]);
                }
                var ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{wch:4},{wch:28},{wch:14},{wch:22},{wch:28},{wch:10},{wch:14},{wch:10}];
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            var today = new Date();
            var dateStr2 = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
            XLSX.writeFile(wb, 'Directorios_UDS_' + dateStr2 + '.xlsx');
            showToast('✅ Exportación completa (' + nombres.length + ' directorios + config de lista)', 'success');
        }

        // ── IMPORTAR ─────────────────────────────────────────────────
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
                    var resumenImport = { dirs: 0, productos: 0, entregas: 0, configLista: false };

                    // ── Leer hoja "Datos Fijos" ───────────────────────────
                    if (wb.SheetNames.indexOf('Datos Fijos') !== -1) {
                        var wf = wb.Sheets['Datos Fijos'];
                        var rowsF = XLSX.utils.sheet_to_json(wf, {header:1, defval:''});
                        datosFijosGlobal = {};
                        var fieldMapGlobal = {
                            'Regional':'regional','Centro Zonal':'centrozonal','Modalidad':'modalidad','Servicio':'servicio',
                            'Municipio':'municipio','Fecha Solicitud':'fechaSolicitud','Nombre':'entregaNombre',
                            'Documento':'entregaDoc','Entidad':'entregaEntidad','NIT':'entregaNit',
                            'Fuente':'fuente','Modo Leche':'lecheModo','Modo Yogurt':'yogurtModo'
                        };
                        rowsF.forEach(function(row) {
                            if (row[0] && fieldMapGlobal[String(row[0]).trim()]) {
                                datosFijosGlobal[fieldMapGlobal[String(row[0]).trim()]] = String(row[1]||'');
                            }
                        });
                    }

                    // ── Leer hoja "Config Lista" (v2) ─────────────────────
                    if (wb.SheetNames.indexOf('Config Lista') !== -1) {
                        var wcl = wb.Sheets['Config Lista'];
                        var rowsCL = XLSX.utils.sheet_to_json(wcl, {header:1, defval:''});

                        var cfgLista = {};         // configuración general
                        var productosSemanal = []; // { producto, sugerido, total, individual, entrega, unidad, cat }
                        var productosMensual = []; // { producto, unidad, cat, semanas: {wN: {sug, num, entrega}} }
                        var modoActual = null;      // 'semanal' | 'mensual'
                        var headersSemanal = null;
                        var headersMensual = null;
                        var semanasJsonStr = '';

                        rowsCL.forEach(function(row) {
                            var c0 = String(row[0]||'').trim();
                            var c1 = String(row[1]||'').trim();

                            if (c0 === '▶ LISTA SEMANAL') { modoActual = 'semanal'; return; }
                            if (c0 === '▶ LISTA MENSUAL') { modoActual = 'mensual'; return; }

                            if (modoActual === 'semanal') {
                                if (c0 === 'Tipo Lista')           cfgLista.tipoLista = c1;
                                else if (c0 === 'Regional')        cfgLista.regional = c1;
                                else if (c0 === 'Modalidad')       cfgLista.modalidad = c1;
                                else if (c0 === 'Semana')          cfgLista.semana = c1;
                                else if (c0 === 'Cupos (personas)')cfgLista.cupos = c1;
                                else if (c0 === 'Días seleccionados') cfgLista.dias = c1 ? c1.split(',').map(function(x){ return parseInt(x.trim()); }).filter(function(x){ return !isNaN(x); }) : [];
                                else if (c0 === 'Modo Leche')      cfgLista.lecheModo = c1;
                                else if (c0 === 'Modo Yogurt')     cfgLista.yogurtModo = c1;
                                else if (c0 === 'Producto') {
                                    // Este es el encabezado de la tabla de productos semanales
                                    headersSemanal = row.map(function(h){ return String(h||'').trim(); });
                                }
                                else if (headersSemanal && c0 && c0 !== 'PRODUCTOS SEMANAL') {
                                    // Fila de producto semanal
                                    var iSug = headersSemanal.indexOf('Cant. Sugerida (texto)');
                                    var iTot = headersSemanal.indexOf('Cant. Total (num)');
                                    var iInd = headersSemanal.indexOf('Cant. Individual');
                                    var iEnt = headersSemanal.indexOf('Entrega Digitada');
                                    var iUnd = headersSemanal.indexOf('Unidad');
                                    var iCat = headersSemanal.indexOf('Categoría');
                                    productosSemanal.push({
                                        producto:   c0,
                                        unidad:     iUnd >= 0 ? String(row[iUnd]||'') : '',
                                        sugerido:   iSug >= 0 ? String(row[iSug]||'') : '',
                                        total:      iTot >= 0 ? parseFloat(row[iTot]) || 0 : 0,
                                        individual: iInd >= 0 ? parseFloat(row[iInd]) || 0 : 0,
                                        entrega:    iEnt >= 0 ? String(row[iEnt]||'') : '',
                                        cat:        iCat >= 0 ? String(row[iCat]||'') : ''
                                    });
                                }
                            }

                            if (modoActual === 'mensual') {
                                if (c0 === 'Tipo Lista')              { cfgLista.tipoListaMensual = c1; }
                                else if (c0 === 'Regional')           { cfgLista.regionalM = c1; }
                                else if (c0 === 'Modalidad')          { cfgLista.modalidadM = c1; }
                                else if (c0 === 'Cupos (personas)')   { cfgLista.cuposM = c1; }
                                else if (c0 === 'Modo Leche')         { cfgLista.lecheModoM = c1; }
                                else if (c0 === 'Modo Yogurt')        { cfgLista.yogurtModoM = c1; }
                                else if (c0 === 'Semanas JSON')       { semanasJsonStr = c1; }
                                else if (c0 === 'Producto' && String(row[1]||'').trim() === 'Unidad') {
                                    headersMensual = row.map(function(h){ return String(h||'').trim(); });
                                }
                                else if (headersMensual && c0 && c0 !== 'PRODUCTOS MENSUAL') {
                                    // Fila de producto mensual
                                    var iUndM = headersMensual.indexOf('Unidad');
                                    var iCatM = headersMensual.indexOf('Categoría');
                                    var prodM = {
                                        producto: c0,
                                        unidad:   iUndM >= 0 ? String(row[iUndM]||'') : '',
                                        cat:      iCatM >= 0 ? String(row[iCatM]||'') : '',
                                        semanas:  {}
                                    };
                                    // Detectar columnas S1/S2/... Ent.
                                    headersMensual.forEach(function(h, hIdx) {
                                        var mSug = h.match(/^S(\d+)\s+Sug\.\s+\(num\)$/);
                                        var mEnt = h.match(/^S(\d+)\s+Entrega$/);
                                        if (mSug) {
                                            var wkN = parseInt(mSug[1]);
                                            if (!prodM.semanas['w'+wkN]) prodM.semanas['w'+wkN] = {};
                                            prodM.semanas['w'+wkN].num = parseFloat(row[hIdx]) || 0;
                                        }
                                        if (mEnt) {
                                            var wkE = parseInt(mEnt[1]);
                                            if (!prodM.semanas['w'+wkE]) prodM.semanas['w'+wkE] = {};
                                            prodM.semanas['w'+wkE].entrega = String(row[hIdx]||'');
                                        }
                                    });
                                    productosMensual.push(prodM);
                                }
                            }
                        }); // fin rowsCL.forEach

                        // ── Restaurar config en la UI ─────────────────────
                        // Semanal
                        if (cfgLista.regional)   cambiarRegional(cfgLista.regional);
                        if (cfgLista.modalidad) {
                            var modLower = cfgLista.modalidad.toLowerCase();
                            if (['hcb','cdi','hi'].indexOf(modLower) !== -1) cambiarModalidad(modLower);
                        }
                        if (cfgLista.semana) {
                            var semEl = document.getElementById('sem');
                            if (semEl) semEl.value = cfgLista.semana;
                        }
                        if (cfgLista.cupos) {
                            var numPEl = document.getElementById('num-p');
                            if (numPEl) numPEl.value = cfgLista.cupos;
                        }
                        if (cfgLista.dias && cfgLista.dias.length > 0) {
                            document.querySelectorAll('.d-ch').forEach(function(cb) {
                                cb.checked = cfgLista.dias.indexOf(parseInt(cb.value)) !== -1;
                            });
                        }
                        if (cfgLista.lecheModo) {
                            var elLS = document.getElementById('leche-modo-semanal'); if (elLS) elLS.value = cfgLista.lecheModo;
                            var elLD = document.getElementById('tab-dir-leche-modo'); if (elLD) elLD.value = cfgLista.lecheModo;
                        }
                        if (cfgLista.yogurtModo) {
                            var elYS = document.getElementById('yogurt-modo-semanal'); if (elYS) elYS.value = cfgLista.yogurtModo;
                            var elYD = document.getElementById('tab-dir-yogurt-modo'); if (elYD) elYD.value = cfgLista.yogurtModo;
                        }

                        // Mensual
                        if (cfgLista.cuposM) {
                            var numPM = document.getElementById('monthly-num-p'); if (numPM) numPM.value = cfgLista.cuposM;
                        }
                        if (cfgLista.lecheModoM) {
                            var elLM = document.getElementById('leche-modo-mensual'); if (elLM) elLM.value = cfgLista.lecheModoM;
                        }
                        if (cfgLista.yogurtModoM) {
                            var elYM2 = document.getElementById('yogurt-modo-mensual'); if (elYM2) elYM2.value = cfgLista.yogurtModoM;
                        }

                        // Restaurar semanas mensuales en la UI
                        if (semanasJsonStr) {
                            try {
                                var semanasArr = JSON.parse(semanasJsonStr);
                                monthlyActiveWeeks.clear();
                                for (var i = 1; i <= 5; i++) {
                                    var card = document.getElementById('week-' + i);
                                    var checkbox = document.getElementById('check-week-' + i);
                                    if (card) { card.classList.remove('active'); if (checkbox) checkbox.checked = false; }
                                }
                                semanasArr.forEach(function(s) {
                                    var wkNum = s.semana;
                                    var daysSet = new Set(s.dias || []);
                                    monthlyActiveWeeks.set(wkNum, daysSet);
                                    var card = document.getElementById('week-' + wkNum);
                                    var checkbox = document.getElementById('check-week-' + wkNum);
                                    if (card) {
                                        card.classList.add('active');
                                        if (checkbox) checkbox.checked = true;
                                        daysSet.forEach(function(d) {
                                            var chip = card.querySelector('.week-day-chip[data-day="' + d + '"]');
                                            if (chip) chip.classList.add('selected');
                                        });
                                    }
                                });
                            } catch(ex) { console.warn('Error restaurando semanas mensuales:', ex); }
                        }

                        // ── Restaurar entregas en localStorage ────────────
                        // Semanal
                        productosSemanal.forEach(function(p) {
                            if (p.entrega && p.entrega !== '') {
                                var regional = cfgLista.regional || currentRegional;
                                var idRef = regional + '_' + p.producto.replace(/\s/g, '');
                                localStorage.setItem(ENTREGA_KEY_PREFIX + idRef, p.entrega);
                                resumenImport.entregas++;
                            }
                            resumenImport.productos++;
                        });

                        // Mensual
                        productosMensual.forEach(function(p) {
                            var regional = cfgLista.regionalM || currentRegional;
                            var idBase = regional + '_monthly_' + p.producto.replace(/\s/g, '');
                            Object.keys(p.semanas).forEach(function(wKey) {
                                var wkData = p.semanas[wKey];
                                if (wkData.entrega && wkData.entrega !== '') {
                                    localStorage.setItem(ENTREGA_KEY_PREFIX + idBase + '_' + wKey, wkData.entrega);
                                    resumenImport.entregas++;
                                }
                            });
                            resumenImport.productos++;
                        });

                        resumenImport.configLista = (productosSemanal.length > 0 || productosMensual.length > 0);
                    } // fin if Config Lista

                    // ── Procesar cada hoja de directorio (UDS) ────────────
                    wb.SheetNames.forEach(function(sheetName) {
                        if (sheetName === 'Índice' || sheetName === 'Datos Fijos' || sheetName === 'Config Lista') return;
                        var ws = wb.Sheets[sheetName];
                        var rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
                        if (rows.length < 4) return;

                        var nomFull = String(rows[0][0]||'').replace(/^Directorio:\s*/,'').trim();
                        if (!nomFull) nomFull = sheetName;

                        var contrato='', semana='', mes='', configSnapshotImport=null;
                        var r1 = rows[1] || [];
                        for (var ci=0; ci<r1.length-1; ci++) {
                            var lbl = String(r1[ci]||'').trim().replace(':','');
                            var val = String(r1[ci+1]||'').trim();
                            if (lbl==='Contrato') contrato=val;
                            else if (lbl==='Semana') semana=val;
                            else if (lbl==='Mes') mes=val;
                        }
                        // Buscar configSnapshot guardado en la hoja
                        rows.forEach(function(row) {
                            if (String(row[0]||'').trim() === '📦 CONFIG_SNAPSHOT_JSON' && row[1]) {
                                try { configSnapshotImport = JSON.parse(String(row[1])); } catch(ex) {}
                            }
                        });

                        var headerIdx = -1;
                        var headerOffset = 1;
                        for (var ri=0; ri<rows.length; ri++) {
                            var r0h = String(rows[ri][0]||'').trim().toLowerCase();
                            var r1h = String(rows[ri][1]||'').trim().toLowerCase();
                            if (r1h === 'responsable') { headerIdx=ri; headerOffset=1; break; }
                            if (r0h === 'responsable') { headerIdx=ri; headerOffset=0; break; }
                        }
                        if (headerIdx === -1) return;

                        var uds = [];
                        var datosFijosDir = datosFijosGlobal ? JSON.parse(JSON.stringify(datosFijosGlobal)) : {};
                        var inDatosFijos = false;
                        var fixedFieldMap2 = {
                            'Regional':'regional','Centro Zonal':'centrozonal','Modalidad':'modalidad','Servicio':'servicio',
                            'Municipio':'municipio','Fecha Solicitud':'fechaSolicitud','Nombre':'entregaNombre',
                            'Documento':'entregaDoc','Entidad':'entregaEntidad','NIT':'entregaNit',
                            'Fuente':'fuente','Modo Leche':'lecheModo','Modo Yogurt':'yogurtModo'
                        };
                        for (var ri2=headerIdx+1; ri2<rows.length; ri2++) {
                            var row2 = rows[ri2];
                            var col0 = String(row2[0]||'').trim();
                            if (col0.indexOf('DATOS FIJOS') !== -1 || col0.indexOf('QUIEN ENTREGA') !== -1) { inDatosFijos=true; continue; }
                            if (inDatosFijos) {
                                if (col0 && fixedFieldMap2[col0]) datosFijosDir[fixedFieldMap2[col0]] = String(row2[1]||'');
                                if (row2[2] && fixedFieldMap2[String(row2[2]).trim()]) datosFijosDir[fixedFieldMap2[String(row2[2]).trim()]] = String(row2[3]||'');
                                continue;
                            }
                            var num2 = parseInt(col0);
                            if (headerOffset === 1) {
                                if (isNaN(num2) || !row2[1]) continue;
                                uds.push({ responsable:String(row2[1]||'').trim(), telefono:String(row2[2]||'').trim(),
                                    entidad:String(row2[3]||'').trim(), unidad:String(row2[4]||'').trim(),
                                    codigo:String(row2[5]||'').trim(), documentoId:String(row2[6]||'').trim(), cobertura:parseInt(row2[7]||0)||0 });
                            } else {
                                if (!row2[0] || String(row2[0]).trim() === '') continue;
                                uds.push({ responsable:String(row2[0]||'').trim(), telefono:String(row2[1]||'').trim(),
                                    entidad:String(row2[2]||'').trim(), unidad:String(row2[3]||'').trim(),
                                    codigo:String(row2[4]||'').trim(), cobertura:parseInt(row2[5]||0)||0, documentoId:String(row2[6]||'').trim() });
                            }
                        }

                        if (uds.length === 0 && Object.keys(datosFijosDir).length === 0) return;
                        dirs[nomFull] = { nombre:nomFull, contrato:contrato, semana:semana, mes:mes,
                            fecha:new Date().toISOString(), uds:uds, datosFijos:datosFijosDir,
                            configSnapshot: configSnapshotImport || null };
                        imported++;
                    });

                    tabSaveDirectoriosGuardados(dirs);
                    tabRefreshSelect();
                    resumenImport.dirs = imported;

                    var msg = '✅ Importación completada: ' + imported + ' directorio(s)';
                    if (resumenImport.configLista) {
                        msg += ', ' + resumenImport.productos + ' producto(s) configurados';
                        if (resumenImport.entregas > 0) msg += ', ' + resumenImport.entregas + ' entrega(s) restauradas';
                        msg += '. Regenere la lista para visualizar.';
                    }
                    showToast(msg, 'success');
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

