import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useState } from 'react'
import { createIndexedDbDeckStore } from '../deckStore'
import type { DeckStore } from '../deckStore'
import { drawablePool } from '../model'
import type { DeckRecord } from '../model'
import type { DeckTab } from '../routes'
import type { Recognition } from '../recognize'
import { cardData, deckRecord, uuid } from '../testing'
import type { CardData } from '../../media/scryfall'
import { DeckDetail } from './DeckDetail'
import type { ImportServices } from './ImportDeck'

const cards = new Map<string, CardData>([
  [uuid(1), cardData(1, { name: 'Zimone, Infinite Analyst', typeLine: 'Legendary Creature — Human Wizard', artist: 'Ryan Pancoast' })],
  [uuid(2), cardData(2, { name: 'Kraum, Ludevic’s Opus', typeLine: 'Legendary Creature — Zombie Horror', artist: 'Daarken' })],
  [uuid(3), cardData(3, { name: 'Sol Ring', typeLine: 'Artifact', oracleText: '{T}: Add {C}{C}.', manaCost: '{1}' })],
  [uuid(4), cardData(4, { name: 'Brainstorm', typeLine: 'Instant', oracleText: 'Draw three cards.' })],
  [uuid(5), cardData(5, { name: 'Delver of Secrets // Insectile Aberration', typeLine: 'Creature — Human Wizard // Creature — Human Insect' })],
  [uuid(6), cardData(6, { name: 'Island', typeLine: 'Basic Land — Island' })],
  [uuid(7), cardData(7, { name: 'Grizzly Bears', typeLine: 'Creature — Bear' })],
  [uuid(8), cardData(8, { name: 'Tymna the Weaver', typeLine: 'Legendary Creature — Human Cleric', artist: 'Winona Nelson' })],
])
const line = (n: number, quantity = 1) => ({ cardId: uuid(n), name: cards.get(uuid(n))?.name ?? '', quantity, set: null, number: null })
const baseDeck = (overrides: Partial<DeckRecord> = {}) =>
  deckRecord({ id: 'q', name: 'Quandrix Unlimited', notes: 'Accelera il mana\nProteggi Zimone\n\nTerza\nQuarta\nQuinta', cards: [line(1), line(3), line(4), line(5), line(6, 12), line(7)], ...overrides })

const services = (overrides: Partial<ImportServices> = {}): ImportServices => ({
  recognize: async (): Promise<Recognition> => ({ matched: [], ambiguous: [], missing: [], excluded: [], invalid: [] }),
  searchCommander: async () => [],
  prepare: async () => ({ offline: 'complete', missing: [], reason: null }),
  newId: () => 'copy-1',
  now: () => 5,
  ...overrides,
})

function Harness({ store, initial, initialTab = 'panoramica', extra = {} }: { store: DeckStore; initial: DeckRecord; initialTab?: DeckTab; extra?: Partial<ImportServices> }) {
  const [deck, setDeck] = useState(initial)
  const [tab, setTab] = useState<DeckTab>(initialTab)
  const [left, setLeft] = useState<string | null>(null)
  if (left) return <p>{left}</p>
  return (
    <DeckDetail
      deck={deck}
      cards={cards}
      store={store}
      tab={tab}
      onTab={setTab}
      onBack={() => setLeft('libreria')}
      onOpenDeck={(deckId) => setLeft(`aperto ${deckId}`)}
      onChanged={async () => {
        const stored = await store.getDeck(deck.id)
        if (stored) setDeck(stored)
      }}
      linkedTo={null}
      onLink={() => undefined}
      services={services(extra)}
      rng={() => 0.5}
    />
  )
}

let store: DeckStore
beforeEach(async () => {
  store = createIndexedDbDeckStore(new IDBFactory())
  await store.putDeck(baseDeck())
})
const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 30; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })

describe('deck detail (R3 §6–8)', () => {
  it('shows the hero with deck name, both Partner names and both credits', () => {
    render(<Harness store={store} initial={baseDeck({ commanders: [uuid(1), uuid(8)], cards: [line(1), line(8), line(3)] })} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Quandrix Unlimited' })).toBeInTheDocument()
    expect(screen.getByText('Zimone, Infinite Analyst + Tymna the Weaver · Mio')).toBeInTheDocument()
    expect(screen.getByText('Illustrazione di Ryan Pancoast e Winona Nelson')).toBeInTheDocument()
  })

  it('follows the tablist pattern: one tab stop, arrows move focus, activation changes the panel', () => {
    render(<Harness store={store} initial={baseDeck()} />)
    const tabs = within(screen.getByRole('tablist', { name: 'Sezioni del mazzo' })).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Panoramica', 'Lista', 'Strategia', 'Mano'])
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1])
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(tabs[3]).toHaveFocus()
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    // The single tab stop moves with focus, without activating (review fix 4): Tab then leaves.
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, -1, 0])
    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' })
    expect(tabs[0]).toHaveFocus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1])
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'q-tab-panoramica')
    // Leaving the tablist puts the stop back on the chosen tab.
    fireEvent.blur(tabs[1], { relatedTarget: document.body })
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1])
    fireEvent.keyDown(tabs[3], { key: 'Home' })
    fireEvent.keyDown(tabs[0], { key: 'End' })
    fireEvent.keyDown(tabs[3], { key: 'x' })
    fireEvent.click(tabs[1])
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'q-tab-lista')
  })

  it('lists the categories with their cards, never as percentages; the plan shows the first four lines', () => {
    render(<Harness store={store} initial={baseDeck()} />)
    expect(screen.getByText(/carte · Disponibile offline · Aggiornato/)).toBeInTheDocument()
    const ramp = screen.getByRole('button', { name: /Accelerazione/ })
    expect(ramp).toHaveTextContent('1')
    fireEvent.click(ramp)
    expect(ramp).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('q-category-ramp')).toHaveTextContent('Sol Ring')
    expect(document.querySelector('.deck-overview')?.textContent).not.toContain('%')
    expect(screen.getByRole('button', { name: /Non classificate/ })).toBeInTheDocument()
    expect(screen.getByText('Quarta')).toBeInTheDocument()
    expect(screen.queryByText('Quinta')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Leggi e modifica' }))
    expect(screen.getByRole('textbox', { name: 'Note di strategia' })).toBeInTheDocument()
  })

  it('offers notes when there are none', () => {
    render(<Harness store={store} initial={baseDeck({ notes: '' })} />)
    expect(screen.getByText('Nessuna nota di strategia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi note' }))
    expect(screen.getByRole('tab', { name: 'Strategia' })).toHaveAttribute('aria-selected', 'true')
  })

  it('groups the list by type, a double-faced card once with //', () => {
    render(<Harness store={store} initial={baseDeck()} initialTab="lista" />)
    const titles = Array.from(document.querySelectorAll('.deck-group__title'), (title) => title.textContent)
    expect(titles).toEqual(['Comandante · 1', 'Creature · 2', 'Istantanei · 1', 'Artefatti · 1', 'Terre · 12'])
    expect(screen.getAllByText('Delver of Secrets // Insectile Aberration')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Sol Ring/ }))
    expect(screen.getByText('Accelerazione')).toBeInTheDocument()
  })

  it('edits quantities, marks zero as to be removed, and saves: categories and pool follow', async () => {
    render(<Harness store={store} initial={baseDeck()} initialTab="lista" />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifica lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Togli una copia di Sol Ring' }))
    expect(screen.getByText('Da rimuovere')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una copia di Brainstorm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await settle()
    const saved = (await store.getDeck('q')) as DeckRecord
    expect(saved.cards.find((entry) => entry.name === 'Sol Ring')).toBeUndefined()
    expect(saved.cards.find((entry) => entry.name === 'Brainstorm')?.quantity).toBe(2)
    expect(drawablePool(saved).filter((cardId) => cardId === uuid(4))).toHaveLength(2)
    fireEvent.click(screen.getByRole('tab', { name: 'Panoramica' }))
    expect(screen.queryByRole('button', { name: /Accelerazione/ })).not.toBeInTheDocument()
  })

  it('blocks the save while the commander is gone, until a replacement is chosen', async () => {
    const withTwo = baseDeck({ cards: [line(1), line(8), line(3)] })
    await store.putDeck(withTwo)
    render(<Harness store={store} initial={withTwo} initialTab="lista" />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifica lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Togli una copia di Zimone, Infinite Analyst' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await settle()
    expect(screen.getByRole('alert')).toHaveTextContent('Scegli un nuovo comandante prima di salvare.')
    expect(screen.getByRole('combobox', { name: 'Nuovo comandante' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('combobox', { name: 'Nuovo comandante' })).toHaveAccessibleDescription('Scegli un nuovo comandante prima di salvare.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Nuovo comandante' }), { target: { value: uuid(8) } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await settle()
    expect((await store.getDeck('q'))?.commanders).toEqual([uuid(8), null])
  })

  it('warns before a key card leaves with its line', () => {
    render(<Harness store={store} initial={baseDeck({ keyCards: [{ cardId: uuid(3), note: '' }] })} initialTab="lista" />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifica lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Togli una copia di Sol Ring' }))
    expect(screen.getByText('Sol Ring: sarà rimossa anche da Carte chiave')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Annulla modifiche' }))
    expect(screen.queryByText('Da rimuovere')).not.toBeInTheDocument()
  })

  it('adds a searched card, and lets a list be edited offline but not searched', async () => {
    const brainstorm2 = cardData(9, { name: 'Ponder', typeLine: 'Sorcery' })
    render(
      <Harness
        store={store}
        initial={baseDeck()}
        initialTab="lista"
        extra={{ recognize: async (lines) => ({ matched: lines.flatMap((entry) => (entry.kind === 'card' ? [{ line: entry, card: brainstorm2 }] : [])), ambiguous: [], missing: [], excluded: [], invalid: [] }) }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica lista' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Aggiungi carta' }), { target: { value: 'Ponder' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerca' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Ponder/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await settle()
    expect((await store.getDeck('q'))?.cards.some((entry) => entry.name === 'Ponder')).toBe(true)
  })

  it('renders the actions menu outside the clipped hero, anchored, with focus and dismissal rules (review fix 1)', () => {
    render(<Harness store={store} initial={baseDeck()} />)
    const trigger = screen.getByRole('button', { name: 'Azioni del mazzo' })
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 330, y: 20, width: 44, height: 44 }))
    fireEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Azioni del mazzo' })
    // In a portal on <body>, not inside the hero that clips its overflow.
    expect(menu.closest('.deck-hero')).toBeNull()
    expect(menu.parentElement).toBe(document.body)
    expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
    // Kept inside the viewport: never past the right edge.
    expect(Number.parseFloat(menu.style.left) + 224).toBeLessThanOrEqual(window.innerWidth - 8 + 0.5)
    fireEvent.keyDown(within(menu).getAllByRole('menuitem')[0], { key: 'ArrowDown' })
    expect(within(menu).getAllByRole('menuitem')[1]).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('returns focus to the trigger after an inline action, and lets a surface hand it back there (final fix 1)', async () => {
    const partial = baseDeck({ offline: 'partial' })
    await store.putDeck(partial)
    render(<Harness store={store} initial={partial} />)
    const trigger = screen.getByRole('button', { name: 'Azioni del mazzo' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Prepara di nuovo offline' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await settle()
    expect(trigger).toHaveFocus()
    // A surface takes focus and, on cancel, gives it back to the trigger, never to <body>.
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Elimina mazzo' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminare il mazzo?' })
    expect(within(dialog).getByRole('button', { name: 'Annulla' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }))
    expect(trigger).toHaveFocus()
  })

  it.each([
    ['Tab', false],
    ['Shift+Tab', true],
  ])('closes the menu on %s and lets the browser carry on tabbing from the trigger (final fix 1)', (_, shiftKey) => {
    render(<Harness store={store} initial={baseDeck()} />)
    const trigger = screen.getByRole('button', { name: 'Azioni del mazzo' })
    fireEvent.click(trigger)
    const item = within(screen.getByRole('menu')).getAllByRole('menuitem')[1]
    item.focus()
    // Not prevented: the browser's own Tab move runs, from the trigger's place in the page order.
    expect(fireEvent.keyDown(item, { key: 'Tab', shiftKey })).toBe(true)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('duplicates and deletes the deck from its menu', async () => {
    const first = render(<Harness store={store} initial={baseDeck()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Azioni del mazzo' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplica mazzo' }))
    await settle()
    expect((await store.getDeck('copy-1'))?.name).toBe('Quandrix Unlimited (copia)')
    expect(screen.getByText('aperto copy-1')).toBeInTheDocument()
    first.unmount()
    render(<Harness store={store} initial={baseDeck()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Azioni del mazzo' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Elimina mazzo' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminare il mazzo?' })).getByRole('button', { name: 'Elimina mazzo' }))
    await settle()
    expect(await store.getDeck('q')).toBeNull()
    expect(screen.getByText('libreria')).toBeInTheDocument()
  })

  it('renames the deck and makes it a friend’s', async () => {
    render(<Harness store={store} initial={baseDeck()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Azioni del mazzo' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Modifica dettagli' }))
    const sheet = screen.getByRole('dialog', { name: 'Modifica dettagli' })
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'Nuovo nome' } })
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Mazzo di un amico' }))
    expect(within(sheet).getByRole('button', { name: 'Salva' })).toBeDisabled()
    fireEvent.change(within(sheet).getByRole('textbox', { name: "Nome dell'amico" }), { target: { value: 'Marco' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Salva' }))
    await settle()
    expect(await store.getDeck('q')).toMatchObject({ name: 'Nuovo nome', owner: { kind: 'friend', name: 'Marco' } })
  })

  it('prepares again offline from the menu only when it is not complete', async () => {
    const partial = baseDeck({ offline: 'partial' })
    await store.putDeck(partial)
    render(<Harness store={store} initial={partial} />)
    fireEvent.click(screen.getByRole('button', { name: 'Azioni del mazzo' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Prepara di nuovo offline' }))
    await settle()
    expect((await store.getDeck('q'))?.offline).toBe('complete')
  })

  it('replaces the whole list through Verifica, keeping notes and dropping missing key cards', async () => {
    const zimone = cards.get(uuid(1)) as CardData
    const ponder = cardData(9, { name: 'Ponder', typeLine: 'Sorcery' })
    const deck = baseDeck({ keyCards: [{ cardId: uuid(3), note: 'x' }] })
    await store.putDeck(deck)
    render(
      <Harness
        store={store}
        initial={deck}
        initialTab="lista"
        extra={{
          recognize: async (lines) => ({
            matched: lines.flatMap((entry) => (entry.kind === 'card' ? [{ line: entry, card: entry.name.startsWith('Zim') ? zimone : ponder }] : [])),
            ambiguous: [],
            missing: [],
            excluded: [],
            invalid: [],
          }),
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Incolla aggiornamento' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Incolla aggiornamento' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Incolla la lista' }), { target: { value: '1 Zimone, Infinite Analyst\n4 Ponder' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analizza lista' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByText('3 di 3 · Conferma')).toBeInTheDocument()
    expect(screen.getByText(/Saranno rimosse anche da Carte chiave: Sol Ring/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sostituisci lista' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Sostituire la lista?' })).getByRole('button', { name: 'Sostituisci lista' }))
    await settle()
    const saved = (await store.getDeck('q')) as DeckRecord
    expect(saved.cards.map((entry) => [entry.name, entry.quantity])).toEqual([
      ['Zimone, Infinite Analyst', 1],
      ['Ponder', 4],
    ])
    expect(saved).toMatchObject({ notes: deck.notes, keyCards: [], name: 'Quandrix Unlimited' })
  })
})
