import { parseList } from './parseList'
import { recognize } from './recognize'
import { ScryfallError } from '../media/scryfall'
import type { CardData, CollectionIdentifier } from '../media/scryfall'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const card = (n: number, name: string, overrides: Partial<CardData> = {}): CardData => ({
  cardId: uuid(n),
  name,
  printedName: null,
  typeLine: 'Artifact',
  oracleText: '',
  manaCost: '',
  artist: 'Artist',
  artUrl: null,
  set: 'set',
  number: String(n),
  ...overrides,
})

/** A fake Scryfall: a catalogue by English name and by printing, plus localized matches. */
function fakeScryfall(catalogue: CardData[], localized: Record<string, CardData[]> = {}) {
  const requests: CollectionIdentifier[][] = []
  const fetchCollection = vi.fn(async (identifiers: CollectionIdentifier[]) => {
    requests.push(identifiers)
    const found: CardData[] = []
    const notFound: unknown[] = []
    for (const identifier of identifiers) {
      const match =
        'name' in identifier
          ? catalogue.find((entry) => entry.name.toLowerCase() === identifier.name.toLowerCase() || entry.name.split(' // ')[0].toLowerCase() === identifier.name.toLowerCase())
          : catalogue.find((entry) => entry.set === identifier.set && entry.number === identifier.collector_number)
      if (match) found.push(match)
      else notFound.push(identifier)
    }
    return { found, notFound }
  })
  const searchLocalized = vi.fn(async (name: string) => localized[name] ?? [])
  return { deps: { fetchCollection, searchLocalized }, requests, fetchCollection, searchLocalized }
}

const solRing = card(1, 'Sol Ring', { set: 'cmm', number: '396' })
const solRingOther = card(2, 'Sol Ring', { set: 'c21', number: '263' })
const zimone = card(3, 'Zimone, Infinite Analyst', { typeLine: 'Legendary Creature — Human Wizard' })
const delver = card(4, 'Delver of Secrets // Insectile Aberration')

describe('recognize (R3 §5.2–5.4)', () => {
  it('identifies printings first, then names in one request, and sorts every line', async () => {
    const scryfall = fakeScryfall([solRing, solRingOther, zimone, delver])
    const lines = parseList('Commander\n1 Zimone, Infinite Analyst\nMainboard\n1 Sol Ring (CMM) 396\n1 Delver of Secrets\nnonsense line\nSideboard\n1 Sol Ring')
    const result = await recognize(lines, scryfall.deps)
    expect(scryfall.requests).toEqual([[{ set: 'cmm', collector_number: '396' }], [{ name: 'Zimone, Infinite Analyst' }, { name: 'Delver of Secrets' }]])
    expect(result.matched.map(({ line, card: found }) => [line.kind === 'card' && line.name, found.cardId])).toEqual([
      ['Zimone, Infinite Analyst', uuid(3)],
      ['Sol Ring', uuid(1)],
      ['Delver of Secrets', uuid(4)],
    ])
    expect(result.invalid.map((line) => line.source)).toEqual(['nonsense line'])
    expect(result.excluded.map((line) => line.source)).toEqual(['1 Sol Ring'])
    expect(result.missing).toEqual([])
  })

  it('keeps two printings of one name as two matched lines (Review Focus 4)', async () => {
    const scryfall = fakeScryfall([solRing, solRingOther])
    const result = await recognize(parseList('1 Sol Ring (CMM) 396\n1 Sol Ring (C21) 263'), scryfall.deps)
    expect(result.matched.map(({ card: found }) => found.cardId)).toEqual([uuid(1), uuid(2)])
  })

  it('falls back to the name when a printing is unknown', async () => {
    const scryfall = fakeScryfall([solRing])
    const result = await recognize(parseList('1 Sol Ring (XYZ) 1'), scryfall.deps)
    expect(result.matched.map(({ card: found }) => found.cardId)).toEqual([uuid(1)])
  })

  it('asks for each name once, even when listed twice', async () => {
    const scryfall = fakeScryfall([solRing])
    await recognize(parseList('1 Sol Ring\n1 sol ring'), scryfall.deps)
    expect(scryfall.requests).toEqual([[{ name: 'Sol Ring' }]])
  })

  it('resolves a localized name, marks several prints ambiguous and the rest missing', async () => {
    const anello = card(5, 'Sol Ring', { printedName: 'Anello del Sole' })
    const scryfall = fakeScryfall([], { 'Anello del Sole': [anello], Coltivare: [card(6, 'Cultivate'), card(7, 'Cultivate')] })
    const result = await recognize(parseList('1 Anello del Sole\n1 Coltivare\n1 Nessuna Carta\n1 nessuna carta'), scryfall.deps)
    expect(result.matched.map(({ card: found }) => found.cardId)).toEqual([uuid(5)])
    expect(result.ambiguous.map(({ options }) => options.map((option) => option.cardId))).toEqual([[uuid(6), uuid(7)]])
    // The same unknown name is searched once, and both lines stay missing.
    expect(result.missing.map((line) => line.source)).toEqual(['1 Nessuna Carta', '1 nessuna carta'])
    expect(scryfall.searchLocalized).toHaveBeenCalledTimes(3)
  })

  it('makes no request for a list with nothing to identify', async () => {
    const scryfall = fakeScryfall([])
    const result = await recognize(parseList('nonsense\nSideboard\n1 Sol Ring'), scryfall.deps)
    expect(scryfall.fetchCollection).not.toHaveBeenCalled()
    expect(result.invalid).toHaveLength(1)
    expect(result.excluded).toHaveLength(1)
  })

  it('throws a network error and keeps no partial result', async () => {
    const offline = {
      fetchCollection: vi.fn(async () => {
        throw new ScryfallError('network', 'offline')
      }),
      searchLocalized: vi.fn(),
    }
    await expect(recognize(parseList('1 Sol Ring'), offline)).rejects.toMatchObject({ kind: 'network' })
    expect(offline.searchLocalized).not.toHaveBeenCalled()
  })
})
