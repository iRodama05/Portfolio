/**
 * @typedef {Object} Section
 * @property {string} id
 * @property {string} index
 * @property {string} kanji
 * @property {string} labelKey
 */

/** @type {readonly Section[]} */
export const sections = Object.freeze([
  { id: 'overview', index: '01', kanji: '観', labelKey: 'nav.overview' },
  { id: 'showroom', index: '02', kanji: '展', labelKey: 'nav.showroom' },
  { id: 'windows', index: '03', kanji: '窓', labelKey: 'nav.windows' },
  { id: 'manifesto', index: '04', kanji: '言', labelKey: 'nav.manifesto' },
])

/** @param {string} lang */
export function homePath(lang) {
  return `/${lang}`
}

/** @param {string} lang @param {string} id */
export function sectionPath(lang, id) {
  return `/${lang}#${id}`
}
