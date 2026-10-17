import { useEffect, useState } from 'react'
import { PlayerPanel } from './components/PlayerPanel'
import { TableControls } from './components/TableControls'
import { createGame, gameReducer } from './game/game'
import { loadGame, saveGame } from './game/storage'
import type { GameAction, GameState } from './game/types'

interface HistoryState {
  past: GameState[]
  present: GameState
  future: GameState[]
}

const HISTORY_LIMIT = 50

export default function App() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: loadGame(),
    future: [],
  }))

  useEffect(() => saveGame(history.present), [history.present])

  const dispatch = (action: GameAction) => {
    setHistory((current) => {
      const next = gameReducer(current.present, action)
      if (next === current.present) return current
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      }
    })
  }

  const undo = () => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) return current
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }

  const redo = () => {
    setHistory((current) => {
      const next = current.future[0]
      if (!next) return current
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
      }
    })
  }

  const replaceGame = (game: GameState) => setHistory({ past: [], present: game, future: [] })

  const confirmNewGame = (playerCount: number) => {
    if (window.confirm('Iniziare una nuova partita? I punteggi attuali verranno sostituiti.')) {
      replaceGame(createGame(playerCount))
    }
  }

  const confirmReset = () => {
    if (window.confirm('Azzerare vita, segnalini e danni mantenendo i nomi?')) {
      dispatch({ type: 'reset-game' })
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main" aria-label="Commander Companion, vai ai punteggi">
          <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="19" />
            <path d="M24 8v32M8 24h32M13 13l22 22M35 13 13 35" />
            <circle cx="24" cy="24" r="5" />
          </svg>
          <span>
            <strong>Commander Companion</strong>
            <small>Il grimorio del tavolo</small>
          </span>
        </a>

        <TableControls
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          onReset={confirmReset}
          onNewGame={confirmNewGame}
        />
      </header>

      <main id="main" className="player-grid" data-player-count={history.present.players.length}>
        {history.present.players.map((player) => (
          <PlayerPanel
            key={player.id}
            player={player}
            opponents={history.present.players.filter((opponent) => opponent.id !== player.id)}
            playerCount={history.present.players.length}
            dispatch={dispatch}
          />
        ))}
      </main>

      <footer className="app-footer">
        I punteggi restano su questo dispositivo. Commander Companion non sostituisce le regole ufficiali.
      </footer>
    </div>
  )
}

