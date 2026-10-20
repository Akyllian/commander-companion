import { useEffect, useRef } from 'react'
import type React from 'react'
import { CoinIcon, DiceIcon, ManaIcon, SectionsIcon } from '../components/icons'
import type { Surface, SurfaceEvent, Tool } from '../match/surface'
import type { Point } from './centre'
import { largestQuadrant, placeMatrix, radialFits } from './hubGeometry'
import type { Insets, Rect } from './hubGeometry'

type Action = 'sections' | Tool

/** Stable map and tab order (R2 §7.2–7.3): above Sezioni, left Dadi, right Mana, below Moneta. */
const ACTIONS: Array<{ action: Action; label: string; Icon: () => React.JSX.Element }> = [
  { action: 'sections', label: 'Sezioni', Icon: SectionsIcon },
  { action: 'dice', label: 'Dadi', Icon: DiceIcon },
  { action: 'mana', label: 'Mana', Icon: ManaIcon },
  { action: 'coin', label: 'Moneta', Icon: CoinIcon },
]

interface RhombusHubProps {
  id: string
  surface: Surface
  /** Centre of the rhombus, in viewport pixels. */
  anchor: Point
  viewport: Rect
  insets: Insets
  /** After «Torna agli strumenti», focus goes back to the action that opened the tool. */
  returnFocusTo: Tool | null
  onEvent: (event: SurfaceEvent) => void
  onShowSections: () => void
  /** The open tool's panel, when the surface is a tool. */
  tool?: React.ReactNode
  /** The layer's single polite announcement (dice, coin, mana reset). */
  announcement: string
}

function HubActions({
  style,
  returnFocusTo,
  onEvent,
  onShowSections,
}: Pick<RhombusHubProps, 'returnFocusTo' | 'onEvent' | 'onShowSections'> & { style?: React.CSSProperties }) {
  const groupRef = useRef<HTMLDivElement>(null)
  // On open the focus goes to Sezioni; back from a tool, to that tool's action (R2 §7.4, §8).
  useEffect(() => {
    groupRef.current?.querySelector<HTMLElement>(`[data-action="${returnFocusTo ?? 'sections'}"]`)?.focus()
  }, [returnFocusTo])
  return (
    <div ref={groupRef} className="rhombus-hub__actions" style={style} role="group" aria-label="Strumenti e sezioni">
      {ACTIONS.map(({ action, label, Icon }) => (
        <button
          key={action}
          type="button"
          className="rhombus-hub__action"
          data-action={action}
          onClick={() => (action === 'sections' ? onShowSections() : onEvent({ type: 'open', surface: { kind: 'tool', tool: action } }))}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * The rhombus layer (R2 §7–8): screen-oriented, non-modal, no scrim. The radial is primary; the
 * 2×2 matrix appears only when the radial does not fit. A transparent dismiss layer under it closes
 * the hub on a tap outside and consumes that tap, so no card control underneath is activated.
 */
export function RhombusHub({ id, surface, anchor, viewport, insets, returnFocusTo, onEvent, onShowSections, tool, announcement }: RhombusHubProps) {
  const radial = radialFits(anchor, viewport, insets)
  const quadrant = radial ? null : largestQuadrant(anchor, viewport, insets)
  // The matrix sits in its quadrant but never past the margins; offsets are from the rhombus.
  const matrix = quadrant && placeMatrix(anchor, quadrant, viewport, insets)
  const matrixStyle = matrix ? { left: matrix.x - anchor.x, top: matrix.y - anchor.y } : undefined
  return (
    <>
      <div
        className="hub-dismiss"
        data-hub-dismiss=""
        aria-hidden="true"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onEvent({ type: 'close' })
        }}
      />
      <div
        id={id}
        className="rhombus-hub"
        data-variant={radial ? 'radial' : 'grid'}
        data-quadrant={quadrant ?? undefined}
        data-surface={surface.kind}
        style={{ left: anchor.x, top: anchor.y }}
      >
        {surface.kind === 'tool' ? tool : <HubActions style={matrixStyle} returnFocusTo={returnFocusTo} onEvent={onEvent} onShowSections={onShowSections} />}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </div>
    </>
  )
}
