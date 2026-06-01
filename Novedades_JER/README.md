# Novedades JER - Estructura del Sitio Web

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Estructura HTML principal |
| `styles.css` | Todos los estilos (modo claro/oscuro, componentes) |
| `firebase-config.js` | Inicialización de Firebase |
| `app.js` | Toda la lógica JavaScript |
| `README.md` | Este archivo |

## Contraseña de Admin (ZAN) — Cómo protegerla

La contraseña **ya NO está visible** en el código fuente. Se carga desde un endpoint del servidor.

### Opción 1 – Backend Express/Node.js (recomendado)
```js
// server.js
app.get('/api/admin-token', (req, res) => {
    res.json({ token: process.env.ADMIN_PASSWORD });
});
// Variables de entorno: ADMIN_PASSWORD=ZAN
```

### Opción 2 – Netlify / Vercel (Functions)
Crear `netlify/functions/admin-token.js`:
```js
exports.handler = async () => ({
    statusCode: 200,
    body: JSON.stringify({ token: process.env.ADMIN_PASSWORD })
});
```
Y en el panel de Netlify/Vercel agregar la variable de entorno `ADMIN_PASSWORD`.

### Opción 3 – Solo frontend (sin backend)
Si no tienes backend, puedes volver a definir `ADMIN_PASSWORD` directamente
en `firebase-config.js` (solo en entorno local o privado):
```js
// Al final de firebase-config.js
window.ADMIN_PASSWORD_OVERRIDE = "TU_CONTRASEÑA";
```
Y en `app.js` reemplazar `ADMIN_PASSWORD` por `window.ADMIN_PASSWORD_OVERRIDE`.

## Despliegue

1. Subir los 4 archivos a tu hosting (Netlify, Vercel, cPanel, Firebase Hosting, etc.)
2. Configurar la variable de entorno `ADMIN_PASSWORD` en el servidor
3. Asegurarse de que `styles.css`, `firebase-config.js` y `app.js` estén en la **misma carpeta** que `index.html`
