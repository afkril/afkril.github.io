# Lista Mercado | Minutas — Estructura del Proyecto

## Estructura de archivos

```
lista-mercado/
│
├── index.html                    ← Punto de entrada principal
│
├── css/
│   ├── main.css                  ← Estilos globales, variables CSS, layout, sidebar, header
│   ├── components.css            ← Estilos de secciones: Directorio, Proveedores, Actas, Modal
│   ├── actas-directorio.css      ← Estilos específicos del módulo de Actas y Directorio UDS
│   ├── modal-guardar.css         ← Estilos del modal de guardar lista
│   ├── print-styles.css          ← Estilos para impresión/PDF
│   └── confirm-dialog.css        ← Estilos del diálogo de confirmación
│
├── js/
│   ├── firebase-config.js        ← Configuración Firebase (API keys, inicialización, auth listener)
│   ├── database.js               ← Base de datos de productos (Neiva/Gaitana, IAPI/FAMI)
│   ├── festivos.js               ← Festivos Colombia 2026
│   ├── globals.js                ← Variables globales + función de inicialización (init)
│   ├── firebase-functions.js     ← Funciones Firebase: guardar/restaurar gramajes en la nube
│   ├── editor-gramajes.js        ← Editor de gramajes por semana y menú
│   ├── navegacion.js             ← Navegación entre secciones, sidebar, temas, modalidades
│   ├── calculadora-semanal.js    ← Generador de lista semanal, cálculo de entregas
│   ├── listado-mensual.js        ← Listado mensual: semanas, filtros, exportación Excel
│   ├── calendario.js             ← Calendario de festivos y semanas
│   ├── auxiliares.js             ← Funciones auxiliares, modal guardar lista, exportación
│   ├── limpiar-entregas.js       ← Limpiar/resetear entregas semanales y mensuales
│   ├── admin.js                  ← Panel administrador, auditoría, registro de IPs
│   ├── panel-detalles.js         ← Panel lateral "Ver detalles" de un producto
│   ├── actas-init.js             ← Inicialización del módulo de actas (keyboard shortcuts)
│   ├── actas.js                  ← Módulo completo: generador Excel XML, Directorio UDS,
│   │                               Proveedores, guardado local/Firebase, importación
│   ├── auth.js                   ← Autenticación de usuarios (login/register/logout Firebase)
│   └── confirm-dialog.js         ← Diálogo de confirmación reutilizable
│
└── modules/                      ← Fragmentos HTML de cada sección (referencia/mantenimiento)
    ├── sidebar-admin.html         ← Sidebar navegación + panel admin
    ├── section-calculadora.html   ← Sección calculadora semanal
    ├── section-mensual.html       ← Sección listado mensual
    ├── section-calendario.html    ← Sección calendario festivos
    ├── section-editor-gramajes.html ← Sección editor de gramajes
    ├── section-actas-directorio.html ← Sección actas F3.MT1.PP + directorio UDS
    ├── section-guardadas.html     ← Sección listas guardadas
    ├── modal-guardar.html         ← Modal de guardar lista
    ├── panel-detalles.html        ← Panel flotante ver detalles
    └── actas-template.html        ← Template imprimible del acta
```

## Funcionalidades principales

| Módulo | Archivo JS | Descripción |
|--------|-----------|-------------|
| 🛒 Calculadora Semanal | `calculadora-semanal.js` | Genera lista de mercado por semana con cantidades por día |
| 📅 Listado Mensual | `listado-mensual.js` | Vista mensual con tabla por semanas, filtros y exportación |
| 📆 Calendario | `calendario.js` | Calendario con festivos Colombia 2026 |
| ⚖️ Editor Gramajes | `editor-gramajes.js` | Edita gramajes por menú y semana, sincroniza con Firebase |
| 📋 Actas F3.MT1.PP | `actas.js` | Genera actas de entrega en Excel XML |
| 📁 Directorio UDS | `actas.js` | Gestiona directorio de unidades de servicio |
| 🏪 Proveedores | `actas.js` | Gestión de proveedores registrados |
| 🔐 Autenticación | `auth.js` | Login/registro con Firebase Auth |
| 🔥 Sincronización | `firebase-functions.js` | Sincronización de gramajes en tiempo real |
| 🛡️ Panel Admin | `admin.js` | Auditoría de usuarios, IPs, registros de acceso |

## Firebase

La configuración de Firebase está en `js/firebase-config.js`.  
Para cambiar el proyecto Firebase, edita el objeto `firebaseConfig` en ese archivo.

**Proyecto actual:** `lista-mercado-61830`

## Despliegue

Sube todos los archivos a tu servidor web manteniendo la estructura de carpetas.  
Compatible con: Firebase Hosting, Netlify, Vercel, GitHub Pages, servidor Apache/Nginx.

> ⚠️ **Nota:** No abras `index.html` directamente desde el sistema de archivos (protocolo `file://`).  
> Usa un servidor web local (ej: `npx serve .` o Live Server en VS Code) para pruebas locales.
