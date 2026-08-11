// ============================================================
// MÓDULO: MIGRACIÓN DE ESTADOS NUTRICIONALES OMS
// Recalcula el campo nutricion.estadoNutricional de TODOS los
// registros (activos y archivados, de TODAS las asociaciones)
// usando el nuevo cálculo exacto OMS (método LMS oficial),
// sin tocar peso/talla/otros campos.
// ============================================================

const MigracionOMS = (() => {

    let _resultado = null; // { cambios: [...], stats: {...} }
    let _procesando = false;

    // ── Recorre una colección (novedades_x o archivados_x) ─────
    async function _procesarColeccion(refPath, tipoColeccion, asociacionNombre, cambios, stats, log) {
        let snap;
        try {
            snap = await database.ref(refPath).once('value');
        } catch (e) {
            log(`❌ Error leyendo ${refPath}: ${e.message}`);
            return;
        }
        const val = snap.val();
        if (!val) return;

        Object.entries(val).forEach(([id, novelty]) => {
            stats.totalRevisados++;
            const nutricion = novelty && novelty.nutricion;

            if (!nutricion || nutricion.pendiente === true) {
                stats.sinDatos++;
                return;
            }

            const peso = parseFloat(nutricion.peso);
            const talla = parseFloat(nutricion.talla);
            const genero = (novelty.ingreso && novelty.ingreso.gender) || novelty.gender || '';

            if (!peso || !talla || isNaN(peso) || isNaN(talla) || (genero !== 'M' && genero !== 'F')) {
                stats.sinDatos++;
                return;
            }
            if (talla < 65 || talla > 120) {
                stats.fueraDeRango++;
                return;
            }

            let nuevoEstado;
            try {
                nuevoEstado = calcularRangoOMS(talla, peso, genero).nombre;
            } catch (e) {
                stats.errores++;
                return;
            }

            const anterior = nutricion.estadoNutricional || 'Sin calcular';

            if (anterior !== nuevoEstado) {
                cambios.push({
                    path: `${refPath}/${id}/nutricion/estadoNutricional`,
                    asociacion: asociacionNombre,
                    coleccion: tipoColeccion,
                    nombre: (novelty.ingreso && novelty.ingreso.name) || novelty.name || '(sin nombre)',
                    peso, talla, genero,
                    anterior,
                    nuevo: nuevoEstado
                });
                stats.cambiaran++;
            } else {
                stats.sinCambio++;
            }
        });
    }

    // ── Analiza TODAS las asociaciones (no escribe nada) ───────
    async function analizar(log) {
        const asociaciones = await AsociacionesModule.cargarAsociaciones();
        const ids = Object.keys(asociaciones || {});
        const cambios = [];
        const stats = { totalRevisados: 0, cambiaran: 0, sinCambio: 0, sinDatos: 0, fueraDeRango: 0, errores: 0 };

        if (ids.length === 0) {
            log('⚠️ No se encontraron asociaciones registradas.');
        }

        for (const id of ids) {
            const nombre = (asociaciones[id] && asociaciones[id].nombre) || id;
            log(`🔎 Analizando "${nombre}"...`);
            await _procesarColeccion(`novedades_${id}`, 'Activas', nombre, cambios, stats, log);
            await _procesarColeccion(`archivados_${id}`, 'Archivadas', nombre, cambios, stats, log);
        }

        _resultado = { cambios, stats };
        return _resultado;
    }

    // ── Aplica los cambios detectados (escritura real en Firebase) ──
    async function aplicar(log) {
        if (!_resultado || _resultado.cambios.length === 0) {
            return { aplicados: 0 };
        }
        const updates = {};
        _resultado.cambios.forEach(c => { updates[c.path] = c.nuevo; });

        // Escritura multi-ruta atómica desde la raíz de la base de datos
        await database.ref().update(updates);

        const aplicados = _resultado.cambios.length;
        _resultado = null; // invalidar análisis previo tras escribir
        return { aplicados };
    }

    function getResultado() {
        return _resultado;
    }

    function estaProcesando() {
        return _procesando;
    }

    function setProcesando(v) {
        _procesando = v;
    }

    return { analizar, aplicar, getResultado, estaProcesando, setProcesando };
})();


// ============================================================
// UI: Panel de migración (se inyecta dinámicamente)
// ============================================================
function abrirMigracionOMS() {
    const old = document.getElementById('migracionOMSModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'migracionOMSModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:18px 22px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <span style="font-size:24px;">🩺</span>
                <div>
                    <h3 style="color:white;font-weight:800;font-size:16px;margin:0;">Recalcular Estados Nutricionales (OMS)</h3>
                    <p style="color:#cffafe;font-size:12px;margin:2px 0 0;">Aplica el nuevo cálculo exacto OMS a todos los registros guardados</p>
                </div>
                <button onclick="document.getElementById('migracionOMSModal').remove()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;font-weight:bold;">×</button>
            </div>

            <div style="padding:20px 22px;overflow-y:auto;flex:1;">
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#92400e;margin-bottom:16px;line-height:1.5;">
                    ⚠️ Esto recalcula <strong>únicamente</strong> el campo <code>nutricion.estadoNutricional</code> de cada registro
                    (activos y archivados, de <strong>todas</strong> las asociaciones), usando el método OMS exacto (LMS).
                    No modifica peso, talla ni ningún otro dato. Recomendado: exporta un respaldo desde Firebase Console antes de aplicar.
                </div>

                <div style="display:flex;gap:10px;margin-bottom:16px;">
                    <button id="migBtnAnalizar" onclick="_migAnalizarClick()"
                        style="flex:1;padding:12px;background:linear-gradient(135deg,#0891b2,#0e7490);color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:14px;">
                        🔍 Analizar (vista previa, no escribe nada)
                    </button>
                </div>

                <div id="migLog" style="background:#0f172a;color:#94e2d5;font-family:monospace;font-size:11.5px;border-radius:10px;padding:12px;max-height:140px;overflow-y:auto;display:none;margin-bottom:16px;white-space:pre-line;"></div>

                <div id="migResumen" style="display:none;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function _migLogLine(msg) {
    const logEl = document.getElementById('migLog');
    if (!logEl) return;
    logEl.style.display = 'block';
    logEl.textContent += (logEl.textContent ? '\n' : '') + msg;
    logEl.scrollTop = logEl.scrollHeight;
}

async function _migAnalizarClick() {
    if (MigracionOMS.estaProcesando()) return;
    MigracionOMS.setProcesando(true);

    const btn = document.getElementById('migBtnAnalizar');
    const logEl = document.getElementById('migLog');
    const resumenEl = document.getElementById('migResumen');
    if (logEl) { logEl.textContent = ''; logEl.style.display = 'block'; }
    if (resumenEl) resumenEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando...'; }

    try {
        const { cambios, stats } = await MigracionOMS.analizar(_migLogLine);
        _migLogLine(`✅ Análisis completo. Registros revisados: ${stats.totalRevisados}`);
        _migRenderResumen(cambios, stats);
    } catch (e) {
        _migLogLine(`❌ Error durante el análisis: ${e.message}`);
        showToast && showToast('❌ Error al analizar datos', 'error');
    } finally {
        MigracionOMS.setProcesando(false);
        if (btn) { btn.disabled = false; btn.textContent = '🔍 Analizar (vista previa, no escribe nada)'; }
    }
}

function _migRenderResumen(cambios, stats) {
    const resumenEl = document.getElementById('migResumen');
    if (!resumenEl) return;

    const filas = cambios.slice(0, 60).map(c => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 8px;font-size:11.5px;">${c.asociacion}</td>
            <td style="padding:6px 8px;font-size:11.5px;">${c.coleccion}</td>
            <td style="padding:6px 8px;font-size:11.5px;font-weight:600;">${c.nombre}</td>
            <td style="padding:6px 8px;font-size:11.5px;color:#dc2626;">${c.anterior}</td>
            <td style="padding:6px 8px;font-size:11.5px;color:#16a34a;font-weight:700;">→ ${c.nuevo}</td>
        </tr>
    `).join('');

    const masTexto = cambios.length > 60
        ? `<div style="padding:8px;text-align:center;font-size:11.5px;color:#64748b;">... y ${cambios.length - 60} cambio(s) más</div>`
        : '';

    resumenEl.style.display = 'block';
    resumenEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
            <div style="background:#ecfdf5;border-radius:10px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#059669;">${stats.cambiaran}</div>
                <div style="font-size:10.5px;color:#065f46;font-weight:600;">CAMBIARÁN</div>
            </div>
            <div style="background:#f1f5f9;border-radius:10px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#475569;">${stats.sinCambio}</div>
                <div style="font-size:10.5px;color:#334155;font-weight:600;">SIN CAMBIO</div>
            </div>
            <div style="background:#fef3c7;border-radius:10px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#b45309;">${stats.sinDatos + stats.fueraDeRango}</div>
                <div style="font-size:10.5px;color:#92400e;font-weight:600;">SIN DATOS / FUERA RANGO</div>
            </div>
        </div>

        ${cambios.length === 0 ? `
            <div style="text-align:center;padding:20px;color:#64748b;font-size:13px;">
                ✅ No hay registros que cambien. Todo ya está calculado con el método actual.
            </div>
        ` : `
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <div style="max-height:260px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead style="position:sticky;top:0;background:#f8fafc;">
                            <tr>
                                <th style="padding:6px 8px;text-align:left;font-size:10.5px;color:#64748b;">ASOCIACIÓN</th>
                                <th style="padding:6px 8px;text-align:left;font-size:10.5px;color:#64748b;">TIPO</th>
                                <th style="padding:6px 8px;text-align:left;font-size:10.5px;color:#64748b;">BENEFICIARIO</th>
                                <th style="padding:6px 8px;text-align:left;font-size:10.5px;color:#64748b;">ANTES</th>
                                <th style="padding:6px 8px;text-align:left;font-size:10.5px;color:#64748b;">DESPUÉS</th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                    ${masTexto}
                </div>
            </div>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;">
                <label style="font-size:12px;font-weight:700;color:#991b1b;display:block;margin-bottom:8px;">
                    Para confirmar, escribe <strong>APLICAR</strong> en el campo y presiona el botón:
                </label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="migConfirmInput" placeholder="APLICAR" oninput="_migToggleAplicar()"
                        style="flex:1;padding:9px 12px;border:2px solid #fca5a5;border-radius:10px;font-size:13px;box-sizing:border-box;">
                    <button id="migBtnAplicar" onclick="_migAplicarClick()" disabled
                        style="padding:9px 18px;background:#dc2626;color:white;border:none;border-radius:10px;font-weight:800;cursor:not-allowed;opacity:0.5;font-size:13px;white-space:nowrap;">
                        ✅ Aplicar ${cambios.length} cambio(s)
                    </button>
                </div>
            </div>
        `}
    `;
}

function _migToggleAplicar() {
    const input = document.getElementById('migConfirmInput');
    const btn = document.getElementById('migBtnAplicar');
    if (!input || !btn) return;
    const ok = input.value.trim().toUpperCase() === 'APLICAR';
    btn.disabled = !ok;
    btn.style.cursor = ok ? 'pointer' : 'not-allowed';
    btn.style.opacity = ok ? '1' : '0.5';
}

async function _migAplicarClick() {
    if (MigracionOMS.estaProcesando()) return;
    const btn = document.getElementById('migBtnAplicar');
    if (!btn || btn.disabled) return;

    MigracionOMS.setProcesando(true);
    btn.disabled = true;
    btn.textContent = '⏳ Aplicando...';

    try {
        const { aplicados } = await MigracionOMS.aplicar(_migLogLine);
        _migLogLine(`✅ Se actualizaron ${aplicados} registro(s) en Firebase.`);
        showToast && showToast(`✅ ${aplicados} estado(s) nutricional(es) actualizados`, 'success');
        const resumenEl = document.getElementById('migResumen');
        if (resumenEl) {
            resumenEl.innerHTML = `
                <div style="text-align:center;padding:24px;">
                    <div style="font-size:36px;margin-bottom:8px;">✅</div>
                    <div style="font-size:15px;font-weight:800;color:#059669;">${aplicados} registro(s) actualizados correctamente</div>
                    <div style="font-size:12px;color:#64748b;margin-top:6px;">Puedes cerrar esta ventana. Los reportes ya reflejarán el nuevo cálculo.</div>
                </div>
            `;
        }
    } catch (e) {
        _migLogLine(`❌ Error al aplicar cambios: ${e.message}`);
        showToast && showToast('❌ Error al aplicar cambios en Firebase', 'error');
        btn.disabled = false;
        btn.textContent = '✅ Reintentar';
    } finally {
        MigracionOMS.setProcesando(false);
    }
}
