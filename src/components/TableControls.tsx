import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Preferences } from '../settings/preferences'
import { RedoIcon, UndoIcon } from './icons'
import { MatchMenu } from './MatchMenu'
import { PreferencesMenu } from './PreferencesMenu'

interface TableControlsProps {
  currentPlayerCount: number
  canUndo: boolean
  canRedo: boolean
  /** Compact landscape: Undo, Redo, status, then everything else inside "Partita". */
  compact?: boolean
  preferences: Preferences
  onPreferencesChange: (next: Preferences) => void
  /** False when the only preference (Wake Lock) is unsupported. */
  showPreferences: boolean
  /** Compact-only slot between Redo and Partita (the "Stato app" button). */
  status?: ReactNode
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onNewGame: (playerCount: number) => void
  onOpenRules: () => void
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

export function TableControls({
  currentPlayerCount,
  canUndo,
  canRedo,
  compact = false,
  preferences,
  onPreferencesChange,
  showPreferences,
  status,
  onUndo,
  onRedo,
  onReset,
  onNewGame,
  onOpenRules,
}: TableControlsProps) {
  const [playerCount, setPlayerCount] = useState(currentPlayerCount)

  // Checking a threshold is an in-game task, so Regole stays top-level, outside Partita.
  const rules = (
    <button type="button" className="rules-button" aria-label="Regole Commander" title="Regole Commander" onClick={onOpenRules}>
      <BookIcon />
      <span>Regole</span>
    </button>
  )

  const history = (
    <div className="history-controls">
      <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Annulla ultima azione">
        <UndoIcon /> <span>Annulla</span>
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Ripeti ultima azione">
        <RedoIcon /> <span>Ripeti</span>
      </button>
    </div>
  )

  if (compact) {
    return (
      <div className="table-controls" role="group" aria-label="Controlli partita" data-compact="">
        {history}
        <div className="match-controls">
          {status}
          {rules}
          <MatchMenu
            currentPlayerCount={currentPlayerCount}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
            showKeepScreenOn={showPreferences}
            onNewGame={onNewGame}
            onReset={onReset}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="table-controls" role="group" aria-label="Controlli partita">
      {history}

      <div className="match-controls">
        <label>
          <span>Giocatori</span>
          <select
            aria-label="Numero di giocatori"
            value={playerCount}
            onChange={(event) => setPlayerCount(Number(event.target.value))}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
        <button type="button" onClick={() => onNewGame(playerCount)}>
          Nuova partita
        </button>
        <button className="quiet-button" type="button" onClick={onReset}>
          Azzera punteggi
        </button>
        {rules}
        {showPreferences && <PreferencesMenu preferences={preferences} onChange={onPreferencesChange} />}
      </div>
    </div>
  )
}
