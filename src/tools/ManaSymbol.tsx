import type { ManaType } from './mana'

/**
 * The six mana symbols (R2 review): local line drawings in the app's stroke style, the one
 * coloured exception to F34. Shape and colour both tell the types apart; the names are spoken
 * by the controls, so the symbols are decorative.
 */
const PATHS: Record<ManaType, React.ReactNode> = {
  // Sun: disc and eight rays.
  W: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  // Drop.
  U: <path d="M12 3c3.2 4 5.6 7.2 5.6 10.4a5.6 5.6 0 0 1-11.2 0C6.4 10.2 8.8 7 12 3Z" />,
  // Skull: cranium, two eyes, jaw.
  B: (
    <>
      <path d="M6 15.5c-1.3-1.1-2-2.9-2-5A8 8 0 0 1 20 10.5c0 2.1-.7 3.9-2 5V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3.5Z" />
      <circle cx="9" cy="11.5" r="1.7" />
      <circle cx="15" cy="11.5" r="1.7" />
      <path d="M10 20v-2.5M14 20v-2.5" />
    </>
  ),
  // Flame.
  R: <path d="M12 3c.6 3 3.1 4.6 4.6 7a6 6 0 1 1-10.1.8c.9 1.4 2 2 3 2.1-.6-3.4.6-6.8 2.5-9.9Z" />,
  // Tree: canopy and trunk.
  G: (
    <>
      <path d="M12 3.5 6 12.5h3.2L6.5 17h11l-2.7-4.5H18L12 3.5Z" />
      <path d="M12 17v3.5" />
    </>
  ),
  // Colourless: a diamond with its inner facet.
  C: (
    <>
      <path d="M12 3 20 12 12 21 4 12Z" />
      <path d="M12 8 15.5 12 12 16 8.5 12Z" />
    </>
  ),
}

export function ManaSymbol({ type }: { type: ManaType }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mana-symbol" data-mana={type}>
      {PATHS[type]}
    </svg>
  )
}
