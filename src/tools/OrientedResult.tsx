import type React from 'react'
import type { TableLayout } from '../components/PlayerSeat'
import { resultOrientations } from './random'

/**
 * A tool result readable from every seat (R2 §8.1): one upright copy, plus turned copies for the
 * players facing other edges. The turned copies repeat the same information, so they are hidden
 * from assistive technology; the hub's live region speaks the result once.
 */
export function OrientedResult({ layout, children }: { layout: TableLayout; children: React.ReactNode }) {
  const orientations = resultOrientations(layout)
  return (
    <div className="oriented-result" data-copies={orientations.length}>
      {orientations.map((orientation) => (
        <span key={orientation} className="oriented-result__copy" data-orientation={orientation} aria-hidden={orientation !== 0 || undefined}>
          {children}
        </span>
      ))}
    </div>
  )
}
