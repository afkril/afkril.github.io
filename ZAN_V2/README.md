# ZAN | Tabla de Valores — v2.6

App web para gestión semanal de pedidos, valores de distribuidora, facturación y
novedades/descuentos de un servicio de alimentación, con sincronización en la nube
(Firebase), exportación a Excel y una interfaz 100% personalizable en modo oscuro.

---

## 1. Estructura del proyecto

```
ZAN_V2/
│
├── loading.html              ← Pantalla de carga (PUNTO DE ENTRADA)
├── index.html                ← App principal
│
├── css/                      ← Estilos modulares (se cargan en este orden)
│   ├── 01-toast-modal.css        Toasts y modales genéricos
│   ├── 02-variables-base.css     Variables CSS raíz + modo claro/oscuro
│   ├── 03-tutorial.css           Overlay del tutorial guiado
│   ├── 04-archivos.css           Gestor de archivos / carpetas
│   ├── 05-layout-principal.css   Sidebar, top-bar, grillas, badge "Nuevo"
│   ├── 06-paneles-resumen.css    Paneles de resumen y gráficos
│   ├── 07-modo-claro.css         Overrides específicos del modo claro
│   ├── 08-tabs.css               Pestañas de semanas
│   ├── 09-temas-ajustes.css      Modal de Ajustes + 18 temas de color
│   └── 10-descuentos.css         Módulo de Novedades / Descuentos
│
├── js/                        ← Lógica modular (se carga en este orden)
│   ├── 01-config.js               Configuración inicial / constantes
│   ├── 02-ui-feedback.js          Sistema de toasts y feedback visual
│   ├── 03-tutorial.js             Lógica del tutorial guiado
│   ├── 04-archivos.js             Gestor de archivos con carpetas
│   ├── 05-utilidades.js           Helpers (formateo, parseo numérico, etc.)
│   ├── 06-app-core.js             Núcleo: cálculo de semanas, proveedores, productos
│   ├── 07-local-storage.js        Persistencia local (localStorage)
│   ├── 08-firebase.js             Autenticación y sincronización con Firebase
│   ├── 09-ui-drawers.js           Drawers, modos de vista y temas de color
│   └── 10-descuentos.js           Módulo de Novedades / Descuentos
│
└── Logo/
    ├── ZAN.png                ← Logo pequeño (sidebar y top-bar)
    └── ZAN--.png              ← Logo grande (pantalla de login y carga)
```

> **Nota:** `css/styles.css` y `js/app.js` (monolíticos) quedan en el repo como respaldo
> histórico, pero **no se cargan** en `index.html` — la app usa exclusivamente los
> archivos modulares `01-…` a `10-…` listados arriba.

---

## 2. Funcionalidades principales

### Guardar y cargar
- **Guardar en la nube** (Firebase Realtime Database), con detección de conexión y
  cola de **"Sincronizar pendientes"** cuando se trabaja offline.
- **Cargar / Gestor de archivos** con sistema de carpetas, para organizar distintas
  tablas guardadas.
- Persistencia local automática (`localStorage`) como respaldo.

### Gestión semanal de pedidos
- Tablas por semana (número de semanas configurable) con productos, proveedores,
  cantidades y cálculo automático de totales.
- 4 **modos de visualización** intercambiables desde Ajustes:
  | Modo | Descripción |
  |---|---|
  | Pestañas | Una semana a la vez |
  | Tarjetas | Todas las semanas lado a lado |
  | Lista | Scroll vertical continuo |
  | Acordeón | Paneles expandibles/colapsables |

### Novedades / Descuentos 🆕
- Módulo para registrar novedades por semana (inasistencias, cupos no consumidos, etc.)
  que descuentan automáticamente del valor de Distribuidora.
- Cálculo en vivo: días × cupos × valor de ración → total a descontar, con nota
  descriptiva opcional (ej. "MC no dio Servicio por incapacidad de X Dias").
- Resumen consolidado (novedades registradas, semanas afectadas) en el drawer de
  Análisis de Descuentos.
- Indicador de novedades activas directamente en la pestaña de cada semana.
- Acceso desde el menú lateral (**Análisis → Novedades / Descuentos**) y también
  embebido al final de cada panel semanal.

### Análisis y reportes
- **Resumen y Gráficos**: visualización con Chart.js del comportamiento de compras.
- **Exportar Contabilidad**: consolidado listo para contabilidad.
- **Valores Distribuidora**: cálculo de presupuesto vs. compras por semana, con
  descuentos de novedades ya aplicados.
- **Validar Facturas**: comparación de facturas por proveedor contra lo registrado.

### Configuración de datos
- **Gestionar Proveedores** y **Listado de Productos** (alta, edición y borrado).
- **Exportar / Importar Excel** (CSV, XLS, XLSX) vía SheetJS.

### Ayuda y soporte
- Tutorial guiado paso a paso integrado en la app.
- Sistema de toasts para feedback de acciones (éxito, error, advertencia).

---

## 3. Diseño y personalización visual

### Modo claro / oscuro
Interruptor global (ícono de sol/luna). El sistema de temas de color solo aplica
en **modo oscuro**; en modo claro la app usa una paleta neutra fija.

### 18 temas de color (modo oscuro)
Seleccionables desde **Ajustes → Tema de color**, cada uno con fondo, tarjetas y
acentos propios, y con los paneles de gestión protegidos (mantienen su contraste
legible sin importar el tema activo):

| # | Tema | Paleta |
|---|---|---|
| 1 | ✦ Dorado (por defecto) | Negro & Oro clásico |
| 2 | 🌊 Océano | Azul marino & Cian |
| 3 | Quantum | Azul cobalto & Fulgor cian |
| 4 | 🌆 Crepúsculo | Púrpura & Rosa |
| 5 | 🟣 Amatista | Violeta profundo & Cristal |
| 6 | ⚡ Neón Cyberpunk | Magenta & Cyberpunk |
| 7 | ❄️ Ártico | Azul hielo & Platino |
| 8 | Sakura | Rosa cerezo & Ceniza |
| 9 | 🌋 Volcán | Rojo carmesí & Naranja |
| 10 | 🌿 Esmeralda | Verde bosque & Menta |
| 11 | ☢️ Tóxico | Verde ácido & Lima |
| 12 | 🟤 Ámbar | Cobre & Retro-radar |
| 13 | ✧ Platino 🆕 | Grafito & Blanco neón |
| 14 | ⚙️ Titanio 🆕 | Acero & Plata fría |
| 15 | ❄️ Ciber-Ártico 🆕 | Gris azulado & Blanco puro |
| 16 | ⚡ Nebulosa 🆕 | Negro profundo & Azul eléctrico |
| 17 | ☄️ Meteoro 🆕 | Gris grafito & Turquesa |
| 18 | 🧬 Cuarzo Blanco 🆕 | Violeta oscuro & Lila frío |

**Efecto "tubo de neón":** en los temas donde el acento es blanco o casi blanco
(Platino, Ciber-Ártico, Nebulosa, Cuarzo Blanco), los elementos activos
(tarjeta de tema seleccionada, tarjeta de vista activa, botón de ajustes al hover,
panel de semana al hover) reciben un `box-shadow` en capas — blanco puro + color
de contraste propio del tema + halo amplio — para que el blanco no se vea plano
sobre el fondo oscuro, sino como neón encendido.

### Sistema de etiquetas "Nuevo" 🆕
Clase CSS reutilizable (`.badge-nuevo`, con variantes `.badge-nuevo-tl` /
`.badge-nuevo-tr`) definida en `css/05-layout-principal.css`, con degradado
rojo/naranja y pulso animado sutil. Actualmente se usa en:
- Botón del menú lateral "Novedades / Descuentos" (esquina **superior izquierda**).
- Sección de Novedades/Descuentos dentro de cada panel semanal (esquina **superior izquierda**).
- Las 6 tarjetas de temas de color más recientes (esquina **superior derecha**).

Puede reutilizarse en cualquier otro botón o tarjeta agregando el `<span>`
correspondiente dentro de un contenedor con `position: relative`.

---

## 5. Notas técnicas

- Las librerías externas (Firebase, Chart.js, XLSX, Font Awesome) se cargan desde
  CDN — se requiere conexión a internet la primera vez; luego el navegador las cachea.
- `js/08-firebase.js` contiene la configuración de Firebase con las credenciales
  del proyecto.
- Las preferencias de vista y tema de color se guardan en `localStorage`
  (`zan_vista`, `zan_color_tema`) y se restauran automáticamente al recargar.
- El tamaño de fuente base y densidad de la interfaz están pensados para pantallas
  de escritorio; el sidebar colapsa a menú móvil en pantallas angostas.
