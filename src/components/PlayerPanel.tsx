import { useEffect, useState } from 'react'
import { COMMANDER_DAMAGE_LIMIT, getDefeatReasons } from '../game/game'
import type { DefeatReason } from '../game/game'
import { GROUP_WINDOW_MS } from '../game/history'
import type { GroupTarget } from '../game/history'
import type { CommanderIndex, CounterKey, GameAction, PlayerState } from '../game/types'

export interface PanelDelta {
  target: GroupTarget
  delta: number
  at: number
}

interface PlayerPanelProps {
  player: PlayerState
  opponents: PlayerState[]
  playerCount: number
  canRemovePartner: boolean
  /** The open tap group, when it concerns this player. */
  delta: PanelDelta | null
  dispatch: (action: GameAction) => void
}

const COUNTERS: Array<{ key: CounterKey; label: string; symbol: string }> = [
  { key: 'poison', label: 'Veleno', symbol: '✦' },
  { key: 'energy', label: 'Energia', symbol: 'ϟ' },
  { key: 'experience', label: 'Esperienza', symbol: '◆' },
]

/** Short visible reason (UX decision 6) and the full sentence for screen readers. */
const DEFEAT_LABELS: Record<DefeatReason, { short: string; full: string }> = {
  life: { short: 'Vita', full: 'punti vita a zero o meno' },
  poison: { short: '10 veleno', full: '10 segnalini veleno' },
  'commander-damage': { short: '21 danni Commander', full: '21 danni da un comandante' },
}

function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

/** Temporary cumulative change ("+7") shown while a tap group is open (UX decision 3). */
function DeltaBadge({ delta }: { delta: number }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), GROUP_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [])
  if (!visible || delta === 0) return null
  return (
    <span className="delta-badge" aria-hidden="true" data-testid="delta-badge">
      {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
    </span>
  )
}

const sameTarget = (a: GroupTarget, b: GroupTarget) => JSON.stringify(a) === JSON.stringify(b)

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="remove-icon">
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 11h5.5" />
    </svg>
  )
}

export function PlayerPanel({
  player,
  opponents,
  playerCount,
  canRemovePartner,
  delta,
  dispatch,
}: PlayerPanelProps) {
  const [commanderOpen, setCommanderOpen] = useState(false)
  const defeatReasons = getDefeatReasons(player)
  const defeated = defeatReasons.length > 0
  const settledLife = useSettledValue(player.life, GROUP_WINDOW_MS)
  const adjustLife = (amount: number) => dispatch({ type: 'adjust-life', playerId: player.id, amount })

  const deltaFor = (target: GroupTarget) =>
    delta && sameTarget(delta.target, target) ? <DeltaBadge key={delta.at} delta={delta.delta} /> : null

  const commanderSources = opponents.flatMap((opponent) =>
    (opponent.hasPartner ? [0, 1] : [0]).map((index) => ({
      opponent,
      index: index as CommanderIndex,
      label: opponent.hasPartner ? `${opponent.name}, comandante ${index + 1}` : opponent.name,
    })),
  )
  // The threshold applies to a single commander, so the summary shows the maximum, never the sum.
  const maxCommanderDamage = Math.max(0, ...Object.values(player.commanderDamage).flat())

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
        {player.hasPartner && <span className="partner-badge">Partner</span>}
        {playerCount > 2 && (
          <button
            className="icon-button"
            type="button"
            aria-label={`Rimuovi ${player.name}`}
            onClick={() => dispatch({ type: 'remove-player', playerId: player.id })}
          >
            <RemoveIcon />
          </button>
        )}
      </header>

      {defeated && (
        <p className="defeat-line">
          <span className="status-badge">
            Sconfitto ·{' '}
            {defeatReasons.length === 1
              ? DEFEAT_LABELS[defeatReasons[0]].short
              : `${defeatReasons.length} condizioni`}
            <span className="sr-only">: {defeatReasons.map((reason) => DEFEAT_LABELS[reason].full).join(', ')}</span>
          </span>
        </p>
      )}

      <details className="deck-config">
        <summary>Configurazione mazzo</summary>
        <label className="check-option">
          <input
            type="checkbox"
            checked={player.hasPartner}
            disabled={player.hasPartner && !canRemovePartner}
            aria-describedby={`${player.id}-partner-hint`}
            onChange={(event) =>
              dispatch({ type: 'set-partner', playerId: player.id, hasPartner: event.currentTarget.checked })
            }
          />
          <span>Due comandanti (Partner)</span>
        </label>
        <p className="partner-hint" id={`${player.id}-partner-hint`}>
          {player.hasPartner && !canRemovePartner
            ? 'Azzera prima i danni del Comandante 2.'
            : 'I danni dei due comandanti si contano separatamente.'}
        </p>
      </details>

      <div className="life-zone">
        <span className="life-label">Punti vita</span>
        <span className="life-value">
          <strong className="life-total" data-testid="life-total">
            {player.life}
          </strong>
          {deltaFor({ kind: 'life', playerId: player.id })}
        </span>
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

      <details
        className="player-details commander-damage"
        open={commanderOpen}
        onToggle={(event) => setCommanderOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Danni Commander</span>
          <span className="summary-value">
            massimo {maxCommanderDamage}/{COMMANDER_DAMAGE_LIMIT}
          </span>
        </summary>
        <p className="commander-damage__hint">Ogni danno Commander riduce anche i punti vita.</p>
        {commanderSources.map(({ opponent, index, label }) => {
          const value = player.commanderDamage[opponent.id]?.[index] ?? 0
          return (
            <div className="counter-row" key={`${opponent.id}-${index}`}>
              <span className="counter-label">da {label}</span>
              {deltaFor({ kind: 'commander', playerId: player.id, sourcePlayerId: opponent.id, commander: index })}
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
      </details>

      <details className="player-details other-counters">
        <summary>
          <span>Altri segnalini</span>
          <span className="summary-total">{player.poison + player.energy + player.experience}</span>
        </summary>

        <div className="counter-list">
          {COUNTERS.map(({ key, label, symbol }) => (
            <div className="counter-row" key={key}>
              <span className="counter-label">
                <span aria-hidden="true">{symbol}</span> {label}
              </span>
              {deltaFor({ kind: 'counter', playerId: player.id, counter: key })}
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
      </details>
    </section>
  )
}
