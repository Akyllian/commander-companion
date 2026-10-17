import { useEffect, useState } from 'react'
import { getDefeatReasons } from '../game/game'
import type { DefeatReason } from '../game/game'
import type { CommanderIndex, CounterKey, GameAction, PlayerState } from '../game/types'

interface PlayerPanelProps {
  player: PlayerState
  opponents: PlayerState[]
  playerCount: number
  canRemovePartner: boolean
  dispatch: (action: GameAction) => void
}

const COUNTERS: Array<{ key: CounterKey; label: string; symbol: string }> = [
  { key: 'poison', label: 'Veleno', symbol: '✦' },
  { key: 'energy', label: 'Energia', symbol: 'ϟ' },
  { key: 'experience', label: 'Esperienza', symbol: '◆' },
]

const DEFEAT_LABELS: Record<DefeatReason, string> = {
  life: 'punti vita a zero o meno',
  poison: '10 segnalini veleno',
  'commander-damage': '21 danni da un comandante',
}

/** Rapid taps produce one announcement for the settled total, not one per tap. */
const ANNOUNCE_DELAY_MS = 700

function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

export function PlayerPanel({
  player,
  opponents,
  playerCount,
  canRemovePartner,
  dispatch,
}: PlayerPanelProps) {
  const defeatReasons = getDefeatReasons(player)
  const defeated = defeatReasons.length > 0
  const settledLife = useSettledValue(player.life, ANNOUNCE_DELAY_MS)
  const adjustLife = (amount: number) => dispatch({ type: 'adjust-life', playerId: player.id, amount })

  const commanderSources = opponents.flatMap((opponent) =>
    (opponent.hasPartner ? [0, 1] : [0]).map((index) => ({
      opponent,
      index: index as CommanderIndex,
      label: opponent.hasPartner ? `${opponent.name}, comandante ${index + 1}` : opponent.name,
    })),
  )

  const adjustCommanderDamage = (sourcePlayerId: string, commander: CommanderIndex, amount: number) =>
    dispatch({ type: 'adjust-commander-damage', playerId: player.id, sourcePlayerId, commander, amount })

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
          enterKeyHint="done"
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              event.currentTarget.value = player.name
              event.currentTarget.blur()
            }
          }}
          onBlur={(event) =>
            dispatch({ type: 'rename-player', playerId: player.id, name: event.currentTarget.value })
          }
        />
        {defeated && (
          <span className="status-badge">
            Sconfitto
            <span className="sr-only">: {defeatReasons.map((reason) => DEFEAT_LABELS[reason]).join(', ')}</span>
          </span>
        )}
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

      <div className="life-zone">
        <span className="life-label">Punti vita</span>
        <strong className="life-total" data-testid="life-total">
          {player.life}
        </strong>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {`${player.name}: ${settledLife} punti vita`}
        </span>
      </div>

      <div className="life-controls" role="group" aria-label={`Controlli vita di ${player.name}`}>
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
              <div className="stepper" role="group" aria-label={`${label} di ${player.name}`}>
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
          <p className="commander-damage__hint">Ogni danno Commander riduce anche i punti vita.</p>
          {commanderSources.map(({ opponent, index, label }) => {
            const value = player.commanderDamage[opponent.id]?.[index] ?? 0
            return (
              <div className="counter-row" key={`${opponent.id}-${index}`}>
                <span className="counter-label">da {label}</span>
                <div className="stepper" role="group" aria-label={`Danni Commander da ${label}`}>
                  <button
                    type="button"
                    aria-label={`Riduci danni Commander da ${label} a ${player.name}`}
                    onClick={() => adjustCommanderDamage(opponent.id, index, -1)}
                  >
                    −
                  </button>
                  <output aria-label={`Danni Commander da ${label} a ${player.name}`}>{value}</output>
                  <button
                    type="button"
                    aria-label={`Aumenta danni Commander da ${label} a ${player.name}`}
                    onClick={() => adjustCommanderDamage(opponent.id, index, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="partner-setting">
          <label className="partner-toggle">
            <input
              type="checkbox"
              checked={player.hasPartner}
              disabled={player.hasPartner && !canRemovePartner}
              aria-describedby={`${player.id}-partner-hint`}
              onChange={(event) =>
                dispatch({ type: 'set-partner', playerId: player.id, hasPartner: event.currentTarget.checked })
              }
            />
            <span>Il mazzo di {player.name} ha due comandanti (partner)</span>
          </label>
          <p className="partner-hint" id={`${player.id}-partner-hint`}>
            {player.hasPartner && !canRemovePartner
              ? 'Per toglierlo, azzera prima i danni inflitti dal secondo comandante.'
              : 'I danni dei due comandanti si contano separatamente.'}
          </p>
        </div>
      </details>
    </section>
  )
}
