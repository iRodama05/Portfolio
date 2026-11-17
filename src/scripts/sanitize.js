const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** @param {unknown} value */
export function escapeAttr(value) {
  return escapeHtml(value)
}

/** @param {unknown} url */
function warn(url) {
  if (import.meta.env.DEV) console.warn(`[sanitizeUrl] blocked: ${String(url)}`)
}

/**
 * @param {unknown} url
 * @param {{ allowRelative?: boolean }} [options]
 */
export function sanitizeUrl(url, { allowRelative = true } = {}) {
  const value = String(url ?? '').trim().replace(/[\u0000-\u001F\u007F]/g, '')
  if (!value || value.includes('\\') || value.startsWith('//')) {
    if (value) warn(value)
    return '#'
  }

  let parsed
  try {
    parsed = new URL(value, window.location.origin)
  } catch {
    warn(value)
    return '#'
  }

  if (parsed.username || parsed.password) {
    warn(value)
    return '#'
  }

  if (SAFE_PROTOCOLS.has(parsed.protocol)) {
    if (parsed.protocol === 'mailto:') return parsed.href
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.href
  }

  const relative = value.startsWith('/') || value.startsWith('#') || value.startsWith('?')
  if (allowRelative && relative && parsed.origin === window.location.origin) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }

  warn(value)
  return '#'
}

/** @param {unknown} url */
export function anchorAttrs(url) {
  const href = sanitizeUrl(url)
  if (href === '#') return 'href="#"'

  let parsed
  try {
    parsed = new URL(href, window.location.origin)
  } catch {
    return 'href="#"'
  }

  if (parsed.protocol === 'mailto:') return `href="${escapeAttr(parsed.href)}"`

  if (parsed.origin !== window.location.origin) {
    return `href="${escapeAttr(parsed.href)}" target="_blank" rel="noopener noreferrer"`
  }

  const local = `${parsed.pathname}${parsed.search}${parsed.hash}`
  return `href="${escapeAttr(local)}" data-route`
}
