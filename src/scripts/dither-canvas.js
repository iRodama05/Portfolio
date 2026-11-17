import { hasFinePointer, prefersReducedMotion } from './motion.js'

const BAYER8 = new Uint8Array([
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
])

/**
 * @typedef {Object} DitherOptions
 * @property {string} src
 * @property {number} [cellSize]
 * @property {number} [influenceRadius]
 * @property {boolean} [lazy]
 * @property {'auto' | boolean} [interactive]
 */

/**
 * @typedef {Object} Rgb
 * @property {number} r
 * @property {number} g
 * @property {number} b
 */

/** @param {string} hex @param {Rgb} fallback */
function parseColor(hex, fallback) {
  const value = hex.trim()
  const match = /^#([\da-f]{6})$/i.exec(value)
  if (match) {
    const n = Number.parseInt(match[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value)
  if (!rgb) return fallback
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
}

/** @param {string} name @param {string} fallback */
function token(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  return parseColor(raw || fallback, parseColor(fallback, { r: 156, g: 184, b: 164 }))
}

/** @param {Rgb} color @param {number} alpha */
function pack(color, alpha) {
  const a = alpha < 0 ? 0 : alpha > 255 ? 255 : alpha & 255
  return (a << 24) | (color.b << 16) | (color.g << 8) | color.r
}

/**
 * @param {Rgb} a
 * @param {Rgb} b
 * @param {number} t
 * @param {number} alpha
 */
function mixPack(a, b, t, alpha) {
  return pack({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }, alpha)
}

/** @param {number} col @param {number} row */
function bayerOf(col, row) {
  return (BAYER8[((row & 7) << 3) + (col & 7)] + 0.5) / 64
}

/**
 * @param {number} col
 * @param {number} row
 * @param {number} cols
 * @param {number} rows
 * @param {boolean} wide
 */
function edgeFade(col, row, cols, rows, wide) {
  const u = (col + 0.5) / cols
  const v = (row + 0.5) / rows
  const dx = (u - 0.56) / 0.58
  const dy = (v - 0.58) / 0.62
  const dist = Math.sqrt(dx * dx + dy * dy)
  const radial = dist <= 0.78 ? 1 : dist >= 1.08 ? 0 : (1.08 - dist) / 0.3
  const left = wide ? Math.min(1, Math.max(0, (u - 0.01) / 0.22)) : 1
  const rim = Math.min(1, u / 0.035, (1 - u) / 0.02, v / 0.05, (1 - v) / 0.012)
  return radial * rim * (0.15 + 0.85 * left)
}

/** @param {string} src */
function loadImage(src) {
  if (!src) return Promise.resolve(/** @type {HTMLImageElement | null} */ (null))
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      img.decode().then(() => resolve(img)).catch(() => resolve(img))
    }
    img.onerror = () => {
      if (import.meta.env.DEV) console.warn(`[dither] ${src} unavailable, using architectural fallback`)
      resolve(null)
    }
    img.src = src
  })
}

/**
 * @param {HTMLImageElement} image
 * @param {number} cols
 * @param {number} rows
 * @param {boolean} wide
 */
function sampleImage(image, cols, rows, wide) {
  const scratch = document.createElement('canvas')
  scratch.width = cols
  scratch.height = rows
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  const field = new Float32Array(cols * rows)
  if (!ctx) return field
  ctx.clearRect(0, 0, cols, rows)
  const iw = image.naturalWidth || cols
  const ih = image.naturalHeight || rows
  const scale = Math.max(cols / iw, rows / ih)
  const dw = iw * scale
  const dh = ih * scale
  const drop = 14
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(image, (cols - dw) / 2, rows - dh + drop, dw, dh)
  const data = ctx.getImageData(0, 0, cols, rows).data
  let sum = 0
  let count = 0
  const total = cols * rows
  for (let i = 0; i < total; i += 1) {
    const alpha = data[i * 4 + 3]
    if (alpha > 16) {
      sum += data[i * 4]
      count += 1
    }
  }
  const invert = (count ? sum / count / 255 : 0) > 0.5
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const p = (row * cols + col) * 4
      let lum = data[p] / 255
      if (invert) lum = 1 - lum
      if (lum < 0.04) lum = 0
      else lum = Math.min(0.94, ((lum - 0.04) / 0.42) ** 0.6 * 0.95)
      field[row * cols + col] = lum * edgeFade(col, row, cols, rows, wide)
    }
  }
  return field
}

/**
 * Luz de una elipse: 1 en el centro, 0 en el borde.
 * @param {number} u
 * @param {number} v
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 */
function blob(u, v, cx, cy, rx, ry) {
  const dx = (u - cx) / rx
  const dy = (v - cy) / ry
  const dist = dx * dx + dy * dy
  if (dist >= 1) return 0
  const core = 1 - Math.sqrt(dist)
  return core * core
}

/**
 * @param {number} u
 * @param {number} v
 * @param {number} x
 * @param {number} y
 * @param {number} rw
 * @param {number} rh
 */
function slab(u, v, x, y, rw, rh) {
  if (u < x || v < y || u > x + rw || v > y + rh) return 0
  const across = 1 - Math.abs((u - (x + rw * 0.5)) / (rw * 0.5))
  const down = (v - y) / rh
  return 0.45 + across * 0.4 + (1 - down) * 0.12
}

/** @param {number} w @param {number} h */
function paintArchitecture(w, h) {
  const field = new Float32Array(w * h)
  for (let row = 0; row < h; row += 1) {
    const v = (row + 0.5) / h
    for (let col = 0; col < w; col += 1) {
      const u = (col + 0.5) / w
      let shade = 0

      const span = (v - 0.74) / 0.24
      if (span >= 0 && span <= 1) {
        const half = 0.1 + span * 0.2
        const off = Math.abs(u - 0.4)
        if (off < half) {
          const step = (span * 7) % 1
          const groove = step < 0.16 ? 0.28 : 1
          shade = Math.max(shade, (0.34 + (1 - off / half) * 0.28) * groove)
        }
      }

      shade = Math.max(shade, slab(u, v, 0.2, 0.78, 0.16, 0.07) * 0.72)
      shade = Math.max(shade, slab(u, v, 0.44, 0.78, 0.16, 0.07) * 0.72)
      shade = Math.max(shade, slab(u, v, 0.235, 0.32, 0.09, 0.5) * 0.95)
      shade = Math.max(shade, slab(u, v, 0.475, 0.32, 0.09, 0.5) * 0.95)
      shade = Math.max(shade, slab(u, v, 0.25, 0.4, 0.3, 0.045) * 0.8)
      shade = Math.max(shade, slab(u, v, 0.3, 0.455, 0.2, 0.03) * 0.62)

      if (u > 0.14 && u < 0.64) {
        const t = (u - 0.14) / 0.5
        const crest = 0.3 - Math.sin(t * Math.PI) * 0.09
        const band = Math.abs(v - crest)
        if (band < 0.028) shade = Math.max(shade, 0.92 * (1 - band / 0.028))
        const lower = Math.abs(v - (crest + 0.045))
        if (lower < 0.016) shade = Math.max(shade, 0.7 * (1 - lower / 0.016))
      }

      const trunk = blob(u, v, 0.62, 0.9, 0.07, 0.12)
        + blob(u, v, 0.7, 0.74, 0.055, 0.1) * 0.9
        + blob(u, v, 0.78, 0.58, 0.05, 0.09) * 0.85
        + blob(u, v, 0.86, 0.46, 0.04, 0.07) * 0.75
      shade = Math.max(shade, Math.min(1, trunk) * 0.78)

      shade = Math.max(shade, blob(u, v, 0.9, 0.36, 0.09, 0.07) * 0.7)
      shade = Math.max(shade, blob(u, v, 0.8, 0.42, 0.07, 0.055) * 0.62)
      shade = Math.max(shade, blob(u, v, 0.74, 0.5, 0.06, 0.05) * 0.55)
      shade = Math.max(shade, blob(u, v, 0.16, 0.48, 0.07, 0.09) * 0.4)
      shade = Math.max(shade, blob(u, v, 0.1, 0.58, 0.055, 0.07) * 0.32)

      field[row * w + col] = Math.min(0.9, shade)
    }
  }
  return field
}

/**
 * @param {number} cols
 * @param {number} rows
 * @param {boolean} wide
 */
function architecturalField(cols, rows, wide) {
  const fw = Math.max(cols, 220)
  const fh = Math.max(rows, 260)
  const painted = paintArchitecture(fw, fh)
  const field = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row += 1) {
    const sy = Math.min(fh - 1, Math.floor(((row + 0.5) / rows) * fh))
    for (let col = 0; col < cols; col += 1) {
      const sx = Math.min(fw - 1, Math.floor(((col + 0.5) / cols) * fw))
      field[row * cols + col] = painted[sy * fw + sx] * edgeFade(col, row, cols, rows, wide)
    }
  }
  return field
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {DitherOptions} options
 */
export function createDitherCanvas(canvas, options) {
  const cellSize = options.cellSize ?? 2
  const radius = options.influenceRadius ?? 130
  const radiusSq = radius * radius
  const lazy = options.lazy === true
  const mode = options.interactive ?? 'auto'

  const ink = token('--dither-ink', '#9CB8A4')
  const paper = token('--text-primary', '#E4ECE6')
  const torii = token('--accent-torii', '#D95338')
  const inkColor = pack(ink, 255)

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

  /** @type {Float32Array | null} */
  let field = null
  /** @type {ImageData | null} */
  let frame = null
  /** @type {Uint32Array | null} */
  let view = null
  /** @type {Uint32Array | null} */
  let base = null
  /** @type {HTMLImageElement | null} */
  let bitmap = null
  /** @type {Promise<HTMLImageElement | null> | null} */
  let imageTask = null

  let cols = 0
  let rows = 0
  let pitch = 2
  let cellCss = 2
  let generation = 0
  let live = false
  let visible = false
  let hidden = document.hidden
  let overlays = document.body.classList.contains('has-overlay') ? 1 : 0
  let raf = 0
  let resizeTimer = 0
  let inputBound = false
  let started = false
  let destroyed = false
  /** @type {{ x: number, y: number } | null} */
  let cursor = null
  /** @type {{ x: number, y: number, w: number, h: number } | null} */
  let dirty = null
  let hold = 1
  let leaving = false
  let lastNow = 0
  /** @type {ResizeObserver | null} */
  let resizeObserver = null
  /** @type {IntersectionObserver | null} */
  let viewObserver = null
  /** @type {IntersectionObserver | null} */
  let lazyObserver = null

  function wantsLive() {
    if (prefersReducedMotion() || motionQuery.matches) return false
    if (mode === false) return false
    if (mode === true) return true
    return hasFinePointer() && pointerQuery.matches
  }

  function askImage() {
    if (!imageTask) {
      imageTask = loadImage(options.src).then((img) => {
        bitmap = img
        return img
      })
    }
    return imageTask
  }

  /**
   * @param {Uint32Array} pixels
   * @param {number} col
   * @param {number} row
   * @param {number} color
   */
  function fillCell(pixels, col, row, color) {
    if (!frame) return
    const bw = frame.width
    const x0 = col * pitch
    const y0 = row * pitch
    const x1 = x0 + pitch
    const y1 = y0 + pitch
    for (let y = y0; y < y1; y += 1) {
      let index = y * bw + x0
      for (let x = x0; x < x1; x += 1) {
        pixels[index] = color
        index += 1
      }
    }
  }

  /** @param {Uint32Array} pixels @param {number} color */
  function paintStatic(pixels, color) {
    pixels.fill(0)
    if (!field) return
    for (let row = 0; row < rows; row += 1) {
      const rowIndex = row * cols
      for (let col = 0; col < cols; col += 1) {
        if (field[rowIndex + col] <= bayerOf(col, row)) continue
        fillCell(pixels, col, row, color)
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function restore(x, y, w, h) {
    if (!frame || !view || !base) return
    const bw = frame.width
    const bh = frame.height
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(bw, x + w)
    const y1 = Math.min(bh, y + h)
    for (let row = y0; row < y1; row += 1) {
      const start = row * bw + x0
      view.set(base.subarray(start, row * bw + x1), start)
    }
  }

  /**
   * 0 en el borde y 1 en el centro, con pendiente plana en el borde.
   * Recorre el radio entero para que no quede un anillo de corte.
   * @param {number} dist
   */
  function ring(dist) {
    const n = dist / radius
    if (n >= 1) return 0
    const t = 1 - n
    return t * t * (3 - 2 * t) * hold
  }

  /** @param {number} time */
  function paintRadius(time) {
    if (!cursor || !field || !view || hold <= 0) return
    const css = cellCss
    const reach = radius / css
    const c0 = Math.max(0, Math.floor(cursor.x / css - reach))
    const c1 = Math.min(cols - 1, Math.ceil(cursor.x / css + reach))
    const r0 = Math.max(0, Math.floor(cursor.y / css - reach))
    const r1 = Math.min(rows - 1, Math.ceil(cursor.y / css + reach))
    for (let row = r0; row <= r1; row += 1) {
      const rowIndex = row * cols
      const py = (row + 0.5) * css
      const dy = py - cursor.y
      for (let col = c0; col <= c1; col += 1) {
        const px = (col + 0.5) * css
        const dx = px - cursor.x
        const distSq = dx * dx + dy * dy
        if (distSq >= radiusSq) continue
        const dist = Math.sqrt(distSq)
        const fade = ring(dist)
        if (fade < 0.02) continue
        const shade = field[rowIndex + col]
        const threshold = bayerOf(col, row)
        const staticOn = shade > threshold
        // La onda que crea o borra puntos vive solo en el núcleo.
        const core = fade < 0.55 ? 0 : (fade - 0.55) / 0.45
        const wave = Math.sin(dist * 0.105 - time * 2.5) * 0.12 * core * core
        const on = core < 0.04 ? staticOn : shade > threshold + wave
        if (staticOn && !on) {
          fillCell(view, col, row, pack(ink, Math.round((1 - core) * 255)))
          continue
        }
        if (!staticOn && on) {
          const alpha = Math.round(core * core * 255)
          if (alpha < 14) continue
          fillCell(view, col, row, pack(ink, alpha))
          continue
        }
        if (!staticOn) continue
        const tint = fade * fade * fade
        if (tint < 0.02) continue
        const spark = core > 0.72 && dist < 16 && ((col * 5 + row * 3) & 7) === 0
        fillCell(view, col, row, spark
          ? mixPack(ink, torii, core * core, 255)
          : mixPack(ink, paper, tint * 0.8, 255))
      }
    }
  }

  function publish(rect) {
    const ctx = canvas.getContext('2d')
    if (!ctx || !frame) return
    if (!rect) {
      ctx.putImageData(frame, 0, 0)
      return
    }
    ctx.putImageData(frame, 0, 0, rect.x, rect.y, rect.w, rect.h)
  }

  /** @param {{ x: number, y: number, w: number, h: number }} a @param {{ x: number, y: number, w: number, h: number }} b */
  function union(a, b) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return {
      x,
      y,
      w: Math.max(a.x + a.w, b.x + b.w) - x,
      h: Math.max(a.y + a.h, b.y + b.h) - y,
    }
  }

  function cursorBox() {
    if (!cursor) return null
    const reach = radius + cellCss
    const x = Math.max(0, Math.floor((cursor.x - reach) * (pitch / cellCss)))
    const y = Math.max(0, Math.floor((cursor.y - reach) * (pitch / cellCss)))
    const x2 = Math.min(frame ? frame.width : 0, Math.ceil((cursor.x + reach) * (pitch / cellCss)))
    const y2 = Math.min(frame ? frame.height : 0, Math.ceil((cursor.y + reach) * (pitch / cellCss)))
    return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) }
  }

  /** @param {number} time */
  function renderHot(time) {
    const box = cursorBox()
    if (!box) return
    const region = dirty ? union(dirty, box) : box
    restore(region.x, region.y, region.w, region.h)
    paintRadius(time)
    publish(region)
    dirty = box
  }

  function settle() {
    if (dirty) {
      restore(dirty.x, dirty.y, dirty.w, dirty.h)
      publish(dirty)
    }
    dirty = null
    cursor = null
    hold = 1
    leaving = false
    lastNow = 0
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    settle()
    markState()
  }

  /** @param {number} now */
  function frameStep(now) {
    raf = 0
    if (destroyed || !live || hidden || overlays > 0 || !visible || !cursor) {
      stopLoop()
      return
    }
    if (leaving) {
      const dt = lastNow ? now - lastNow : 16
      hold = Math.max(0, hold - dt / 340)
      if (hold <= 0) {
        stopLoop()
        return
      }
    } else {
      hold = 1
    }
    lastNow = now
    renderHot(now * 0.001)
    raf = requestAnimationFrame(frameStep)
  }

  function syncVisible() {
    const rect = canvas.getBoundingClientRect()
    visible = rect.width > 2
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth
  }

  function kick() {
    syncVisible()
    if (!live || hidden || overlays > 0 || !visible || !cursor) return
    if (!raf) raf = requestAnimationFrame(frameStep)
    markState()
  }

  function markState() {
    if (!live) canvas.dataset.dither = 'static'
    else if (raf || cursor) canvas.dataset.dither = 'live'
    else canvas.dataset.dither = 'idle'
  }

  function measure() {
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return false
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
    pitch = Math.max(1, Math.round(cellSize * dpr))
    cellCss = pitch / dpr
    cols = Math.max(1, Math.floor((rect.width * dpr) / pitch))
    rows = Math.max(1, Math.floor((rect.height * dpr) / pitch))
    const bw = cols * pitch
    const bh = rows * pitch
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    if (!frame || frame.width !== bw || frame.height !== bh) {
      frame = new ImageData(bw, bh)
      view = new Uint32Array(frame.data.buffer, frame.data.byteOffset, bw * bh)
      base = new Uint32Array(bw * bh)
    }
    return true
  }

  async function rebuild() {
    if (destroyed) return
    const id = ++generation
    if (!measure()) return
    const wide = window.matchMedia('(min-width: 1024px)').matches
    const img = await askImage()
    if (destroyed || id !== generation || !view || !base) return
    field = img ? sampleImage(img, cols, rows, wide) : architecturalField(cols, rows, wide)
    if (cursor) settle()
    paintStatic(view, inkColor)
    base.set(view)
    publish(null)
    dirty = null
    markState()
    if (cursor) kick()
  }

  function scheduleRebuild() {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      rebuild()
    }, 120)
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    if (event.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    leaving = false
    hold = 1
    kick()
  }

  function onPointerLeave() {
    if (!cursor) return
    leaving = true
    kick()
  }

  function bindInput() {
    if (inputBound || !live) return
    inputBound = true
    canvas.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerleave', onPointerLeave)
  }

  function unbindInput() {
    if (!inputBound) return
    inputBound = false
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    stopLoop()
  }

  function applyMode() {
    const next = wantsLive()
    if (next === live && started) return
    live = next
    if (live) bindInput()
    else unbindInput()
    markState()
  }

  function onVisibility() {
    hidden = document.hidden
    if (hidden) stopLoop()
    else if (cursor) kick()
  }

  function onPanelOpen() {
    overlays += 1
    stopLoop()
  }

  function onPanelClose() {
    overlays = Math.max(0, overlays - 1)
    if (cursor) kick()
  }

  function boot() {
    if (started || destroyed) return
    started = true
    live = wantsLive()
    if (live) bindInput()
    markState()
    resizeObserver = new ResizeObserver(scheduleRebuild)
    resizeObserver.observe(canvas)
    viewObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (!visible) stopLoop()
      else if (cursor) kick()
    })
    viewObserver.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('panel:open', onPanelOpen)
    document.addEventListener('panel:close', onPanelClose)
    motionQuery.addEventListener('change', applyMode)
    pointerQuery.addEventListener('change', applyMode)
    rebuild()
  }

  if (lazy) {
    lazyObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      lazyObserver?.disconnect()
      lazyObserver = null
      boot()
    }, { rootMargin: '400px' })
    lazyObserver.observe(canvas)
  } else {
    boot()
  }

  return {
    destroy() {
      destroyed = true
      generation += 1
      stopLoop()
      window.clearTimeout(resizeTimer)
      unbindInput()
      resizeObserver?.disconnect()
      viewObserver?.disconnect()
      lazyObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('panel:open', onPanelOpen)
      document.removeEventListener('panel:close', onPanelClose)
      motionQuery.removeEventListener('change', applyMode)
      pointerQuery.removeEventListener('change', applyMode)
    },
  }
}
