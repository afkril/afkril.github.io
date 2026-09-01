// ============================================================
// ADMIN-PANEL.JS — Autenticación, apertura/cierre del panel
// administrativo, pestañas, y bloqueo temporal del sistema.
// ============================================================

async function promptAdminAccess() {
            // Verificar que hay un perfil activo
            if (!AsociacionesModule.getPerfilActivo()) {
                showToast('Primero selecciona una asociación', 'warning');
                AsociacionesModule.mostrarSelectorAsociaciones();
                return;
            }
            // Si ya está autenticado en esta sesión, abrir directamente
            if (AsociacionesModule.isAdminAutenticado()) {
                openAdminPanel();
                return;
            }
            const perfil = AsociacionesModule.getPerfilActivo();
            ClaveModal.mostrar({
                icono: '🛡️',
                titulo: 'Acceso Administrador',
                subtitulo: perfil ? perfil.nombre : '',
                onSubmit: async (password) => {
                    const correcta = await AsociacionesModule.obtenerPasswordAdmin();
                    if (password !== correcta) return false;
                    AsociacionesModule.marcarAdminAutenticado();
                    openAdminPanel();
                    showToast("✅ Acceso concedido", "success");
                    return true;
                }
            });
        }

function openAdminPanel() {
            // Guard: nunca abrir sin autenticación
            if (!AsociacionesModule.isAdminAutenticado()) {
                console.warn('[Admin] Intento de apertura sin autenticación bloqueado.');
                return;
            }
            const panel = document.getElementById('adminPanel');
            if (panel) panel.style.display = 'block';

            // Siempre reiniciar a la pestaña por defecto. Sin esto, si la
            // sesión anterior (de OTRA asociación) quedó con la pestaña
            // "Análisis Nutricional" activa, esa misma pestaña con sus
            // datos/gráficas viejas se mostraba de inmediato al reabrir el
            // panel, sin disparar ningún evento que recargara los datos.
            switchTab('activas');

            loadNoveltiesTable();
            loadArchivedNovelties();
            cargarConfigBloqueo();
            populateUDSFilter();
            updatePendientesIndicator();
            inicializarSelectorMes();
            loadResumenStats();
            if (typeof DuplicadosModule !== 'undefined') DuplicadosModule.actualizarBadgeTab();

            // Purga silenciosa de la papelera (independiente por operador)
            // y actualiza el contador del badge sin forzar la pestaña activa.
            if (typeof PapeleraModule !== 'undefined') {
                PapeleraModule.purgarExpirados().then(() => {
                    if (typeof updatePapeleraBadge === 'function') updatePapeleraBadge();
                });
            }

            // Refresca las tarjetas de estadísticas y widgets de la nueva
            // cabecera una vez que los datos hayan tenido tiempo de cargar.
            if (typeof AdminUI !== 'undefined') setTimeout(() => AdminUI.refrescarPanel(), 500);
        }

function closeAdminPanel() {
            const panel = document.getElementById('adminPanel');
            if (panel) panel.style.display = 'none';
            // NO cerramos sesión al cerrar el panel — permanece autenticado en la sesión
            // (si vuelve a elegir el mismo operador, entra directo sin pedir clave)

            // index.html ya no tiene formulario detrás del panel admin: al
            // cerrarlo hay que volver a la pantalla de elección de operador.
            if (typeof AsociacionesModule !== 'undefined') {
                AsociacionesModule.mostrarSelectorAsociaciones();
            }
        }

function cerrarSesionAdmin() {
            AsociacionesModule.cerrarSesionAdmin();
            closeAdminPanel();
            showToast('🔒 Sesión admin cerrada', 'info');
        }

function switchTab(tab) {
            document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`section-${tab}`).classList.add('active');

            if (tab === 'archivadas') loadArchivedNovelties();
            else if (tab === 'activas') loadNoveltiesTable();
            else if (tab === 'papelera') loadPapeleraNovelties();
            else if (tab === 'resumen') loadResumenStats();
            else if (tab === 'duplicados' && typeof DuplicadosModule !== 'undefined') DuplicadosModule.renderPanel();
            else if (tab === 'seguimiento' && typeof SeguimientoModule !== 'undefined') SeguimientoModule.renderBandeja();

            if (typeof AdminUI !== 'undefined') setTimeout(() => AdminUI.refrescarPanel(), 400);
        }

function populateUDSFilter() {
            const filterUDS = document.getElementById('filterUDS');
            const filterUDSArchivados = document.getElementById('filterUDSArchivados');
            
            if (filterUDS) {
                filterUDS.innerHTML = '<option value="">Todas las UDS</option>';
                Object.values(window.UDS_DATA).flat().forEach(([name, code]) => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = `${name} (${code})`;
                    filterUDS.appendChild(opt);
                });
            }
            
            if (filterUDSArchivados) {
                filterUDSArchivados.innerHTML = '<option value="">Todas las UDS</option>';
                Object.values(window.UDS_DATA).flat().forEach(([name, code]) => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = `${name} (${code})`;
                    filterUDSArchivados.appendChild(opt);
                });
            }
        }

let _configBloqueoRef = null;

function cargarConfigBloqueo() {
            // Escucha en tiempo real (.on en vez de .once): si el administrador
            // activa/desactiva el cierre de mes o cambia las fechas desde
            // index.html, el formulario público (JER/T3/FLORIDA) refleja el
            // cambio de inmediato, sin necesidad de recargar la página.
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));

            // Si ya había una suscripción activa (cambio de asociación,
            // reapertura del panel, etc.) se retira antes para no acumular
            // listeners duplicados sobre la misma referencia.
            if (_configBloqueoRef) {
                _configBloqueoRef.off('value');
            }
            _configBloqueoRef = configRef;

            configRef.on('value', (snapshot) => {
                const data = snapshot.val();
                configBloqueo = data || { activo: false, fechaInicio: 28, fechaFin: 30 };
                actualizarUIConfigBloqueo();
                verificarBloqueo();
            });
        }

function guardarConfigBloqueo() {
            const fechaInicio = document.getElementById('configFechaInicio');
            const fechaFin = document.getElementById('configFechaFin');
            if (!fechaInicio || !fechaFin) return;
            
            let inicio = parseInt(fechaInicio.value);
            let fin = parseInt(fechaFin.value);
            
            if (inicio < 1) inicio = 1;
            if (inicio > 31) inicio = 31;
            if (fin < 1) fin = 1;
            if (fin > 31) fin = 31;
            if (fin < inicio) fin = inicio;
            
            configBloqueo.fechaInicio = inicio;
            configBloqueo.fechaFin = fin;
            
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
            configRef.set(configBloqueo)
                .then(() => {
                    showToast("Configuración guardada correctamente", "success");
                    actualizarUIConfigBloqueo();
                    verificarBloqueo();
                })
                .catch((error) => showToast("Error al guardar: " + error.message, "error"));
        }

function toggleBloqueoSistema() {
            configBloqueo.activo = !configBloqueo.activo;
            const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
            configRef.set(configBloqueo)
                .then(() => {
                    showToast(configBloqueo.activo ? "Bloqueo ACTIVADO" : "Bloqueo DESACTIVADO", configBloqueo.activo ? "warning" : "success");
                    actualizarUIConfigBloqueo();
                    verificarBloqueo();
                })
                .catch((error) => showToast("Error: " + error.message, "error"));
        }

function actualizarUIConfigBloqueo() {
            const toggle = document.getElementById('toggleBloqueo');
            const estadoText = document.getElementById('estadoBloqueoText');
            const fechaInicio = document.getElementById('configFechaInicio');
            const fechaFin = document.getElementById('configFechaFin');
            const periodoDisplay = document.getElementById('periodoActualDisplay');
            const bloqueoFechasDisplay = document.getElementById('bloqueoFechasDisplay');
            
            if (toggle) {
                if (configBloqueo.activo) toggle.classList.add('active');
                else toggle.classList.remove('active');
            }
            
            if (estadoText) {
                if (configBloqueo.activo) {
                    estadoText.textContent = "ACTIVADO";
                    estadoText.className = "estado-activo";
                } else {
                    estadoText.textContent = "DESACTIVADO";
                    estadoText.className = "estado-inactivo";
                }
            }
            
            if (fechaInicio) fechaInicio.value = configBloqueo.fechaInicio;
            if (fechaFin) fechaFin.value = configBloqueo.fechaFin;
            
            const textoPeriodo = `${configBloqueo.fechaInicio} - ${configBloqueo.fechaFin} de cada mes`;
            if (periodoDisplay) periodoDisplay.textContent = textoPeriodo;
            if (bloqueoFechasDisplay) bloqueoFechasDisplay.textContent = `Periodo de cierre: ${textoPeriodo}`;
        }

function verificarBloqueo() {
            const overlay = document.getElementById('bloqueoOverlay');
            const mainCard = document.getElementById('mainCard');
            
            if (!configBloqueo.activo) {
                if (overlay) overlay.style.display = 'none';
                if (mainCard) mainCard.style.display = 'block';
                return;
            }
            
            const hoy = new Date();
            const diaActual = hoy.getDate();
            const enPeriodoBloqueo = diaActual >= configBloqueo.fechaInicio && diaActual <= configBloqueo.fechaFin;
            
            if (enPeriodoBloqueo) {
                if (overlay) overlay.style.display = 'flex';
                if (mainCard) mainCard.style.display = 'none';
            } else {
                if (overlay) overlay.style.display = 'none';
                if (mainCard) mainCard.style.display = 'block';
            }
        }

async function accesoAdminDesdeBloqueo() {
            ClaveModal.mostrar({
                icono: '🔒',
                titulo: 'Acceso Administrador',
                subtitulo: 'Desactivar bloqueo del formulario',
                onSubmit: async (password) => {
                    const correcta = await AsociacionesModule.obtenerPasswordAdmin();
                    if (password !== correcta) return false;

                    AsociacionesModule.marcarAdminAutenticado();
                    configBloqueo.activo = false;
                    const configRef = database.ref(AsociacionesModule.getRef('configBloqueo'));
                    configRef.set(configBloqueo)
                        .then(() => {
                            showToast("✅ Bloqueo desactivado", "success");
                            actualizarUIConfigBloqueo();
                            verificarBloqueo();
                            setTimeout(() => {
                                if (confirm("¿Desea abrir el panel de administración?")) openAdminPanel();
                            }, 500);
                        })
                        .catch((error) => showToast("Error: " + error.message, "error"));
                    return true;
                }
            });
        }

setInterval(verificarBloqueo, 3600000);

document.addEventListener('DOMContentLoaded', () => {
            AsociacionesModule.onPerfilCargado(() => cargarConfigBloqueo());
        });
