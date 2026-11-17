# SPECS — Portafolio Kyoto Dark

Especificación funcional del sitio. Define qué contiene cada sección, cómo se navega y cómo se comportan el carrusel Showroom y el sistema de Ventanas. Las reglas visuales (tokens, tipografía, prohibiciones) viven en `.cursor/rules/ui-craft.mdc` y no se repiten aquí.

---

## 0. Decisiones base

| Decisión | Valor |
| --- | --- |
| Stack | Vite + JavaScript sin framework (SPA) |
| Idiomas | `es` (por defecto) y `en`, con prefijo de ruta |
| Despliegue | Vercel, con rewrites hacia `index.html` y HTML pre-generado por ruta |
| Datos | Archivos `.js` planos en `src/data/`, tipados con JSDoc y validados en desarrollo y en build |
| Ventanas | Modelo híbrido: panel modal sobre la home **y** URL propia |
| Carga de ventanas | `import()` dinámico por ventana (lazy, incluyendo notas `.md`) |
| Canvas en móvil | Imagen dithered estática, sin interacción |

---

## 1. Mapa de rutas

| Ruta | Qué se ve |
| --- | --- |
| `/` | Redirige a `/es` o `/en` según `localStorage.lang` o, si no existe, `navigator.language` (validados estrictamente contra `['es', 'en']`, con fallback a `'es'`). |
| `/:lang` | Home completa (secciones 01–04 + footer). |
| `/:lang#showroom`, `#windows`, `#manifesto` | Home con scroll a la sección indicada. |
| `/:lang/projects/:slug` | Home de fondo + **visor de proyecto** abierto (ver §3.3). |
| `/:lang/windows` | Home con scroll a la sección 03. |
| `/:lang/windows/:slug` | Home de fondo + **ventana** abierta (ver §4). |
| Cualquier otra | Panel `404` dentro del mismo sistema de paneles, con enlace a la home. |

Reglas del router:

- Un solo router basado en History API (`pushState` / `popstate`). Nada de rutas con `#!`.
- La home **siempre** está renderizada debajo. Las rutas `projects/:slug` y `windows/:slug` solo añaden una capa de panel encima.
- Al entrar por URL directa a `/es/windows/foo`, primero se pinta la home y luego se abre la ventana. Al cerrarla, el usuario queda en `/es` con scroll en la sección 03 (no en el top).
- Un `slug` inexistente abre el panel `404`, no rompe la home.
- Cambiar de idioma conserva la ruta actual: `/es/windows/foo` → `/en/windows/foo`.

---

## 2. Elementos globales

### 2.1 Barra de navegación (fija, top)

- Izquierda: marca (kanji + alias) que enlaza a `/:lang`.
- Centro: enlaces de ancla `OVERVIEW`, `SHOWROOM`, `WINDOWS`, `MANIFESTO` en mono, mayúsculas, 11–12px, `letter-spacing: 0.12em`. El enlace de la sección visible lleva un indicador activo de 1px en `--accent-torii`.
- Derecha: chip de versión (`■ v1.0.0`), selector `ES / EN` y CTA primario (contacto).
- Borde inferior `1px solid var(--border-grid)`.
- Móvil (< 768px): los enlaces centrales se colapsan en un botón `+` que abre un panel a pantalla completa con la misma lista. Ese panel usa el mismo gestor de foco que las ventanas.

### 2.2 Regla vertical de scroll (solo desktop ≥ 1024px)

- Fija en el margen derecho. Marcas graduadas de 1px, una marca larga por cada sección.
- La marca de la sección activa se alarga y se ilumina a `--text-primary`.
- Al hacer hover, se despliega un índice con número y nombre de cada sección (`00 COVER`, `01 SHOWROOM`…). Al hacer clic, scroll suave a esa sección.
- Se oculta mientras hay un panel abierto.

### 2.3 Encabezados de sección

Cada sección arranca con una fila mono: `01 // OVERVIEW`, una línea de 1px que llena el ancho, y un kanji a la derecha. Las esquinas de los contenedores clave llevan marcas `⌜ ⌝ ⌞ ⌟`.

---

## 3. Secciones

### 3.1 `01 // OVERVIEW` — Hero

**Layout desktop:** dos columnas. Izquierda (≈ 45%) con contenido; derecha con el canvas dithered, que sangra hasta el borde y se funde con `--bg-base` sin borde duro.

**Contenido (columna izquierda, en orden):**

1. Línea de estado mono: `力 · ALIAS · DISPONIBLE PARA PROYECTOS`. Un punto `--accent-torii` indica disponibilidad.
2. Titular serif grande con el nombre/alias.
3. Subtítulo bilingüe: japonés + traducción en *italic*.
4. **Tabla de specs** clave-valor. Cada fila tiene la etiqueta mono en mayúsculas a la izquierda y el valor a la derecha, separada por `1px solid var(--border-grid)`. Ejemplo de filas: `ROL`, `STACK`, `UBICACIÓN`, `ENFOQUE`. Viene de `src/data/profile.js`.
5. **Rejilla de métricas** de 4 celdas con bordes de 1px: número grande + etiqueta mono (p. ej. `PROYECTOS`, `VENTANAS`, `AÑOS`, `COMMITS`). `PROYECTOS` y `VENTANAS` se calculan a partir de los registros, no se escriben a mano.
6. Dos CTA: primario `VER SHOWROOM` (salvia sólido) y secundario `ABRIR VENTANAS` (contorno).
7. Fila de enlaces sociales mono pequeña.

**Canvas dithered:**

- Fuente: imagen en escala de grises optimizada a resolución lógica de muestreo (`public/art/torii.webp`, ~400–480px de ancho, < 15 KB). Se convierte a puntos con dithering Bayer 4×4 en el navegador una sola vez y se cachea, muestreando siempre en píxeles CSS lógicos con un techo duro de partículas (`maxDots: 14_000`) para garantizar fluidez en monitores QHD/4K.
- Desktop con puntero fino (`(hover: hover) and (pointer: fine)`):
  - Los puntos dentro de un radio de influencia (~120px) se desplazan levemente en dirección opuesta al cursor, como viento, y vuelven a su posición con amortiguación.
  - Su color interpola de `--text-secondary` a `--text-primary`. Solo los puntos más cercanos al centro del cursor toman `--accent-torii`.
  - Sin cursor encima: deriva ambiental muy lenta con cadencia reducida (~15–20 FPS en reposo, despertando a frame rate nativo al detectar `pointermove`).
  - Se pausa cuando sale del viewport (`IntersectionObserver`), cuando la pestaña está oculta (`visibilitychange`) y mientras haya cualquier panel o menú móvil a pantalla completa abierto.
- Móvil, puntero táctil o `prefers-reduced-motion: reduce`: se dibuja **un solo frame estático** y no se registra ningún listener ni `requestAnimationFrame`.
- El canvas lleva `aria-hidden="true"`. La ilustración es decorativa.

**Móvil:** una columna. El canvas estático va arriba, a ~60vh y con máscara degradada inferior, y debajo el contenido.

### 3.2 `02 // SHOWROOM` — Carrusel de proyectos

**Estructura:**

- Titular serif + párrafo corto (≤ 60ch, alineado a la izquierda).
- **Visor principal:** la captura del proyecto activo en proporción 16:10, con marcas de registro en las esquinas.
- Debajo del visor, a la izquierda: `01 // NOMBRE` en mono y una línea descriptiva. A la derecha: contador `1 / N` y botones `<` `>`.
- **Tira de miniaturas** horizontal con todas las capturas. La activa lleva borde `--border-strong` y un indicador superior de 1px en `--accent-torii`.

**Origen de datos:** `src/data/projects.js`. Las capturas son archivos locales en `public/shots/` (hardcodeadas, no se generan en vivo). Añadir un proyecto = añadir un objeto al array y su imagen.

**Interacción — selección (cambiar el proyecto activo):**

| Acción | Resultado |
| --- | --- |
| Clic en una miniatura | Ese proyecto pasa a ser el activo en el visor. **No** abre nada. |
| Botones `<` / `>` | Proyecto anterior / siguiente. Al llegar al final vuelve al inicio. |
| Flechas `←` / `→` con foco dentro del carrusel | Igual que los botones. |
| Swipe horizontal en el visor (móvil) | Igual que los botones. Umbral de 40px. |

El cambio de imagen es un fundido corto (0.18s). No hay autoplay.

**Interacción — apertura (ir al proyecto):**

| Acción | Resultado |
| --- | --- |
| Clic o `Enter` sobre el **visor principal** | Abre el **visor de proyecto** (§3.3) y navega a `/:lang/projects/:slug`. |
| Clic en el enlace `↗` junto al nombre | Abre directamente el proyecto externo (`project.url`, sanitizado) en pestaña nueva con `rel="noopener noreferrer"`, sin pasar por el visor. |

Así, la miniatura selecciona y el visor grande abre. Un solo clic nunca saca al usuario del sitio salvo que pulse explícitamente `↗`.

Al hacer hover sobre el visor, su borde se ilumina a `--border-strong` y aparece una etiqueta `VER DETALLE +` en la esquina inferior derecha.

### 3.3 Visor de proyecto (panel)

Usa el mismo contenedor de panel que las ventanas (§4.2), en variante `project`.

**Contenido:**

- Cabecera: `PROYECTO 03 / 07`, título serif y botón `✕ CERRAR` (mono).
- Captura grande, más galería opcional (`project.gallery`).
- Tabla de specs del proyecto: `AÑO`, `ROL`, `STACK`, `ESTADO`.
- Descripción larga (≤ 60ch).
- CTA primario `VISITAR PROYECTO ↗` (`project.url`, pestaña nueva con `rel="noopener noreferrer"`) y secundario `CÓDIGO ↗` si existe `project.repo`.
- Pie: `< ANTERIOR` / `SIGUIENTE >`, que cambian de proyecto sin cerrar el panel.

**Navegación:** idéntica a la de las ventanas (§4.4). Cambiar de proyecto dentro del panel usa `replaceState`, para que Atrás cierre el panel en lugar de recorrer proyecto por proyecto. Al cerrarlo, el carrusel queda con ese proyecto como activo.

### 3.4 `03 // WINDOWS` — Hub de ventanas

**Estructura:**

- Titular serif + párrafo corto.
- **Filtros** mono en fila: `TODO` (`all`), `APPS` (`app`), `UTILIDADES` (`utility`), `ARCHIVO` (`creative`), `NOTAS` (`note`), `ENLACES` (`external`), con el número total de entradas de cada uno. El filtro activo usa la clave canónica del `type` en la query: `/:lang?w=app#windows` (sin `w` equivale a `all`).
- **Rejilla de tarjetas** con líneas de 1px compartidas (estilo tabla, sin huecos entre tarjetas). 3 columnas en desktop, 2 en tablet y 1 en móvil. Si el filtro activo supera 24 entradas, se renderizan bloques de 24 con un botón `MOSTRAR MÁS +` al pie de la rejilla para acotar el tamaño inicial del DOM.

**Tarjeta de ventana:**

- Fila superior: índice `03.04`, tipo en mono y kanji del tipo a la derecha.
- Título (sans/mono) + descripción de una línea.
- Fila inferior: etiquetas y un indicador direccional: `+` para ventanas internas y `↗` para enlaces externos.
- Estado opcional: un punto `--accent-torii` para `new` y la etiqueta `WIP` para `wip`.
- Hover: fondo `--bg-surface-hover`, borde `--border-strong` y el indicador se desplaza 2px.

**Clic en una tarjeta:** depende del `type` de la ventana (ver §4.1).

**Orden:** primero las fijadas (`pinned: true`), luego por `date` descendente.

### 3.5 `04 // MANIFESTO`

- Dos columnas en desktop. Izquierda: titular serif, párrafos de texto (≤ 60ch), una cita en *italic* serif, más párrafos y la firma. Derecha: un segundo canvas dithered (`public/art/pine.webp`) dentro de un marco con marcas de registro, sticky mientras se lee el texto.
- Ese segundo canvas sigue las mismas reglas que el del hero (interactivo solo en desktop), comparte el mismo módulo y difiere la descarga/decodificación de su imagen fuente hasta acercarse al viewport (`IntersectionObserver` con `rootMargin: '400px'`).
- Contenido en `src/content/manifesto.{es,en}.md` compilado a HTML estático en build (con HTML crudo deshabilitado).
- Móvil: una columna, el canvas estático va entre la cita y el resto del texto.

### 3.6 Footer

- Fila superior en rejilla: a la izquierda la marca, el lema bilingüe y el chip de versión; a la derecha columnas de enlaces (`EXPLORAR`, `PROYECTOS`, `CONTACTO`).
- **Watermark:** el alias a ancho completo, en serif gigante solo con contorno (`color: transparent; -webkit-text-stroke: 1px rgba(188, 214, 196, 0.18)`). El tamaño se ajusta con `clamp()` para que llene el ancho sin desbordar. Es decorativo (`aria-hidden`).
- Fila inferior mono: `© 2026 ALIAS · 力`, nota sobre el arte dithered y `HECHO DESDE UNA SOLA FUENTE DE VERDAD`.

---

## 4. Sistema de Ventanas

### 4.1 Tipos y qué ocurre al abrirlas

| `type` | Qué es | Al hacer clic en la tarjeta | Ruta |
| --- | --- | --- | --- |
| `app` | Mini-app interactiva | Abre el panel y monta el módulo con `import()` | `/:lang/windows/:slug` |
| `utility` | Herramienta (conversor, generador…) | Igual que `app` | `/:lang/windows/:slug` |
| `creative` | Imagen, audio, video o serie | Abre el panel con el visor de medios adecuado | `/:lang/windows/:slug` |
| `note` | Documento Markdown (`.md`) | Abre el panel y carga el chunk HTML precompilado (prosa ≤ 60ch) | `/:lang/windows/:slug` |
| `external` | Enlace a un sitio o repo | **No** abre panel: `window.open(sanitizeUrl(url), '_blank', 'noopener,noreferrer')` | — |

### 4.2 Contenedor de panel

Las ventanas son **paneles dentro de la misma página, con URL propia**. No son páginas separadas ni ventanas flotantes arrastrables.

- Desktop: panel que ocupa ~92vw × 88vh, centrado, sobre un velo de `--bg-base` al 85% de opacidad. Sin blur ni sombras difusas.
- Móvil: pantalla completa. Se abre deslizándose desde abajo (desactivado con `reduced-motion`).
- **Barra de título** (estilo *shoji*): índice y tipo a la izquierda (`03.04 // UTILITY`), título al centro y, a la derecha, `↗` (abrir en pestaña propia, solo si la ventana lo permite) y `✕`.
- Cuerpo con scroll propio. La home queda con `inert`, su scroll bloqueado y los `<canvas>` de fondo en pausa.
- Pie con `< ANTERIOR` / `SIGUIENTE >` y la posición `4 / 15` calculada sobre las ventanas **abribles en panel** del filtro activo (excluyendo las entradas `type: 'external'`, que no tienen panel).
- Solo hay **un panel abierto a la vez**. Abrir otro reemplaza el contenido.

### 4.3 Ciclo de vida de una ventana

1. Clic en la tarjeta → `history.pushState` a `/:lang/windows/:slug`.
2. El router detecta la ruta y abre el panel con un estado de carga (líneas de escaneo mono, sin spinner redondo). Si había una carga o ventana previa activa, se ejecuta primero su `unmount()` y se aborta su `AbortController`.
3. Se instancia un nuevo `AbortController` **antes** de invocar el `loader()` de la ventana (`import()` dinámico). Si durante la descarga el usuario navega a otra ventana o cierra el panel, `signal.aborted` pasa a `true` y el resultado tardío se descarta sin tocar el DOM. Si la red falla, el panel muestra `ERROR // NO SE PUDO CARGAR` con botón `REINTENTAR`.
4. El módulo exporta `mount(el, ctx)` y devuelve una función `unmount()`. `ctx` incluye `lang`, `slug`, `signal` (`AbortSignal`) y `close()`. Si la entrada declara `sandboxSrc`, el cuerpo monta un `<iframe sandbox="allow-scripts">` aislado en lugar de ejecutar código en el documento principal.
5. Al cerrar o cambiar de ventana se llama a `unmount()` y se aborta `signal`, para liberar listeners, timers y animaciones.
6. El módulo cargado queda en la caché del navegador; reabrirlo no vuelve a descargarlo.

Las ventanas `note` y `creative` no necesitan carpeta en `src/windows/`: usan visores compartidos (`NoteViewer` con carga diferida por idioma vía `import.meta.glob`, y `MediaViewer`) alimentados por el registro.

### 4.4 Navegación e historial

| Acción | Resultado |
| --- | --- |
| Abrir una ventana desde la home | `pushState` — **una** entrada nueva en el historial. |
| `< ANTERIOR` / `SIGUIENTE >`, o `←` / `→` con foco en el panel | `replaceState` — cambia de ventana sin añadir entradas. |
| `Esc`, `✕` o clic en el velo | Si la ventana se abrió desde la home: `history.back()`. Si se entró por URL directa: `replaceState` a `/:lang`. |
| Botón Atrás del navegador | Cierra el panel y vuelve a la home en el mismo punto de scroll. |
| Botón Adelante tras cerrar | Reabre la misma ventana. |
| Recargar con un panel abierto | Se pinta la home y se reabre la misma ventana. |

Al cerrar, el foco vuelve a la tarjeta que abrió el panel (o al título de la sección 03 si se entró por URL directa). Se restaura el `scrollY` que había antes de abrir.

### 4.5 Accesibilidad del panel

- `role="dialog"`, `aria-modal="true"` y `aria-labelledby` apuntando al título.
- Foco atrapado dentro del panel mientras está abierto; el foco inicial va al título.
- `Esc` siempre cierra, salvo que la ventana lo intercepte explícitamente (p. ej. un editor), y en ese caso debe ofrecer `✕`.
- Todo control tiene `:hover`, `:active` y `:focus-visible` (anillo de 1px `--accent-torii`, `outline-offset: 2px`).

---

## 5. Contratos de datos

Definidos con JSDoc en `src/data/` y validados por `src/data/validate.js` tanto en desarrollo (consola del navegador) como en el paso de pre-renderizado del build (`scripts/prerender.js`, abortando el despliegue con código de error si falla). Valida unicidad y formato estricto de `slug` (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), campos obligatorios por `type`, traducciones `es`/`en` y esquemas permitidos en toda URL (`https:`, `http:`, `mailto:` o rutas locales `/...` que no comiencen con `//`).

### 5.1 `projects.js`

```js
/**
 * @typedef {Object} Project
 * @property {string} slug            único, kebab-case (/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
 * @property {{es: string, en: string}} title
 * @property {{es: string, en: string}} summary      una línea para el carrusel
 * @property {{es: string, en: string}} description  texto del visor
 * @property {string} cover           ruta local en /shots/...
 * @property {string[]} [gallery]
 * @property {string} url             destino externo (http/https)
 * @property {string} [repo]          repositorio externo (http/https)
 * @property {number} year
 * @property {string} role
 * @property {string[]} stack
 * @property {'live'|'archived'|'wip'} status
 */
```

### 5.2 `windows.meta.js` y `windows.js`

Los metadatos declarativos viven en `windows.meta.js` (importable desde Node en `prerender.js`), y `windows.js` les asocia los cargadores dinámicos del cliente:

```js
/**
 * @typedef {Object} WindowEntry
 * @property {string} slug            único, kebab-case (/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
 * @property {'app'|'utility'|'creative'|'note'|'external'} type
 * @property {{es: string, en: string}} title
 * @property {{es: string, en: string}} summary
 * @property {string[]} tags
 * @property {string} date            ISO 8601 (YYYY-MM-DD)
 * @property {boolean} [pinned]
 * @property {'new'|'wip'} [status]
 * @property {string} [cover]         ruta local para og:image (fallback a /og-default.png)
 * @property {() => Promise<{mount: Function}>} [loader]  obligatorio en cliente para app/utility (salvo sandboxSrc)
 * @property {string} [sandboxSrc]    opcional en app/utility: ruta HTML aislada en <iframe sandbox="allow-scripts">
 * @property {{es: string, en: string}} [noteId]          nombre base en src/content/notes/, obligatorio en note
 * @property {{kind: 'image'|'audio'|'video', src: string}[]} [media]  obligatorio en creative
 * @property {string} [url]           obligatorio en external (http/https)
 * @property {boolean} [standalone]   muestra el botón ↗ en la barra del panel
 */
```

---

## 6. Rendimiento, seguridad y criterios de aceptación

- JS inicial (sin ventanas ni notas) ≤ 60 KB gzip. Cada ventana `app`/`utility` y cada nota `.md` se descarga en su propio chunk solo al abrirla.
- Canvas en desktop: ≥ 55 FPS sostenidos en hardware medio, muestreando en píxeles CSS lógicos con techo `maxDots: 14_000`, `devicePixelRatio` limitado a 2 y pausa automática fuera de viewport o con panel abierto.
- Canvas en móvil: cero frames de animación después del primer pintado.
- LCP ≤ 2.0s en 4G. Solo las dos fuentes `.woff2` principales llevan `preload`; `torii.webp` (< 15 KB) se carga sin bloquear el renderizado de texto y `pine.webp` se difiere hasta acercarse a la sección 04.
- Seguridad: ninguna URL se inserta ni se abre sin validar su protocolo (`sanitizeUrl`), ningún contenido de usuario o query string se pasa por `innerHTML`, y la producción sirve `Content-Security-Policy` estricta sin `'unsafe-inline'` ni `'unsafe-eval'` en `script-src`.
- Cada ruta de §1 funciona al entrar por URL directa, al recargar y con Atrás/Adelante.
- Todo el sitio se puede usar con teclado.
