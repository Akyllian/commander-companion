import { gameReducer } from './game'
import type { CommanderIndex, CounterKey, GameAction, GameState, PlayerState } from './types'

export const HISTORY_LIMIT = 50
/** Consecutive same-direction taps on one value within this window form a single undo step. */
export const GROUP_WINDOW_MS = 700

export type GroupTarget =
  | { kind: 'life'; playerId: string }
  | { kind: 'counter'; playerId: string; counter: CounterKey }
  | { kind: 'commander'; playerId: string; sourcePlayerId: string; commander: CommanderIndex }
  | { kind: 'commander-tax'; playerId: string; commander: CommanderIndex }

export interface HistoryGroup {
  key: string
  target: GroupTarget
  /** Time of the latest tap in the group, in the caller's clock (ms). */
  at: number
}

export interface History {
  past: GameState[]
  present: GameState
  future: GameState[]
  /** The open tap group; its starting snapshot is always `past.at(-1)`. */
  group: HistoryGroup | null
}

export type HistoryAction =
  /** `at` is a monotonic timestamp in ms (e.g. `performance.now()`), passed in to keep the reducer pure. */
  | { type: 'apply'; action: GameAction; at: number }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Starts over from a new game: previous steps are no longer meaningful. */
  | { type: 'replace'; game: GameState }
  /** A game written by another tab; it becomes an undoable step here. */
  | { type: 'external'; game: GameState }

export const createHistory = (present: GameState): History => ({
  past: [],
  present,
  future: [],
  group: null,
})

const pushPast = (past: GameState[], present: GameState) => [...past, present].slice(-HISTORY_LIMIT)

const direction = (amount: number) => (amount > 0 ? '+' : '-')

function groupFor(action: GameAction): { key: string; target: GroupTarget } | null {
  switch (action.type) {
    case 'adjust-life':
      return { key: `life:${action.playerId}:${direction(action.amount)}`, target: { kind: 'life', playerId: action.playerId } }
    case 'adjust-counter':
      return {
        key: `counter:${action.playerId}:${action.counter}:${direction(action.amount)}`,
        target: { kind: 'counter', playerId: action.playerId, counter: action.counter },
      }
    case 'adjust-commander-damage':
      return {
        key: `commander:${action.playerId}:${action.sourcePlayerId}:${action.commander}:${direction(action.amount)}`,
        target: {
          kind: 'commander',
          playerId: action.playerId,
          sourcePlayerId: action.sourcePlayerId,
          commander: action.commander,
        },
      }
    case 'adjust-commander-tax':
      return {
        key: `commander-tax:${action.playerId}:${action.commander}:${direction(action.amount)}`,
        target: { kind: 'commander-tax', playerId: action.playerId, commander: action.commander },
      }
    default:
      return null
  }
}

function readTarget(game: GameState, target: GroupTarget): number {
  const player = game.players.find((candidate) => candidate.id === target.playerId) as PlayerState
  switch (target.kind) {
    case 'life':
      return player.life
    case 'counter':
      return player[target.counter]
    case 'commander':
      return player.commanderDamage[target.sourcePlayerId]?.[target.commander] ?? 0
    case 'commander-tax':
      return player.commanderTax[target.commander]
  }
}

/** Cumulative change of the open group, for the temporary "+7" indicator. */
export function getGroupDelta(history: History): { target: GroupTarget; delta: number; at: number } | null {
  const base = history.past.at(-1)
  if (!history.group || !base) return null
  const { target, at } = history.group
  return { target, at, delta: readTarget(history.present, target) - readTarget(base, target) }
}

/**
 * Bounded, in-memory undo/redo (D-003) with tap grouping (D-014). Pure, so React
 * StrictMode may call it twice safely. Returns the same reference when nothing changes.
 */
export function historyReducer(history: History, action: HistoryAction): History {
  switch (action.type) {
    case 'apply': {
      const next = gameReducer(history.present, action.action)
      if (next === history.present) return history

      const group = groupFor(action.action)
      const continues =
        group !== null &&
        history.group?.key === group.key &&
        action.at - history.group.at <= GROUP_WINDOW_MS &&
        history.past.length > 0

      return {
        past: continues ? history.past : pushPast(history.past, history.present),
        present: next,
        future: [],
        group: group && { ...group, at: action.at },
      }
    }

    case 'undo': {
      const previous = history.past.at(-1)
      if (!previous) return history
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
        group: null,
      }
    }

    case 'redo': {
      const [next, ...future] = history.future
      if (!next) return history
      return { past: pushPast(history.past, history.present), present: next, future, group: null }
    }

    case 'replace':
      return createHistory(action.game)

    case 'external':
      if (JSON.stringify(action.game) === JSON.stringify(history.present)) return history
      return { past: pushPast(history.past, history.present), present: action.game, future: [], group: null }
  }
}
