// ==================== LIMPIAR ENTREGAS ====================
		// ═══════════════════════════════════════════════════
        // MÓDULO: Limpieza de entregas
        // ═══════════════════════════════════════════════════
        async function limpiarEntregasSemanal() {
			if (!currentData || Object.keys(currentData).length === 0) {
				showToast('No hay datos para limpiar', 'warning');
				return;
			}
			
			try {
				await mostrarConfirm('Se borrarán TODAS las cantidades de entrega digitadas en esta lista.', {
					titulo: '¿Limpiar entregas semanales?', icono: '🧹', btnOk: 'Sí, limpiar',
					colorOk: 'linear-gradient(135deg,#d97706,#f59e0b)'
				});
			} catch { return; }
			
			// Limpiar localStorage para esta regional y productos actuales
			Object.keys(currentData).forEach(name => {
				const idRef = `${currentRegional}_${name.replace(/\s/g, '')}`;
				localStorage.removeItem(`${ENTREGA_KEY_PREFIX}${idRef}`);
			});
			
			// Limpiar inputs visibles
			document.querySelectorAll('.input-entrega').forEach(input => {
				input.value = '';
				input.classList.remove('saved');
			});
			
			showToast('Cantidades de entrega limpiadas', 'success');
		}

		// ==================== LIMPIAR ENTREGAS MENSUAL ====================
		async function limpiarEntregasMensual() {
			if (!monthlyData || Object.keys(monthlyData).length === 0) {
				showToast('No hay datos para limpiar', 'warning');
				return;
			}
			
			try {
				await mostrarConfirm('Se borrarán TODAS las cantidades de entrega del listado mensual.', {
					titulo: '¿Limpiar entregas mensuales?', icono: '🧹', btnOk: 'Sí, limpiar',
					colorOk: 'linear-gradient(135deg,#d97706,#f59e0b)'
				});
			} catch { return; }
			
			const sortedWeeks = Array.from(monthlyActiveWeeks.keys()).sort((a, b) => a - b);
			
			// Limpiar localStorage para todos los productos y semanas activas
			Object.keys(monthlyData).forEach(name => {
				const idBase = `${currentRegional}_monthly_${name.replace(/\s/g, '')}`;
				sortedWeeks.forEach(week => {
					localStorage.removeItem(`${ENTREGA_KEY_PREFIX}${idBase}_w${week}`);
				});
			});
			
			// Limpiar inputs visibles y resetear totales
			document.querySelectorAll('.input-entrega-mes').forEach(input => {
				input.value = '';
				input.classList.remove('saved');
				// Actualizar el total de la fila
				actualizarTotalFila(input);
			});
			
			// Actualizar totales globales
			updateMonthlyTotals();
			
			showToast('Cantidades de entrega mensuales limpiadas', 'success');
		}

        async function deleteSavedList(id) {
            try {
                await mostrarConfirm('Esta acción eliminará la lista permanentemente y no se puede deshacer.', {
                    titulo: '¿Eliminar lista guardada?',
                    icono: '🗑️',
                    btnOk: 'Sí, eliminar'
                });
            } catch { return; }
            savedLists = savedLists.filter(x => x.id !== id);
            localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
            syncSavedListsToFirebase();
            updateSavedCount();
            showSavedLists();
            showToast('Lista eliminada', 'success');
        }
		
		function guardarLista() {
			if (!currentData || Object.keys(currentData).length === 0) {
				showToast('Genere una lista primero', 'error');
				return;
			}
			abrirModalGuardar('semanal');
		}

        // Placeholders para funciones no implementadas
        function exportExcel() {
			if (!currentData || Object.keys(currentData).length === 0) {
				showToast('No hay productos para exportar', 'error');
				return;
			}
			
			const sem = document.getElementById('sem').value;
			const personas = document.getElementById('num-p').value;
			
			// Preparar datos para Excel
			const data = Object.entries(currentData).map(([name, item]) => {
				const idRef = `${currentRegional}_${name.replace(/\s/g, '')}`;
				const valorEntrega = localStorage.getItem(`${ENTREGA_KEY_PREFIX}${idRef}`) || '';
				
				return {
					'Producto': name,
					'Categoria': item.c,
					'Unidad': item.u,
					'Cantidad x Niño': item.qIndividual.toFixed(2),
					'Cantidad Total': item.qTotal.toFixed(2),
					'Sugerido (Comercial)': (name.toLowerCase().trim()==='leche' ? formatLecheConModo(item.qTotal, (document.getElementById('leche-modo-semanal')||{}).value||'ml') : (name.toLowerCase().trim()==='yogurt' ? formatYogurtConModo(item.qTotal, (document.getElementById('yogurt-modo-semanal')||{}).value||'und150') : redondearComercial(item.qTotal, item.u, name))),
					'Entrega': valorEntrega
				};
			});

			// Ordenar por categoria
			data.sort((a, b) => (ORDER_CATEGORIES[a.Categoria] || 99) - (ORDER_CATEGORIES[b.Categoria] || 99));

			// Crear hoja de trabajo
			const ws = XLSX.utils.json_to_sheet(data);
			
			// Ajustar anchos de columna
			const colWidths = [
				{ wch: 25 }, // Producto
				{ wch: 12 }, // Categoria
				{ wch: 8 },  // Unidad
				{ wch: 15 }, // Cantidad x Niño
				{ wch: 15 }, // Cantidad Total
				{ wch: 20 }, // Sugerido
				{ wch: 15 }  // Entrega
			];
			ws['!cols'] = colWidths;

			// Crear libro y añadir hoja
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Minuta_Semanal");
			
			// Generar nombre de archivo
			const fecha = new Date().toISOString().split('T')[0];
			const nombreArchivo = `Minuta_${currentRegional}_Sem${sem}_${fecha}.xlsx`;
			
			// Descargar archivo
			XLSX.writeFile(wb, nombreArchivo);
			showToast(`Excel exportado: ${data.length} productos`, 'success');
		}
        
        
