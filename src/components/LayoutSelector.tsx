import type { FourPlayerLayout } from '../settings/preferences'
import { FOUR_PLAYER_LAYOUTS } from '../settings/preferences'
import { ModalSideSheet } from './ModalSideSheet'

/**
 * Manual four-player layout (D-034). A device preference: choosing applies, saves and closes;
 * it never touches the game or its history. Rotation never chooses for the players.
 */

export const LAYOUT_COPY: Record<FourPlayerLayout, { name: string; description: string }> = {
  grid: { name: 'Griglia', description: 'Tutti verso di te' },
  facing: { name: 'Fronte a fronte', description: 'Due per lato' },
  table: { name: 'Tavolo', description: 'Uno per bordo' },
}

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

const PREVIEW_SEATS: Record<FourPlayerLayout, PreviewSeat[]> = {
  grid: GRID,
  facing: GRID.map((seat, index) => ({ ...seat, facing: index < 2 ? 'top' : 'bottom' })),
  // Player 1 bottom, 2 left, 3 top, 4 right; the centre stays free.
  table: [
    { x: 32, y: 56, w: 56, h: 18, facing: 'bottom' },
    { x: 8, y: 14, w: 20, h: 52, facing: 'left' },
    { x: 32, y: 6, w: 56, h: 18, facing: 'top' },
    { x: 92, y: 14, w: 20, h: 52, facing: 'right' },
  ],
}

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

function LayoutPreview({ layout }: { layout: FourPlayerLayout }) {
  return (
    <svg className="layout-preview" viewBox="0 0 120 80" aria-hidden="true">
      <rect className="layout-preview__table" x="1" y="1" width="118" height="78" rx="7" />
      {PREVIEW_SEATS[layout].map((seat, index) => (
        <g key={index} className="layout-preview__seat" data-accent={ACCENTS[index]}>
          <rect x={seat.x} y={seat.y} width={seat.w} height={seat.h} rx="3" />
          <line {...mark(seat)} />
        </g>
      ))}
    </svg>
  )
}

interface LayoutSelectorProps {
  open: boolean
  layout: FourPlayerLayout
  onChoose: (layout: FourPlayerLayout) => void
  onClose: () => void
}

export function LayoutSelector({ open, layout, onChoose, onClose }: LayoutSelectorProps) {
  return (
    <ModalSideSheet open={open} title="Layout dei giocatori" className="layout-sheet" onClose={onClose}>
      <div className="layout-options" role="radiogroup" aria-label="Layout dei giocatori">
        {FOUR_PLAYER_LAYOUTS.map((option) => {
          const { name, description } = LAYOUT_COPY[option]
          const checked = option === layout
          return (
            <button
              key={option}
              type="button"
              role="radio"
              className="layout-option"
              data-layout={option}
              aria-checked={checked}
              aria-label={`${name}: ${description}`}
              onClick={() => onChoose(option)}
            >
              <LayoutPreview layout={option} />
              <span className="layout-option__text">
                <span className="layout-option__name">{name}</span>
                <span className="layout-option__description">{description}</span>
                {checked && <span className="layout-option__selected">Selezionato</span>}
              </span>
            </button>
          )
        })}
      </div>
    </ModalSideSheet>
  )
}
