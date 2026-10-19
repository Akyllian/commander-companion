import type { ReactNode } from 'react'
import type { FourPlayerLayout } from '../settings/preferences'

/**
 * Presentation-only seat around a player panel (D-034). The wrapper is always rendered, so
 * switching layout never remounts the panel; CSS places the seat and turns its content.
 * Overlays opened from inside (dialogs, sheets) use the top layer or a portal and stay upright.
 */

export type Orientation = 0 | 90 | 180 | -90
export type SeatName = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'bottom' | 'left' | 'top' | 'right'

const GRID_SEATS: SeatName[] = ['top-start', 'top-end', 'bottom-start', 'bottom-end']
// Player 1 bottom, 2 left, 3 top, 4 right: each panel faces its own edge of the table.
const TABLE_SEATS: SeatName[] = ['bottom', 'left', 'top', 'right']

const ORIENTATIONS: Record<FourPlayerLayout, Orientation[]> = {
  grid: [0, 0, 0, 0],
  facing: [180, 180, 0, 0],
  table: [0, 90, 180, -90],
}

export function seatFor(layout: FourPlayerLayout, index: number): { seat: SeatName; orientation: Orientation } {
  return {
    seat: (layout === 'table' ? TABLE_SEATS : GRID_SEATS)[index] ?? 'top-start',
    orientation: ORIENTATIONS[layout][index] ?? 0,
  }
}

interface PlayerSeatProps {
  layout: FourPlayerLayout
  /** Zero-based cell position (a removed player's Undo bar keeps that player's index). */
  index: number
  children: ReactNode
}

export function PlayerSeat({ layout, index, children }: PlayerSeatProps) {
  const { seat, orientation } = seatFor(layout, index)
  return (
    <div className="player-seat" data-seat={seat} data-orientation={orientation}>
      <div className="player-seat__content">{children}</div>
    </div>
  )
}
