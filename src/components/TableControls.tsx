import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Preferences } from '../settings/preferences'
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
}: TableControlsProps) {
  const [playerCount, setPlayerCount] = useState(currentPlayerCount)

  const history = (
    <div className="history-controls">
      <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Annulla ultima azione">
        ↶ <span>Annulla</span>
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Ripeti ultima azione">
        ↷ <span>Ripeti</span>
      </button>
    </div>
  )

  if (compact) {
    return (
      <div className="table-controls" role="group" aria-label="Controlli partita" data-compact="">
        {history}
        <div className="match-controls">
          {status}
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
        {showPreferences && <PreferencesMenu preferences={preferences} onChange={onPreferencesChange} />}
      </div>
    </div>
  )
}
