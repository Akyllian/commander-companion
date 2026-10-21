import { assignArt } from '../match/presentation'
import type { MatchPresentation, RandomArt } from '../match/presentation'
import type { ArtStore } from './artStore'
import { ScryfallError } from './scryfall'
import type { CommanderCandidate } from './scryfall'

/** Fresh cards asked for one seat before the network counts as unavailable. */
export const RANDOM_ART_TRIES = 3

interface Dependencies {
  store: ArtStore
  /** Rate-limited by the Scryfall adapter (D-039). */
  fetchCandidate: () => Promise<CommanderCandidate>
  /** Downloads and caches the art crop, returning what the seat records. */
  storeArt: (candidate: CommanderCandidate) => Promise<RandomArt>
}

const isNetworkError = (error: unknown) => error instanceof ScryfallError && error.kind === 'network'

/**
 * Gives every listed seat a cached illustration (R2 §4.2, D-039), in this order: the seat's own
 * art for this match; a fresh random card; only once the network failed, an unused cached spare;
 * otherwise nothing, and the card shows the neutral texture. The first network error stops all
 * requests, so going offline costs a single failed request.
 */
export async function fillRandomArt(match: MatchPresentation, seatIds: string[], deps: Dependencies): Promise<MatchPresentation> {
  const cached = async (art: RandomArt) => (await deps.store.get(art.cardId)) !== undefined
  let current = match
  let networkUsable = true
  const used = new Set(Object.values(match.randomArtBySeat).map((art) => art.cardId))

  const fetchFresh = async (): Promise<RandomArt | null> => {
    for (let attempt = 0; attempt < RANDOM_ART_TRIES; attempt += 1) {
      try {
        const candidate = await deps.fetchCandidate()
        if (used.has(candidate.cardId)) continue
        return await deps.storeArt(candidate)
      } catch (error) {
        if (isNetworkError(error)) break
      }
    }
    networkUsable = false
    return null
  }

  const takeSpare = async (): Promise<RandomArt | null> => {
    for (const spare of current.spareArt) {
      if (!used.has(spare.cardId) && (await cached(spare))) return spare
    }
    return null
  }

  for (const seatId of seatIds) {
    const own = current.randomArtBySeat[seatId]
    if (own && (await cached(own))) continue
    const art = (networkUsable ? await fetchFresh() : null) ?? (await takeSpare())
    if (!art) continue
    used.add(art.cardId)
    current = assignArt(current, seatId, art)
  }
  return current
}
