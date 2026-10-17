import { useEffect, useRef, useState } from 'react'

export const SNACKBAR_DURATION_MS = 6000

interface UndoSnackbarProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

/**
 * Temporary confirmation with an Undo action (UX decision 2). It never takes focus;
 * the timer pauses while its button has keyboard focus (WCAG 2.2.1).
 * The global Undo remains available after it disappears.
 */
export function UndoSnackbar({ message, onUndo, onDismiss }: UndoSnackbarProps) {
  const [paused, setPaused] = useState(false)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => dismissRef.current(), SNACKBAR_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [paused])

  return (
    <div className="undo-snackbar" role="status">
      <span>{message}</span>
      <button type="button" onClick={onUndo} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        Annulla
      </button>
    </div>
  )
}
