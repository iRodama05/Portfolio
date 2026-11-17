import './styles/tokens.css'
import './styles/reset.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/utilities.css'
import { sections } from './data/navigation.js'
import { profile } from './data/profile.js'
import { renderFooter } from './components/footer/footer.js'
import { renderHero, unmountHero } from './components/hero/hero.js'
import { closeMenu, initNav, renderNav } from './components/nav/nav.js'
import { initScrollRuler, renderScrollRuler, syncScrollRuler } from './components/scroll-ruler/scroll-ruler.js'
import { sectionHeaderMarkup } from './components/section-header/section-header.js'
import { cornerMarksMarkup } from './components/ui/icons.js'
import { renderNotFound } from './components/viewers/not-found.js'
import { getLang, isLang, setLang, t } from './scripts/i18n.js'
import { prefersReducedMotion } from './scripts/motion.js'
import { savedScrollY, startRouter, subscribeRoute, withLang } from './scripts/router.js'
import { escapeHtml } from './scripts/sanitize.js'
import { initScrollSpy, refreshScrollSpy, setActiveSection } from './scripts/scroll-spy.js'

const header = required('site-header')
const footer = required('site-footer')
const rulerRoot = required('ruler-root')

/** @type {string} */
let renderedLang = ''
/** @type {string} */
let renderedView = ''
let spyReady = false

/** @param {string} id */
function required(id) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing #${id}`)
  return el
}

function renderHome() {
  unmountHero()
  const missing = document.getElementById('not-found')
  if (missing instanceof HTMLElement) {
    missing.hidden = true
    missing.innerHTML = ''
  }

  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (!(el instanceof HTMLElement)) continue
    el.hidden = false
    const headerMarkup = sectionHeaderMarkup({
      index: section.index,
      label: t(section.labelKey),
      kanji: section.kanji,
      as: section.id === 'overview' ? 'div' : 'h2',
    })
    if (section.id === 'overview') {
      el.innerHTML = `${cornerMarksMarkup()}${headerMarkup}<div class="hero"></div>`
      const hero = el.querySelector('.hero')
      if (hero instanceof HTMLElement) renderHero(hero, { lang: getLang() })
      continue
    }
    el.innerHTML = `${cornerMarksMarkup()}${headerMarkup}<p class="lede">${escapeHtml(t(`sections.${section.id}.lede`))}</p>`
  }
}

function renderMissing() {
  unmountHero()
  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (!(el instanceof HTMLElement)) continue
    el.hidden = true
    el.innerHTML = ''
  }
  const missing = document.getElementById('not-found')
  if (missing instanceof HTMLElement) {
    missing.hidden = false
    renderNotFound(missing)
  }
}

/** @param {import('./scripts/router.js').Route} route */
function setMeta(route) {
  const missing = route.name === 'not-found'
  document.title = missing
    ? `${t('notFound.kicker')} — ${profile.alias}`
    : `${profile.alias} — ${t('meta.title')}`
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', missing ? t('notFound.lede') : t('meta.description'))
  const skip = document.querySelector('.skip-link')
  if (skip) skip.textContent = t('skip')
}

function syncLangLinks() {
  document.querySelectorAll('[data-lang]').forEach((node) => {
    if (!(node instanceof HTMLAnchorElement)) return
    const code = node.dataset.lang
    if (!isLang(code)) return
    node.setAttribute('href', withLang(location.pathname, location.search, location.hash, code))
  })
}

/** @param {string} hash */
function focusHeading(hash) {
  const el = document.getElementById(hash)
  if (!el) return
  const heading = el.matches('h1, h2, h3') ? el : el.querySelector('h1, h2, h3')
  if (heading instanceof HTMLElement) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

/** @param {import('./scripts/router.js').Route} route */
function scrollTargetId(route) {
  if (route.hash && document.getElementById(route.hash)) return route.hash
  if (route.name === 'windows') return 'windows'
  return ''
}

/** @param {import('./scripts/router.js').Route} route */
function scrollToRoute(route) {
  if (route.name === 'project' || route.name === 'window') {
    if (route.source === 'pop') {
      const y = savedScrollY()
      if (typeof y === 'number') window.scrollTo(0, y)
    }
    return
  }

  if (route.keepScroll) {
    const y = savedScrollY()
    if (typeof y === 'number') window.scrollTo(0, y)
    return
  }

  if (route.source === 'pop') {
    const y = savedScrollY()
    if (typeof y === 'number') {
      window.scrollTo(0, y)
      return
    }
  }

  const behavior = route.source === 'push' && !prefersReducedMotion() ? 'smooth' : 'instant'
  const id = scrollTargetId(route)
  if (id) {
    document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' })
    return
  }

  if (route.source === 'push' || route.source === 'replace' || route.source === 'pop') {
    window.scrollTo({ top: 0, behavior })
  }
}

/** @param {import('./scripts/router.js').Route} route */
function paint(route) {
  const active = document.activeElement
  const fromMenu = active instanceof HTMLElement && Boolean(active.closest('.nav-menu'))
  const langFocus = active instanceof HTMLElement ? active.dataset.lang ?? '' : ''

  closeMenu(header, { restoreFocus: false })
  if (isLang(route.lang)) setLang(route.lang)

  const lang = getLang()
  const view = route.name === 'not-found' ? 'missing' : 'home'
  if (renderedLang !== lang || renderedView !== view) {
    if (view === 'missing') renderMissing()
    else renderHome()
    renderNav(header, { lang })
    renderScrollRuler(rulerRoot, { lang })
    renderFooter(footer, { lang })
    renderedLang = lang
    renderedView = view
  }

  setMeta(route)
  syncLangLinks()

  if (route.source !== 'initial') {
    if (langFocus) {
      const next = document.querySelector(`[data-lang="${CSS.escape(langFocus)}"]`)
      if (next instanceof HTMLElement) next.focus({ preventScroll: true })
    } else if (fromMenu && route.hash) {
      focusHeading(route.hash)
    }
  }

  scrollToRoute(route)

  if (!spyReady) {
    spyReady = true
    initScrollSpy((id) => setActiveSection(id))
  } else {
    refreshScrollSpy()
  }
  syncScrollRuler()
}

initNav(header)
initScrollRuler()
subscribeRoute(paint)
startRouter()
