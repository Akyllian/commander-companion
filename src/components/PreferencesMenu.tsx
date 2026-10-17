import { useEffect, useId, useRef, useState } from 'react'
import type { Preferences } from '../settings/preferences'

interface PreferencesMenuProps {
  preferences: Preferences
  onChange: (preferences: Preferences) => void
  /** Injected for tests; defaults to native Popover API detection. */
  supportsPopover?: boolean
}

const nativePopover = () => typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Non-modal preferences popover in the match controls (UX review 2, point 4).
 * Native Popover API: top layer (no clipping), light dismiss on Esc and outside click,
 * toggled by its button. Browsers without it get the same behavior from a fallback.
 */
export function PreferencesMenu({ preferences, onChange, supportsPopover = nativePopover() }: PreferencesMenuProps) {
  const id = useId()
  const panelId = `${id}-preferences`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // Fallback light dismiss: Esc and pointer down outside close the panel.
  useEffect(() => {
    if (supportsPopover || !open) return
    const close = () => setOpen(false)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handlePointer)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handlePointer)
    }
  }, [open, supportsPopover])

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
    const handleToggle = (event: Event) => setOpen((event as ToggleEvent).newState === 'open')
    panel.addEventListener('beforetoggle', handleBeforeToggle)
    panel.addEventListener('toggle', handleToggle)
    return () => {
      panel.removeEventListener('beforetoggle', handleBeforeToggle)
      panel.removeEventListener('toggle', handleToggle)
    }
  }, [supportsPopover])

  return (
    <div className="preferences-menu">
      <button
        ref={buttonRef}
        type="button"
        className="preferences-button"
        title="Preferenze"
        aria-label="Preferenze"
        aria-controls={panelId}
        data-open={open || undefined}
        {...(supportsPopover
          ? { popoverTarget: panelId }
          : { 'aria-expanded': open, onClick: () => setOpen((current) => !current) })}
      >
        <GearIcon />
        <span>Preferenze</span>
      </button>

      <div
        ref={panelRef}
        id={panelId}
        className="preferences-panel"
        role="group"
        aria-label="Preferenze"
        {...(supportsPopover
          ? { popover: 'auto' as const }
          : { hidden: !open, 'data-fallback': '' })}
      >
        <label className="check-option">
          <input
            type="checkbox"
            checked={preferences.keepScreenOn}
            onChange={(event) => onChange({ ...preferences, keepScreenOn: event.currentTarget.checked })}
          />
          <span>Mantieni lo schermo acceso</span>
        </label>
      </div>
    </div>
  )
}
