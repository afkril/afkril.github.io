		// ==================== PANEL VER DETALLES ====================
		const DIAS_NOMBRES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
		const DIAS_CLASES = ['', 'dp-day-lunes', 'dp-day-martes', 'dp-day-miercoles', 'dp-day-jueves', 'dp-day-viernes'];
		const CAT_ICONS = { granos:'🌾', proteinas:'🥩', lacteos:'🥛', verduras:'🥦', frutas:'🍎', panaderia:'🥖' };

		function abrirDetalleProducto(productName) {
			const db = getCurrentDB();
			const product = db.find(p => p.n === productName);
			if (!product) return;

			// Determinar contexto: semanal o mensual
			const esMensual = document.getElementById('section-monthly').classList.contains('active');

			const panel = document.getElementById('detailPanel');
			const overlay = document.getElementById('detailOverlay');
			
			// Categoría badge color
			const catClass = `badge-${product.c}`;
			const catIcon = CAT_ICONS[product.c] || '📦';
			const regLabel = currentRegional === 'neiva' ? 'Neiva' : 'Gaitana';
			const regClass = currentRegional === 'gaitana' ? 'gaitana' : '';

			// Encabezado
			document.getElementById('dp-product-name').textContent = productName;
			document.getElementById('dp-badge-cat').textContent = `${catIcon} ${product.c}`;
			document.getElementById('dp-badge-unit').textContent = product.u;
			document.getElementById('dp-badge-reg').textContent = `📍 ${regLabel}`;
			document.getElementById('dp-badge-reg').className = `dp-badge dp-badge-reg ${regClass}`;

			const bodyEl = document.getElementById('dp-body');
			bodyEl.innerHTML = '';

			if (esMensual) {
				renderDetallesMensual(product, bodyEl);
			} else {
				renderDetallesSemanal(product, bodyEl);
			}

			overlay.classList.add('open');
			panel.classList.add('open');
			document.body.style.overflow = 'hidden';
		}

		function cerrarDetalleProducto() {
			document.getElementById('detailPanel').classList.remove('open');
			document.getElementById('detailOverlay').classList.remove('open');
			document.body.style.overflow = '';
		}

		function renderDetallesSemanal(product, container) {
			const sem = parseInt(document.getElementById('sem').value);
			const checks = document.querySelectorAll('.d-ch:checked');
			const personas = parseInt(document.getElementById('num-p').value) || 0;
			const diasSeleccionados = Array.from(checks).map(ch => parseInt(ch.value));

			// Usar datos pre-calculados si existen en currentData
			const stored = currentData && currentData[product.n];
			let detallesDias = [];
			
			if (stored && stored.dias) {
				detallesDias = stored.dias.map(d => ({ ...d, total: d.gram * personas }));
			} else {
				diasSeleccionados.forEach(dayNum => {
					const mId = `m${((sem - 1) * 5) + dayNum}`;
					const gram = product.g[mId] || 0;
					if (gram > 0) {
						detallesDias.push({ dayNum, mId, menuNum: ((sem - 1) * 5) + dayNum, gram, total: gram * personas });
					}
				});
			}

			let totalIndividual = detallesDias.reduce((s, d) => s + d.gram, 0);
			let totalGrupal = detallesDias.reduce((s, d) => s + d.total, 0);

			if (detallesDias.length === 0) {
				container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">
					<div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
					<div>Este producto no aplica para los días seleccionados en la semana ${sem}.</div>
				</div>`;
				return;
			}

			// Resumen
			const sumHTML = `
				<div>
					<div class="dp-section-title">Resumen</div>
					<div class="dp-summary-grid">
						<div class="dp-summary-card">
							<div class="dp-sum-val">${detallesDias.length}</div>
							<div class="dp-sum-label">Días aplica</div>
						</div>
						<div class="dp-summary-card">
							<div class="dp-sum-val">${totalIndividual.toFixed(2)}</div>
							<div class="dp-sum-label">Total x niño (${product.u})</div>
						</div>
						<div class="dp-summary-card">
							<div class="dp-sum-val">${totalGrupal.toFixed(2)}</div>
							<div class="dp-sum-label">Total grupo (${product.u})</div>
						</div>
					</div>
				</div>`;

			// Timeline visual de los 5 días
			let tlHTML = `<div>
				<div class="dp-section-title">Vista semanal — Semana ${sem}</div>
				<div class="dp-week-section">
					<div class="dp-week-header">
						<div class="dp-week-title">📅 Semana ${sem}</div>
						<div class="dp-week-total">${totalGrupal.toFixed(2)} ${product.u}</div>
					</div>
					<div style="display:flex; gap:0.5rem; padding:0.375rem 0.875rem 0.25rem; font-size:0.6rem; color:var(--text-secondary);">
						<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:8px;height:8px;border-radius:50%;background:#a78bfa;display:inline-block;"></span> Seleccionado con gramaje</span>
						<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);display:inline-block;"></span> Sin gramaje ese día</span>
						<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:8px;height:8px;border-radius:50%;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);display:inline-block;"></span> No seleccionado</span>
					</div>
					<div class="dp-timeline">`;
			
			for (let d = 1; d <= 5; d++) {
				const mId = `m${((sem - 1) * 5) + d}`;
				const gram = product.g[mId] || 0;
				const esSeleccionado = diasSeleccionados.includes(d);
				const hasData = gram > 0 && esSeleccionado;
				const menuNum = ((sem - 1) * 5) + d;

				let dotClass, lblClass, dotContent, titleTxt;
				if (!esSeleccionado) {
					dotClass = 'not-selected';
					lblClass = 'lbl-not-selected';
					dotContent = '✕';
					titleTxt = `Menú ${menuNum}: no seleccionado${gram > 0 ? ` (tiene ${gram} ${product.u} disponible)` : ''}`;
				} else if (hasData) {
					dotClass = 'has-data';
					lblClass = 'lbl-selected';
					dotContent = gram.toFixed(gram % 1 === 0 ? 0 : 1);
					titleTxt = `Menú ${menuNum}: ${gram} ${product.u}/niño`;
				} else {
					dotClass = 'no-data-selected';
					lblClass = 'lbl-no-gram';
					dotContent = '—';
					titleTxt = `Menú ${menuNum}: seleccionado pero sin gramaje`;
				}

				tlHTML += `
					<div class="dp-tl-item">
						<div class="dp-tl-dot ${dotClass}" title="${titleTxt}">${dotContent}</div>
						<div class="dp-tl-label ${lblClass}">${DIAS_NOMBRES[d].substring(0,3)}<br>${esSeleccionado ? '✓' : '✕'}</div>
					</div>`;
			}
			tlHTML += `</div>`;

			// Detalle por día — los 5 días con 3 estados visuales
			tlHTML += `<div class="dp-days-list">`;
			for (let d = 1; d <= 5; d++) {
				const mId = `m${((sem - 1) * 5) + d}`;
				const gram = product.g[mId] || 0;
				const esSeleccionado = diasSeleccionados.includes(d);
				const menuNum = ((sem - 1) * 5) + d;
				const hasData = gram > 0 && esSeleccionado;

				if (!esSeleccionado) {
					tlHTML += `
						<div class="dp-day-row" style="opacity:0.45;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.04);">
							<div style="min-width:72px;padding:0.2rem 0.5rem;border-radius:0.375rem;font-size:0.65rem;font-weight:700;text-align:center;text-transform:uppercase;background:rgba(239,68,68,0.12);color:rgba(239,68,68,0.65);">${DIAS_NOMBRES[d]}</div>
							<span class="dp-menu-tag" style="color:rgba(239,68,68,0.4);">Menú ${menuNum}</span>
							<div style="margin-left:auto;display:flex;align-items:center;gap:0.4rem;font-size:0.68rem;color:rgba(239,68,68,0.5);font-weight:600;">
								✕ No seleccionado${gram > 0 ? `<span style="font-size:0.62rem;opacity:0.6;">(${gram} ${product.u} disp.)</span>` : ''}
							</div>
						</div>`;
				} else if (hasData) {
					tlHTML += `
						<div class="dp-day-row">
							<div class="dp-day-pill ${DIAS_CLASES[d]}">${DIAS_NOMBRES[d]}</div>
							<span class="dp-menu-tag">Menú ${menuNum}</span>
							<div class="dp-gramaje">${gram.toFixed(2)}<span class="dp-gramaje-unit">${product.u}/niño</span></div>
						</div>`;
				} else {
					tlHTML += `
						<div class="dp-day-row" style="opacity:0.45;">
							<div class="dp-day-pill ${DIAS_CLASES[d]}" style="opacity:0.4;">${DIAS_NOMBRES[d]}</div>
							<span class="dp-menu-tag">Menú ${menuNum}</span>
							<div style="margin-left:auto;font-size:0.7rem;color:var(--text-secondary);font-style:italic;">sin gramaje</div>
						</div>`;
				}
			}
			tlHTML += `</div>
				<div class="dp-total-row">
					<strong>Total grupo (${personas} niños)</strong>
					<span class="dp-total-val">${totalGrupal.toFixed(2)} ${product.u}</span>
				</div>
			</div></div>`;

			container.innerHTML = sumHTML + tlHTML;
		}

		function renderDetallesMensual(product, container) {
			const personas = parseInt(document.getElementById('monthly-num-p').value) || 0;
			const sortedWeeks = Array.from(monthlyActiveWeeks.keys()).sort((a, b) => a - b);

			let totalIndividualGlobal = 0;
			let totalGrupalGlobal = 0;
			let totalDiasGlobal = 0;

			// Calcular datos por semana
			const datosPorSemana = sortedWeeks.map(weekNum => {
				const patternWeek = Math.floor(weekNum);
				const selectedDays = Array.from(monthlyActiveWeeks.get(weekNum)).sort();
				const diasConDato = [];
				selectedDays.forEach(dayNum => {
					const mId = `m${((patternWeek - 1) * 5) + dayNum}`;
					const gram = product.g[mId] || 0;
					if (gram > 0) {
						const menuNum = ((patternWeek - 1) * 5) + dayNum;
						diasConDato.push({ dayNum, mId, menuNum, gram, total: gram * personas });
					}
				});
				const totalSemIndividual = diasConDato.reduce((s, d) => s + d.gram, 0);
				const totalSemGrupal = diasConDato.reduce((s, d) => s + d.total, 0);
				totalIndividualGlobal += totalSemIndividual;
				totalGrupalGlobal += totalSemGrupal;
				totalDiasGlobal += diasConDato.length;
				return { weekNum, patternWeek, selectedDays, diasConDato, totalSemIndividual, totalSemGrupal };
			}).filter(s => s.diasConDato.length > 0);

			if (datosPorSemana.length === 0) {
				container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">
					<div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
					<div>Este producto no aplica para las semanas y días seleccionados.</div>
				</div>`;
				return;
			}

			// Resumen global
			let html = `
				<div>
					<div class="dp-section-title">Resumen total</div>
					<div class="dp-summary-grid">
						<div class="dp-summary-card">
							<div class="dp-sum-val">${totalDiasGlobal}</div>
							<div class="dp-sum-label">Días aplica</div>
						</div>
						<div class="dp-summary-card">
							<div class="dp-sum-val">${totalIndividualGlobal.toFixed(2)}</div>
							<div class="dp-sum-label">Total x niño (${product.u})</div>
						</div>
						<div class="dp-summary-card">
							<div class="dp-sum-val">${totalGrupalGlobal.toFixed(2)}</div>
							<div class="dp-sum-label">Total grupo (${product.u})</div>
						</div>
					</div>
				</div>`;

			// Sección por semana
			html += `<div><div class="dp-section-title">Detalle por semana</div>`;

			datosPorSemana.forEach(({ weekNum, patternWeek, selectedDays, diasConDato, totalSemIndividual, totalSemGrupal }) => {
				const esRepetida = weekNum % 1 !== 0;
				html += `
					<div class="dp-week-section" style="margin-bottom: 0.625rem;">
						<div class="dp-week-header">
							<div class="dp-week-title">📅 Semana ${patternWeek}${esRepetida ? ' <span title="Semana repetida" style="font-size:0.75em;">🔁</span>' : ''}</div>
							<div class="dp-week-total">${totalSemGrupal.toFixed(2)} ${product.u}</div>
						</div>
						<div style="display:flex;gap:0.5rem;padding:0.25rem 0.875rem 0.1rem;font-size:0.6rem;color:var(--text-secondary);">
							<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:7px;height:7px;border-radius:50%;background:#a78bfa;display:inline-block;"></span> Con gramaje</span>
							<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);display:inline-block;"></span> Sin gramaje</span>
							<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:7px;height:7px;border-radius:50%;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);display:inline-block;"></span> No seleccionado</span>
						</div>
						<div class="dp-timeline">`;

				for (let d = 1; d <= 5; d++) {
					const esSeleccionado = selectedDays.includes(d);
					const mId = `m${((patternWeek - 1) * 5) + d}`;
					const gram = product.g[mId] || 0;
					const hasData = gram > 0 && esSeleccionado;
					const menuNum = ((patternWeek - 1) * 5) + d;

					let dotClass, lblClass, dotContent, titleTxt;
					if (!esSeleccionado) {
						dotClass = 'not-selected';
						lblClass = 'lbl-not-selected';
						dotContent = '✕';
						titleTxt = `Menú ${menuNum}: no seleccionado${gram > 0 ? ` (${gram} ${product.u} disp.)` : ''}`;
					} else if (hasData) {
						dotClass = 'has-data';
						lblClass = 'lbl-selected';
						dotContent = gram.toFixed(gram % 1 === 0 ? 0 : 1);
						titleTxt = `Menú ${menuNum}: ${gram} ${product.u}/niño`;
					} else {
						dotClass = 'no-data-selected';
						lblClass = 'lbl-no-gram';
						dotContent = '—';
						titleTxt = `Menú ${menuNum}: seleccionado pero sin gramaje`;
					}

					html += `
						<div class="dp-tl-item">
							<div class="dp-tl-dot ${dotClass}" title="${titleTxt}">${dotContent}</div>
							<div class="dp-tl-label ${lblClass}">${DIAS_NOMBRES[d].substring(0,3)}<br>${esSeleccionado ? '✓' : '✕'}</div>
						</div>`;
				}
				html += `</div>`;

				// Lista de días con 3 estados
				html += `<div class="dp-days-list">`;
				for (let d = 1; d <= 5; d++) {
					const esSeleccionado = selectedDays.includes(d);
					const mId = `m${((patternWeek - 1) * 5) + d}`;
					const gram = product.g[mId] || 0;
					const menuNum = ((patternWeek - 1) * 5) + d;
					const hasData = gram > 0 && esSeleccionado;

					if (!esSeleccionado) {
						html += `
							<div class="dp-day-row" style="opacity:0.45;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.04);">
								<div style="min-width:72px;padding:0.2rem 0.5rem;border-radius:0.375rem;font-size:0.65rem;font-weight:700;text-align:center;text-transform:uppercase;background:rgba(239,68,68,0.12);color:rgba(239,68,68,0.65);">${DIAS_NOMBRES[d]}</div>
								<span class="dp-menu-tag" style="color:rgba(239,68,68,0.4);">Menú ${menuNum}</span>
								<div style="margin-left:auto;display:flex;align-items:center;gap:0.4rem;font-size:0.68rem;color:rgba(239,68,68,0.5);font-weight:600;">
									✕ No seleccionado${gram > 0 ? `<span style="font-size:0.62rem;opacity:0.6;">(${gram} ${product.u} disp.)</span>` : ''}
								</div>
							</div>`;
					} else if (hasData) {
						html += `
							<div class="dp-day-row">
								<div class="dp-day-pill ${DIAS_CLASES[d]}">${DIAS_NOMBRES[d]}</div>
								<span class="dp-menu-tag">Menú ${menuNum}</span>
								<div class="dp-gramaje">${gram.toFixed(2)}<span class="dp-gramaje-unit">${product.u}/niño</span></div>
							</div>`;
					} else {
						html += `
							<div class="dp-day-row" style="opacity:0.45;">
								<div class="dp-day-pill ${DIAS_CLASES[d]}" style="opacity:0.4;">${DIAS_NOMBRES[d]}</div>
								<span class="dp-menu-tag">Menú ${menuNum}</span>
								<div style="margin-left:auto;font-size:0.7rem;color:var(--text-secondary);font-style:italic;">sin gramaje</div>
							</div>`;
					}
				}
				html += `</div>
					<div class="dp-total-row">
						<strong>Subtotal semana ${weekNum} (${personas} niños)</strong>
						<span class="dp-total-val">${totalSemGrupal.toFixed(2)} ${product.u}</span>
					</div>
				</div>`;
			});

			html += `</div>`;

			// Barra resumen final
			html += `
				<div style="background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(245,158,11,0.08)); border: 1px solid rgba(139,92,246,0.25); border-radius: 0.625rem; padding: 0.875rem;">
					<div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem;">TOTAL MENSUAL — ${personas} niños</div>
					<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
						<div>
							<div style="font-size: 1.25rem; font-weight: 800; color: #fbbf24;">${totalGrupalGlobal.toFixed(2)} ${product.u}</div>
							<div style="font-size: 0.65rem; color: var(--text-secondary);">Cantidad total</div>
						</div>
						<div>
							<div style="font-size: 1.25rem; font-weight: 800; color: #a78bfa;">${totalIndividualGlobal.toFixed(2)} ${product.u}</div>
							<div style="font-size: 0.65rem; color: var(--text-secondary);">Por niño en total</div>
						</div>
					</div>
				</div>`;

			container.innerHTML = html;
		}


