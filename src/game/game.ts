import { PLAYER_ACCENTS } from './types'
import type { GameAction, GameState, PlayerState } from './types'

const STARTING_LIFE = 40

const clampPlayerCount = (count: number) => Math.min(4, Math.max(2, Math.round(count)))
const clampCounter = (value: number) => Math.max(0, value)

export function createGame(playerCount = 4): GameState {
  const count = clampPlayerCount(playerCount)

  return {
    version: 1,
    players: Array.from({ length: count }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Giocatore ${index + 1}`,
      life: STARTING_LIFE,
      poison: 0,
      energy: 0,
      experience: 0,
      accent: PLAYER_ACCENTS[index],
      commanderDamage: {},
    })),
  }
}

export function isPlayerDefeated(player: PlayerState): boolean {
  return (
    player.life <= 0 ||
    player.poison >= 10 ||
    Object.values(player.commanderDamage).some((damage) => damage >= 21)
  )
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'reset-game') {
    return {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        life: STARTING_LIFE,
        poison: 0,
        energy: 0,
        experience: 0,
        commanderDamage: {},
      })),
    }
  }

  if (action.type === 'remove-player') {
    if (state.players.length <= 2 || !state.players.some((player) => player.id === action.playerId)) {
      return state
    }

    return {
      ...state,
      players: state.players
        .filter((player) => player.id !== action.playerId)
        .map((player) => {
          const { [action.playerId]: _removed, ...commanderDamage } = player.commanderDamage
          return { ...player, commanderDamage }
        }),
    }
  }

  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== action.playerId) return player

      switch (action.type) {
        case 'adjust-life':
          return { ...player, life: player.life + action.amount }
        case 'adjust-counter':
          return {
            ...player,
            [action.counter]: clampCounter(player[action.counter] + action.amount),
          }
        case 'adjust-commander-damage':
          return {
            ...player,
            commanderDamage: {
              ...player.commanderDamage,
              [action.sourcePlayerId]: clampCounter(
                (player.commanderDamage[action.sourcePlayerId] ?? 0) + action.amount,
              ),
            },
          }
        case 'rename-player': {
          const name = action.name.trim().slice(0, 28)
          return name ? { ...player, name } : player
        }
      }
    }),
  }
}

export type { GameAction, GameState, PlayerState } from './types'
