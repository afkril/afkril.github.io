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
                } else if (statusFilter === 'cargado') {
                    matchesStatus = n.cuentameStatus === 'cargado';
                }

                return matchesSearch && matchesContract && matchesType && matchesDate && matchesMonth && matchesUDS && matchesStatus && matchesRegional && matchesModalidad;
            });

            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderTable(filtered);
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
                        const tooltipText = dup.type === 'active' 
                            ? `Duplicado en: ${dup.data.udsName} (${new Date(dup.data.timestamp).toLocaleDateString('es-CO')})`
                            : `Ya archivado en: ${dup.data.udsName}`;
                        duplicadoHTML += `<span class="duplicado-badge duplicado-tooltip" data-tooltip="${tooltipText}">⚠️ DUP</span> `;
                    }
                });
                
                const isCargado = n.cuentameStatus === 'cargado';
                const cuentameClass = isCargado ? 'checked' : 'pending';
                const cuentameTitle = isCargado ? 'Cargado al CUENTAME' : 'Pendiente por cargar';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="cuentame-check ${cuentameClass}" 
                             onclick="toggleCuentame('${n.id}')" 
                             title="${cuentameTitle}">
                        </div>
                    </td>
                    <td>${isCargado ? '<span style="color: #10b981; font-weight: 600;">✓ Cargado</span>' : '<span style="color: #f59e0b; font-weight: 600;">⏳ Pendiente</span>'}</td>
                    <td>${new Date(n.timestamp).toLocaleDateString('es-CO')}</td>
                    <td><strong>${fechaMovimiento}</strong></td>
                    <td><span class="badge" style="background: ${getContractColor(n.contract)}; color: white;">${n.contract || 'N/A'}</span></td>
                    <td>${n.udsName} ${duplicadoHTML}</td>
                    <td>${tipoBadge}</td>
                    <td>${docDisplay}</td>
                    <td>${nameDisplay}</td>
                    <td>
                        <button onclick="viewNovelty('${n.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2 bg-blue-50 px-2 py-1 rounded">Ver</button>
                        ${(n.type === 'ingreso' || n.type === 'ambos' || n.hasIngreso) && n.nutricion?.pendiente ? `<button onclick="abrirEditNutricion('${n.id}')" class="text-xs font-semibold mr-2 px-2 py-1 rounded" style="background:#fef3c7;color:#92400e;" title="Completar datos nutricionales pendientes">🍎 Nutrición</button>` : ''}
                        ${isCargado ? `<button onclick="archivarNovelty('${n.id}')" class="btn-archivar" title="Archivar">🗃️</button>` : ''}
                        <button onclick="deleteNovelty('${n.id}')" class="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2 py-1 rounded">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderPagination(novelties.length);
        }

function getContractColor(contract) {
            return COLORES_GRAFICAS.contratos[contract] || '#6b7280';
        }

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
                    <td><div class="check-archivado">✓</div></td>
                    <td>${new Date(n.archivedDate).toLocaleDateString('es-CO')}</td>
                    <td><strong>${fechaMovimiento}</strong></td>
                    <td><span class="badge" style="background: ${getContractColor(n.contract)}; color: white;">${n.contract || 'N/A'}</span></td>
                    <td>${n.udsName}</td>
                    <td>${tipoBadge}</td>
                    <td>${docDisplay}</td>
                    <td>${nameDisplay}</td>
                    <td>
                        <button onclick="viewArchivedNovelty('${n.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2 bg-blue-50 px-2 py-1 rounded">Ver</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            renderArchivedPagination(novelties.length);
        }

let isPlainView = false;

let currentNoveltyData = null;

function viewNoveltyDetails(novelty, isArchived) {
    currentNoveltyData = novelty;
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

function generateFiveCards(novelty, isArchived, udsName, udsCode) {
    const contract = novelty.contract || 'N/A';
    const fechaRegistro = new Date(novelty.timestamp).toLocaleString('es-CO');
    
    // Determinar tipo y badges
    let tipoBadge = '';
    if (novelty.type === 'ambos' || (novelty.hasRetiro && novelty.hasIngreso)) {
        tipoBadge = '<span class="badge-tipo-c ambos">AMBOS</span>';
    } else if (novelty.type === 'retiro') {
        tipoBadge = '<span class="badge-tipo-c retiro">RETIRO</span>';
    } else if (novelty.type === 'ingreso') {
        tipoBadge = '<span class="badge-tipo-c ingreso">INGRESO</span>';
    }
    
    const isCargado = novelty.cuentameStatus === 'cargado';
    const estadoBadge = `<span class="badge-estado-c ${isCargado ? 'cargado' : 'pendiente'}">${isCargado ? '✓ CARGADO' : '⏳ PENDIENTE'}</span>`;
    
    let html = '';
    
    // TARJETA 1: INFORMACIÓN GENERAL (siempre presente)
    html += `
        <div class="detail-card-compact card-info-c">
            <div class="card-header-c">
                <div class="card-icon-c">📋</div>
                <h4 class="card-title-c">Información General</h4>
            </div>
            <div class="data-grid-c">
                <div class="data-item-c">
                    <span class="data-label-c">📄 Contrato</span>
                    <span class="data-value-c"><strong>${contract}</strong></span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">🏫 UDS</span>
                    <span class="data-value-c">${udsName}</span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">🔢 Código UDS</span>
                    <span class="data-value-c">${udsCode || '-'}</span>
                </div>
                <div class="data-item-c">
                    <span class="data-label-c">✅ Estado</span>
                    <span class="data-value-c">${estadoBadge}</span>
                </div>
                <div class="data-item-c full-width-c">
                    <span class="data-label-c">📅 Fecha Registro</span>
                    <span class="data-value-c">${fechaRegistro}</span>
                </div>
                <div class="data-item-c full-width-c">
                    <span class="data-label-c">🏷️ Tipo Novedad</span>
                    <span class="data-value-c">${tipoBadge}</span>
                </div>
            </div>
        </div>
    `;
    
    // TARJETA 2: RETIRO (si aplica)
    if (novelty.type === 'retiro' || novelty.type === 'ambos' || novelty.hasRetiro) {
        const r = novelty.retiro || novelty;
        html += `
            <div class="detail-card-compact card-retiro-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👤</div>
                    <h4 class="card-title-c">Datos de Retiro</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${r.docType || 'RC'} ${r.document || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">👤 Nombre</span>
                        <span class="data-value-c name-highlight">${r.name ? r.name.toUpperCase() : 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📅 Fecha Retiro</span>
                        <span class="data-value-c">${formatDateDMY(r.retiroDate || novelty.retiroDate || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">⚧ Género</span>
                        <span class="data-value-c">${r.gender === 'M' ? 'Masculino' : r.gender === 'F' ? 'Femenino' : '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👤</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Retiro</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 3: INGRESO (si aplica)
    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        html += `
            <div class="detail-card-compact card-ingreso-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👶</div>
                    <h4 class="card-title-c">Datos de Ingreso</h4>
                </div>
                <div class="data-grid-c">
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">👤 Niño</span>
                        <span class="data-value-c name-highlight">${i.name ? i.name.toUpperCase() : 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${i.docType || 'RC'} ${i.document || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📏 Edad</span>
                        <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${i.age || novelty.age || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🎂 F. Nacimiento</span>
                        <span class="data-value-c">${formatDateDMY(i.dob || i.ingresoDOB || novelty.ingresoDOB || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📅 F. Ingreso</span>
                        <span class="data-value-c">${formatDateDMY(i.ingresoDate || novelty.ingresoDate || '-')}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">⚧ Género</span>
                        <span class="data-value-c">${i.gender === 'M' ? 'Masculino' : i.gender === 'F' ? 'Femenino' : '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📍 Comuna</span>
                        <span class="data-value-c">${i.comuna || novelty.comuna || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🏘️ Barrio</span>
                        <span class="data-value-c">${i.barrio || novelty.barrio || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👶</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Ingreso</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 4: ACUDIENTE (si hay ingreso)
    if (novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) {
        const i = novelty.ingreso || novelty;
        html += `
            <div class="detail-card-compact card-acudiente-c">
                <div class="card-header-c">
                    <div class="card-icon-c">👨‍👩‍👧</div>
                    <h4 class="card-title-c">Datos del Acudiente</h4>
                </div>
                <div class="data-grid-c">
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">👤 Nombre</span>
                        <span class="data-value-c name-highlight">${i.acudiente || novelty.acudiente || 'N/A'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🆔 Documento</span>
                        <span class="data-value-c">${i.acudienteDoc || novelty.acudienteDoc || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">🎂 F. Nacimiento</span>
                        <span class="data-value-c">${formatDateDMY(i.acudienteDOB || novelty.acudienteDOB || '-')}</span>
                    </div>
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">📍 Ubicación</span>
                        <span class="data-value-c">${i.comuna || novelty.comuna || '-'} • ${i.barrio || novelty.barrio || '-'}</span>
                    </div>
                    <div class="data-item-c full-width-c">
                        <span class="data-label-c">🏠 Dirección</span>
                        <span class="data-value-c">${i.address || novelty.address || '-'}</span>
                    </div>
                    <div class="data-item-c">
                        <span class="data-label-c">📞 Teléfono</span>
                        <span class="data-value-c">${i.phone || novelty.phone || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">👨‍👩‍👧</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Acudiente</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No aplica para este registro</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // TARJETA 5: SEGUIMIENTO NUTRICIONAL (si hay datos de ingreso)
    const nutricion = novelty.nutricion || (novelty.ingreso && novelty.ingreso.nutricion);
    const isNutrPendiente = nutricion && nutricion.pendiente === true;
    if ((novelty.type === 'ingreso' || novelty.type === 'ambos' || novelty.hasIngreso) && nutricion) {
        
        const estadoColor = getNutricionColor(nutricion.estadoNutricional);
        const editBtn = novelty.id && !isArchived
            ? `<button onclick="abrirEditNutricion('${novelty.id}')" style="margin-left:auto;background:#f59e0b;color:white;border:none;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">✏️ Editar</button>`
            : '';
        
        if (isNutrPendiente) {
            html += `
                <div class="detail-card-compact card-nutricional-c" style="border-top-color:#f59e0b;">
                    <div class="card-header-c">
                        <div class="card-icon-c">🍎</div>
                        <h4 class="card-title-c">Seguimiento Nutricional</h4>
                        ${editBtn}
                    </div>
                    <div class="data-grid-c single-col">
                        <div class="data-item-c full-width-c" style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center;">
                            <span style="font-size:22px;">⏳</span>
                            <p style="font-weight:700;color:#b45309;margin-top:4px;">DATO PENDIENTE</p>
                            <p style="font-size:11px;color:#92400e;">Los datos nutricionales serán completados desde el panel de administración</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (nutricion.fecha || nutricion.peso) {
            html += `
                <div class="detail-card-compact card-nutricional-c">
                    <div class="card-header-c">
                        <div class="card-icon-c">🍎</div>
                        <h4 class="card-title-c">Seguimiento Nutricional</h4>
                        ${editBtn}
                    </div>
                    <div class="data-grid-c">
                        <div class="data-item-c">
                            <span class="data-label-c">📅 F. Valoración</span>
                            <span class="data-value-c">${formatDateDMY(nutricion.fecha || '-')}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">📊 Estado</span>
                            <span class="data-value-c" style="color: ${estadoColor}; font-weight: 700;">${nutricion.estadoNutricional || 'No calculado'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">⚖️ Peso</span>
                            <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${nutricion.peso ? nutricion.peso + ' kg' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">📏 Talla</span>
                            <span class="data-value-c" style="color: #fbbf24; font-weight: 700;">${nutricion.talla ? nutricion.talla + ' cm' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">💪 Perímetro Braquial</span>
                            <span class="data-value-c">${nutricion.perimetroBraquial ? nutricion.perimetroBraquial + ' cm' : '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">🏥 Régimen</span>
                            <span class="data-value-c">${nutricion.regimen || '-'}</span>
                        </div>
                        <div class="data-item-c">
                            <span class="data-label-c">🏥 EPS</span>
                            <span class="data-value-c">${nutricion.eps || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        html += `
            <div class="detail-card-compact" style="opacity: 0.4; border-top: 2px solid #475569;">
                <div class="card-header-c">
                    <div class="card-icon-c" style="background: rgba(71, 85, 105, 0.2);">🍎</div>
                    <h4 class="card-title-c" style="color: #64748b;">Sin Seguimiento Nutricional</h4>
                </div>
                <div class="data-grid-c single-col">
                    <div class="data-item-c full-width-c">
                        <span class="data-value-c" style="color: #64748b; font-style: italic;">No se registraron datos nutricionales</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

function generatePlainTextFive(novelty, isArchived, udsName, udsCode) {
    const fechaRegistro = new Date(novelty.timestamp).toLocaleString('es-CO');
    
    let text = `=================================\n`;
    text +=    ` REPORTE DE NOVEDADES - ASOCIACIÓN JER\n`;
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

function eliminarTodosArchivados() {
            const count = archivedNovelties.length;
            if (count === 0) {
                showToast('No hay archivados para eliminar', 'warning');
                return;
            }
            
            const confirmacion = prompt(`⚠️ ¡ATENCIÓN! ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\n` +
                `Está a punto de eliminar PERMANENTEMENTE ${count} novedades archivadas.\n\n` +
                `Para confirmar, escriba ELIMINAR en mayúsculas:`);
            
            if (confirmacion !== 'ELIMINAR') {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            const segundaConfirmacion = confirm(`Última confirmación:\n\n` +
                `¿Está 100% seguro de eliminar ${count} registros archivados permanentemente?`);
            
            if (!segundaConfirmacion) {
                showToast('Operación cancelada', 'info');
                return;
            }
            
            showToast('⏳ Eliminando todos los archivados...', 'info');
            
            const archivedRef = database.ref(AsociacionesModule.getRef('archived'));
            archivedRef.remove()
                .then(() => {
                    showToast(`🗑️ ${count} archivados eliminados permanentemente`, 'success');
                    archivedNovelties = [];
                    filterArchivedNovelties();
                    loadResumenStats();
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
            if (!confirm('¿Está seguro de que desea eliminar este registro permanentemente?\n\nEsta acción no se puede deshacer.')) return;

            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties') + '/' + id);
            noveltiesRef.remove()
                .then(() => {
                    showToast('Registro eliminado correctamente', 'success');
                    loadNoveltiesTable();
                    updatePendientesIndicator();
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
            formData +=    ` REPORTE DE NOVEDADES - ASOCIACIÓN JER\n`;
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
						asociacionNombre: AsociacionesModule.getPerfilActivo()?.nombre || ''
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
                        btn.innerHTML = '<span class="spinner"></span> ENVIANDO...';
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
                                document.getElementById('noveltyForm').reset();
                                updateStyles();
                                document.getElementById('sectionRetiro').classList.add('hidden');
                                document.getElementById('sectionIngreso').classList.add('hidden');
                                const displayAge = document.getElementById('displayAge');
                                if (displayAge) displayAge.value = "Esperando fechas...";
                                const nutricionIndicator = document.getElementById('nutricionIndicator');
                                if (nutricionIndicator) nutricionIndicator.style.display = 'none';
                                showToast('📥 Sin conexión: registro guardado en este dispositivo. Se enviará solo cuando vuelva la señal.', 'info');
                            }, 500);
                            if (btn) {
                                btn.disabled = false;
                                btn.innerHTML = '<span>Enviar Reporte Al Correo</span>';
                            }
                            return;
                        }

                        // 2b. CON CONEXIÓN: flujo normal
                        await database.ref(refPath).push(noveltyData);
                        console.log('✅ Firebase OK');

                        // 3. Enviar a Google Apps Script
                        await enviarAGoogle(googleData, btn);

                    } catch (error) {
                        console.error('Error:', error);
                        showToast(error.message, "error");
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<span>Enviar Reporte Al Correo</span>';
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
					// Resetear formulario
					document.getElementById('noveltyForm').reset();
					updateStyles();
					document.getElementById('sectionRetiro').classList.add('hidden');
					document.getElementById('sectionIngreso').classList.add('hidden');
					const displayAge = document.getElementById('displayAge');
					if (displayAge) displayAge.value = "Esperando fechas...";
					
					const nutricionIndicator = document.getElementById('nutricionIndicator');
					if (nutricionIndicator) nutricionIndicator.style.display = 'none';
					
					showToast('✅ ¡Éxito! Reporte enviado correctamente.', 'success');
				}, 500);

			} catch (error) {
				console.error('Error envío:', error);
				showToast("❌ Error de conexión con Google Apps Script.", "error");
				throw error;
			} finally {
				if (btn) {
					btn.disabled = false;
					btn.innerHTML = '<span>Enviar Reporte Al Correo</span>';
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
