import { en } from '../locales/en.js'
import { es } from '../locales/es.js'

/** @typedef {'es' | 'en'} Lang */

export const SUPPORTED_LANGS = /** @type {const} */ (['es', 'en'])
const DICTS = { es, en }

/** @type {Lang} */
let lang = 'es'

/**
 * @param {unknown} value
 * @returns {value is Lang}
 */
export function isLang(value) {
  return SUPPORTED_LANGS.some((item) => item === value)
}

/** @returns {Lang} */
export function detectLang() {
  try {
    const stored = localStorage.getItem('lang')
    if (isLang(stored)) return stored
  } catch {
    /* private mode */
  }
  const candidate = (navigator.language || '').slice(0, 2).toLowerCase()
  if (isLang(candidate)) return candidate
  return 'es'
}

/** @returns {Lang} */
export function getLang() {
  return lang
}

/** @param {unknown} next */
export function setLang(next) {
  if (!isLang(next)) return
  lang = next
  document.documentElement.lang = next
  try {
    localStorage.setItem('lang', next)
  } catch {
    /* private mode */
  }
}

/** @param {string} key */
export function t(key) {
  const value = key.split('.').reduce((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return /** @type {Record<string, unknown>} */ (node)[part]
    }
    return undefined
  }, /** @type {unknown} */ (DICTS[lang]))
  return typeof value === 'string' ? value : key
}

/** @param {{ es?: string, en?: string } | null | undefined} obj */
export function pick(obj) {
  if (!obj) return ''
  const localized = obj[lang]
  if (typeof localized === 'string') return localized
  return typeof obj.es === 'string' ? obj.es : ''
}
