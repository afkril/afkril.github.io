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
