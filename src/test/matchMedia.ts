import { COMPACT_LANDSCAPE_QUERY } from '../platform/useCompactLandscape'

/** Controllable `matchMedia` stub for the compact-landscape query. */
type Listener = (event: { matches: boolean }) => void

export function installMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const list = {
    matches: initial,
    media: COMPACT_LANDSCAPE_QUERY,
    addEventListener: vi.fn((_type: string, listener: Listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: Listener) => listeners.delete(listener)),
  }
  const matchMedia = vi.fn(() => list)
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    matchMedia,
    list,
    set(matches: boolean) {
      list.matches = matches
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}
