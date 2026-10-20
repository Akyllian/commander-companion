import type { ReactNode } from 'react'
import type { FourPlayerLayout } from '../settings/preferences'
import type { Clearance, HintReserve } from '../shell/centre'
import type React from 'react'

/**
 * Presentation-only seat around a player panel (D-034). The wrapper is always rendered, so
 * switching layout never remounts the panel; CSS places the seat and turns its content.
 * Overlays opened from inside (dialogs, sheets) use the top layer or a portal and stay upright.
 */

/** The effective arrangement: a four-player layout, or `two-facing` for two players (D-035). */
export type TableLayout = FourPlayerLayout | 'two-facing'
export type Orientation = 0 | 90 | 180 | -90
export type SeatName = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'bottom' | 'left' | 'top' | 'right'

const GRID_SEATS: SeatName[] = ['top-start', 'top-end', 'bottom-start', 'bottom-end']
// Player 1 bottom, 2 left, 3 top, 4 right: each panel faces its own edge of the table.
const TABLE_SEATS: SeatName[] = ['bottom', 'left', 'top', 'right']

const SEATS: Record<TableLayout, SeatName[]> = {
  grid: GRID_SEATS,
  facing: GRID_SEATS,
  table: TABLE_SEATS,
  // Two players face to face reuse the side-by-side seats; only the opposite player turns (R1 §13.3).
  'two-facing': GRID_SEATS,
}

const ORIENTATIONS: Record<TableLayout, Orientation[]> = {
  grid: [0, 0, 0, 0],
  facing: [180, 180, 0, 0],
  table: [0, 90, 180, -90],
  'two-facing': [0, 180],
}

export function seatFor(layout: TableLayout, index: number): { seat: SeatName; orientation: Orientation } {
  return {
    seat: SEATS[layout][index] ?? 'top-start',
    orientation: ORIENTATIONS[layout][index] ?? 0,
  }
}

interface PlayerSeatProps {
  layout: TableLayout
  /** Zero-based cell position (a removed player's Undo bar keeps that player's index). */
  index: number
  /** The side or corner this card keeps free for the central rhombus (R1). */
  clear?: Clearance | null
  /** The band kept free for the first-use label above the rhombus (R1 §13.2). */
  hintReserve?: HintReserve | null
  /** True while the rhombus hub or a tool is open: the card can be neither tabbed to nor tapped (R2 §7.2). */
  inert?: boolean
  children: ReactNode
}

export function PlayerSeat({ layout, index, clear, hintReserve, inert = false, children }: PlayerSeatProps) {
  const { seat, orientation } = seatFor(layout, index)
  return (
    <div
      className="player-seat"
      data-seat={seat}
      data-orientation={orientation}
      data-clear={clear ?? undefined}
      data-hint-side={hintReserve?.side}
      inert={inert || undefined}
      style={hintReserve ? ({ '--hint-reserve': `${Math.ceil(hintReserve.size)}px` } as React.CSSProperties) : undefined}
    >
      <div className="player-seat__content">{children}</div>
    </div>
  )
}
