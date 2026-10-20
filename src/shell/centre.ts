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

type Side = 'top' | 'bottom' | 'start' | 'end'

const inside = (point: Point, box: Box) => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom
const overlapsX = (a: Box, b: Box) => a.left < b.right && b.left < a.right

/** The centre of the table; when it falls inside a card (odd stacks), the nearest seam of that card. */
export function rhombusPoint(grid: Box, panels: Box[]): Point {
  const centre = { x: (grid.left + grid.right) / 2, y: (grid.top + grid.bottom) / 2 }
  const host = panels.find((panel) => inside(centre, panel))
  if (!host) return centre
  const seams = panels
    .filter((other) => other !== host && overlapsX(other, host))
    .flatMap((other) => {
      if (other.bottom <= host.top) return [(other.bottom + host.top) / 2]
      if (other.top >= host.bottom) return [(host.bottom + other.top) / 2]
      return []
    })
  if (seams.length === 0) return centre
  const y = seams.reduce((best, seam) => (Math.abs(seam - centre.y) < Math.abs(best - centre.y) ? seam : best))
  return { x: centre.x, y }
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
