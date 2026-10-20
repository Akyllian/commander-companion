import { useCallback, useEffect, useState } from 'react'
import { GROUP_WINDOW_MS } from '../game/history'
import type { GroupDelta, GroupTarget } from '../game/history'

export type PanelDelta = Pick<GroupDelta, 'key' | 'target' | 'delta' | 'at'>

/** Fade-out after the stay; the CSS uses the same value (`--duration-delta-out`). */
export const DELTA_EXIT_MS = 160

export const targetsMatch = (left: GroupTarget, right: GroupTarget) => JSON.stringify(left) === JSON.stringify(right)

interface DeltaBadgeProps {
  /** Burst and tap this badge shows, handed back when it is gone. */
  id: string
  delta: number
  /** Latest tap of the burst: each new tap restarts the stay. */
  at: number
  /** False once the burst no longer concerns this value: the badge leaves at once. */
  active: boolean
  onGone: (id: string) => void
}

/**
 * Cumulative change ("+7") of one tap burst (UX decision 3, D-036). Mounted once per burst, so
 * only the number changes on later taps: enter once, stay 700 ms after the last tap, fade out.
 * Decorative: the settled value is announced elsewhere.
 */
function DeltaBadge({ id, delta, at, active, onGone }: DeltaBadgeProps) {
  const [exitFor, setExitFor] = useState<number | null>(null)
  const exiting = !active || exitFor === at

  useEffect(() => {
    if (exiting) {
      const timer = window.setTimeout(() => onGone(id), DELTA_EXIT_MS)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setExitFor(at), GROUP_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [at, exiting, id, onGone])

  return (
    <span className="delta-badge" data-phase={exiting ? 'exit' : undefined} aria-hidden="true" data-testid="delta-badge">
      {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
    </span>
  )
}

/**
 * The badge slot of one value. It remembers the last burst on `target`, so the badge can finish
 * its exit after the next burst moves to another value or player.
 */
export function DeltaSlot({ delta, target }: { delta: PanelDelta | null; target: GroupTarget }) {
  const match = delta && targetsMatch(delta.target, target) ? delta : null
  const [shown, setShown] = useState<PanelDelta | null>(match)
  // The last tap whose badge already left: the history keeps reporting it until the next action.
  const [dismissed, setDismissed] = useState<string | null>(null)
  const matchId = match && `${match.key}#${match.at}`
  // Stable, so re-renders from other taps never restart the exit timer.
  const clear = useCallback((id: string) => {
    setShown(null)
    setDismissed(id)
  }, [])
  if (match && matchId !== dismissed && (match.key !== shown?.key || match.at !== shown.at || match.delta !== shown.delta)) {
    setShown(match)
  }
  if (!shown || shown.delta === 0) return null
  return (
    <DeltaBadge
      key={shown.key}
      id={`${shown.key}#${shown.at}`}
      delta={shown.delta}
      at={shown.at}
      active={match?.key === shown.key}
      onGone={clear}
    />
  )
}

/** The badge for `target` in a panel. */
export function deltaFor(delta: PanelDelta | null, target: GroupTarget) {
  return <DeltaSlot delta={delta} target={target} />
}
