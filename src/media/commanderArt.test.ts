import { IDBFactory } from 'fake-indexeddb'
import { SAFE_BOOST } from './artAnalysis'
import { createIndexedDbArtStore } from './artStore'
import { fetchAndStoreArt } from './commanderArt'

const candidate = {
  cardId: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9',
  name: 'Zimone, All-Questioning',
  artist: 'Ekaterina Burmak',
  artUrl: 'https://cards.scryfall.io/art_crop/front/c/a/ca09.jpg',
}
const jpeg = () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer
  return { type: 'image/jpeg', arrayBuffer: () => Promise.resolve(bytes) } as unknown as Blob
}

describe('fetchAndStoreArt', () => {
  it('downloads, measures and caches the art, then returns the commander', async () => {
    const store = createIndexedDbArtStore(new IDBFactory())
    const download = vi.fn(async () => jpeg())
    const commander = await fetchAndStoreArt(candidate, { store, download, analyze: async () => ({ name: 0.1, life: 0 }) })

    expect(download).toHaveBeenCalledWith(candidate.artUrl)
    expect(commander).toEqual({ cardId: candidate.cardId, name: candidate.name, artist: candidate.artist })
    expect(await store.get(candidate.cardId)).toMatchObject({ type: 'image/jpeg', veil: { name: 0.1, life: 0 } })
  })

  it('falls back to a strong veil when the art cannot be measured', async () => {
    const store = createIndexedDbArtStore(new IDBFactory())
    await fetchAndStoreArt(candidate, { store, download: async () => jpeg(), analyze: () => Promise.reject(new Error('no canvas')) })
    expect((await store.get(candidate.cardId))?.veil).toEqual(SAFE_BOOST)
  })

  it('stores nothing when the download fails', async () => {
    const store = createIndexedDbArtStore(new IDBFactory())
    await expect(
      fetchAndStoreArt(candidate, { store, download: () => Promise.reject(new Error('offline')), analyze: async () => SAFE_BOOST }),
    ).rejects.toThrow('offline')
    expect(await store.keys()).toEqual([])
  })
})
