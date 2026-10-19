import { useState } from 'react'
import type { Preferences } from '../settings/preferences'
import { ChevronDownIcon } from './icons'
import { PopoverMenu } from './PopoverMenu'
import { KeepScreenOnOption } from './PreferencesMenu'

interface MatchMenuProps {
  currentPlayerCount: number
  preferences: Preferences
  onPreferencesChange: (next: Preferences) => void
  /** False hides the Wake Lock option (unsupported browser). */
  showKeepScreenOn: boolean
  onNewGame: (playerCount: number) => void
  onReset: () => void
  supportsPopover?: boolean
}

/**
 * Compact-density "Partita" menu (spec 2026-10-18): infrequent match management
 * grouped behind a text-labelled button. Destructive actions keep their confirmation
 * dialogs; the menu closes first so the dialog returns focus to "Partita".
 */
export function MatchMenu({
  currentPlayerCount,
  preferences,
  onPreferencesChange,
  showKeepScreenOn,
  onNewGame,
  onReset,
  supportsPopover,
}: MatchMenuProps) {
  const [playerCount, setPlayerCount] = useState(currentPlayerCount)
  const [syncedCount, setSyncedCount] = useState(currentPlayerCount)
  // Keep the draft in sync when the table changes size (removal, undo, new game).
  if (syncedCount !== currentPlayerCount) {
    setSyncedCount(currentPlayerCount)
    setPlayerCount(currentPlayerCount)
  }

  return (
    <PopoverMenu label="Partita" buttonClassName="match-menu-button" supportsPopover={supportsPopover} trigger={<>Partita <ChevronDownIcon /></>}>
      {(close) => (
        <div className="match-menu">
          <label className="match-menu__players">
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
          <button
            type="button"
            onClick={() => {
              close()
              onNewGame(playerCount)
            }}
          >
            Nuova partita
          </button>
          <button
            type="button"
            className="quiet-button reset-scores-button"
            onClick={() => {
              close()
              onReset()
            }}
          >
            Azzera punteggi
          </button>
          {showKeepScreenOn && (
            <>
              <hr className="menu-divider" />
              <KeepScreenOnOption preferences={preferences} onChange={onPreferencesChange} />
            </>
          )}
        </div>
      )}
    </PopoverMenu>
  )
}
