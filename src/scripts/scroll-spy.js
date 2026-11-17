/** @type {(id: string) => void} */
let notify = () => {}
let frame = 0

function lineY() {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop
  const nav = Number.parseFloat(raw)
  return (Number.isFinite(nav) ? nav : 64) + 8
}

export function refreshScrollSpy() {
  const line = lineY()
  let next = ''
  document.querySelectorAll('[data-section]').forEach((node) => {
    if (!(node instanceof HTMLElement) || node.hidden) return
    if (node.getBoundingClientRect().top <= line) next = node.id
  })
  if (!next) {
    const first = document.querySelector('[data-section]:not([hidden])')
    if (first instanceof HTMLElement) next = first.id
  }
  if (next) notify(next)
}

/** @param {(id: string) => void} onChange */
export function initScrollSpy(onChange) {
  notify = onChange
  const schedule = () => {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      refreshScrollSpy()
    })
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  refreshScrollSpy()
  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) window.cancelAnimationFrame(frame)
  }
}

/** @param {string} id */
export function setActiveSection(id) {
  document.querySelectorAll('[data-section-link]').forEach((node) => {
    if (node.getAttribute('data-section-link') === id) node.setAttribute('aria-current', 'location')
    else node.removeAttribute('aria-current')
  })
}
