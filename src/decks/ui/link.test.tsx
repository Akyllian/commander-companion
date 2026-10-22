import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import App from '../../App'
import { STORAGE_KEY } from '../../game/storage'
import { createIndexedDbDeckStore, setDeckStoreForTests } from '../deckStore'
import type { DeckStore } from '../deckStore'
import { cardData, deckRecord, uuid } from '../testing'

const zimone = cardData(1, { name: 'Zimone, Infinite Analyst', typeLine: 'Legendary Creature — Human Wizard', artist: 'Ryan Pancoast' })
const tymna = cardData(8, { name: 'Tymna the Weaver', typeLine: 'Legendary Creature — Human Cleric', artist: 'Winona Nelson' })
const deck = deckRecord({
  id: 'q',
  name: 'Quandrix Unlimited',
  cards: [zimone, tymna, cardData(3)].map((card) => ({ cardId: card.cardId, name: card.name, quantity: 1, set: null, number: null })),
})

let store: DeckStore
const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 40; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })

beforeEach(async () => {
  store = createIndexedDbDeckStore(new IDBFactory())
  await store.putCards([zimone, tymna, cardData(3)])
  await store.putDeck(deck)
  setDeckStoreForTests(store)
})
afterEach(() => {
  setDeckStoreForTests(undefined)
  window.history.replaceState(null, '', window.location.pathname)
})

const panel = (n: number) => screen.getByRole('region', { name: new RegExp(`giocatore ${n}$`, 'i') })
const commanderOf = (n: number) => panel(n).querySelector('.player-commander')?.textContent
const openDetails = (n: number) => fireEvent.click(within(panel(n)).getByRole('button', { name: /^apri dettagli di/i }))
const goTo = (name: string) => {
  if (!screen.queryByRole('navigation', { name: 'Sezioni' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Apri strumenti e sezioni' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sezioni' }))
  }
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name }))
}
const linkFromDeck = async (player: string) => {
  window.history.replaceState(null, '', '#mazzi/q')
  render(<App />)
  await settle()
  fireEvent.click(screen.getByRole('button', { name: 'Collega a un giocatore' }))
  const sheet = screen.getByRole('dialog', { name: 'Collega a un giocatore' })
  fireEvent.click(within(sheet).getByRole('radio', { name: new RegExp(`^${player}`) }))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Collega mazzo' }))
}

describe('linking decks and players (R3 §11)', () => {
  it('links from the deck: commander and art, never name or life', async () => {
    await linkFromDeck('Giocatore 1')
    expect(screen.getByText('Collegato a Giocatore 1')).toBeInTheDocument()
    goTo('Partita')
    expect(commanderOf(1)).toBe('Zimone, Infinite Analyst')
    expect(within(panel(1)).getByTestId('life-total')).toHaveTextContent('40')
  })

  it('shows a manual change as an override, and re-applies the deck', async () => {
    await linkFromDeck('Giocatore 2')
    goTo('Partita')
    openDetails(2)
    let sheet = screen.getByRole('dialog')
    ;(within(sheet).getByText('Comandante e mazzo').closest('details') as HTMLDetailsElement).open = true
    expect(within(sheet).getByText('Quandrix Unlimited')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('checkbox', { name: /due comandanti/i }))
    expect(within(sheet).getByText('Comandante modificato per questa partita')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Riapplica dal mazzo' }))
    sheet = screen.getByRole('dialog')
    expect(within(sheet).queryByText('Comandante modificato per questa partita')).not.toBeInTheDocument()
    expect(within(sheet).getByRole('checkbox', { name: /due comandanti/i })).not.toBeChecked()
  })

  it('links from a player’s Dettagli, and unlinks keeping or removing the commander', async () => {
    render(<App />)
    await settle()
    openDetails(1)
    const sheet = screen.getByRole('dialog')
    ;(within(sheet).getByText('Comandante e mazzo').closest('details') as HTMLDetailsElement).open = true
    expect(within(sheet).getByText('Nessun mazzo')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Scegli un mazzo' }))
    fireEvent.click(within(sheet).getByRole('button', { name: /^Quandrix Unlimited/ }))
    expect(commanderOf(1)).toBe('Zimone, Infinite Analyst')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Scollega' }))
    fireEvent.click(within(within(sheet).getByRole('group', { name: 'Scollega il mazzo' })).getByRole('button', { name: 'Mantieni comandante' }))
    expect(within(sheet).getByText('Nessun mazzo')).toBeInTheDocument()
    expect(commanderOf(1)).toBe('Zimone, Infinite Analyst')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Scegli un mazzo' }))
    fireEvent.click(within(sheet).getByRole('button', { name: /^Quandrix Unlimited/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Scollega' }))
    fireEvent.click(within(within(sheet).getByRole('group', { name: 'Scollega il mazzo' })).getByRole('button', { name: 'Rimuovi comandante' }))
    expect(commanderOf(1)).toBe('Comandante non scelto')
  })

  it('does not change a running match when the deck is edited; the next game takes the new data', async () => {
    await linkFromDeck('Giocatore 1')
    // The deck's commander changes in the library (Tymna instead of Zimone).
    await act(async () => {
      await store.putDeck({ ...deck, commanders: [tymna.cardId, null] })
    })
    goTo('Partita')
    expect(commanderOf(1)).toBe('Zimone, Infinite Analyst')
    goTo('Altro')
    fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
    await settle()
    goTo('Partita')
    // The new game reads the deck from the store, not from the screen's snapshot (review fix 3).
    expect(commanderOf(1)).toBe('Tymna the Weaver')
  })

  it('keeps the applied commander when the linked deck is deleted, through a new game with one replace (fix 3)', async () => {
    await linkFromDeck('Giocatore 1')
    // Delete the deck from its menu.
    fireEvent.click(screen.getByRole('button', { name: 'Azioni del mazzo' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Elimina mazzo' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminare il mazzo?' })).getByRole('button', { name: 'Elimina mazzo' }))
    await settle()
    goTo('Altro')
    fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
    await settle()
    expect(writes.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1)
    writes.mockRestore()
    goTo('Partita')
    expect(commanderOf(1)).toBe('Zimone, Infinite Analyst')
    openDetails(1)
    const sheet = screen.getByRole('dialog')
    ;(within(sheet).getByText('Comandante e mazzo').closest('details') as HTMLDetailsElement).open = true
    expect(within(sheet).getByText('Mazzo non disponibile: scegline un altro')).toBeInTheDocument()
  })

  it('names the linked deck of each player in the link sheet', async () => {
    await linkFromDeck('Giocatore 3')
    fireEvent.click(screen.getByRole('button', { name: 'Cambia giocatore' }))
    const sheet = screen.getByRole('dialog', { name: 'Collega a un giocatore' })
    expect(within(sheet).getByRole('radio', { name: /^Giocatore 3/ })).toHaveTextContent('Quandrix Unlimited')
    expect(within(sheet).getByRole('radio', { name: /^Giocatore 1/ })).toHaveTextContent('Nessun mazzo')
    expect(within(sheet).getByRole('button', { name: 'Collega mazzo' })).toBeDisabled()
  })
})

void uuid
