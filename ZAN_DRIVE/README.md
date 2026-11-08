# Gestor de Documentos – frontend estático

Backend: Google Apps Script (Code.gs con doPost). Frontend: esta carpeta.

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
