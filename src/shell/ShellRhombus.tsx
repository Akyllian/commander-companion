import type React from 'react'

interface ShellRhombusProps {
  expanded: boolean
  /** Id of the section navigation it reveals. */
  controlsId: string
  /** The coach label «Tocca ◇ per le sezioni», until the first use (R1 §13.2). */
  showHint: boolean
  /** `byKeyboard` is true for Enter/Space activation, so focus can move into the bar. */
  onToggle: (byKeyboard: boolean) => void
  buttonRef?: React.Ref<HTMLButtonElement>
  /** Placement inside the table, from the centre geometry (R1 Task 7). */
  style?: React.CSSProperties
}

/**
 * The central sigil (D-037, R1): a real 56px button, upright to the viewport, that reveals the
 * section bar during play. The diamond is drawn inside; the hit area stays square.
 */
export function ShellRhombus({ expanded, controlsId, showHint, onToggle, buttonRef, style }: ShellRhombusProps) {
  return (
    <div className="shell-rhombus-slot" style={style}>
      {/* Above the rhombus; silent, since the button already says «Mostra le sezioni». */}
      {showHint && (
        <p className="shell-rhombus__hint" aria-hidden="true">
          Tocca ◇ per le sezioni
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="shell-rhombus"
        aria-label={expanded ? 'Nascondi le sezioni' : 'Mostra le sezioni'}
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={(event) => onToggle(event.detail === 0)}
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
