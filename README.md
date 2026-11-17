# portfolio-kyoto

Sitio estático con Vite. No tiene dependencias de runtime.

## Requisitos

- Node.js 20 o superior
- npm

## Arranque local

```bash
npm install
npm run dev
```

Vite abre el sitio en `http://localhost:5173/`. La raíz redirige a `/es` o `/en` según el idioma del navegador.

## Compilar

```bash
npm run build
npm run preview
```

`build` genera `dist/`. `preview` sirve esa carpeta en local para revisar el resultado de producción.
