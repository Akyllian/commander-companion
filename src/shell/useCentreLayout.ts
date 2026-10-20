import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Orientation } from '../components/PlayerSeat'
import { clearanceFor, rhombusPoint } from './centre'
import type { Clearance, Point } from './centre'

/** Half of the 64px free zone around the rhombus (R1 design §5.2). */
export const CENTRE_REACH = 32

export interface CentreLayout {
  /** Rhombus centre relative to the grid, or null before the first measurement. */
  point: Point | null
  /** Per seat, in DOM order: the side or corner it keeps free for the rhombus. */
  clearances: Array<Clearance | null>
}

const EMPTY: CentreLayout = { point: null, clearances: [] }

/**
 * Measures the table and its seats whenever they resize, so the rhombus and the free zone follow
 * every layout, density and column count without layout-specific code.
 */
export function useCentreLayout(gridRef: RefObject<HTMLElement | null>, key: string): CentreLayout {
  const [layout, setLayout] = useState<CentreLayout>(EMPTY)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const area = grid.getBoundingClientRect()
      if (area.width === 0 || area.height === 0) return
      const seats = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .player-seat'))
      const boxes = seats.map((seat) => seat.getBoundingClientRect())
      const point = rhombusPoint(area, boxes)
      const next: CentreLayout = {
        point: { x: point.x - area.left, y: point.y - area.top },
        clearances: boxes.map((box, index) =>
          clearanceFor(box, point, CENTRE_REACH, Number(seats[index].dataset.orientation ?? 0) as Orientation),
        ),
      }
      setLayout((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    // Turned seats can change size while the grid keeps its own.
    grid.querySelectorAll(':scope > .player-seat').forEach((seat) => observer.observe(seat))
    return () => observer.disconnect()
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `key` re-measures after a layout, count, density or section change.
  }, [gridRef, key])

  return layout
}
