        // ==================== FUNCIONES LISTADO MENSUAL ====================
        // Las semanas 1-5 usan claves enteras. Una "semana repetida" (duplicado de
        // una semana patron con otros dias) usa una clave decimal, ej: 1.01, 1.02...
        // Math.floor(clave) siempre da la semana patron (1-5) para buscar los gramajes (mId).
        let repeatedWeekCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        function wkId(weekKey) {
            return String(weekKey).replace('.', '_');
        }

        function toggleWeek(weekNum) {
            const card = document.getElementById(`week-${wkId(weekNum)}`);
            const checkbox = document.getElementById(`check-week-${wkId(weekNum)}`);
            
            if (monthlyActiveWeeks.has(weekNum)) {
                monthlyActiveWeeks.delete(weekNum);
                card.classList.remove('active');
                checkbox.checked = false;
                card.querySelectorAll('.week-day-chip').forEach(chip => chip.classList.remove('selected'));
            } else {
                monthlyActiveWeeks.set(weekNum, new Set());
                card.classList.add('active');
                checkbox.checked = true;
            }
        }

        function toggleWeekDay(weekNum, dayNum) {
            if (!monthlyActiveWeeks.has(weekNum)) toggleWeek(weekNum);
            
            const days = monthlyActiveWeeks.get(weekNum);
            const chip = document.querySelector(`#week-${wkId(weekNum)} .week-day-chip[data-day="${dayNum}"]`);
            
            if (days.has(dayNum)) {
                days.delete(dayNum);
                chip.classList.remove('selected');
            } else {
                days.add(dayNum);
                chip.classList.add('selected');
            }
            
            if (days.size === 0) toggleWeek(weekNum);
        }

        // ---------- Semana repetida (duplicado de una semana patron con otros dias) ----------
        function toggleRepeatWeekPicker() {
            const picker = document.getElementById('repeatWeekPicker');
            if (!picker) return;
            picker.style.display = (picker.style.display === 'none' || !picker.style.display) ? 'flex' : 'none';
        }

        function crearTarjetaSemanaRepetida(weekKey, patternWeek) {
            const dias = [['1', 'Lun'], ['2', 'Mar'], ['3', 'Mié'], ['4', 'Jue'], ['5', 'Vie']];
            const chipsHtml = dias.map(([num, label]) =>
                `<span class="week-day-chip" data-day="${num}" onclick="toggleWeekDay(${weekKey}, ${num})">${label}</span>`
            ).join('');
            const html = `
                <div class="week-card week-card-repeated active" id="week-${wkId(weekKey)}" onclick="toggleWeek(${weekKey})">
                    <button class="week-remove-btn no-print" onclick="event.stopPropagation(); eliminarSemanaRepetida(${weekKey})" title="Quitar esta semana repetida">×</button>
                    <div class="week-header">
                        <div class="week-title">
                            <input type="checkbox" class="week-checkbox" id="check-week-${wkId(weekKey)}" checked onchange="event.stopPropagation(); toggleWeek(${weekKey})">
                            <span>Semana ${patternWeek}</span>
                            <span class="week-repeated-badge" title="Semana repetida">🔁 Repetida</span>
                        </div>
                    </div>
                    <div class="week-days" onclick="event.stopPropagation()">${chipsHtml}</div>
                </div>`;
            const selector = document.getElementById('weeksSelector');
            if (selector) selector.insertAdjacentHTML('beforeend', html);
        }

        function agregarSemanaRepetida(patternWeek) {
            repeatedWeekCounters[patternWeek] = (repeatedWeekCounters[patternWeek] || 0) + 1;
            const weekKey = patternWeek + (repeatedWeekCounters[patternWeek] / 100);
            crearTarjetaSemanaRepetida(weekKey, patternWeek);
            monthlyActiveWeeks.set(weekKey, new Set());
            const picker = document.getElementById('repeatWeekPicker');
            if (picker) picker.style.display = 'none';
            showToast(`Semana ${patternWeek} repetida añadida — elige sus días`, 'success');
        }

        function eliminarSemanaRepetida(weekKey) {
            monthlyActiveWeeks.delete(weekKey);
            const card = document.getElementById(`week-${wkId(weekKey)}`);
            if (card) card.remove();
        }

        function generarMensual() {
            const btn = document.getElementById('btnGenerarMensual');
            btn.classList.add('loading');
            
            setTimeout(() => {
                const personas = parseInt(document.getElementById('monthly-num-p').value) || 0;
                
                if (monthlyActiveWeeks.size === 0) {
                    showToast('Selecciona al menos una semana', 'error');
                    btn.classList.remove('loading');
                    return;
                }

                let hasDays = false;
                for (let days of monthlyActiveWeeks.values()) {
                    if (days.size > 0) { hasDays = true; break; }
                }
                
                if (!hasDays) {
                    showToast('Selecciona al menos un dia en las semanas elegidas', 'error');
                    btn.classList.remove('loading');
                    return;
                }
				
				const db = getCurrentDB();
                let resumen = {};

                monthlyActiveWeeks.forEach((days, weekNum) => {
                    const patternWeek = Math.floor(weekNum);
                    days.forEach(dayNum => {
                        const mId = `m${((patternWeek - 1) * 5) + dayNum}`;
                        db.forEach(p => {
                            const baseIndividual = (p.g[mId] || 0);
                            const cantTotal = baseIndividual * personas;
                            if (cantTotal > 0) {
                                if (!resumen[p.n]) resumen[p.n] = { u: p.u, c: p.c, weeks: {} };
                                if (!resumen[p.n].weeks[weekNum]) resumen[p.n].weeks[weekNum] = { qTotal: 0, qIndividual: 0, days: 0 };
                                resumen[p.n].weeks[weekNum].qTotal += cantTotal;
                                resumen[p.n].weeks[weekNum].qIndividual += baseIndividual;
                                resumen[p.n].weeks[weekNum].days++;
                            }
                        });
                    });
                });

                monthlyData = resumen; window.__actaMonthlyData = resumen;
                updateMonthlyCategoryCounts(resumen);
                applyMonthlyFilters();
                
                document.getElementById('monthlyResultContainer').style.display = 'block';
                document.getElementById('monthlyCatFilters').style.display = 'grid';
                document.getElementById('monthlySearchContainer').style.display = 'block';
                const monthlyEmptyState = document.getElementById('monthlyEmptyState');
                if (monthlyEmptyState) monthlyEmptyState.style.display = 'none';
                document.getElementById('monthlyLastUpdate').textContent = new Date().toLocaleTimeString();
                
                btn.classList.remove('loading');
                showToast('Listado mensual generado', 'success');
            }, 500);
        }

        function updateMonthlyCategoryCounts(data) {
            const counts = { granos: 0, proteinas: 0, lacteos: 0, verduras: 0, frutas: 0, panaderia: 0 };
            Object.values(data).forEach(item => { if (counts[item.c] !== undefined) counts[item.c]++; });
            Object.keys(counts).forEach(cat => {
                const el = document.getElementById(`monthly-count-${cat}`);
                if (el) el.textContent = counts[cat];
            });
        }

        function toggleMonthlyCategory(card, cat) {
            card.classList.toggle('active');
            if (card.classList.contains('active')) monthlyActiveFilters.add(cat);
            else monthlyActiveFilters.delete(cat);
            applyMonthlyFilters();
        }

        function filtrarBusquedaMensual(term) {
            monthlySearchTerm = term.toLowerCase();
            if (monthlyData) applyMonthlyFilters();
        }

        function applyMonthlyFilters() {
            if (!monthlyData) return;
            monthlyFilteredData = {};
            Object.entries(monthlyData).forEach(([name, item]) => {
                if (monthlyActiveFilters.has(item.c) && name.toLowerCase().includes(monthlySearchTerm)) {
                    monthlyFilteredData[name] = item;
                }
            });
            renderMonthlyTable(monthlyFilteredData);
            document.getElementById('monthlyTotalItems').textContent = Object.keys(monthlyFilteredData).length;
            updateMonthlyTotals();
        }

        function renderMonthlyTable(data) {
            const sortedWeeks = Array.from(monthlyActiveWeeks.keys()).sort((a, b) => a - b);
            const numWeeks = sortedWeeks.length;
            
            // Aplicar clase segun numero de semanas para anchos responsivos
            const table = document.getElementById('monthlyTable');
            table.className = 'monthly-table';
            if (numWeeks <= 2) table.classList.add('weeks-1-2');
            else if (numWeeks === 3) table.classList.add('weeks-3');
            
            // Headers
            let theadHtml = `<tr><th>Producto</th><th>Und.</th>`;
            sortedWeeks.forEach(week => {
                const patternWeek = Math.floor(week);
                const esRepetida = week % 1 !== 0;
                const label = esRepetida
                    ? `S${patternWeek}<span class="week-repeated-tag" title="Semana repetida">🔁</span>`
                    : `S${patternWeek}`;
                theadHtml += `<th class="week-header-col">${label}<br><small>Sug.</small></th>
                             <th class="week-header-col">${label}<br><small>Ent.</small></th>`;
            });
            theadHtml += `<th class="total-header">Total<br>Sug.</th><th class="total-header">Total<br>Ent.</th><th class="no-print" style="min-width:60px;">Det.</th></tr>`;
            document.getElementById('monthlyTableHead').innerHTML = theadHtml;
            
            // Body
            const sorted = Object.entries(data).sort((a, b) => 
                (ORDER_CATEGORIES[a[1].c] || 99) - (ORDER_CATEGORIES[b[1].c] || 99)
            );
            
            let tbodyHtml = '';
            sorted.forEach(([name, item], index) => {
                const idBase = `${currentRegional}_monthly_${name.replace(/\s/g, '')}`;
                const displayName = name.length > 18 ? name.substring(0, 16) + '...' : name;
                const nameEscaped = name.replace(/'/g, "\\'");
                
                tbodyHtml += `<tr style="animation-delay: ${index * 30}ms">
                    <td title="${name}"><div class="product-name"><div class="category-badge badge-${item.c}"></div>${displayName}</div></td>
                    <td style="text-align: center;"><span class="amount-badge">${item.u}</span></td>`;
                
                // TotalSug = SUMA DIRECTA de los valores comerciales mostrados en cada semana
                // Nunca se suman gramos crudos — se suman los strings ya formateados por semana.
                let sugeridosSemana = [];
                let totalEntrega = 0;

                sortedWeeks.forEach(week => {
                    const weekData = item.weeks[week];
                    if (weekData) {
                        const sugerido = formatCompacto(weekData.qTotal, item.u, name);
                        const valorEntrega = localStorage.getItem(`${ENTREGA_KEY_PREFIX}${idBase}_w${week}`) || '';

                        tbodyHtml += `<td class="suggested-cell" title="${weekData.qTotal.toFixed(2)} ${item.u}">${sugerido}</td>
							<td class="entrega-cell"><input type="number" class="input-entrega-mes ${valorEntrega ? 'saved' : ''}" value="${valorEntrega}" step="0.01" oninput="guardarEntregaMensual('${idBase}_w${week}', this.value, this)" placeholder="0" data-week="${week}"></td>`;

                        sugeridosSemana.push(sugerido);
                        totalEntrega += parseFloat(valorEntrega) || 0;
                    } else {
                        tbodyHtml += `<td class="suggested-cell">-</td><td class="entrega-cell">-</td>`;
                    }
                });

                // Sumar los valores comerciales de cada semana
                const totalSugDisplay = sumarYFormatearSugeridos(sugeridosSemana, item.u, name);
                
                tbodyHtml += `<td class="total-suggested">${totalSugDisplay}</td>
                             <td class="total-entrega" id="total-entrega-${idBase}">${totalEntrega > 0 ? totalEntrega.toFixed(1) + ' ' + item.u : '-'}</td>
                             <td class="no-print" style="text-align:center;"><button class="detail-btn" onclick="abrirDetalleProducto('${nameEscaped}')">🔍</button></td></tr>`;
            });
            
            document.getElementById('monthlyTableBody').innerHTML = tbodyHtml;
        }

        // sumarYFormatearSugeridos: suma los strings comerciales de cada semana activa
        // y devuelve el total formateado en la misma unidad comercial.
        // Soporta: "½ Lb", "1 Lb", "1 ½ Lb", "N Ud", "N ud", "N bolsa(s) 900ml",
        //          "N und 150ml", "N Lt", "N ml", números sueltos.
        function sumarYFormatearSugeridos(lista, unidad, nombreProducto) {
            if (!lista || lista.length === 0) return '-';
            var activos = lista.filter(function(s){ return s && s !== '-'; });
            if (activos.length === 0) return '-';

            var uNorm = (unidad || '').toLowerCase();

            // --- Detectar tipo por el primer valor activo ---
            var muestra = activos[0];

            // BOLSAS de leche
            if (/bolsa/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)/);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.round(total) + ' bolsa(s) 900ml';
            }

            // LITROS (aceite, leche en litros)
            if (/Lt$/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)\s*Lt/i);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return total + ' Lt';
            }

            // ML (leche en ml)
            if (/ml$/i.test(muestra) && !/bolsa/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)\s*ml/i);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.round(total) + ' ml';
            }

            // UNIDADES 150ml (yogurt, kumis)
            if (/und\s*150/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)/);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.ceil(total) + ' und 150ml';
            }

            // UNIDADES GENÉRICAS "N ud" (und simple)
            if (/^\d+\s*ud$/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+)/);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.round(total) + ' ud';
            }

            // UNIDADES tipo "N Ud" (ajo, etc.)
            if (/Ud$/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)\s*Ud/i);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.round(total) + ' Ud';
            }

            // GRAMOS exactos (proteínas especiales)
            if (/gr$/i.test(muestra)) {
                var total = activos.reduce(function(acc, s) {
                    var m = s.match(/^(\d+(?:\.\d+)?)\s*gr/i);
                    return acc + (m ? parseFloat(m[1]) : 0);
                }, 0);
                return Math.round(total) + ' gr';
            }

            // LIBRAS: "½ Lb", "1 Lb", "1 ½ Lb", "2 Lb" …
            if (/Lb/i.test(muestra)) {
                var totalLb = activos.reduce(function(acc, s) {
                    // "N ½ Lb"
                    var mMixed = s.match(/^(\d+)\s*½\s*Lb/i);
                    if (mMixed) return acc + parseFloat(mMixed[1]) + 0.5;
                    // "½ Lb"
                    if (/^½\s*Lb/i.test(s)) return acc + 0.5;
                    // "N Lb"
                    var mLb = s.match(/^(\d+(?:\.\d+)?)\s*Lb/i);
                    if (mLb) return acc + parseFloat(mLb[1]);
                    return acc;
                }, 0);
                if (totalLb <= 0) return '-';
                // Formatear el total en libras/medias libras
                if (totalLb % 1 === 0) return totalLb + ' Lb';
                var ent = Math.floor(totalLb);
                var dec = totalLb - ent;
                if (Math.abs(dec - 0.5) < 0.001) {
                    return (ent > 0 ? ent + ' ' : '') + '½ Lb';
                }
                // redondear al 0.5 más cercano
                var r = Math.round(totalLb * 2) / 2;
                if (r % 1 === 0) return r + ' Lb';
                return Math.floor(r) + ' ½ Lb';
            }

            // Fallback: número suelto
            var total = activos.reduce(function(acc, s) {
                var m = s.match(/^(\d+(?:\.\d+)?)/);
                return acc + (m ? parseFloat(m[1]) : 0);
            }, 0);
            return total > 0 ? (Math.round(total * 10) / 10) + ' ' + unidad : '-';
        }

                function formatCompacto(cantidad, unidad, nombreProducto) {
			if (unidad === 'und') return Math.round(cantidad) + ' ud';
			const uNorm = (unidad || '').toLowerCase();
			// Leche: usar modo seleccionado (debe ir ANTES del bloque genérico ml)
			if (nombreProducto && nombreProducto.toLowerCase().trim() === 'leche') {
				var modo = (document.getElementById('leche-modo-mensual')||{}).value || 'ml';
				return formatLecheConModo(cantidad, modo);
			}
			// Aceite u otros productos en ml: mostrar total real en litros
			if (uNorm === 'ml') {
				var litros = cantidad / 1000;
				// Redondear a múltiplos de 0.5 L comerciales
				var medios = Math.ceil(litros / 0.5);
				return (medios * 0.5) + ' Lt';
			}
			// Ajo: si el total en gramos es menor a 250g → 1 Ud
			const esAjo = nombreProducto && nombreProducto.toLowerCase().trim() === 'ajo';
			if (esAjo && (uNorm === 'gr' || uNorm === 'grs')) {
				if (cantidad < 250) return "1 Ud";
				return Math.ceil(cantidad / 250) + " Ud";
			}
			if (uNorm !== 'gr' && uNorm !== 'grs') return Math.round(cantidad) + ' ' + unidad;
			// Yogurt: usar modo seleccionado
			if (nombreProducto && nombreProducto.toLowerCase().trim() === 'yogurt') {
				var modoY = (document.getElementById('yogurt-modo-mensual')||{}).value || 'und150';
				return formatYogurtConModo(cantidad, modoY);
			}
			return redondearComercial(cantidad, unidad, nombreProducto);
		}

        function guardarEntregaMensual(idRef, valor, input) {
            // Guardar en localStorage
			localStorage.setItem(`${ENTREGA_KEY_PREFIX}${idRef}`, valor);
			input.classList.toggle('saved', !!valor);
			
			// Actualizar el total visual de esa fila inmediatamente
			actualizarTotalFila(input);
			
			// Actualizar totales globales
			updateMonthlyTotals();
        }
		
		function actualizarTotalFila(input) {
			// Encontrar la fila (tr) que contiene el input
			const fila = input.closest('tr');
			if (!fila) return;
			
			// Obtener todas las celdas de entrega de esta fila (inputs)
			const inputsEntrega = fila.querySelectorAll('.input-entrega-mes');
			
			let totalFila = 0;
			let tieneValores = false;
			
			inputsEntrega.forEach(inp => {
				const val = parseFloat(inp.value) || 0;
				if (val > 0) {
					totalFila += val;
					tieneValores = true;
				}
			});
			
			// Encontrar la celda de total (ultima td con clase total-entrega)
			const celdaTotal = fila.querySelector('.total-entrega');
			if (celdaTotal) {
				// Obtener la unidad de la fila (de la columna UND.)
				const celdaUnd = fila.querySelector('td:nth-child(2) .amount-badge');
				const unidad = celdaUnd ? celdaUnd.textContent : 'gr';
				
				if (tieneValores) {
					celdaTotal.textContent = totalFila.toFixed(1) + ' ' + unidad;
				} else {
					celdaTotal.textContent = '-';
				}
			}
		}

        function updateMonthlyTotals() {
			if (!monthlyFilteredData) return;
			
			const sortedWeeks = Array.from(monthlyActiveWeeks.keys()).sort((a, b) => a - b);
			let globalSugerido = 0;
			let globalEntrega = 0;
			
			// Recorrer cada producto en los datos filtrados
			Object.entries(monthlyFilteredData).forEach(([name, item]) => {
				const idBase = `${currentRegional}_monthly_${name.replace(/\s/g, '')}`;
				
				// Sumar sugeridos
				sortedWeeks.forEach(week => {
					if (item.weeks[week]) {
						globalSugerido += item.weeks[week].qTotal;
					}
				});
				
				// Sumar entregas
				sortedWeeks.forEach(week => {
					const storageKey = `${ENTREGA_KEY_PREFIX}${idBase}_w${week}`;
					const valorStorage = localStorage.getItem(storageKey);
					const input = document.querySelector(`input[data-week="${week}"]`);
					let valorFinal = 0;
					
					if (input && input.closest('tr')?.querySelector('td:first-child')?.textContent.includes(name)) {
						valorFinal = parseFloat(input.value) || 0;
					} else if (valorStorage) {
						valorFinal = parseFloat(valorStorage) || 0;
					}
					
					// Convertir entrega a gramos si es necesario (asumiendo que el input esta en la misma unidad)
					globalEntrega += valorFinal;
				});
			});
			
			// Funcion auxiliar para formatear en libras
			const formatLibras = (gramos) => {
				const libras = gramos / 500;
				if (libras === 0) return '0 Lb';
				if (libras === 0.25) return '¼ Lb';
				if (libras === 0.5) return '½ Lb';
				if (libras === 1) return '1 Lb';
				if (libras % 1 === 0) return `${libras} Lb`;
				return `${libras.toFixed(2)} Lb`;
			};
			
			// Actualizar UI
			const elSugerido = document.getElementById('totalSugeridoGlobal');
			const elEntrega = document.getElementById('totalEntregaGlobal');
			const elDiferencia = document.getElementById('diferenciaGlobal');
			
			if (elSugerido) elSugerido.textContent = formatLibras(globalSugerido);
			if (elEntrega) {
				elEntrega.textContent = formatLibras(globalEntrega);
				elEntrega.style.transform = 'scale(1.1)';
				setTimeout(() => elEntrega.style.transform = 'scale(1)', 200);
			}
			if (elDiferencia) {
				const diff = globalEntrega - globalSugerido;
				elDiferencia.textContent = formatLibras(diff);
				elDiferencia.style.color = diff >= 0 ? '#34d399' : '#f87171';
			}
		}

        function exportMonthlyExcel() {
            if (!monthlyFilteredData || Object.keys(monthlyFilteredData).length === 0) {
                showToast('No hay productos para exportar', 'error');
                return;
            }
            
            const sortedWeeks = Array.from(monthlyActiveWeeks.keys()).sort((a, b) => a - b);
            const data = Object.entries(monthlyFilteredData).map(([name, item]) => {
                const row = { Producto: name, Categoria: item.c, Unidad: item.u };
                sortedWeeks.forEach(week => {
                    const patternWeek = Math.floor(week);
                    const esRepetida = week % 1 !== 0;
                    const instancia = esRepetida ? Math.round((week - patternWeek) * 100) : 0;
                    const colLabel = esRepetida ? `Sem${patternWeek}_Rep${instancia}` : `Sem${patternWeek}`;
                    const weekData = item.weeks[week];
                    if (weekData) {
                        row[`${colLabel}_Sugerido`] = formatCompacto(weekData.qTotal, item.u, name);
                        const idBase = `${currentRegional}_monthly_${name.replace(/\s/g, '')}`;
                        row[`${colLabel}_Entrega`] = localStorage.getItem(`${ENTREGA_KEY_PREFIX}${idBase}_w${week}`) || '';
                    } else {
                        row[`${colLabel}_Sugerido`] = '-';
                        row[`${colLabel}_Entrega`] = '-';
                    }
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Listado_Mensual");
            XLSX.writeFile(wb, `ListadoMensual_${currentRegional}_${sortedWeeks.join('-')}.xlsx`);
            showToast(`Excel exportado: ${data.length} productos`, 'success');
        }

        function guardarListaMensual() {
            if (!monthlyData) { showToast('Genere un listado primero', 'error'); return; }
            abrirModalGuardar('mensual');
        }


