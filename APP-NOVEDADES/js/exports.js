// ============================================================
// EXPORTS.JS — Generación de archivos Excel y PDF
// (novedades activas, archivadas, análisis nutricional)
// ============================================================

function exportNutricionalToExcel() {
    if (datosNutricionalesFiltrados.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }
    
    // Agregar información de filtros aplicados
    const estadoFiltro = document.getElementById('nutricionalFilterEstado')?.value || 'Todos';
    const contratoFiltro = document.getElementById('nutricionalFilterContract')?.value || 'Todos';
    const criticoFiltro = document.getElementById('nutricionalFilterCritico')?.value || 'Todos';
    
    const exportData = datosNutricionalesFiltrados.map(d => ({
        'Tipo': d.tipo === 'activa' ? 'Activa' : 'Archivada',
        'Contrato': d.contract,
        'UDS': d.udsName,
        'Código UDS': d.udsCode,
        'Nombre Niño': d.nombre,
        'Documento': `${d.tipoDoc} ${d.documento}`,
        'Edad': d.edad,
        'Fecha Nacimiento': d.fechaNacimiento || '-',
        'Género': d.genero === 'M' ? 'Masculino' : 'Femenino',
        'Peso (kg)': d.peso || '-',
        'Talla (cm)': d.talla || '-',
        'Perímetro Braquial (cm)': d.perimetroBraquial || '-',
        'IMC': d.imc || '-',
        'Fecha Valoración': d.fechaValoracion || '-',
        'Estado Nutricional': d.estadoNutricional,
        'Régimen': d.regimen,
        'EPS': d.eps
    }));
    
    // Crear hoja de resumen
    const resumenData = [
        ['ANÁLISIS NUTRICIONAL - ASOCIACIÓN JER'],
        ['Fecha de exportación:', new Date().toLocaleString('es-CO')],
        [''],
        ['FILTROS APLICADOS:'],
        ['Estado:', estadoFiltro],
        ['Contrato:', contratoFiltro],
        ['Casos:', criticoFiltro],
        [''],
        ['RESUMEN:'],
        ['Total registros:', datosNutricionalesFiltrados.length]
    ];
    
    // Contar por estado
    const porEstado = {};
    datosNutricionalesFiltrados.forEach(d => {
        porEstado[d.estadoNutricional] = (porEstado[d.estadoNutricional] || 0) + 1;
    });
    
    Object.entries(porEstado).forEach(([estado, count]) => {
        resumenData.push([estado + ':', count]);
    });
    
    resumenData.push(['']);
    
    const wb = XLSX.utils.book_new();
    
    // Hoja de resumen
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Hoja de datos
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Detallados');
    
    XLSX.writeFile(wb, `Analisis_Nutricional_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showToast(`Exportados ${exportData.length} registros nutricionales`, 'success');
}

function getColorPorEstado(estado) {
    if (!estado || estado === 'Sin datos') return '#95A5A6';
    if (estado.includes('Severa')) return '#C0392B';
    if (estado.includes('Moderada')) return '#E74C3C';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return '#F39C12';
    if (estado.includes('Normal')) return '#27AE60';
    if (estado.includes('Riesgo') && estado.includes('Sobrepeso')) return '#F1C40F';
    if (estado.includes('Sobrepeso')) return '#E67E22';
    if (estado.includes('Obesidad')) return '#8E44AD';
    return '#95A5A6';
}

function getColorPorCategoria(categoria) {
    const colores = {
        'severa': '#C0392B',
        'moderada': '#E74C3C',
        'riesgo-desnutricion': '#F39C12',
        'normal': '#27AE60',
        'riesgo-sobrepeso': '#F1C40F',
        'sobrepeso': '#E67E22',
        'obesidad': '#8E44AD',
        'sin-datos': '#95A5A6'
    };
    return colores[categoria] || '#95A5A6';
}

function getNombreEstado(categoria) {
    const nombres = {
        'severa': 'Desnutrición Severa',
        'moderada': 'Desnutrición Moderada',
        'riesgo-desnutricion': 'Riesgo de Desnutrición',
        'normal': 'Peso Normal',
        'riesgo-sobrepeso': 'Riesgo de Sobrepeso',
        'sobrepeso': 'Sobrepeso',
        'obesidad': 'Obesidad',
        'sin-datos': 'Sin Datos'
    };
    return nombres[categoria] || categoria;
}

function getIconoEstado(categoria) {
    const iconos = {
        'severa': '🔴',
        'moderada': '🟠',
        'riesgo-desnutricion': '🟡',
        'normal': '🟢',
        'riesgo-sobrepeso': '🔵',
        'sobrepeso': '🟣',
        'obesidad': '🟤',
        'sin-datos': '⚪'
    };
    return iconos[categoria] || '⚪';
}

function exportArchivedToExcel() {
            if (archivedNovelties.length === 0) {
                showToast("No hay archivados para exportar", "warning");
                return;
            }

            const exportData = archivedNovelties.map(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                let fechaNacimientoNiño = '';
                let fechaNacimientoAcudiente = '';
                let docRetiro = '', docIngreso = '';
                let nombreRetiro = '', nombreIngreso = '';
                let fechaRetiro = '', fechaIngreso = '';
                let comuna = '', barrio = '', perimetroBraquial = '';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    if (n.retiro) {
                        docRetiro = n.retiro.document || '';
                        nombreRetiro = n.retiro.name || '';
                        fechaRetiro = n.retiro.retiroDate || '';
                    }
                    if (n.ingreso) {
                        docIngreso = n.ingreso.document || '';
                        nombreIngreso = n.ingreso.name || '';
                        fechaIngreso = n.ingreso.ingresoDate || '';
                        fechaNacimientoNiño = n.ingreso.dob || '';
                        fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                        comuna = n.ingreso.comuna || '';
                        barrio = n.ingreso.barrio || '';
                    }
                } else if (n.type === 'retiro') {
                    const retiroData = n.retiro || n;
                    docRetiro = retiroData.document || '';
                    nombreRetiro = retiroData.name || '';
                    fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                } else if (n.type === 'ingreso') {
                    const ingresoData = n.ingreso || n;
                    docIngreso = ingresoData.document || '';
                    nombreIngreso = ingresoData.name || '';
                    fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                    fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                    fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                    comuna = ingresoData.comuna || n.comuna || '';
                    barrio = ingresoData.barrio || n.barrio || '';
                }

                // Datos nutricionales incluyendo perímetro braquial
                let nutricionFecha = '', nutricionPeso = '', nutricionTalla = '', nutricionPerimetroBraquial = '';
                let nutricionRegimen = '', nutricionEPS = '', nutricionEstado = '';
                
                if (n.nutricion) {
                    nutricionFecha = n.nutricion.fecha || '';
                    nutricionPeso = n.nutricion.peso || '';
                    nutricionTalla = n.nutricion.talla || '';
                    nutricionPerimetroBraquial = n.nutricion.perimetroBraquial || '';
                    nutricionRegimen = n.nutricion.regimen || '';
                    nutricionEPS = n.nutricion.eps || '';
                    nutricionEstado = n.nutricion.estadoNutricional || '';
                }

                return {
                    'Fecha Archivo': new Date(n.archivedDate).toLocaleString('es-CO'),
                    'Fecha Registro Original': new Date(n.timestamp).toLocaleString('es-CO'),
                    'Fecha Movimiento': fechaMovimiento,
                    'Contrato': n.contract || '',
                    'UDS Nombre': n.udsName,
                    'Tipo Novedad': n.type ? n.type.toUpperCase() : '',
                    'Documento Retiro': docRetiro,
                    'Nombre Retiro': nombreRetiro,
                    'Fecha Retiro': fechaRetiro,
                    'Documento Ingreso': docIngreso,
                    'Nombre Ingreso': nombreIngreso,
                    'Fecha Ingreso': fechaIngreso,
                    'Fecha Nacimiento Niño': fechaNacimientoNiño,
                    'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                    'Comuna': comuna,
                    'Barrio': barrio,
                    'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                    'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                    'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                    'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                    'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                    'Fecha Valoración Nutricional': nutricionFecha,
                    'Peso (kg)': nutricionPeso,
                    'Talla (cm)': nutricionTalla,
                    'Perímetro Braquial (cm)': nutricionPerimetroBraquial,
                    'Régimen': nutricionRegimen,
                    'EPS': nutricionEPS,
                    'Estado Nutricional': nutricionEstado
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Archivados');
            XLSX.writeFile(wb, `Reporte_Archivados_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            showToast(`Exportados ${archivedNovelties.length} registros archivados`, "success");
        }

function exportToExcelCurrent() {
            if (currentNovelties.length === 0) {
                showToast("No hay datos para exportar", "warning");
                return;
            }

            const searchInput = document.getElementById('searchInput');
            const filterContract = document.getElementById('filterContract');
            const filterType = document.getElementById('filterType');
            const filterDate = document.getElementById('filterDate');
            const filterMonth = document.getElementById('filterMonth');
            const filterUDS = document.getElementById('filterUDS');
            const filterStatus = document.getElementById('filterStatus');
            const filterRegional = document.getElementById('filterRegional');
            const filterModalidad = document.getElementById('filterModalidad');
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const contractFilter = filterContract ? filterContract.value : '';
            const typeFilter = filterType ? filterType.value : '';
            const dateFilter = filterDate ? filterDate.value : '';
            const monthFilter = filterMonth ? filterMonth.value : '';
            const udsFilter = filterUDS ? filterUDS.value : '';
            const statusFilter = filterStatus ? filterStatus.value : '';
            const regionalFilter = filterRegional ? filterRegional.value : '';
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

            if (filtered.length === 0) {
                showToast("No hay datos en la vista actual para exportar", "warning");
                return;
            }

            const exportData = filtered.map(n => {
                const fechaMovimiento = getFechaMovimiento(n);
                let fechaNacimientoNiño = '';
                let fechaNacimientoAcudiente = '';
                let tipoNovedad = n.type ? n.type.toUpperCase() : '';
                let docRetiro = '';
                let docIngreso = '';
                let nombreRetiro = '';
                let nombreIngreso = '';
                let generoRetiro = '';
                let generoIngreso = '';
                let fechaRetiro = '';
                let fechaIngreso = '';
                let comuna = '';
                let barrio = '';
                
                if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                    tipoNovedad = 'AMBOS (RETIRO + INGRESO)';
                    
                    if (n.retiro) {
                        docRetiro = n.retiro.document || '';
                        nombreRetiro = n.retiro.name || '';
                        generoRetiro = n.retiro.gender || '';
                        fechaRetiro = n.retiro.retiroDate || '';
                    }
                    
                    if (n.ingreso) {
                        docIngreso = n.ingreso.document || '';
                        nombreIngreso = n.ingreso.name || '';
                        generoIngreso = n.ingreso.gender || '';
                        fechaIngreso = n.ingreso.ingresoDate || '';
                        fechaNacimientoNiño = n.ingreso.dob || '';
                        fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                        comuna = n.ingreso.comuna || '';
                        barrio = n.ingreso.barrio || '';
                    }
                } else if (n.type === 'retiro') {
                    const retiroData = n.retiro || n;
                    docRetiro = retiroData.document || '';
                    nombreRetiro = retiroData.name || '';
                    generoRetiro = retiroData.gender || '';
                    fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                } else if (n.type === 'ingreso') {
                    const ingresoData = n.ingreso || n;
                    docIngreso = ingresoData.document || '';
                    nombreIngreso = ingresoData.name || '';
                    generoIngreso = ingresoData.gender || '';
                    fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                    fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                    fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                    comuna = ingresoData.comuna || n.comuna || '';
                    barrio = ingresoData.barrio || n.barrio || '';
                }

                let nutricionData = {};
                if (n.nutricion) {
                    nutricionData = n.nutricion;
                } else if (n.ingreso && n.ingreso.nutricion) {
                    nutricionData = n.ingreso.nutricion;
                }

                return {
                    'Estado CUENTAME': n.cuentameStatus === 'cargado' ? 'CARGADO' : 'PENDIENTE',
                    'Fecha Cargado': n.cuentameDate ? new Date(n.cuentameDate).toLocaleString('es-CO') : '-',
                    'Fecha Registro': new Date(n.timestamp).toLocaleString('es-CO'),
                    'Fecha Movimiento': fechaMovimiento,
                    'Contrato': n.contract || '',
                    'UDS Nombre': n.udsName,
                    'Tipo Novedad': tipoNovedad,
                    'Doc Retiro': docRetiro,
                    'Nombre Retiro': nombreRetiro,
                    'Género Retiro': generoRetiro === 'M' ? 'Masculino' : generoRetiro === 'F' ? 'Femenino' : '',
                    'Fecha Retiro': fechaRetiro,
                    'Doc Ingreso': docIngreso,
                    'Nombre Ingreso': nombreIngreso,
                    'Género Ingreso': generoIngreso === 'M' ? 'Masculino' : generoIngreso === 'F' ? 'Femenino' : '',
                    'Fecha Nacimiento Niño': fechaNacimientoNiño,
                    'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                    'Fecha Ingreso': fechaIngreso,
                    'Comuna': comuna,
                    'Barrio': barrio,
                    'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                    'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                    'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                    'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                    'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                    'Fecha Valoración Nutricional': nutricionData.fecha || '',
                    'Peso (kg)': nutricionData.peso || '',
                    'Talla (cm)': nutricionData.talla || '',
                    'Perímetro Braquial (cm)': nutricionData.perimetroBraquial || '',
                    'Régimen': nutricionData.regimen || '',
                    'EPS': nutricionData.eps || '',
                    'Estado Nutricional': nutricionData.estadoNutricional || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vista Actual');
            XLSX.writeFile(wb, `Reporte_Filtrado_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            showToast(`Exportados ${filtered.length} registros de la vista actual`, "success");
        }

function exportToExcelFull() {
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            noveltiesRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                const novelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                
                if (novelties.length === 0) {
                    showToast("No hay datos para exportar", "warning");
                    return;
                }

                const retiros = novelties.filter(n => n.type === 'retiro' && !n.hasIngreso);
                const ingresos = novelties.filter(n => n.type === 'ingreso' && !n.hasRetiro);
                const ambos = novelties.filter(n => n.type === 'ambos' || (n.hasRetiro && n.hasIngreso));
                
                const wb = XLSX.utils.book_new();

                const resumenData = [
                    ['REPORTE COMPLETO DE NOVEDADES - ASOCIACIÓN JER'],
                    ['Generado:', new Date().toLocaleString('es-CO')],
                    [''],
                    ['RESUMEN'],
                    ['Total Registros:', novelties.length],
                    ['Total Retiros:', retiros.length],
                    ['Total Ingresos:', ingresos.length],
                    ['Total Ambos (Retiro + Ingreso):', ambos.length],
                    ['Pendientes CUENTAME:', novelties.filter(n => !n.cuentameStatus || n.cuentameStatus === 'pendiente').length],
                    ['Cargados CUENTAME:', novelties.filter(n => n.cuentameStatus === 'cargado').length],
                    ...Object.entries(window.UDS_DATA || {}).map(([c]) => {
                        const perfil = AsociacionesModule.getPerfilActivo();
                        const label = perfil?.contratos?.[c] || `Contrato ${c}`;
                        return [`Por ${label}:`, novelties.filter(n => n.contract === c).length];
                    }),
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

                const mapNoveltyData = (n, tipo) => {
                    const fechaMovimiento = getFechaMovimiento(n);
                    let fechaNacimientoNiño = '';
                    let fechaNacimientoAcudiente = '';
                    let docRetiro = '';
                    let docIngreso = '';
                    let nombreRetiro = '';
                    let nombreIngreso = '';
                    let fechaRetiro = '';
                    let fechaIngreso = '';
                    let comuna = '';
                    let barrio = '';
                    
                    if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                        if (n.retiro) {
                            docRetiro = n.retiro.document || '';
                            nombreRetiro = n.retiro.name || '';
                            fechaRetiro = n.retiro.retiroDate || '';
                        }
                        if (n.ingreso) {
                            docIngreso = n.ingreso.document || '';
                            nombreIngreso = n.ingreso.name || '';
                            fechaIngreso = n.ingreso.ingresoDate || '';
                            fechaNacimientoNiño = n.ingreso.dob || '';
                            fechaNacimientoAcudiente = n.ingreso.acudienteDOB || '';
                            comuna = n.ingreso.comuna || '';
                            barrio = n.ingreso.barrio || '';
                        }
                    } else if (n.type === 'retiro') {
                        const retiroData = n.retiro || n;
                        docRetiro = retiroData.document || '';
                        nombreRetiro = retiroData.name || '';
                        fechaRetiro = retiroData.retiroDate || n.retiroDate || '';
                    } else if (n.type === 'ingreso') {
                        const ingresoData = n.ingreso || n;
                        docIngreso = ingresoData.document || '';
                        nombreIngreso = ingresoData.name || '';
                        fechaIngreso = ingresoData.ingresoDate || n.ingresoDate || '';
                        fechaNacimientoNiño = ingresoData.dob || n.ingresoDOB || '';
                        fechaNacimientoAcudiente = ingresoData.acudienteDOB || n.acudienteDOB || '';
                        comuna = ingresoData.comuna || n.comuna || '';
                        barrio = ingresoData.barrio || n.barrio || '';
                    }

                    let nutricionData = {};
                    if (n.nutricion) {
                        nutricionData = n.nutricion;
                    } else if (n.ingreso && n.ingreso.nutricion) {
                        nutricionData = n.ingreso.nutricion;
                    }

                    return {
                        'Estado CUENTAME': n.cuentameStatus === 'cargado' ? 'CARGADO' : 'PENDIENTE',
                        'ID': n.id,
                        'Fecha Registro': new Date(n.timestamp).toLocaleString('es-CO'),
                        'Fecha Movimiento': fechaMovimiento,
                        'Contrato': n.contract || '',
                        'UDS Nombre': n.udsName,
                        'Tipo': tipo,
                        'Doc Retiro': docRetiro,
                        'Nombre Retiro': nombreRetiro,
                        'Fecha Retiro': fechaRetiro,
                        'Doc Ingreso': docIngreso,
                        'Nombre Ingreso': nombreIngreso,
                        'Fecha Ingreso': fechaIngreso,
                        'Fecha Nacimiento Niño': fechaNacimientoNiño,
                        'Edad al Ingreso': n.ingreso ? n.ingreso.age : n.age || '',
                        'Comuna': comuna,
                        'Barrio': barrio,
                        'Dirección': n.ingreso ? n.ingreso.address : n.address || '',
                        'Teléfono': n.ingreso ? n.ingreso.phone : n.phone || '',
                        'Acudiente Nombre': n.ingreso ? n.ingreso.acudiente : n.acudiente || '',
                        'Acudiente Documento': n.ingreso ? n.ingreso.acudienteDoc : n.acudienteDoc || '',
                        'Fecha Nacimiento Acudiente': fechaNacimientoAcudiente,
                        'Fecha Valoración Nutricional': nutricionData.fecha || '',
                        'Peso (kg)': nutricionData.peso || '',
                        'Talla (cm)': nutricionData.talla || '',
                        'Perímetro Braquial (cm)': nutricionData.perimetroBraquial || '',
                        'Régimen': nutricionData.regimen || '',
                        'EPS': nutricionData.eps || '',
                        'Estado Nutricional': nutricionData.estadoNutricional || ''
                    };
                };

                if (retiros.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(retiros.map(n => mapNoveltyData(n, 'RETIRO'))), 'Retiros');
                }

                if (ingresos.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingresos.map(n => mapNoveltyData(n, 'INGRESO'))), 'Ingresos');
                }

                if (ambos.length > 0) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ambos.map(n => mapNoveltyData(n, 'AMBOS'))), 'Ambos');
                }

                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(novelties.map(n => mapNoveltyData(n, n.type ? n.type.toUpperCase() : ''))), 'Todos los Registros');

                XLSX.writeFile(wb, `Reporte_Completo_JER_${new Date().toISOString().split('T')[0]}.xlsx`);
                showToast(`Excel exportado: ${novelties.length} registros`, "success");
            });
        }

function exportToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            const noveltiesRef = database.ref(AsociacionesModule.getRef('novelties'));
            noveltiesRef.once('value', (snapshot) => {
                const data = snapshot.val() || {};
                const novelties = Object.entries(data).map(([id, value]) => ({ id, ...value }));
                
                if (novelties.length === 0) {
                    showToast("No hay datos para exportar", "warning");
                    return;
                }

                doc.setFontSize(16);
                doc.text('Reporte Completo de Novedades - Asociación JER', 14, 15);
                
                doc.setFontSize(10);
                doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 22);
                doc.text(`Total de registros: ${novelties.length}`, 14, 27);

                let y = 35;
                doc.setFillColor(240, 240, 240);
                doc.rect(10, y, 277, 10, 'F');
                doc.setFontSize(9);
                
                const headers = ['Estado', 'Fecha Reg', 'Fecha Mov', 'Contrato', 'UDS', 'Tipo', 'Doc Ret', 'Nom Ret', 'Doc Ing', 'Nom Ing'];
                const colWidths = [25, 25, 35, 25, 35, 25, 30, 45, 30, 47];
                let x = 12;
                
                headers.forEach((header, i) => {
                    doc.text(header, x, y + 7);
                    x += colWidths[i];
                });

                y += 15;
                doc.setFontSize(7);
                let count = 0;
                
                novelties.forEach(n => {
                    if (y > 190) {
                        doc.addPage();
                        y = 15;
                        doc.setFillColor(240, 240, 240);
                        doc.rect(10, y - 5, 277, 10, 'F');
                        doc.setFontSize(9);
                        x = 12;
                        headers.forEach((header, i) => {
                            doc.text(header, x, y + 2);
                            x += colWidths[i];
                        });
                        y += 10;
                        doc.setFontSize(7);
                    }
                    
                    const fechaMovimiento = getFechaMovimiento(n);
                    const estadoText = n.cuentameStatus === 'cargado' ? '✓ CARGADO' : '⏳ PEND';
                    
                    let tipoDisplay = n.type ? n.type.toUpperCase() : '';
                    let docRet = '';
                    let nomRet = '';
                    let docIng = '';
                    let nomIng = '';
                    
                    if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) {
                        tipoDisplay = 'AMBOS';
                        if (n.retiro) {
                            docRet = n.retiro.document || '-';
                            nomRet = n.retiro.name ? (n.retiro.name.length > 20 ? n.retiro.name.substring(0, 20) + '...' : n.retiro.name) : '-';
                        }
                        if (n.ingreso) {
                            docIng = n.ingreso.document || '-';
                            nomIng = n.ingreso.name ? (n.ingreso.name.length > 20 ? n.ingreso.name.substring(0, 20) + '...' : n.ingreso.name) : '-';
                        }
                    } else if (n.type === 'retiro') {
                        const retData = n.retiro || n;
                        docRet = retData.document || '-';
                        nomRet = retData.name ? (retData.name.length > 20 ? retData.name.substring(0, 20) + '...' : retData.name) : '-';
                    } else if (n.type === 'ingreso') {
                        const ingData = n.ingreso || n;
                        docIng = ingData.document || '-';
                        nomIng = ingData.name ? (ingData.name.length > 20 ? ingData.name.substring(0, 20) + '...' : ingData.name) : '-';
                    }
                    
                    x = 12;
                    const rowData = [
                        estadoText,
                        new Date(n.timestamp).toLocaleDateString('es-CO'),
                        fechaMovimiento.length > 18 ? fechaMovimiento.substring(0, 18) : fechaMovimiento,
                        n.contract || '-',
                        n.udsName ? (n.udsName.length > 18 ? n.udsName.substring(0, 18) + '...' : n.udsName) : '',
                        tipoDisplay,
                        docRet,
                        nomRet,
                        docIng,
                        nomIng
                    ];
                    
                    if (n.type === 'retiro') doc.setTextColor(220, 38, 38);
                    else if (n.type === 'ingreso') doc.setTextColor(16, 185, 129);
                    else if (n.type === 'ambos' || (n.hasRetiro && n.hasIngreso)) doc.setTextColor(147, 51, 234);
                    else doc.setTextColor(0, 0, 0);
                    
                    rowData.forEach((cell, i) => {
                        doc.text(String(cell), x, y);
                        x += colWidths[i];
                    });
                    
                    doc.setTextColor(0, 0, 0);
                    y += 7;
                    count++;
                });

                doc.setFontSize(8);
                doc.text(`Mostrando ${count} registros`, 14, 200);
                
                doc.save(`Reporte_Completo_JER_${new Date().toISOString().split('T')[0]}.pdf`);
                showToast(`PDF exportado: ${count} registros`, "success");
            });
        }
