// ============================================================
// NOVEDADES.JS — CRUD de novedades: tabla activas/archivadas,
// formulario de ingreso/retiro, validaciones, vista de tarjetas
// ============================================================

let configBloqueo = { activo: false, fechaInicio: 28, fechaFin: 30 };

let currentNovelties = [], archivedNovelties = [];

let currentPage = 1, currentArchivedPage = 1;

const itemsPerPage = 10;

let todosLosDatosNovelties = [], todosLosDatosArchivados = [];

function toggleBatchMenu() {
            const menu = document.getElementById('batchMenu');
            if (menu) {
                const isVisible = menu.style.display === 'block';
                menu.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    const pendientes = currentNovelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente');
                    const badge = document.getElementById('countPendientesBadge');
                    if (badge) badge.textContent = pendientes.length;
                }
            }
        }

document.addEventListener('click', function(e) {
            const menu = document.getElementById('batchMenu');
            const btn = e.target.closest('button');
            if (menu && menu.style.display === 'block' && !btn?.textContent?.includes('Acciones Masivas')) {
                menu.style.display = 'none';
            }
        });

function marcarTodosCargados() {
            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';

            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let pendientesFiltrados = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                const isPendiente = !n.cuentameStatus || n.cuentameStatus === 'pendiente';

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && isPendiente;
            });

            if (pendientesFiltrados.length === 0) {
                showToast('No hay novedades pendientes en la vista actual para marcar como cargadas', 'warning');
                return;
            }

            if (!confirm(`¿Está seguro de marcar como "Cargado al CUENTAME" ${pendientesFiltrados.length} novedades?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }

            showToast(`⏳ Procesando ${pendientesFiltrados.length} novedades...`, 'info');

            let actualizados = 0;
            const fechaActual = new Date().toISOString();

            const promesas = pendientesFiltrados.map(novedad => {
                const updates = {
                    cuentameStatus: 'cargado',
                    cuentameDate: fechaActual
                };
                return database.ref(`${AsociacionesModule.getRef('novelties')}/${novedad.id}`).update(updates)
                    .then(() => {
                        actualizados++;
                        const index = currentNovelties.findIndex(n => n.id === novedad.id);
                        if (index !== -1) {
                            currentNovelties[index].cuentameStatus = 'cargado';
                            currentNovelties[index].cuentameDate = fechaActual;
                        }
                    })
                    .catch(error => {
                        console.error(`Error actualizando ${novedad.id}:`, error);
                    });
            });

            Promise.all(promesas)
                .then(() => {
                    showToast(`✅ ${actualizados} novedades marcadas como cargadas al CUENTAME`, 'success');
                    filterNovelties();
                    updatePendientesIndicator();
                })
                .catch(error => {
                    showToast('Error al actualizar: ' + error.message, 'error');
                });
        }

function archivarTodosCargados() {
            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';

            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let cargadosFiltrados = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                const isCargado = n.cuentameStatus === 'cargado';

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && isCargado;
            });

            if (cargadosFiltrados.length === 0) {
                showToast('No hay novedades cargadas en la vista actual para archivar', 'warning');
                return;
            }

            if (!confirm(`⚠️ ¿Está seguro de ARCHIVAR ${cargadosFiltrados.length} novedades?\n\nSolo se archivarán las que estén marcadas como "Cargado al CUENTAME".\n\nEsta acción moverá los registros a la sección de Archivados.`)) {
                return;
            }

            showToast(`⏳ Archivando ${cargadosFiltrados.length} novedades...`, 'info');

            let archivados = 0;
            let errores = 0;
            const fechaArchivo = new Date().toISOString();

            const promesas = cargadosFiltrados.map(novedad => {
                const archivedData = {
                    ...novedad,
                    archivedDate: fechaArchivo,
                    originalId: novedad.id
                };

                const archivedRef = database.ref(AsociacionesModule.getRef('archived')).push();
                
                return archivedRef.set(archivedData)
                    .then(() => database.ref(`${AsociacionesModule.getRef('novelties')}/${novedad.id}`).remove())
                    .then(() => {
                        archivados++;
                        archivedNovelties.push({ id: archivedRef.key, ...archivedData });
                        currentNovelties = currentNovelties.filter(n => n.id !== novedad.id);
                    })
                    .catch(error => {
                        errores++;
                        console.error(`Error archivando ${novedad.id}:`, error);
                    });
            });

            Promise.all(promesas)
                .then(() => {
                    if (errores > 0) {
                        showToast(`⚠️ ${archivados} archivados, ${errores} errores`, 'warning');
                    } else {
                        showToast(`🗃️ ${archivados} novedades archivadas correctamente`, 'success');
                    }
                    filterNovelties();
                    updatePendientesIndicator();
                })
                .catch(error => {
                    showToast('Error general al archivar: ' + error.message, 'error');
                });
        }

function loadNoveltiesTable() {
            const path = AsociacionesModule.getRef('novelties');
            const noveltiesRef = database.ref(path);
            OfflineModule.cachedRead(`novelties:${path}`, () => noveltiesRef.once('value'))
                .then((snapshot) => {
                    const data = snapshot.val() || {};
                    currentNovelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                    filterNovelties();
                    updatePendientesIndicator();
                });
        }

function checkDuplicate(document, currentId) {
            if (!document || document.length < 5) return null;
            
            const duplicateActive = currentNovelties.find(n => 
                n.id !== currentId && (
                    (n.document === document) || 
                    (n.retiro && n.retiro.document === document) ||
                    (n.ingreso && n.ingreso.document === document)
                )
            );
            
            const duplicateArchived = archivedNovelties.find(n => 
                n.document === document || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            if (duplicateActive) return { type: 'active', data: duplicateActive };
            if (duplicateArchived) return { type: 'archived', data: duplicateArchived };
            
            return null;
        }

function toggleCuentame(id) {
            const novelty = currentNovelties.find(n => n.id === id);
            if (!novelty) return;
            
            const newStatus = novelty.cuentameStatus === 'cargado' ? 'pendiente' : 'cargado';
            
            const noveltyRef = database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`);
            noveltyRef.update({ 
                cuentameStatus: newStatus,
                cuentameDate: newStatus === 'cargado' ? new Date().toISOString() : null
            })
            .then(() => {
                showToast(newStatus === 'cargado' ? '✓ Marcado como cargado al CUENTAME' : '⏳ Marcado como pendiente', 'success');
                loadNoveltiesTable();
                updatePendientesIndicator();
            })
            .catch((error) => showToast('Error al actualizar: ' + error.message, 'error'));
        }

function archivarNovelty(id) {
            const novelty = currentNovelties.find(n => n.id === id);
            if (!novelty) return;
            
            if (novelty.cuentameStatus !== 'cargado') {
                showToast('⚠️ Solo se pueden archivar novedades marcadas como "Cargado al CUENTAME"', 'warning');
                return;
            }
            
            if (!confirm('¿Está seguro de archivar esta novedad?\n\nLos archivados se mueven a una sección separada.')) return;
            
            const archivedData = {
                ...novelty,
                archivedDate: new Date().toISOString(),
                originalId: id
            };
            
            const archivedRef = database.ref(AsociacionesModule.getRef('archived')).push();
            archivedRef.set(archivedData)
                .then(() => database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`).remove())
                .then(() => {
                    showToast('🗃️ Novedad archivada correctamente', 'success');
                    loadNoveltiesTable();
                    updatePendientesIndicator();
                })
                .catch((error) => showToast('Error al archivar: ' + error.message, 'error'));
        }

function updatePendientesIndicator() {
            const indicator = document.getElementById('pendientesIndicator');
            const countEl = document.getElementById('pendientesCount');

            // Revisar de inmediato si hay algo nuevo que notificar
            // (datos nutricionales pendientes, novedades sin resolver)
            // en vez de esperar al próximo escaneo periódico.
            if (typeof NotificacionesModule !== 'undefined') NotificacionesModule.escanear();
            if (typeof SeguimientoModule !== 'undefined') SeguimientoModule.actualizarBadgeSidebar();

            if (!indicator || !countEl) return;
            
            const pendientes = currentNovelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length;
            
            countEl.textContent = pendientes;
            
            if (pendientes === 0) {
                indicator.classList.add('zero');
                indicator.style.display = 'none';
            } else {
                indicator.classList.remove('zero');
                indicator.style.display = 'flex';
            }
        }

async function showPendientesView() {
            // Requiere autenticación admin
            if (!AsociacionesModule.isAdminAutenticado()) {
                await promptAdminAccess();
                if (!AsociacionesModule.isAdminAutenticado()) return;
            }
            openAdminPanel();
            switchTab('activas');
            document.getElementById('filterStatus').value = 'pendiente';
            filterNovelties();
        }

function filterNovelties() {
            const searchInput = document.getElementById('searchInput');
            const filterContract  = document.getElementById('filterContract');
            const filterType      = document.getElementById('filterType');
            const filterDate      = document.getElementById('filterDate');
            const filterMonth     = document.getElementById('filterMonth');
            const filterUDS       = document.getElementById('filterUDS');
            const filterStatus    = document.getElementById('filterStatus');
            const filterRegional  = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            
            const searchTerm      = searchInput     ? searchInput.value.toLowerCase() : '';
            const contractFilter  = filterContract  ? filterContract.value  : '';
            const typeFilter      = filterType      ? filterType.value      : '';
            const dateFilter      = filterDate      ? filterDate.value      : '';
            const monthFilter     = filterMonth     ? filterMonth.value     : '';
            const udsFilter       = filterUDS       ? filterUDS.value       : '';
            const statusFilter    = filterStatus    ? filterStatus.value    : '';
            const regionalFilter  = filterRegional  ? filterRegional.value  : '';
            const modalidadFilter = filterModalidad ? filterModalidad.value : '';

            let filtered = currentNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));
                
                const matchesContract = !contractFilter || n.contract === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;
                
                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }
                
                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS = !udsFilter || n.udsName === udsFilter;
                
                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                let matchesStatus = true;
                if (statusFilter === 'pendiente') {
                    matchesStatus = !n.cuentameStatus || n.cuentameStatus === 'pendiente';
                } else if (statusFilter) {
                    matchesStatus = n.cuentameStatus === statusFilter;
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && matchesRegional && matchesModalidad;
            });

            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderTable(filtered);
        }

const MESES_ABREV_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function formatFechaCorta(dateStr) {
    if (!dateStr) return '-';
    let d;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const [y, m, day] = dateStr.split('-');
        d = new Date(Number(y), Number(m) - 1, Number(day.slice(0, 2)));
    } else if (dateStr.includes('/')) {
        const [day, m, y] = dateStr.split('/');
        d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
        d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_ABREV_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// Celda compacta "MOVIMIENTO": abrevia el tipo (RET/ING) + fecha corta,
// una línea por movimiento (retiro y/o ingreso cuando el tipo es "ambos").
function getMovimientoCellHTML(novelty) {
    const lineas = [];

    if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
        const fechaRetiro = novelty.retiro ? novelty.retiro.retiroDate : (novelty.retiroDate || null);
        if (fechaRetiro) lineas.push(`<span class="mov-tag mov-tag--ret">RET</span> · ${formatFechaCorta(fechaRetiro)}`);
    }
    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const fechaIngreso = novelty.ingreso ? novelty.ingreso.ingresoDate : (novelty.ingresoDate || null);
        if (fechaIngreso) lineas.push(`<span class="mov-tag mov-tag--ing">ING</span> · ${formatFechaCorta(fechaIngreso)}`);
    }
    if (lineas.length === 0) lineas.push(novelty.date ? formatFechaCorta(novelty.date) : '-');

    return lineas.map(l => `<div class="mov-line">${l}</div>`).join('');
}

function getFechaMovimiento(novelty) {
            let fechas = [];
            
            if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
                const fechaRetiro = novelty.retiro ? novelty.retiro.retiroDate : (novelty.retiroDate || null);
                if (fechaRetiro) fechas.push('Ret: ' + fechaRetiro);
            }
            
            if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
                const fechaIngreso = novelty.ingreso ? novelty.ingreso.ingresoDate : (novelty.ingresoDate || null);
                if (fechaIngreso) fechas.push('Ing: ' + fechaIngreso);
            }
            
            if (fechas.length > 0) return fechas.join(' / ');
            return novelty.date || '-';
        }

			



function renderTable(novelties) {
            const tbody = document.getElementById('noveltiesTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            const start = (currentPage - 1) * itemsPerPage;
            const paginated = novelties.slice(start, start + itemsPerPage);

            paginated.forEach(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                
                let tipoBadge = '';
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoBadge = '<span class="badge badge-ambos">AMBOS</span>';
                } else if (n.type === 'retiro') {
                    tipoBadge = '<span class="badge badge-retiro">RETIRO</span>';
                } else if (n.type === 'ingreso') {
                    tipoBadge = '<span class="badge badge-ingreso">INGRESO</span>';
                } else {
                    tipoBadge = '<span class="badge">' + (n.type || 'N/A').toUpperCase() + '</span>';
                }
                // Badge nutrición pendiente
                if ((n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente) {
                    tipoBadge += ' <span style="background:#f59e0b;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;" title="Datos nutricionales pendientes">🍎⏳</span>';
                }
                
                let docDisplay = n.document || '-';
                let nameDisplay = n.name || '-';
                let docsToCheck = [];
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    const docRet = n.retiro ? n.retiro.document : (n.document || '-');
                    const docIng = n.ingreso ? n.ingreso.document : '-';
                    const nomRet = n.retiro ? n.retiro.name : (n.name || '-');
                    const nomIng = n.ingreso ? n.ingreso.name : '-';
                    
                    docDisplay = docRet + ' / ' + docIng;
                    nameDisplay = (nomRet.length > 15 ? nomRet.substring(0, 15) + '...' : nomRet) + ' / ' + (nomIng.length > 15 ? nomIng.substring(0, 15) + '...' : nomIng);
                    
                    if (n.retiro && n.retiro.document) docsToCheck.push(n.retiro.document);
                    if (n.ingreso && n.ingreso.document) docsToCheck.push(n.ingreso.document);
                } else if (n.type === 'retiro') {
                    const retData = n.retiro || n;
                    docDisplay = retData.document || '-';
                    nameDisplay = retData.name ? (retData.name.length > 20 ? retData.name.substring(0, 20) + '...' : retData.name) : '-';
                    if (retData.document) docsToCheck.push(retData.document);
                } else if (n.type === 'ingreso') {
                    const ingData = n.ingreso || n;
                    docDisplay = ingData.document || '-';
                    nameDisplay = ingData.name ? (ingData.name.length > 20 ? ingData.name.substring(0, 20) + '...' : ingData.name) : '-';
                    if (ingData.document) docsToCheck.push(ingData.document);
                }

                let duplicadoHTML = '';
                docsToCheck.forEach(doc => {
                    const dup = checkDuplicate(doc, n.id);
                    if (dup) {
                        // ✅ INTEGRACIÓN: al hacer clic abre el modal global de Duplicados
                        // con el timeline horizontal de TODOS los operadores
                        duplicadoHTML += `<span class="duplicado-badge" onclick="event.stopPropagation();DuplicadosModule.abrirModalCaso('${doc}')" title="Ver historial completo de movimientos">⚠️ DUP</span> `;
                    }
                });
                
                const isCargado = n.cuentameStatus === 'cargado';
                const estadoInfo = getEstadoInfo(n.cuentameStatus);
                const necesitaNutricion = (n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="estado-fecha-cell">
                            <div class="estado-chip-wrap">
                                <button type="button" class="estado-chip estado-chip--${estadoInfo.key}" onclick="toggleEstadoMenu(event, '${n.id}')" title="Cambiar estado">
                                    <span class="estado-chip-dot">${estadoInfo.emoji}</span> ${estadoInfo.label}
                                </button>
                                <div class="estado-menu" id="estadoMenu-${n.id}">
                                    ${renderEstadoMenuOptions(n.id, n.cuentameStatus)}
                                </div>
                            </div>
                            <div class="fecha-registro-sub">${new Date(n.timestamp).toLocaleDateString('es-CO')}</div>
                        </div>
                    </td>
                    <td>${getMovimientoCellHTML(n)}</td>
                    <td>
                        <div class="uds-contrato-cell">
                            <div class="uds-name">${n.udsName || '-'}</div>
                            <div class="uds-contrato-row">
                                <span class="contrato-tag">#${n.contract || 'N/A'}</span>
                                ${duplicadoHTML}
                            </div>
                        </div>
                    </td>
                    <td>${tipoBadge}</td>
                    <td>
                        <div class="beneficiario-cell">
                            <div class="beneficiario-nombre">${nameDisplay}</div>
                            <div class="beneficiario-doc">${docDisplay}</div>
                        </div>
                    </td>
                    <td>
                        <div class="comm-cell">
                            ${SeguimientoModule.badgeComunicacion(n)}
                            ${SeguimientoModule.botonResponder(n.id)}
                        </div>
                    </td>
                    <td>
                        <div class="row-actions-wrap">
                            <button type="button" class="row-actions-btn" onclick="toggleRowActionsMenu(event, '${n.id}')" title="Acciones">⋮</button>
                            <div class="row-actions-menu" id="rowActions-${n.id}">
                                <button class="dropdown-item" onclick="closeRowActionsMenus(); viewNovelty('${n.id}')">
                                    <span class="dropdown-item-icon">👁️</span> Ver
                                </button>
                                <button class="dropdown-item" onclick="closeRowActionsMenus(); SeguimientoModule.abrirRespuestaRapida('${n.id}')">
                                    <span class="dropdown-item-icon">📧</span> Responder
                                </button>
                                <button class="dropdown-item" onclick="closeRowActionsMenus(); archivarNovelty('${n.id}')" ${isCargado ? '' : 'disabled title="Solo se puede archivar si está Cargado"'}>
                                    <span class="dropdown-item-icon">🗃️</span> Archivar
                                </button>
                                <button class="dropdown-item" onclick="closeRowActionsMenus(); abrirEditNutricion('${n.id}')" ${necesitaNutricion ? '' : 'disabled title="No hay datos nutricionales pendientes"'}>
                                    <span class="dropdown-item-icon">🍎</span> Nutrición
                                </button>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item dropdown-item--danger" onclick="closeRowActionsMenus(); deleteNovelty('${n.id}')">
                                    <span class="dropdown-item-icon">🗑️</span> Eliminar
                                </button>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderPagination(novelties.length);
        }

function getContractColor(contract) {
            return COLORES_GRAFICAS.contratos[contract] || '#6b7280';
        }

// ══════════ ESTADO (chips) ══════════
const ESTADOS_CUENTAME = {
    cargado:        { key: 'cargado',       emoji: '🟢', label: 'Cargado' },
    pendiente:      { key: 'pendiente',     emoji: '🟠', label: 'Pendiente' },
    error:          { key: 'error',         emoji: '🔴', label: 'Error' },
    otro_operador:  { key: 'otro-operador', emoji: '🔵', label: 'Otro Operador' }
};

function getEstadoInfo(status) {
    return ESTADOS_CUENTAME[status] || ESTADOS_CUENTAME.pendiente;
}

function renderEstadoMenuOptions(id, currentStatus) {
    return Object.keys(ESTADOS_CUENTAME).map(statusKey => {
        const info = ESTADOS_CUENTAME[statusKey];
        const isActive = (currentStatus || 'pendiente') === statusKey;
        return `<button class="dropdown-item estado-menu-item ${isActive ? 'estado-menu-item--active' : ''}" onclick="setEstadoNovedad(event, '${id}', '${statusKey}')">
                    <span class="estado-chip-dot">${info.emoji}</span> ${info.label}
                </button>`;
    }).join('');
}

function toggleEstadoMenu(event, id) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`estadoMenu-${id}`);
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeAllEstadoMenus();
    closeRowActionsMenus();
    if (!wasOpen) menu.classList.add('open');
}

function closeAllEstadoMenus() {
    document.querySelectorAll('.estado-menu.open').forEach(m => m.classList.remove('open'));
}

function setEstadoNovedad(event, id, nuevoEstado) {
    if (event) event.stopPropagation();
    closeAllEstadoMenus();

    const novelty = currentNovelties.find(n => n.id === id);
    if (!novelty) return;

    const noveltyRef = database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`);
    noveltyRef.update({
        cuentameStatus: nuevoEstado,
        cuentameDate: nuevoEstado === 'cargado' ? new Date().toISOString() : (novelty.cuentameDate || null)
    })
    .then(() => {
        showToast(`Estado actualizado a "${getEstadoInfo(nuevoEstado).label}"`, 'success');
        loadNoveltiesTable();
        updatePendientesIndicator();
    })
    .catch((error) => showToast('Error al actualizar: ' + error.message, 'error'));
}

// ── Cambiar estado desde el panel de "Ver detalles" (modal) ─────
// Usa el mismo diseño (.estado-chip / .estado-menu) que la tabla,
// pero con IDs propios para no chocar con el menú de la fila y
// refrescando el contenido del modal tras el cambio.

function renderEstadoMenuOptionsModal(id, currentStatus) {
    return Object.keys(ESTADOS_CUENTAME).map(statusKey => {
        const info = ESTADOS_CUENTAME[statusKey];
        const isActive = (currentStatus || 'pendiente') === statusKey;
        return `<button class="dropdown-item estado-menu-item ${isActive ? 'estado-menu-item--active' : ''}" onclick="setEstadoNovedadModal(event, '${id}', '${statusKey}')">
                    <span class="estado-chip-dot">${info.emoji}</span> ${info.label}
                </button>`;
    }).join('');
}

function toggleEstadoMenuModal(event, id) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`estadoMenuModal-${id}`);
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeAllEstadoMenus();
    if (!wasOpen) menu.classList.add('open');
}

function setEstadoNovedadModal(event, id, nuevoEstado) {
    if (event) event.stopPropagation();
    closeAllEstadoMenus();

    const noveltyRef = database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`);
    noveltyRef.update({
        cuentameStatus: nuevoEstado,
        cuentameDate: nuevoEstado === 'cargado' ? new Date().toISOString() : (currentNoveltyData?.cuentameDate || null)
    })
    .then(() => {
        showToast(`Estado actualizado a "${getEstadoInfo(nuevoEstado).label}"`, 'success');

        // Actualiza también en memoria (tabla + novedad local del propio modelo)
        const novelty = currentNovelties.find(n => n.id === id);
        if (novelty) {
            novelty.cuentameStatus = nuevoEstado;
            novelty.cuentameDate = nuevoEstado === 'cargado' ? new Date().toISOString() : (novelty.cuentameDate || null);
        }

        // Refresca el modal de detalles si sigue abierto sobre esta misma novedad
        if (currentNoveltyData && currentNoveltyData.id === id) {
            currentNoveltyData.cuentameStatus = nuevoEstado;
            currentNoveltyData.cuentameDate = nuevoEstado === 'cargado' ? new Date().toISOString() : (currentNoveltyData.cuentameDate || null);
            refreshNoveltyModal();
        }

        loadNoveltiesTable();
        updatePendientesIndicator();
    })
    .catch((error) => showToast('Error al actualizar: ' + error.message, 'error'));
}

// Vuelve a renderizar el contenido del modal de detalles conservando
// la pestaña actualmente activa (para no "saltar" a Información al
// cambiar el estado desde dentro del panel).
function refreshNoveltyModal() {
    if (!currentNoveltyData) return;

    const cardsView = document.getElementById('cardsView');
    const activeTab = cardsView?.querySelector('.novelty-tab-btn.active')?.dataset.tab || 'general';

    viewNoveltyDetails(currentNoveltyData, currentNoveltyIsArchived);

    if (activeTab !== 'general') {
        switchNoveltyTab(activeTab);
    }
}

// ══════════ ACCIONES DE FILA (menú ⋮) ══════════
function toggleRowActionsMenu(event, id) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`rowActions-${id}`);
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeRowActionsMenus();
    closeAllEstadoMenus();
    if (!wasOpen) menu.classList.add('open');
}

function closeRowActionsMenus() {
    document.querySelectorAll('.row-actions-menu.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', () => {
    closeAllEstadoMenus();
    closeRowActionsMenus();
});

function loadArchivedNovelties() {
            const path = AsociacionesModule.getRef('archived');
            const archivedRef = database.ref(path);
            OfflineModule.cachedRead(`archived:${path}`, () => archivedRef.once('value'))
                .then((snapshot) => {
                    const data = snapshot.val() || {};
                    archivedNovelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                    filterArchivedNovelties();
                });
        }

function filterArchivedNovelties() {
            const searchInput       = document.getElementById('searchInputArchivados');
            const filterContract    = document.getElementById('filterContractArchivados');
            const filterType        = document.getElementById('filterTypeArchivados');
            const filterDate        = document.getElementById('filterDateArchivados');
            const filterMonth       = document.getElementById('filterMonthArchivados');
            const filterUDS         = document.getElementById('filterUDSArchivados');
            const filterRegional    = document.getElementById('filterRegionalArchivados');
            const filterModalidad   = document.getElementById('filterModalidadArchivados');

            const searchTerm        = searchInput     ? searchInput.value.toLowerCase()  : '';
            const contractFilter    = filterContract  ? filterContract.value              : '';
            const typeFilter        = filterType      ? filterType.value                  : '';
            const dateFilter        = filterDate      ? filterDate.value                  : '';
            const monthFilter       = filterMonth     ? filterMonth.value                 : '';
            const udsFilter         = filterUDS       ? filterUDS.value                   : '';
            const regionalFilter    = filterRegional  ? filterRegional.value              : '';
            const modalidadFilter   = filterModalidad ? filterModalidad.value             : '';

            let filtered = archivedNovelties.filter(n => {
                const matchesSearch = !searchTerm || 
                    (n.name && n.name.toLowerCase().includes(searchTerm)) || 
                    (n.document && n.document.includes(searchTerm)) ||
                    (n.retiro && n.retiro.name && n.retiro.name.toLowerCase().includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.name && n.ingreso.name.toLowerCase().includes(searchTerm)) ||
                    (n.retiro && n.retiro.document && n.retiro.document.includes(searchTerm)) ||
                    (n.ingreso && n.ingreso.document && n.ingreso.document.includes(searchTerm));

                const matchesContract  = !contractFilter  || n.contract  === contractFilter;
                const matchesRegional  = !regionalFilter  || n.regional  === regionalFilter;
                const matchesModalidad = !modalidadFilter || n.modalidad === modalidadFilter;

                let matchesType = true;
                if (typeFilter === 'retiro') {
                    matchesType = n.type === 'retiro' || n.type === 'ambos' || (n.hasRetiro && !n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ingreso') {
                    matchesType = n.type === 'ingreso' || n.type === 'ambos' || (!n.hasRetiro && n.hasIngreso) || (n.hasRetiro && n.hasIngreso);
                } else if (typeFilter === 'ambos') {
                    matchesType = n.type === 'ambos' || (n.hasRetiro && n.hasIngreso);
                }

                const matchesDate = !dateFilter || n.date === dateFilter;
                const matchesUDS  = !udsFilter  || n.udsName === udsFilter;

                let matchesMonth = true;
                if (monthFilter !== '') {
                    const nDate = new Date(n.timestamp);
                    matchesMonth = nDate.getMonth() === parseInt(monthFilter);
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesRegional && matchesModalidad;
            });

            filtered.sort((a, b) => new Date(b.archivedDate) - new Date(a.archivedDate));
            renderArchivedTable(filtered);
        }

function renderArchivedTable(novelties) {
            const tbody = document.getElementById('archivedTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            const start = (currentArchivedPage - 1) * itemsPerPage;
            const paginated = novelties.slice(start, start + itemsPerPage);

            paginated.forEach(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                
                let tipoBadge = '';
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoBadge = '<span class="badge badge-ambos">AMBOS</span>';
                } else if (n.type === 'retiro') {
                    tipoBadge = '<span class="badge badge-retiro">RETIRO</span>';
                } else if (n.type === 'ingreso') {
                    tipoBadge = '<span class="badge badge-ingreso">INGRESO</span>';
                } else {
                    tipoBadge = '<span class="badge">' + (n.type || 'N/A').toUpperCase() + '</span>';
                }
                
                let docDisplay = n.document || '-';
                let nameDisplay = n.name || '-';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    const docRet = n.retiro ? n.retiro.document : (n.document || '-');
                    const docIng = n.ingreso ? n.ingreso.document : '-';
                    const nomRet = n.retiro ? n.retiro.name : (n.name || '-');
                    const nomIng = n.ingreso ? n.ingreso.name : '-';
                    
                    docDisplay = docRet + ' / ' + docIng;
                    nameDisplay = (nomRet.length > 15 ? nomRet.substring(0, 15) + '...' : nomRet) + ' / ' + (nomIng.length > 15 ? nomIng.substring(0, 15) + '...' : nomIng);
                }

                const row = document.createElement('tr');
                row.className = 'archivado-row';
                row.innerHTML = `
                    <td>
                        <div class="estado-fecha-cell">
                            <div class="estado-chip estado-chip--cargado" style="cursor:default;">✓ Archivado</div>
                            <div class="fecha-registro-sub">${new Date(n.archivedDate).toLocaleDateString('es-CO')}</div>
                        </div>
                    </td>
                    <td>${getMovimientoCellHTML(n)}</td>
                    <td>
                        <div class="uds-contrato-cell">
                            <div class="uds-name">${n.udsName || '-'}</div>
                            <div class="uds-contrato-row">
                                <span class="contrato-tag">#${n.contract || 'N/A'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${tipoBadge}</td>
                    <td>
                        <div class="beneficiario-cell">
                            <div class="beneficiario-nombre">${nameDisplay}</div>
                            <div class="beneficiario-doc">${docDisplay}</div>
                        </div>
                    </td>
                    <td>
                        <button onclick="viewArchivedNovelty('${n.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2 bg-blue-50 px-2 py-1 rounded">Ver</button>
                        <button onclick="deleteArchivedNovelty('${n.id}')" class="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2 py-1 rounded">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderArchivedPagination(novelties.length);
        }

let isPlainView = false;

let currentNoveltyData = null;
let currentNoveltyIsArchived = false;

function viewNoveltyDetails(novelty, isArchived) {
    currentNoveltyData = novelty;
    currentNoveltyIsArchived = !!isArchived;
    isPlainView = false;
    
    const modal = document.getElementById('viewModal');
    const cardsView = document.getElementById('cardsView');
    const plainView = document.getElementById('plainView');
    const plainTextContent = document.getElementById('plainTextContent');
    const headerSubtitle = document.getElementById('headerSubtitle');
    
    // Extraer código UDS del valor completo
    let udsCode = '';
    let udsName = novelty.udsName || 'No especificado';
    if (novelty.udsFull && novelty.udsFull.includes(' - ')) {
        const parts = novelty.udsFull.split(' - ');
        udsName = parts[0];
        udsCode = parts[1];
    }
    
    // Actualizar subtítulo del header
    const estadoText = novelty.cuentameStatus === 'cargado' ? 'Cargado' : 'Pendiente';
    headerSubtitle.textContent = `${udsName} • Estado: ${estadoText}`;
    
    // Generar contenido
    cardsView.innerHTML = generateFiveCards(novelty, isArchived, udsName, udsCode);
    plainTextContent.textContent = generatePlainTextFive(novelty, isArchived, udsName, udsCode);
    
    // Mostrar vista correcta
    updateViewMode();
    
    // Mostrar modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

/* ============================================================
   DETALLE DE NOVEDAD — VISTA POR PESTAÑAS
============================================================ */

function generateFiveCards(novelty, isArchived, udsName, udsCode) {
    const contract = novelty.contract || 'N/A';
    const fechaRegistro = novelty.timestamp
        ? new Date(novelty.timestamp).toLocaleString('es-CO')
        : '-';
    const tieneRetiro =
        novelty.type === 'retiro' ||
        novelty.type === 'ambos' ||
        novelty.hasRetiro;
    const tieneIngreso =
        novelty.type === 'ingreso' ||
        novelty.type === 'ambos' ||
        novelty.hasIngreso;
    const tipo =
        novelty.type === 'ambos'
            ? 'AMBOS'
            : novelty.type === 'retiro'
                ? 'RETIRO'
                : 'INGRESO';
    const isCargado =
        novelty.cuentameStatus === 'cargado';
    const estadoTexto =
        isCargado
            ? 'Cargado al CUÉNTAME'
            : 'Pendiente';
    const estadoClase =
        isCargado
            ? 'cargado'
            : 'pendiente';
    /* ---------------------------------------------------------
       TIPO DE NOVEDAD
    --------------------------------------------------------- */
    let tipoClase = 'ingreso';
    if (tipo === 'retiro') {
        tipoClase = 'retiro';
    }
    if (tipo === 'ambos') {
        tipoClase = 'ambos';
    }
    /* ---------------------------------------------------------
       PERSONA PRINCIPAL
    --------------------------------------------------------- */
    let personaNombre = 'Beneficiario';
    if (novelty.type === 'retiro') {

        personaNombre =
            novelty.retiro?.name ||
            novelty.name ||
            'Beneficiario';

    } else {

        personaNombre =
            novelty.ingreso?.name ||
            novelty.name ||
            'Beneficiario';
    }


    /* ---------------------------------------------------------
       CABECERA RESUMEN
    --------------------------------------------------------- */
    let html = `

        <div class="novelty-summary-header">
            <div class="novelty-summary-main">
                <div class="novelty-avatar">
                    👤
                </div>
                <div class="novelty-person">
                    <div class="novelty-person-name">
                        ${personaNombre.toUpperCase()}
                    </div>
                    <div class="novelty-person-meta">
                        UDS: <strong>${udsName}</strong>
                        <span>•</span>
                        Código: <strong>${udsCode || '-'}</strong>
                        <span>•</span>
                        Contrato: <strong>${contract}</strong>
                    </div>

                </div>

            </div>


            <div class="novelty-summary-status">

                <span class="novelty-type-badge ${tipoClase}">
                    ${tipo === 'AMBOS' ? '↔ AMBOS' : tipo === 'RETIRO' ? '← RETIRO' : '→ INGRESO'}
                </span>

                ${
                    isArchived
                    ? `
                        <span class="novelty-status-badge ${estadoClase}">
                            ${isCargado ? '✓' : '⏳'} ${estadoTexto}
                        </span>
                    `
                    : `
                        <div class="estado-chip-wrap">
                            <button
                                type="button"
                                class="estado-chip estado-chip--${getEstadoInfo(novelty.cuentameStatus).key}"
                                onclick="toggleEstadoMenuModal(event, '${novelty.id}')"
                                title="Cambiar estado">

                                <span class="estado-chip-dot">${getEstadoInfo(novelty.cuentameStatus).emoji}</span>
                                ${getEstadoInfo(novelty.cuentameStatus).label}

                            </button>

                            <div class="estado-menu" id="estadoMenuModal-${novelty.id}">
                                ${renderEstadoMenuOptionsModal(novelty.id, novelty.cuentameStatus)}
                            </div>
                        </div>
                    `
                }

            </div>

        </div>


        <!--<div class="novelty-summary-info">
            <div>
                <span>📅 Registrado</span>
                <strong>${fechaRegistro}</strong>
            </div>
            <div>
                <span>🏫 UDS</span>
                <strong>${udsName}</strong>
            </div>
            <div>
                <span>🔢 Código UDS</span>
                <strong>${udsCode || '-'}</strong>
            </div>
            <div>
                <span>📄 Contrato</span>
                <strong>${contract}</strong>
            </div>
        </div>-->


        <!-- =================================================
             PESTAÑAS
        ================================================== -->

        <div class="novelty-tab-buttons"
             role="tablist">

            <button
                class="novelty-tab-btn active"
                data-tab="general"
                onclick="switchNoveltyTab('general')">

                <span class="tab-icon">📋</span>
                <span>Información</span>

            </button>


            ${
                tieneRetiro
                ? `
                    <button
                        class="novelty-tab-btn"
                        data-tab="retiro"
                        onclick="switchNoveltyTab('retiro')">

                        <span class="tab-icon">🔴</span>
                        <span>Retiro</span>

                    </button>
                `
                : ''
            }


            ${
                tieneIngreso
                ? `
                    <button
                        class="novelty-tab-btn"
                        data-tab="ingreso"
                        onclick="switchNoveltyTab('ingreso')">

                        <span class="tab-icon">🟢</span>
                        <span>Ingreso</span>

                    </button>
                `
                : ''
            }


            ${
                tieneIngreso
                ? `
                    <button
                        class="novelty-tab-btn"
                        data-tab="acudiente"
                        onclick="switchNoveltyTab('acudiente')">

                        <span class="tab-icon">👨‍👩‍👧</span>
                        <span>Acudiente</span>

                    </button>
                `
                : ''
            }


            ${
                tieneIngreso
                ? `
                    <button
                        class="novelty-tab-btn"
                        data-tab="nutricional"
                        onclick="switchNoveltyTab('nutricional')">

                        <span class="tab-icon">🥗</span>
                        <span>Nutricional</span>

                    </button>
                `
                : ''
            }


            <button
                class="novelty-tab-btn"
                data-tab="comunicacion"
                onclick="switchNoveltyTab('comunicacion')">

                <span class="tab-icon">📧</span>
                <span>Comunicación</span>

            </button>

        </div>


        <!-- =================================================
             CONTENEDORES DE LAS PESTAÑAS
        ================================================== -->

        <div class="novelty-tab-content">


            <!-- =================================================
                 INFORMACIÓN GENERAL
            ================================================== -->

            <div
                class="novelty-tab-panel active"
                data-panel="general">

                ${renderGeneralTab(
                    novelty,
                    udsName,
                    udsCode,
                    contract,
                    fechaRegistro,
                    tipo
                )}

            </div>


            <!-- =================================================
                 RETIRO
            ================================================== -->

            ${
                tieneRetiro
                ? `
                    <div
                        class="novelty-tab-panel"
                        data-panel="retiro">

                        ${renderRetiroTab(novelty)}

                    </div>
                `
                : ''
            }


            <!-- =================================================
                 INGRESO
            ================================================== -->

            ${
                tieneIngreso
                ? `
                    <div
                        class="novelty-tab-panel"
                        data-panel="ingreso">

                        ${renderIngresoTab(novelty)}

                    </div>
                `
                : ''
            }


            <!-- =================================================
                 ACUDIENTE
            ================================================== -->

            ${
                tieneIngreso
                ? `
                    <div
                        class="novelty-tab-panel"
                        data-panel="acudiente">

                        ${renderAcudienteTab(novelty)}

                    </div>
                `
                : ''
            }


            <!-- =================================================
                 NUTRICIONAL
            ================================================== -->

            ${
                tieneIngreso
                ? `
                    <div
                        class="novelty-tab-panel"
                        data-panel="nutricional">

                        ${renderNutricionalTab(
                            novelty,
                            isArchived
                        )}

                    </div>
                `
                : ''
            }


            <!-- =================================================
                 COMUNICACIÓN
            ================================================== -->

            <div
                class="novelty-tab-panel"
                data-panel="comunicacion">

                ${
                    typeof SeguimientoModule !== 'undefined'
                        ? SeguimientoModule.renderPanelComunicacion(novelty)
                        : `
                            <div class="novelty-empty-state">
                                <div>📧</div>
                                <strong>Sin módulo de comunicación</strong>
                                <span>No fue posible cargar el seguimiento.</span>
                            </div>
                        `
                }

            </div>

        </div>

    `;

    return html;
}

function renderGeneralTab(
    novelty,
    udsName,
    udsCode,
    contract,
    fechaRegistro,
    tipo
) {

    const estado =
        novelty.cuentameStatus === 'cargado'
            ? 'Cargado al CUÉNTAME'
            : 'Pendiente';

    return `

        <div class="novelty-section-title">

            <div>
                <span class="section-kicker">
                    RESUMEN DEL REPORTE
                </span>

                <h3>
                    Información General
                </h3>
            </div>

            <span class="novelty-section-icon">
                📋
            </span>

        </div>


        <div class="novelty-data-grid grid-3col">

            <div class="novelty-data-card">
                <span>📄 Contrato</span>
                <strong>${contract}</strong>
            </div>

            <div class="novelty-data-card">
                <span>🏫 UDS</span>
                <strong>${udsName}</strong>
            </div>

            <div class="novelty-data-card">
                <span>🔢 Código UDS</span>
                <strong>${udsCode || '-'}</strong>
            </div>

            <div class="novelty-data-card">
                <span>🌎 Regional</span>
                <strong>${novelty.regional || '-'}</strong>
            </div>

            <div class="novelty-data-card">
                <span>📅 Fecha del reporte</span>
                <strong>${fechaRegistro}</strong>
            </div>

            <div class="novelty-data-card">
                <span>🏷️ Tipo de novedad</span>
                <strong class="type-text ${tipo.toLowerCase()}">
                    ${tipo}
                </strong>
            </div>
            <!--<div class="novelty-data-card">
                <span>📊 Estado CUÉNTAME</span>
                <strong>${estado}</strong>
            </div>
            <div class="novelty-data-card">
                <span>🆔 ID del reporte</span>
                <strong>${novelty.id || '-'}</strong>
            </div><-->
        </div>
        <div class="novelty-action-summary">
            <div class="action-summary-icon">
                ${
                    novelty.cuentameStatus === 'cargado'
                        ? '✓'
                        : '!'
                }
            </div>
            <div>
                <span class="action-summary-title">
                    ${
                        novelty.cuentameStatus === 'cargado'
                            ? 'Novedad procesada'
                            : 'Novedad pendiente'
                    }
                </span>
                <p>
                    ${
                        novelty.cuentameStatus === 'cargado'
                            ? 'Este reporte ya fue marcado como cargado al CUÉNTAME.'
                            : 'Este reporte requiere revisión administrativa.'
                    }
                </p>
            </div>
        </div>
    `;
}
function renderRetiroTab(novelty) {
    const r = novelty.retiro || novelty;
    const nombre =
        r.name ||
        'N/A';
    const documento =
        `${r.docType || 'RC'} ${r.document || '-'}`;
    const genero =
        r.gender === 'M'
            ? 'Masculino'
            : r.gender === 'F'
                ? 'Femenino'
                : '-';
    return `
        <div class="novelty-section-title">
            <div>
                <span class="section-kicker">
                    INFORMACIÓN DEL BENEFICIARIO
                </span>
                <h3>
                    Datos de Retiro
                </h3>
            </div>
            <span class="novelty-section-icon retiro">
                🔴
            </span>
        </div>
        <div class="novelty-person-highlight retiro">
            <div class="person-big-icon">
                👤
            </div>
            <div>
                <span>
                    BENEFICIARIO QUE SE RETIRA
                </span>
                <strong>
                    ${nombre.toUpperCase()}
                </strong>
                <small>
                    ${documento}
                </small>
            </div>
        </div>
        <div class="novelty-data-grid">
            <div class="novelty-data-card">
                <span>🆔 Documento</span>
                <strong>${documento}</strong>
            </div>
            <div class="novelty-data-card">
                <span>👤 Nombre completo</span>
                <strong>${nombre.toUpperCase()}</strong>
            </div>
            <div class="novelty-data-card">
                <span>📅 Fecha de retiro</span>
                <strong>
                    ${formatDateDMY(
                        r.retiroDate ||
                        novelty.retiroDate ||
                        '-'
                    )}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>⚧ Género</span>
                <strong>${genero}</strong>
            </div>
        </div>
    `;
}
function renderIngresoTab(novelty) {
    const i =
        novelty.ingreso ||
        novelty;
    const nombre =
        i.name ||
        'N/A';
    const documento =
        `${i.docType || 'RC'} ${i.document || '-'}`;
    const genero =
        i.gender === 'M'
            ? 'Masculino'
            : i.gender === 'F'
                ? 'Femenino'
                : '-';

    return `
        <div class="novelty-section-title">
            <div>
                <span class="section-kicker">
                    NUEVO BENEFICIARIO
                </span>
                <h3>
                    Datos de Ingreso
                </h3>
            </div>
            <span class="novelty-section-icon ingreso">
                🟢
            </span>
        </div>
        <div class="novelty-person-highlight ingreso">
            <div class="person-big-icon">
                👶
            </div>
            <div>
                <span>
                    BENEFICIARIO QUE INGRESA
                </span>
                <strong>
                    ${nombre.toUpperCase()}
                </strong>
                <small>
                    ${documento}
                </small>
            </div>
        </div>
        <div class="novelty-data-grid">
            <div class="novelty-data-card">
                <span>👤 Nombre</span>
                <strong>${nombre.toUpperCase()}</strong>
            </div>
            <div class="novelty-data-card">
                <span>🆔 Documento</span>
                <strong>${documento}</strong>
            </div>
            <div class="novelty-data-card">
                <span>📏 Edad</span>
                <strong>
                    ${i.age || novelty.age || '-'}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🎂 Fecha nacimiento</span>
                <strong>
                    ${formatDateDMY(
                        i.dob ||
                        i.ingresoDOB ||
                        novelty.ingresoDOB ||
                        '-'
                    )}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>📅 Fecha ingreso</span>
                <strong>
                    ${formatDateDMY(
                        i.ingresoDate ||
                        novelty.ingresoDate ||
                        '-'
                    )}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>⚧ Género</span>
                <strong>${genero}</strong>
            </div>
        </div>
    `;
}
function renderAcudienteTab(novelty) {
    const i =
        novelty.ingreso ||
        novelty;
    return `
        <div class="novelty-section-title">
            <div>
                <span class="section-kicker">
                    INFORMACIÓN FAMILIAR
                </span>
                <h3>
                    Datos del Acudiente
                </h3>
            </div>
            <span class="novelty-section-icon acudiente">
                👨‍👩‍👧
            </span>
        </div>
        <div class="novelty-data-grid grid-3col">
            <div class="novelty-data-card wide">
                <span>👤 Nombre del acudiente</span>
                <strong>
                    ${
                        i.acudiente ||
                        novelty.acudiente ||
                        'N/A'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🆔 Documento</span>
                <strong>
                    ${
                        i.acudienteDoc ||
                        novelty.acudienteDoc ||
                        '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🎂 Fecha nacimiento</span>
                <strong>
                    ${formatDateDMY(
                        i.acudienteDOB ||
                        novelty.acudienteDOB ||
                        '-'
                    )}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>📞 Teléfono</span>

                <strong>
                    ${
                        i.phone ||
                        novelty.phone ||
                        '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>📍 Comuna</span>

                <strong>
                    ${
                        i.comuna ||
                        novelty.comuna ||
                        '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🏘️ Barrio</span>
                <strong>
                    ${
                        i.barrio ||
                        novelty.barrio ||
                        '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card wide">
                <span>🏠 Dirección</span>

                <strong>
                    ${
                        i.address ||
                        novelty.address ||
                        '-'
                    }
                </strong>
            </div>
        </div>
    `;
}
function renderNutricionalTab(novelty, isArchived) {
    const nutricion =
        novelty.nutricion ||
        (novelty.ingreso &&
         novelty.ingreso.nutricion);

    if (!nutricion) {
        return `
            <div class="novelty-empty-state">
                <div>🥗</div>
                <strong>
                    Sin seguimiento nutricional
                </strong>
                <span>
                    No se registraron datos nutricionales
                    para esta novedad.
                </span>
            </div>
        `;
    }
    const isPendiente =
        nutricion.pendiente === true;
    if (isPendiente) {
        const editBtn =
            novelty.id && !isArchived
                ? `
                    <button
                        onclick="abrirEditNutricion('${novelty.id}')"
                        class="nutri-edit-btn">

                        ✏️ Editar

                    </button>
                `
                : '';

        return `
            <div class="novelty-section-title">
                <div>
                    <span class="section-kicker">
                        SEGUIMIENTO
                    </span>
                    <h3>
                        Seguimiento Nutricional
                    </h3>
                </div>
                ${editBtn}
            </div>
            <div class="nutri-pending-box">

                <div class="nutri-pending-icon">
                    ⏳
                </div>

                <strong>
                    DATO PENDIENTE
                </strong>

                <span>
                    Los datos nutricionales serán
                    completados desde el panel de
                    administración.
                </span>

            </div>
        `;
    }
    const estadoColor =
        typeof getNutricionColor === 'function'
            ? getNutricionColor(
                nutricion.estadoNutricional
            )
            : '#3b82f6';
    const editBtn =
        novelty.id && !isArchived
            ? `
                <button
                    onclick="abrirEditNutricion('${novelty.id}')"
                    class="nutri-edit-btn">

                    ✏️ Editar
                </button>
            `
            : '';
    return `
        <div class="novelty-section-title">
            <div>
                <span class="section-kicker">
                    SEGUIMIENTO
                </span>
                <h3>
                    Seguimiento Nutricional
                </h3>
            </div>
            ${editBtn}
        </div>
        <div class="nutrition-status-card">
            <span>
                ESTADO NUTRICIONAL
            </span>
            <strong style="color:${estadoColor}">
                ${
                    nutricion.estadoNutricional ||
                    'No calculado'
                }
            </strong>
        </div>
        <div class="novelty-data-grid">
            <div class="novelty-data-card">
                <span>📅 Fecha valoración</span>
                <strong>
                    ${formatDateDMY(
                        nutricion.fecha || '-'
                    )}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>⚖️ Peso</span>
                <strong>
                    ${
                        nutricion.peso
                            ? nutricion.peso + ' kg'
                            : '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>📏 Talla</span>
                <strong>
                    ${
                        nutricion.talla
                            ? nutricion.talla + ' cm'
                            : '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>💪 Perímetro braquial</span>
                <strong>
                    ${
                        nutricion.perimetroBraquial
                            ? nutricion.perimetroBraquial + ' cm'
                            : '-'
                    }
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🏥 Régimen</span>
                <strong>
                    ${nutricion.regimen || '-'}
                </strong>
            </div>
            <div class="novelty-data-card">
                <span>🏥 EPS</span>
                <strong>
                    ${nutricion.eps || '-'}
                </strong>
            </div>
        </div>
    `;
}
/* ============================================================
   CONTROL DE PESTAÑAS
============================================================ */
function switchNoveltyTab(tabName) {
    const container =
        document.getElementById('cardsView');
    if (!container) return;
    /* Botones */
    const buttons =
        container.querySelectorAll(
            '.novelty-tab-btn'
        );
    buttons.forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.tab === tabName
        );
    });

    /* Paneles */
    const panels =
        container.querySelectorAll(
            '.novelty-tab-panel'
        );
    panels.forEach(panel => {
        panel.classList.toggle(
            'active',
            panel.dataset.panel === tabName
        );
    });
    /* Scroll suave al inicio */
    const content =
        container.querySelector(
            '.novelty-tab-content'
        );
    if (content) {
        content.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

function generatePlainTextFive(novelty, isArchived, udsName, udsCode) {
    const fechaRegistro = new Date(novelty.timestamp).toLocaleString('es-CO');
    
    let text = `=================================\n`;
    text +=    ` REPORTE DE NOVEDADES\n`;
    text +=    `=================================\n\n`;
    
    text += `[ INFORMACIÓN GENERAL ]\n`;
    text += `> CONTRATO:         ${novelty.contract || 'N/A'}\n`;
    text += `> UDS NOMBRE:       ${udsName ? udsName.toUpperCase() : 'N/A'}\n`;
    text += `> CÓDIGO UDS:       ${udsCode || 'N/A'}\n`;
    text += `> FECHA REGISTRO:   ${fechaRegistro}\n`;
    text += `> TIPO DE NOVEDAD:  ${novelty.type === 'ambos' ? 'RETIRO + INGRESO (AMBOS)' : novelty.type?.toUpperCase() || 'N/A'}\n`;
    text += `> ESTADO CUENTAME:  ${novelty.cuentameStatus === 'cargado' ? '✓ CARGADO' : '⏳ PENDIENTE'}\n`;
    
    if (isArchived) {
        text += `> FECHA ARCHIVO:    ${novelty.archivedDate ? new Date(novelty.archivedDate).toLocaleString('es-CO') : '-'}\n`;
    }
    
    text += `------------------------------------------\n`;

    if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
        const r = novelty.retiro || novelty;
        text += `\n[ DATOS DE RETIRO ]\n`;
        text += `  - Documento:      ${r.docType || 'RC'} ${r.document || 'N/A'}\n`;
        text += `  - Nombre:         ${r.name ? r.name.toUpperCase() : 'N/A'}\n`;
        text += `  - Fecha Retiro:   ${formatDateDMY(r.retiroDate || novelty.retiroDate || '-')}\n`;
        text += `  - Género:         ${r.gender === 'M' ? 'Masculino' : r.gender === 'F' ? 'Femenino' : 'N/A'}\n`;
        text += `  - Ram Diligenciado: ${r.ramFileName ? '📎 ' + r.ramFileName : 'No adjuntado'}\n`;
    }

    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        text += `\n[ DATOS DE INGRESO ]\n`;
        text += `  - Niño:           ${i.name ? i.name.toUpperCase() : 'N/A'}\n`;
        text += `  - Documento:      ${i.docType || 'RC'} ${i.document || 'N/A'}\n`;
        text += `  - Edad:           ${i.age || novelty.age || 'N/A'}\n`;
        text += `  - F. Nacimiento:  ${formatDateDMY(i.dob || i.ingresoDOB || novelty.ingresoDOB || '-')}\n`;
        text += `  - F. Ingreso:     ${formatDateDMY(i.ingresoDate || novelty.ingresoDate || '-')}\n`;
        text += `  - Género:         ${i.gender === 'M' ? 'Masculino' : i.gender === 'F' ? 'Femenino' : 'N/A'}\n`;
        text += `  - Comuna:         ${i.comuna || novelty.comuna || '-'}\n`;
        text += `  - Barrio:         ${i.barrio || novelty.barrio || '-'}\n`;
        text += `  - Dirección:      ${i.address || novelty.address || 'N/A'}\n`;
        text += `  - Teléfono:       ${i.phone || novelty.phone || 'N/A'}\n`;
        
        text += `\n[ DATOS DEL ACUDIENTE ]\n`;
        text += `  - Nombre:         ${i.acudiente || novelty.acudiente || 'N/A'}\n`;
        text += `  - Documento:      ${i.acudienteDoc || novelty.acudienteDoc || '-'}\n`;
        text += `  - F. Nacimiento:  ${formatDateDMY(i.acudienteDOB || novelty.acudienteDOB || '-')}\n`;

        const n = novelty.nutricion || (novelty.ingreso && novelty.ingreso.nutricion);
        if (n && (n.fecha || n.peso)) {
            text += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
            text += `  - F. Valoración:      ${formatDateDMY(n.fecha || '-')}\n`;
            text += `  - Peso:               ${n.peso ? n.peso + ' kg' : '-'}\n`;
            text += `  - Talla:              ${n.talla ? n.talla + ' cm' : '-'}\n`;
            text += `  - Perímetro Braquial: ${n.perimetroBraquial ? n.perimetroBraquial + ' cm' : '-'}\n`;
            text += `  - Régimen:            ${n.regimen || '-'}\n`;
            text += `  - EPS:                ${n.eps || '-'}\n`;
            text += `  - Estado Nutricional: ${n.estadoNutricional || 'No calculado'}\n`;
        }
    }

    text += `\n------------------------------------------\n`;
    text += `Generado: ${new Date().toLocaleString('es-CO')}\n`;
    
    return text;
}

function toggleViewMode() {
    isPlainView = !isPlainView;
    updateViewMode();
}

function updateViewMode() {
    const cardsView = document.getElementById('cardsView');
    const plainView = document.getElementById('plainView');
    const icon = document.getElementById('viewModeIcon');
    const text = document.getElementById('viewModeText');
    
    if (isPlainView) {
        cardsView.classList.add('hidden');
        plainView.classList.remove('hidden');
        icon.textContent = '🎴';
        text.textContent = 'Vista Tarjetas';
    } else {
        cardsView.classList.remove('hidden');
        plainView.classList.add('hidden');
        icon.textContent = '📝';
        text.textContent = 'Texto Plano';
    }
}

function closeModal(event) {
    if (!event || event.target.id === 'viewModal' || event.target.classList.contains('btn-close-compact') || event.target.classList.contains('btn-cerrar-compact')) {
        const modal = document.getElementById('viewModal');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentNoveltyData = null;
    }
}

function viewNovelty(id) {
    const novelty = currentNovelties.find(n => n.id === id);
    if (!novelty) return;
    viewNoveltyDetails(novelty, false);
}

function viewArchivedNovelty(id) {
    const novelty = archivedNovelties.find(n => n.id === id);
    if (!novelty) return;
    viewNoveltyDetails(novelty, true);
}

function deleteArchivedNovelty(id) {
            if (!confirm('¿Está seguro de que desea eliminar este registro archivado?\n\nSe moverá a la Papelera de Reciclaje y se eliminará definitivamente en 7 días.')) return;

            const novelty = archivedNovelties.find(n => n.id === id);
            if (!novelty) return;

            PapeleraModule.moverAPapelera(novelty, id, 'archivadas')
                .then(() => database.ref(`${AsociacionesModule.getRef('archived')}/${id}`).remove())
                .then(() => {
                    showToast('🗑️ Registro movido a la Papelera de Reciclaje', 'success');
                    // Quitamos el registro de la lista en memoria de inmediato.
                    // OJO: a propósito NO volvemos a llamar loadArchivedNovelties()
                    // aquí. Esa función lee a través de la caché offline
                    // (OfflineModule.cachedRead), que si la conexión responde
                    // lento puede devolver el último dato guardado ANTES de este
                    // borrado (todavía con el registro adentro) y repintar la
                    // tabla con el registro "resucitado", dando la falsa
                    // impresión de que nunca se eliminó. Como el remove() de
                    // arriba ya se confirmó contra Firebase, la lista local es
                    // la fuente de verdad más confiable en este momento.
                    archivedNovelties = archivedNovelties.filter(n => n.id !== id);
                    filterArchivedNovelties();
                    loadResumenStats();
                    if (typeof updatePapeleraBadge === 'function') updatePapeleraBadge();
                })
                .catch((error) => showToast('Error al eliminar: ' + error.message, 'error'));
        }

function eliminarTodosArchivados() {
            const count = archivedNovelties.length;
            if (count === 0) {
                showToast('No hay archivados para eliminar', 'warning');
                return;
            }
            
            const confirmacion = prompt(`⚠️ ATENCIÓN ⚠️\n\n` +
                `Está a punto de mover a la Papelera de Reciclaje ${count} novedades archivadas.\n` +
                `Desde la papelera podrá restaurarlas, o se eliminarán definitivamente a los 7 días.\n\n` +
                `Para confirmar, escriba ELIMINAR en mayúsculas:`);
            
            if (confirmacion !== 'ELIMINAR') {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            const segundaConfirmacion = confirm(`Última confirmación:\n\n` +
                `¿Está 100% seguro de enviar ${count} registros archivados a la Papelera de Reciclaje?`);
            
            if (!segundaConfirmacion) {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            showToast('⏳ Moviendo todos los archivados a la papelera...', 'info');

            const itemsAMover = archivedNovelties.slice();
            const promesas = itemsAMover.map(n => PapeleraModule.moverAPapelera(n, n.id, 'archivadas'));

            Promise.all(promesas)
                .then(() => database.ref(AsociacionesModule.getRef('archived')).remove())
                .then(() => {
                    showToast(`🗑️ ${count} archivados movidos a la Papelera de Reciclaje`, 'success');
                    // No recargamos desde Firebase por la misma razón explicada
                    // en deleteArchivedNovelty: la caché offline podría devolver
                    // datos viejos y hacer reaparecer registros ya eliminados.
                    archivedNovelties = [];
                    filterArchivedNovelties();
                    loadResumenStats();
                    if (typeof updatePapeleraBadge === 'function') updatePapeleraBadge();
                })
                .catch((error) => showToast('Error al eliminar: ' + error.message, 'error'));
        }

function renderArchivedPagination(totalItems) {
            const container = document.getElementById('paginationArchivados');
            if (!container) return;
            
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            container.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-sm ${i === currentArchivedPage ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
                btn.textContent = i;
                btn.onclick = () => { currentArchivedPage = i; filterArchivedNovelties(); };
                container.appendChild(btn);
            }
        }

function closeModal(event) {
            if (!event || event.target.id === 'viewModal' || event.target.tagName === 'BUTTON') {
                const viewModal = document.getElementById('viewModal');
                if (viewModal) viewModal.style.display = 'none';
            }
        }

function deleteNovelty(id) {
            if (!confirm('¿Está seguro de que desea eliminar este registro?\n\nSe moverá a la Papelera de Reciclaje y se eliminará definitivamente en 7 días.')) return;

            const novelty = currentNovelties.find(n => n.id === id);
            if (!novelty) return;

            PapeleraModule.moverAPapelera(novelty, id, 'activas')
                .then(() => database.ref(`${AsociacionesModule.getRef('novelties')}/${id}`).remove())
                .then(() => {
                    showToast('🗑️ Registro movido a la Papelera de Reciclaje', 'success');
                    // Igual que en archivados: quitamos el registro de memoria ya
                    // mismo y NO recargamos desde Firebase (evita que la caché
                    // offline devuelva datos viejos y haga reaparecer el registro
                    // ya eliminado).
                    currentNovelties = currentNovelties.filter(n => n.id !== id);
                    if (typeof filterNovelties === 'function') filterNovelties();
                    updatePendientesIndicator();
                    if (typeof updatePapeleraBadge === 'function') updatePapeleraBadge();
                })
                .catch((error) => showToast('Error al eliminar: ' + error.message, 'error'));
        }

function renderPagination(totalItems) {
            const container = document.getElementById('pagination');
            if (!container) return;
            
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            container.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-sm ${i === currentPage ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
                btn.textContent = i;
                btn.onclick = () => { currentPage = i; filterNovelties(); };
                container.appendChild(btn);
            }
        }

function checkExistingBeneficiary(document, type) {
            if (document.length < 5) return;
            
            const duplicateActive = currentNovelties.find(n => 
                (n.document === document) || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            const duplicateArchived = archivedNovelties.find(n => 
                n.document === document || 
                (n.retiro && n.retiro.document === document) ||
                (n.ingreso && n.ingreso.document === document)
            );
            
            const existing = duplicateActive || duplicateArchived;
            
            if (existing) {
                const ubicacion = duplicateActive ? 'activas' : 'archivadas';
                if (type === 'ingreso') {
                    showToast(`⚠️ Beneficiario ya existe en ${existing.udsName} (${ubicacion})`, "warning");
                } else if (type === 'retiro') {
                    showToast(`ℹ️ Beneficiario encontrado en base de datos (${ubicacion})`, "info");
                }
            }
        }

function validateAgeRange() {
            const dob = document.getElementById('ingresoDOB');
            if (!dob || !dob.value) return;
            
            const birthDate = new Date(dob.value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age > 5) {
                showToast("Alerta: La edad supera los 5 años (Primera Infancia)", "warning");
            } else if (age < 0) {
                showToast("Error: Fecha de nacimiento inválida", "error");
            }
        }

function validateDatesRealTime() {
            const checkRetiro = document.getElementById('checkRetiro');
            const checkIngreso = document.getElementById('checkIngreso');
            const fechaRetiroInput = document.getElementById('retiroDate');
            const fechaIngresoInput = document.getElementById('ingresoDate');
            const feedback = document.getElementById('feedbackContainer');

            if (!checkRetiro || !checkIngreso || !fechaRetiroInput || !fechaIngresoInput) return true;

            if (checkRetiro.checked && checkIngreso.checked && fechaRetiroInput.value && fechaIngresoInput.value) {
                const dRetiro = new Date(fechaRetiroInput.value);
                const dIngreso = new Date(fechaIngresoInput.value);
                dRetiro.setMinutes(dRetiro.getMinutes() + dRetiro.getTimezoneOffset());
                dIngreso.setMinutes(dIngreso.getMinutes() + dIngreso.getTimezoneOffset());

                if (dRetiro >= dIngreso) {
                    showFeedback("Atención: La fecha de retiro no puede ser igual o posterior a la de ingreso.", "error");
                    fechaRetiroInput.classList.add('border-red-500', 'bg-red-50');
                    fechaIngresoInput.classList.add('border-red-500', 'bg-red-50');
                    return false;
                } else {
                    if (feedback) feedback.classList.add('hidden');
                    fechaRetiroInput.classList.remove('border-red-500', 'bg-red-50');
                    fechaIngresoInput.classList.remove('border-red-500', 'bg-red-50');
                    return true;
                }
            }
            return true;
        }

function onRegionalChange() {
            const regional = document.getElementById('regionalSelect')?.value || '';
            const selMod   = document.getElementById('modalidadSelect');
            const secMod   = document.getElementById('sectionModalidad');
            const secCtr   = document.getElementById('sectionContrato');
            const selCtr   = document.getElementById('contractNumber');
            const selUDS   = document.getElementById('mainUdsDropdown');
            const secUDS   = document.getElementById('sectionUDS');

            // Resetear aguas abajo
            if (selCtr) { selCtr.value = ''; selCtr.disabled = true; }
            if (selUDS) { selUDS.innerHTML = '<option value="">-- Primero Contrato --</option>'; selUDS.disabled = true; }
            if (secCtr) secCtr.classList.add('opacity-50');
            if (secUDS) secUDS.style.opacity = '0.5';

            if (!regional) {
                if (selMod) { selMod.innerHTML = '<option value="">-- Primero Regional --</option>'; selMod.disabled = true; }
                if (secMod) secMod.classList.add('opacity-50');
                wizardSync();
                return;
            }

            // Obtener modalidades únicas para esta regional
            const regCtrs = window.REGIONALES_CONTRATOS || {};
            const modCtrs = window.MODALIDADES_CONTRATOS || {};
            const modalesDisponibles = [...new Set(
                Object.entries(regCtrs)
                    .filter(([cod, reg]) => reg === regional)
                    .map(([cod]) => modCtrs[cod])
                    .filter(Boolean)
            )];

            if (selMod) {
                selMod.innerHTML = '<option value="">Seleccione...</option>' +
                    modalesDisponibles.map(m => `<option value="${m}">${m}</option>`).join('');
                selMod.disabled = false;
            }
            if (secMod) secMod.classList.remove('opacity-50');
            updateStyles();
            wizardSync();
        }

function onModalidadChange() {
            const regional  = document.getElementById('regionalSelect')?.value  || '';
            const modalidad = document.getElementById('modalidadSelect')?.value || '';
            const selCtr    = document.getElementById('contractNumber');
            const secCtr    = document.getElementById('sectionContrato');
            const selUDS    = document.getElementById('mainUdsDropdown');
            const secUDS    = document.getElementById('sectionUDS');
            const perfil    = AsociacionesModule.getPerfilActivo();

            if (selUDS) { selUDS.innerHTML = '<option value="">-- Primero Contrato --</option>'; selUDS.disabled = true; }
            if (secUDS) secUDS.style.opacity = '0.5';

            if (!modalidad || !selCtr) {
                if (selCtr) { selCtr.innerHTML = '<option value="">-- Primero Modalidad --</option>'; selCtr.disabled = true; }
                if (secCtr) secCtr.classList.add('opacity-50');
                wizardSync();
                return;
            }

            const regCtrs = window.REGIONALES_CONTRATOS  || {};
            const modCtrs = window.MODALIDADES_CONTRATOS || {};
            const contratos = perfil?.contratos || {};

            const filtrados = Object.entries(contratos).filter(([cod]) =>
                regCtrs[cod] === regional && modCtrs[cod] === modalidad
            );

            selCtr.innerHTML = '<option value="">Seleccione...</option>' +
                filtrados.map(([cod, lbl]) => `<option value="${cod}">${lbl || 'Contrato ' + cod}</option>`).join('');
            selCtr.disabled = filtrados.length === 0;
            if (secCtr) secCtr.classList.remove('opacity-50');
            if (filtrados.length === 1) {
                selCtr.value = filtrados[0][0];
                updateStyles();
            }
            wizardSync();
        }

function updateStyles() {
            const contract = document.getElementById('contractNumber');
            const mainCard = document.getElementById('mainCard');
            const indicator = document.getElementById('contractIndicator');
            const udsSelect = document.getElementById('mainUdsDropdown');
            const sectionUDS = document.getElementById('sectionUDS');
            
            if (!contract) return;
            
            const contractValue = contract.value;
            
            if (mainCard) {
                mainCard.className = "glass-container w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-t-[14px] dynamic-border animate__animated animate__fadeIn";
                if (contractValue) mainCard.classList.add(`contract-${contractValue}`);
            }
            
            document.body.style.background = BACKGROUNDS[contractValue] || BACKGROUNDS['default'];
            
            if (contractValue) {
                if (indicator) {
                    indicator.className = `px-4 py-1.5 rounded-full text-xs font-black text-white dynamic-bg uppercase`;
                    indicator.textContent = `Contrato ${contractValue}`;
                }
                if (udsSelect) udsSelect.disabled = false;
                if (sectionUDS) sectionUDS.style.opacity = "1";
                populateUDS(contractValue);
            } else {
                if (indicator) {
                    indicator.className = "px-4 py-1.5 rounded-full text-xs font-black text-white bg-slate-400 uppercase";
                    indicator.textContent = "Sin Contrato";
                }
                if (udsSelect) {
                    udsSelect.disabled = true;
                    udsSelect.innerHTML = '<option value="">-- Primero Contrato --</option>';
                }
                if (sectionUDS) sectionUDS.style.opacity = "0.5";
            }
            wizardSync();
        }

function populateUDS(contract) {
            const udsSelect = document.getElementById('mainUdsDropdown');
            if (!udsSelect) return;
            
            udsSelect.innerHTML = '<option value="">-- Seleccione UDS --</option>';
            window.UDS_DATA[contract]?.forEach(([name, code]) => {
                const opt = document.createElement('option');
                opt.value = `${name} - ${code}`;
                opt.textContent = `${name} - ${code}`;
                udsSelect.appendChild(opt);
            });
        }

function toggleSection(type) {
            const section = document.getElementById(type === 'retiro' ? 'sectionRetiro' : 'sectionIngreso');
            const check = document.getElementById(type === 'retiro' ? 'checkRetiro' : 'checkIngreso');
            if (section && check) section.classList.toggle('hidden', !check.checked);
        }

/* ============================================================
   RESET COMPLETO DEL FORMULARIO
   Función única reutilizada tras un envío exitoso, al cambiar
   de asociación/operador (index.html) y desde el botón manual
   "Limpiar formulario".
   ============================================================ */
function resetFormularioCompleto(opts) {
    opts = opts || {};
    const form = document.getElementById('noveltyForm');
    if (!form) return;

    form.reset(); // dispara también el listener que limpia los dropzones

    if (typeof DuplicadosModule !== 'undefined') DuplicadosModule.limpiarAvisos();
    if (typeof updateStyles === 'function') updateStyles(); // internamente llama a wizardSync()

    const secRetiro = document.getElementById('sectionRetiro');
    const secIngreso = document.getElementById('sectionIngreso');
    if (secRetiro) secRetiro.classList.add('hidden');
    if (secIngreso) secIngreso.classList.add('hidden');

    const displayAge = document.getElementById('displayAge');
    if (displayAge) displayAge.value = 'Esperando fechas...';

    const nutricionIndicator = document.getElementById('nutricionIndicator');
    if (nutricionIndicator) nutricionIndicator.style.display = 'none';

    if (typeof resetDropzones === 'function') resetDropzones();
    if (typeof wizardSync === 'function') wizardSync();

    if (opts.toastMsg && typeof showToast === 'function') {
        showToast(opts.toastMsg, opts.toastType || 'info');
    }
}

function limpiarFormularioManual() {
    const form = document.getElementById('noveltyForm');
    const tieneDatos = form && Array.from(form.elements).some(el => {
        if (el.disabled) return false;
        if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
        if (el.type === 'file') return el.files && el.files.length > 0;
        if (el.tagName === 'SELECT') return !!el.value;
        return !!(el.value && el.value.trim());
    });

    if (tieneDatos && !confirm('¿Seguro que deseas limpiar el formulario? Se perderán los datos no guardados.')) {
        return;
    }

    resetFormularioCompleto({ toastMsg: '🧹 Formulario limpio', toastType: 'info' });
}

/* ============================================================
   WIZARD — Regional → Modalidad → Contrato → UDS
   Los <select> originales (regionalSelect, modalidadSelect,
   contractNumber, mainUdsDropdown) siguen siendo la única
   fuente de verdad; esto solo controla la presentación visual
   (qué paso se ve expandido, cuál aparece con check, etc.)
   ============================================================ */
let wizardManualStep = null;

function wizardGoToStep(n) {
    const ids = ['regionalSelect', 'modalidadSelect', 'contractNumber', 'mainUdsDropdown'];
    const sel = document.getElementById(ids[n - 1]);
    if (!sel || sel.disabled) return; // paso bloqueado, ignorar clic
    wizardManualStep = n;
    wizardRender(n);
}

function wizardSync() {
    wizardManualStep = null;
    const sels = [
        document.getElementById('regionalSelect'),
        document.getElementById('modalidadSelect'),
        document.getElementById('contractNumber'),
        document.getElementById('mainUdsDropdown')
    ];
    let active = 1;
    for (let i = 0; i < 4; i++) {
        const s = sels[i];
        if (!s || s.disabled) { active = Math.max(1, i); break; }
        if (!s.value) { active = i + 1; break; }
        active = i + 1;
    }
    wizardRender(active, sels);
}

const WIZARD_LABELS = ['Regional', 'Modalidad', 'Contrato', 'UDS'];
const WIZARD_FIELD_IDS = ['sectionRegional', 'sectionModalidad', 'sectionContrato', 'sectionUDS'];

function wizardRender(activeStep, sels) {
    sels = sels || [
        document.getElementById('regionalSelect'),
        document.getElementById('modalidadSelect'),
        document.getElementById('contractNumber'),
        document.getElementById('mainUdsDropdown')
    ];
    if (wizardManualStep) activeStep = wizardManualStep;

    // Mostrar únicamente el campo del paso activo (una sola fila visible)
    WIZARD_FIELD_IDS.forEach((id, idx) => {
        const field = document.getElementById(id);
        if (field) field.classList.toggle('is-visible', (idx + 1) === activeStep);
    });

    // Encabezado del paso actual
    const numEl = document.getElementById('wizardCurrentNum');
    const labelEl = document.getElementById('wizardCurrentLabel');
    if (numEl) numEl.textContent = String(activeStep);
    if (labelEl) labelEl.textContent = WIZARD_LABELS[activeStep - 1] || '';

    // Círculos de progreso y conectores
    for (let i = 1; i <= 4; i++) {
        const sel = sels[i - 1];
        const filled = !!(sel && sel.value);
        const locked = !!(sel && sel.disabled);
        const isActive = (i === activeStep) && !locked;

        const dot = document.getElementById('wizDot' + i);
        if (dot) {
            dot.classList.toggle('is-active', isActive);
            dot.classList.toggle('is-done', filled);
            dot.innerHTML = filled ? '&#10003;' : String(i);
        }
        if (i < 4) {
            const conn = document.getElementById('wizConn' + i);
            if (conn) conn.classList.toggle('is-done', filled);
        }
    }

    // Migas de pasos completados (distintos del activo) para volver a editarlos
    const crumbsWrap = document.getElementById('wizardCrumbs');
    if (crumbsWrap) {
        crumbsWrap.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            if (i === activeStep) continue;
            const sel = sels[i - 1];
            if (sel && sel.value && !sel.disabled) {
                const text = sel.options[sel.selectedIndex]?.text || '';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wizard-crumb';
                btn.addEventListener('click', () => wizardGoToStep(i));
                btn.innerHTML = '<span class="wizard-crumb-label"></span> <span class="wizard-crumb-value"></span>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
                btn.querySelector('.wizard-crumb-label').textContent = WIZARD_LABELS[i - 1] + ':';
                btn.querySelector('.wizard-crumb-value').textContent = text;
                crumbsWrap.appendChild(btn);
            }
        }
        crumbsWrap.style.display = crumbsWrap.children.length ? 'flex' : 'none';
    }
}

/* ============================================================
   DROPZONES — arrastrar y soltar para los adjuntos (RAM / soporte)
   ============================================================ */
function initDropzones() {
    document.querySelectorAll('.dropzone').forEach(zone => {
        if (zone.dataset.dzReady) return;
        zone.dataset.dzReady = '1';

        const input = zone.querySelector('input[type="file"]');
        const nameEl = zone.querySelector('.dropzone-filename');
        if (!input) return;

        const updateName = () => {
            if (input.files && input.files.length > 0) {
                zone.classList.add('has-file');
                if (nameEl) nameEl.textContent = '📄 ' + input.files[0].name;
            } else {
                zone.classList.remove('has-file');
                if (nameEl) nameEl.textContent = '';
            }
        };

        input.addEventListener('change', updateName);

        ['dragenter', 'dragover'].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('is-dragover');
            });
        });
        ['dragleave', 'dragend', 'drop'].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('is-dragover');
            });
        });
        zone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                input.files = dt.files;
                updateName();
            }
        });

        updateName();
    });
}

function resetDropzones() {
    document.querySelectorAll('.dropzone').forEach(zone => {
        zone.classList.remove('has-file', 'is-dragover');
        const nameEl = zone.querySelector('.dropzone-filename');
        if (nameEl) nameEl.textContent = '';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDropzones();
    wizardSync();
    const form = document.getElementById('noveltyForm');
    if (form) form.addEventListener('reset', () => setTimeout(resetDropzones, 0));
});

function updateAgeDisplay() {
            const dobValue = document.getElementById('ingresoDOB');
            const entryValue = document.getElementById('ingresoDate');
            const displayField = document.getElementById('displayAge');

            if (dobValue && entryValue && displayField && dobValue.value && entryValue.value) {
                const ageResult = calculateAge(dobValue.value, entryValue.value);
                displayField.value = ageResult;
            } else if (displayField) {
                displayField.value = "Esperando fechas...";
            }
        }

function calculateAge(dob, entry) {
            const d1 = new Date(dob);
            const d2 = new Date(entry);
            d1.setMinutes(d1.getMinutes() + d1.getTimezoneOffset());
            d2.setMinutes(d2.getMinutes() + d2.getTimezoneOffset());

            let years = d2.getFullYear() - d1.getFullYear();
            let months = d2.getMonth() - d1.getMonth();
            let days = d2.getDate() - d1.getDate();

            if (days < 0) months--;
            if (months < 0) { years--; months += 12; }
            return `${years} años y ${months} meses`;
        }

function showFeedback(message, type) {
            const container = document.getElementById('feedbackContainer');
            if (!container) return;
            
            container.textContent = message;
            container.className = `p-5 rounded-2xl text-center text-sm font-bold animate__animated animate__fadeInUp mt-4 `;
            if (type === 'success') container.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
            else container.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-200', 'animate__shakeX');
            container.classList.remove('hidden');
        }

function formatData() {
            const contractNumber = document.getElementById('contractNumber');
            const udsSelection = document.getElementById('mainUdsDropdown');
            
            if (!contractNumber || !udsSelection) return '';
            
            const utsName = udsSelection.value ? udsSelection.value.split(' - ')[0] : 'No Seleccionado';
            const utsCode = udsSelection.value ? udsSelection.value.split(' - ')[1] : 'No Seleccionado';
            
            let formData = `=================================\n`;
            formData +=    ` REPORTE DE NOVEDADES\n`;
            formData +=    `=================================\n\n`;
            
            formData += `[ INFORMACIÓN GENERAL ]\n`;
            formData += `> CONTRATO:      ${contractNumber.value}\n`;
            formData += `> UDS NOMBRE:    ${utsName}\n`;
            formData += `> UDS CÓDIGO:    ${utsCode}\n`;
            formData += `------------------------------------------\n\n`;

            const checkRetiro = document.getElementById('checkRetiro');
            const checkIngreso = document.getElementById('checkIngreso');
            
            const tieneRetiro = checkRetiro && checkRetiro.checked;
            const tieneIngreso = checkIngreso && checkIngreso.checked;
            
            if (tieneRetiro) {
                const retiroDocType = document.getElementById('retiroDocType');
                const retiroDocNumber = document.getElementById('retiroDocNumber');
                const retiroFullName = document.getElementById('retiroFullName');
                const retiroDate = document.getElementById('retiroDate');
                const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');
                
                formData += `[ DATOS DE RETIRO ]\n`;
                formData += `  - Documento:  ${retiroDocType ? retiroDocType.value : ''} ${retiroDocNumber ? retiroDocNumber.value : ''}\n`;
                formData += `  - Nombre:     ${retiroFullName ? retiroFullName.value.toUpperCase() : ''}\n`;
                formData += `  - Fecha:      ${retiroDate ? formatDateDMY(retiroDate.value) : ''}\n`;
                formData += `  - Género:     ${retiroGender ? retiroGender.value : 'N/A'}\n\n`;
            }

            if (tieneIngreso) {
                const ingresoDocType = document.getElementById('ingresoDocType');
                const ingresoDocNumber = document.getElementById('ingresoDocNumber');
                const ingresoFullName = document.getElementById('ingresoFullName');
                const displayAge = document.getElementById('displayAge');
                const ingresoDOB = document.getElementById('ingresoDOB');
                const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
                const ingresoAddress = document.getElementById('ingresoAddress');
                const ingresoPhone = document.getElementById('ingresoPhone');
                const acudienteName = document.getElementById('acudienteName');
                const acudienteDoc = document.getElementById('acudienteDoc');
                const acudienteDOB = document.getElementById('acudienteDOB');
                const ingresoDate = document.getElementById('ingresoDate');
                const ingresoComuna = document.getElementById('ingresoComuna');
                const ingresoBarrio = document.getElementById('ingresoBarrio');
                
                formData += `[ DATOS DE INGRESO ]\n`;
                formData += `  - Niño:       ${ingresoFullName ? ingresoFullName.value.toUpperCase() : ''}\n`;
                formData += `  - Documento:  ${ingresoDocType ? ingresoDocType.value : ''} ${ingresoDocNumber ? ingresoDocNumber.value : ''}\n`;
                formData += `  - Edad:       ${displayAge ? displayAge.value : ''}\n`;
                formData += `  - F. Nacim:   ${ingresoDOB ? formatDateDMY(ingresoDOB.value) : ''}\n`;
                formData += `  - F. Ingreso: ${ingresoDate ? formatDateDMY(ingresoDate.value) : ''}\n`;
                formData += `  - Género:     ${ingresoGender ? ingresoGender.value : 'N/A'}\n`;
                formData += `  - Comuna:     ${ingresoComuna ? ingresoComuna.value : ''}\n`;
                formData += `  - Barrio:     ${ingresoBarrio ? ingresoBarrio.value : ''}\n`;
                formData += `  - Direccion:  ${ingresoAddress ? ingresoAddress.value : ''}\n`;
                formData += `  - Teléfono:   ${ingresoPhone ? ingresoPhone.value : ''}\n\n`;
                
                formData += `[ DATOS DEL ACUDIENTE ]\n`;
                formData += `  - Nombre:     ${acudienteName ? acudienteName.value : ''}\n`;
                formData += `  - F. Nacim:   ${acudienteDOB ? formatDateDMY(acudienteDOB.value) : ''}\n`;
                formData += `  - Documento:  ${acudienteDoc ? acudienteDoc.value : ''}\n`;

                const nutricionFecha = document.getElementById('nutricionFecha');
                const nutricionPeso = document.getElementById('nutricionPeso');
                const nutricionTalla = document.getElementById('nutricionTalla');
                const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');
                const nutricionRegimen = document.getElementById('nutricionRegimen');
                const nutricionEPS = document.getElementById('nutricionEPS');
                const nutricionStatus = document.getElementById('nutricionStatus');

                const nutricionPendienteEl = document.getElementById('nutricionPendiente');
                const isNutrPend = nutricionPendienteEl && nutricionPendienteEl.checked;
                if (isNutrPend) {
                    formData += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
                    formData += `  ⏳ DATO PENDIENTE - Se completará desde el panel de administración\n`;
                } else if (nutricionFecha && nutricionFecha.value) {
                    formData += `\n[ SEGUIMIENTO NUTRICIONAL ]\n`;
                    formData += `  - F. Valoración:      ${formatDateDMY(nutricionFecha.value)}\n`;
                    formData += `  - Peso:               ${nutricionPeso ? nutricionPeso.value + ' kg' : ''}\n`;
                    formData += `  - Talla:              ${nutricionTalla ? nutricionTalla.value + ' cm' : ''}\n`;
                    formData += `  - Perímetro Braquial: ${nutricionPerimetroBraquial ? nutricionPerimetroBraquial.value + ' cm' : ''}\n`;
                    formData += `  - Régimen:            ${nutricionRegimen ? nutricionRegimen.value : ''}\n`;
                    formData += `  - EPS:                ${nutricionEPS ? nutricionEPS.value : ''}\n`;
                    formData += `  - Estado Nutric.:     ${nutricionStatus ? nutricionStatus.textContent : 'No calculado'}\n`;
                }
            }
            
            if (!tieneRetiro && !tieneIngreso) {
                formData += `[ ⚠️ NO SE SELECCIONÓ RETIRO NI INGRESO ]\n`;
            }
            
            formData += `\n------------------------------------------\n`;
            formData += `Generado el: ${new Date().toLocaleString()}\n`;
            
            return formData;
        }

document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('noveltyForm');
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const btn = document.getElementById('submitButton');

                    // Verificar que hay perfil activo
                    if (!AsociacionesModule.getPerfilActivo()) {
                        showToast('⚠️ Selecciona una asociación antes de reportar', 'warning');
                        AsociacionesModule.mostrarSelectorAsociaciones();
                        return;
                    }
                    
                    const contract = document.getElementById('contractNumber');
                    const uds = document.getElementById('mainUdsDropdown');
                    const checkRetiro = document.getElementById('checkRetiro');
                    const checkIngreso = document.getElementById('checkIngreso');
                    const fileInput = document.querySelector('input[name="soporte_documento"]');
                    const ramFileInput = document.querySelector('input[name="retiro_ram_diligenciado"]');
                    
                    if (!contract || !uds || !checkRetiro || !checkIngreso) {
                        showToast("Error: Elementos del formulario no encontrados", "error");
                        return;
                    }

                    const isRetiro = checkRetiro.checked;
                    const isIngreso = checkIngreso.checked;

                    // ============================================
                    // VALIDACIONES GENERALES (siempre aplican)
                    // ============================================
                    if (!contract.value) {
                        showToast("❌ Seleccione el CONTRATO", "error");
                        contract?.classList.add('input-error');
                        contract?.focus();
                        return;
                    }
                    contract?.classList.remove('input-error');

                    if (!uds.value) {
                        showToast("❌ Seleccione la UDS", "error");
                        uds?.classList.add('input-error');
                        uds?.focus();
                        return;
                    }
                    uds?.classList.remove('input-error');

                    if (!isRetiro && !isIngreso) {
                        showToast("❌ Seleccione al menos una acción: RETIRO o INGRESO", "error");
                        return;
                    }

                    // ============================================
                    // VALIDACIONES SOLO PARA RETIRO
                    // ============================================
                    if (isRetiro) {
                        const retiroDocNumber = document.getElementById('retiroDocNumber');
                        const retiroFullName = document.getElementById('retiroFullName');
                        const retiroDate = document.getElementById('retiroDate');
                        const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');

                        // Documento obligatorio
                        if (!retiroDocNumber || !retiroDocNumber.value.trim()) {
                            showToast("❌ El DOCUMENTO del beneficiario a retirar es OBLIGATORIO", "error");
                            retiroDocNumber?.classList.add('input-error');
                            retiroDocNumber?.focus();
                            return;
                        }
                        
                        if (retiroDocNumber.value.length < 7 || retiroDocNumber.value.length > 10) {
                            showToast("El documento de retiro debe tener entre 7 y 10 dígitos", "error");
                            retiroDocNumber.classList.add('input-error');
                            retiroDocNumber.focus();
                            return;
                        }
                        retiroDocNumber.classList.remove('input-error');

                        // Nombre obligatorio
                        if (!retiroFullName || !retiroFullName.value.trim()) {
                            showToast("❌ El NOMBRE del beneficiario a retirar es OBLIGATORIO", "error");
                            retiroFullName?.classList.add('input-error');
                            retiroFullName?.focus();
                            return;
                        }
                        
                        const nombreParts = retiroFullName.value.trim().split(/\s+/);
                        if (nombreParts.length < 2) {
                            showToast("Ingrese nombre y apellidos completos del retiro", "error");
                            retiroFullName.classList.add('input-error');
                            retiroFullName.focus();
                            return;
                        }
                        retiroFullName.classList.remove('input-error');

                        // Fecha de retiro obligatoria
                        if (!retiroDate || !retiroDate.value) {
                            showToast("❌ La FECHA DE RETIRO es OBLIGATORIA", "error");
                            retiroDate?.classList.add('input-error');
                            retiroDate?.focus();
                            return;
                        }
                        retiroDate.classList.remove('input-error');

                        // Género obligatorio
                        if (!retiroGender) {
                            showToast("❌ Seleccione el GÉNERO del beneficiario a retirar", "error");
                            // Scroll al campo
                            document.getElementById('sectionRetiro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                    }

                    // ============================================
                    // VALIDACIONES SOLO PARA INGRESO
                    // ============================================
                    if (isIngreso) {
                        const ingresoDocNumber = document.getElementById('ingresoDocNumber');
                        const ingresoFullName = document.getElementById('ingresoFullName');
                        const ingresoDOB = document.getElementById('ingresoDOB');
                        const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
                        const ingresoDate = document.getElementById('ingresoDate');
                        const ingresoAddress = document.getElementById('ingresoAddress');
                        const ingresoPhone = document.getElementById('ingresoPhone');
                        const acudienteName = document.getElementById('acudienteName');
                        const ingresoComuna = document.getElementById('ingresoComuna');
                        const ingresoBarrio = document.getElementById('ingresoBarrio');

                        // Documento obligatorio
                        if (!ingresoDocNumber || !ingresoDocNumber.value.trim()) {
                            showToast("❌ El DOCUMENTO del beneficiario es OBLIGATORIO", "error");
                            ingresoDocNumber?.classList.add('input-error');
                            ingresoDocNumber?.focus();
                            return;
                        }
                        
                        if (ingresoDocNumber.value.length < 7 || ingresoDocNumber.value.length > 10) {
                            showToast("El documento debe tener entre 7 y 10 dígitos", "error");
                            ingresoDocNumber.classList.add('input-error');
                            ingresoDocNumber.focus();
                            return;
                        }
                        ingresoDocNumber.classList.remove('input-error');

                        // Nombre obligatorio
                        if (!ingresoFullName || !ingresoFullName.value.trim()) {
                            showToast("❌ El NOMBRE del beneficiario es OBLIGATORIO", "error");
                            ingresoFullName?.classList.add('input-error');
                            ingresoFullName?.focus();
                            return;
                        }
                        
                        const nombreParts = ingresoFullName.value.trim().split(/\s+/);
                        if (nombreParts.length < 2) {
                            showToast("Ingrese nombre y apellidos completos", "error");
                            ingresoFullName.classList.add('input-error');
                            ingresoFullName.focus();
                            return;
                        }
                        ingresoFullName.classList.remove('input-error');

                        // Fecha de nacimiento obligatoria
                        if (!ingresoDOB || !ingresoDOB.value) {
                            showToast("❌ La FECHA DE NACIMIENTO es OBLIGATORIA", "error");
                            ingresoDOB?.classList.add('input-error');
                            ingresoDOB?.focus();
                            return;
                        }
                        ingresoDOB.classList.remove('input-error');

                        // Género obligatorio
                        if (!ingresoGender) {
                            showToast("❌ Seleccione el GÉNERO del beneficiario", "error");
                            document.getElementById('sectionIngreso')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }

                        // Fecha de ingreso obligatoria
                        if (!ingresoDate || !ingresoDate.value) {
                            showToast("❌ La FECHA DE INGRESO es OBLIGATORIA", "error");
                            ingresoDate?.classList.add('input-error');
                            ingresoDate?.focus();
                            return;
                        }
                        ingresoDate.classList.remove('input-error');

                        // Comuna obligatoria
                        if (!ingresoComuna || !ingresoComuna.value) {
                            showToast("❌ La COMUNA es OBLIGATORIA", "error");
                            ingresoComuna?.classList.add('input-error');
                            ingresoComuna?.focus();
                            return;
                        }
                        ingresoComuna.classList.remove('input-error');

                        // Barrio obligatorio
                        if (!ingresoBarrio || !ingresoBarrio.value.trim()) {
                            showToast("❌ El BARRIO es OBLIGATORIO", "error");
                            ingresoBarrio?.classList.add('input-error');
                            ingresoBarrio?.focus();
                            return;
                        }
                        ingresoBarrio.classList.remove('input-error');

                        // Dirección obligatoria
                        if (!ingresoAddress || !ingresoAddress.value.trim()) {
                            showToast("❌ La DIRECCIÓN es OBLIGATORIA", "error");
                            ingresoAddress?.classList.add('input-error');
                            ingresoAddress?.focus();
                            return;
                        }
                        ingresoAddress.classList.remove('input-error');

                        // Teléfono obligatorio
                        if (!ingresoPhone || !ingresoPhone.value.trim()) {
                            showToast("❌ El TELÉFONO de contacto es OBLIGATORIO", "error");
                            ingresoPhone?.classList.add('input-error');
                            ingresoPhone?.focus();
                            return;
                        }
                        ingresoPhone.classList.remove('input-error');

                        // Acudiente obligatorio
                        if (!acudienteName || !acudienteName.value.trim()) {
                            showToast("❌ El NOMBRE del acudiente es OBLIGATORIO", "error");
                            acudienteName?.classList.add('input-error');
                            acudienteName?.focus();
                            return;
                        }
                        acudienteName.classList.remove('input-error');

                        // Documento del acudiente obligatorio
                        const acudienteDoc = document.getElementById('acudienteDoc');
                        if (!acudienteDoc || !acudienteDoc.value.trim()) {
                            showToast("❌ El DOCUMENTO del acudiente es OBLIGATORIO", "error");
                            acudienteDoc?.classList.add('input-error');
                            acudienteDoc?.focus();
                            return;
                        }
                        acudienteDoc.classList.remove('input-error');

                        // Fecha de nacimiento del acudiente obligatoria
                        const acudienteDOBCheck = document.getElementById('acudienteDOB');
                        if (!acudienteDOBCheck || !acudienteDOBCheck.value) {
                            showToast("❌ La FECHA DE NACIMIENTO del acudiente es OBLIGATORIA", "error");
                            acudienteDOBCheck?.classList.add('input-error');
                            acudienteDOBCheck?.focus();
                            return;
                        }
                        acudienteDOBCheck.classList.remove('input-error');

                        // Validaciones de nutrición (solo si NO es dato pendiente)
                        const nutricionPendienteCheck = document.getElementById('nutricionPendiente');
                        const isNutricionPendiente = nutricionPendienteCheck && nutricionPendienteCheck.checked;

                        const nutricionPeso = document.getElementById('nutricionPeso');
                        const nutricionTalla = document.getElementById('nutricionTalla');
                        const nutricionFecha = document.getElementById('nutricionFecha');
                        const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');

                        if (!isNutricionPendiente) {
                            if (!nutricionPeso || !nutricionPeso.value) {
                                showToast("❌ El PESO es obligatorio para el seguimiento nutricional", "error");
                                nutricionPeso?.classList.add('input-error');
                                nutricionPeso?.focus();
                                return;
                            }
                            
                            if (!nutricionTalla || !nutricionTalla.value) {
                                showToast("❌ La TALLA es obligatoria para el seguimiento nutricional", "error");
                                nutricionTalla?.classList.add('input-error');
                                nutricionTalla?.focus();
                                return;
                            }
                            
                            if (!nutricionFecha || !nutricionFecha.value) {
                                showToast("❌ La FECHA DE VALORACIÓN es obligatoria", "error");
                                nutricionFecha?.classList.add('input-error');
                                nutricionFecha?.focus();
                                return;
                            }

                            if (!nutricionPerimetroBraquial || !nutricionPerimetroBraquial.value) {
                                showToast("❌ El PERÍMETRO BRAQUIAL es obligatorio", "error");
                                nutricionPerimetroBraquial?.classList.add('input-error');
                                nutricionPerimetroBraquial?.focus();
                                return;
                            }
                        }

                        const peso = parseFloat(nutricionPeso.value);
                        const talla = parseFloat(nutricionTalla.value);
                        const perimetroBraquial = parseFloat(nutricionPerimetroBraquial.value);

                        if (peso < 5 || peso > 30.5) {
                            showToast("❌ El peso debe estar entre 5 y 30.5 kg", "error");
                            nutricionPeso.classList.add('input-error');
                            return;
                        }
                        nutricionPeso.classList.remove('input-error');

                        if (talla < 50 || talla > 130.5) {
                            showToast("❌ La talla debe estar entre 50 y 130.5 cm", "error");
                            nutricionTalla.classList.add('input-error');
                            return;
                        }
                        nutricionTalla.classList.remove('input-error');

                        if (perimetroBraquial < 6 || perimetroBraquial > 30) {
                            showToast("❌ El perímetro braquial debe estar entre 6 y 30 cm", "error");
                            nutricionPerimetroBraquial.classList.add('input-error');
                            return;
                        }
                        nutricionPerimetroBraquial.classList.remove('input-error');
                    }

                    // ============================================
                    // VALIDACIÓN DE FECHAS CRUZADAS (solo si hay ambos)
                    // ============================================
                    if (isRetiro && isIngreso) {
                        const retiroDate = document.getElementById('retiroDate');
                        const ingresoDate = document.getElementById('ingresoDate');
                        
                        if (retiroDate?.value && ingresoDate?.value) {
                            const dRetiro = new Date(retiroDate.value);
                            const dIngreso = new Date(ingresoDate.value);
                            dRetiro.setMinutes(dRetiro.getMinutes() + dRetiro.getTimezoneOffset());
                            dIngreso.setMinutes(dIngreso.getMinutes() + dIngreso.getTimezoneOffset());

                            if (dRetiro >= dIngreso) {
                                showToast("❌ La fecha de retiro debe ser anterior a la fecha de ingreso", "error");
                                retiroDate.classList.add('input-error');
                                ingresoDate.classList.add('input-error');
                                return;
                            }
                            retiroDate.classList.remove('input-error');
                            ingresoDate.classList.remove('input-error');
                        }
                    }

                    // ============================================
					// CONSTRUIR DATOS PARA ENVÍO
					// ============================================
					const udsName = uds.value.split(' - ')[0];
					const noveltyData = {
						contract:         contract.value,
						udsName:          udsName,
						udsFull:          uds.value,
						regional:         document.getElementById('regionalSelect')?.value  || '',
						modalidad:        document.getElementById('modalidadSelect')?.value || '',
						timestamp:        new Date().toISOString(),
						date:             new Date().toISOString().split('T')[0],
						cuentameStatus:   'pendiente',
						asociacionId:     AsociacionesModule.getPerfilActivo()?.id     || '',
						asociacionNombre: AsociacionesModule.getPerfilActivo()?.nombre || '',
						correoRespuesta:  document.getElementById('correoRespuesta')?.value?.trim() || '',
						seguimiento: {
							estadoInterno: 'pendiente',
							historial: null
						}
					};

					// Determinar tipo
					if (isRetiro && isIngreso) {
						noveltyData.type = 'ambos';
						noveltyData.hasRetiro = true;
						noveltyData.hasIngreso = true;
					} else if (isRetiro) {
						noveltyData.type = 'retiro';
						noveltyData.hasRetiro = true;
						noveltyData.hasIngreso = false;
					} else if (isIngreso) {
						noveltyData.type = 'ingreso';
						noveltyData.hasRetiro = false;
						noveltyData.hasIngreso = true;
					}

					// Datos de retiro (solo si aplica)
					if (isRetiro) {
						const retiroDocType = document.getElementById('retiroDocType');
						const retiroDocNumber = document.getElementById('retiroDocNumber');
						const retiroFullName = document.getElementById('retiroFullName');
						const retiroDate = document.getElementById('retiroDate');
						const retiroGender = document.querySelector('input[name="_retiroGender"]:checked');
						
						noveltyData.retiro = {
							docType: retiroDocType?.value || 'RC',
							document: retiroDocNumber?.value?.trim() || '',
							name: retiroFullName?.value?.trim() || '',
							gender: retiroGender?.value || '',
							retiroDate: retiroDate?.value || ''
						};
						
						// ✅ CORREGIDO: Asignar documento y nombre PRINCIPAL desde retiro
						noveltyData.document = noveltyData.retiro.document;
						noveltyData.name = noveltyData.retiro.name;
					}	

                    // Datos de ingreso (solo si aplica)
					if (isIngreso) {
						const ingresoDocType = document.getElementById('ingresoDocType');
						const ingresoDocNumber = document.getElementById('ingresoDocNumber');
						const ingresoFullName = document.getElementById('ingresoFullName');
						const ingresoDOB = document.getElementById('ingresoDOB');
						const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked');
						const ingresoDate = document.getElementById('ingresoDate');
						const ingresoAddress = document.getElementById('ingresoAddress');
						const ingresoPhone = document.getElementById('ingresoPhone');
						const acudienteName = document.getElementById('acudienteName');
						const acudienteDoc = document.getElementById('acudienteDoc');
						const acudienteDOB = document.getElementById('acudienteDOB');
						const ingresoComuna = document.getElementById('ingresoComuna');
						const ingresoBarrio = document.getElementById('ingresoBarrio');
						
						noveltyData.ingreso = {
							docType: ingresoDocType?.value || 'RC',
							document: ingresoDocNumber?.value?.trim() || '',
							name: ingresoFullName?.value?.trim() || '',
							dob: ingresoDOB?.value || '',
							age: document.getElementById('displayAge')?.value || '',
							gender: ingresoGender?.value || '',
							comuna: ingresoComuna?.value || '',
							barrio: ingresoBarrio?.value?.trim() || '',
							address: ingresoAddress?.value?.trim() || '',
							phone: ingresoPhone?.value?.trim() || '',
							acudiente: acudienteName?.value?.trim() || '',
							acudienteDoc: acudienteDoc?.value?.trim() || '',
							acudienteDOB: acudienteDOB?.value || '',
							ingresoDate: ingresoDate?.value || ''
						};
						
						// ✅ CORREGIDO: Solo asignar documento/name principal si NO hay retiro
						// (si hay ambos, ya se asignó desde retiro arriba)
						if (!isRetiro) {
							noveltyData.document = noveltyData.ingreso.document;
							noveltyData.name = noveltyData.ingreso.name;
						}
						
						// Nutrición solo si hay ingreso
						const nutricionFecha = document.getElementById('nutricionFecha');
						const nutricionPeso = document.getElementById('nutricionPeso');
						const nutricionTalla = document.getElementById('nutricionTalla');
						const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial');
						const nutricionRegimen = document.getElementById('nutricionRegimen');
						const nutricionEPS = document.getElementById('nutricionEPS');
						const nutricionStatus = document.getElementById('nutricionStatus');
						
						const nutricionPendienteFlag = document.getElementById('nutricionPendiente');
						noveltyData.nutricion = {
							pendiente: nutricionPendienteFlag?.checked || false,
							fecha: nutricionFecha?.value || '',
							peso: nutricionPeso?.value || '',
							talla: nutricionTalla?.value || '',
							perimetroBraquial: nutricionPerimetroBraquial?.value || '',
							regimen: nutricionRegimen?.value || '',
							eps: nutricionEPS?.value || '',
							estadoNutricional: nutricionPendienteFlag?.checked ? '⏳ Pendiente' : (nutricionStatus?.textContent || 'No calculado')
						};
					}

                    // Preparar datos para Google Apps Script
                    const googleData = {
                        Contrato: contract.value,
                        UDS_Full: uds.value,
                        REPORTE_DETALLADO: formatData(),
                        _subject: `Novedad UDS: ${udsName}`
                    };

                    // Solo agregar datos de retiro si existe
                    if (isRetiro && noveltyData.retiro) {
                        googleData.retiro_tipo_doc = noveltyData.retiro.docType;
                        googleData.retiro_documento = noveltyData.retiro.document;
                        googleData.retiro_nombre = noveltyData.retiro.name;
                        googleData.retiro_fecha = noveltyData.retiro.retiroDate;
                        googleData._retiroGender = noveltyData.retiro.gender;
                    }

                    // Solo agregar datos de ingreso si existe
                    if (isIngreso && noveltyData.ingreso) {
                        googleData.ingreso_tipo_doc = noveltyData.ingreso.docType;
                        googleData.ingreso_documento = noveltyData.ingreso.document;
                        googleData.ingreso_nombre = noveltyData.ingreso.name;
                        googleData.ingreso_nacimiento = noveltyData.ingreso.dob;
                        googleData.edad_calculada = noveltyData.ingreso.age;
                        googleData.ingreso_fecha = noveltyData.ingreso.ingresoDate;
                        googleData._ingresoGender = noveltyData.ingreso.gender;
                        googleData.ingreso_comuna = noveltyData.ingreso.comuna;
                        googleData.ingreso_barrio = noveltyData.ingreso.barrio;
                        googleData.ingreso_direccion = noveltyData.ingreso.address;
                        googleData.ingreso_telefono = noveltyData.ingreso.phone;
                        googleData.acudiente_documento = noveltyData.ingreso.acudienteDoc;
                        googleData.acudiente_nombre = noveltyData.ingreso.acudiente;
                        googleData.acudiente_nacimiento = noveltyData.ingreso.acudienteDOB;
                        googleData.nutricion_fecha = noveltyData.nutricion.fecha;
                        googleData.nutricion_peso = noveltyData.nutricion.peso;
                        googleData.nutricion_talla = noveltyData.nutricion.talla;
                        googleData.nutricion_perimetro_braquial = noveltyData.nutricion.perimetroBraquial;
                        googleData.nutricion_regimen = noveltyData.nutricion.regimen;
                        googleData.nutricion_eps = noveltyData.nutricion.eps;
                    }

                    if (btn) {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner"></span> GUARDANDO...';
                    }

                    try {
                        const refPath = AsociacionesModule.getRef('novelties');

                        // 1. Procesar archivo si existe (se necesita ANTES de decidir
                        //    online/offline, porque si se encola para después, el
                        //    archivo ya debe ir embebido en base64 dentro de googleData)
                        if (fileInput?.files?.length > 0) {
                            const file = fileInput.files[0];

                            if (file.size > 8 * 1024 * 1024) {
                                throw new Error("El archivo excede 8MB. Use un archivo más pequeño.");
                            }

                            const base64 = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = e => resolve(e.target.result.split(',')[1]);
                                reader.onerror = () => reject(new Error("Error al leer archivo"));
                                reader.readAsDataURL(file);
                            });

                            googleData.file_base64 = base64;
                            googleData.file_type = file.type;
                            googleData.file_name = file.name;
                        }

                        // 1b. Procesar Ram Diligenciado (solo aplica si hay retiro)
                        if (ramFileInput?.files?.length > 0) {
                            const ramFile = ramFileInput.files[0];

                            if (ramFile.size > 8 * 1024 * 1024) {
                                throw new Error("El archivo del Ram excede 8MB. Use un archivo más pequeño.");
                            }

                            const ramBase64 = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = e => resolve(e.target.result.split(',')[1]);
                                reader.onerror = () => reject(new Error("Error al leer el archivo del Ram"));
                                reader.readAsDataURL(ramFile);
                            });

                            googleData.ram_file_base64 = ramBase64;
                            googleData.ram_file_type = ramFile.type;
                            googleData.ram_file_name = ramFile.name;

                            if (noveltyData.retiro) {
                                noveltyData.retiro.ramFileName = ramFile.name;
                            }
                        }

                        if (!OfflineModule.isOnline()) {
                            // 2a. SIN CONEXIÓN: guardar localmente en IndexedDB y
                            // mostrar el registro de inmediato en la tabla con un ID
                            // temporal. Se sincroniza solo apenas vuelva la señal.
                            const { tempId } = await OfflineModule.queueSubmission({ noveltyData, googleData, refPath });
                            currentNovelties.push({ id: tempId, ...noveltyData, _pendienteSync: true });
                            filterNovelties();
                            updatePendientesIndicator();

                            mostrarResumenEnvio();
                            setTimeout(() => {
                                resetFormularioCompleto({
                                    toastMsg: '📥 Sin conexión: registro guardado en este dispositivo. Se enviará solo cuando vuelva la señal.',
                                    toastType: 'info'
                                });
                            }, 500);
                            if (btn) {
                                btn.disabled = false;
                                btn.innerHTML = '<svg class="cf-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>Guardar Reporte</span>';
                            }
                            return;
                        }

                        // 2b. CON CONEXIÓN: flujo normal
                        await database.ref(refPath).push(noveltyData);
                        console.log('✅ Firebase OK');
                        if (typeof DuplicadosModule !== 'undefined') DuplicadosModule.cargarIndiceGlobal(true);

                        // 3. Enviar a Google Apps Script
                        await enviarAGoogle(googleData, btn);

                    } catch (error) {
                        console.error('Error:', error);
                        showToast(error.message, "error");
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<svg class="cf-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>Guardar Reporte</span>';
                        }
                    }
                });
            }
        });

// Variante de enviarAGoogle sin efectos en la UI (botones, panel resumen,
// reseteo de formulario) — usada por OfflineModule.trySync() al reintentar
// en segundo plano el envío de un registro que se guardó offline.
async function enviarAGoogleSilencioso(data) {
    const formBody = Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key] || ''))
        .join('&');

    await fetch(document.getElementById('noveltyForm').action, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody
    });
}

async function enviarAGoogle(data, btn) {
			const formBody = Object.keys(data)
				.map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key] || ''))
				.join('&');

			try {
				const response = await fetch(document.getElementById('noveltyForm').action, {
					method: 'POST',
					mode: 'no-cors',  // Necesario para Google Apps Script
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: formBody
				});

				// ✅ MOSTRAR PANEL DE RESUMEN ANTES DE LIMPIAR
				mostrarResumenEnvio();
				
				// Pequeña pausa para que el usuario vea el resumen antes de limpiar
				setTimeout(() => {
					resetFormularioCompleto({
						toastMsg: '✅ ¡Éxito! Reporte enviado correctamente.',
						toastType: 'success'
					});
				}, 500);

			} catch (error) {
				console.error('Error envío:', error);
				showToast("❌ Error de conexión con Google Apps Script.", "error");
				throw error;
			} finally {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = '<svg class="cf-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span>Guardar Reporte</span>';
				}
			}
		}

function mostrarResumenEnvio() {
			const panel = document.getElementById('resumenEnvioPanel');
			const body = document.getElementById('resumenPanelBody');
			
			if (!panel || !body) return;
			
			// Construir el contenido del resumen
			body.innerHTML = construirResumenEnvio();
			
			// Mostrar panel
			panel.style.display = 'flex';
			panel.classList.remove('cerrando');
			
			// Prevenir scroll del body
			document.body.classList.add('modal-open');
		}

function cerrarResumenPanel() {
			const panel = document.getElementById('resumenEnvioPanel');
			if (!panel) return;
			
			panel.classList.add('cerrando');
			
			setTimeout(() => {
				panel.style.display = 'none';
				panel.classList.remove('cerrando');
				document.body.classList.remove('modal-open');
			}, 300);
		}

function cerrarYContinuar() {
			cerrarResumenPanel();
		}

function construirResumenEnvio() {
			const contract = document.getElementById('contractNumber')?.value || '';
			const udsFull = document.getElementById('mainUdsDropdown')?.value || '';
			const udsName = udsFull.split(' - ')[0] || '';
			const udsCode = udsFull.split(' - ')[1] || '';
			
			const checkRetiro = document.getElementById('checkRetiro')?.checked || false;
			const checkIngreso = document.getElementById('checkIngreso')?.checked || false;
			
			let html = '';
			
			// Info general
			html += `
				<div class="resumen-info-general">
					<div class="resumen-info-item">
						<span class="resumen-info-label">📋 Contrato</span>
						<span class="resumen-info-valor">${contract || 'No seleccionado'}</span>
					</div>
					<div class="resumen-info-item">
						<span class="resumen-info-label">🏫 UDS</span>
						<span class="resumen-info-valor">${udsName || 'No seleccionada'}</span>
					</div>
					${udsCode ? `
					<div class="resumen-info-item">
						<span class="resumen-info-label">🔢 Código</span>
						<span class="resumen-info-valor" style="font-family: monospace;">${udsCode}</span>
					</div>
					` : ''}
				</div>
			`;
			
			// Determinar tipo y badge
			let tipoBadge = '';
			let tipoClass = '';
			if (checkRetiro && checkIngreso) {
				tipoBadge = '<span class="resumen-tipo-badge ambos">🔄 AMBOS</span>';
				tipoClass = 'ambos';
			} else if (checkRetiro) {
				tipoBadge = '<span class="resumen-tipo-badge retiro">👤 RETIRO</span>';
				tipoClass = 'retiro';
			} else if (checkIngreso) {
				tipoBadge = '<span class="resumen-tipo-badge ingreso">👶 INGRESO</span>';
				tipoClass = 'ingreso';
			}
			
			// Sección de Retiro
			if (checkRetiro) {
				const retiroDocType = document.getElementById('retiroDocType')?.value || 'RC';
				const retiroDocNumber = document.getElementById('retiroDocNumber')?.value || '';
				const retiroFullName = document.getElementById('retiroFullName')?.value || '';
				const retiroDate = document.getElementById('retiroDate')?.value || '';
				const retiroGender = document.querySelector('input[name="_retiroGender"]:checked')?.value || '';
				
				html += `
					<div class="resumen-seccion-card resumen-seccion-retiro">
						<div class="resumen-seccion-header">
							<div class="resumen-seccion-icon">👤</div>
							<h4 class="resumen-seccion-title">Datos de Retiro</h4>
							${tipoClass === 'retiro' ? tipoBadge : ''}
						</div>
						<div class="resumen-datos-grid">
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">👤 Nombre del Beneficiario</div>
								<div class="resumen-dato-valor destacado">${retiroFullName.toUpperCase() || 'No ingresado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🆔 Documento</div>
								<div class="resumen-dato-valor documento">${retiroDocType} ${retiroDocNumber}</div>
							</div>
							<div>
								<div class="resumen-dato-label">⚧ Género</div>
								<div class="resumen-dato-valor">${retiroGender === 'M' ? 'Masculino' : retiroGender === 'F' ? 'Femenino' : 'No seleccionado'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">📅 Fecha de Retiro</div>
								<div class="resumen-dato-valor">${retiroDate || 'No ingresada'}</div>
							</div>
						</div>
					</div>
				`;
			}
			
			// Sección de Ingreso
			if (checkIngreso) {
				const ingresoDocType = document.getElementById('ingresoDocType')?.value || 'RC';
				const ingresoDocNumber = document.getElementById('ingresoDocNumber')?.value || '';
				const ingresoFullName = document.getElementById('ingresoFullName')?.value || '';
				const ingresoDOB = document.getElementById('ingresoDOB')?.value || '';
				const ingresoDate = document.getElementById('ingresoDate')?.value || '';
				const ingresoGender = document.querySelector('input[name="_ingresoGender"]:checked')?.value || '';
				const displayAge = document.getElementById('displayAge')?.value || '';
				const ingresoComuna = document.getElementById('ingresoComuna')?.value || '';
				const ingresoBarrio = document.getElementById('ingresoBarrio')?.value || '';
				const ingresoAddress = document.getElementById('ingresoAddress')?.value || '';
				const ingresoPhone = document.getElementById('ingresoPhone')?.value || '';
				
				html += `
					<div class="resumen-seccion-card resumen-seccion-ingreso">
						<div class="resumen-seccion-header">
							<div class="resumen-seccion-icon">👶</div>
							<h4 class="resumen-seccion-title">Datos del Niño</h4>
							${tipoClass === 'ingreso' ? tipoBadge : ''}
						</div>
						<div class="resumen-datos-grid">
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">👤 Nombre Completo</div>
								<div class="resumen-dato-valor destacado">${ingresoFullName.toUpperCase() || 'No ingresado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🆔 Documento</div>
								<div class="resumen-dato-valor documento">${ingresoDocType} ${ingresoDocNumber}</div>
							</div>
							<div>
								<div class="resumen-dato-label">⚧ Género</div>
								<div class="resumen-dato-valor">${ingresoGender === 'M' ? 'Masculino' : ingresoGender === 'F' ? 'Femenino' : 'No seleccionado'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🎂 Fecha Nacimiento</div>
								<div class="resumen-dato-valor">${ingresoDOB || 'No ingresada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📏 Edad Calculada</div>
								<div class="resumen-dato-valor destacado">${displayAge !== 'Esperando fechas...' ? displayAge : 'No calculada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📅 Fecha Ingreso</div>
								<div class="resumen-dato-valor">${ingresoDate || 'No ingresada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">📍 Comuna</div>
								<div class="resumen-dato-valor">${ingresoComuna || 'No seleccionada'}</div>
							</div>
							<div>
								<div class="resumen-dato-label">🏘️ Barrio</div>
								<div class="resumen-dato-valor">${ingresoBarrio || 'No ingresado'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">🏠 Dirección</div>
								<div class="resumen-dato-valor">${ingresoAddress || 'No ingresada'}</div>
							</div>
							<div class="resumen-dato-full">
								<div class="resumen-dato-label">📞 Teléfono</div>
								<div class="resumen-dato-valor">${ingresoPhone || 'No ingresado'}</div>
							</div>
						</div>
					</div>
				`;
				
				// Sección Acudiente
				const acudienteName = document.getElementById('acudienteName')?.value || '';
				const acudienteDoc = document.getElementById('acudienteDoc')?.value || '';
				const acudienteDOB = document.getElementById('acudienteDOB')?.value || '';
				
				if (acudienteName || acudienteDoc) {
					html += `
						<div class="resumen-seccion-card resumen-seccion-acudiente">
							<div class="resumen-seccion-header">
								<div class="resumen-seccion-icon">👨‍👩‍👧</div>
								<h4 class="resumen-seccion-title">Datos del Acudiente</h4>
							</div>
							<div class="resumen-datos-grid">
								<div class="resumen-dato-full">
									<div class="resumen-dato-label">👤 Nombre</div>
									<div class="resumen-dato-valor">${acudienteName.toUpperCase() || 'No ingresado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🆔 Documento</div>
									<div class="resumen-dato-valor documento">${acudienteDoc || 'No ingresado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🎂 Fecha Nacimiento</div>
									<div class="resumen-dato-valor">${acudienteDOB || 'No ingresada'}</div>
								</div>
							</div>
						</div>
					`;
				}
				
				// Sección Nutricional
				const nutricionFecha = document.getElementById('nutricionFecha')?.value || '';
				const nutricionPeso = document.getElementById('nutricionPeso')?.value || '';
				const nutricionTalla = document.getElementById('nutricionTalla')?.value || '';
				const nutricionPerimetroBraquial = document.getElementById('nutricionPerimetroBraquial')?.value || '';
				const nutricionRegimen = document.getElementById('nutricionRegimen')?.value || '';
				const nutricionEPS = document.getElementById('nutricionEPS')?.value || '';
				const nutricionStatus = document.getElementById('nutricionStatus')?.textContent || '';
				
				if (nutricionPeso || nutricionTalla) {
					// Determinar color del estado nutricional
					let estadoColor = '#94a3b8';
					let estadoBg = 'rgba(148, 163, 184, 0.1)';
					if (nutricionStatus.includes('Severa')) { estadoColor = '#dc2626'; estadoBg = 'rgba(220, 38, 38, 0.1)'; }
					else if (nutricionStatus.includes('Moderada')) { estadoColor = '#ef4444'; estadoBg = 'rgba(239, 68, 68, 0.1)'; }
					else if (nutricionStatus.includes('Riesgo') && nutricionStatus.includes('Desnutrición')) { estadoColor = '#f59e0b'; estadoBg = 'rgba(245, 158, 11, 0.1)'; }
					else if (nutricionStatus.includes('Normal')) { estadoColor = '#10b981'; estadoBg = 'rgba(16, 185, 129, 0.1)'; }
					else if (nutricionStatus.includes('Sobrepeso')) { estadoColor = '#f97316'; estadoBg = 'rgba(249, 115, 22, 0.1)'; }
					else if (nutricionStatus.includes('Obesidad')) { estadoColor = '#8b5cf6'; estadoBg = 'rgba(139, 92, 246, 0.1)'; }
					
					html += `
						<div class="resumen-seccion-card resumen-seccion-nutricional">
							<div class="resumen-seccion-header">
								<div class="resumen-seccion-icon">🍎</div>
								<h4 class="resumen-seccion-title">Seguimiento Nutricional</h4>
							</div>
							<div class="resumen-datos-grid">
								<div>
									<div class="resumen-dato-label">📅 Fecha Valoración</div>
									<div class="resumen-dato-valor">${nutricionFecha || 'No ingresada'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">⚖️ Peso</div>
									<div class="resumen-dato-valor destacado">${nutricionPeso ? nutricionPeso + ' kg' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">📏 Talla</div>
									<div class="resumen-dato-valor destacado">${nutricionTalla ? nutricionTalla + ' cm' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">💪 Perímetro Braquial</div>
									<div class="resumen-dato-valor">${nutricionPerimetroBraquial ? nutricionPerimetroBraquial + ' cm' : '-'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🏥 Régimen</div>
									<div class="resumen-dato-valor">${nutricionRegimen || 'No seleccionado'}</div>
								</div>
								<div>
									<div class="resumen-dato-label">🏥 EPS</div>
									<div class="resumen-dato-valor">${nutricionEPS || 'No ingresada'}</div>
								</div>
								<div class="resumen-dato-full">
									<div class="resumen-dato-label">📊 Estado Nutricional</div>
									<div class="resumen-estado-nutricional" style="background: ${estadoBg}; color: ${estadoColor}; border: 1px solid ${estadoColor};">
										${nutricionStatus || 'No calculado'}
									</div>
								</div>
							</div>
						</div>
					`;
				}
			}
			
			// Si es tipo AMBOS, mostrar badge combinado
			if (tipoClass === 'ambos') {
				html = html.replace('</div>\n            </div>\n        </div>', 
					`</div>\n            </div>\n        </div>`);
				// El badge ya se muestra en la primera sección (retiro)
			}
			
			return html;
		}

document.addEventListener('click', function(e) {
			const panel = document.getElementById('resumenEnvioPanel');
			if (panel && panel.style.display === 'flex' && !panel.contains(e.target)) {
				// Opcional: cerrar al hacer click fuera
				// cerrarResumenPanel();
			}
		});

document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				const panel = document.getElementById('resumenEnvioPanel');
				if (panel && panel.style.display === 'flex') {
					cerrarResumenPanel();
				}
			}
		});
