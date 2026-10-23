import { requestResult } from '../media/artStore'
import { parseCardData } from '../media/scryfall'
import type { CardData } from '../media/scryfall'
import { parseDeck } from './model'
import type { DeckRecord } from './model'

/**
 * Decks and the card data they need, in IndexedDB (R3, D-040): localStorage is too small for
 * many lists. Card data is shared by id across decks; art crops stay in the art store. Every read
 * is validated, and invalid records are skipped rather than failing the whole library.
 */

export const DECKS_DB_NAME = 'commander-companion-decks'
const DECKS = 'decks'
const CARDS = 'cards'

export interface DeckStore {
  listDecks(): Promise<DeckRecord[]>
  getDeck(id: string): Promise<DeckRecord | null>
  putDeck(deck: DeckRecord): Promise<void>
  deleteDeck(id: string): Promise<void>
  getCards(ids: Iterable<string>): Promise<Map<string, CardData>>
  putCards(cards: CardData[]): Promise<void>
}

export function createIndexedDbDeckStore(factory: IDBFactory, name = DECKS_DB_NAME): DeckStore {
  let database: Promise<IDBDatabase> | null = null
  const open = () => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, 1)
      request.addEventListener('upgradeneeded', () => {
        request.result.createObjectStore(DECKS, { keyPath: 'id' })
        request.result.createObjectStore(CARDS, { keyPath: 'cardId' })
      })
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
    return database
  }
  const store = async (which: string, mode: IDBTransactionMode) => (await open()).transaction(which, mode).objectStore(which)

  return {
    async listDecks() {
      const all = await requestResult<unknown[]>((await store(DECKS, 'readonly')).getAll())
      return all.map(parseDeck).filter((deck): deck is DeckRecord => deck !== null)
    },
    async getDeck(id) {
      return parseDeck(await requestResult<unknown>((await store(DECKS, 'readonly')).get(id)))
    },
    async putDeck(deck) {
      await requestResult((await store(DECKS, 'readwrite')).put(deck))
    },
    async deleteDeck(id) {
      await requestResult((await store(DECKS, 'readwrite')).delete(id))
    },
    async getCards(ids) {
      const wanted = [...new Set(ids)]
      const cards = new Map<string, CardData>()
      if (wanted.length === 0) return cards
      const objects = await store(CARDS, 'readonly')
      const values = await Promise.all(wanted.map((cardId) => requestResult<unknown>(objects.get(cardId))))
      for (const value of values) {
        const card = parseCardData(value)
        if (card) cards.set(card.cardId, card)
      }
      return cards
    },
    async putCards(cards) {
      const objects = await store(CARDS, 'readwrite')
      await Promise.all(cards.map((card) => requestResult(objects.put(card))))
    },
  }
}

let shared: DeckStore | null | undefined

/** The app-wide deck store, or null where IndexedDB is unavailable. */
export function getDeckStore(): DeckStore | null {
  if (shared === undefined) shared = typeof indexedDB === 'undefined' ? null : createIndexedDbDeckStore(indexedDB)
  return shared
}

/** Test seam: replace or reset the shared store. */
export function setDeckStoreForTests(store: DeckStore | null | undefined) {
  shared = store
}

/** Art the cache must keep for the saved decks: every card of every deck (plan Task 5, fix 1). */
export function deckArtIds(decks: DeckRecord[]): Set<string> {
  return new Set(decks.flatMap((deck) => deck.cards.map((entry) => entry.cardId)))
}
