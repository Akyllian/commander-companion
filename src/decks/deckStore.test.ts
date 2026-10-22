import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbDeckStore, deckArtIds, getDeckStore, setDeckStoreForTests } from './deckStore'
import { cardData, deckRecord, uuid } from './testing'

describe('deck store (R3, IndexedDB)', () => {
  afterEach(() => setDeckStoreForTests(undefined))

  it('stores, lists, reads and deletes decks', async () => {
    const store = createIndexedDbDeckStore(new IDBFactory())
    await store.putDeck(deckRecord({ id: 'a', name: 'Alfa' }))
    await store.putDeck(deckRecord({ id: 'b', name: 'Beta' }))
    expect((await store.listDecks()).map((deck) => deck.id).toSorted()).toEqual(['a', 'b'])
    expect((await store.getDeck('a'))?.name).toBe('Alfa')
    await store.deleteDeck('a')
    expect(await store.getDeck('a')).toBeNull()
    expect(await store.getDeck('missing')).toBeNull()
  })

  it('skips corrupt records instead of failing the list', async () => {
    const factory = new IDBFactory()
    const store = createIndexedDbDeckStore(factory)
    await store.putDeck(deckRecord({ id: 'good' }))
    await store.putDeck({ ...deckRecord({ id: 'bad' }), name: '' })
    await store.putCards([cardData(1)])
    await store.putCards([{ ...cardData(2), cardId: 'not-a-uuid' }])
    expect((await store.listDecks()).map((deck) => deck.id)).toEqual(['good'])
    expect(await store.getDeck('bad')).toBeNull()
    expect([...(await store.getCards([uuid(1), uuid(2), uuid(3)])).keys()]).toEqual([uuid(1)])
  })

  it('stores card data by id and reads several at once', async () => {
    const store = createIndexedDbDeckStore(new IDBFactory())
    await store.putCards([cardData(1), cardData(2)])
    const cards = await store.getCards([uuid(2), uuid(1), uuid(2)])
    expect(cards.get(uuid(1))).toEqual(cardData(1))
    expect(cards.size).toBe(2)
    expect((await store.getCards([])).size).toBe(0)
  })

  it('reports a database that cannot open', async () => {
    const blocked = {
      open: () => {
        const request = { result: undefined, error: new Error('blocked'), addEventListener: (type: string, listener: () => void) => type === 'error' && queueMicrotask(listener) }
        return request
      },
    } as unknown as IDBFactory
    await expect(createIndexedDbDeckStore(blocked).listDecks()).rejects.toThrow('blocked')
  })

  it('gives every card of every deck to the art cache keep-set', () => {
    const one = deckRecord({ id: 'a' })
    const two = deckRecord({ id: 'b', cards: [{ cardId: uuid(40), name: 'X', quantity: 1, set: null, number: null }], commanders: [uuid(40), null] })
    expect(deckArtIds([one, two])).toEqual(new Set([...one.cards.map((entry) => entry.cardId), uuid(40)]))
  })

  it('shares one store, null where IndexedDB is missing', () => {
    expect(getDeckStore()).toBeNull()
    setDeckStoreForTests(undefined)
    vi.stubGlobal('indexedDB', new IDBFactory())
    expect(getDeckStore()).not.toBeNull()
    vi.unstubAllGlobals()
    const store = createIndexedDbDeckStore(new IDBFactory())
    setDeckStoreForTests(store)
    expect(getDeckStore()).toBe(store)
  })
})
