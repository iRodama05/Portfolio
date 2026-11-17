/**
 * @typedef {Object} SocialLink
 * @property {string} label
 * @property {string} href
 */

/**
 * @typedef {Object} Localized
 * @property {string} es
 * @property {string} en
 */

/**
 * @typedef {Object} SpecEntry
 * @property {string} id
 * @property {string | string[] | Localized} value
 */

/**
 * @typedef {Object} HeroMetrics
 * @property {number} years
 * @property {number} commits
 */

export const profile = {
  alias: 'iRodamaa',
  kanji: '力',
  version: '0.2.1',
  year: 2026,
  available: true,
  mottoJa: '論理と美しさのために',
  motto: {
    es: 'Por la lógica y el buen diseño。',
    en: 'For the sake of logic and good design。',
  },
  email: '',
  /** @type {SpecEntry[]} */
  specs: [
    { id: 'role', value: { es: 'Ingeniero de software', en: 'Software engineer' } },
    { id: 'stack', value: 'JS · React · Node.js · Python · PostgreSQL' },
    { id: 'location', value: { es: 'Querétaro, México', en: 'Querétaro, Mexico' } },
    { id: 'focus', value: { es: 'Desarrollo web full-stack y APIs', en: 'Full-stack web & API systems' } },
  ],
  /** @type {HeroMetrics} */
  metrics: {
    years: 0,
    commits: 0,
  },
  /** @type {SocialLink[]} */
  socials: [],
}
