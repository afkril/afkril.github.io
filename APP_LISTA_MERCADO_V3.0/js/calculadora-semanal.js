        // ==================== FUNCIONES CALCULADORA SEMANAL ====================
        function generar() {
            const btn = document.getElementById('btnGenerar');
            btn.classList.add('loading');
            
            setTimeout(() => {
                const sem = parseInt(document.getElementById('sem').value);
                const personas = parseInt(document.getElementById('num-p').value) || 0;
                const checks = document.querySelectorAll('.d-ch:checked');
                
                if(checks.length === 0) {
                    showToast('Selecciona al menos un dia', 'error');
                    btn.classList.remove('loading');
                    return;
                }
                
				const db = getCurrentDB();
                let resumen = {};

                checks.forEach(ch => {
                    const dayNum = parseInt(ch.value);
                    const mId = `m${((sem - 1) * 5) + dayNum}`;
                    const menuNum = ((sem - 1) * 5) + dayNum;
                    db.forEach(p => {
                        const baseIndividual = (p.g[mId] || 0);
                        const cantTotal = baseIndividual * personas;
                        if(cantTotal > 0) {
                            if(!resumen[p.n]) {
                                resumen[p.n] = { qTotal: 0, qIndividual: 0, u: p.u, c: p.c, dias: [] };
                            }
                            resumen[p.n].qTotal += cantTotal;
                            resumen[p.n].qIndividual += baseIndividual;
                            resumen[p.n].dias.push({ dayNum, mId, menuNum, gram: baseIndividual });
                        }
                    });
                });

                currentData = resumen; window.__actaCurrentData = resumen;
                updateCategoryCounts(resumen);
                applyFilters();
                
                document.getElementById('resultContainer').style.display = 'block';
                document.getElementById('catFilters').style.display = 'grid';
                document.getElementById('searchContainer').style.display = 'block';
                const weeklyEmptyState = document.getElementById('weeklyEmptyState');
                if (weeklyEmptyState) weeklyEmptyState.style.display = 'none';
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                
                btn.classList.remove('loading');
                showToast('Lista generada', 'success');
            }, 500);
        }

        function updateCategoryCounts(data) {
            const counts = { granos: 0, proteinas: 0, lacteos: 0, verduras: 0, frutas: 0, panaderia: 0 };
            Object.values(data).forEach(item => { if (counts[item.c] !== undefined) counts[item.c]++; });
            Object.keys(counts).forEach(cat => {
                const el = document.getElementById(`count-${cat}`);
                if (el) el.textContent = counts[cat];
            });
        }

        function applyFilters() {
            if (!currentData) return;
            filteredData = {};
            Object.entries(currentData).forEach(([name, item]) => {
                if (activeFilters.has(item.c) && name.toLowerCase().includes(searchTerm)) {
                    filteredData[name] = item;
                }
            });
            renderTable(filteredData);
            document.getElementById('totalItems').textContent = Object.keys(filteredData).length;
        }

        function renderTable(data) {
            const sorted = Object.entries(data).sort((a, b) => 
                (ORDER_CATEGORIES[a[1].c] || 99) - (ORDER_CATEGORIES[b[1].c] || 99)
            );

            let html = `<table><thead><tr><th>Producto</th><th>xNiño</th><th>Total</th><th>Sugerido</th><th>Entrega</th><th class="no-print">Detalles</th></tr></thead><tbody>`;

            sorted.forEach(([name, item], index) => {
                const idRef = `${currentRegional}_${name.replace(/\s/g, '')}`;
                const valorPrevio = localStorage.getItem(`${ENTREGA_KEY_PREFIX}${idRef}`) || "";
                const nameEscaped = name.replace(/'/g, "\\'");
                
                html += `<tr style="animation-delay: ${index * 50}ms">
                    <td><div class="product-name"><div class="category-badge badge-${item.c}"></div>${name}</div></td>
                    <td><span class="amount-badge">${item.qIndividual.toFixed(2)} ${item.u}</span></td>
                    <td><strong>${item.qTotal.toFixed(2)} ${item.u}</strong></td>
                    <td><span class="suggested-amount">${(name.toLowerCase().trim()==='leche' ? formatLecheConModo(item.qTotal, (document.getElementById('leche-modo-semanal')||{}).value||'ml') : (name.toLowerCase().trim()==='yogurt' ? formatYogurtConModo(item.qTotal, (document.getElementById('yogurt-modo-semanal')||{}).value||'und150') : redondearComercial(item.qTotal, item.u, name)))}</span></td>
                    <td><input type="text" class="input-entrega ${valorPrevio ? 'saved' : ''}" value="${valorPrevio}" oninput="guardarEntrega('${idRef}', this.value, this)" placeholder="..."></td>
                    <td class="no-print"><button class="detail-btn" onclick="abrirDetalleProducto('${nameEscaped}')">🔍 Ver</button></td>
                </tr>`;
            });

            html += `</tbody></table>`;
            document.getElementById('resultado').innerHTML = html;
        }

        function guardarEntrega(idRef, valor, input) {
            localStorage.setItem(`${ENTREGA_KEY_PREFIX}${idRef}`, valor);
            input.classList.toggle('saved', !!valor);
        }

        const ORDER_CATEGORIES = { "granos": 1, "lacteos": 2, "proteinas": 3, "verduras": 4, "frutas": 5, "panaderia": 6 };

        // Productos de proteína animal que deben mostrarse en gramos exactos (no en libras)
        var PROTEINAS_GRAMOS_EXACTOS = [
            'carne de res', 'carne de res molida', 'carne res molida', 'carne res',
            'carne de cerdo', 'carne cerdo',
            'higado', 'hígado',
            'molleja',
            'tilapia',
            'pechuga'
        ];
        function esProteinaGramosExactos(nombre) {
            if (!nombre) return false;
            var n = nombre.toLowerCase().trim();
            return PROTEINAS_GRAMOS_EXACTOS.some(function(p) { return n.includes(p); });
        }

        function redondearComercial(gramos, unidad, nombreProducto) {
            // Unidades que no son gramos
            const uNorm = (unidad || '').toLowerCase();
            if (uNorm === 'und') return Math.ceil(gramos) + " ud";
            // ml: total real en litros a multiples de 0.5
            if (uNorm === 'ml') {
                var litros = gramos / 1000;
                var mediosLt = Math.ceil(litros / 0.5);
                return (mediosLt * 0.5) + ' Lt';
            }

            // Ajo: si el total en gramos es menor a 250g -> 1 Ud (semanal y mensual)
            const esAjo = nombreProducto && nombreProducto.toLowerCase().trim() === 'ajo';
            if (esAjo && (uNorm === 'gr' || uNorm === 'grs')) {
                if (gramos < 250) return "1 Ud";
                return Math.ceil(gramos / 250) + " Ud";
            }

            // Proteinas especiales: mostrar siempre en gramos exactos
            if ((uNorm === 'gr' || uNorm === 'grs') && esProteinaGramosExactos(nombreProducto)) {
                return Math.round(gramos) + " gr";
            }

            // Unidades tipo "und 150 cc" etc.
            if (uNorm !== 'gr' && uNorm !== 'grs') return Math.ceil(gramos) + " " + unidad;

            // QUESO: ≤300g → ½ Lb | 301-600g → 1 Lb | >600g → calcular en libras
            const esQueso = nombreProducto && nombreProducto.toLowerCase().includes('queso');
            if (esQueso) {
                if (gramos <= 300) return "\u00bd Lb";
                if (gramos <= 600) return "1 Lb";
                return Math.round(gramos / 500) + " Lb";
            }

            // Granos y demas en gr/grs: calcular libras totales acumuladas
            // Redondear al multiple de 250g (media libra) mas cercano hacia arriba
            const medias = Math.round(gramos / 250);
            if (medias <= 0) return "\u00bd Lb";
            const libras = medias / 2;
            if (libras <= 0.5) return "\u00bd Lb";
            if (libras % 1 === 0) return `${libras} Lb`;
            return `${Math.floor(libras)} \u00bd Lb`;
        }

        function toggleCategory(card, cat) {
            card.classList.toggle('active');
            if (card.classList.contains('active')) activeFilters.add(cat);
            else activeFilters.delete(cat);
            applyFilters();
        }

        function filtrarBusqueda(term) {
            searchTerm = term.toLowerCase();
            if (currentData) applyFilters();
        }

