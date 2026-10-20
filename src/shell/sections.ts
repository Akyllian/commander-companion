/** The four top-level sections (D-037, R1), in their fixed DOM and visual order. */
export const SECTIONS = ['partita', 'mazzi', 'impara', 'altro'] as const
export type Section = (typeof SECTIONS)[number]

export const SECTION_LABELS: Record<Section, string> = {
  partita: 'Partita',
  mazzi: 'Mazzi',
  impara: 'Impara',
  altro: 'Altro',
}

/** `#mazzi`, `#impara`, `#altro`; anything else (no hash included) is the game. */
export function sectionFromHash(hash: string): Section {
  const name = hash.replace(/^#/, '')
  return (SECTIONS as readonly string[]).includes(name) ? (name as Section) : 'partita'
}

/** The address of a section: the game has no hash, so a shared link opens straight on the table. */
export const sectionHref = (section: Section) =>
  section === 'partita' ? `${window.location.pathname}${window.location.search}` : `#${section}`
