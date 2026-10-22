import fc from 'fast-check'
import { CATEGORIES, CATEGORY_LABELS, categorize, categoryCounts } from './categories'
import type { Category } from './categories'
import fixtures from './__fixtures__/category-cards.json'
import type { DeckRecord } from './model'

/** The plan's matrix (R3 Task 4): every card listed must fall in its category. */
const POSITIVE: Record<Category, string[]> = {
  lands: ['Command Tower', 'Forest', 'Reliquary Tower', 'Exotic Orchard', 'Bojuka Bog', 'Dryad Arbor'],
  ramp: ['Sol Ring', 'Arcane Signet', 'Llanowar Elves', 'Cultivate', 'Rampant Growth', 'Three Visits', 'Exploration'],
  draw: ['Rhystic Study', 'Brainstorm', 'Ponder', "Night's Whisper", 'Harmonize', 'Mystic Remora'],
  targeted: ['Swords to Plowshares', 'Path to Exile', 'Counterspell', 'Beast Within', 'Anguished Unmaking', "Nature's Claim", 'Lightning Bolt'],
  sweepers: ['Wrath of God', 'Damnation', 'Toxic Deluge', 'Blasphemous Act', 'Farewell', 'Austere Command', 'Evacuation'],
  protection: ['Heroic Intervention', 'Lightning Greaves', 'Swiftfoot Boots', "Teferi's Protection", 'Flawless Maneuver', 'Boros Charm'],
  tutors: ['Demonic Tutor', 'Vampiric Tutor', 'Enlightened Tutor', 'Worldly Tutor', 'Mystical Tutor', 'Finale of Devastation'],
  recursion: ['Eternal Witness', 'Regrowth', 'Reanimate', 'Sun Titan', 'Unearth', 'Phyrexian Reclamation', 'Ramunap Excavator'],
  wincons: ["Thassa's Oracle", 'Laboratory Maniac', 'Approach of the Second Sun', 'Felidar Sovereign', 'Revel in Riches', 'Craterhoof Behemoth', 'Overrun'],
  other: ['Grizzly Bears', 'Serra Angel', 'Doubling Season', 'Panharmonicon', 'Anointed Procession', 'Glorious Anthem', 'Carnage Tyrant'],
}

const NEGATIVE: Array<[string, Category]> = [
  ['Glorious Anthem', 'wincons'],
  ['Carnage Tyrant', 'protection'],
  ['Command Tower', 'ramp'],
  ['Three Visits', 'tutors'],
  ['Cyclonic Rift', 'sweepers'],
]

const byName = new Map(fixtures.map((card) => [card.name, card]))
const fixture = (name: string) => {
  const card = byName.get(name)
  if (!card) throw new Error(`Missing fixture ${name}`)
  return card
}

describe('deck categories (R3 §7.2)', () => {
  it('lists the ten categories in the stable order, with Italian labels', () => {
    expect(CATEGORIES.map((category) => CATEGORY_LABELS[category])).toEqual([
      'Terre',
      'Accelerazione',
      'Pescata e selezione',
      'Interazione mirata',
      'Rimozioni globali',
      'Protezione',
      'Tutor',
      'Recupero dal cimitero',
      'Condizioni di vittoria',
      'Non classificate',
    ])
  })

  it('has at least five real Scryfall fixtures per category', () => {
    for (const names of Object.values(POSITIVE)) expect(names.length).toBeGreaterThanOrEqual(5)
  })

  for (const category of CATEGORIES) {
    it.each(POSITIVE[category])(`puts %s in ${category}`, (name) => {
      expect(categorize(fixture(name))).toContain(category)
    })
  }

  it.each(NEGATIVE)('keeps %s out of %s', (name, category) => {
    expect(categorize(fixture(name))).not.toContain(category)
  })

  it('reads Cyclonic Rift as targeted interaction once its reminder text is removed', () => {
    expect(categorize(fixture('Cyclonic Rift'))).toEqual(['targeted'])
  })

  it('never puts a card in Non classificate together with another category, and returns the stable order', () => {
    for (const card of fixtures) {
      const categories = categorize(card)
      expect(categories.length).toBeGreaterThan(0)
      expect(!categories.includes('other') || categories.length === 1).toBe(true)
      expect(categories).toEqual(CATEGORIES.filter((category) => categories.includes(category)))
    }
  })

  it('is pure: the same card always gives the same categories, in any order of evaluation', () => {
    const expected = new Map(fixtures.map((card) => [card.name, categorize(card)]))
    fc.assert(
      fc.property(fc.shuffledSubarray(fixtures, { minLength: fixtures.length }), (shuffled) => {
        for (const card of shuffled) expect(categorize(card)).toEqual(expected.get(card.name))
      }),
    )
  })

  it('reads every face of a double-faced card and ignores its own name', () => {
    expect(categorize({ name: 'Win Engine // Back', typeLine: 'Creature // Creature', oracleText: 'Flying\nYou win the game.' })).toEqual(['wincons'])
    // A card named like a rule ("Draw two cards") is not drawn into a category by its name.
    expect(categorize({ name: 'Draw Two Cards', typeLine: 'Creature', oracleText: 'When Draw Two Cards enters, it gets +1/+1.' })).toEqual(['other'])
  })

  it('counts copies per category, leaving out the commanders and unknown cards', () => {
    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    const cards = new Map([
      [uuid(1), { ...fixture('Felidar Sovereign'), cardId: uuid(1) }],
      [uuid(2), { ...fixture('Forest'), cardId: uuid(2) }],
      [uuid(3), { ...fixture('Sol Ring'), cardId: uuid(3) }],
    ])
    const deck = {
      commanders: [uuid(1), null],
      cards: [
        { cardId: uuid(1), name: 'Felidar Sovereign', quantity: 1, set: null, number: null },
        { cardId: uuid(2), name: 'Forest', quantity: 12, set: null, number: null },
        { cardId: uuid(3), name: 'Sol Ring', quantity: 1, set: null, number: null },
        { cardId: uuid(9), name: 'Unknown', quantity: 1, set: null, number: null },
      ],
    } as unknown as DeckRecord
    expect(categoryCounts(deck, cards)).toEqual([
      { category: 'lands', count: 12, cardIds: [uuid(2)] },
      { category: 'ramp', count: 1, cardIds: [uuid(3)] },
    ])
  })
})
