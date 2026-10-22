import { createContext, useContext } from 'react'
import type { CardData } from '../../media/scryfall'
import type { DeckStore } from '../deckStore'
import type { DeckRecord } from '../model'

/** The one decks snapshot (R3): loaded once in App, read by Mazzi and by the players' Dettagli. */
export interface DecksValue {
  /** `loading` until IndexedDB answers; `unavailable` only when it cannot be read (review fix 6). */
  status: 'loading' | 'ready' | 'unavailable'
  decks: DeckRecord[] | null
  cards: Map<string, CardData> | null
  store: DeckStore | null
  reload: () => Promise<void>
}

export const DecksContext = createContext<DecksValue>({ status: 'loading', decks: null, cards: null, store: null, reload: async () => undefined })

export const useDecksContext = () => useContext(DecksContext)
