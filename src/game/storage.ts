import {
  COUNTER_MAX,
  createGame,
  isCommanderArt,
  LIFE_MAX,
  LIFE_MIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX_LENGTH,
  normalizePlayerName,
} from './game'
import { GAME_SCHEMA_VERSION, PLAYER_ACCENTS } from './types'
import type { CommanderDamageBySource, GameState, PlayerState } from './types'

/** The key name predates schema v2; the payload's own `version` field drives migrations. */
export const STORAGE_KEY = 'commander-companion.game.v1'
/** Holds the last payload that could not be read, so a bad load never destroys data. */
export const BACKUP_KEY = 'commander-companion.game.backup'

export type LoadStatus = 'new' | 'restored' | 'migrated' | 'recovered' | 'unavailable'

export interface LoadResult {
  game: GameState
  status: LoadStatus
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isIntegerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max

const isCount = (value: unknown): value is number => isIntegerIn(value, 0, COUNTER_MAX)

const isValidName = (value: unknown): value is string =>
  typeof value === 'string' &&
  normalizePlayerName(value).length > 0 &&
  Array.from(value).length <= NAME_MAX_LENGTH

const isAccent = (value: unknown): value is PlayerState['accent'] =>
  PLAYER_ACCENTS.includes(value as PlayerState['accent'])

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function hasValidPlayerIds(players: Array<{ id: string }>): boolean {
  const ids = players.map((player) => player.id)
  return new Set(ids).size === ids.length
}

function isPlayerList(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length >= MIN_PLAYERS && value.length <= MAX_PLAYERS
}

const isCommanderSlot = (value: unknown) => value === null || isCommanderArt(value)

function isPlayerV4(value: unknown): value is PlayerState {
  if (!isPlayerV2(value)) return false
  const { commanders } = value as unknown as Record<string, unknown>
  return (
    Array.isArray(commanders) &&
    commanders.length === 2 &&
    commanders.every(isCommanderSlot) &&
    (value.hasPartner || commanders[1] === null)
  )
}

function isPlayerV3(value: unknown): boolean {
  if (!isPlayerV2(value)) return false
  return isCommanderSlot((value as unknown as Record<string, unknown>).commander)
}

function isPlayerV2(value: unknown): value is Omit<PlayerState, 'commanders'> {
  if (!isRecord(value) || !isRecord(value.commanderDamage)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    isValidName(value.name) &&
    isIntegerIn(value.life, LIFE_MIN, LIFE_MAX) &&
    isCount(value.poison) &&
    isCount(value.energy) &&
    isCount(value.experience) &&
    isAccent(value.accent) &&
    typeof value.hasPartner === 'boolean' &&
    Object.values(value.commanderDamage).every(
      (damage) => Array.isArray(damage) && damage.length === 2 && damage.every(isCount),
    )
  )
}

type PlayerV4 = Omit<PlayerState, 'rad' | 'commanderTax' | 'deck'>

/** Validated v4 players (unique ids, known damage sources), or null. */
function parseV4Players(value: Record<string, unknown>): PlayerV4[] | null {
  if (!isPlayerList(value.players) || !value.players.every(isPlayerV4)) return null

  const players = value.players
  if (!hasValidPlayerIds(players)) return null

  const byId = new Map(players.map((player) => [player.id, player]))
  const referencesAreValid = players.every((player) =>
    Object.entries(player.commanderDamage).every(([sourceId, damage]) => {
      const source = byId.get(sourceId)
      return source !== undefined && sourceId !== player.id && (source.hasPartner || damage[1] === 0)
    }),
  )

  return referencesAreValid ? players : null
}

const isTax = (value: unknown) => isCount(value) && (value as number) % 2 === 0

function isPlayerV5(value: PlayerV4): value is PlayerState {
  const { rad, commanderTax } = value as unknown as Record<string, unknown>
  return (
    isCount(rad) &&
    Array.isArray(commanderTax) &&
    commanderTax.length === 2 &&
    commanderTax.every(isTax) &&
    (value.hasPartner || commanderTax[1] === 0)
  )
}

const isDeckLink = (value: unknown) =>
  value === null ||
  (isRecord(value) &&
    typeof value.deckId === 'string' &&
    value.deckId.length > 0 &&
    value.deckId.length <= 64 &&
    typeof value.overridden === 'boolean')

function parseV6(value: Record<string, unknown>): GameState | null {
  const players = parseV4Players(value)
  if (!players || !players.every(isPlayerV5)) return null
  if (!players.every((player) => isDeckLink((player as unknown as Record<string, unknown>).deck))) return null
  const isOwner = (owner: unknown): owner is string | null =>
    owner === null || (typeof owner === 'string' && players.some((player) => player.id === owner))
  const { monarchPlayerId, initiativePlayerId } = value
  if (!isOwner(monarchPlayerId) || !isOwner(initiativePlayerId)) return null
  return { version: GAME_SCHEMA_VERSION, players: players as PlayerState[], monarchPlayerId, initiativePlayerId }
}

/** Schema v5 → v6: nobody has a linked deck yet (R3). */
function migrateV5(value: Record<string, unknown>): GameState | null {
  if (!isPlayerList(value.players)) return null
  return parseV6({ ...value, players: value.players.map((player) => (isRecord(player) ? { ...player, deck: null } : player)) })
}

interface PlayerV1 {
  id: string
  name: string
  life: number
  poison: number
  energy: number
  experience: number
  accent: PlayerState['accent']
  commanderDamage: Record<string, number>
}

const isNonNegative = (score: unknown) => Number.isSafeInteger(score) && (score as number) >= 0

function isPlayerV1(value: unknown): value is PlayerV1 {
  if (!isRecord(value) || !isRecord(value.commanderDamage)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    Number.isSafeInteger(value.life) &&
    isNonNegative(value.poison) &&
    isNonNegative(value.energy) &&
    isNonNegative(value.experience) &&
    isAccent(value.accent) &&
    Object.values(value.commanderDamage).every(isNonNegative)
  )
}

/** Schema v1 → v2: damage becomes a per-commander tuple, values are clamped, names normalized. */
function migrateV1(value: Record<string, unknown>): GameState | null {
  if (!isPlayerList(value.players) || !value.players.every(isPlayerV1)) return null

  const migrated = {
    version: 4,
    players: value.players.map(
      (player): PlayerV4 => ({
        id: player.id,
        name: normalizePlayerName(player.name),
        life: clampInt(player.life, LIFE_MIN, LIFE_MAX),
        poison: clampInt(player.poison, 0, COUNTER_MAX),
        energy: clampInt(player.energy, 0, COUNTER_MAX),
        experience: clampInt(player.experience, 0, COUNTER_MAX),
        accent: player.accent,
        hasPartner: false,
        commanders: [null, null],
        commanderDamage: Object.fromEntries(
          Object.entries(player.commanderDamage).map(([sourceId, damage]) => [
            sourceId,
            [clampInt(damage, 0, COUNTER_MAX), 0] satisfies CommanderDamageBySource,
          ]),
        ),
      }),
    ),
  }

  // Re-validate the result with the v4 rules (unique ids, known sources, no self damage).
  return migrateV4(migrated)
}

/** Schema v2 → v4: players gain two empty commander slots. */
function migrateV2(value: Record<string, unknown>): GameState | null {
  if (!isPlayerList(value.players) || !value.players.every(isPlayerV2)) return null
  return migrateV4({
    ...value,
    version: 4,
    players: value.players.map((player) => ({ ...player, commanders: [null, null] })),
  })
}

/** Schema v3 → v4: the single `commander` becomes slot 1 of `commanders` (D-027). */
function migrateV3(value: Record<string, unknown>): GameState | null {
  if (!isPlayerList(value.players) || !value.players.every(isPlayerV3)) return null
  return migrateV4({
    ...value,
    version: 4,
    players: value.players.map((player) => {
      const { commander, ...rest } = player as Record<string, unknown>
      return { ...rest, commanders: [commander, null] }
    }),
  })
}

/** Schema v4 → v5: zero rad and Commander tax, nobody holds Monarch or Initiative (D-033); then v6. */
function migrateV4(value: Record<string, unknown>): GameState | null {
  const players = parseV4Players(value)
  if (!players) return null
  return migrateV5({
    players: players.map((player) => ({ ...player, rad: 0, commanderTax: [0, 0] })),
    monarchPlayerId: null,
    initiativePlayerId: null,
  })
}

/** Validates unknown stored data and migrates older schemas to the current one. */
export function parseStoredGame(value: unknown): { game: GameState; migrated: boolean } | null {
  if (!isRecord(value)) return null

  if (value.version === GAME_SCHEMA_VERSION) {
    const game = parseV6(value)
    return game && { game, migrated: false }
  }

  if (value.version === 5) {
    const game = migrateV5(value)
    return game && { game, migrated: true }
  }

  if (value.version === 4) {
    const game = migrateV4(value)
    return game && { game, migrated: true }
  }

  if (value.version === 3) {
    const game = migrateV3(value)
    return game && { game, migrated: true }
  }

  if (value.version === 2) {
    const game = migrateV2(value)
    return game && { game, migrated: true }
  }

  if (value.version === 1) {
    const game = migrateV1(value)
    return game && { game, migrated: true }
  }

  return null
}

function backup(raw: string) {
  try {
    localStorage.setItem(BACKUP_KEY, raw)
  } catch {
    // Nothing more can be done; the new game must still start.
  }
}

export function loadGame(): LoadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable', game: createGame() }
  }

  if (raw === null) return { status: 'new', game: createGame() }

  let parsed: ReturnType<typeof parseStoredGame> = null
  try {
    parsed = parseStoredGame(JSON.parse(raw))
  } catch {
    // Malformed JSON is handled like any other unreadable payload below.
  }

  if (parsed) return { status: parsed.migrated ? 'migrated' : 'restored', game: parsed.game }

  backup(raw)
  return { status: 'recovered', game: createGame() }
}

/** Returns false when the browser refused the write (private mode, quota, policy). */
export function saveGame(game: GameState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
    return true
  } catch {
    return false
  }
}

/** Notifies when another tab of this app stores a valid game. */
export function subscribeToExternalChanges(onChange: (game: GameState) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || event.newValue === null) return
    try {
      const parsed = parseStoredGame(JSON.parse(event.newValue))
      if (parsed) onChange(parsed.game)
    } catch {
      // Ignore unreadable writes; this tab keeps its own valid state.
    }
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

/** Asks the browser not to evict our data under storage pressure (D-002). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = navigator.storage
    if (!storage?.persisted || !storage.persist) return false
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
