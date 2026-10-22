import { useCallback, useEffect, useState } from 'react'
import type { CardData } from '../../media/scryfall'
import type { DeckArt } from '../../media/useMatchArt'
import { deckArtIds, getDeckStore } from '../deckStore'
import type { DeckStore } from '../deckStore'
import type { DeckRecord } from '../model'

interface DeckSnapshot {
  decks: DeckRecord[] | null
  /** Every card referenced by any deck, loaded in the same cycle as `decks`. */
  cards: Map<string, CardData> | null
  deckArt: DeckArt
}

const LOADING: DeckSnapshot = { decks: null, cards: null, deckArt: 'loading' }
const UNAVAILABLE: DeckSnapshot = { decks: null, cards: null, deckArt: 'unavailable' }

/**
 * The saved decks and their card data as one snapshot (R3, plan Task 8). Called once in App;
 * the library, the detail and the art-cache prune all read the same snapshot.
 */
export function useDecks(): DeckSnapshot & { reload: () => Promise<void>; store: DeckStore | null } {
  const [store] = useState(getDeckStore)
  const [snapshot, setSnapshot] = useState<DeckSnapshot>(store ? LOADING : UNAVAILABLE)

  const reload = useCallback(async () => {
    if (!store) return
    try {
      const decks = await store.listDecks()
      const cards = await store.getCards(decks.flatMap((deck) => deck.cards.map((entry) => entry.cardId)))
      setSnapshot({ decks, cards, deckArt: deckArtIds(decks) })
    } catch {
      setSnapshot(UNAVAILABLE)
    }
  }, [store])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the snapshot comes from an external system (IndexedDB).
    void reload()
  }, [reload])

  return { ...snapshot, reload, store }
}
