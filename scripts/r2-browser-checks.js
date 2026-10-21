/**
 * R2 browser checks (D-039). Paste into the console of the running app on the Partita section,
 * at each viewport under review (320×568, 390×844, 640×400, 768×1024, 832×400, 844×390, 844×330,
 * 1440×900) and layout (Griglia, Fronte a fronte, Tavolo, 2 giocatori fronte a fronte), then run:
 *
 *   await r2CardChecks()   // cards, inner surfaces, hub, page overflow
 *   await r2ToolChecks()   // tools after a result: focus, containment, rhombus left free
 *
 * The page must be visible (a hidden tab renders no frames, so transitions never finish).
 * Expected: no `small`, `cardIssues` or `hubOutside` entries; `hscroll` false; `bodyFits` true in
 * landscape grid layouts (portrait columns and Tavolo scroll by design, D-034, D-038);
 * every tool `focus: 'back'`, `contained: true`, `overRhombus: false`, Mana `resetVisible: true`.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const inside = (el, box) => {
  const r = el.getBoundingClientRect()
  return r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5
}
const visible = (el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.sr-only,[hidden],dialog:not([open])')
}
const small = (root) =>
  [...root.querySelectorAll('button, a[href], input, summary')]
    .filter(visible)
    .filter((el) => el.getBoundingClientRect().width < 43.5 || el.getBoundingClientRect().height < 43.5)
    .map((el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 30))
const overlaps = (a, b) => !(a.left >= b.right || a.right <= b.left || a.top >= b.bottom || a.bottom <= b.top)
const offViewport = (el) => {
  const r = el.getBoundingClientRect()
  return r.left < 11.5 || r.top < 11.5 || r.right > innerWidth - 11.5 || r.bottom > innerHeight - 11.5
}

async function r2CardChecks() {
  const report = {
    vw: innerWidth,
    vh: innerHeight,
    layout: document.getElementById('main').dataset.layout,
    hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyFits: document.body.scrollHeight === window.innerHeight,
    smallClosed: small(document.getElementById('main')),
  }
  const rects = () =>
    [...document.querySelectorAll('.player-panel')]
      .map((p) => {
        const r = p.getBoundingClientRect()
        return [r.x + scrollX, r.y + scrollY, r.width, r.height].map(Math.round).join(',')
      })
      .join('|')
  const before = rects()
  const issues = []
  const cards = [...document.querySelectorAll('.player-panel')]
  for (const [i, card] of cards.entries()) {
    for (const kind of ['counters', 'commander']) {
      card.querySelector(`[data-surface-trigger="${kind}"]`).click()
      await wait(400)
      const d = card.querySelector('[data-drawer]:not([data-closing])')
      if (!d) {
        issues.push(`${i}:${kind}:missing`)
        continue
      }
      if (!inside(d, card.getBoundingClientRect())) issues.push(`${i}:${kind}:outside`)
      const s = small(d)
      if (s.length) issues.push(`${i}:${kind}:small ${s.join(';')}`)
      // Controls must sit inside the card in its own (unrotated) frame.
      const topIn = (el) => {
        let y = 0
        for (let n = el; n && n !== card; n = n.offsetParent) y += n.offsetTop
        return y
      }
      for (const b of [...d.querySelectorAll('button')].slice(0, 4)) {
        const y = topIn(b)
        if (y < -1 || y + b.offsetHeight > card.clientHeight + 1) issues.push(`${i}:${kind}:clipped`)
      }
      if (card.hasAttribute('data-short') && kind === 'counters') {
        const heights = [...d.querySelectorAll('.counter-column')].map((c) => Math.round(c.offsetHeight))
        if (heights.some((h) => h !== 123)) issues.push(`${i}:compact columns ${heights}`)
      }
      if (rects() !== before) issues.push(`${i}:${kind}:cards moved`)
      d.querySelector('.card-surface__close').click()
      await wait(200)
    }
  }
  report.cardIssues = issues
  document.querySelector('.shell-rhombus').click()
  await wait(300)
  const hub = document.getElementById('strumenti')
  report.hub = hub && hub.dataset.variant + (hub.dataset.quadrant ? `:${hub.dataset.quadrant}` : '')
  report.hubOutside = [...document.querySelectorAll('.rhombus-hub__action')].filter(offViewport).map((b) => b.textContent)
  report.hubMovedCards = rects() !== before
  document.querySelector('.shell-rhombus').click()
  await wait(200)
  return report
}

async function r2ToolChecks() {
  const out = { vw: innerWidth, vh: innerHeight, layout: document.getElementById('main').dataset.layout }
  for (const tool of ['dice', 'coin', 'mana']) {
    if (!document.getElementById('strumenti')) {
      document.querySelector('.shell-rhombus').click()
      await wait(300)
    }
    document.querySelector(`[data-action="${tool}"]`).click()
    await wait(400)
    const t = document.querySelector('.hub-tool')
    const focus = document.activeElement === t.querySelector('.hub-tool__back') ? 'back' : document.activeElement?.tagName
    if (tool === 'dice') t.querySelector('[aria-label="Lancia d20"]').click()
    if (tool === 'coin') [...t.querySelectorAll('button')].find((b) => b.textContent === 'Lancia moneta').click()
    if (tool === 'mana') t.querySelector('[aria-label="Aggiungi 1 mana Rosso"]').click()
    await wait(500)
    const box = t.getBoundingClientRect()
    const scroll = t.hasAttribute('data-scroll')
    const copiesOutside = [...t.querySelectorAll('.oriented-result__copy')].filter((c) => !inside(c, box)).length
    const reset = t.querySelector('.mana-tool__reset')
    out[tool] = {
      focus,
      size: [Math.round(box.width), Math.round(box.height)],
      scroll,
      contained: copiesOutside === 0 || scroll,
      overRhombus: overlaps(box, document.querySelector('.shell-rhombus').getBoundingClientRect()),
      offViewport: offViewport(t),
      small: small(t),
      resetVisible: reset ? inside(reset, box) : undefined,
    }
    t.querySelector('.hub-tool__back').click()
    await wait(300)
  }
  document.querySelector('.shell-rhombus').click()
  await wait(200)
  return out
}

Object.assign(window, { r2CardChecks, r2ToolChecks })
