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

/** One printing as the deck features need it (R3): every face's text, the front face's art. */
export interface CardData {
  cardId: string
  /** Faces joined with ' // '. */
  name: string
  /** The name printed on a non-English card, when Scryfall gives one. */
  printedName: string | null
  typeLine: string
  /** Every face, one per line. */
  oracleText: string
  /** Front face, or '' for cards without a cost. */
  manaCost: string
  artist: string
  /** Front face `art_crop` on cards.scryfall.io, or null when there is none. */
  artUrl: string | null
  set: string
  number: string
}

const CARD_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const artCrop = (value: unknown) => (isRecord(value) && typeof value.art_crop === 'string' && value.art_crop.startsWith(ART_HOST) ? value.art_crop : null)
const plain = (value: unknown) => (typeof value === 'string' ? value : '')

/** Maps a raw Scryfall card object. Never used on data the app already stored. */
export function toCardData(card: unknown): CardData | null {
  if (!isRecord(card)) return null
  const faces = Array.isArray(card.card_faces) ? card.card_faces.filter(isRecord) : []
  const front = faces[0] ?? null
  const cardId = text(card.id)
  const name = text(card.name)
  const typeLine = text(card.type_line)
  const artist = text(card.artist) ?? (front ? text(front.artist) : null)
  const set = text(card.set)
  const number = text(card.collector_number)
  if (!cardId || !name || !typeLine || !artist || !set || !number) return null
  return {
    cardId,
    name,
    printedName: text(card.printed_name),
    typeLine,
    oracleText: typeof card.oracle_text === 'string' ? card.oracle_text : faces.map((face) => plain(face.oracle_text)).join('\n'),
    manaCost: typeof card.mana_cost === 'string' ? card.mana_cost : plain(front?.mana_cost),
    artist,
    artUrl: artCrop(card.image_uris) ?? artCrop(front?.image_uris),
    set,
    number,
  }
}

const bounded = (value: unknown, max: number) => typeof value === 'string' && value.length <= max

/** Validates the app's own `CardData` as read back from IndexedDB (stored data is unknown input). */
export function parseCardData(value: unknown): CardData | null {
  if (!isRecord(value)) return null
  const { cardId, name, printedName, typeLine, oracleText, manaCost, artist, artUrl, set, number } = value
  const valid =
    typeof cardId === 'string' &&
    CARD_UUID.test(cardId) &&
    typeof name === 'string' &&
    name.length > 0 &&
    bounded(name, 200) &&
    (printedName === null || bounded(printedName, 200)) &&
    bounded(typeLine, 200) &&
    bounded(oracleText, 4000) &&
    bounded(manaCost, 100) &&
    bounded(artist, 200) &&
    (artUrl === null || (typeof artUrl === 'string' && artUrl.startsWith(ART_HOST))) &&
    bounded(set, 20) &&
    bounded(number, 20)
  return valid ? (value as unknown as CardData) : null
}

/** Scryfall's limit for one `/cards/collection` request. */
export const COLLECTION_CHUNK = 75

export type CollectionIdentifier = { name: string } | { set: string; collector_number: string }

/** Identifies many cards at once (R3 §5.2): two requests for a 100-card list. */
export async function fetchCollection(
  identifiers: CollectionIdentifier[],
  fetchImpl: Fetch = fetch,
): Promise<{ found: CardData[]; notFound: unknown[] }> {
  const found: CardData[] = []
  const notFound: unknown[] = []
  for (let start = 0; start < identifiers.length; start += COLLECTION_CHUNK) {
    const chunk = identifiers.slice(start, start + COLLECTION_CHUNK)
    let response: Response
    try {
      response = await scryfallLimiter(() =>
        fetchImpl(`${API}/cards/collection`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers: chunk }),
        }),
      )
    } catch {
      throw new ScryfallError('network', 'Scryfall is unreachable')
    }
    if (!response.ok) throw new ScryfallError('response', `Scryfall answered ${response.status}`)
    const body: unknown = await response.json()
    if (!isRecord(body)) continue
    if (Array.isArray(body.data)) found.push(...body.data.map(toCardData).filter((card): card is CardData => card !== null))
    if (Array.isArray(body.not_found)) notFound.push(...body.not_found)
  }
  return { found, notFound }
}

/** Case- and accent-insensitive form of a name. */
export const foldName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** At most five options, like the commander results (D-027). */
export const MAX_LOCALIZED = 5

const byPrinting = (left: CardData, right: CardData) =>
  left.name.localeCompare(right.name) || left.set.localeCompare(right.set) || left.number.localeCompare(right.number, undefined, { numeric: true })

/** A non-English name (R3 §5.4): exact matches only, deduplicated, stably ordered, at most five. */
export async function searchLocalized(name: string, fetchImpl: Fetch = fetch): Promise<CardData[]> {
  let response: Response
  try {
    response = await scryfallLimiter(() =>
      fetchImpl(`${API}/cards/search?include_multilingual=true&q=${encodeURIComponent(`!"${name}"`)}`, {
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
  const wanted = foldName(name)
  const unique = new Map<string, CardData>()
  for (const card of cards.map(toCardData)) {
    if (!card || unique.has(card.cardId)) continue
    if (foldName(card.name) === wanted || (card.printedName && foldName(card.printedName) === wanted)) unique.set(card.cardId, card)
  }
  return [...unique.values()].toSorted(byPrinting).slice(0, MAX_LOCALIZED)
}
