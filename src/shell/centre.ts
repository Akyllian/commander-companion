import type { Orientation } from '../components/PlayerSeat'

/**
 * Where the rhombus sits and which part of each card it touches (R1 design §5.2). Pure, so every
 * layout and responsive column count is tested with plain boxes; `useCentreLayout` measures them.
 */

export interface Point {
  x: number
  y: number
}

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** A side or corner of a card, in the card's own (unturned) frame. */
export type Clearance = 'top-start' | 'top' | 'top-end' | 'end' | 'bottom-end' | 'bottom' | 'bottom-start' | 'start'

export type Side = 'top' | 'bottom' | 'start' | 'end'

const inside = (point: Point, box: Box) => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom
const overlapsX = (a: Box, b: Box) => a.left < b.right && b.left < a.right
const overlapsY = (a: Box, b: Box) => a.top < b.bottom && b.top < a.bottom

/** Seams between `host` and its neighbours: the midpoint of each gap, above/below or beside it. */
function seamsAround(host: Box, panels: Box[], centre: Point): Point[] {
  return panels
    .filter((other) => other !== host)
    .flatMap((other): Point[] => {
      if (overlapsX(other, host) && other.bottom <= host.top) return [{ x: centre.x, y: (other.bottom + host.top) / 2 }]
      if (overlapsX(other, host) && other.top >= host.bottom) return [{ x: centre.x, y: (host.bottom + other.top) / 2 }]
      if (overlapsY(other, host) && other.right <= host.left) return [{ x: (other.right + host.left) / 2, y: centre.y }]
      if (overlapsY(other, host) && other.left >= host.right) return [{ x: (host.right + other.left) / 2, y: centre.y }]
      return []
    })
}

const zoneInside = (point: Point, reach: number, area: Box) =>
  point.x - reach >= area.left && point.x + reach <= area.right && point.y - reach >= area.top && point.y + reach <= area.bottom

/**
 * The centre of the table; when it falls inside a card (an odd stack or row), the nearest seam
 * between that card and a neighbour. When `firstScreen` is given and the 2·`reach` zone around
 * that point is not entirely on it (a tall portrait column), the first inner seam from the top
 * whose zone is (R1 §13.1). The point stays anchored in the document: it never follows scroll.
 */
export function rhombusPoint(grid: Box, panels: Box[], firstScreen?: Box, reach = 32): Point {
  const centre = { x: (grid.left + grid.right) / 2, y: (grid.top + grid.bottom) / 2 }
  const host = panels.find((panel) => inside(centre, panel))
  const around = host ? seamsAround(host, panels, centre) : []
  const distance = (point: Point) => Math.hypot(point.x - centre.x, point.y - centre.y)
  const point = around.length ? around.reduce((best, seam) => (distance(seam) < distance(best) ? seam : best)) : centre
  if (!firstScreen || zoneInside(point, reach, firstScreen)) return point

  const visible = panels
    .flatMap((panel) => seamsAround(panel, panels, centre))
    .filter((seam) => zoneInside(seam, reach, firstScreen))
    .toSorted((a, b) => a.y - b.y || a.x - b.x)
  return visible[0] ?? point
}

// Viewport side → the card's own side, for each turn of the card's content.
const TO_CARD: Record<Orientation, Record<'top' | 'bottom' | 'left' | 'right', Side>> = {
  0: { top: 'top', bottom: 'bottom', left: 'start', right: 'end' },
  180: { top: 'bottom', bottom: 'top', left: 'end', right: 'start' },
  90: { right: 'top', bottom: 'end', left: 'bottom', top: 'start' },
  [-90]: { left: 'top', top: 'end', right: 'bottom', bottom: 'start' },
}

/** The card side or corner the 2·`reach` free zone around `point` touches, or null. */
export function clearanceFor(panel: Box, point: Point, reach: number, orientation: Orientation): Clearance | null {
  const zone = { left: point.x - reach, top: point.y - reach, right: point.x + reach, bottom: point.y + reach }
  if (zone.right <= panel.left || zone.left >= panel.right || zone.bottom <= panel.top || zone.top >= panel.bottom) return null

  const sides: Array<'top' | 'bottom' | 'left' | 'right'> = []
  if (point.y <= panel.top) sides.push('top')
  else if (point.y >= panel.bottom) sides.push('bottom')
  if (point.x <= panel.left) sides.push('left')
  else if (point.x >= panel.right) sides.push('right')

  const card = sides.map((side) => TO_CARD[orientation][side])
  const vertical = card.find((side) => side === 'top' || side === 'bottom')
  const inline = card.find((side) => side === 'start' || side === 'end')
  if (vertical && inline) return `${vertical}-${inline}`
  return vertical ?? inline ?? null
}

export interface HintReserve {
  /** The card side, in its own frame, that keeps a text-free band for the coach label. */
  side: Side
  /** Band depth in px, measured from the card edge. */
  size: number
}

/**
 * The first-use label «Tocca ◇ per strumenti e sezioni» sits above the rhombus (R1 §13.2). A card the
 * label would cover keeps a band free of text and controls on the side facing it, so the label
 * never overlaps a name, a life total or a button. `offset` is the gap from the point to the
 * label's bottom edge (half the 56px rhombus plus 6px).
 */
export function hintReserve(
  panel: Box,
  point: Point,
  hint: { width: number; height: number },
  orientation: Orientation,
  offset = 34,
  margin = 4,
): HintReserve | null {
  const label = {
    left: point.x - hint.width / 2,
    right: point.x + hint.width / 2,
    bottom: point.y - offset,
    top: point.y - offset - hint.height,
  }
  if (label.right <= panel.left || label.left >= panel.right || label.bottom <= panel.top || label.top >= panel.bottom) return null
  if (panel.bottom <= point.y) return { side: TO_CARD[orientation].bottom, size: panel.bottom - label.top + margin }
  if (panel.right <= point.x) return { side: TO_CARD[orientation].right, size: panel.right - label.left + margin }
  if (panel.left >= point.x) return { side: TO_CARD[orientation].left, size: label.right - panel.left + margin }
  return null
}
