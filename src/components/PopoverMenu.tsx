import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export const nativePopover = () => typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype

const FOCUSABLE = 'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

const focusFirstControl = (panelId: string) =>
  document.getElementById(panelId)?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

interface PopoverMenuProps {
  /** Accessible name of the trigger and of the panel. */
  label: string
  /** Visible trigger content (icon and/or text). */
  trigger: ReactNode
  buttonClassName?: string
  /** Extra text for assistive technology, e.g. a notice count. */
  description?: string
  /** Receives `close`, which hides the panel and returns focus to the trigger. */
  children: (close: () => void) => ReactNode
  /** Injected for tests; defaults to native Popover API detection. */
  supportsPopover?: boolean
}

/**
 * Non-modal top-layer menu shared by Preferenze, Partita and Stato app (D-015, D-020).
 * Native Popover API: light dismiss on Esc and outside click, toggled by its button,
 * no clipping. Browsers without it get the same behavior from a fallback.
 * Opening moves focus to the first control inside; closing returns it to the trigger.
 */
export function PopoverMenu({
  label,
  trigger,
  buttonClassName,
  description,
  children,
  supportsPopover = nativePopover(),
}: PopoverMenuProps) {
  const id = useId()
  const buttonId = `${id}-button`
  const panelId = `${id}-panel`
  const descriptionId = `${id}-description`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // Uses ids rather than refs: it is handed to `children` during render.
  const close = () => {
    if (supportsPopover) document.getElementById(panelId)?.hidePopover?.()
    setOpen(false)
    document.getElementById(buttonId)?.focus()
  }

  // Fallback light dismiss: Esc and pointer down outside close the panel.
  useEffect(() => {
    if (supportsPopover || !open) return
    focusFirstControl(panelId)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handlePointer)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handlePointer)
    }
  }, [open, supportsPopover, panelId])

  // Native mode: DOM listeners, since these events do not bubble through React.
  // `beforetoggle` is synchronous, so the panel is anchored before it is painted. Anchoring by
  // its right edge needs no measurement; CSS max-width keeps it inside the viewport.
  useEffect(() => {
    const panel = panelRef.current
    if (!supportsPopover || !panel) return
    const handleBeforeToggle = (event: Event) => {
      const button = buttonRef.current?.getBoundingClientRect()
      if ((event as ToggleEvent).newState !== 'open' || !button) return
      panel.style.top = `${button.bottom + 8}px`
      panel.style.right = `${Math.max(8, document.documentElement.clientWidth - button.right)}px`
    }
    const handleToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === 'open'
      setOpen(isOpen)
      if (isOpen) focusFirstControl(panelId)
    }
    panel.addEventListener('beforetoggle', handleBeforeToggle)
    panel.addEventListener('toggle', handleToggle)
    return () => {
      panel.removeEventListener('beforetoggle', handleBeforeToggle)
      panel.removeEventListener('toggle', handleToggle)
    }
  }, [supportsPopover, panelId])

  return (
    <div className="popover-menu">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className={buttonClassName}
        title={label}
        aria-label={label}
        aria-controls={panelId}
        aria-describedby={description ? descriptionId : undefined}
        data-open={open || undefined}
        {...(supportsPopover
          ? { popoverTarget: panelId }
          : { 'aria-expanded': open, onClick: () => setOpen((current) => !current) })}
      >
        {trigger}
      </button>
      {description && (
        <span id={descriptionId} hidden>
          {description}
        </span>
      )}

      <div
        ref={panelRef}
        id={panelId}
        className="popover-panel"
        role="group"
        aria-label={label}
        {...(supportsPopover ? { popover: 'auto' as const } : { hidden: !open, 'data-fallback': '' })}
      >
        {children(close)}
      </div>
    </div>
  )
}
