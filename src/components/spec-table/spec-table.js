import './spec-table.css'
import { escapeAttr, escapeHtml } from '../../scripts/sanitize.js'

/**
 * @param {{ label: string, value: string }[]} rows
 * @param {string} label
 */
export function specTableMarkup(rows, label) {
  if (!rows.length) return ''
  const body = rows.map((row) => {
    return `<div class="spec-table__row"><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`
  }).join('')
  return `<dl class="spec-table" aria-label="${escapeAttr(label)}">${body}</dl>`
}
