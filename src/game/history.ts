import { gameReducer } from './game'
import type { GameAction, GameState } from './types'

export const HISTORY_LIMIT = 50

export interface History {
  past: GameState[]
  present: GameState
  future: GameState[]
}

export type HistoryAction =
  | { type: 'apply'; action: GameAction }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Starts over from a new game: previous steps are no longer meaningful. */
  | { type: 'replace'; game: GameState }
  /** A game written by another tab; it becomes an undoable step here. */
  | { type: 'external'; game: GameState }

export const createHistory = (present: GameState): History => ({ past: [], present, future: [] })

const pushPast = (past: GameState[], present: GameState) => [...past, present].slice(-HISTORY_LIMIT)

/**
 * Bounded, in-memory undo/redo (D-003). Pure, so React StrictMode may call it twice safely.
 * Returns the same reference when nothing changes.
 */
export function historyReducer(history: History, action: HistoryAction): History {
  switch (action.type) {
    case 'apply': {
      const next = gameReducer(history.present, action.action)
      if (next === history.present) return history
      return { past: pushPast(history.past, history.present), present: next, future: [] }
    }

    case 'undo': {
      const previous = history.past.at(-1)
      if (!previous) return history
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      }
    }

    case 'redo': {
      const [next, ...future] = history.future
      if (!next) return history
      return { past: pushPast(history.past, history.present), present: next, future }
    }

    case 'replace':
      return createHistory(action.game)

    case 'external':
      if (JSON.stringify(action.game) === JSON.stringify(history.present)) return history
      return { past: pushPast(history.past, history.present), present: action.game, future: [] }
  }
}
