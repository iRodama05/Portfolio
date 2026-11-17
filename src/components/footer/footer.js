import '../ui/chip.css'
import './footer.css'
import { homePath, sectionPath, sections } from '../../data/navigation.js'
import { profile } from '../../data/profile.js'
import { projects } from '../../data/projects.js'
import { pick, t } from '../../scripts/i18n.js'
import { anchorAttrs, escapeAttr, escapeHtml } from '../../scripts/sanitize.js'
import { cornerMarksMarkup } from '../ui/icons.js'

/** @param {string} [className] */
function versionChip(className = '') {
  const classes = className ? `chip ${className}` : 'chip'
  return `<span class="${classes}"><span class="chip__mark" aria-hidden="true"></span><span class="sr-only">${escapeHtml(t('nav.version'))} </span><span>v${escapeHtml(profile.version)}</span></span>`
}

/** @param {string} lang */
function projectList(lang) {
  if (!projects.length) {
    return `<p class="footer__empty"><span aria-hidden="true">—</span><span class="sr-only">${escapeHtml(t('footer.empty'))}</span></p>`
  }
  return `<ul>${projects.map((project) => {
    const href = `/${lang}/projects/${project.slug}`
    return `<li><a ${anchorAttrs(href)}><span>${escapeHtml(pick(project.title))}</span><span class="footer__go" aria-hidden="true">&gt;</span></a></li>`
  }).join('')}</ul>`
}

/** @param {string} lang */
function contactList(lang) {
  /** @type {string[]} */
  const items = []
  if (profile.email) {
    const label = profile.email.replace(/^mailto:/i, '')
    items.push(`<li><a class="footer__literal" ${anchorAttrs(profile.email)}><span>${escapeHtml(label)}</span></a></li>`)
  }
  for (const social of profile.socials) {
    items.push(`<li><a ${anchorAttrs(social.href)}><span>${escapeHtml(social.label)}</span><span class="footer__go footer__go--out" aria-hidden="true">↗</span></a></li>`)
  }
  if (!items.length) {
    return `<p class="footer__empty"><span aria-hidden="true">—</span><span class="sr-only">${escapeHtml(t('footer.noContact'))}</span></p>`
  }
  return `<ul>${items.join('')}</ul>`
}

/**
 * @param {HTMLElement} footer
 * @param {{ lang: string }} state
 */
export function renderFooter(footer, { lang }) {
  const explore = sections.map((section) => {
    const label = `${section.index}  ${t(section.labelKey)}`
    return `<li><a ${anchorAttrs(sectionPath(lang, section.id))} data-section-link="${escapeAttr(section.id)}"><span>${escapeHtml(label)}</span><span class="footer__go" aria-hidden="true">&gt;</span></a></li>`
  }).join('')

  const rights = `© ${profile.year} ${profile.alias} · ${profile.kanji}`
  const markChars = Math.max(profile.alias.length, 1)

  footer.className = 'site-footer'
  footer.innerHTML = `
    <div class="footer__top">
      ${cornerMarksMarkup()}
      <div class="footer__brand">
        <a class="footer__id" ${anchorAttrs(homePath(lang))}>
          <span class="footer__kanji" lang="ja">${escapeHtml(profile.kanji)}</span>
          <span class="footer__alias">${escapeHtml(profile.alias)}</span>
        </a>
        <p class="footer__motto">
          <span class="footer__motto-ja" lang="ja">${escapeHtml(profile.mottoJa)}</span>
          <span>${escapeHtml(pick(profile.motto))}</span>
        </p>
        ${versionChip()}
      </div>
      <nav class="footer__col" aria-label="${escapeAttr(t('footer.explore'))}">
        <h2>${escapeHtml(t('footer.explore'))}</h2>
        <ul>${explore}</ul>
      </nav>
      <nav class="footer__col" aria-label="${escapeAttr(t('footer.projects'))}">
        <h2>${escapeHtml(t('footer.projects'))}</h2>
        ${projectList(lang)}
      </nav>
      <nav class="footer__col" id="contacto" aria-label="${escapeAttr(t('footer.contact'))}">
        <h2 tabindex="-1">${escapeHtml(t('footer.contact'))}</h2>
        ${contactList(lang)}
      </nav>
    </div>
    <p class="footer__mark" style="--mark-chars: ${markChars}" aria-hidden="true">${escapeHtml(profile.alias)}</p>
    <div class="footer__base">
      <p>${escapeHtml(rights)}</p>
      <p>${escapeHtml(t('footer.dither'))}</p>
      <p>${escapeHtml(t('footer.truth'))}</p>
    </div>
  `
  fitFooterMark(footer)
}

/** @type {ResizeObserver | null} */
let markObserver = null
let markWidth = 0

/** @param {HTMLElement} el */
function fitMark(el) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const styles = getComputedStyle(el)
  const available = el.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
  const ink = range.getBoundingClientRect().width
  const current = parseFloat(styles.fontSize)
  if (available <= 0 || ink <= 0 || !Number.isFinite(current)) return
  const next = current * ((available * 0.98) / ink)
  if (Math.abs(next - current) < 0.5) return
  el.style.fontSize = `${next.toFixed(2)}px`
}

/** @param {HTMLElement} footer */
function fitFooterMark(footer) {
  const el = footer.querySelector('.footer__mark')
  if (!(el instanceof HTMLElement)) return

  const run = () => {
    fitMark(el)
    fitMark(el)
  }

  run()
  document.fonts.ready.then(run).catch(() => {})

  markObserver?.disconnect()
  markWidth = 0
  markObserver = new ResizeObserver((entries) => {
    const width = Math.round(entries[0]?.contentRect.width ?? 0)
    if (!width || width === markWidth) return
    markWidth = width
    run()
  })
  markObserver.observe(footer)
}
