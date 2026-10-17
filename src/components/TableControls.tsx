import { useState } from 'react'

interface TableControlsProps {
  currentPlayerCount: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onNewGame: (playerCount: number) => void
}

export function TableControls({
  currentPlayerCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onNewGame,
}: TableControlsProps) {
  const [playerCount, setPlayerCount] = useState(currentPlayerCount)

  return (
    <div className="table-controls" role="group" aria-label="Controlli partita">
      <div className="history-controls">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Annulla ultima azione">
          ↶ <span>Annulla</span>
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Ripeti ultima azione">
          ↷ <span>Ripeti</span>
        </button>
      </div>

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
      </div>
    </div>
  )
}
