# Gestor de Documentos – frontend estático

Backend: Google Apps Script (Code.gs con doPost). Frontend: esta carpeta.

## Historial de versiones
- **v1.3.9** (2026-11-22): Login principal: apartado Cuentas guardadas en este equipo — varias cuentas con entrada rápida al tocarlas (se guardan tras entrar con éxito y con la casilla marcada), con eliminar por cuenta y borrar todas. Solo index.html y css/login.css; no toca Code.gs.
- **v1.3.8** (2026-11-22): Medalla al reentrar: la celebración ahora es una transición visible vieja -> nueva en el modal (con % y temas aprobados, no archivos subidos) y se muestra una vez por nivel aunque el salto haya ocurrido antes de entrar. La descarga ZIP se desbloquea en 80% (Platino), antes 85%. Solo dashboard.html y css/styles.css; no toca Code.gs.
- **v1.3.7** (2026-11-22): Medallas vivas: celebración al subir de nivel que se recuerda entre visitas, medalla principal con flotación y giro al pasar el cursor, mini medallas clicables con su detalle y vitrina Mis medallas guardada en el navegador. Solo dashboard y css; no toca Code.gs.
- **v1.3.6** (2026-11-22): Se quitan todos los bloques prefers-reduced-motion de css/styles.css: si el sistema tenía activado Reducir movimiento, apagaba las animaciones de las carpetas y la v1.3.5 se veía igual que la v1.3.4. Ahora las animaciones de las carpetas siempre se reproducen. No toca Code.gs.
- **v1.3.5** (2026-11-22): Apartado de usuario: carpetas con más movimiento — hoja que gira y entra en la carpeta al pasar el cursor, balanceo suave en carpetas vacías, hoja que se mueve e insignia que respira en carpetas en revisión, brinco sutil con brillo en carpetas por corregir/vencidas y respiración suave en aprobadas. Solo dashboard (usuario) y css/styles.css; no toca Code.gs.
- **v1.3.4** (2026-11-22): El color de «Por corregir» (rechazado) pasa de naranja a índigo #4F46E5 en todos los apartados (matriz, KPI, etiquetas, tarjetas, avisos, notificaciones, gráficas, leyendas y ayuda de Code.gs) para no confundirlo con el amarillo de «En revisión». El perfil Administrativo conserva su color. Code.gs solo cambia los textos de la leyenda.
- **v1.7.1** (2026-11-21): Administración: si la implementación de Apps Script es anterior y no tiene apiAdminFileMeta, ya no queda una pestaña en blanco: avisa y usa la ruta anterior. El error «Función no permitida» ahora indica qué función se pidió.
- **v1.7** (2026-11-21): Administración: «Ver» y «Descargar» abren el archivo directo en Drive (pestaña nueva), sin llamadas a Apps Script ni vista previa propia; el id de Drive llega ya en la lista (solo a administración, se quita en lo que recibe la unidad). Las unidades conservan su vista previa. Para volver al visor propio en archivos pequeños: ADMIN_DRIVE_MIN en admin.html. Toca Code.gs: pega y crea Nueva versión.
- **v1.6** (2026-11-21): Administración: los archivos de 5 MB o más se visualizan y descargan directo desde Drive (visor de Drive, sin pasar los bytes por Apps Script); las unidades conservan su vista previa. Decodificación más liviana al ver/descargar y la aprobación ya no espera la recarga de la pestaña. Toca Code.gs (apiAdminFileMeta): pega el Code.gs y crea Nueva versión; si aún no se despliega, el panel sigue funcionando con la ruta anterior.
- **v1.3** (2026-11-18): Móvil: los paneles laterales (tema, casilla y ficha de UDS) se ajustan al ancho de la pantalla sin quedar cortados; sin zoom de interfaz en pantallas de 900 px o menos, datos en 1-2 columnas y modales casi a pantalla completa. Solo css/styles.css; no toca Code.gs.
- **v1.2** (2026-11-17): Matriz de estado (admin): sin límite de alto, la página se desplaza hacia abajo normal; solo queda el scroll lateral con las columnas de unidad y avance fijas.
- **v1.1** (2026-11-17): Filtro por contrato en Usuarios registrados; botón de descarga ZIP de la carpeta del mes en el panel de la unidad (con 85 % o más validado, solo documentos aprobados, por tema). No toca Code.gs.
- **v1.0** (2026-11-17): primera versión con número. Rótulo «JER_DRIVE 2026 v1.0» visible en todas las páginas (`js/version.js`); opción «Recordar usuario en este equipo» en el ingreso de unidades; versionado de css/js con `?v=` para evitar caché. No toca `Code.gs`.

**Cómo subir de versión:** `python3 tools/bump_version.py 1.1 "qué cambió"` (actualiza `js/version.js`, los `?v=` de los HTML y esta lista). Luego sube la carpeta a GitHub Pages.

## Puesta en marcha
1. En Apps Script reemplaza el contenido de `Code.gs` por el de `apps-script/Code.gs`.
2. Implementar > Administrar implementaciones > editar (lápiz) > Versión: **Nueva versión** > Implementar.
   (Solo se repite cuando cambias Code.gs, nunca por cambios de diseño.)
3. Copia la URL de la aplicación web (termina en /exec) y pégala en `js/config.js`.
4. Prueba local:  `python3 -m http.server 8000`  y abre http://localhost:8000
5. Publica: sube la carpeta `site/` a GitHub Pages (o cualquier hosting estático).

## Estructura
- index.html (login), register.html, dashboard.html, admin-login.html, admin.html
- css/styles.css  → todo el diseño
- js/common.js    → utilidades + gsRun (ahora usa fetch)
- js/config.js    → URL del backend
- assets/brand.jpg → imagen del panel izquierdo (antes era base64 embebido)

## Cambios recientes
- **Renombrar un tema también renombra sus carpetas en Drive** (`Code.gs`: `renameTopicFolders_`, usada por `apiAdminUpdateTopic`). Parte de los archivos ya cargados del tema: su carpeta contenedora (una por unidad) se renombra si aún tiene el nombre anterior; si ya existe otra con el nombre nuevo (alguien subió algo tras el cambio) se mueve el contenido a ella y la vieja va a la papelera de Drive; si alguien la renombró o movió a mano, no se toca. Se hace fuera del candado y se corta a los 4 min (el aviso indica si quedó parcial; basta con volver a guardar el nombre). Las carpetas de unidades sin archivos cargados no existen aún, así que nada que renombrar. Se registra en la bitácora. **Toca `Code.gs`**: pega y crea **Nueva versión** (puede pedir autorizar Drive de nuevo).
- **Gestionar temas rediseñado (administración)** (`admin.html`, `css/styles.css`): modal más amplio con encabezado, buscador, filtro (obligatorios, opcionales, con fecha límite, con formatos restringidos, solo algunos contratos) y botón «Nuevo tema» (acepta varios, uno por línea). Cada tema es una tarjeta numerada con etiquetas de obligatoriedad, formatos, contratos y fecha límite, y botones Editar, Duplicar y Eliminar; el lápiz junto al nombre renombra en línea (Enter guarda, Esc cancela). **Reordenar**: se arrastra desde el asa de puntos (ratón o táctil) o con las flechas ↑ ↓ estando en el asa; el orden se guarda con «Guardar cambios» (el resto de acciones se guarda al instante). Mientras haya búsqueda o filtro activo no se puede reordenar. **Toca `Code.gs`** (`apiAdminReorderTopics`, `apiAdminDuplicateTopic`; nueva acción de bitácora `tema_reordenado`): pega el Code.gs y crea **Nueva versión**. Sin cambios en las hojas.
- **Carga de varios documentos a la vez (usuario)** (`dashboard.html`, `js/common.js`): en la tarjeta del tema y en el panel «Adjuntar documentos» se pueden elegir o arrastrar varios archivos juntos (hasta 20 por carga). Cada archivo se valida (tamaño, extensión, formatos del tema); los no válidos se listan en un aviso y no frenan a los demás. Se suben de uno en uno, con una notificación de progreso por archivo y un resumen final («Se cargaron X de Y»). Usa el mismo `apiUploadFile`, así que no requiere cambios en Code.gs.
- **Administración — datos en columnas**: en «Ver detalles» la información del tema se ordena en una cuadrícula de 3×2 (Código UDS, Cédula, Contrato / Mes, Último cargue); en la ficha de la UDS los 4 datos (Contrato, Registrada, Último cargue, Archivos en total) van en una sola fila de 4 columnas.
- **Medalla del panel del tema**: ahora es la medalla del avance del usuario en el mes (la misma de la tarjeta de progreso), así que no cambia al abrir otras carpetas. Sin medalla aún, se ve apagada.
- **Documentos cargados plegables**: cada archivo se pliega/despliega con su flecha o tocando la fila, y hay «Plegar todo / Desplegar todo». Con 1 archivo se ve abierto; con varios, plegados.
- **Administración**: «Ver detalles» de una casilla y la «Ficha de la UDS» usan el mismo estilo del panel de usuario (cabecera morada con Unidad • Mes, tarjeta de información con medalla del avance de la unidad, tarjetas redondeadas, botones tipo píldora, zoom 80 %), conservando todas sus funciones (aprobar, rechazar, reemplazar, eliminar, formatos, No aplica, ver como unidad, recordatorio, historial por mes). Estilos limitados a `#cellDrawer` y `#unitDrawer`. No requiere cambios en Code.gs.
- **Panel del tema (usuario) en una sola vista**: se quitaron las pestañas; Detalles, Adjuntar y Documentos aparecen juntos, uno debajo de otro, con el contenido a escala ~80 % (`zoom:.8` en cabecera y cuerpo, solo `.dash-page`). Toda la tarjeta «Adjuntar documentos» es zona de arrastre y de clic, y el nombre del archivo cargado se muestra completo (con salto de línea).
- **Panel del tema (usuario)**: las pestañas Detalles / Adjuntar / Documentos pasan a una barra inferior más compacta. Los estilos del rediseño ahora están limitados a `.dash-page`, así que el «Ver detalles» de administración vuelve a verse como antes (sus estilos no cambian).
- **Panel del tema rediseñado (usuario)**: cabecera morada con la carpeta del estado, título, «Unidad • Mes» y estado; pestañas **Detalles / Adjuntar / Documentos (n)**; tarjeta «Información del tema» con la medalla (oro = aprobado, plata = en revisión, bronce = rechazado/vacío), fecha límite y obligatoriedad; tarjeta «Adjuntar documentos» con ilustración y botón; y «Documentos cargados» con botones Visualizar, Descargar, Renombrar y Eliminar. Tras cargar un archivo, el panel pasa solo a Documentos. No requiere cambios en Code.gs.
- **Detalle de notificación rediseñado** (`dashboard.html` + `css/styles.css`): encabezado a color según el tipo (eliminado = rojo, rechazado = índigo, ajustado = azul, aprobado = verde, recordatorio = ámbar) con ícono en círculo blanco, fecha y botón cerrar; tarjetas con ícono para Archivo, Tema, Mes y Fecha y hora; tarjeta del motivo/observación; «Mensaje completo»; y botón «Entendido» del color del tipo. En «Realizado por el perfil» se muestra el mismo ícono que en modo administración (Pedagoga, Psicóloga, Nutricionista, Administrativo; «Administración» usa el de Administrativo).
  El tipo `aprobado` ya tiene estilo, pero el backend hoy solo genera avisos de recordatorio, rechazo, eliminación y ajuste. No requiere cambios en Code.gs.
- **Abrir en Drive (admin)**: el visor tiene el botón «Abrir en Drive», que abre el archivo original en Drive (visor nativo de Google, fiel para Word y Excel). También aparece en el aviso de «sin vista previa». Solo en administración: las unidades no tienen acceso a Drive. **Toca `Code.gs`** (`getFileAsBase64_` y `apiAdminDownloadDriveFile` devuelven `driveUrl`): pega el Code.gs y crea **Nueva versión**.
- **Medallas**: ahora son imágenes PNG con fondo transparente en `assets/medals/` (bronce, plata, oro, platino, diamante).
- **Carpetas**: al pasar el cursor se abren más y las hojas salen más (css/styles.css, reglas `.fg-p` y `.fg-front`).
- **Perfiles de revisión** (admin.html): al entrar se elige Pedagoga, Psicóloga, Nutricionista o Administrativo.
  «Cambiar perfil» está arriba, en Inicio, en Matriz de estado y en Por revisar.
  El perfil queda escrito en «Revisado por» (ej. `Pedagoga · usuario`) junto al contrato de la unidad.
  En Por revisar → Aprobados/Rechazados hay columna y filtro «Revisado por».
- **Importante**: este cambio toca `apps-script/Code.gs` (parámetro `perfil`). Repite el paso 2 de «Puesta en marcha»
  (nueva versión de la implementación). No se agregan columnas a la hoja de cálculo.
- **Visor de archivos**: el botón «Ver» abre una vista previa dentro de la página (js/common.js, `openFileViewer`).
  PDF e imágenes: nativo. Word (.docx): docx-preview (páginas con encabezados y tablas; respaldo mammoth.js). Excel (.xlsx): ExcelJS con colores, negritas, bordes, celdas combinadas y anchos; .xls y CSV: SheetJS (primeras 500 filas por hoja).
  Las librerías se cargan desde cdnjs solo al abrir ese tipo de archivo. .doc, .zip, .rar y .7z se siguen descargando.
  No requiere cambios en Code.gs.

## Cambios: gestión de archivos por administración (v3.1)
**Importante:** toca `apps-script/Code.gs` (nuevos endpoints y 2 columnas en `Uploads`: `reemplazadoAt`, `reemplazadoPor`).
Pega el Code.gs nuevo, ejecuta `setup()` una vez (o abre la app: el esquema pasa solo a la versión 5) y crea **Nueva versión** de la implementación.
- **Eliminar archivo** (matriz → detalle de la casilla → *Eliminar*): pide motivo y casilla de confirmación; el archivo va a la papelera (restaurable),
  la unidad recibe un aviso con el motivo. `apiAdminDeleteFile`.
- **Reemplazar archivo** (*Reemplazar*): sube una versión ajustada de UN archivo del tema. El nombre debe coincidir con el del archivo
  (ignora extensión, mayúsculas, tildes y separadores; acepta el nombre guardado o el nombre original cargado). Pide describir el ajuste,
  conserva fecha de cargue original, vuelve a «Por revisar», avisa a la unidad y deja la versión anterior en la papelera de Drive. `apiAdminReplaceFile`.
- **Cualquier formato**: ya no hay lista cerrada de extensiones (letras/números, máx. 10). Cada tema puede restringirlas o dejarlas libres.
- **Formatos de la carpeta**: editables desde el detalle de la casilla (*Editar formatos*) y en *Meses y temario*; incluye «otros formatos» y «cualquier formato».
- **Panel de detalle**: «Archivos cargados» se pliega/despliega (sección completa, cada archivo y *Desplegar todo*).
- **Ficha de la unidad**: corregido el desplazamiento (las tarjetas se aplastaban dentro del panel).
- **Bitácora**: nuevas acciones `archivo_eliminado_admin`, `archivo_reemplazado`, `notificacion_unidad`; `tema_editado` ahora indica el cambio de formatos y el perfil.

## Cambios: bandeja de notificaciones (v3.2)
**Importante:** toca `Code.gs` (esquema v6: la hoja `Avisos` gana `perfil`, `observacion`, `archivo`, `tema`, `mesNombre`). Pega el Code.gs, abre la app (o ejecuta `setup()`) y crea **Nueva versión**.
- Botón de campana en `dashboard.html` con contador de nuevas y menú por categorías de color: recordatorio (amarillo), rechazo (índigo), eliminación (rojo), ajuste/reemplazo (azul).
- Al hacer clic se abre el detalle completo: perfil que la realizó (resaltado), archivo/tema/mes/fecha, observación resaltada y mensaje completo.
- Al verla pasa de «nuevas» a «Notificaciones anteriores» (historial) y se retira el cartel superior. También hay «Marcar todas como leídas».
- Solo se guardan las últimas 10 por unidad (`AVISOS_KEEP`); al crear una nueva se borra la más antigua. Endpoints: `apiGetNotifications`, `apiMarkAllAvisosLeidos`.

## Cambios: paquete ZIP sincronizado con Drive (v3.4)
**Importante:** toca `Code.gs` (nuevos `apiAdminScanDriveExtras` y `apiAdminDownloadDriveFile`). Pega el Code.gs y crea **Nueva versión**; al volver a desplegar, Apps Script puede pedir autorizar de nuevo el acceso a Drive.
- Corregido: «Descargar paquete completo» fallaba con `buildMatrixCsv is not defined` (la función no existía desde V3). Ya se genera la matriz CSV.
- Antes de comprimir, el panel revisa en Drive la carpeta de cada unidad (`raíz / mes / «cédula - unidad» / tema`) e incluye lo agregado a mano: archivos y carpetas (también vacías), en cualquier subcarpeta, respetando la misma ruta.
- Lo que la plataforma ya tiene registrado no se duplica. Si el nombre choca, se renombra «(2)».
- Documentos de Google (Docs/Sheets/Slides) se exportan a PDF. Los archivos de más de 35 MB no se pueden bajar por la web: quedan listados en ERRORES.txt.
- RESUMEN.txt de cada unidad lista los archivos «agregados directamente en Drive». Si el escaneo falla, el paquete sale solo con lo registrado y ERRORES.txt lo explica.
- Si renombraste la carpeta de una unidad en Drive, se encuentra igual por la cédula (la parte «cédula - …» del nombre debe conservarse).

## v3.5 — diagnóstico de la sincronización con Drive
El ZIP incluye `SINCRONIZACION_DRIVE.txt`: por cada unidad indica si encontró su carpeta en Drive (y cómo se llama) y cuántos archivos/subcarpetas nuevos incluyó. El aviso final del panel resume «Drive: X de Y carpetas de unidad encontradas». La búsqueda del mes y de la unidad ahora usa el mismo saneado de nombres con que se crean las carpetas.


## Loading visual ZAN DRIVE (v1.5)

Se integró un overlay global de sincronización con avatar para operaciones ejecutadas mediante `withBusyBtn()`. El loader muestra tres etapas visuales (validando, sincronizando y finalizando), mensajes por tipo de acción, bloqueo visual, cierre automático al terminar y estado de error. El arte está en `assets/zan-sync-avatar.png`; los estilos en `css/styles.css`; la lógica reutilizable en `js/common.js`. Las cargas de contenido que usan `withLoading()` conservan su indicador local.
