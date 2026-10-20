import type { Point } from './centre'

/**
 * Where the rhombus hub and its tool panels go (R2 §7.3, §8). Pure, in viewport pixels: the radial
 * is used only when its whole square fits inside the viewport minus a 12px margin and the safe
 * area; otherwise the 2×2 fallback opens in the largest free quadrant. Tool panels are centred on
 * the rhombus and translated (never the rhombus) until they fit; a panel larger than the free
 * area is clamped to it and scrolls inside, never the page.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export type Quadrant = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

export const RADIAL_SIZE = 228
export const VIEWPORT_MARGIN = 12

/** The viewport minus the margin and the safe-area insets. */
export function safeRect(viewport: Rect, insets: Insets): Rect {
  const x = viewport.x + VIEWPORT_MARGIN + insets.left
  const y = viewport.y + VIEWPORT_MARGIN + insets.top
  return {
    x,
    y,
    width: viewport.width - 2 * VIEWPORT_MARGIN - insets.left - insets.right,
    height: viewport.height - 2 * VIEWPORT_MARGIN - insets.top - insets.bottom,
  }
}

export function radialFits(centre: Point, viewport: Rect, insets: Insets): boolean {
  const safe = safeRect(viewport, insets)
  const half = RADIAL_SIZE / 2
  return (
    centre.x - half >= safe.x &&
    centre.y - half >= safe.y &&
    centre.x + half <= safe.x + safe.width &&
    centre.y + half <= safe.y + safe.height
  )
}

export function largestQuadrant(centre: Point, viewport: Rect, insets: Insets): Quadrant {
  const safe = safeRect(viewport, insets)
  const before = { x: centre.x - safe.x, y: centre.y - safe.y }
  const after = { x: safe.x + safe.width - centre.x, y: safe.y + safe.height - centre.y }
  const areas: Array<[Quadrant, number]> = [
    ['top-start', before.x * before.y],
    ['top-end', after.x * before.y],
    ['bottom-start', before.x * after.y],
    ['bottom-end', after.x * after.y],
  ]
  return areas.reduce((best, area) => (area[1] > best[1] ? area : best))[0]
}

/** Clamps one axis: start position and length inside [min, min + room]. */
function fitAxis(desired: number, length: number, min: number, room: number) {
  if (length > room) return { start: min, length: room, clamped: true, scroll: true }
  const start = Math.min(Math.max(desired, min), min + room - length)
  return { start, length, clamped: start !== desired, scroll: false }
}

export function placePanel(
  centre: Point,
  size: { width: number; height: number },
  viewport: Rect,
  insets: Insets,
): { rect: Rect; translated: boolean; scroll: boolean } {
  const safe = safeRect(viewport, insets)
  const x = fitAxis(centre.x - size.width / 2, size.width, safe.x, safe.width)
  const y = fitAxis(centre.y - size.height / 2, size.height, safe.y, safe.height)
  return {
    rect: { x: x.start, y: y.start, width: x.length, height: y.length },
    translated: x.clamped || y.clamped,
    scroll: x.scroll || y.scroll,
  }
}

/** The 2×2 fallback: cells of 64 × 56px with 6px gaps (R2 §7.3). */
export const MATRIX_SIZE = { width: 2 * 64 + 6, height: 2 * 56 + 6 }
/** Distance from the rhombus centre to the matrix: past the 56px rhombus, room for the hairline. */
const MATRIX_GAP = 40

/** Top-left of the 2×2 matrix: in its quadrant beside the rhombus, then kept inside the safe area. */
export function placeMatrix(centre: Point, quadrant: Quadrant, viewport: Rect, insets: Insets): Point {
  const safe = safeRect(viewport, insets)
  const x = quadrant.endsWith('end') ? centre.x + MATRIX_GAP : centre.x - MATRIX_GAP - MATRIX_SIZE.width
  const y = quadrant.startsWith('bottom') ? centre.y + MATRIX_GAP : centre.y - MATRIX_GAP - MATRIX_SIZE.height
  return {
    x: fitAxis(x, MATRIX_SIZE.width, safe.x, safe.width).start,
    y: fitAxis(y, MATRIX_SIZE.height, safe.y, safe.height).start,
  }
}
