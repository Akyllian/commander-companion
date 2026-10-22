import type { ArtStore } from '../media/artStore'
import type { VeilBoost } from '../media/artAnalysis'
import { fetchAndStoreArt } from '../media/commanderArt'
import { ScryfallError } from '../media/scryfall'
import type { CardData } from '../media/scryfall'
import type { DeckRecord, OfflineState } from './model'

interface Dependencies {
  art: ArtStore
  download: (url: string) => Promise<Blob>
  analyze: (blob: Blob) => Promise<VeilBoost>
  onProgress: (done: number, total: number) => void
}

const isQuota = (error: unknown) => error instanceof DOMException && error.name === 'QuotaExceededError'

/**
 * Caches every crop a deck needs (R3 §5.5, §12.1), commanders first, one at a time. Crops already
 * cached are skipped, so a rerun resumes where it stopped. The first network error stops the run
 * (incomplete); a full device stops it too (partial, reason quota); one broken image is left out
 * (partial). A card Scryfall gives no crop counts as done: the neutral texture is final for it.
 */
export async function prepareOffline(
  deck: DeckRecord,
  cards: CardData[],
  deps: Dependencies,
): Promise<{ offline: OfflineState; missing: string[]; reason: 'network' | 'quota' | null }> {
  const commanders = new Set(deck.commanders)
  const ordered = [...cards.filter((card) => commanders.has(card.cardId)), ...cards.filter((card) => !commanders.has(card.cardId))]
  const missing: string[] = []
  let done = 0
  for (const [index, card] of ordered.entries()) {
    if (card.artUrl && !(await deps.art.get(card.cardId))) {
      try {
        await fetchAndStoreArt({ cardId: card.cardId, name: card.name, artist: card.artist, artUrl: card.artUrl }, { store: deps.art, download: deps.download, analyze: deps.analyze })
      } catch (error) {
        const rest = ordered.slice(index).map((entry) => entry.cardId)
        if (error instanceof ScryfallError && error.kind === 'network') return { offline: 'incomplete', missing: [...missing, ...rest], reason: 'network' }
        if (isQuota(error)) return { offline: 'partial', missing: [...missing, ...rest], reason: 'quota' }
        if (!(error instanceof ScryfallError)) throw error
        missing.push(card.cardId)
      }
    }
    done += 1
    deps.onProgress(done, ordered.length)
  }
  return { offline: missing.length > 0 ? 'partial' : 'complete', missing, reason: null }
}
