import { detectLang, isLang } from './i18n.js'

/**
 * @typedef {'home' | 'windows' | 'window' | 'project' | 'not-found'} RouteName
 * @typedef {'push' | 'replace' | 'pop' | 'initial'} RouteSource
 * @typedef {Object} Route
 * @property {RouteName} name
 * @property {string} lang
 * @property {{ lang?: string, slug?: string }} params
 * @property {URLSearchParams} query
 * @property {string} hash
 * @property {RouteSource} source
 * @property {boolean} keepScroll
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** @type {Set<(route: Route) => void>} */
const listeners = new Set()
let scrollToken = 0
let rememberTimer = 0

/** @param {(route: Route) => void} listener */
export function subscribeRoute(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @param {string} pathname */
function matchPath(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const head = parts[0] ?? ''
  if (!isLang(head)) {
    return { name: /** @type {const} */ ('not-found'), lang: detectLang(), params: /** @type {Record<string, string>} */ ({}) }
  }
  if (parts.length === 1) {
    return { name: /** @type {const} */ ('home'), lang: head, params: { lang: head } }
  }
  if (parts[1] === 'windows' && parts.length === 2) {
    return { name: /** @type {const} */ ('windows'), lang: head, params: { lang: head } }
  }
  if (parts[1] === 'windows' && parts.length === 3 && SLUG.test(parts[2])) {
    return { name: /** @type {const} */ ('window'), lang: head, params: { lang: head, slug: parts[2] } }
  }
  if (parts[1] === 'projects' && parts.length === 3 && SLUG.test(parts[2])) {
    return { name: /** @type {const} */ ('project'), lang: head, params: { lang: head, slug: parts[2] } }
  }
  return { name: /** @type {const} */ ('not-found'), lang: head, params: { lang: head } }
}

/**
 * @param {RouteSource} source
 * @param {boolean} keepScroll
 * @returns {Route}
 */
function readRoute(source, keepScroll) {
  const matched = matchPath(location.pathname)
  return {
    ...matched,
    query: new URLSearchParams(location.search),
    hash: location.hash.startsWith('#') ? location.hash.slice(1) : '',
    source,
    keepScroll,
  }
}

/** @param {RouteSource} source @param {boolean} keepScroll */
function emit(source, keepScroll) {
  const route = readRoute(source, keepScroll)
  listeners.forEach((listener) => listener(route))
  document.dispatchEvent(new CustomEvent('route:change', { detail: route }))
}

export function savedScrollY() {
  const state = history.state
  if (!state || typeof state !== 'object' || !('scrollY' in state)) return null
  const value = /** @type {{ scrollY?: unknown }} */ (state).scrollY
  return typeof value === 'number' ? value : null
}

function here() {
  return `${location.pathname}${location.search}${location.hash}`
}

function rememberScroll() {
  const state = history.state
  const base = state && typeof state === 'object' ? { .../** @type {Record<string, unknown>} */ (state) } : {}
  history.replaceState({ ...base, scrollY: window.scrollY }, '', here())
}

function scheduleRemember() {
  window.clearTimeout(rememberTimer)
  const token = scrollToken
  rememberTimer = window.setTimeout(() => {
    if (token !== scrollToken) return
    rememberScroll()
  }, 100)
}

/**
 * @param {string} pathname
 * @param {string} search
 * @param {string} hash
 * @param {string} nextLang
 */
export function withLang(pathname, search, hash, nextLang) {
  if (!isLang(nextLang)) return `/${detectLang()}`
  const parts = pathname.split('/')
  if (isLang(parts[1])) {
    parts[1] = nextLang
    return `${parts.join('/')}${search}${hash}`
  }
  return `/${nextLang}${search}${hash}`
}

/**
 * @param {string} path
 * @param {{ replace?: boolean, keepScroll?: boolean }} [options]
 */
export function navigate(path, { replace = false, keepScroll = false } = {}) {
  let url
  try {
    url = new URL(path, window.location.origin)
  } catch {
    return
  }
  if (url.origin !== window.location.origin) return

  scrollToken += 1
  window.clearTimeout(rememberTimer)

  const next = `${url.pathname}${url.search}${url.hash}`
  const current = here()
  const entry = { scrollY: keepScroll ? window.scrollY : null }

  if (replace || next === current) history.replaceState(entry, '', next)
  else {
    rememberScroll()
    history.pushState(entry, '', next)
  }

  emit(replace ? 'replace' : 'push', keepScroll)
}

/** @param {MouseEvent} event */
function onClick(event) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (!(event.target instanceof Element)) return
  const anchor = event.target.closest('a[data-route]')
  if (!(anchor instanceof HTMLAnchorElement)) return
  if (anchor.target && anchor.target !== '_self') return
  const href = anchor.getAttribute('href')
  if (!href) return
  event.preventDefault()
  navigate(href, {
    replace: anchor.hasAttribute('data-replace'),
    keepScroll: anchor.hasAttribute('data-keep-scroll'),
  })
}

export function startRouter() {
  history.scrollRestoration = 'manual'
  document.addEventListener('click', onClick)
  window.addEventListener('scroll', scheduleRemember, { passive: true })
  window.addEventListener('popstate', () => {
    scrollToken += 1
    window.clearTimeout(rememberTimer)
    emit('pop', false)
  })

  if (location.pathname === '/' || location.pathname === '') {
    const lang = detectLang()
    history.replaceState({ scrollY: 0 }, '', `/${lang}${location.search}${location.hash}`)
  }

  emit('initial', false)
}
