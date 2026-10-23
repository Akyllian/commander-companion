import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { cardData, deckRecord, uuid } from '../testing'
import { HAND_EXIT_MS, TestHand } from './TestHand'

const cards = new Map(Array.from({ length: 40 }, (_, i) => [uuid(i + 1), cardData(i + 1, { name: `Carta ${i + 1}`, artist: `Artista ${i + 1}` })]))
const deck = deckRecord({ cards: Array.from({ length: 40 }, (_, i) => ({ cardId: uuid(i + 1), name: `Carta ${i + 1}`, quantity: 1, set: null, number: null })) })

/** A seeded rng, so every deal is the same in every run. */
const seeded = () => {
  let seed = 7
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const handCards = () => within(screen.getByRole('list')).getAllByRole('button')

const motion = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }))

describe('Mano di prova (R3 §10)', () => {
  // Most cases check the hand itself: with reduced motion each change is immediate.
  beforeEach(() => motion(true))
  afterEach(() => vi.unstubAllGlobals())

  it('lets the old hand fade out over 120ms before the next one is dealt (review fix 5)', () => {
    vi.useFakeTimers()
    motion(false)
    render(<TestHand deck={deck} cards={cards} rng={seeded()} />)
    const before = handCards().map((button) => button.getAttribute('aria-label'))
    fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }))
    expect(screen.getByRole('list')).toHaveAttribute('data-leaving')
    expect(screen.getByRole('button', { name: 'Mulligan' })).toBeDisabled()
    expect(handCards().map((button) => button.getAttribute('aria-label'))).toEqual(before)
    act(() => vi.advanceTimersByTime(HAND_EXIT_MS - 1))
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('list')).not.toHaveAttribute('data-leaving')
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte · Mulligan 1' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('deals the next hand at once with reduced motion', () => {
    render(<TestHand deck={deck} cards={cards} rng={seeded()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }))
    expect(screen.getByRole('list')).not.toHaveAttribute('data-leaving')
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte · Mulligan 1' })).toBeInTheDocument()
  })

  it('deals seven named crops, never the commander, and opens the details with the artist', () => {
    render(<TestHand deck={deck} cards={cards} rng={seeded()} />)
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte' })).toBeInTheDocument()
    expect(screen.getByText('Simulazione locale: nessuna carta intera viene mostrata.')).toBeInTheDocument()
    expect(handCards()).toHaveLength(7)
    expect(handCards().some((button) => button.getAttribute('aria-label') === 'Dettagli di Carta 1')).toBe(false)
    const [first] = handCards()
    const name = (first.getAttribute('aria-label') as string).replace('Dettagli di ', '')
    fireEvent.click(first)
    const sheet = screen.getByRole('dialog', { name: `Dettagli di ${name}` })
    expect(within(sheet).getByText(/^Illustrazione di Artista/)).toBeInTheDocument()
  })

  it('mulligans, keeps, puts two cards at the bottom in order, and starts a new try', () => {
    render(<TestHand deck={deck} cards={cards} rng={seeded()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }))
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte · Mulligan 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tieni' }))
    expect(screen.getByText('Scegli 2 carte da mettere in fondo · 0 selezionate')).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Metti 2 in fondo' })
    expect(confirm).toBeDisabled()
    fireEvent.click(handCards()[4])
    fireEvent.click(handCards()[1])
    expect(handCards()[4]).toHaveAttribute('aria-pressed', 'true')
    expect(handCards()[4].getAttribute('aria-label')).toMatch(/in fondo per 1ª$/)
    expect(handCards()[1].getAttribute('aria-label')).toMatch(/in fondo per 2ª$/)
    // A third pick is ignored.
    fireEvent.click(handCards()[0])
    expect(handCards()[0]).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Annulla selezione' }))
    expect(handCards()[4]).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(handCards()[4])
    fireEvent.click(handCards()[1])
    fireEvent.click(confirm)
    expect(handCards()).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 5 carte · Mulligan 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nuova prova' }))
    expect(screen.getByRole('heading', { name: 'Mano iniziale · 7 carte' })).toBeInTheDocument()
  })

  it('says when the limit is reached, and that it can keep zero cards', () => {
    render(<TestHand deck={deck} cards={cards} rng={seeded()} />)
    for (let index = 0; index < 7; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Mulligan' }))
    expect(screen.getByText('Limite raggiunto: puoi tenere una mano da zero carte')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mulligan' })).toBeDisabled()
  })

  it('explains a list too short for a hand', () => {
    render(<TestHand deck={deckRecord({ cards: deck.cards.slice(0, 5) })} cards={cards} />)
    expect(screen.getByText('Servono almeno 7 carte pescabili per una mano di prova.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tieni' })).not.toBeInTheDocument()
  })
})
