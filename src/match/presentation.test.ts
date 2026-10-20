import fc from 'fast-check'
import {
  artKeepSet,
  assignArt,
  createMatch,
  loadMatch,
  MATCH_KEY,
  MAX_SPARE_ART,
  parseMatch,
  saveMatch,
  startNewMatch,
  subscribeToMatchChanges,
} from './presentation'
import type { MatchPresentation, RandomArt } from './presentation'

const art = (n: number): RandomArt => ({
  cardId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: `Carta ${n}`,
  artist: `Artista ${n}`,
})

let next = 0
const newId = () => `match-${++next}`

const match = (overrides: Partial<MatchPresentation> = {}): MatchPresentation => ({
  version: 1,
  matchId: 'match-a',
  randomArtBySeat: {},
  spareArt: [],
  ...overrides,
})

afterEach(() => vi.restoreAllMocks())

describe('match presentation (D-039)', () => {
  it('creates an empty match with a fresh id', () => {
    expect(createMatch(() => 'm1')).toEqual(match({ matchId: 'm1' }))
  })

  it.each([
    ['a non-object', 42],
    ['null', null],
    ['a wrong version', { ...match(), version: 2 }],
    ['an empty match id', { ...match(), matchId: '' }],
    ['a non-string match id', { ...match(), matchId: 7 }],
    ['an over-long match id', { ...match(), matchId: 'x'.repeat(65) }],
    ['a non-object seat map', { ...match(), randomArtBySeat: [] }],
    ['a null seat map', { ...match(), randomArtBySeat: null }],
    ['invalid seat art', { ...match(), randomArtBySeat: { 'player-1': { cardId: 'nope', name: 'a', artist: 'b' } } }],
    ['a non-array spare list', { ...match(), spareArt: {} }],
    ['invalid spare art', { ...match(), spareArt: [{ name: 'x' }] }],
    ['too many spares', { ...match(), spareArt: [art(1), art(2), art(3), art(4), art(5)] }],
  ])('rejects %s', (_, value) => {
    expect(parseMatch(value)).toBeNull()
  })

  it('accepts a valid envelope', () => {
    const valid = match({ randomArtBySeat: { 'player-1': art(1) }, spareArt: [art(2)] })
    expect(parseMatch(valid)).toEqual(valid)
  })

  it('round-trips any valid envelope through JSON', () => {
    const artArb = fc.integer({ min: 0, max: 999 }).map(art)
    const envelope = fc.record({
      version: fc.constant(1 as const),
      matchId: fc.string({ minLength: 1, maxLength: 64 }),
      randomArtBySeat: fc.dictionary(fc.constantFrom('player-1', 'player-2', 'player-3', 'player-4'), artArb),
      spareArt: fc.array(artArb, { maxLength: MAX_SPARE_ART }),
    })
    fc.assert(
      fc.property(envelope, (value) => {
        expect(parseMatch(JSON.parse(JSON.stringify(value)))).toEqual(value)
      }),
    )
  })

  it('starts a new match: new id, empty seats, old arts become spares without duplicates, capped at 4', () => {
    const previous = match({
      randomArtBySeat: { 'player-1': art(1), 'player-2': art(2), 'player-3': art(1) },
      spareArt: [art(3), art(2), art(4), art(5)],
    })
    const fresh = startNewMatch(previous, () => 'match-b')
    expect(fresh.matchId).toBe('match-b')
    expect(fresh.randomArtBySeat).toEqual({})
    expect(fresh.spareArt).toEqual([art(1), art(2), art(3), art(4)])
  })

  it('assigns art to a seat, keeping the reference when nothing changes', () => {
    const base = match({ randomArtBySeat: { 'player-1': art(1) } })
    expect(assignArt(base, 'player-1', art(1))).toBe(base)
    expect(assignArt(base, 'player-2', art(2)).randomArtBySeat).toEqual({ 'player-1': art(1), 'player-2': art(2) })
  })

  it('keeps every assigned and spare art in the cache', () => {
    expect(artKeepSet(match({ randomArtBySeat: { 'player-1': art(1) }, spareArt: [art(2)] }))).toEqual(
      new Set([art(1).cardId, art(2).cardId]),
    )
  })

  it('loads a saved match, or a fresh one for missing or corrupt storage', () => {
    expect(loadMatch(() => 'fresh').matchId).toBe('fresh')
    localStorage.setItem(MATCH_KEY, '{broken')
    expect(loadMatch(() => 'fresh-2').matchId).toBe('fresh-2')
    localStorage.setItem(MATCH_KEY, JSON.stringify({ version: 9 }))
    expect(loadMatch(newId).matchId).toMatch(/^match-/)
    const saved = match({ randomArtBySeat: { 'player-2': art(2) } })
    expect(saveMatch(saved)).toBe(true)
    expect(loadMatch(() => 'unused')).toEqual(saved)
  })

  it('reports failed reads and writes without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(saveMatch(match())).toBe(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadMatch(() => 'safe').matchId).toBe('safe')
  })

  it('follows valid matches stored by another tab only', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToMatchChanges(onChange)
    const fire = (key: string, newValue: string | null) => window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
    fire('other', JSON.stringify(match()))
    fire(MATCH_KEY, null)
    fire(MATCH_KEY, '{broken')
    fire(MATCH_KEY, JSON.stringify({ version: 3 }))
    expect(onChange).not.toHaveBeenCalled()
    fire(MATCH_KEY, JSON.stringify(match({ matchId: 'other-tab' })))
    expect(onChange).toHaveBeenCalledWith(match({ matchId: 'other-tab' }))
    unsubscribe()
    fire(MATCH_KEY, JSON.stringify(match()))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
