import { foldName } from '../media/scryfall'
import type { CardData } from '../media/scryfall'
import { categoryCounts, CATEGORY_LABELS } from './categories'
import type { DeckRecord, OfflineState } from './model'

/** What a library row says about a deck (R3 §4.2): text only, never a colour code. */

export function commanderLine(deck: DeckRecord, cards: Map<string, CardData>): string {
  return deck.commanders
    .flatMap((cardId) => (cardId && cards.get(cardId) ? [(cards.get(cardId) as CardData).name] : []))
    .join(' + ')
}

export const ownerLabel = (deck: DeckRecord) => (deck.owner.kind === 'me' ? 'Mio' : `Di ${deck.owner.name}`)

export const OFFLINE_LABELS: Record<OfflineState, string> = {
  complete: 'Disponibile offline',
  partial: 'Offline senza tutti i ritagli',
  incomplete: 'Preparazione incompleta',
}

/** Up to three categories by count, lands and unclassified cards left out; ties keep the stable order. */
export function topCategories(deck: DeckRecord, cards: Map<string, CardData>): string {
  return categoryCounts(deck, cards)
    .filter(({ category }) => category !== 'lands' && category !== 'other')
    .toSorted((left, right) => right.count - left.count)
    .slice(0, 3)
    .map(({ category, count }) => `${CATEGORY_LABELS[category]} ${count}`)
    .join(' · ')
}

export function matchesSearch(deck: DeckRecord, cards: Map<string, CardData>, query: string): boolean {
  const wanted = foldName(query)
  return !wanted || foldName(deck.name).includes(wanted) || foldName(commanderLine(deck, cards)).includes(wanted)
}
