import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbDeckStore } from '../deckStore'
import type { DeckStore } from '../deckStore'
import { DRAFT_KEY } from '../importDraft'
import { drawablePool } from '../model'
import type { ParsedLine } from '../parseList'
import type { Recognition } from '../recognize'
import { cardData, uuid } from '../testing'
import { ScryfallError } from '../../media/scryfall'
import type { CardData } from '../../media/scryfall'
import { ImportDeck } from './ImportDeck'
import type { ImportServices } from './ImportDeck'

type CardLine = Extract<ParsedLine, { kind: 'card' }>

const zimone = cardData(1, { name: 'Zimone, Infinite Analyst', typeLine: 'Legendary Creature — Human Wizard' })
const kraum = cardData(2, { name: 'Kraum, Ludevic’s Opus', typeLine: 'Legendary Creature — Zombie Horror' })
const solRing = cardData(3, { name: 'Sol Ring' })
const island = cardData(4, { name: 'Island', typeLine: 'Basic Land — Island' })
const cultivate = (n: number, set: string) => cardData(n, { name: 'Cultivate', set })
const catalogue = new Map([zimone, kraum, solRing, island].map((card) => [card.name.toLowerCase(), card]))

/** A fake Scryfall: exact English names, «Coltivare» ambiguous, everything else missing. */
const recognizeFake = vi.fn(async (lines: ParsedLine[]): Promise<Recognition> => {
  const result: Recognition = { matched: [], ambiguous: [], missing: [], excluded: [], invalid: [] }
  for (const line of lines) {
    if (line.kind === 'invalid') result.invalid.push(line)
    else if (line.section === 'excluded') result.excluded.push(line)
    else if (line.name === 'Coltivare') result.ambiguous.push({ line, options: [cultivate(5, 'm21'), cultivate(6, 'cmm')] })
    else if (catalogue.has(line.name.toLowerCase())) result.matched.push({ line, card: catalogue.get(line.name.toLowerCase()) as CardData })
    else result.missing.push(line as CardLine)
  }
  return result
})

function services(overrides: Partial<ImportServices> = {}): ImportServices {
  let id = 0
  return {
    recognize: recognizeFake,
    searchCommander: async () => [kraum],
    prepare: async (_deck, cards, onProgress) => {
      onProgress(cards.length, cards.length)
      return { offline: 'complete', missing: [], reason: null }
    },
    newId: () => `deck-${++id}`,
    now: () => 1000,
    ...overrides,
  }
}

let store: DeckStore
beforeEach(() => {
  store = createIndexedDbDeckStore(new IDBFactory())
  recognizeFake.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

const renderImport = (extra: Partial<ImportServices> = {}, callbacks = { onDone: vi.fn(), onCancel: vi.fn(), onSaved: vi.fn() }) => {
  const result = render(<ImportDeck store={store} services={services(extra)} {...callbacks} />)
  return { ...result, ...callbacks }
}
const type = (text: string) => fireEvent.change(screen.getByRole('textbox', { name: 'Incolla la lista' }), { target: { value: text } })
/** IndexedDB (fake-indexeddb) needs several macrotasks per transaction. */
const outcome = () => document.querySelector('.deck-import__outcome') as HTMLElement
const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 30; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
const analyse = async () => {
  fireEvent.click(screen.getByRole('button', { name: /analizza lista|riprova analisi/i }))
  await settle()
}

describe('Importa mazzo (R3 §5)', () => {
  it('saves a recognised list with its commander, ready offline (happy path)', async () => {
    const { onDone, onSaved } = renderImport()
    expect(screen.getByText('1 di 3 · Lista')).toBeInTheDocument()
    type('Commander\n1 Zimone, Infinite Analyst\nMainboard\n1 Sol Ring\n12 Island')
    await analyse()
    expect(screen.getByText('2 di 3 · Verifica')).toBeInTheDocument()
    expect(screen.getByText('14 carte riconosciute · 0 righe da correggere')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByText('3 di 3 · Dettagli')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'Quandrix Unlimited' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comandante' }), { target: { value: zimone.cardId } })
    expect(screen.getByText("Legalità non verificata dall'app.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Salva e prepara offline' }))
    await settle()
    expect(outcome()).toHaveTextContent('Mazzo disponibile offline')
    const [deck] = await store.listDecks()
    expect(deck).toMatchObject({ name: 'Quandrix Unlimited', owner: { kind: 'me' }, commanders: [zimone.cardId, null], offline: 'complete' })
    expect(deck.cards.map((entry) => [entry.name, entry.quantity])).toEqual([
      ['Zimone, Infinite Analyst', 1],
      ['Sol Ring', 1],
      ['Island', 12],
    ])
    expect(drawablePool(deck)).not.toContain(zimone.cardId)
    expect(onSaved).toHaveBeenCalled()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Apri il mazzo' }))
    expect(onDone).toHaveBeenCalledWith('deck-1')
  })

  it('keeps the text and offers a retry when the network is down', async () => {
    renderImport({ recognize: async () => Promise.reject(new ScryfallError('network', 'offline')) })
    type('1 Sol Ring')
    await analyse()
    expect(screen.getByRole('alert')).toHaveTextContent('Serve una connessione per riconoscere nuove carte.')
    expect(screen.getByRole('textbox', { name: 'Incolla la lista' })).toHaveValue('1 Sol Ring')
    expect(screen.getByRole('button', { name: 'Riprova analisi' })).toBeEnabled()
  })

  it('says when Scryfall itself does not answer', async () => {
    renderImport({ recognize: async () => Promise.reject(new ScryfallError('response', 'down')) })
    type('1 Sol Ring')
    await analyse()
    expect(screen.getByRole('alert')).toHaveTextContent('Scryfall non risponde.')
  })

  it('needs the excluded sections and the unrecognised lines confirmed before continuing', async () => {
    renderImport()
    type('1 Sol Ring\n1 Carta Inesistente\nnonsense\nSideboard\n1 Pithing Needle\n1 Duress\n1 Negate')
    await analyse()
    expect(screen.getByText('1 carte riconosciute · 2 righe da correggere')).toBeInTheDocument()
    const continueButton = screen.getByRole('button', { name: 'Continua' })
    expect(continueButton).toBeDisabled()
    expect(screen.getByText('Sideboard · 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ignora 3 righe fuori lista' }))
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Salva senza 2 righe' }))
    expect(screen.getByText('2 righe escluse')).toBeInTheDocument()
    expect(continueButton).toBeEnabled()
  })

  it('resolves an ambiguous line by choosing, and a missing one by searching again', async () => {
    renderImport()
    type('1 Coltivare\n1 Sl Ring')
    await analyse()
    expect(screen.getByText('Scegli una corrispondenza')).toBeInTheDocument()
    const options = within(screen.getByRole('radiogroup', { name: 'Corrispondenze per 1 Coltivare' })).getAllByRole('radio')
    fireEvent.click(options[1])
    expect(options[1]).toHaveAttribute('aria-checked', 'true')
    fireEvent.change(screen.getByRole('textbox', { name: 'Correggi 1 Sl Ring' }), { target: { value: 'Sol Ring' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerca carta' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Sol Ring/ }))
    expect(screen.getByRole('button', { name: 'Continua' })).toBeEnabled()
  })

  it('says when a corrected name still matches nothing', async () => {
    renderImport()
    type('1 Sl Ring')
    await analyse()
    fireEvent.change(screen.getByRole('textbox', { name: 'Correggi 1 Sl Ring' }), { target: { value: 'Nulla' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerca carta' }))
    await settle()
    expect(screen.getByText('Nessuna corrispondenza')).toBeInTheDocument()
  })

  it('asks before adding a searched commander that is not in the list, and supports Partner and a friend’s deck', async () => {
    renderImport()
    type('1 Zimone, Infinite Analyst\n1 Sol Ring')
    await analyse()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'Coppia' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Un amico' }))
    const save = screen.getByRole('button', { name: 'Salva e prepara offline' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comandante' }), { target: { value: zimone.cardId } })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: "Nome dell'amico" }), { target: { value: 'Giulia' } })
    expect(save).toBeEnabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Due comandanti (Partner)' }))
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cerca un comandante' }), { target: { value: 'kraum' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerca' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Kraum/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi come comandante' }))
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await settle()
    const [deck] = await store.listDecks()
    expect(deck).toMatchObject({ owner: { kind: 'friend', name: 'Giulia' }, commanders: [zimone.cardId, kraum.cardId] })
    expect(deck.cards.map((entry) => entry.name)).toContain('Kraum, Ludevic’s Opus')
  })

  it('offers the two quota choices and saves without every crop on request (Review Focus 1)', async () => {
    const { onDone } = renderImport({ prepare: async () => ({ offline: 'partial', missing: [uuid(3)], reason: 'quota' }) })
    type('1 Zimone, Infinite Analyst\n1 Sol Ring')
    await analyse()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'Pieno' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comandante' }), { target: { value: zimone.cardId } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva e prepara offline' }))
    await settle()
    expect(outcome()).toHaveTextContent('Lo spazio del dispositivo non basta per tutti i ritagli')
    expect((await store.listDecks())[0].offline).toBe('incomplete')
    fireEvent.click(screen.getByRole('button', { name: 'Salva senza tutti i ritagli' }))
    await settle()
    expect((await store.listDecks())[0].offline).toBe('partial')
    expect(onDone).toHaveBeenCalledWith('deck-1')
  })

  it('discards the deck when the player cancels after a quota error', async () => {
    const { onCancel } = renderImport({ prepare: async () => ({ offline: 'partial', missing: [], reason: 'quota' }) })
    type('1 Zimone, Infinite Analyst')
    await analyse()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'X' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comandante' }), { target: { value: zimone.cardId } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva e prepara offline' }))
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    await settle()
    expect(await store.listDecks()).toEqual([])
    expect(onCancel).toHaveBeenCalled()
  })

  it('resumes an interrupted download without duplicating the deck (Review Focus 5)', async () => {
    let calls = 0
    renderImport({
      prepare: async () => {
        calls += 1
        return calls === 1 ? { offline: 'incomplete', missing: [uuid(3)], reason: 'network' } : { offline: 'complete', missing: [], reason: null }
      },
    })
    type('1 Zimone, Infinite Analyst\n1 Sol Ring')
    await analyse()
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del mazzo' }), { target: { value: 'Rete' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Comandante' }), { target: { value: zimone.cardId } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva e prepara offline' }))
    await settle()
    expect(outcome()).toHaveTextContent('Preparazione offline incompleta')
    fireEvent.click(screen.getByRole('button', { name: 'Riprendi download' }))
    await settle()
    expect(outcome()).toHaveTextContent('Mazzo disponibile offline')
    expect(await store.listDecks()).toHaveLength(1)
    expect((await store.listDecks())[0].offline).toBe('complete')
  })

  it('comes back at Verifica after a reload, offline, from the draft and the stored cards (fix 2)', async () => {
    const first = renderImport()
    type('1 Zimone, Infinite Analyst\n1 Coltivare')
    await analyse()
    first.unmount()
    const offline = vi.fn(async () => Promise.reject(new ScryfallError('network', 'offline')))
    renderImport({ recognize: offline })
    await settle()
    expect(screen.getByText('2 di 3 · Verifica')).toBeInTheDocument()
    expect(screen.getByText('Scegli una corrispondenza')).toBeInTheDocument()
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByText(/1 carte riconosciute/)).toBeInTheDocument()
    expect(offline).not.toHaveBeenCalled()
    expect(screen.getByText('Bozza di importazione recuperata')).toBeInTheDocument()
  })

  it('drops earlier choices when the text changes and is analysed again', async () => {
    renderImport()
    type('1 Coltivare')
    await analyse()
    fireEvent.click(within(screen.getByRole('radiogroup')).getAllByRole('radio')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Torna al testo' }))
    type('\n1 Coltivare')
    await analyse()
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio').every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('empties the text, and goes back to the library', () => {
    const { onCancel } = renderImport()
    type('1 Sol Ring')
    fireEvent.click(screen.getByRole('button', { name: 'Svuota' }))
    expect(screen.getByRole('textbox', { name: 'Incolla la lista' })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: /torna ai mazzi/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
