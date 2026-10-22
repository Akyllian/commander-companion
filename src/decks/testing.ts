import type { CardData } from '../media/scryfall'
import type { DeckCard, DeckRecord } from './model'

/** Shared builders for deck tests (excluded from coverage like other test helpers). */
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const cardData = (n: number, overrides: Partial<CardData> = {}): CardData => ({
  cardId: uuid(n),
  name: `Carta ${n}`,
  printedName: null,
  typeLine: 'Artifact',
  oracleText: '',
  manaCost: '{1}',
  artist: `Artista ${n}`,
  artUrl: `https://cards.scryfall.io/art_crop/front/${n}.jpg`,
  set: 'set',
  number: String(n),
  ...overrides,
})

export const deckCard = (n: number, quantity = 1): DeckCard => ({ cardId: uuid(n), name: `Carta ${n}`, quantity, set: null, number: null })

export const deckRecord = (overrides: Partial<DeckRecord> = {}): DeckRecord => ({
  version: 1,
  id: 'deck-1',
  name: 'Quandrix Unlimited',
  owner: { kind: 'me' },
  commanders: [uuid(1), null],
  cards: Array.from({ length: 10 }, (_, i) => deckCard(i + 1)),
  unrecognized: [],
  notes: '',
  keyCards: [],
  createdAt: 1,
  updatedAt: 1,
  offline: 'complete',
  ...overrides,
})
