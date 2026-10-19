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

/* Score dock icons (D-033): same 24×24 rounded line family, no emoji or Unicode glyphs. */

export function LifeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  )
}

export function CommanderDamageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </svg>
  )
}

export function PoisonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12 3s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  )
}

export function EnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M13 3 6 13.5h5L10 21l8-11h-5.5L13 3Z" />
    </svg>
  )
}

export function ExperienceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m12 8 1.4 2.6L16 12l-2.6 1.4L12 16l-1.4-2.6L8 12l2.6-1.4L12 8Z" />
    </svg>
  )
}

export function RadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <circle cx="12" cy="12" r="1.75" />
      <path d="M12 9.5 9 4.3A8.5 8.5 0 0 0 4.3 12.5h6" />
      <path d="M12 9.5 15 4.3a8.5 8.5 0 0 1 4.7 8.2h-6" />
      <path d="m13.3 14.2 3 5.2a8.5 8.5 0 0 1-8.6 0l3-5.2" />
    </svg>
  )
}

export function TaxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13L4 8Z" />
      <path d="M5.5 21h13" />
    </svg>
  )
}

export function InitiativeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M12 3c2.5 2.6 3.5 4.6 3.5 6.5a3.5 3.5 0 0 1-7 0c0-1.2.5-2.3 1.3-3.2.3 1.2 1 1.9 1.9 2.2-.3-1.9 0-3.7.3-5.5Z" />
      <path d="M9 13h6l-1.5 8h-3L9 13Z" />
    </svg>
  )
}
