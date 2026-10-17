export const PLAYER_ACCENTS = ['verdigris', 'gold', 'violet', 'ember'] as const

export type PlayerAccent = (typeof PLAYER_ACCENTS)[number]
export type CounterKey = 'poison' | 'energy' | 'experience'

/** 0 = main commander, 1 = partner commander (only meaningful when the source has a partner). */
export type CommanderIndex = 0 | 1

/** Damage received from each of a source player's commanders, indexed by `CommanderIndex`. */
export type CommanderDamageBySource = [number, number]

export interface PlayerState {
  id: string
  name: string
  life: number
  poison: number
  energy: number
  experience: number
  accent: PlayerAccent
  /** True when this player's deck has two commanders (partner). */
  hasPartner: boolean
  /** Commander damage received, keyed by the source player id. */
  commanderDamage: Record<string, CommanderDamageBySource>
}

export const GAME_SCHEMA_VERSION = 2

export interface GameState {
  version: typeof GAME_SCHEMA_VERSION
  players: PlayerState[]
}

export type GameAction =
  | { type: 'adjust-life'; playerId: string; amount: number }
  | { type: 'adjust-counter'; playerId: string; counter: CounterKey; amount: number }
  | {
      /** Commander damage is combat damage: it also changes life by the same applied amount (D-006). */
      type: 'adjust-commander-damage'
      playerId: string
      sourcePlayerId: string
      commander: CommanderIndex
      amount: number
    }
  | { type: 'set-partner'; playerId: string; hasPartner: boolean }
  | { type: 'rename-player'; playerId: string; name: string }
  | { type: 'remove-player'; playerId: string }
  | { type: 'reset-game' }
