import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { FourPlayerLayout, TwoPlayerLayout } from '../settings/preferences'

/**
 * Manual table layout for four (D-034) or two players (D-035). A device preference: choosing
 * applies, saves and closes; it never touches the game or its history. Rotation never chooses.
 */

/** A seat in the preview: panel box plus the edge its reader sits at. */
interface PreviewSeat {
  x: number
  y: number
  w: number
  h: number
  /** Where the player sits: the orientation mark hugs that edge. */
  facing: 'bottom' | 'top' | 'left' | 'right'
}

const GRID: PreviewSeat[] = [
  { x: 10, y: 8, w: 48, h: 30, facing: 'bottom' },
  { x: 62, y: 8, w: 48, h: 30, facing: 'bottom' },
  { x: 10, y: 42, w: 48, h: 30, facing: 'bottom' },
  { x: 62, y: 42, w: 48, h: 30, facing: 'bottom' },
]

/** One option of the selector: copy plus the schematic seats of its preview. */
export interface LayoutChoice<T extends string> {
  id: T
  name: string
  description: string
  seats: PreviewSeat[]
}

export const FOUR_PLAYER_CHOICES: ReadonlyArray<LayoutChoice<FourPlayerLayout>> = [
  { id: 'grid', name: 'Griglia', description: 'Tutti verso di te', seats: GRID },
  {
    id: 'facing',
    name: 'Fronte a fronte',
    description: 'Due per lato',
    seats: GRID.map((seat, index) => ({ ...seat, facing: index < 2 ? 'top' : 'bottom' })),
  },
  {
    id: 'table',
    name: 'Tavolo',
    description: 'Uno per bordo',
    // Player 1 bottom, 2 left, 3 top, 4 right; the centre stays free.
    seats: [
      { x: 32, y: 56, w: 56, h: 18, facing: 'bottom' },
      { x: 8, y: 14, w: 20, h: 52, facing: 'left' },
      { x: 32, y: 6, w: 56, h: 18, facing: 'top' },
      { x: 92, y: 14, w: 20, h: 52, facing: 'right' },
    ],
  },
]

export const TWO_PLAYER_CHOICES: ReadonlyArray<LayoutChoice<TwoPlayerLayout>> = [
  {
    id: 'same-side',
    name: 'Stesso lato',
    description: 'Tutti e due verso di te',
    seats: [
      { x: 10, y: 8, w: 48, h: 64, facing: 'bottom' },
      { x: 62, y: 8, w: 48, h: 64, facing: 'bottom' },
    ],
  },
  {
    id: 'facing',
    name: 'Fronte a fronte',
    description: 'Uno per lato',
    // Player 1 near the bottom edge, player 2 across the table.
    seats: [
      { x: 10, y: 42, w: 100, h: 30, facing: 'bottom' },
      { x: 10, y: 8, w: 100, h: 30, facing: 'top' },
    ],
  },
]

const ACCENTS = ['verdigris', 'gold', 'violet', 'ember'] as const

function mark(seat: PreviewSeat) {
  const inset = 3.5
  const cx = seat.x + seat.w / 2
  const cy = seat.y + seat.h / 2
  switch (seat.facing) {
    case 'bottom':
      return { x1: cx - 6, y1: seat.y + seat.h - inset, x2: cx + 6, y2: seat.y + seat.h - inset }
    case 'top':
      return { x1: cx - 6, y1: seat.y + inset, x2: cx + 6, y2: seat.y + inset }
    case 'left':
      return { x1: seat.x + inset, y1: cy - 6, x2: seat.x + inset, y2: cy + 6 }
    case 'right':
      return { x1: seat.x + seat.w - inset, y1: cy - 6, x2: seat.x + seat.w - inset, y2: cy + 6 }
  }
}

function LayoutPreview({ seats }: { seats: PreviewSeat[] }) {
  return (
    <svg className="layout-preview" viewBox="0 0 120 80" aria-hidden="true">
      <rect className="layout-preview__table" x="1" y="1" width="118" height="78" rx="7" />
      {seats.map((seat, index) => (
        <g key={index} className="layout-preview__seat" data-accent={ACCENTS[index]}>
          <rect x={seat.x} y={seat.y} width={seat.w} height={seat.h} rx="3" />
          <line {...mark(seat)} />
        </g>
      ))}
    </svg>
  )
}

interface LayoutOptionsProps<T extends string> {
  choices: ReadonlyArray<LayoutChoice<T>>
  value: T
  onChoose: (value: T) => void
}

/** Arrow keys, Home and End move between options (wrapping); Space or Enter chooses. */
const NEXT_INDEX: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

/**
 * Radio group with a roving tabindex: one Tab stop, arrows move focus without applying, because
 * a choice applies at once (D-034; shown inline in Altro since R1).
 */
export function LayoutOptions<T extends string>({ choices, value, onChoose }: LayoutOptionsProps<T>) {
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, choices.findIndex((choice) => choice.id === value)))
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = NEXT_INDEX[event.key]?.(index, choices.length)
    if (next === undefined) return
    event.preventDefault()
    setFocusIndex(next)
    optionRefs.current[next]?.focus()
  }

  return (
    <div className="layout-options" role="radiogroup" aria-label="Layout dei giocatori">
      {choices.map(({ id, name, description, seats }, index) => {
        const checked = id === value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            className="layout-option"
            data-layout={id}
            aria-checked={checked}
            aria-label={`${name}: ${description}`}
            tabIndex={index === focusIndex ? 0 : -1}
            ref={(element) => {
              optionRefs.current[index] = element
            }}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChoose(id)}
          >
            <LayoutPreview seats={seats} />
            <span className="layout-option__text">
              <span className="layout-option__name">{name}</span>
              <span className="layout-option__description">{description}</span>
              {checked && <span className="layout-option__selected">Selezionato</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
