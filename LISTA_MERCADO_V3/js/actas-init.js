// ==================== MODULO ACTAS INIT ====================

        const CAT_LABEL = {
            granos: 'Grano',
            proteinas: 'Proteína',
            lacteos: 'Lácteos',
            verduras: 'Verdura',
            frutas: 'Fruta',
            panaderia: 'Pan'
        };

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

            var fechaDoc = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'});
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

    </script>
