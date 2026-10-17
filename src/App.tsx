import { useEffect, useReducer, useState } from 'react'
import { AppNotices } from './components/AppNotices'
import { PlayerPanel } from './components/PlayerPanel'
import { TableControls } from './components/TableControls'
import { canRemovePartner, createGame } from './game/game'
import { createHistory, historyReducer } from './game/history'
import {
  loadGame,
  requestPersistentStorage,
  saveGame,
  subscribeToExternalChanges,
} from './game/storage'
import type { LoadStatus } from './game/storage'
import type { GameAction } from './game/types'
import { useWakeLock } from './platform/useWakeLock'

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export default function App() {
  const [initial] = useState(loadGame)
  const [history, dispatchHistory] = useReducer(historyReducer, initial.game, createHistory)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(initial.status)
  const [saveFailed, setSaveFailed] = useState(false)
  const game = history.present

  // Persist every change synchronously so a closed tab never loses the last action.
  // oxlint-disable-next-line react/set-state-in-effect -- the result comes from an external system (storage).
  useEffect(() => setSaveFailed(!saveGame(game)), [game])

  useEffect(() => {
    void requestPersistentStorage()
    return subscribeToExternalChanges((external) => dispatchHistory({ type: 'external', game: external }))
  }, [])

  useWakeLock()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) dispatchHistory({ type: 'undo' })
      else if ((key === 'z' && event.shiftKey) || key === 'y') dispatchHistory({ type: 'redo' })
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const dispatch = (action: GameAction) => dispatchHistory({ type: 'apply', action })

  const confirmNewGame = (playerCount: number) => {
    if (window.confirm('Iniziare una nuova partita? I punteggi attuali verranno sostituiti.')) {
      dispatchHistory({ type: 'replace', game: createGame(playerCount) })
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
          key={game.players.length}
          currentPlayerCount={game.players.length}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={() => dispatchHistory({ type: 'undo' })}
          onRedo={() => dispatchHistory({ type: 'redo' })}
          onReset={confirmReset}
          onNewGame={confirmNewGame}
        />
      </header>

      <AppNotices
        loadStatus={loadStatus}
        saveFailed={saveFailed}
        onDismissLoadStatus={() => setLoadStatus('restored')}
      />

      <main id="main" className="player-grid" data-player-count={game.players.length}>
        {game.players.map((player) => (
          <PlayerPanel
            key={player.id}
            player={player}
            opponents={game.players.filter((opponent) => opponent.id !== player.id)}
            playerCount={game.players.length}
            canRemovePartner={canRemovePartner(game, player.id)}
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
