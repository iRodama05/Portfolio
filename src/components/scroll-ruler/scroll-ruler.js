import './scroll-ruler.css'
import { sectionPath, sections } from '../../data/navigation.js'
import { t } from '../../scripts/i18n.js'
import { anchorAttrs, escapeAttr, escapeHtml } from '../../scripts/sanitize.js'

let overlays = 0
let frame = 0
let listening = false

/**
 * @param {HTMLElement} container
 * @param {{ lang: string }} state
 */
export function renderScrollRuler(container, { lang }) {
  const items = sections.map((section) => {
    const label = `${section.index} ${t(section.labelKey)}`
    return `<li><a class="ruler__link" ${anchorAttrs(sectionPath(lang, section.id))} data-section-link="${escapeAttr(section.id)}"><span class="ruler__label">${escapeHtml(label)}</span><span class="ruler__tick" aria-hidden="true"></span></a></li>`
  }).join('')

  const suppressed = overlays > 0 ? ' is-suppressed' : ''
  container.innerHTML = `<nav class="ruler${suppressed}" aria-label="${escapeAttr(t('ruler.label'))}"><div class="ruler__ticks" aria-hidden="true"></div><div class="ruler__spine" aria-hidden="true"></div><div class="ruler__progress" aria-hidden="true"></div><ol class="ruler__index">${items}</ol></nav>`
  syncScrollRuler()
}

export function syncScrollRuler() {
  const ruler = document.querySelector('.ruler')
  if (!(ruler instanceof HTMLElement)) return
  const max = document.documentElement.scrollHeight - window.innerHeight
  const progress = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max))
  ruler.style.setProperty('--scroll', progress.toFixed(4))
}

function scheduleSync() {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    syncScrollRuler()
  })
}

export function initScrollRuler() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', scheduleSync, { passive: true })
  window.addEventListener('resize', scheduleSync)
  document.addEventListener('panel:open', () => {
    overlays += 1
    document.querySelector('.ruler')?.classList.add('is-suppressed')
  })
  document.addEventListener('panel:close', () => {
    overlays = Math.max(0, overlays - 1)
    if (overlays === 0) document.querySelector('.ruler')?.classList.remove('is-suppressed')
  })
}
