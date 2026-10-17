import { useEffect, useRef, useState } from 'react'

export const UNDO_BAR_DURATION_MS = 6000

interface UndoBarProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

/**
 * Inline undo shown in the grid cell of the removed player (UX review 2, point 3):
 * it keeps spatial context and never covers controls. The timer pauses while its
 * button has keyboard focus (WCAG 2.2.1); the global Undo stays available after.
 */
export function UndoBar({ message, onUndo, onDismiss }: UndoBarProps) {
  const [paused, setPaused] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    // The remove button just disappeared: keep keyboard focus here instead of losing it to <body>.
    if (document.activeElement === document.body) barRef.current?.focus()
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => dismissRef.current(), UNDO_BAR_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [paused])

  return (
    <div ref={barRef} className="undo-bar" role="status" tabIndex={-1}>
      <span>{message}</span>
      <button type="button" onClick={onUndo} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        Annulla
      </button>
    </div>
  )
}
