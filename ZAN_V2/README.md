# ZAN Tabla de Valores — Estructura del Proyecto

## Archivos y carpetas

```
ZAN_V6/
│
├── loading.html        ← Pantalla de carga (PUNTO DE ENTRADA)
├── index.html          ← App principal (se abre automáticamente)
│
├── css/
│   └── styles.css      ← Todos los estilos (extraídos del HTML original)
│
├── js/
│   └── app.js          ← Toda la lógica JS + Firebase (extraído del HTML original)
│
└── Logo/
    ├── ZAN.png         ← Logo pequeño (sidebar y top-bar)
    └── ZAN--.png       ← Logo grande (pantalla de login y carga)
```

## Cómo subir al servidor

1. Sube **toda la carpeta** tal como está. Mantén la misma estructura.
2. La URL de entrada es `loading.html`. También puedes apuntar directo a `index.html`.
3. Los logos deben estar en la carpeta `Logo/` con exactamente esos nombres.

## Flujo de navegación

```
loading.html  →  (animación ~3s)  →  index.html  →  Login Firebase  →  App
```

## Notas importantes

- Las librerías (Firebase, Chart.js, XLSX, Font Awesome) se cargan desde CDN.
  Requiere conexión a internet la primera vez; luego el navegador las cachea.
- El archivo `app.js` contiene la configuración de Firebase con tus credenciales.
- Si cambias el nombre de carpetas o archivos, actualiza las rutas en `index.html`.
