import { useEffect, useState } from 'react'
import { NO_BOOST } from './artAnalysis'
import type { VeilBoost } from './artAnalysis'
import { getArtStore } from './artStore'
import { analyzeArt } from './analyzeImage'
import { fetchAndStoreArt } from './commanderArt'
import { downloadArt, ScryfallError, searchCommanders } from './scryfall'
import type { CommanderCandidate } from './scryfall'
import type { CommanderArt } from '../game/types'

export interface ArtImage {
  url: string
  veil: VeilBoost
}

/** Object URL and veil of a cached art, and whether the cache answered that it has none. */
export function useArtState(cardId: string | null): { image: ArtImage | null; missing: boolean } {
  const [state, setState] = useState<{ cardId: string; art: ArtImage | null } | null>(null)

  useEffect(() => {
    const store = getArtStore()
    if (!cardId || !store) return
    let url: string | null = null
    let cancelled = false
    store
      .get(cardId)
      .then((stored) => {
        if (cancelled) return
        if (!stored) {
          setState({ cardId, art: null })
          return
        }
        url = URL.createObjectURL(new Blob([stored.bytes], { type: stored.type }))
        setState({ cardId, art: { url, veil: stored.veil ?? NO_BOOST } })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [cardId])

  const current = state && state.cardId === cardId ? state : null
  return { image: current?.art ?? null, missing: current !== null && current.art === null }
}

/** Object URL and veil for a cached commander art; null while loading or when absent. */
export function useArtImage(cardId: string | null): ArtImage | null {
  return useArtState(cardId).image
}

export type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'results'; candidates: CommanderCandidate[] }
  | { status: 'saving'; candidate: CommanderCandidate }
  | { status: 'error'; message: string }

const messageFor = (error: unknown) =>
  error instanceof ScryfallError && error.kind === 'network'
    ? 'Serve una connessione a internet per cercare il comandante.'
    : 'Scryfall non ha risposto. Riprova tra poco.'

/**
 * Commander search and selection for the picker. Network access stays in src/media
 * (CLAUDE.md: no network calls in UI components); one request per submitted search.
 */
export function useCommanderSearch(onSelected: (commander: CommanderArt) => void) {
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  const search = async (query: string) => {
    setState({ status: 'searching' })
    try {
      setState({ status: 'results', candidates: await searchCommanders(query) })
    } catch (error) {
      setState({ status: 'error', message: messageFor(error) })
    }
  }

  const select = async (candidate: CommanderCandidate) => {
    const store = getArtStore()
    if (!store) {
      setState({ status: 'error', message: 'Questo browser non può salvare le illustrazioni.' })
      return
    }
    setState({ status: 'saving', candidate })
    try {
      onSelected(await fetchAndStoreArt(candidate, { store, download: (url) => downloadArt(url), analyze: analyzeArt }))
      setState({ status: 'idle' })
    } catch (error) {
      setState({ status: 'error', message: messageFor(error) })
    }
  }

  return { state, search, select, reset: () => setState({ status: 'idle' }) }
}
