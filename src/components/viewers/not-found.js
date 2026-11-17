import '../ui/button.css'
import './viewers.css'
import { homePath } from '../../data/navigation.js'
import { getLang, t } from '../../scripts/i18n.js'
import { anchorAttrs, escapeHtml } from '../../scripts/sanitize.js'
import { sectionHeaderMarkup } from '../section-header/section-header.js'
import { cornerMarksMarkup } from '../ui/icons.js'

/** @param {HTMLElement} container */
export function renderNotFound(container) {
  const lang = getLang()
  container.innerHTML = `
    ${cornerMarksMarkup()}
    ${sectionHeaderMarkup({ index: '00', label: t('notFound.kicker'), kanji: '無', as: 'div' })}
    <h1 class="page-title" tabindex="-1">${escapeHtml(t('notFound.title'))}</h1>
    <p class="lede">${escapeHtml(t('notFound.lede'))}</p>
    <a class="btn btn--secondary not-found__back" ${anchorAttrs(homePath(lang))}>${escapeHtml(t('notFound.back'))}</a>
  `
}
