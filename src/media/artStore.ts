import type { VeilBoost } from './artAnalysis'

/**
 * Commander art cache in IndexedDB (localStorage is far too small for images). Bytes are
 * stored as ArrayBuffer + MIME type, which every engine clones reliably. After the one-time
 * download the art is available offline. Keys are Scryfall card ids.
 */

export interface StoredArt {
  bytes: ArrayBuffer
  type: string
  veil: VeilBoost
}

export interface ArtStore {
  get(cardId: string): Promise<StoredArt | undefined>
  put(cardId: string, art: StoredArt): Promise<void>
  delete(cardId: string): Promise<void>
  keys(): Promise<string[]>
}

export const ART_DB_NAME = 'commander-companion-art'
const STORE = 'art'

/** Wraps an IndexedDB request in a promise. Exported for tests. */
export const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })

export function createIndexedDbArtStore(factory: IDBFactory, name = ART_DB_NAME): ArtStore {
  let database: Promise<IDBDatabase> | null = null
  const open = () => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, 1)
      request.addEventListener('upgradeneeded', () => request.result.createObjectStore(STORE))
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
    return database
  }
  const store = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE)

  return {
    async get(cardId) {
      return requestResult<StoredArt | undefined>((await store('readonly')).get(cardId))
    },
    async put(cardId, art) {
      await requestResult((await store('readwrite')).put(art, cardId))
    },
    async delete(cardId) {
      await requestResult((await store('readwrite')).delete(cardId))
    },
    async keys() {
      return (await requestResult((await store('readonly')).getAllKeys())).map(String)
    },
  }
}

let shared: ArtStore | null | undefined

/** The app-wide store, or null where IndexedDB is unavailable (art then simply does not show). */
export function getArtStore(): ArtStore | null {
  if (shared === undefined) {
    shared = typeof indexedDB === 'undefined' ? null : createIndexedDbArtStore(indexedDB)
  }
  return shared
}

/** Test seam: replace or reset the shared store. */
export function setArtStoreForTests(store: ArtStore | null | undefined) {
  shared = store
}

/** Deletes cached art no current player uses (history does not survive a reload). */
export async function pruneArt(store: ArtStore, keep: ReadonlySet<string>): Promise<number> {
  const orphans = (await store.keys()).filter((cardId) => !keep.has(cardId))
  await Promise.all(orphans.map((cardId) => store.delete(cardId)))
  return orphans.length
}
