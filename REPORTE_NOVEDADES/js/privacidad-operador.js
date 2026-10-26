/* ============================================================
   PRIVACIDAD-OPERADOR.JS
   Muestra la Política de Privacidad y Tratamiento de Datos la
   primera vez que se abre el HTML de un operador:
     - Ventana que no se puede cerrar sin aceptar.
     - Hay que bajar hasta el final del texto para habilitar el
       checkbox de confirmación; con el checkbox se habilita ACEPTAR.
     - Queda guardado en este dispositivo (localStorage) por operador
       y por versión de la política: si cambia POLITICA_VERSION,
       vuelve a pedirse.
     - Botón de escudo en la cabecera para volver a leerla.
   El texto es copia de privacidad.html (si cambias una, cambia la otra
   y sube POLITICA_VERSION).
   ============================================================ */
const PrivacidadOperador = (() => {
    const POLITICA_VERSION = '2026-10-25';
    const FECHA_TXT = '25 de octubre de 2026';
    const CLAVE = 'novedades_priv_' + (window.OPERADOR_FIJO || 'general');
    let _memoria = null; // respaldo si localStorage no está disponible

    const TEXTO = `<div class="priv-aviso">Esta aplicación registra datos de niños, niñas y adolescentes y datos de salud (sensibles). Por eso solo los tratamos con la autorización de su madre, padre o representante legal y únicamente para la finalidad que se explica aquí.</div>

<h3>1. Quién es el responsable</h3>
<p>El responsable del tratamiento es <strong>Afkril</strong>, desarrollador y administrador de APP-NOVEDADES. Contacto para cualquier tema de datos personales: <a href="mailto:afkril@gmail.com">afkril@gmail.com</a>.</p>
<p>Esta política se rige por la Ley 1581 de 2012, el Decreto 1074 de 2015 (que compila el Decreto 1377 de 2013) y la Ley 1098 de 2006 (Código de la Infancia y la Adolescencia).</p>

<h3>2. Qué datos recogemos, para qué y con qué base legal</h3>
<p>Recogemos solo los datos que pide el formulario de novedades y el registro de usuarios. Cada dato tiene un motivo y una base legal:</p>
<div class="priv-tabla">
<table>
<thead><tr><th>Dato</th><th>Motivo</th><th>Base legal</th></tr></thead>
<tbody>
<tr><td>Nombres y apellidos, tipo y número de documento del beneficiario</td><td>Identificar al beneficiario y registrar su ingreso o retiro en el sistema Cuéntame ICBF</td><td>A, M</td></tr>
<tr><td>Fecha de nacimiento, edad calculada y sexo</td><td>Verificar que cumple el rango de edad del servicio y calcular su estado nutricional</td><td>A, M</td></tr>
<tr><td>Comuna, barrio, dirección y teléfono</td><td>Ubicar al beneficiario y contactar a su familia</td><td>A, M</td></tr>
<tr><td>Soporte documental y RAM (PDF o imagen)</td><td>Respaldar el ingreso o retiro ante el operador y el ICBF</td><td>A, M</td></tr>
<tr><td>Fecha de valoración, peso, talla, perímetro braquial y estado nutricional</td><td>Seguimiento nutricional que exige el servicio y registro en Cuéntame</td><td>A, S, M</td></tr>
<tr><td>Régimen de salud y EPS</td><td>Registrar la afiliación del beneficiario en Cuéntame</td><td>A, S, M</td></tr>
<tr><td>Acudiente: documento, nombre y fecha de nacimiento</td><td>Identificar a quien representa al beneficiario y autoriza el tratamiento</td><td>A</td></tr>
<tr><td>Regional, modalidad, contrato, UDS y fechas de ingreso o retiro</td><td>Asociar la novedad al servicio y a la unidad correctos</td><td>A</td></tr>
<tr><td>Correo para recibir respuesta</td><td>Enviar la confirmación o respuesta de la novedad</td><td>A</td></tr>
<tr><td>Cuenta de usuario: nombre, correo, contraseña y operador elegido</td><td>Autenticar a la persona y definir a qué operador puede acceder</td><td>A</td></tr>
</tbody>
</table>
</div>
<p><strong>Bases legales:</strong></p>
<ul>
<li><strong>A. Autorización previa, expresa e informada</strong> del titular o de su representante legal (Ley 1581 de 2012, art. 9 y Decreto 1074 de 2015, Cap. 25).</li>
<li><strong>S. Datos sensibles</strong> (salud): requieren autorización explícita y es facultativo responder sobre ellos (Ley 1581 de 2012, art. 5 y 6). Solo los usamos para el seguimiento nutricional y la afiliación.</li>
<li><strong>M. Datos de niños, niñas y adolescentes:</strong> se tratan respetando su interés superior y sus derechos prevalentes, con autorización de su representante legal (Ley 1581 de 2012, art. 7 y Ley 1098 de 2006, art. 8).</li>
</ul>

<h3>3. Finalidad</h3>
<p>Usamos los datos para <strong>ingresar y mantener la información de los beneficiarios en el sistema Cuéntame ICBF</strong>. No los usamos para publicidad, perfilamiento comercial ni los vendemos.</p>

<h3>4. Con quién se comparten</h3>
<p>Solo tienen acceso las personas que necesitan los datos para cumplir esa finalidad:</p>
<ul>
<li>Operadores</li>
<li>Madres comunitarias</li>
<li>Administradores</li>
<li>Digitadores</li>
</ul>
<p>Para operar la aplicación usamos servicios de Google (Firebase y Google Apps Script), que actúan como encargados del tratamiento y pueden almacenar datos en servidores fuera de Colombia. No compartimos los datos con otros terceros, salvo que una autoridad competente lo exija.</p>

<h3>5. Cuánto tiempo los conservamos</h3>
<p>Conservamos los datos <strong>1 año</strong>. Cumplido ese plazo los eliminamos o los anonimizamos, salvo que una norma o una autoridad exija conservarlos por más tiempo.</p>

<h3>6. Sus derechos</h3>
<p>Como titular, o como representante legal de un menor, puede:</p>
<ul>
<li>Conocer, actualizar y rectificar los datos.</li>
<li>Pedir prueba de la autorización otorgada.</li>
<li>Ser informado del uso que se les ha dado.</li>
<li>Revocar la autorización y solicitar la supresión de los datos.</li>
<li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
</ul>
<p>Para ejercerlos escriba a <a href="mailto:afkril@gmail.com">afkril@gmail.com</a> indicando su nombre, documento y lo que solicita. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles (prorrogables según el art. 14 y 15 de la Ley 1581 de 2012). Estos trámites son gratuitos.</p>

<h3>7. Seguridad</h3>
<p>El acceso exige una cuenta con correo y contraseña, la conexión viaja cifrada (HTTPS) y las contraseñas las gestiona Firebase Authentication, por lo que no podemos verlas. Cada persona es responsable de no compartir su contraseña. Si detecta un acceso indebido, avísenos de inmediato al correo de contacto.</p>

<h3>8. Almacenamiento en su navegador</h3>
<p>La aplicación guarda en su navegador solo datos técnicos para mantener la sesión y recordar preferencias de pantalla. No usa cookies de publicidad ni de seguimiento.</p>

<h3>9. Cambios a esta política</h3>
<p>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>`;

    function leerAceptacion() {
        try {
            const raw = localStorage.getItem(CLAVE);
            if (raw) { const o = JSON.parse(raw); if (o && o.version === POLITICA_VERSION) return o; }
        } catch (e) {}
        return _memoria && _memoria.version === POLITICA_VERSION ? _memoria : null;
    }
    function guardarAceptacion() {
        const o = { version: POLITICA_VERSION, fecha: new Date().toISOString() };
        _memoria = o;
        try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) {}
        return o;
    }

    function construir() {
        if (document.getElementById('privOverlay')) return;
        const ov = document.createElement('div');
        ov.id = 'privOverlay';
        ov.innerHTML = `
        <div class="priv-box" role="dialog" aria-modal="true" aria-labelledby="privTitulo">
            <div class="priv-head">
                <div style="font-size:1.5rem">🛡️</div>
                <h2 id="privTitulo">Política de Privacidad y Tratamiento de Datos
                    <small>APP-NOVEDADES · Actualizada el ${FECHA_TXT}</small></h2>
                <button type="button" class="priv-x" id="privX" title="Cerrar" aria-label="Cerrar">✕</button>
            </div>
            <div class="priv-scroll" id="privScroll" tabindex="0">${TEXTO}
                <p style="margin-top:14px"><a href="privacidad.html" target="_blank" rel="noopener">Abrir esta política en una página aparte</a></p>
            </div>
            <div class="priv-foot">
                <div id="privModoAceptar">
                    <p class="priv-hint" id="privHint">⬇ Baje hasta el final del texto para poder aceptar.</p>
                    <label class="priv-check">
                        <input type="checkbox" id="privCheck" disabled>
                        <span>He leído la política y autorizo el tratamiento de los datos personales que registre, incluidos los de niños, niñas y adolescentes y los datos de salud, para la finalidad descrita.</span>
                    </label>
                    <div class="priv-btns">
                        <button type="button" class="priv-btn priv-btn-ok" id="privOk" disabled>ACEPTAR</button>
                    </div>
                </div>
                <div id="privModoLectura" style="display:none">
                    <p class="priv-hint" id="privEstado" style="color:#15803d"></p>
                    <div class="priv-btns"><button type="button" class="priv-btn priv-btn-sec" id="privCerrar">Cerrar</button></div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(ov);

        const sc = ov.querySelector('#privScroll');
        const chk = ov.querySelector('#privCheck');
        const ok = ov.querySelector('#privOk');
        const hint = ov.querySelector('#privHint');

        function revisarFinal() {
            if (chk.disabled && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 12) {
                chk.disabled = false;
                hint.textContent = '✔ Ya puede marcar la casilla y aceptar.';
                hint.style.color = '#15803d';
            }
        }
        sc.addEventListener('scroll', revisarFinal, { passive: true });
        chk.addEventListener('change', () => { ok.disabled = !chk.checked; });
        ok.addEventListener('click', () => {
            if (!chk.checked) return;
            guardarAceptacion();
            cerrar();
            if (typeof showToast === 'function') showToast('✅ Política de datos aceptada', 'success');
        });
        ov.querySelector('#privX').addEventListener('click', cerrar);
        ov.querySelector('#privCerrar').addEventListener('click', cerrar);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && ov.classList.contains('is-open') && ov.dataset.modo === 'lectura') cerrar();
        });
        ov.addEventListener('click', e => { if (e.target === ov && ov.dataset.modo === 'lectura') cerrar(); });
    }

    function cerrar() {
        const ov = document.getElementById('privOverlay');
        if (!ov) return;
        ov.classList.remove('is-open');
        document.body.style.overflow = ov.dataset.prevOverflow || '';
    }

    /** forzado=true: primera vez, sin posibilidad de cerrar sin aceptar. */
    function abrir(forzado) {
        construir();
        const ov = document.getElementById('privOverlay');
        const sc = ov.querySelector('#privScroll');
        const acept = leerAceptacion();
        const lectura = !forzado && !!acept;
        ov.dataset.modo = lectura ? 'lectura' : 'aceptar';
        ov.querySelector('#privX').style.display = lectura ? '' : 'none';
        ov.querySelector('#privModoAceptar').style.display = lectura ? 'none' : '';
        ov.querySelector('#privModoLectura').style.display = lectura ? '' : 'none';
        if (lectura) {
            const f = new Date(acept.fecha);
            ov.querySelector('#privEstado').textContent =
                '✔ Aceptada en este dispositivo el ' + (isNaN(f) ? '—' : f.toLocaleDateString('es-CO'));
        } else {
            const chk = ov.querySelector('#privCheck');
            chk.checked = false; chk.disabled = true;
            ov.querySelector('#privOk').disabled = true;
            const h = ov.querySelector('#privHint');
            h.textContent = '⬇ Baje hasta el final del texto para poder aceptar.'; h.style.color = '';
        }
        ov.dataset.prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        ov.classList.add('is-open');
        sc.scrollTop = 0;
        // Si el texto cabe sin scroll (pantallas muy altas), habilitar de una vez
        requestAnimationFrame(() => {
            if (!lectura && sc.scrollHeight <= sc.clientHeight + 12) sc.dispatchEvent(new Event('scroll'));
            sc.focus({ preventScroll: true });
        });
    }

    function init() {
        if (!leerAceptacion()) abrir(true);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return { abrir: () => abrir(false), yaAceptada: () => !!leerAceptacion() };
})();
