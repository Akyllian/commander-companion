import { isCommanderArt } from '../game/game'
import type { CommanderArt } from '../game/types'

/**
 * Presentation of the current match (D-039), kept apart from the game and its history:
 * which random illustration each seat shows when it has no commander. An assignment is
 * identified by (matchId, playerId); matchId changes only on a confirmed new game, so a
 * reload, going offline or pruning the cache never swaps a seat's art mid-match.
 */

export const MATCH_KEY = 'commander-companion.match'
/** Arts of earlier matches still cached: the fallback when the network fails (D-039). */
export const MAX_SPARE_ART = 4
const MATCH_ID_MAX_LENGTH = 64

/** A random Wizards illustration: never presented as the player's commander (spec §14). */
export type RandomArt = CommanderArt

export interface MatchPresentation {
  version: 1
  matchId: string
  /** Keyed by player id: ids `player-1..4` are the seats and are never reused. */
  randomArtBySeat: Record<string, RandomArt>
  spareArt: RandomArt[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function createMatch(newId: () => string): MatchPresentation {
  return { version: 1, matchId: newId(), randomArtBySeat: {}, spareArt: [] }
}

/** A new match: fresh id and empty seats; the arts in use become spares, newest first. */
export function startNewMatch(previous: MatchPresentation, newId: () => string): MatchPresentation {
  const spares = new Map<string, RandomArt>()
  for (const art of [...Object.values(previous.randomArtBySeat), ...previous.spareArt]) {
    if (!spares.has(art.cardId)) spares.set(art.cardId, art)
  }
  return { ...createMatch(newId), spareArt: [...spares.values()].slice(0, MAX_SPARE_ART) }
}

export function assignArt(match: MatchPresentation, playerId: string, art: RandomArt): MatchPresentation {
  if (match.randomArtBySeat[playerId]?.cardId === art.cardId) return match
  return { ...match, randomArtBySeat: { ...match.randomArtBySeat, [playerId]: art } }
}

/** Art ids the cache must keep for this match. */
export function artKeepSet(match: MatchPresentation): Set<string> {
  return new Set([...Object.values(match.randomArtBySeat), ...match.spareArt].map((art) => art.cardId))
}

export function parseMatch(value: unknown): MatchPresentation | null {
  if (!isRecord(value) || value.version !== 1) return null
  const { matchId, randomArtBySeat, spareArt } = value
  if (typeof matchId !== 'string' || matchId.length === 0 || matchId.length > MATCH_ID_MAX_LENGTH) return null
  if (!isRecord(randomArtBySeat) || !Object.values(randomArtBySeat).every(isCommanderArt)) return null
  if (!Array.isArray(spareArt) || spareArt.length > MAX_SPARE_ART || !spareArt.every(isCommanderArt)) return null
  return { version: 1, matchId, randomArtBySeat: randomArtBySeat as Record<string, RandomArt>, spareArt }
}

export function loadMatch(newId: () => string): MatchPresentation {
  try {
    return parseMatch(JSON.parse(localStorage.getItem(MATCH_KEY) ?? 'null')) ?? createMatch(newId)
  } catch {
    return createMatch(newId)
  }
}

export function saveMatch(match: MatchPresentation): boolean {
  try {
    localStorage.setItem(MATCH_KEY, JSON.stringify(match))
    return true
  } catch {
    return false
  }
}

/** Notifies when another tab stores a valid match, e.g. after starting a new game there. */
export function subscribeToMatchChanges(onChange: (match: MatchPresentation) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== MATCH_KEY || event.newValue === null) return
    try {
      const parsed = parseMatch(JSON.parse(event.newValue))
      if (parsed) onChange(parsed)
    } catch {
      // Ignore unreadable writes; this tab keeps its own valid match.
    }
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}
