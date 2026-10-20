import { fillRandomArt } from './randomArt'
import type { ArtStore, StoredArt } from './artStore'
import { ScryfallError } from './scryfall'
import type { CommanderCandidate } from './scryfall'
import type { MatchPresentation, RandomArt } from '../match/presentation'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const art = (n: number): RandomArt => ({ cardId: id(n), name: `Carta ${n}`, artist: `Artista ${n}` })
const candidate = (n: number): CommanderCandidate => ({ ...art(n), artUrl: `https://cards.scryfall.io/art_crop/${n}.jpg` })

const stored: StoredArt = { bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } }

function fakeStore(cached: number[]): ArtStore {
  const keys = new Set(cached.map(id))
  return {
    get: async (cardId) => (keys.has(cardId) ? stored : undefined),
    put: async (cardId) => void keys.add(cardId),
    delete: async (cardId) => void keys.delete(cardId),
    keys: async () => [...keys],
  }
}

const match = (overrides: Partial<MatchPresentation> = {}): MatchPresentation => ({
  version: 1,
  matchId: 'm',
  randomArtBySeat: {},
  spareArt: [],
  ...overrides,
})

/** A fetch that serves the given card numbers in order, or throws the given errors. */
function fetcher(...results: (number | Error)[]) {
  return vi.fn(async () => {
    const next = results.shift()
    if (next === undefined) throw new Error('unexpected fetch')
    if (next instanceof Error) throw next
    return candidate(next)
  })
}

const storeArt = (store: ArtStore) => async (c: CommanderCandidate) => {
  await store.put(c.cardId, stored)
  return { cardId: c.cardId, name: c.name, artist: c.artist }
}

const offline = () => new ScryfallError('network', 'offline')

describe('fillRandomArt (R2 §4.2, D-039)', () => {
  it('keeps a seat’s cached art for this match without any fetch', async () => {
    const store = fakeStore([1])
    const fetchCandidate = fetcher()
    const before = match({ randomArtBySeat: { 'player-1': art(1) } })
    expect(await fillRandomArt(before, ['player-1'], { store, fetchCandidate, storeArt: storeArt(store) })).toBe(before)
    expect(fetchCandidate).not.toHaveBeenCalled()
  })

  it('online, fetches fresh art for every seat and leaves the spares alone', async () => {
    const store = fakeStore([8, 9])
    const fetchCandidate = fetcher(1, 2)
    const result = await fillRandomArt(match({ spareArt: [art(8), art(9)] }), ['player-1', 'player-2'], {
      store,
      fetchCandidate,
      storeArt: storeArt(store),
    })
    expect(result.randomArtBySeat).toEqual({ 'player-1': art(1), 'player-2': art(2) })
    expect(result.spareArt).toEqual([art(8), art(9)])
  })

  it('never gives two seats the same card, retrying on a duplicate', async () => {
    const store = fakeStore([1])
    const fetchCandidate = fetcher(1, 1, 3)
    const result = await fillRandomArt(match({ randomArtBySeat: { 'player-1': art(1) } }), ['player-1', 'player-2'], {
      store,
      fetchCandidate,
      storeArt: storeArt(store),
    })
    expect(result.randomArtBySeat['player-2']).toEqual(art(3))
  })

  it('offline: one failed request, then unused cached spares, then the neutral texture', async () => {
    const store = fakeStore([1, 8])
    const fetchCandidate = fetcher(offline())
    const result = await fillRandomArt(
      // Spare 1 is already shown by seat 1; spare 9 is not cached any more.
      match({ randomArtBySeat: { 'player-1': art(1) }, spareArt: [art(1), art(9), art(8)] }),
      ['player-1', 'player-2', 'player-3'],
      { store, fetchCandidate, storeArt: storeArt(store) },
    )
    expect(fetchCandidate).toHaveBeenCalledOnce()
    expect(result.randomArtBySeat).toEqual({ 'player-1': art(1), 'player-2': art(8) })
  })

  it('treats a seat that got nothing after three tries as unavailable network', async () => {
    const store = fakeStore([8])
    const bad = new ScryfallError('response', 'no art')
    const fetchCandidate = fetcher(bad, bad, bad)
    const result = await fillRandomArt(match({ spareArt: [art(8)] }), ['player-1', 'player-2'], {
      store,
      fetchCandidate,
      storeArt: storeArt(store),
    })
    expect(fetchCandidate).toHaveBeenCalledTimes(3)
    expect(result.randomArtBySeat).toEqual({ 'player-1': art(8) })
  })

  it('stops fetching when the art download fails on the network', async () => {
    const store = fakeStore([])
    const fetchCandidate = fetcher(1)
    const result = await fillRandomArt(match(), ['player-1', 'player-2'], {
      store,
      fetchCandidate,
      storeArt: async () => {
        throw offline()
      },
    })
    expect(fetchCandidate).toHaveBeenCalledOnce()
    expect(result.randomArtBySeat).toEqual({})
  })

  it('retries when a single art download fails for another reason', async () => {
    const store = fakeStore([])
    let first = true
    const result = await fillRandomArt(match(), ['player-1'], {
      store,
      fetchCandidate: fetcher(1, 2),
      storeArt: async (c) => {
        if (first) {
          first = false
          throw new ScryfallError('image', 'too big')
        }
        return storeArt(store)(c)
      },
    })
    expect(result.randomArtBySeat).toEqual({ 'player-1': art(2) })
  })

  it('replaces a seat’s art that is no longer in the cache', async () => {
    const store = fakeStore([])
    const result = await fillRandomArt(match({ randomArtBySeat: { 'player-1': art(1) } }), ['player-1'], {
      store,
      fetchCandidate: fetcher(2),
      storeArt: storeArt(store),
    })
    expect(result.randomArtBySeat).toEqual({ 'player-1': art(2) })
  })
})
