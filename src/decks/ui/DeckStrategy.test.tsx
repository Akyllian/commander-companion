import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { DeckRecord } from '../model'
import { cardData, deckRecord, uuid } from '../testing'
import { AUTOSAVE_MS, DeckStrategy } from './DeckStrategy'

const cards = new Map(Array.from({ length: 12 }, (_, i) => [uuid(i + 1), cardData(i + 1)]))

/** A slow store: each write waits until the test resolves it. */
function slowStore(initial: DeckRecord) {
  let stored = initial
  const pending: Array<() => void> = []
  const writes: string[] = []
  const saveDeck = vi.fn(
    (update: (deck: DeckRecord) => DeckRecord) =>
      new Promise<void>((resolve) => {
        pending.push(() => {
          stored = update(stored)
          writes.push(stored.notes)
          resolve()
        })
      }),
  )
  return { saveDeck, writes, release: () => pending.shift()?.(), stored: () => stored, pending }
}

function Live({ initial }: { initial: DeckRecord }) {
  const [deck, setDeck] = useState(initial)
  return (
    <DeckStrategy
      deck={deck}
      cards={cards}
      saveDeck={async (update) => {
        setDeck((current) => update(current))
      }}
    />
  )
}

const notes = () => screen.getByRole('textbox', { name: 'Note di strategia' })

describe('Strategia (R3 §9)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('saves once per pause, not per keystroke', async () => {
    const store = slowStore(deckRecord())
    render(<DeckStrategy deck={deckRecord()} cards={cards} saveDeck={store.saveDeck} />)
    for (const text of ['A', 'Ac', 'Acc']) fireEvent.change(notes(), { target: { value: text } })
    expect(store.saveDeck).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(AUTOSAVE_MS))
    expect(store.saveDeck).toHaveBeenCalledOnce()
    await act(async () => store.release())
    expect(store.writes).toEqual(['Acc'])
    expect(screen.getByText('Salvato sul dispositivo')).toBeInTheDocument()
  })

  it('serialises writes: typing during a slow write leads to one follow-up with the latest text (fix 9)', async () => {
    const store = slowStore(deckRecord())
    render(<DeckStrategy deck={deckRecord()} cards={cards} saveDeck={store.saveDeck} />)
    fireEvent.change(notes(), { target: { value: 'uno' } })
    await act(async () => vi.advanceTimersByTime(AUTOSAVE_MS))
    fireEvent.change(notes(), { target: { value: 'uno due' } })
    await act(async () => vi.advanceTimersByTime(AUTOSAVE_MS))
    fireEvent.change(notes(), { target: { value: 'uno due tre' } })
    await act(async () => vi.advanceTimersByTime(AUTOSAVE_MS))
    // Still one write in flight.
    expect(store.saveDeck).toHaveBeenCalledOnce()
    await act(async () => store.release())
    expect(store.saveDeck).toHaveBeenCalledTimes(2)
    await act(async () => store.release())
    expect(store.writes).toEqual(['uno', 'uno due tre'])
    expect(store.stored().notes).toBe('uno due tre')
  })

  it('flushes at once on blur and on unmount', async () => {
    const store = slowStore(deckRecord())
    const { unmount } = render(<DeckStrategy deck={deckRecord()} cards={cards} saveDeck={store.saveDeck} />)
    fireEvent.change(notes(), { target: { value: 'blur' } })
    fireEvent.blur(notes())
    expect(store.saveDeck).toHaveBeenCalledOnce()
    await act(async () => store.release())
    fireEvent.change(notes(), { target: { value: 'via' } })
    unmount()
    expect(store.saveDeck).toHaveBeenCalledTimes(2)
    await act(async () => store.release())
    expect(store.writes).toEqual(['blur', 'via'])
  })

  it('announces a failed write once', async () => {
    const failing = vi.fn(async () => Promise.reject(new Error('quota')))
    render(<DeckStrategy deck={deckRecord()} cards={cards} saveDeck={failing} />)
    fireEvent.change(notes(), { target: { value: 'x' } })
    fireEvent.blur(notes())
    await act(async () => undefined)
    expect(screen.getByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByText('Le note non sono state salvate sul dispositivo')).toBeInTheDocument()
  })

  it('chooses up to eight key cards, reorders them and notes them', async () => {
    vi.useRealTimers()
    render(<Live initial={deckRecord({ cards: Array.from({ length: 12 }, (_, i) => ({ cardId: uuid(i + 1), name: `Carta ${i + 1}`, quantity: 1, set: null, number: null })) })} />)
    expect(screen.getByText('Nessuna carta chiave selezionata')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Scegli dalla lista' }))
    // The commander (Carta 1) is not offered.
    expect(screen.queryByRole('button', { name: 'Carta 1' })).not.toBeInTheDocument()
    for (let n = 2; n <= 9; n += 1) {
      await act(async () => fireEvent.click(screen.getByRole('button', { name: `Carta ${n}` })))
    }
    expect(document.querySelectorAll('.deck-key')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: 'Scegli dalla lista' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sposta prima Carta 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sposta dopo Carta 9' })).toBeDisabled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sposta dopo Carta 2' })))
    expect(Array.from(document.querySelectorAll('.deck-key__name'), (name) => name.textContent).slice(0, 2)).toEqual(['Carta 3', 'Carta 2'])
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sposta prima Carta 2' })))
    const note = screen.getByRole('textbox', { name: 'Nota per Carta 2' })
    fireEvent.change(note, { target: { value: 'Vince la partita' } })
    await act(async () => fireEvent.blur(note))
    expect(screen.getByRole('textbox', { name: 'Nota per Carta 2' })).toHaveValue('Vince la partita')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Togli Carta 9 dalle carte chiave' })))
    expect(document.querySelectorAll('.deck-key')).toHaveLength(7)
  })

  it('closes the keyboard from «Fine modifica»', () => {
    render(<DeckStrategy deck={deckRecord()} cards={cards} saveDeck={vi.fn()} />)
    const done = screen.getByRole('button', { name: 'Fine modifica' })
    done.focus()
    fireEvent.click(done)
    expect(done).not.toHaveFocus()
  })
})
