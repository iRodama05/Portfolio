# ARCHITECTURE — Portafolio Kyoto Dark

Estructura del proyecto, responsabilidad de cada módulo y cómo fluyen los datos. El comportamiento funcional está en [`SPECS.md`](./SPECS.md).

---

## 1. Árbol de carpetas

```text
portfolio-kyoto/
├── docs/
│   ├── SPECS.md
│   └── ARCHITECTURE.md
├── public/
│   ├── art/                      # Imágenes fuente en escala de grises optimizadas (~400px WebP)
│   │   ├── torii.webp
│   │   └── pine.webp
│   ├── shots/                    # Capturas hardcodeadas del Showroom
│   ├── media/                    # Archivos de ventanas tipo creative
│   ├── fonts/                    # Instrument Serif, JetBrains Mono (woff2, self-hosted)
│   ├── og-default.png            # Fallback OpenGraph para la home y ventanas sin cover
│   └── favicon.svg
├── scripts/
│   ├── md-plugin.js              # Plugin Vite: compila .md a módulos ES con HTML estático sanitizado
│   └── prerender.js              # Post-build: valida registros y genera HTML + sitemap por ruta
├── src/
│   ├── main.js                   # Punto de entrada: estilos, i18n, router, montaje de la home
│   ├── styles/
│   │   ├── tokens.css            # Variables :root (color, tipografía, espaciado, motion)
│   │   ├── reset.css
│   │   ├── base.css              # html/body, tipografía base, foco, selección
│   │   ├── layout.css            # Rejilla de 1px, contenedores, marcas de registro
│   │   └── utilities.css
│   ├── data/
│   │   ├── profile.js            # Tabla de specs del hero, métricas, redes
│   │   ├── projects.js           # Registro del Showroom (serializable, apto para Node)
│   │   ├── windows.meta.js       # Metadatos declarativos de Ventanas + mapa canónico de tipos/filtros
│   │   ├── windows.js            # Enlaza windows.meta.js con loaders dinámicos (cliente)
│   │   ├── navigation.js         # Secciones, anclas, enlaces del footer
│   │   └── validate.js           # Validación de contratos, slugs y URLs (en dev y en build)
│   ├── scripts/
│   │   ├── dither-canvas.js      # Motor de dithering Bayer + buffer Uint32Array + física espacial
│   │   ├── router.js             # History API, matching de rutas, eventos de navegación
│   │   ├── panel-manager.js      # Abrir/cerrar paneles, control de carreras, foco, inert, scroll lock
│   │   ├── sanitize.js           # escapeHtml(), escapeAttr(), sanitizeUrl() con allowlist de protocolos
│   │   ├── i18n.js               # Idioma activo validado contra whitelist, t(), cambio de idioma
│   │   ├── scroll-spy.js         # Sección activa para la nav y la regla vertical
│   │   └── motion.js             # prefers-reduced-motion, detección de puntero
│   ├── components/
│   │   ├── nav/
│   │   │   ├── nav.js
│   │   │   └── nav.css
│   │   ├── scroll-ruler/
│   │   │   ├── scroll-ruler.js
│   │   │   └── scroll-ruler.css
│   │   ├── section-header/
│   │   │   ├── section-header.js
│   │   │   └── section-header.css
│   │   ├── hero/
│   │   │   ├── hero.js
│   │   │   └── hero.css
│   │   ├── spec-table/
│   │   │   ├── spec-table.js     # Reutilizada en el hero y en el visor de proyecto
│   │   │   └── spec-table.css
│   │   ├── showroom/
│   │   │   ├── showroom.js       # Visor, miniaturas, controles, swipe
│   │   │   └── showroom.css
│   │   ├── windows-hub/
│   │   │   ├── windows-hub.js    # Filtros + rejilla
│   │   │   ├── window-card.js
│   │   │   └── windows-hub.css
│   │   ├── panel/
│   │   │   ├── panel.js          # Contenedor: barra de título, cuerpo, pie
│   │   │   └── panel.css
│   │   ├── viewers/
│   │   │   ├── project-viewer.js # Contenido del panel en variante project
│   │   │   ├── note-viewer.js    # Ventanas tipo note (.md precompilado, cargado con import.meta.glob)
│   │   │   ├── media-viewer.js   # Ventanas tipo creative
│   │   │   ├── not-found.js
│   │   │   └── viewers.css
│   │   ├── manifesto/
│   │   │   ├── manifesto.js
│   │   │   └── manifesto.css
│   │   ├── footer/
│   │   │   ├── footer.js
│   │   │   └── footer.css
│   │   └── ui/
│   │       ├── button.css        # Primario, secundario, ghost
│   │       ├── chip.css
│   │       └── icons.js          # SVG estáticos auditados de 1.5px de trazo
│   ├── windows/                  # Una carpeta por ventana app/utility (cada una es un chunk aislado)
│   │   ├── color-converter/
│   │   │   ├── index.js          # export function mount(el, ctx) { ...; return unmount }
│   │   │   └── style.module.css  # CSS Modules para evitar colisiones acumulativas en <head>
│   │   └── _template/            # Plantilla para copiar al crear una ventana nueva
│   │       ├── index.js
│   │       └── style.module.css
│   ├── content/
│   │   ├── manifesto.es.md
│   │   ├── manifesto.en.md
│   │   └── notes/                # Ventanas tipo note (chunks lazy vía import.meta.glob)
│   │       ├── example.es.md
│   │       └── example.en.md
│   └── locales/
│       ├── es.js                 # Textos de interfaz
│       └── en.js
├── index.html
├── vite.config.js
├── vercel.json
├── jsconfig.json                 # checkJs para que JSDoc valide en el editor
└── package.json
```

Hay dos carpetas `scripts/`, con propósitos distintos:

- `/scripts` (raíz): scripts de Node para el build. Nunca llegan al navegador.
- `/src/scripts`: módulos de runtime sin interfaz propia (motor, router, gestores). Los **componentes** de `src/components` los consumen.

---

## 2. Capas y dependencias

```text
data/  ──►  components/  ──►  main.js
  ▲              │
  │              ▼
locales/     scripts/  (router, panel-manager, dither-canvas, i18n…)
                 │
                 ▼
             windows/*   (cargadas bajo demanda por panel-manager)
```

Reglas de dependencia:

1. `data/projects.js`, `data/windows.meta.js`, `data/profile.js` y `data/validate.js` son módulos JS puros sin imports del DOM ni de Vite, para que tanto el navegador como `scripts/prerender.js` en Node los consuman directamente. `data/windows.js` es la capa de cliente que combina `windows.meta.js` con los `loader` (`() => import('../windows/<slug>/index.js')`) y el mapa lazy `import.meta.glob('../content/notes/*.md')`, garantizando que Vite separe cada ventana y cada nota en su propio chunk.
2. `scripts/` no conoce el DOM de ningún componente concreto: expone funciones puras, gestores y eventos.
3. `components/` importa de `data/`, `scripts/` y `locales/`, pero nunca de otro componente salvo de `ui/` y `spec-table/`.
4. `windows/*` solo reciben `ctx` en `mount()`. No importan componentes del sitio, encapsulan sus estilos con CSS Modules (`style.module.css`) para no contaminar el CSS global al abrir múltiples ventanas en una misma sesión, y consumen los tokens globales CSS (`var(--*)`) ya presentes en `:root`.

---

## 3. Módulos clave

### 3.1 `styles/tokens.css`

Única fuente de verdad visual. Contiene los tokens de color de `ui-craft.mdc` más:

- Tipografía: `--font-editorial`, `--font-mono`, escala `--fs-*` con `clamp()`.
- Espaciado: `--space-1` … `--space-10` en múltiplos de 4px.
- Motion: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--dur-fast: 0.18s`.
- Rejilla: `--line: 1px solid var(--border-grid)`, `--line-strong: 1px solid var(--border-strong)`.
- `--radius: 0px` como recordatorio explícito.

Ningún CSS de componente usa colores literales; solo `var(--*)`.

### 3.2 `data/projects.js`, `data/windows.meta.js` y `data/windows.js`

Arrays y mapas exportados que siguen los contratos de `SPECS.md §5`. `windows.meta.js` exporta además el diccionario canónico `WINDOW_TYPES` (mapeando cada `type` a su etiqueta i18n, kanji y filtro query `?w=`), evitando duplicar condicionales al escalar categorías. Son la única fuente para el Showroom, el hub de Ventanas, las métricas del hero y las rutas que genera `prerender.js`.

Añadir contenido nunca requiere tocar componentes:

- **Proyecto nuevo:** imagen en `public/shots/` + un objeto en `projects.js`.
- **Ventana `app`/`utility` nueva:** copiar `src/windows/_template/` a `src/windows/<slug>/` + entrada en `windows.meta.js` + su `loader` en `windows.js` (o `sandboxSrc` si requiere iframe aislado).
- **Ventana `note` nueva:** archivos `<id>.es.md` y `<id>.en.md` en `src/content/notes/` + un objeto en `windows.meta.js` con `noteId`. `NoteViewer` resuelve el chunk bajo demanda mediante `import.meta.glob` sin inflar el bundle inicial.
- **Ventana `creative` o `external`:** solo un objeto en `windows.meta.js` (y los archivos en `public/media/` si aplica).

`validate.js` se ejecuta en `main.js` dentro de `if (import.meta.env.DEV)` (sin incluirse en el bundle de producción) **y** al inicio de `scripts/prerender.js` durante `npm run build`. Comprueba unicidad y regex estricto de slugs (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), campos obligatorios según `type`, textos `es`/`en` y protocolos seguros en todas las URLs.

### 3.3 `scripts/dither-canvas.js`

API:

```js
const instance = createDitherCanvas(canvasEl, {
  src: '/art/torii.webp',
  cellSize: 4,            // px CSS base por punto (se auto-escala si supera maxDots)
  maxDots: 14000,         // techo duro de partículas para QHD/4K
  influenceRadius: 120,
  lazy: false,            // true en Manifesto (IntersectionObserver rootMargin: '400px')
  interactive: 'auto',    // 'auto' | true | false
});
instance.destroy();
```

Pipeline y optimizaciones de rendimiento:

1. **Carga y muestreo lógico:** Si `lazy: true`, espera a acercarse al viewport antes de pedir la imagen. Dibuja la imagen en un `OffscreenCanvas` (o canvas oculto) a la resolución de la rejilla en **píxeles CSS lógicos** (escalando `cellSize` dinámicamente si el área produciría más de `maxDots`, mientras `Math.min(devicePixelRatio, 2)` se usa únicamente para nitidez del canvas de salida).
2. **Estructura de datos sin basura en GC:** Aplica la matriz Bayer 4×4 más máscara de alfa radial y escribe en un `Float32Array` tipado (posición base, desplazamiento actual, velocidad, luminancia y alfa). En `resize` (con debounce) reutiliza el buffer existente si la capacidad alcanza.
3. **Modo estático** (`interactive: false`, o `'auto'` con puntero táctil o `reduced-motion`): pinta un único frame y termina. Sin `requestAnimationFrame` ni listeners.
4. **Física espacial local $O(r^2)$:** `pointermove` solo registra `(cursorX, cursorY)`. En el frame, como la posición base es una cuadrícula regular $O(1)$, solo se evalúa repulsión en las celdas dentro del bounding box `[cursorX ± R, cursorY ± R]` usando distancia al cuadrado (`dx*dx + dy*dy < R²`, sin `Math.sqrt` fuera del radio) y se integran únicamente las partículas desplazadas (*awake*) hasta que su velocidad decaiga por debajo de $\varepsilon$.
5. **Renderizado por buffer (cero cambios de `fillStyle` por punto):** En lugar de invocar `beginPath()/arc()/fill()` miles de veces por frame, el motor escribe enteros ABGR pre-multiplicados directamente en un `Uint32Array` respaldado por `ImageData` y ejecuta un único `putImageData()` por frame (o agrupa `fillRect` en 8–12 cubetas discretas de color/alfa cuando `dpr > 1`).
6. **Gestión de ciclo de vida e idle:** Se pausa automáticamente con `IntersectionObserver`, `visibilitychange` y al escuchar `panel:open` (reanudando en `panel:close`), para no consumir CPU/GPU detrás de modales abiertos. Cuando no hay cursor activo y las velocidades están en reposo, la deriva ambiental reduce su cadencia a ~15–20 FPS y despierta a frame rate nativo al detectar `pointermove`.
7. Los colores se leen de los tokens CSS con `getComputedStyle` al iniciar y se pre-convierten a componentes RGB numéricos.

### 3.4 `scripts/router.js`

- Tabla de rutas declarativa: `{ pattern: '/:lang/windows/:slug', name: 'window' }`, etc.
- Intercepta clics en `<a data-route>` y llama a `navigate(path, { replace })`.
- Emite un evento `route:change` con `{ name, params, query, hash, source: 'push' | 'replace' | 'pop' | 'initial' }`.
- No sabe nada de paneles: `panel-manager` escucha `route:change` y decide.

### 3.5 `scripts/panel-manager.js`

- Escucha `route:change`. Si la ruta es `project` o `window`, abre el panel y elige el visor; si es `home`, cierra el panel.
- Emite `panel:open` y `panel:close` en `document` (igual que el menú móvil `+`), pausando los `<canvas>` y ocultando la regla vertical de scroll.
- Guarda `openedFrom` (`'home'` o `'direct'`) para decidir entre `history.back()` y `replaceState` al cerrar (`SPECS.md §4.4`).
- Calcula la secuencia `< ANTERIOR` / `SIGUIENTE >` filtrando las entradas `type !== 'external'` del filtro activo para nunca saltar a enlaces sin panel.
- Gestiona `inert` en `<main>`, el bloqueo de scroll, el foco atrapado, la restauración del foco y del `scrollY`.
- **Control de concurrencia:** Antes de invocar cualquier `loader()` (o chunk de `NoteViewer`), aborta el `AbortController` activo, ejecuta `unmount()` si había una instancia montada y crea un nuevo `AbortController`. Al resolverse `await loader()`, verifica `if (controller.signal.aborted) return;` antes de tocar el DOM o llamar a `mount(el, ctx)`, eliminando condiciones de carrera en navegación rápida.
- Si una entrada declara `sandboxSrc`, monta un `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer">` aislado en lugar de inyectar JS en el documento principal.

### 3.6 `scripts/i18n.js`

- Valida siempre cualquier candidato de idioma (`pathname`, `localStorage.lang`, `navigator.language`) contra la lista blanca cerrada `SUPPORTED_LANGS = new Set(['es', 'en'])` con fallback a `'es'`, impidiendo redirecciones abiertas (*Open Redirect*).
- `t('key')` para textos de interfaz (`locales/*.js`) y `pick(obj)` para los campos `{es, en}` de los registros.
- Cambiar de idioma reescribe el prefijo de la ruta y vuelve a renderizar los componentes sin recargar la página.

### 3.7 `scripts/sanitize.js`

- `escapeHtml(str)` y `escapeAttr(str)` para interpolación segura en *template literals*.
- `sanitizeUrl(url, { allowRelative = true })`: parsea con `new URL(url, window.location.origin)` y solo permite esquemas explícitos (`https:`, `http:`, `mailto:`) o rutas relativas internas que empiecen con `/` y **no** con `//` ni `\\`. Si una URL viola la política (p. ej. `javascript:` o `data:`), devuelve `'#'` y registra una advertencia en desarrollo.

---

## 4. Renderizado y seguridad DOM

- `index.html` contiene el esqueleto estático: `<header>`, `<main>` con los contenedores de cada sección (`<section id="overview">`, etc.), `<footer>` y el `<div id="panel-root">`.
- Cada componente exporta `render(container, { lang })`, genera su HTML a partir de los datos con *template literals* y conecta sus eventos. Las listas (miniaturas, tarjetas, filas de specs) siempre se generan iterando los registros.
- Todo texto que proviene de datos pasa por `escapeHtml()` / `escapeAttr()`, y **todo** atributo `href`, `src` o llamada a `window.open()` pasa obligatoriamente por `sanitizeUrl()`. Todo enlace externo incluye `rel="noopener noreferrer"`.
- Los iconos de `ui/icons.js` son literales SVG estáticos versionados en el repositorio (nunca construidos desde datos externos).
- En las mini-apps interactivas (`src/windows/*`), cualquier entrada del usuario (inputs, portapapeles, archivos o `location.search`) debe actualizar el DOM con `textContent` y APIs nativas (`createElement`, `setAttribute` validado), quedando prohibido interpolar entrada del usuario en `innerHTML`.
- Al cambiar de idioma, cada componente vuelve a llamar a `render()`. Los componentes con estado (índice del carrusel, filtro activo, página visible del hub) lo conservan en variables del módulo.

---

## 5. Build y despliegue

### 5.1 Vite

- `vite.config.js` registra `scripts/md-plugin.js` para compilar los archivos `.md` (`manifesto.*.md` y `notes/*.md`) en tiempo de build a módulos ES que exportan HTML estático con HTML crudo deshabilitado/sanitizado, evitando arrastrar un compilador de Markdown o un runtime JSX al navegador.
- `build.rollupOptions.output.manualChunks` no es necesario: los `import()` de `windows.js` y el `import.meta.glob('../content/notes/*.md')` crean automáticamente un chunk independiente por ventana y por nota.
- Las fuentes son self-hosted con `font-display: swap`, y se hace `preload` únicamente de las dos variantes `.woff2` principales para proteger el LCP en 4G.

### 5.2 `scripts/prerender.js`

Se ejecuta después de `vite build` (`"build": "vite build && node scripts/prerender.js"`):

1. Importa `data/projects.js`, `data/windows.meta.js` y ejecuta `data/validate.js` (abortando el build con `process.exit(1)` si algún slug, campo o URL incumple el contrato).
2. Por cada ruta de `SPECS.md §1` (excluyendo entradas `external`) y cada idioma en `['es', 'en']`, construye la ruta destino verificando que `path.resolve(outPath)` permanezca estrictamente dentro de `path.resolve('dist')` (prevención de *Path Traversal*).
3. Genera `dist/<ruta>/index.html` inyectando `<title>`, `<meta name="description">`, `og:image` (`project.cover`, `window.cover` o fallback `/og-default.png`) y `<link rel="alternate" hreflang>`, aplicando escapado contextual de atributos HTML.
4. Genera `dist/sitemap.xml` escapando entidades XML (`&`, `<`, `>`, `"`, `'`).

### 5.3 `vercel.json`

- Redirección de `/` a `/es`. La detección del idioma preferido del navegador la hace `main.js` en el cliente validando contra `['es', 'en']`.
- Rewrite acotado exclusivamente a rutas de aplicación `/:lang(es|en)/:path*` (excluyendo `/assets/*`, `/art/*`, `/shots/*`, `/media/*` y `/fonts/*`) hacia `/:lang/index.html`, evitando servir HTML con `200 OK` ante chunks JS inexistentes o idiomas inválidos.
- Cabeceras de caché `Cache-Control: public, max-age=31536000, immutable` para `/assets/*`.
- Cabeceras globales de seguridad HTTP:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 6. Convenciones

- Archivos y carpetas en kebab-case. Una carpeta por componente, con su JS y su CSS.
- Clases CSS de la home con prefijo del componente (`.showroom__thumb`, `.panel__titlebar`); las ventanas en `src/windows/*` usan CSS Modules (`*.module.css`). Sin frameworks de utilidades.
- Sin dependencias de runtime salvo las imprescindibles (Markdown se compila a HTML en el build). Cualquier dependencia nueva debe justificarse por tamaño y superficie de seguridad.
- Los comentarios en el código, solo para restricciones que el código no muestra.
