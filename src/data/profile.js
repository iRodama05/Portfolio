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
  version: '0.2.0',
  year: 2026,
  available: true,
  mottoJa: '静けさの構造',
  motto: {
    es: 'La estructura del silencio.',
    en: 'The structure of silence.',
  },
  email: '',
  /** @type {SpecEntry[]} */
  specs: [
    { id: 'role', value: { es: 'Ingeniero de software', en: 'Software engineer' } },
    { id: 'stack', value: 'JavaScript' },
    { id: 'location', value: { es: '', en: '' } },
    { id: 'focus', value: { es: 'Interfaz y herramientas', en: 'Interface and tools' } },
  ],
  /** @type {HeroMetrics} */
  metrics: {
    years: 0,
    commits: 0,
  },
  /** @type {SocialLink[]} */
  socials: [],
}
