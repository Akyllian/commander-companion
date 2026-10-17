import { createGame } from './game'
import type { GameState, PlayerState } from './types'
import { PLAYER_ACCENTS } from './types'

export const STORAGE_KEY = 'commander-companion.game.v1'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSafeScore = (value: unknown, allowNegative = false): value is number =>
  Number.isSafeInteger(value) && (allowNegative || (value as number) >= 0)

function hasValidPlayerShape(value: unknown): value is PlayerState {
  if (!isRecord(value) || !isRecord(value.commanderDamage)) return false

  return (
    typeof value.id === 'string' && value.id.trim().length > 0 &&
    typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 28 &&
    isSafeScore(value.life, true) &&
    isSafeScore(value.poison) &&
    isSafeScore(value.energy) &&
    isSafeScore(value.experience) &&
    PLAYER_ACCENTS.includes(value.accent as PlayerState['accent']) &&
    Object.values(value.commanderDamage).every((damage) => isSafeScore(damage))
  )
}

function isValidGame(value: unknown): value is GameState {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.players) ||
    value.players.length < 2 ||
    value.players.length > 4 ||
    !value.players.every(hasValidPlayerShape)
  ) {
    return false
  }

  const ids = value.players.map((player) => player.id)
  if (new Set(ids).size !== ids.length) return false

  const knownIds = new Set(ids)
  return value.players.every((player) =>
    Object.keys(player.commanderDamage).every(
      (sourceId) => sourceId !== player.id && knownIds.has(sourceId),
    ),
  )
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createGame()

    const parsed: unknown = JSON.parse(raw)
    if (isValidGame(parsed)) return parsed
  } catch {
    // A private browsing policy or malformed payload should not block a game.
  }

  return createGame()
}

export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Persistence is a convenience; scoring must remain usable without it.
  }
}
