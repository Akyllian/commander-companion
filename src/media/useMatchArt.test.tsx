import { act, renderHook } from '@testing-library/react'
import { createGame } from '../game/game'
import { setArtStoreForTests } from './artStore'
import type { ArtStore } from './artStore'
import { useMatchArt } from './useMatchArt'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** An art store holding three crops: one for a saved deck, one orphan, one random seat art. */
function storeWith() {
  const keys = new Set([id(10), id(77), id(8)])
  const store: ArtStore & { deleted: string[] } = {
    deleted: [],
    get: async (key) => (keys.has(key) ? { bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } } : undefined),
    put: async (key) => void keys.add(key),
    delete: async (key) => {
      keys.delete(key)
      store.deleted.push(key)
    },
    keys: async () => [...keys],
  }
  return store
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

describe('first art-cache prune (R3, fix 1)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))))
    localStorage.setItem(
      'commander-companion.match',
      JSON.stringify({ version: 1, matchId: 'm', randomArtBySeat: {}, spareArt: [{ cardId: id(8), name: 'X', artist: 'Y' }] }),
    )
  })
  afterEach(() => {
    setArtStoreForTests(undefined)
    vi.unstubAllGlobals()
  })

  it('waits for the decks, then prunes once keeping match, commander and deck art (cold start)', async () => {
    const store = storeWith()
    setArtStoreForTests(store)
    const players = createGame(2).players
    const { rerender } = renderHook(({ deckArt }) => useMatchArt(players, deckArt), {
      initialProps: { deckArt: 'loading' as Set<string> | 'loading' | 'unavailable' },
    })
    await settle()
    // The decks are not loaded yet: nothing may be deleted, not even the orphan.
    expect(store.deleted).toEqual([])
    rerender({ deckArt: new Set([id(10)]) })
    await settle()
    expect(store.deleted).toEqual([id(77)])
    rerender({ deckArt: new Set() })
    await settle()
    expect(store.deleted).toEqual([id(77)])
  })

  it('never prunes when the deck store cannot be read', async () => {
    const store = storeWith()
    setArtStoreForTests(store)
    renderHook(() => useMatchArt(createGame(2).players, 'unavailable'))
    await settle()
    expect(store.deleted).toEqual([])
  })
})
