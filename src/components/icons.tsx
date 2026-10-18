/**
 * Canonical line-icon family (D-024): 24×24 viewBox, rounded 1.75px stroke, currentColor.
 * Colour comes from the material state (muted ivory, gold when available, teal when selected).
 */

export function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

export function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon button-icon--small">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Brand sigil: a framed four-point star with a gold heart — more intricate than utility icons. */
export function BrandSigil() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path className="brand-mark__frame" d="M24 5 43 24 24 43 5 24Z" />
      <circle className="brand-mark__ring" cx="24" cy="24" r="11.5" />
      <path className="brand-mark__star" d="M24 9.5 26.6 21.4 38.5 24 26.6 26.6 24 38.5 21.4 26.6 9.5 24 21.4 21.4Z" />
      <circle className="brand-mark__heart" cx="24" cy="24" r="3.2" />
    </svg>
  )
}
