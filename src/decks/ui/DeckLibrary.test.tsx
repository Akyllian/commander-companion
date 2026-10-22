import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbDeckStore, setDeckStoreForTests } from '../deckStore'
import { cardData, deckRecord, uuid } from '../testing'
import { DeckLibrary, SEARCH_THRESHOLD } from './DeckLibrary'
import { useDeckRoute } from './useDeckRoute'
import { useDecks } from './useDecks'

const cards = new Map([
  [uuid(1), cardData(1, { name: 'Zimone, Infinite Analyst' })],
  [uuid(2), cardData(2, { name: 'Kraum, Ludevic’s Opus' })],
  [uuid(3), cardData(3, { name: 'Sol Ring', oracleText: '{T}: Add {C}{C}.' })],
])

const decks = (count: number) =>
  Array.from({ length: count }, (_, index) => deckRecord({ id: `d${index}`, name: index === 0 ? 'Quandrix Unlimited' : `Mazzo ${index}`, updatedAt: count - index }))

describe('deck library (R3 §4)', () => {
  it('shows the empty grimoire with its single call to action', () => {
    const onImport = vi.fn()
    render(<DeckLibrary decks={[]} cards={cards} onOpen={vi.fn()} onImport={onImport} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mazzi' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 2, name: 'Il tuo grimorio è vuoto' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Importa il primo mazzo' }))
    expect(onImport).toHaveBeenCalledOnce()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('lists decks as rows with commander, owner, offline state and categories', () => {
    const onOpen = vi.fn()
    const list = [
      deckRecord({ id: 'mine', name: 'Quandrix Unlimited', updatedAt: 3, cards: [cardData(1), cardData(3)].map((card) => ({ cardId: card.cardId, name: card.name, quantity: 1, set: null, number: null })) }),
      deckRecord({ id: 'friend', name: 'Aura of Serenity', owner: { kind: 'friend', name: 'Giulia' }, offline: 'partial', commanders: [uuid(1), uuid(2)], cards: [1, 2].map((n) => ({ cardId: uuid(n), name: `C${n}`, quantity: 1, set: null, number: null })), updatedAt: 2 }),
      deckRecord({ id: 'draft', name: 'Wild Genesis', offline: 'incomplete', updatedAt: 1 }),
    ]
    render(<DeckLibrary decks={list} cards={cards} onOpen={onOpen} onImport={vi.fn()} />)
    const rows = screen.getAllByRole('link')
    expect(rows.map((row) => row.querySelector('.deck-row__name')?.textContent)).toEqual(['Quandrix Unlimited', 'Aura of Serenity', 'Wild Genesis'])
    expect(rows[0]).toHaveTextContent('Zimone, Infinite AnalystMio')
    expect(rows[0]).toHaveTextContent('Disponibile offline')
    expect(rows[0]).toHaveTextContent('Accelerazione 1')
    expect(rows[1]).toHaveTextContent('Zimone, Infinite Analyst + Kraum, Ludevic’s Opus')
    expect(rows[1]).toHaveTextContent('Di Giulia')
    expect(rows[1]).toHaveTextContent('Offline senza tutti i ritagli')
    expect(rows[2]).toHaveTextContent('Preparazione incompleta')
    expect(rows[0]).toHaveAttribute('href', '#mazzi/mine')
    fireEvent.click(rows[1])
    expect(onOpen).toHaveBeenCalledWith('friend')
  })

  it('offers the search only from seven decks, by deck or commander name', () => {
    const { rerender } = render(<DeckLibrary decks={decks(SEARCH_THRESHOLD - 1)} cards={cards} onOpen={vi.fn()} onImport={vi.fn()} />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    rerender(<DeckLibrary decks={decks(SEARCH_THRESHOLD)} cards={cards} onOpen={vi.fn()} onImport={vi.fn()} />)
    const search = screen.getByRole('searchbox', { name: 'Cerca nei mazzi' })
    fireEvent.change(search, { target: { value: 'quandrix' } })
    expect(screen.getAllByRole('link')).toHaveLength(1)
    fireEvent.change(search, { target: { value: 'zimone' } })
    expect(screen.getAllByRole('link')).toHaveLength(SEARCH_THRESHOLD)
    fireEvent.change(search, { target: { value: 'nessuno' } })
    expect(screen.getByText('Nessun mazzo trovato')).toBeInTheDocument()
  })
})

describe('deck routes in the address (fix 5)', () => {
  afterEach(() => window.history.replaceState(null, '', window.location.pathname))

  it('pushes one entry to open a deck, replaces it on tab changes, and one Back returns to the library', async () => {
    window.history.replaceState(null, '', '#mazzi')
    const startLength = window.history.length
    const { result } = renderHook(() => useDeckRoute())
    act(() => result.current.go({ view: 'deck', deckId: 'abc', tab: 'panoramica' }))
    for (const tab of ['lista', 'strategia', 'mano', 'lista'] as const) act(() => result.current.setTab(tab))
    expect(window.location.hash).toBe('#mazzi/abc/lista')
    expect(window.history.length).toBe(startLength + 1)
    await act(async () => {
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(result.current.route).toEqual({ view: 'library' })
    // A tab change outside a deck does nothing.
    act(() => result.current.setTab('mano'))
    expect(result.current.route).toEqual({ view: 'library' })
  })
})

describe('useDecks: one snapshot of decks and cards (second review)', () => {
  afterEach(() => setDeckStoreForTests(undefined))

  it('loads decks and every card they reference in one go', async () => {
    const store = createIndexedDbDeckStore(new IDBFactory())
    await store.putCards([cardData(1, { name: 'Zimone' }), cardData(2, { name: 'Kraum' }), cardData(3)])
    await store.putDeck(deckRecord({ id: 'a', cards: [1, 3].map((n) => ({ cardId: uuid(n), name: `C${n}`, quantity: 1, set: null, number: null })) }))
    await store.putDeck(deckRecord({ id: 'b', commanders: [uuid(1), uuid(2)], cards: [1, 2].map((n) => ({ cardId: uuid(n), name: `C${n}`, quantity: 1, set: null, number: null })) }))
    const getCards = vi.spyOn(store, 'getCards')
    setDeckStoreForTests(store)
    const { result } = renderHook(() => useDecks())
    expect(result.current.deckArt).toBe('loading')
    await vi.waitFor(() => expect(result.current.decks).toHaveLength(2))
    expect(getCards).toHaveBeenCalledTimes(1)
    expect([...(result.current.cards?.keys() ?? [])].toSorted()).toEqual([uuid(1), uuid(2), uuid(3)])
    expect(result.current.deckArt).toEqual(new Set([uuid(1), uuid(2), uuid(3)]))
    // The library reads its metadata from that same snapshot.
    render(<DeckLibrary decks={result.current.decks ?? []} cards={result.current.cards ?? new Map()} onOpen={vi.fn()} onImport={vi.fn()} />)
    const partner = screen.getAllByRole('link').find((row) => row.getAttribute('href') === '#mazzi/b') as HTMLElement
    expect(within(partner).getByText('Zimone + Kraum')).toBeInTheDocument()
  })

  it('reports a store that cannot be read as unavailable', async () => {
    setDeckStoreForTests({ listDecks: async () => Promise.reject(new Error('blocked')) } as never)
    const { result } = renderHook(() => useDecks())
    await vi.waitFor(() => expect(result.current.deckArt).toBe('unavailable'))
    setDeckStoreForTests(null)
    const { result: none } = renderHook(() => useDecks())
    expect(none.current.deckArt).toBe('unavailable')
  })
})
