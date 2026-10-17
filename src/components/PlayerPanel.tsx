import { isPlayerDefeated } from '../game/game'
import type { CounterKey, GameAction, PlayerState } from '../game/types'

interface PlayerPanelProps {
  player: PlayerState
  opponents: PlayerState[]
  playerCount: number
  dispatch: (action: GameAction) => void
}

const COUNTERS: Array<{ key: CounterKey; label: string; symbol: string }> = [
  { key: 'poison', label: 'Veleno', symbol: '✦' },
  { key: 'energy', label: 'Energia', symbol: 'ϟ' },
  { key: 'experience', label: 'Esperienza', symbol: '◆' },
]

export function PlayerPanel({ player, opponents, playerCount, dispatch }: PlayerPanelProps) {
  const defeated = isPlayerDefeated(player)
  const adjustLife = (amount: number) =>
    dispatch({ type: 'adjust-life', playerId: player.id, amount })

  return (
    <section
      className="player-panel"
      data-accent={player.accent}
      data-defeated={defeated || undefined}
      aria-label={`Segnapunti di ${player.name}`}
    >
      <div className="player-panel__sigil" aria-hidden="true">
        <span />
      </div>

      <header className="player-panel__header">
        <label className="sr-only" htmlFor={`${player.id}-name`}>
          Nome giocatore
        </label>
        <input
          key={player.name}
          id={`${player.id}-name`}
          className="player-name"
          defaultValue={player.name}
          maxLength={28}
          onBlur={(event) =>
            dispatch({ type: 'rename-player', playerId: player.id, name: event.currentTarget.value })
          }
        />
        {defeated && <span className="status-badge">Sconfitto</span>}
        {playerCount > 2 && (
          <button
            className="icon-button"
            type="button"
            aria-label={`Rimuovi ${player.name}`}
            onClick={() => dispatch({ type: 'remove-player', playerId: player.id })}
          >
            ×
          </button>
        )}
      </header>

      <div className="life-zone" aria-live="polite">
        <span className="life-label">Punti vita</span>
        <strong className="life-total" data-testid="life-total">
          {player.life}
        </strong>
      </div>

      <div className="life-controls" aria-label={`Controlli vita di ${player.name}`}>
        {[-5, -1, 1, 5].map((amount) => (
          <button
            className={Math.abs(amount) === 1 ? 'score-button score-button--primary' : 'score-button'}
            type="button"
            key={amount}
            aria-label={`${amount > 0 ? 'Aumenta' : 'Riduci'} di ${Math.abs(amount)} la vita di ${player.name}`}
            onClick={() => adjustLife(amount)}
          >
            {amount > 0 ? `+${amount}` : amount}
          </button>
        ))}
      </div>

      <details className="player-details">
        <summary>
          <span>Segnalini e danni</span>
          <span className="summary-total">{player.poison + player.energy + player.experience}</span>
        </summary>

        <div className="counter-list">
          {COUNTERS.map(({ key, label, symbol }) => (
            <div className="counter-row" key={key}>
              <span className="counter-label">
                <span aria-hidden="true">{symbol}</span> {label}
              </span>
              <div className="stepper">
                <button
                  type="button"
                  aria-label={`Riduci ${label.toLowerCase()} di ${player.name}`}
                  onClick={() =>
                    dispatch({ type: 'adjust-counter', playerId: player.id, counter: key, amount: -1 })
                  }
                >
                  −
                </button>
                <output aria-label={`${label} di ${player.name}`}>{player[key]}</output>
                <button
                  type="button"
                  aria-label={`Aumenta ${label.toLowerCase()} di ${player.name}`}
                  onClick={() =>
                    dispatch({ type: 'adjust-counter', playerId: player.id, counter: key, amount: 1 })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="commander-damage">
          <h3>Danni Commander subiti</h3>
          {opponents.map((opponent) => (
            <div className="counter-row" key={opponent.id}>
              <span className="counter-label">da {opponent.name}</span>
              <div className="stepper">
                <button
                  type="button"
                  aria-label={`Riduci danni Commander da ${opponent.name} a ${player.name}`}
                  onClick={() =>
                    dispatch({
                      type: 'adjust-commander-damage',
                      playerId: player.id,
                      sourcePlayerId: opponent.id,
                      amount: -1,
                    })
                  }
                >
                  −
                </button>
                <output>{player.commanderDamage[opponent.id] ?? 0}</output>
                <button
                  type="button"
                  aria-label={`Aumenta danni Commander da ${opponent.name} a ${player.name}`}
                  onClick={() =>
                    dispatch({
                      type: 'adjust-commander-damage',
                      playerId: player.id,
                      sourcePlayerId: opponent.id,
                      amount: 1,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
