import '../ui/button.css'
import './hero.css'
import { specTableMarkup } from '../spec-table/spec-table.js'
import { profile } from '../../data/profile.js'
import { projects } from '../../data/projects.js'
import { windowEntries } from '../../data/windows.meta.js'
import { sectionPath } from '../../data/navigation.js'
import { pick, t } from '../../scripts/i18n.js'
import { createDitherCanvas } from '../../scripts/dither-canvas.js'
import { anchorAttrs, escapeAttr, escapeHtml } from '../../scripts/sanitize.js'

/** @type {{ destroy: () => void } | null} */
let art = null

/** @param {number} value */
function formatCount(value) {
  const n = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
  return n < 100 ? String(n).padStart(2, '0') : String(n)
}

/** @param {string} id */
function specLabel(id) {
  const key = `hero.specs.${id}`
  const label = t(key)
  return label === key ? id : label
}

/** @param {string | string[] | { es?: string, en?: string }} value */
function formatSpec(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' · ')
  if (typeof value === 'string') return value
  return pick(value)
}

function specRows() {
  /** @type {{ label: string, value: string }[]} */
  const rows = []
  for (const spec of profile.specs) {
    const value = formatSpec(spec.value).trim()
    if (!value) continue
    rows.push({ label: specLabel(spec.id), value })
  }
  return rows
}

/** @param {string} value @param {string} label */
function metric(value, label) {
  return `<div class="hero__metric" role="listitem"><p class="hero__metric-value">${escapeHtml(value)}</p><p class="hero__metric-label">${escapeHtml(label)}</p></div>`
}

function socialNav() {
  if (!profile.socials.length) return ''
  const links = profile.socials.map((social) => {
    return `<a ${anchorAttrs(social.href)}><span>${escapeHtml(social.label)}</span><span class="hero__go" aria-hidden="true">↗</span></a>`
  }).join('')
  return `<nav class="hero__socials" aria-label="${escapeAttr(t('hero.socials'))}">${links}</nav>`
}

/** @param {string} lang */
function markup(lang) {
  const status = profile.available ? t('hero.available') : t('hero.unavailable')
  const dot = profile.available ? 'hero__dot' : 'hero__dot hero__dot--off'
  const japanese = profile.mottoJa
    ? `<span class="hero__subtitle-ja" lang="ja">${escapeHtml(profile.mottoJa)}</span>`
    : ''
  const metrics = [
    metric(formatCount(projects.length), t('hero.metrics.projects')),
    metric(formatCount(windowEntries.length), t('hero.metrics.windows')),
    metric(formatCount(profile.metrics.years), t('hero.metrics.years')),
    metric(formatCount(profile.metrics.commits), t('hero.metrics.commits')),
  ].join('')

  return `
    <div class="hero__copy">
      <p class="hero__status"><span class="${dot}" aria-hidden="true"></span><span><span lang="ja">${escapeHtml(profile.kanji)}</span> · ${escapeHtml(profile.alias)} · ${escapeHtml(status)}</span></p>
      <h1 class="hero__title" tabindex="-1">${escapeHtml(profile.alias)}</h1>
      <p class="hero__subtitle">${japanese}<span>${escapeHtml(pick(profile.motto))}</span></p>
      ${specTableMarkup(specRows(), t('hero.specsLabel'))}
      <div class="hero__metrics" role="list" aria-label="${escapeAttr(t('hero.metricsLabel'))}">${metrics}</div>
      <div class="hero__actions">
        <a class="btn btn--primary" ${anchorAttrs(sectionPath(lang, 'showroom'))}><span>${escapeHtml(t('hero.showroom'))}</span><span class="hero__go" aria-hidden="true">&gt;</span></a>
        <a class="btn btn--secondary" ${anchorAttrs(sectionPath(lang, 'windows'))}><span>${escapeHtml(t('hero.windows'))}</span><span class="hero__go" aria-hidden="true">&gt;</span></a>
      </div>
      ${socialNav()}
    </div>
    <div class="hero__stage">
      <div class="hero__field" aria-hidden="true">
        <svg class="hero__orbit" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"></circle>
        </svg>
        <span class="hero__kanji" lang="ja">京</span>
      </div>
      <canvas aria-hidden="true"></canvas>
    </div>
  `
}

export function unmountHero() {
  art?.destroy()
  art = null
}

/**
 * @param {HTMLElement} root
 * @param {{ lang: string }} state
 */
export function renderHero(root, { lang }) {
  unmountHero()
  root.innerHTML = markup(lang)
  const canvas = root.querySelector('canvas')
  if (!(canvas instanceof HTMLCanvasElement)) return
  art = createDitherCanvas(canvas, {
    src: '/images/hero-torii.png',
    cellSize: 2,
    influenceRadius: 176,
    lazy: false,
    interactive: 'auto',
  })
}
