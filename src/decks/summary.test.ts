import { commanderLine, matchesSearch, OFFLINE_LABELS, ownerLabel, topCategories } from './summary'
import { cardData, deckRecord, uuid } from './testing'

const cards = new Map([
  [uuid(1), cardData(1, { name: 'Zimone, Infinite Analyst' })],
  [uuid(2), cardData(2, { name: 'Kraum, Ludevic’s Opus' })],
  [uuid(3), cardData(3, { name: 'Sol Ring', oracleText: '{T}: Add {C}{C}.' })],
  [uuid(4), cardData(4, { name: 'Brainstorm', oracleText: 'Draw three cards, then put two cards from your hand on top of your library in any order.' })],
  [uuid(5), cardData(5, { name: 'Ponder', oracleText: 'Look at the top three cards of your library.' })],
  [uuid(6), cardData(6, { name: 'Forest', typeLine: 'Basic Land — Forest' })],
  [uuid(7), cardData(7, { name: 'Counterspell', oracleText: 'Counter target spell.' })],
  [uuid(8), cardData(8, { name: 'Wrath of God', oracleText: 'Destroy all creatures.' })],
])

describe('deck summaries (R3 §4.2)', () => {
  it('names the commander, or both Partners, from the card data', () => {
    expect(commanderLine(deckRecord(), cards)).toBe('Zimone, Infinite Analyst')
    expect(commanderLine(deckRecord({ commanders: [uuid(1), uuid(2)] }), cards)).toBe('Zimone, Infinite Analyst + Kraum, Ludevic’s Opus')
    expect(commanderLine(deckRecord({ commanders: [uuid(9), null] }), cards)).toBe('')
  })

  it('says whose deck it is, as text', () => {
    expect(ownerLabel(deckRecord())).toBe('Mio')
    expect(ownerLabel(deckRecord({ owner: { kind: 'friend', name: 'Giulia' } }))).toBe('Di Giulia')
  })

  it('has a label for every offline state', () => {
    expect(OFFLINE_LABELS).toEqual({ complete: 'Disponibile offline', partial: 'Offline senza tutti i ritagli', incomplete: 'Preparazione incompleta' })
  })

  it('summarises at most three categories by count, without lands or unclassified cards', () => {
    const deck = deckRecord({
      cards: [
        { cardId: uuid(1), name: 'Z', quantity: 1, set: null, number: null },
        { cardId: uuid(3), name: 'S', quantity: 1, set: null, number: null },
        { cardId: uuid(4), name: 'B', quantity: 1, set: null, number: null },
        { cardId: uuid(5), name: 'P', quantity: 1, set: null, number: null },
        { cardId: uuid(6), name: 'F', quantity: 30, set: null, number: null },
        { cardId: uuid(7), name: 'C', quantity: 1, set: null, number: null },
        { cardId: uuid(8), name: 'W', quantity: 1, set: null, number: null },
      ],
    })
    // Pescata 2, then the ties in the stable order: Accelerazione, Interazione mirata.
    expect(topCategories(deck, cards)).toBe('Pescata e selezione 2 · Accelerazione 1 · Interazione mirata 1')
  })

  it('searches deck and commander names, ignoring case and accents', () => {
    const deck = deckRecord({ name: 'Città Vecchia' })
    expect(matchesSearch(deck, cards, 'citta')).toBe(true)
    expect(matchesSearch(deck, cards, 'ZIMONE')).toBe(true)
    expect(matchesSearch(deck, cards, '  ')).toBe(true)
    expect(matchesSearch(deck, cards, 'kraum')).toBe(false)
  })
})
