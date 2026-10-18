import { useEffect, useState } from 'react'
import { GROUP_WINDOW_MS } from '../game/history'
import type { GroupTarget } from '../game/history'

export interface PanelDelta {
  target: GroupTarget
  delta: number
  at: number
}

export const targetsMatch = (left: GroupTarget, right: GroupTarget) => JSON.stringify(left) === JSON.stringify(right)

/** Temporary cumulative change ("+7") shown while a tap group is open (UX decision 3). */
export function DeltaBadge({ delta }: { delta: number }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), GROUP_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [])
  if (!visible || delta === 0) return null
  return (
    <span className="delta-badge" aria-hidden="true" data-testid="delta-badge">
      {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
    </span>
  )
}

/** The badge for `target`, remounted on every tap so its timer restarts. */
export function deltaFor(delta: PanelDelta | null, target: GroupTarget) {
  return delta && targetsMatch(delta.target, target) ? <DeltaBadge key={delta.at} delta={delta.delta} /> : null
}
