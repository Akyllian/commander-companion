import fc from 'fast-check'
import { CommanderMissingError, drawablePool, parseDeck, totalCards, withListChange } from './model'
import type { DeckCard, DeckRecord } from './model'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const card = (n: number, quantity = 1, overrides: Partial<DeckCard> = {}): DeckCard => ({
  cardId: id(n),
  name: `Carta ${n}`,
  quantity,
  set: null,
  number: null,
  ...overrides,
})

/** A 100-card deck: commander (1), 87 singletons and 12 Islands. */
const deck = (overrides: Partial<DeckRecord> = {}): DeckRecord => ({
  version: 1,
  id: 'deck-1',
  name: 'Quandrix Unlimited',
  owner: { kind: 'me' },
  commanders: [id(1), null],
  cards: [card(1), ...Array.from({ length: 87 }, (_, i) => card(i + 2)), card(200, 12, { name: 'Island' })],
  unrecognized: [],
  notes: '',
  keyCards: [],
  createdAt: 1,
  updatedAt: 1,
  offline: 'complete',
  ...overrides,
})

describe('deck model (R3)', () => {
  it('accepts a valid deck and totals its copies', () => {
    expect(parseDeck(deck())).toEqual(deck())
    expect(totalCards(deck())).toBe(100)
  })

  it.each([
    ['a non-object', 'deck'],
    ['a wrong version', { ...deck(), version: 2 }],
    ['an empty name', deck({ name: '' })],
    ['an untrimmed name', deck({ name: ' Mazzo ' })],
    ['a long name', deck({ name: 'x'.repeat(61) })],
    ['an empty id', deck({ id: '' })],
    ['quantity 0', deck({ cards: [card(1), card(2, 0)] })],
    ['quantity 100', deck({ cards: [card(1), card(2, 100)] })],
    ['a fractional quantity', deck({ cards: [card(1), card(2, 1.5)] })],
    ['a bad card id', deck({ cards: [card(1), { ...card(2), cardId: 'nope' }] })],
    ['an empty card name', deck({ cards: [card(1), { ...card(2), name: '' }] })],
    ['a non-string set', deck({ cards: [card(1), { ...card(2), set: 3 as unknown as string }] })],
    ['a non-array card list', { ...deck(), cards: {} }],
    ['a commander not in the list', deck({ commanders: [id(999), null] })],
    ['a missing commander', deck({ commanders: [null as unknown as string, null] })],
    ['a second commander equal to the first', deck({ commanders: [id(1), id(1)] })],
    ['a second commander not in the list', deck({ commanders: [id(1), id(998)] })],
    ['a non-array commanders field', { ...deck(), commanders: id(1) }],
    ['three commander slots', { ...deck(), commanders: [id(1), null, null] }],
    ['nine key cards', deck({ keyCards: Array.from({ length: 9 }, (_, i) => ({ cardId: id(i + 2), note: '' })) })],
    ['a key card not in the list', deck({ keyCards: [{ cardId: id(999), note: '' }] })],
    ['a repeated key card', deck({ keyCards: [{ cardId: id(2), note: '' }, { cardId: id(2), note: '' }] })],
    ['a long key card note', deck({ keyCards: [{ cardId: id(2), note: 'x'.repeat(141) }] })],
    ['a non-array key card list', { ...deck(), keyCards: null }],
    ['an unknown offline state', { ...deck(), offline: 'ready' }],
    ['an unknown owner kind', { ...deck(), owner: { kind: 'team' } }],
    ['a friend without a name', { ...deck(), owner: { kind: 'friend', name: ' ' } }],
    ['a non-object owner', { ...deck(), owner: 'me' }],
    ['long notes', deck({ notes: 'x'.repeat(10_001) })],
    ['non-string unrecognized lines', { ...deck(), unrecognized: [3] }],
    ['a non-array unrecognized list', { ...deck(), unrecognized: 'x' }],
    ['a non-number timestamp', { ...deck(), updatedAt: 'now' }],
  ])('rejects %s', (_, value) => {
    expect(parseDeck(value)).toBeNull()
  })

  it('accepts a friend’s deck with a Partner and key cards', () => {
    const value = deck({ owner: { kind: 'friend', name: 'Giulia' }, commanders: [id(1), id(2)], keyCards: [{ cardId: id(3), note: 'Vince' }] })
    expect(parseDeck(value)).toEqual(value)
  })

  it('round-trips any valid deck through JSON', () => {
    const arbitrary = fc
      .record({
        size: fc.integer({ min: 1, max: 40 }),
        quantities: fc.array(fc.integer({ min: 1, max: 99 }), { minLength: 40, maxLength: 40 }),
        partner: fc.boolean(),
        keys: fc.integer({ min: 0, max: 8 }),
        friend: fc.option(fc.string({ minLength: 1, maxLength: 28 }).map((name) => name.trim()).filter(Boolean)),
        notes: fc.string({ maxLength: 200 }),
      })
      .map(({ size, quantities, partner, keys, friend, notes }) => {
        const cards = Array.from({ length: Math.max(size, 10) }, (_, i) => card(i + 1, quantities[i]))
        return deck({
          cards,
          commanders: [id(1), partner ? id(2) : null],
          keyCards: Array.from({ length: keys }, (_, i) => ({ cardId: id(i + 3), note: `n${i}` })),
          owner: friend ? { kind: 'friend', name: friend } : { kind: 'me' },
          notes,
        })
      })
    fc.assert(
      fc.property(arbitrary, (value) => {
        expect(parseDeck(JSON.parse(JSON.stringify(value)))).toEqual(value)
      }),
    )
  })

  it('builds the drawable pool: copies expanded, one copy of each commander left out', () => {
    const pool = drawablePool(deck())
    expect(pool).toHaveLength(99)
    expect(pool).not.toContain(id(1))
    expect(pool.filter((cardId) => cardId === id(200))).toHaveLength(12)
    expect(drawablePool(deck({ commanders: [id(1), id(2)] }))).toHaveLength(98)
    // A commander listed with two copies leaves the other copy drawable.
    expect(drawablePool(deck({ cards: [card(1, 2), card(2)] }))).toEqual([id(1), id(2)])
  })

  it('drops key cards removed from the list and reports them', () => {
    const before = deck({ keyCards: [{ cardId: id(2), note: '' }, { cardId: id(3), note: 'x' }] })
    const cards = before.cards.filter((entry) => entry.cardId !== id(2))
    const { deck: after, removedKeyCards } = withListChange(before, cards, 50)
    expect(removedKeyCards).toEqual([id(2)])
    expect(after.keyCards).toEqual([{ cardId: id(3), note: 'x' }])
    expect(after.cards).toBe(cards)
    expect(after.updatedAt).toBe(50)
  })

  it('refuses a list without a commander', () => {
    const before = deck({ commanders: [id(1), id(2)] })
    expect(() => withListChange(before, before.cards.filter((entry) => entry.cardId !== id(1)), 2)).toThrow(CommanderMissingError)
    expect(() => withListChange(before, before.cards.filter((entry) => entry.cardId !== id(2)), 2)).toThrow(CommanderMissingError)
  })
})
