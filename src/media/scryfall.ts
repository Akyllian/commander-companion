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

/** Scryfall asks for 50–100 ms between requests; the app keeps at least 125 ms (D-039). */
export const SCRYFALL_MIN_INTERVAL_MS = 125

type Limiter = <T>(task: () => Promise<T>) => Promise<T>

/** Runs tasks one at a time, each starting at least `minIntervalMs` after the previous one. */
export function createRateLimiter(
  minIntervalMs: number,
  now: () => number = () => performance.now(),
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Limiter {
  let queue: Promise<unknown> = Promise.resolve()
  let lastStart = Number.NEGATIVE_INFINITY
  return (task) => {
    const run = queue.then(async () => {
      const delay = lastStart + minIntervalMs - now()
      if (delay > 0) await wait(delay)
      lastStart = now()
      return task()
    })
    queue = run.catch(() => undefined)
    return run
  }
}

/** Shared by every request to the Scryfall API (search and random art). */
const scryfallLimiter = createRateLimiter(SCRYFALL_MIN_INTERVAL_MS)

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
    response = await scryfallLimiter(() =>
      fetchImpl(`${API}/cards/search?q=${encodeURIComponent(`is:commander ${q}`)}&order=name`, {
        headers: { Accept: 'application/json' },
      }),
    )
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

/** One random card with art, for a seat without a commander (R2 §4.2). */
export async function fetchRandomCandidate(fetchImpl: Fetch = fetch): Promise<CommanderCandidate> {
  let response: Response
  try {
    response = await scryfallLimiter(() =>
      fetchImpl(`${API}/cards/random?q=${encodeURIComponent('has:art -is:digital')}`, { headers: { Accept: 'application/json' } }),
    )
  } catch {
    throw new ScryfallError('network', 'Scryfall is unreachable')
  }
  if (!response.ok) throw new ScryfallError('response', `Scryfall answered ${response.status}`)
  const candidate = toCandidate(await response.json())
  if (!candidate) throw new ScryfallError('response', 'Random card without usable art')
  return candidate
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
