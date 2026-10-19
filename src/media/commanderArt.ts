import type { CommanderArt } from '../game/types'
import { SAFE_BOOST } from './artAnalysis'
import type { VeilBoost } from './artAnalysis'
import type { ArtStore } from './artStore'
import type { CommanderCandidate } from './scryfall'

interface Dependencies {
  store: ArtStore
  download: (url: string) => Promise<Blob>
  analyze: (blob: Blob) => Promise<VeilBoost>
}

/**
 * Downloads a candidate's art crop once, measures its contrast and caches both offline.
 * Returns the commander to record in the game; throws if the art could not be stored,
 * so the game never points to art that is missing.
 */
export async function fetchAndStoreArt(candidate: CommanderCandidate, deps: Dependencies): Promise<CommanderArt> {
  const blob = await deps.download(candidate.artUrl)
  const veil = await deps.analyze(blob).catch(() => SAFE_BOOST)
  await deps.store.put(candidate.cardId, { bytes: await blob.arrayBuffer(), type: blob.type, veil })
  return { cardId: candidate.cardId, name: candidate.name, artist: candidate.artist }
}
