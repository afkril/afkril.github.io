// ==================== EDITOR DE GRAMAJES ====================
        
		function initEditor() {
			const select = document.getElementById('editorProductSelect');
			select.innerHTML = '<option value="">Seleccione un producto...</option>';
			
			const db = getCurrentDB();
			const count = db.length;
			
			// Actualizar info de regional y modalidad
			const regNames = { neiva: 'NEIVA', gaitana: 'GAITANA' };
			const modNames = { hcb: 'HCB', cdi: 'CDI', hi: 'HI' };
			
			const regEl = document.getElementById('editorRegional');
			const modEl = document.getElementById('editorModalidad');
			const countEl = document.getElementById('editorProductCount');
			
			if (regEl) {
				regEl.textContent = regNames[currentRegional] || currentRegional;
				regEl.className = 'editor-info-value reg-' + currentRegional;
			}
			if (modEl) {
				modEl.textContent = modNames[currentModalidad] || currentModalidad;
				modEl.className = 'editor-info-value mod-' + currentModalidad;
			}
			if (countEl) countEl.textContent = count;
			
			// Llenar select con productos
			db.forEach((p, idx) => {
				const option = document.createElement('option');
				option.value = idx;
				option.textContent = p.n;
				select.appendChild(option);
			});
			
			// Resetear selección
			currentEditingProduct = null;
			document.getElementById('matrixContainer').style.display = 'none';
			document.getElementById('editorEmptyState').style.display = 'block';
			document.getElementById('editorProductCategory').value = '';
			document.getElementById('editorProductUnit').value = '';
		}

		function loadProductMatrix() {
			const select = document.getElementById('editorProductSelect');
			const idx = select.value;
			
			if (idx === '' || idx === null) {
				document.getElementById('matrixContainer').style.display = 'none';
				document.getElementById('editorEmptyState').style.display = 'block';
				currentEditingProduct = null;
				return;
			}
			
			currentEditingProduct = parseInt(idx);
			const db = getCurrentDB();
			
			if (!db[currentEditingProduct]) {
				showToast('Producto no encontrado en la base de datos actual', 'error');
				return;
			}
			
			const product = db[currentEditingProduct];
			
			document.getElementById('editorProductCategory').value = product.c;
			document.getElementById('editorProductUnit').value = product.u;
			
			// Cargar valores en los inputs
			const inputs = document.querySelectorAll('.matrix-input');
			inputs.forEach(input => {
				const menu = input.dataset.menu;
				const value = product.g ? product.g[menu] : undefined;
				
				input.value = (value !== undefined && value !== null) ? value : '';
				input.classList.remove('changed', 'original');
				
				// Comparar con valor original de baseDatabase
				const originalProduct = baseDatabase[currentRegional]?.modalidades?.[currentModalidad]?.db?.[currentEditingProduct];
				const originalValue = originalProduct ? originalProduct.g?.[menu] : undefined;
				
				if (value !== undefined && value !== null && value !== originalValue) {
					input.classList.add('changed');
				} else if (value !== undefined && value !== null) {
					input.classList.add('original');
				}
			});
			
			document.getElementById('matrixContainer').style.display = 'block';
			document.getElementById('editorEmptyState').style.display = 'none';
			updateChangeIndicator();
		}

		function markChanged(input) {
			const menu = input.dataset.menu;
			const value = parseFloat(input.value);
			
			if (currentEditingProduct === null) return;
			
			const db = getCurrentDB();
			const product = db[currentEditingProduct];
			
			if (!product) return;
			
			// Obtener valor original
			const originalProduct = baseDatabase[currentRegional]?.modalidades?.[currentModalidad]?.db?.[currentEditingProduct];
			const originalValue = originalProduct ? originalProduct.g?.[menu] : undefined;
			
			// Actualizar valor en la base de datos local
			if (!product.g) product.g = {};
			
			if (!isNaN(value) && value > 0) {
				product.g[menu] = value;
			} else {
				delete product.g[menu];
			}
			
			// Actualizar UI
			input.classList.remove('changed', 'original');
			
			const currentVal = product.g ? product.g[menu] : undefined;
			
			if (currentVal !== undefined && currentVal !== originalValue) {
				input.classList.add('changed');
				modifiedFields.add(`${currentRegional}_${currentModalidad}_${currentEditingProduct}_${menu}`);
			} else {
				modifiedFields.delete(`${currentRegional}_${currentModalidad}_${currentEditingProduct}_${menu}`);
				if (currentVal !== undefined) {
					input.classList.add('original');
				}
			}
			
			updateChangeIndicator();
		}

		function updateChangeIndicator() {
			const indicator = document.getElementById('changeIndicator');
			const countEl = document.getElementById('modifiedCount');
			
			if (!indicator || !countEl) return;
			
			countEl.textContent = modifiedFields.size;
			
			if (modifiedFields.size > 0) {
				indicator.innerHTML = '⚠️ <span>Cambios sin guardar</span>';
				indicator.classList.add('has-changes');
				indicator.classList.remove('saved');
			} else {
				indicator.innerHTML = '✓ <span>Sin cambios pendientes</span>';
				indicator.classList.remove('has-changes');
				indicator.classList.add('saved');
			}
		}
		

