import { useEffect, useReducer, useState } from 'react'
import { AppNotices } from './components/AppNotices'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PlayerPanel } from './components/PlayerPanel'
import { RulesDialog } from './components/RulesDialog'
import { TableControls } from './components/TableControls'
import { UndoBar } from './components/UndoBar'
import { canRemovePartner, createGame } from './game/game'
import { createHistory, getGroupDelta, historyReducer } from './game/history'
import {
  loadGame,
  requestPersistentStorage,
  saveGame,
  subscribeToExternalChanges,
} from './game/storage'
import type { LoadStatus } from './game/storage'
import type { GameAction, GameState } from './game/types'
import { useCompactLandscape } from './platform/useCompactLandscape'
import { isWakeLockSupported, useWakeLock } from './platform/useWakeLock'
import { loadPreferences, savePreferences } from './settings/preferences'
import type { Preferences } from './settings/preferences'

type PendingConfirmation = { kind: 'new-game'; playerCount: number } | { kind: 'reset' } | null

interface Removal {
  playerId: string
  name: string
  /** Grid position of the removed panel, where the undo bar appears. */
  index: number
  /** The game right before the removal; the snackbar lives only while removal is the latest step. */
  before: GameState
}

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export default function App() {
  const [initial] = useState(loadGame)
  const [history, dispatchHistory] = useReducer(historyReducer, initial.game, createHistory)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(initial.status)
  const [saveFailed, setSaveFailed] = useState(false)
  const [preferences, setPreferences] = useState(loadPreferences)
  const [pending, setPending] = useState<PendingConfirmation>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  // Presentation state only: never dispatched, persisted or part of history.
  const [rulesOpen, setRulesOpen] = useState(false)
  const compact = useCompactLandscape()
  const game = history.present
  const groupDelta = getGroupDelta(history)

  // Persist every change synchronously so a closed tab never loses the last action.
  // oxlint-disable-next-line react/set-state-in-effect -- the result comes from an external system (storage).
  useEffect(() => setSaveFailed(!saveGame(game)), [game])

  useEffect(() => {
    void requestPersistentStorage()
    return subscribeToExternalChanges((external) => dispatchHistory({ type: 'external', game: external }))
  }, [])

  useWakeLock(preferences.keepScreenOn)

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

  const dispatch = (action: GameAction) => {
    if (action.type === 'remove-player') {
      const index = game.players.findIndex((candidate) => candidate.id === action.playerId)
      const player = game.players[index]
      if (player) setRemoval({ playerId: player.id, name: player.name, index, before: game })
    }
    dispatchHistory({ type: 'apply', action, at: performance.now() })
  }

  // Any later step (or undo) makes the removal no longer the latest action: hide the snackbar
  // so its "Annulla" can never undo something else.
  const removalIsLatest =
    removal !== null &&
    history.past.at(-1) === removal.before &&
    history.future.length === 0 &&
    !game.players.some((player) => player.id === removal.playerId)

  const dismissRemoval = () => {
    // If the bar held focus, hand it to the score grid rather than losing it.
    const hadFocus = Boolean(document.activeElement?.closest('.undo-bar'))
    setRemoval(null)
    if (hadFocus) document.getElementById('main')?.focus()
  }

  const panels = game.players.map((player) => (
    <PlayerPanel
      key={player.id}
      player={player}
      opponents={game.players.filter((opponent) => opponent.id !== player.id)}
      playerCount={game.players.length}
      canRemovePartner={canRemovePartner(game, player.id)}
      delta={groupDelta?.target.playerId === player.id ? groupDelta : null}
      compact={compact}
      dispatch={dispatch}
    />
  ))
  if (removalIsLatest) {
    panels.splice(
      removal.index,
      0,
      <UndoBar
        key={`undo-${removal.playerId}`}
        message={`${removal.name} rimosso`}
        onUndo={() => {
          dispatchHistory({ type: 'undo' })
          setRemoval(null)
        }}
        onDismiss={dismissRemoval}
      />,
    )
  }

  const notices = (
    <AppNotices
      loadStatus={loadStatus}
      saveFailed={saveFailed}
      onDismissLoadStatus={() => setLoadStatus('restored')}
      compact={compact}
    />
  )

  const confirm = () => {
    if (pending?.kind === 'new-game') dispatchHistory({ type: 'replace', game: createGame(pending.playerCount) })
    if (pending?.kind === 'reset') dispatch({ type: 'reset-game' })
    setPending(null)
  }

  const updatePreferences = (next: Preferences) => {
    setPreferences(next)
    savePreferences(next)
  }

  return (
    <div className="app-shell" data-compact-landscape={compact}>
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
          compact={compact}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          // Keeping the screen on is the only preference: hide it when unsupported.
          showPreferences={isWakeLockSupported()}
          status={compact && notices}
          onUndo={() => dispatchHistory({ type: 'undo' })}
          onRedo={() => dispatchHistory({ type: 'redo' })}
          onReset={() => setPending({ kind: 'reset' })}
          onNewGame={(playerCount) => setPending({ kind: 'new-game', playerCount })}
          onOpenRules={() => setRulesOpen(true)}
        />
      </header>

      {!compact && notices}

      <main id="main" className="player-grid" data-player-count={panels.length} tabIndex={-1}>
        {panels}
      </main>

      <footer className="app-footer">
        <p>I punteggi restano su questo dispositivo. Commander Companion non sostituisce le regole ufficiali.</p>
      </footer>

      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <ConfirmDialog
        open={pending?.kind === 'new-game'}
        title="Iniziare una nuova partita?"
        description="I punteggi attuali verranno sostituiti."
        confirmLabel="Nuova partita"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Azzerare tutti i punteggi?"
        description="Vita, segnalini e danni torneranno ai valori iniziali. I nomi resteranno invariati."
        confirmLabel="Azzera punteggi"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
