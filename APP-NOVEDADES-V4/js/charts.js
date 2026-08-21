// ============================================================
// CHARTS.JS — Gráficas y estadísticas del panel "Resumen"
// (contratos, tipos, UDS, "cuéntame", evolución mensual)
// ============================================================

let typeChartInstance = null, udsChartInstance = null, cuentameChartInstance = null, monthChartInstance = null, contractChartInstance = null;

let resumenMesSeleccionado = -1, resumenAnioSeleccionado = new Date().getFullYear();

function inicializarSelectorMes() {
            const selectorAnio = document.getElementById('resumenAnioSelector');
            const anioActual = new Date().getFullYear();
            
            for (let anio = 2024; anio <= anioActual + 1; anio++) {
                const opt = document.createElement('option');
                opt.value = anio;
                opt.textContent = anio;
                if (anio === anioActual) opt.selected = true;
                selectorAnio.appendChild(opt);
            }
            
            document.getElementById('resumenMesSelector').value = new Date().getMonth();
        }

function irMesActual() {
            const ahora = new Date();
            document.getElementById('resumenMesSelector').value = ahora.getMonth();
            document.getElementById('resumenAnioSelector').value = ahora.getFullYear();
            cambiarMesResumen();
        }

function cambiarMesResumen() {
            resumenMesSeleccionado = parseInt(document.getElementById('resumenMesSelector').value);
            resumenAnioSeleccionado = parseInt(document.getElementById('resumenAnioSelector').value);
            
            const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            const nombreMes = resumenMesSeleccionado === -1 ? 'Todos los meses' : 
                             `${nombresMeses[resumenMesSeleccionado]} ${resumenAnioSeleccionado}`;
            
            document.getElementById('nombreMesResumen').textContent = nombreMes;
            document.getElementById('labelMesSeleccionado').textContent = 
                resumenMesSeleccionado === -1 ? 'Este Mes' : nombresMeses[resumenMesSeleccionado];
            
            calcularYMostrarEstadisticas();
        }

function filtrarPorMes(novelties) {
            if (resumenMesSeleccionado === -1) {
                return novelties.filter(n => {
                    const fecha = new Date(n.timestamp);
                    return fecha.getFullYear() === resumenAnioSeleccionado;
                });
            }
            
            return novelties.filter(n => {
                const fecha = new Date(n.timestamp);
                return fecha.getMonth() === resumenMesSeleccionado && 
                       fecha.getFullYear() === resumenAnioSeleccionado;
            });
        }

function loadResumenStats() {
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            const archivedRef = database.ref(AsociacionesModule.getRef('archived'));
            
            Promise.all([
                noveltiesRef.once('value'),
                archivedRef.once('value')
            ]).then(([noveltiesSnap, archivedSnap]) => {
                const noveltiesData = noveltiesSnap.val() || {};
                const archivedData = archivedSnap.val() || {};
                
                todosLosDatosNovelties = Object.entries(noveltiesData).map(([id, value]) => ({ id, ...value }));
                todosLosDatosArchivados = Object.entries(archivedData).map(([id, value]) => ({ id, ...value }));
                
                calcularYMostrarEstadisticas();
            }).catch(error => {
                console.error('Error cargando datos:', error);
                showToast('Error al cargar estadísticas: ' + error.message, 'error');
            });
        }

function calcularYMostrarEstadisticas() {
            const novelties = todosLosDatosNovelties;
            const archivados = todosLosDatosArchivados;
            
            const noveltiesFiltradas = filtrarPorMes(novelties);
            const archivadosFiltrados = filtrarPorMes(archivados);
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            let todayCount = 0, weekCount = 0;
            
            novelties.forEach(n => {
                const nDate = new Date(n.timestamp);
                if (nDate >= today) todayCount++;
                if (nDate >= weekAgo) weekCount++;
            });

            let retiros = 0, ingresos = 0, ambos = 0;
            let pendientes = 0, cargados = 0;

            noveltiesFiltradas.forEach(n => {
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    ambos++;
                    retiros++;
                    ingresos++;
                } else if (n.type === 'retiro') {
                    retiros++;
                } else if (n.type === 'ingreso') {
                    ingresos++;
                }

                if (n.cuentameStatus === 'cargado') cargados++;
                else pendientes++;
            });

            animarNumero('statTotal', noveltiesFiltradas.length);
            animarNumero('statPendientes', pendientes);
            animarNumero('statCargados', cargados);
            animarNumero('statArchivados', archivadosFiltrados.length);
            animarNumero('statToday', todayCount);
            animarNumero('statWeek', weekCount);
            animarNumero('statMonth', noveltiesFiltradas.length);
            animarNumero('statRetiros', retiros);
            animarNumero('statIngresos', ingresos);
            animarNumero('statAmbos', ambos);

            loadContractChart(noveltiesFiltradas);
            loadTypeChart(noveltiesFiltradas);
            loadUDSChart(noveltiesFiltradas);
            loadCuentameChart(noveltiesFiltradas);
            loadMonthChart(novelties);
            loadTopUDSPendientes(noveltiesFiltradas);
        }

function animarNumero(elementId, valor) {
            const elemento = document.getElementById(elementId);
            if (!elemento) return;
            elemento.textContent = valor;
            elemento.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => elemento.classList.remove('animate__animated', 'animate__pulse'), 500);
        }

function loadContractChart(novelties) {
            const ctx = document.getElementById('contractChart');
            if (!ctx) return;

            // Dinámico: obtener contratos del perfil activo
            const contratosActivos = Object.keys(window.UDS_DATA || {});
            const perfil = AsociacionesModule.getPerfilActivo();
            const palette = ['#fbbf24','#3b82f6','#10b981','#f43f5e','#a855f7','#f97316'];

            const datos  = contratosActivos.map(c => novelties.filter(n => n.contract === c).length);
            const labels = contratosActivos.map(c => (perfil?.contratos?.[c]) || `Contrato ${c}`);
            const colors = contratosActivos.map((_, i) => palette[i % palette.length]);

            if (contractChartInstance) contractChartInstance.destroy();

            contractChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: datos,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

function loadTypeChart(novelties) {
            const ctx = document.getElementById('typeChart');
            if (!ctx) return;
            
            const retiros = novelties.filter(n => n.type === 'retiro' && !n.hasIngreso).length;
            const ingresos = novelties.filter(n => n.type === 'ingreso' && !n.hasRetiro).length;
            const ambos = novelties.filter(n => n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)).length;

            if (typeChartInstance) typeChartInstance.destroy();

            typeChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Retiros', 'Ingresos', 'Ambos'],
                    datasets: [{
                        data: [retiros, ingresos, ambos],
                        backgroundColor: ['#ef4444', '#10b981', '#8b5cf6'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

function loadUDSChart(novelties) {
            const ctx = document.getElementById('udsChart');
            if (!ctx) return;
            
            const udsCounts = {};
            novelties.forEach(n => {
                udsCounts[n.udsName] = (udsCounts[n.udsName] || 0) + 1;
            });

            const sorted = Object.entries(udsCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (udsChartInstance) udsChartInstance.destroy();

            udsChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
                    datasets: [{
                        label: 'Novedades',
                        data: sorted.map(([, count]) => count),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { ticks: { font: { size: 9 } } }
                    }
                }
            });
        }

function loadCuentameChart(novelties) {
            const ctx = document.getElementById('cuentameChart');
            if (!ctx) return;
            
            const pendientes = novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length;
            const cargados = novelties.filter(n => n.cuentameStatus === 'cargado').length;

            if (cuentameChartInstance) cuentameChartInstance.destroy();

            cuentameChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pendientes', 'Cargados'],
                    datasets: [{
                        data: [pendientes, cargados],
                        backgroundColor: ['#f59e0b', '#10b981'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
                    }
                }
            });
        }

function loadMonthChart(novelties) {
            const ctx = document.getElementById('monthChart');
            if (!ctx) return;
            
            const monthCounts = new Array(12).fill(0);
            novelties.forEach(n => {
                const month = new Date(n.timestamp).getMonth();
                monthCounts[month]++;
            });

            if (monthChartInstance) monthChartInstance.destroy();

            monthChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                    datasets: [{
                        data: monthCounts,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

function loadTopUDSPendientes(novelties) {
            const container = document.getElementById('topUDSPendientes');
            if (!container) return;

            const udsPendientes = {};
            novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').forEach(n => {
                udsPendientes[n.udsName] = (udsPendientes[n.udsName] || 0) + 1;
            });

            const sorted = Object.entries(udsPendientes).sort((a, b) => b[1] - a[1]).slice(0, 5);
            
            container.innerHTML = sorted.map(([uds, count], index) => `
                <div class="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">${index + 1}</span>
                        <span class="font-semibold text-slate-700 text-sm">${uds}</span>
                    </div>
                    <span class="font-bold text-amber-600">${count} pendientes</span>
                </div>
            `).join('') || '<p class="text-slate-500 text-center py-4">No hay pendientes</p>';
        }
