import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbArtStore, getArtStore, pruneArt, requestResult, setArtStoreForTests } from './artStore'

const art = (byte: number) => ({ bytes: new Uint8Array([byte]).buffer, type: 'image/jpeg', veil: { name: 0, life: 0.2 } })

describe('IndexedDB art store', () => {
  it('stores, reads, lists and deletes art by card id', async () => {
    const store = createIndexedDbArtStore(new IDBFactory())
    await store.put('a', art(1))
    await store.put('b', art(2))

    const read = await store.get('a')
    expect(new Uint8Array(read!.bytes)).toEqual(new Uint8Array([1]))
    expect(read).toMatchObject({ type: 'image/jpeg', veil: { name: 0, life: 0.2 } })
    expect((await store.keys()).toSorted()).toEqual(['a', 'b'])

    await store.delete('a')
    expect(await store.get('a')).toBeUndefined()
  })

  it('prunes art that no player uses', async () => {
    const store = createIndexedDbArtStore(new IDBFactory())
    await store.put('keep', art(1))
    await store.put('old', art(2))
    expect(await pruneArt(store, new Set(['keep']))).toBe(1)
    expect(await store.keys()).toEqual(['keep'])
  })

  it('reports a database that cannot open', async () => {
    const blocked = {
      open: () => ({
        error: new Error('denied'),
        addEventListener: (type: string, listener: () => void) => {
          if (type === 'error') queueMicrotask(listener)
        },
      }),
    } as unknown as IDBFactory
    await expect(createIndexedDbArtStore(blocked, 'x').keys()).rejects.toThrow('denied')
  })

  it('rejects when a single request fails', async () => {
    const failing = {
      error: new Error('quota'),
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'error') queueMicrotask(listener)
      },
    } as unknown as IDBRequest<unknown>
    await expect(requestResult(failing)).rejects.toThrow('quota')
  })

  it('creates the shared store from the browser IndexedDB when available', () => {
    setArtStoreForTests(undefined)
    vi.stubGlobal('indexedDB', new IDBFactory())
    expect(getArtStore()).not.toBeNull()
    vi.unstubAllGlobals()
    setArtStoreForTests(undefined)
  })

  it('exposes no shared store without IndexedDB, and allows injecting one', () => {
    setArtStoreForTests(undefined)
    expect(getArtStore()).toBeNull()
    const store = createIndexedDbArtStore(new IDBFactory())
    setArtStoreForTests(store)
    expect(getArtStore()).toBe(store)
    setArtStoreForTests(undefined)
  })
})
