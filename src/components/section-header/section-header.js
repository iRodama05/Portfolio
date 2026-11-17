import './section-header.css'
import { escapeHtml } from '../../scripts/sanitize.js'

/**
 * @param {{ index: string, label: string, kanji: string, as?: 'h2' | 'div' }} props
 */
export function sectionHeaderMarkup({ index, label, kanji, as = 'h2' }) {
  const tag = as === 'div' ? 'div' : 'h2'
  const focus = tag === 'h2' ? ' tabindex="-1"' : ''
  return `<${tag} class="section-header"${focus}><span class="section-header__label">${escapeHtml(index)} // ${escapeHtml(label)}</span><span class="section-header__rule" aria-hidden="true"><span class="section-header__plus">+</span></span><span class="section-header__kanji" lang="ja">${escapeHtml(kanji)}</span></${tag}>`
}
