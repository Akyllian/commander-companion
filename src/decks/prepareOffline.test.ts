import { prepareOffline } from './prepareOffline'
import { cardData, deckRecord, uuid } from './testing'
import type { ArtStore, StoredArt } from '../media/artStore'
import { ScryfallError } from '../media/scryfall'

const stored: StoredArt = { bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } }

function memoryArt(cached: number[] = [], failOn?: (cardId: string) => Error | null): ArtStore & { saved: string[] } {
  const keys = new Set(cached.map(uuid))
  const saved: string[] = []
  return {
    saved,
    get: async (cardId) => (keys.has(cardId) ? stored : undefined),
    put: async (cardId) => {
      const error = failOn?.(cardId)
      if (error) throw error
      keys.add(cardId)
      saved.push(cardId)
    },
    delete: async () => undefined,
    keys: async () => [...keys],
  }
}

const cards = Array.from({ length: 10 }, (_, i) => cardData(i + 1))
const deps = (art: ArtStore, download = vi.fn(async (_url: string) => new Blob(['x'], { type: 'image/jpeg' }))) => ({
  art,
  download,
  analyze: async () => ({ name: 0, life: 0 }),
  onProgress: vi.fn(),
})

describe('prepareOffline (R3 §5.5, §12.1)', () => {
  it('is complete at once when every crop is already cached', async () => {
    const options = deps(memoryArt(cards.map((_, i) => i + 1)))
    expect(await prepareOffline(deckRecord(), cards, options)).toEqual({ offline: 'complete', missing: [], reason: null })
    expect(options.download).not.toHaveBeenCalled()
    expect(options.onProgress).toHaveBeenLastCalledWith(10, 10)
  })

  it('downloads the missing crops in order, commander first, and reports progress', async () => {
    const art = memoryArt([2, 3])
    const options = deps(art)
    const result = await prepareOffline(deckRecord({ commanders: [uuid(5), null] }), cards, options)
    expect(result.offline).toBe('complete')
    expect(art.saved[0]).toBe(uuid(5))
    expect(art.saved).toHaveLength(8)
    expect(options.onProgress).toHaveBeenCalledWith(10, 10)
  })

  it('counts cards without a crop at Scryfall as done', async () => {
    const options = deps(memoryArt())
    const noArt = cards.map((card) => ({ ...card, artUrl: null }))
    expect((await prepareOffline(deckRecord(), noArt, options)).offline).toBe('complete')
    expect(options.download).not.toHaveBeenCalled()
  })

  it('stops at the first network error, and a second run resumes with the missing crops only (Review Focus 5)', async () => {
    const art = memoryArt()
    let calls = 0
    const flaky = vi.fn(async (_url: string) => {
      calls += 1
      if (calls === 4) throw new ScryfallError('network', 'offline')
      return new Blob(['x'], { type: 'image/jpeg' })
    })
    const first = await prepareOffline(deckRecord(), cards, deps(art, flaky))
    expect(first).toMatchObject({ offline: 'incomplete', reason: 'network' })
    expect(first.missing).toHaveLength(7)
    expect(flaky).toHaveBeenCalledTimes(4)
    const again = vi.fn(async (_url: string) => new Blob(['x'], { type: 'image/jpeg' }))
    expect((await prepareOffline(deckRecord(), cards, deps(art, again))).offline).toBe('complete')
    expect(again).toHaveBeenCalledTimes(7)
  })

  it('gives partial with quota as the reason when the device is full (Review Focus 1)', async () => {
    const quota = new DOMException('full', 'QuotaExceededError')
    const art = memoryArt([], (cardId) => (cardId === uuid(3) ? quota : null))
    const result = await prepareOffline(deckRecord(), cards, deps(art))
    expect(result).toMatchObject({ offline: 'partial', reason: 'quota' })
    expect(result.missing).toEqual(cards.slice(2).map((card) => card.cardId))
  })

  it('keeps going past one broken image, and ends partial', async () => {
    const art = memoryArt()
    const broken = vi.fn(async (url: string) => {
      if (url.endsWith('/4.jpg')) throw new ScryfallError('image', 'too big')
      return new Blob(['x'], { type: 'image/jpeg' })
    })
    expect(await prepareOffline(deckRecord(), cards, deps(art, broken))).toEqual({ offline: 'partial', missing: [uuid(4)], reason: null })
  })

  it('rethrows an unexpected storage error', async () => {
    const art = memoryArt([], () => new Error('disk'))
    await expect(prepareOffline(deckRecord(), cards, deps(art))).rejects.toThrow('disk')
  })
})
