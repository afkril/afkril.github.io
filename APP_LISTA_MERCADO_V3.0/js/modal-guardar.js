        // ==================== MODAL GUARDAR LISTA ====================
        var _smTipo = 'semanal'; // tipo activo del modal

        function abrirModalGuardar(tipo) {
            _smTipo = tipo;
            // Pre-set semana
            var semVal = (tipo === 'semanal') ? (document.getElementById('sem') ? document.getElementById('sem').value : '1') : 'SM';
            var smSemEl = document.getElementById('sm-semana');
            if (smSemEl) {
                smSemEl.value = (tipo === 'mensual') ? 'SM' : ('S' + semVal);
                if (!smSemEl.value) smSemEl.value = 'S1';
            }
            // Pre-set mes actual
            var meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            document.getElementById('sm-mes').value = meses[new Date().getMonth()];
            // Regional display
            var regEl = document.getElementById('sm-regional-display');
            if (regEl) regEl.value = (currentRegional === 'neiva' ? 'NEIVA' : 'GAITANA');
            // Badge
            document.getElementById('sm-tipo-badge').textContent = tipo === 'mensual' ? '📅 Listado Mensual' : '📋 Listado Semanal';
            // Limpiar nota/contrato
            document.getElementById('sm-nota').value = '';
            smActualizarPreview();
            document.getElementById('saveListOverlay').style.display = 'block';
            document.getElementById('saveListModal').style.display = 'block';
            setTimeout(() => document.getElementById('sm-contrato').focus(), 80);
        }

        function cerrarModalGuardar() {
            document.getElementById('saveListOverlay').style.display = 'none';
            document.getElementById('saveListModal').style.display = 'none';
        }

        function smActualizarPreview() {
            var sem      = (document.getElementById('sm-semana') || {}).value || 'S1';
            var mes      = (document.getElementById('sm-mes') || {}).value || '';
            var contrato = ((document.getElementById('sm-contrato') || {}).value || '').trim();
            var nota     = ((document.getElementById('sm-nota') || {}).value || '').trim();
            var reg      = currentRegional === 'neiva' ? 'NV' : 'GA';
            var parts    = [sem, mes, 'RG', reg];
            if (contrato) parts.push(contrato);
            if (nota) parts.push('·', nota);
            document.getElementById('sm-nombre-preview').textContent = parts.join(' ');
        }

        function smConfirmarGuardar() {
            var sem      = (document.getElementById('sm-semana') || {}).value || 'S1';
            var mes      = (document.getElementById('sm-mes') || {}).value || '';
            var contrato = ((document.getElementById('sm-contrato') || {}).value || '').trim();
            var nota     = ((document.getElementById('sm-nota') || {}).value || '').trim();
            var reg      = currentRegional === 'neiva' ? 'NV' : 'GA';
            var parts    = [sem, mes, 'RG', reg];
            if (contrato) parts.push(contrato);
            if (nota) parts.push('·', nota);
            var nombre = parts.join(' ');

            cerrarModalGuardar();

            if (_smTipo === 'semanal') {
                _doGuardarSemanal(nombre, sem, mes, contrato, nota);
            } else {
                _doGuardarMensual(nombre, sem, mes, contrato, nota);
            }
        }

        function _doGuardarSemanal(nombre, sm, mes, contrato, nota) {
            var semNum = document.getElementById('sem').value;
            var personas = document.getElementById('num-p').value;
            var diasSeleccionados = Array.from(document.querySelectorAll('.d-ch:checked')).map(cb => parseInt(cb.value));
            var entregas = {};
            Object.keys(currentData).forEach(function(name) {
                var idRef = currentRegional + '_' + name.replace(/\s/g, '');
                var v = localStorage.getItem(ENTREGA_KEY_PREFIX + idRef);
                if (v) entregas[name] = v;
            });
            var lista = {
                id: Date.now(),
                tipo: 'semanal',
                nombre: nombre,
                etiqueta: { semana: sm, mes: mes, contrato: contrato, nota: nota },
                regional: currentRegional,
                modalidad: currentModalidad,
                fecha: new Date().toISOString(),
                semana: semNum,
                personas: personas,
                dias: diasSeleccionados,
                filters: Array.from(activeFilters),
                lecheModo: (document.getElementById('leche-modo-semanal') || {}).value || 'ml',
                yogurtModo: (document.getElementById('yogurt-modo-semanal') || {}).value || 'und150',
                data: currentData,
                entregas: entregas
            };
            savedLists.unshift(lista);
            localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
            syncSavedListsToFirebase();
            updateSavedCount();
            showToast('✅ Lista guardada: ' + nombre, 'success');
        }

        function _doGuardarMensual(nombre, sm, mes, contrato, nota) {
            var lista = {
                id: Date.now(),
                tipo: 'mensual',
                nombre: nombre,
                etiqueta: { semana: sm, mes: mes, contrato: contrato, nota: nota },
                regional: currentRegional,
                modalidad: currentModalidad,
                fecha: new Date().toISOString(),
                semanas: Array.from(monthlyActiveWeeks.entries()).map(function([week, days]) { return { week: week, days: Array.from(days) }; }),
                personas: document.getElementById('monthly-num-p').value,
                filters: Array.from(monthlyActiveFilters),
                lecheModo: (document.getElementById('leche-modo-mensual') || {}).value || 'ml',
                yogurtModo: (document.getElementById('yogurt-modo-mensual') || {}).value || 'und150',
                data: monthlyData
            };
            savedLists.unshift(lista);
            localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
            syncSavedListsToFirebase();
            updateSavedCount();
            showToast('✅ Lista guardada: ' + nombre, 'success');
        }
        // ==================== FIN MODAL GUARDAR ====================

        // Sincroniza savedLists del usuario a Firebase Realtime DB
        function syncSavedListsToFirebase() {
            if (window.currentUser && window.firebaseDB) {
                try {
                    const uid = window.currentUser.uid;
                    const ref = window.firebaseRef(window.firebaseDB, 'user_savedlists/' + uid);
                    window.firebaseSet(ref, savedLists || []);
                } catch(e) { /* silent */ }
            }
        }

        function showSavedLists() {
			const container = document.getElementById('savedListsContainer');
			if (savedLists.length === 0) {
				container.innerHTML = '<div class="empty-state"><div class="empty-icon">💾</div><p>No hay listas guardadas</p></div>';
				return;
			}
			const mesesCorto = {ENERO:'Ene',FEBRERO:'Feb',MARZO:'Mar',ABRIL:'Abr',MAYO:'May',JUNIO:'Jun',JULIO:'Jul',AGOSTO:'Ago',SEPTIEMBRE:'Sep',OCTUBRE:'Oct',NOVIEMBRE:'Nov',DICIEMBRE:'Dic'};
			container.innerHTML = savedLists.map(l => {
				const esMensual = l.tipo === 'mensual';
				const badgeColor = esMensual ? '#8b5cf6' : '#2563eb';
				const badgeTxt   = esMensual ? 'MENSUAL' : 'SEMANAL';
				const etq = l.etiqueta || {};
				// Chips de etiqueta
				const chips = [
					etq.semana  ? `<span style="background:rgba(99,102,241,0.15);color:#a78bfa;border:1px solid rgba(99,102,241,0.25);padding:.1rem .45rem;border-radius:1rem;font-size:.6rem;font-weight:700;">${etq.semana}</span>` : '',
					etq.mes     ? `<span style="background:rgba(16,185,129,0.1);color:#34d399;border:1px solid rgba(16,185,129,0.2);padding:.1rem .45rem;border-radius:1rem;font-size:.6rem;font-weight:700;">${mesesCorto[etq.mes]||etq.mes}</span>` : '',
					etq.contrato? `<span style="background:rgba(245,158,11,0.1);color:#fbbf24;border:1px solid rgba(245,158,11,0.2);padding:.1rem .45rem;border-radius:1rem;font-size:.6rem;font-weight:700;">Cto ${etq.contrato}</span>` : '',
					l.lecheModo ? `<span style="background:rgba(6,182,212,0.08);color:#67e8f9;border:1px solid rgba(6,182,212,0.18);padding:.1rem .45rem;border-radius:1rem;font-size:.6rem;">🥛 ${l.lecheModo==='litros'?'L':'ml/und'}</span>` : '',
				].filter(Boolean).join(' ');
				const nota = etq.nota ? `<div style="font-size:.65rem;color:var(--text-secondary);margin-top:.15rem;font-style:italic;">📝 ${etq.nota}</div>` : '';
				return `
				<div style="padding:.85rem 1rem;border:1px solid var(--border);border-radius:.6rem;margin-bottom:.5rem;background:var(--bg-card);cursor:pointer;transition:border-color .15s;" onclick="loadSavedList(${l.id})" onmouseenter="this.style.borderColor='#6366f1'" onmouseleave="this.style.borderColor='var(--border)'">
					<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
						<div style="min-width:0;flex:1;">
							<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.3rem;">
								<span style="background:${badgeColor};color:#fff;padding:.1rem .45rem;border-radius:1rem;font-size:.58rem;font-weight:700;flex-shrink:0;">${badgeTxt}</span>
								<span style="font-size:.88rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.nombre}</span>
							</div>
							<div style="display:flex;flex-wrap:wrap;gap:.25rem;margin-bottom:.25rem;">${chips}</div>
							<div style="font-size:.65rem;color:var(--text-secondary);">${regionales[l.regional]?.titulo||l.regional} • ${new Date(l.fecha).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}</div>
							${nota}
						</div>
						<button onclick="event.stopPropagation();deleteSavedList(${l.id})" title="Eliminar" style="flex-shrink:0;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#f87171;width:30px;height:30px;border-radius:.4rem;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;">🗑️</button>
					</div>
				</div>`;
			}).join('');
		}

        function loadSavedList(id) {
			const l = savedLists.find(x => x.id === id);
			if (!l) return;

			cambiarRegional(l.regional);
			
			if (l.modalidad) {
				cambiarModalidad(l.modalidad);
			}

			// Restaurar configuración leche/yogurt
			if (l.lecheModo) {
				['leche-modo-semanal','leche-modo-mensual'].forEach(sid => { var el = document.getElementById(sid); if(el) el.value = l.lecheModo; });
				var elD = document.getElementById('tab-dir-leche-modo'); if(elD) elD.value = l.lecheModo;
			}
			if (l.yogurtModo) {
				['yogurt-modo-semanal','yogurt-modo-mensual'].forEach(sid => { var el = document.getElementById(sid); if(el) el.value = l.yogurtModo; });
				var elDY = document.getElementById('tab-dir-yogurt-modo'); if(elDY) elDY.value = l.yogurtModo;
			}

			if (l.tipo === 'mensual') {
				showSection('monthly');
				document.getElementById('monthly-num-p').value = l.personas;
				monthlyActiveWeeks.clear();
				document.querySelectorAll('.week-card-repeated').forEach(c => c.remove());
				repeatedWeekCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
				l.semanas.forEach(({week, days}) => {
					monthlyActiveWeeks.set(week, new Set(days));
					const esRepetida = week % 1 !== 0;
					if (esRepetida && !document.getElementById(`week-${wkId(week)}`)) {
						const patternWeek = Math.floor(week);
						crearTarjetaSemanaRepetida(week, patternWeek);
						const instancia = Math.round((week - patternWeek) * 100);
						if (instancia > repeatedWeekCounters[patternWeek]) repeatedWeekCounters[patternWeek] = instancia;
					}
					const card = document.getElementById(`week-${wkId(week)}`);
					const checkbox = document.getElementById(`check-week-${wkId(week)}`);
					card.classList.add('active');
					checkbox.checked = true;
					days.forEach(day => {
						const chip = document.querySelector(`#week-${wkId(week)} .week-day-chip[data-day="${day}"]`);
						if (chip) chip.classList.add('selected');
					});
				});
				monthlyActiveFilters = new Set(l.filters || ['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
				monthlyData = l.data; window.__actaMonthlyData = l.data;
				document.querySelectorAll('#monthlyCatFilters .category-card').forEach(card => {
					const cat = card.classList[1].replace('cat-', '');
					card.classList.toggle('active', monthlyActiveFilters.has(cat));
				});
				updateMonthlyCategoryCounts(monthlyData);
				applyMonthlyFilters();
				document.getElementById('monthlyResultContainer').style.display = 'block';
				document.getElementById('monthlyCatFilters').style.display = 'grid';
				document.getElementById('monthlySearchContainer').style.display = 'block';
				document.getElementById('monthlySummary').style.display = 'grid';
				
				// Restaurar entregas guardadas
				if (l.entregas) {
					Object.entries(l.entregas).forEach(([name, valor]) => {
						const idBase = `${l.regional}_monthly_${name.replace(/\s/g, '')}`;
						l.semanas.forEach(({week}) => {
							localStorage.setItem(`${ENTREGA_KEY_PREFIX}${idBase}_w${week}`, valor);
						});
					});
				}
			} else {
				// CARGA DE LISTADO SEMANAL
				showSection('calculator');
				document.getElementById('sem').value = l.semana;
				document.getElementById('num-p').value = l.personas;
				
				// Restaurar dias seleccionados
				document.querySelectorAll('.d-ch').forEach(cb => {
					cb.checked = l.dias.includes(parseInt(cb.value));
				});
				
				activeFilters = new Set(l.filters || ['granos', 'proteinas', 'lacteos', 'verduras', 'frutas', 'panaderia']);
				currentData = l.data;
				
				// Restaurar entregas en localStorage
				if (l.entregas) {
					Object.entries(l.entregas).forEach(([name, valor]) => {
						const idRef = `${l.regional}_${name.replace(/\s/g, '')}`;
						localStorage.setItem(`${ENTREGA_KEY_PREFIX}${idRef}`, valor);
					});
				}
				
				document.querySelectorAll('#catFilters .category-card').forEach(card => {
					const cat = card.classList[1].replace('cat-', '');
					card.classList.toggle('active', activeFilters.has(cat));
				});
				
				updateCategoryCounts(currentData);
				applyFilters();
				document.getElementById('resultContainer').style.display = 'block';
				document.getElementById('catFilters').style.display = 'grid';
				document.getElementById('searchContainer').style.display = 'block';
			}
			showToast('Lista cargada correctamente', 'success');
		}
		
