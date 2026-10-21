import type React from 'react'

interface ShellRhombusProps {
  /** True while the hub or one of its tools is open (R2 §7). */
  expanded: boolean
  /** Id of the hub layer it opens. */
  controlsId: string
  /** The coach label «Tocca ◇ per strumenti e sezioni», until the first use (R1 §13.2, R2 §7.1). */
  showHint: boolean
  /** Hidden but still laid out, so the cards keep its reserved band (R2 §7.1). */
  hintDimmed?: boolean
  onToggle: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
  /** Placement inside the table, from the centre geometry (R1 Task 7). */
  style?: React.CSSProperties
}

/**
 * The central sigil (D-037, R1, R2 §7): a real 56px button, upright to the viewport, with one
 * meaning — open tools and sections. Open, it closes them. The diamond is drawn inside; the hit
 * area stays square.
 */
export function ShellRhombus({ expanded, controlsId, showHint, hintDimmed = false, onToggle, buttonRef, style }: ShellRhombusProps) {
  return (
    <div className="shell-rhombus-slot" style={style}>
      {/* Above the rhombus; silent, since the button already says what it opens. */}
      {showHint && (
        <p className="shell-rhombus__hint" aria-hidden="true" data-dimmed={hintDimmed || undefined}>
          Tocca ◇ per strumenti e sezioni
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="shell-rhombus"
        aria-label={expanded ? 'Chiudi strumenti' : 'Apri strumenti e sezioni'}
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={onToggle}
      >
        <svg viewBox="0 0 56 56" aria-hidden="true" className="shell-rhombus__art">
          <rect className="shell-rhombus__diamond" x="12" y="12" width="32" height="32" rx="5" transform="rotate(45 28 28)" />
          <rect className="shell-rhombus__inner" x="15.5" y="15.5" width="25" height="25" rx="3.5" transform="rotate(45 28 28)" />
          <path className="shell-rhombus__sigil" d="M28 18.5 30.4 25.6 37.5 28 30.4 30.4 28 37.5 25.6 30.4 18.5 28 25.6 25.6Z" />
        </svg>
      </button>
    </div>
  )
}
