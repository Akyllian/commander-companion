import { createContext, useContext } from 'react'
import type { CardData } from '../../media/scryfall'
import type { DeckStore } from '../deckStore'
import type { DeckRecord } from '../model'

/** The one decks snapshot (R3): loaded once in App, read by Mazzi and by the players' Dettagli. */
export interface DecksValue {
  decks: DeckRecord[] | null
  cards: Map<string, CardData> | null
  store: DeckStore | null
  reload: () => Promise<void>
}

export const DecksContext = createContext<DecksValue>({ decks: null, cards: null, store: null, reload: async () => undefined })

export const useDecksContext = () => useContext(DecksContext)
