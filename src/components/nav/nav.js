import '../ui/button.css'
import '../ui/chip.css'
import './nav.css'
import { homePath, sectionPath, sections } from '../../data/navigation.js'
import { profile } from '../../data/profile.js'
import { t } from '../../scripts/i18n.js'
import { withLang } from '../../scripts/router.js'
import { anchorAttrs, escapeAttr, escapeHtml } from '../../scripts/sanitize.js'

/** @param {string} [className] */
function versionChip(className = '') {
  const classes = className ? `chip ${className}` : 'chip'
  return `<span class="${classes}"><span class="chip__mark" aria-hidden="true"></span><span class="sr-only">${escapeHtml(t('nav.version'))} </span><span>v${escapeHtml(profile.version)}</span></span>`
}

/** @param {string} lang */
function contactHref(lang) {
  return profile.email || `/${lang}#contacto`
}

/**
 * @param {HTMLElement} header
 * @param {{ lang: string }} state
 */
export function renderNav(header, { lang }) {
  const links = sections.map((section) => {
    return `<a class="nav__link" ${anchorAttrs(sectionPath(lang, section.id))} data-section-link="${escapeAttr(section.id)}">${escapeHtml(t(section.labelKey))}</a>`
  }).join('')

  const menuLinks = sections.map((section) => {
    return `<li><a class="nav-menu__link" ${anchorAttrs(sectionPath(lang, section.id))} data-section-link="${escapeAttr(section.id)}"><span><span class="nav-menu__index">${escapeHtml(section.index)}</span>${escapeHtml(t(section.labelKey))}</span><span class="nav-menu__go" aria-hidden="true">&gt;</span></a></li>`
  }).join('')

  const languages = ['es', 'en'].map((code) => {
    const current = code === lang ? ' aria-current="true"' : ''
    const href = withLang(location.pathname, location.search, location.hash, code)
    return `<a class="nav__lang-link" data-lang="${escapeAttr(code)}" ${anchorAttrs(href)} data-replace data-keep-scroll${current}>${escapeHtml(code)}</a>`
  }).join('<span class="nav__lang-slash" aria-hidden="true">/</span>')

  header.innerHTML = `
    <div class="nav__bar">
      <a class="nav__brand" ${anchorAttrs(homePath(lang))}>
        <span class="nav__kanji" lang="ja">${escapeHtml(profile.kanji)}</span>
        <span class="nav__alias">${escapeHtml(profile.alias)}</span>
      </a>
      <nav class="nav__links" aria-label="${escapeAttr(t('nav.primary'))}">
        <button class="nav__toggle" type="button" data-menu-open aria-expanded="false" aria-controls="nav-menu">
          <span aria-hidden="true">+</span>
          <span class="sr-only">${escapeHtml(t('nav.menu'))}</span>
        </button>
        ${links}
      </nav>
      <div class="nav__tools">
        ${versionChip('nav__chip')}
        <div class="nav__lang" role="group" aria-label="${escapeAttr(t('nav.language'))}">${languages}</div>
        <a class="btn btn--primary nav__cta" ${anchorAttrs(contactHref(lang))}>${escapeHtml(t('nav.contact'))}</a>
      </div>
    </div>
    <div id="nav-menu" class="nav-menu" role="dialog" aria-modal="true" aria-labelledby="nav-menu-title" tabindex="-1" hidden>
      <div class="nav-menu__bar">
        <div class="nav-menu__id">
          <p id="nav-menu-title" class="nav-menu__title">${escapeHtml(t('nav.menu'))}</p>
          ${versionChip()}
        </div>
        <button class="nav-menu__close" type="button" data-menu-close>
          <span aria-hidden="true">✕</span>
          <span class="sr-only">${escapeHtml(t('nav.close'))}</span>
        </button>
      </div>
      <ul class="nav-menu__list">${menuLinks}</ul>
    </div>
  `
}

/** @param {boolean} on */
function setPageInert(on) {
  for (const id of ['site-main', 'site-footer']) {
    const el = document.getElementById(id)
    if (el) el.inert = on
  }
  const bar = document.querySelector('.nav__bar')
  if (bar instanceof HTMLElement) bar.inert = on
}

/** @param {HTMLElement} menu */
function focusable(menu) {
  return [...menu.querySelectorAll('a[href], button:not([disabled])')].filter((node) => node instanceof HTMLElement)
}

/** @param {KeyboardEvent} event @param {HTMLElement} menu */
function trapTab(event, menu) {
  const nodes = focusable(menu)
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === menu)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** @param {HTMLElement} header */
function openMenu(header) {
  const menu = header.querySelector('.nav-menu')
  const toggle = header.querySelector('[data-menu-open]')
  if (!(menu instanceof HTMLElement) || !menu.hasAttribute('hidden')) return
  menu.removeAttribute('hidden')
  if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', 'true')
  document.body.classList.add('has-overlay')
  document.dispatchEvent(new CustomEvent('panel:open', { detail: { source: 'menu' } }))
  menu.focus()
  setPageInert(true)
}

/**
 * @param {HTMLElement} header
 * @param {{ restoreFocus?: boolean }} [options]
 */
export function closeMenu(header, { restoreFocus = true } = {}) {
  const menu = header.querySelector('.nav-menu')
  if (!(menu instanceof HTMLElement) || menu.hasAttribute('hidden')) return
  menu.setAttribute('hidden', '')
  document.body.classList.remove('has-overlay')
  setPageInert(false)
  const toggle = header.querySelector('[data-menu-open]')
  if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', 'false')
  document.dispatchEvent(new CustomEvent('panel:close', { detail: { source: 'menu' } }))
  if (restoreFocus && toggle instanceof HTMLElement) toggle.focus()
}

/** @param {HTMLElement} header */
export function initNav(header) {
  header.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    if (event.target.closest('[data-menu-open]')) {
      event.preventDefault()
      openMenu(header)
      return
    }
    if (event.target.closest('[data-menu-close]')) {
      event.preventDefault()
      closeMenu(header)
    }
  })

  document.addEventListener('keydown', (event) => {
    const menu = header.querySelector('.nav-menu')
    if (!(menu instanceof HTMLElement) || menu.hasAttribute('hidden')) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(header)
      return
    }
    if (event.key === 'Tab') trapTab(event, menu)
  })
}
