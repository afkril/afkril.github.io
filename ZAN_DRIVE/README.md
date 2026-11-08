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
