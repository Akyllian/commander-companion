import { useEffect, useId, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'

interface ModalSideSheetProps {
  open: boolean
  title: string
  className?: string
  /** Element focused on open; defaults to the Close button. */
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  /** Injected for tests; defaults to native `<dialog>.showModal` detection. */
  supportsModal?: boolean
}

const nativeModal = () => typeof HTMLDialogElement !== 'undefined' && 'showModal' in HTMLDialogElement.prototype
const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'

/**
 * Modal side sheet for player details and the rules reference (spec 2026-10-18).
 * Native `<dialog>`: focus trap, inert background and Esc come from the browser.
 * Fallback: a portal with role="dialog", an inert app root and a manual Tab trap.
 * Focus starts on Close (or `initialFocusRef`) and returns to the opener.
 */
export function ModalSideSheet({
  open,
  title,
  className,
  initialFocusRef,
  onClose,
  children,
  supportsModal = nativeModal(),
}: ModalSideSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeHandlerRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    closeHandlerRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.getElementById('root')
    const dialog = dialogRef.current

    if (supportsModal && dialog) dialog.showModal()
    else root?.setAttribute('inert', '')
    ;(initialFocusRef?.current ?? closeRef.current)?.focus()

    const handleKey = (event: KeyboardEvent) => {
      const sheet = fallbackRef.current
      if (supportsModal || !sheet) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeHandlerRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      if (supportsModal) dialog?.close()
      else root?.removeAttribute('inert')
      opener?.focus()
    }
  }, [open, supportsModal, initialFocusRef])

  const content = (
    <>
      <header className="side-sheet__header">
        <h2 id={titleId}>{title}</h2>
        <button ref={closeRef} type="button" className="icon-button" aria-label="Chiudi" title="Chiudi" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="side-sheet__body">{children}</div>
    </>
  )

  const classes = ['side-sheet', className].filter(Boolean).join(' ')

  if (!supportsModal) {
    return open
      ? createPortal(
          <div ref={fallbackRef} className={classes} role="dialog" aria-modal="true" aria-labelledby={titleId} data-fallback="">
            {content}
          </div>,
          document.body,
        )
      : null
  }

  return (
    <dialog
      ref={dialogRef}
      className={classes}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: let React state close the sheet so focus restoration stays in one place.
        event.preventDefault()
        onClose()
      }}
    >
      {/* Kept mounted while closed so the exit transition has content (D-023). */}
      {content}
    </dialog>
  )
}
