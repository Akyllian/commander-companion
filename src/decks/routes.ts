/**
 * Addresses inside Mazzi (R3, plan Task 8): `#mazzi`, `#mazzi/importa`, `#mazzi/<deck>` and
 * `#mazzi/<deck>/<tab>`. Reload keeps the view; Back returns to the library because entering a
 * deck pushes one entry and tab changes replace it.
 */

export const DECK_TABS = ['panoramica', 'lista', 'strategia', 'mano'] as const
export type DeckTab = (typeof DECK_TABS)[number]

export type DeckRoute = { view: 'library' } | { view: 'import' } | { view: 'deck'; deckId: string; tab: DeckTab }

export function deckRouteFromHash(hash: string): DeckRoute {
  const [, deckPart, tabPart] = hash.replace(/^#/, '').split('/')
  if (!deckPart) return { view: 'library' }
  if (deckPart === 'importa') return { view: 'import' }
  let deckId: string
  try {
    deckId = decodeURIComponent(deckPart)
  } catch {
    return { view: 'library' }
  }
  const tab = (DECK_TABS as readonly string[]).includes(tabPart) ? (tabPart as DeckTab) : 'panoramica'
  return { view: 'deck', deckId, tab }
}

export function deckHref(route: DeckRoute): string {
  if (route.view === 'library') return '#mazzi'
  if (route.view === 'import') return '#mazzi/importa'
  const base = `#mazzi/${encodeURIComponent(route.deckId)}`
  return route.tab === 'panoramica' ? base : `${base}/${route.tab}`
}
