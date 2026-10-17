export const PLAYER_ACCENTS = ['verdigris', 'gold', 'violet', 'ember'] as const

export type PlayerAccent = (typeof PLAYER_ACCENTS)[number]
export type CounterKey = 'poison' | 'energy' | 'experience'

export interface PlayerState {
  id: string
  name: string
  life: number
  poison: number
  energy: number
  experience: number
  accent: PlayerAccent
  commanderDamage: Record<string, number>
}

export interface GameState {
  version: 1
  players: PlayerState[]
}

export type GameAction =
  | { type: 'adjust-life'; playerId: string; amount: number }
  | { type: 'adjust-counter'; playerId: string; counter: CounterKey; amount: number }
  | {
      type: 'adjust-commander-damage'
      playerId: string
      sourcePlayerId: string
      amount: number
    }
  | { type: 'rename-player'; playerId: string; name: string }
  | { type: 'remove-player'; playerId: string }
  | { type: 'reset-game' }

