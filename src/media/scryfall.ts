/**
 * Scryfall adapter (Phase 2c, D-026). The only module that talks to the network for
 * commander art; the reducer and UI components never call fetch directly.
 * Usage follows Scryfall's API guidelines: one request per user search (never per
 * keystroke), Accept header, art crops only (never full card images), artist credited.
 */

const API = 'https://api.scryfall.com'
const ART_HOST = 'https://cards.scryfall.io/'
/** D-027: at most five results, no inner scrolling. */
export const MAX_RESULTS = 5
/** Art crops are ~60 KB; anything far larger is not what we asked for. */
export const MAX_ART_BYTES = 2 * 1024 * 1024

export interface CommanderCandidate {
  cardId: string
  name: string
  artist: string
  artUrl: string
}

export class ScryfallError extends Error {
  constructor(
    readonly kind: 'network' | 'response' | 'image',
    message: string,
  ) {
    super(message)
    this.name = 'ScryfallError'
  }
}

type Fetch = typeof fetch

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

/** Maps one Scryfall card to a candidate; double-faced cards use their front face. */
export function toCandidate(card: unknown): CommanderCandidate | null {
  if (!isRecord(card)) return null
  const front = Array.isArray(card.card_faces) && isRecord(card.card_faces[0]) ? card.card_faces[0] : null
  const images = isRecord(card.image_uris) ? card.image_uris : front && isRecord(front.image_uris) ? front.image_uris : null
  const artUrl = images ? text(images.art_crop) : null
  const cardId = text(card.id)
  const name = text(card.name)
  const artist = text(card.artist) ?? (front ? text(front.artist) : null)
  if (!artUrl || !artUrl.startsWith(ART_HOST) || !cardId || !name || !artist) return null
  return { cardId, name, artist, artUrl }
}

export async function searchCommanders(query: string, fetchImpl: Fetch = fetch): Promise<CommanderCandidate[]> {
  const q = query.trim()
  if (q.length < 2) return []

  let response: Response
  try {
    response = await fetchImpl(`${API}/cards/search?q=${encodeURIComponent(`is:commander ${q}`)}&order=name`, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new ScryfallError('network', 'Scryfall is unreachable')
  }
  if (response.status === 404) return []
  if (!response.ok) throw new ScryfallError('response', `Scryfall answered ${response.status}`)

  const body: unknown = await response.json()
  const cards = isRecord(body) && Array.isArray(body.data) ? body.data : []
  return cards
    .map(toCandidate)
    .filter((candidate): candidate is CommanderCandidate => candidate !== null)
    .slice(0, MAX_RESULTS)
}

export async function downloadArt(url: string, fetchImpl: Fetch = fetch): Promise<Blob> {
  if (!url.startsWith(ART_HOST)) throw new ScryfallError('image', 'Unexpected image host')
  let response: Response
  try {
    response = await fetchImpl(url)
  } catch {
    throw new ScryfallError('network', 'Image is unreachable')
  }
  if (!response.ok) throw new ScryfallError('image', `Image answered ${response.status}`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > MAX_ART_BYTES) {
    throw new ScryfallError('image', 'Unexpected image payload')
  }
  return blob
}
