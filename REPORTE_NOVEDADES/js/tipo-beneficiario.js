/* ============================================================
   TIPO-BENEFICIARIO.JS
   Define el TIPO DE BENEFICIARIO según la modalidad, antes de
   pedir el documento:
     · HCB (y demás modalidades)  → "6 meses a 5 años"  (flujo normal: tabla OMS)
     · FAMI y FAMIBIENVENIR       → "Menor de 6 meses" | "Persona gestante"
   Para los dos tipos de FAMI NO se muestra la tabla OMS ni el
   estado nutricional (son otros cálculos); se piden sus propios datos:
     · Persona gestante : N° controles prenatales, peso, talla, régimen, EPS
     · Menor de 6 meses : peso y talla al ingresar, peso y talla al nacer,
                          semanas de gestación al nacer, régimen, EPS
   Se carga DESPUÉS de novedades.js y nutricional.js.
   ============================================================ */
const TipoBeneficiario = (() => {
    const T = {
        estandar:      { label: '6 meses a 5 años' },
        menor_6_meses: { label: 'Menor de 6 meses' },
        gestante:      { label: 'Persona gestante' }
    };
    const $ = id => document.getElementById(id);

    function opcionesPorModalidad(modalidad) {
        const m = (modalidad || '').toUpperCase().replace(/[\s\-_]/g, '');
        if (!m) return [];
        if (m === 'FAMI' || m === 'FAMIBIENVENIR') return ['menor_6_meses', 'gestante'];
        return ['estandar']; // HCB, HI, CDI…
    }

    const tipo = () => ($('tipoBeneficiario') && $('tipoBeneficiario').value) || '';
    const esEspecial = () => tipo() === 'menor_6_meses' || tipo() === 'gestante';
    const omiteAcudiente = () => tipo() === 'gestante';
    const etiqueta = () => (T[tipo()] ? T[tipo()].label : '');

    /* ---------- Render de las opciones (ingreso y retiro) ---------- */
    const GRUPOS = {
        ingreso: { cont: 'tbOpciones',       hint: 'tbHint',       hid: 'tipoBeneficiario',     radio: '_tipoBenef' },
        retiro:  { cont: 'tbOpcionesRetiro', hint: 'tbHintRetiro', hid: 'retiroTipoBeneficiario', radio: '_tipoBenefRetiro' }
    };
    const tipoRetiro = () => ($('retiroTipoBeneficiario') && $('retiroTipoBeneficiario').value) || '';
    const etiquetaRetiro = () => (T[tipoRetiro()] ? T[tipoRetiro()].label : '');

    function renderGrupo(nombre) {
        const g = GRUPOS[nombre];
        const cont = $(g.cont);
        if (!cont) return;
        const mod = $('modalidadSelect') ? $('modalidadSelect').value : '';
        const ops = opcionesPorModalidad(mod);
        const hid = $(g.hid);
        let actual = hid ? hid.value : '';
        if (!ops.includes(actual)) actual = ops.length === 1 ? ops[0] : '';

        if (!ops.length) {
            cont.innerHTML = '';
            $(g.hint).textContent = 'Seleccione primero la modalidad para definir el tipo de beneficiario.';
        } else {
            $(g.hint).textContent = ops.length === 1 ? '' : 'Seleccione el tipo de participante para continuar.';
            cont.innerHTML = ops.map(k => `
                <label class="tb-opt">
                    <input type="radio" name="${g.radio}" value="${k}" ${k === actual ? 'checked' : ''}>
                    <span>${T[k].label}</span>
                </label>`).join('');
            cont.querySelectorAll('input').forEach(r =>
                r.addEventListener('change', () => nombre === 'ingreso' ? fijar(r.value) : fijarRetiro(r.value)));
        }
        if (nombre === 'ingreso') fijar(actual, true); else fijarRetiro(actual);
    }

    function refrescar() { renderGrupo('ingreso'); renderGrupo('retiro'); }

    function fijar(valor, silencioso) {
        const hid = $('tipoBeneficiario');
        if (!hid) return;
        const cambio = hid.value !== valor;
        hid.value = valor || '';
        aplicar(valor);
        if (cambio && !silencioso && typeof calcularEstadoNutricional === 'function') calcularEstadoNutricional();
    }

    function fijarRetiro(valor) {
        const hid = $('retiroTipoBeneficiario');
        if (!hid) return;
        hid.value = valor || '';
        ajustarDocumentos('retiroDocType', valor === 'gestante');
    }

    /* Documentos de la persona gestante: CC y TI (además de los demás) */
    function ajustarDocumentos(selectId, gest) {
        const doc = $(selectId);
        if (!doc) return;
        const tieneCC = !!doc.querySelector('option[value="CC"]');
        if (gest && !tieneCC) {
            const cc = document.createElement('option');
            cc.value = 'CC'; cc.textContent = 'CC - Cédula de Ciudadanía';
            const ti = document.createElement('option');
            ti.value = 'TI'; ti.textContent = 'TI - Tarjeta de Identidad';
            doc.insertBefore(ti, doc.firstChild);
            doc.insertBefore(cc, doc.firstChild);
            doc.value = 'CC';
        }
        if (!gest && tieneCC) {
            if (doc.value === 'CC' || doc.value === 'TI') doc.value = 'RC';
            doc.querySelectorAll('option[value="CC"], option[value="TI"]').forEach(o => o.remove());
        }
    }

    /* ---------- Cambios de pantalla según el tipo ---------- */
    function aplicar(t) {
        const gated = $('tbGated');
        if (gated) gated.classList.toggle('tb-locked', !t);

        const gest = t === 'gestante', m6 = t === 'menor_6_meses', esp = gest || m6;
        const mostrar = (id, ver) => { const e = $(id); if (e) e.classList.toggle('tb-hide', !ver); };

        // Bloques propios y bloques de la tabla OMS
        mostrar('nutriGestanteBlock', gest);
        mostrar('nutriMenor6Block', m6);
        mostrar('nutricionFieldsWrapper', !esp);
        mostrar('graficaTrigger', !esp);
        mostrar('nutricionPendienteBox', !esp);
        mostrar('nutricionIndicator', !esp ? true : false);
        if (esp) {
            const pend = $('nutricionPendiente');
            if (pend && pend.checked) {
                pend.checked = false;
                if (typeof toggleNutricionPendiente === 'function') toggleNutricionPendiente();
            }
            const ind = $('nutricionIndicator'); if (ind) ind.style.display = 'none';
            const rw = $('nutricionRegimenEpsWrapper'); if (rw) rw.style.display = '';
        }
        const tit = $('nutriTitulo'), ico = $('nutriIcono');
        if (tit) tit.textContent = gest ? 'Datos de la Persona Gestante'
                                  : m6 ? 'Datos del Menor de 6 meses'
                                  : 'Seguimiento Nutricional';
        if (ico) ico.textContent = gest ? '🤰' : m6 ? '👶' : '🍎';

        // Acudiente: la persona gestante es su propia beneficiaria
        mostrar('cardAcudiente', !gest);
        const cols = $('ingresoColumns2');
        if (cols) cols.classList.toggle('tb-solo-nutri', gest);

        // Documento: la gestante usa CC o TI
        ajustarDocumentos('ingresoDocType', gest);
        // El antecedente de prematurez (<24 meses) no aplica: ya se pide "semanas de gestación al nacer"
        if (typeof togglePrematurezVisibility === 'function') togglePrematurezVisibility();

        // Género: la gestante es mujer
        const rM = document.querySelector('input[name="_ingresoGender"][value="M"]');
        const rF = document.querySelector('input[name="_ingresoGender"][value="F"]');
        if (rM && rF) {
            rM.disabled = gest;
            if (gest) rF.checked = true;
        }
    }

    /* ---------- Validaciones ---------- */
    function validarTipo() {
        if (tipo()) return null;
        const ops = opcionesPorModalidad($('modalidadSelect') ? $('modalidadSelect').value : '');
        return {
            msg: ops.length ? '❌ Seleccione el TIPO DE BENEFICIARIO antes de continuar'
                            : '❌ Seleccione primero la MODALIDAD',
            el: $('tbOpciones')
        };
    }

    function validarTipoRetiro() {
        if (tipoRetiro()) return null;
        const ops = opcionesPorModalidad($('modalidadSelect') ? $('modalidadSelect').value : '');
        return {
            msg: ops.length ? '❌ Seleccione el TIPO DE BENEFICIARIO del retiro'
                            : '❌ Seleccione primero la MODALIDAD',
            el: $('tbOpcionesRetiro')
        };
    }

    function rango(id, nombre, min, max, entero) {
        const el = $(id);
        const v = el ? el.value.trim() : '';
        if (v === '') return { msg: `❌ ${nombre} es obligatorio`, el };
        const n = parseFloat(v);
        if (isNaN(n) || n < min || n > max)
            return { msg: `❌ ${nombre} debe estar entre ${min} y ${max}`, el };
        if (entero && !Number.isInteger(n))
            return { msg: `❌ ${nombre} debe ser un número entero`, el };
        return null;
    }

    function validarNutricion() {
        const t = tipo();
        if (t !== 'gestante' && t !== 'menor_6_meses') return null;
        const chequeos = t === 'gestante' ? [
            () => rango('gestControles', 'El N° de controles prenatales', 0, 20, true),
            () => rango('gestPeso', 'El PESO (kg)', 30, 200),
            () => rango('gestTalla', 'La TALLA (cm)', 120, 200)
        ] : [
            () => rango('m6PesoIng', 'El PESO al ingresar (kg)', 1, 12),
            () => rango('m6TallaIng', 'La TALLA al ingresar (cm)', 35, 80),
            () => rango('m6PesoNac', 'El PESO al nacer (kg)', 0.5, 6),
            () => rango('m6TallaNac', 'La TALLA al nacer (cm)', 30, 60),
            () => rango('m6Semanas', 'Las SEMANAS de gestación al nacer', 20, 44, true)
        ];
        for (const c of chequeos) { const e = c(); if (e) return e; }
        const reg = $('nutricionRegimen');
        if (!reg || !reg.value) return { msg: '❌ Seleccione el RÉGIMEN de salud', el: reg };
        const eps = $('nutricionEPS');
        if (!eps || !eps.value.trim()) return { msg: '❌ Escriba la EPS', el: eps };
        return null;
    }

    /* ---------- Datos que se guardan / envían ---------- */
    function datosNutricion() {
        const t = tipo();
        const v = id => ($(id) ? $(id).value.trim() : '');
        const base = {
            pendiente: false,
            tipo: t,
            fecha: v('ingresoDate'),
            perimetroBraquial: '',
            antecedentePrematurez: '',
            edadGestacional: '',
            regimen: v('nutricionRegimen'),
            eps: v('nutricionEPS')
        };
        if (t === 'gestante') return Object.assign(base, {
            peso: v('gestPeso'), talla: v('gestTalla'),
            controlesPrenatales: v('gestControles'),
            estadoNutricional: 'No aplica (persona gestante)'
        });
        return Object.assign(base, {
            peso: v('m6PesoIng'), talla: v('m6TallaIng'),
            pesoNacer: v('m6PesoNac'), tallaNacer: v('m6TallaNac'),
            semanasGestacion: v('m6Semanas'),
            estadoNutricional: 'No aplica (menor de 6 meses)'
        });
    }

    /** Se llama después de armar noveltyData y googleData en el submit. */
    function aplicarEnvio(noveltyData, googleData) {
        const t = tipo();
        if (!t || !noveltyData.ingreso) return;
        noveltyData.tipoBeneficiario = t;
        noveltyData.ingreso.tipoBeneficiario = t;
        googleData.ingreso_tipo_beneficiario = etiqueta();
        if (!esEspecial()) return;
        googleData.antecedente_prematurez = '';
        googleData.edad_gestacional = '';

        const n = datosNutricion();
        noveltyData.nutricion = n;
        googleData.nutricion_fecha = n.fecha;
        googleData.nutricion_peso = n.peso;
        googleData.nutricion_talla = n.talla;
        googleData.nutricion_perimetro_braquial = '';
        googleData.nutricion_regimen = n.regimen;
        googleData.nutricion_eps = n.eps;
        if (t === 'gestante') {
            googleData.nutricion_controles_prenatales = n.controlesPrenatales;
        } else {
            googleData.nutricion_peso_nacer = n.pesoNacer;
            googleData.nutricion_talla_nacer = n.tallaNacer;
            googleData.nutricion_semanas_gestacion = n.semanasGestacion;
        }
    }

    /** Texto para REPORTE_DETALLADO (vacío si no es tipo especial). */
    function textoReporte() {
        if (!esEspecial()) return '';
        const n = datosNutricion();
        if (tipo() === 'gestante') {
            return `\n[ DATOS PERSONA GESTANTE ]\n` +
                `  - Controles prenatales: ${n.controlesPrenatales}\n` +
                `  - Peso:               ${n.peso} kg\n` +
                `  - Talla:              ${n.talla} cm\n` +
                `  - Régimen:            ${n.regimen}\n` +
                `  - EPS:                ${n.eps}\n`;
        }
        return `\n[ DATOS MENOR DE 6 MESES ]\n` +
            `  - Peso al ingresar:   ${n.peso} kg\n` +
            `  - Talla al ingresar:  ${n.talla} cm\n` +
            `  - Peso al nacer:      ${n.pesoNacer} kg\n` +
            `  - Talla al nacer:     ${n.tallaNacer} cm\n` +
            `  - Semanas gestación:  ${n.semanasGestacion}\n` +
            `  - Régimen:            ${n.regimen}\n` +
            `  - EPS:                ${n.eps}\n`;
    }

    function reset() {
        if ($('tipoBeneficiario')) $('tipoBeneficiario').value = '';
        if ($('retiroTipoBeneficiario')) $('retiroTipoBeneficiario').value = '';
        refrescar();
    }

    /* ---------- Enganches con las funciones existentes ---------- */
    function envolver(nombre, despues) {
        const orig = window[nombre];
        if (typeof orig !== 'function') return;
        window[nombre] = function () {
            const r = orig.apply(this, arguments);
            despues();
            return r;
        };
    }
    envolver('onModalidadChange', refrescar);
    envolver('onRegionalChange', refrescar);

    // Prematurez: no se muestra en los tipos de FAMI (los datos de nacimiento van en su propio bloque)
    const origPrem = window.togglePrematurezVisibility;
    if (typeof origPrem === 'function') {
        window.togglePrematurezVisibility = function () {
            if (!esEspecial()) return origPrem.apply(this, arguments);
            const w = $('prematurezWrapper');
            if (w) w.classList.add('hidden');
            document.querySelectorAll('input[name="antecedente_prematurez"]').forEach(r => r.checked = false);
            const eg = $('edadGestacional'); if (eg) eg.value = '';
            const egw = $('edadGestacionalWrapper'); if (egw) egw.classList.add('hidden');
        };
    }

    // La tabla OMS y su alerta de edad (>5 años) no aplican a los tipos de FAMI
    const origCalc = window.calcularEstadoNutricional;
    if (typeof origCalc === 'function') {
        window.calcularEstadoNutricional = function () {
            if (esEspecial()) {
                const ind = $('nutricionIndicator'); if (ind) ind.style.display = 'none';
                return;
            }
            return origCalc.apply(this, arguments);
        };
    }
    const origEdad = window.validateAgeRange;
    if (typeof origEdad === 'function') {
        window.validateAgeRange = function () {
            const t = tipo();
            if (t !== 'gestante' && t !== 'menor_6_meses') return origEdad.apply(this, arguments);
            const dob = $('ingresoDOB');
            if (!dob || !dob.value) return;
            const hoy = new Date();
            const nac = new Date(dob.value + 'T00:00:00');
            if (nac > hoy) { showToast('Error: Fecha de nacimiento inválida', 'error'); return; }
            if (t === 'menor_6_meses') {
                const ref = ($('ingresoDate') && $('ingresoDate').value) ? new Date($('ingresoDate').value + 'T00:00:00') : hoy;
                let meses = (ref.getFullYear() - nac.getFullYear()) * 12 + ref.getMonth() - nac.getMonth();
                if (ref.getDate() < nac.getDate()) meses--;
                if (meses >= 6) showToast('Alerta: tiene 6 meses o más; no corresponde a "Menor de 6 meses"', 'warning');
            } else {
                let anios = hoy.getFullYear() - nac.getFullYear();
                if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) anios--;
                if (anios < 10) showToast('Alerta: la edad es muy baja para una persona gestante', 'warning');
            }
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        const sel = $('modalidadSelect');
        if (sel) sel.addEventListener('change', refrescar);
        refrescar();
    });

    return { tipo, tipoRetiro, esEspecial, omiteAcudiente, etiqueta, etiquetaRetiro, refrescar, reset,
             validarTipo, validarTipoRetiro, validarNutricion, aplicarEnvio, textoReporte };
})();
