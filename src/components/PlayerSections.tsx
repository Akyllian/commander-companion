import { COMMANDER_DAMAGE_LIMIT } from '../game/game'
import type { DefeatReason } from '../game/game'
import type { CommanderIndex, CounterKey, GameAction, PlayerState } from '../game/types'
import { CommanderPicker } from './CommanderPicker'
import { deltaFor } from './DeltaBadge'
import type { PanelDelta } from './DeltaBadge'

/**
 * Secondary player sections, shared by the standard panel (inline) and the compact
 * player-details sheet (spec 2026-10-18). Behavior is identical in both places.
 */

const COUNTERS: Array<{ key: CounterKey; label: string; symbol: string }> = [
  { key: 'poison', label: 'Veleno', symbol: '✦' },
  { key: 'energy', label: 'Energia', symbol: 'ϟ' },
  { key: 'experience', label: 'Esperienza', symbol: '◆' },
]

/** Visible reason (UX decision 6; shorter in compact) and the full sentence for screen readers. */
const DEFEAT_LABELS: Record<DefeatReason, { short: string; compact: string; full: string }> = {
  life: { short: 'Vita', compact: 'Vita', full: 'punti vita a zero o meno' },
  poison: { short: '10 veleno', compact: '10 veleno', full: '10 segnalini veleno' },
  'commander-damage': { short: '21 danni Commander', compact: '21 Commander', full: '21 danni da un comandante' },
}

interface DefeatBadgeProps {
  reasons: DefeatReason[]
  variant?: 'standard' | 'compact'
}

export function DefeatBadge({ reasons, variant = 'standard' }: DefeatBadgeProps) {
  if (reasons.length === 0) return null
  const visible =
    reasons.length === 1
      ? DEFEAT_LABELS[reasons[0]][variant === 'compact' ? 'compact' : 'short']
      : `${reasons.length} condizioni`
  return (
    <span className="status-badge">
      <span className="status-badge__label">Sconfitto</span>
      {/* In narrow compact panels only this part is shortened, never the word "Sconfitto". */}
      <span className="status-badge__reason"> · {visible}</span>
      <span className="sr-only">: {reasons.map((reason) => DEFEAT_LABELS[reason].full).join(', ')}</span>
    </span>
  )
}

/** Standard "user-minus": remove from this match, not delete forever. */
export function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="remove-icon">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
    </svg>
  )
}

interface SectionProps {
  player: PlayerState
  dispatch: (action: GameAction) => void
}

interface DeckConfigSectionProps extends SectionProps {
  canRemovePartner: boolean
}

export function DeckConfigSection({ player, dispatch, canRemovePartner }: DeckConfigSectionProps) {
  return (
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
      <CommanderPicker player={player} dispatch={dispatch} />
    </details>
  )
}

interface CommanderSectionProps extends SectionProps {
  opponents: PlayerState[]
  delta: PanelDelta | null
  open: boolean
  onToggle: (open: boolean) => void
}

export function CommanderSection({ player, opponents, delta, open, onToggle, dispatch }: CommanderSectionProps) {
  const sources = opponents.flatMap((opponent) =>
    (opponent.hasPartner ? [0, 1] : [0]).map((index) => ({
      opponent,
      index: index as CommanderIndex,
      label: opponent.hasPartner ? `${opponent.name}, comandante ${index + 1}` : opponent.name,
    })),
  )
  // The threshold applies to a single commander, so the summary shows the maximum, never the sum.
  const maxDamage = Math.max(0, ...Object.values(player.commanderDamage).flat())
  const adjust = (sourcePlayerId: string, commander: CommanderIndex, amount: number) =>
    dispatch({ type: 'adjust-commander-damage', playerId: player.id, sourcePlayerId, commander, amount })

  return (
    <details className="player-details commander-damage" open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary>
        <span>Danni Commander</span>
        <span className="summary-value">
          massimo {maxDamage}/{COMMANDER_DAMAGE_LIMIT}
        </span>
      </summary>
      <p className="commander-damage__hint">
        Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.
      </p>
      {sources.map(({ opponent, index, label }) => {
        const value = player.commanderDamage[opponent.id]?.[index] ?? 0
        return (
          <div className="counter-row" key={`${opponent.id}-${index}`}>
            <span className="counter-label">da {label}</span>
            {deltaFor(delta, { kind: 'commander', playerId: player.id, sourcePlayerId: opponent.id, commander: index })}
            <div className="stepper" role="group" aria-label={`Danni Commander da ${label}`}>
              <button
                type="button"
                aria-label={`Riduci danni Commander da ${label} a ${player.name}`}
                onClick={() => adjust(opponent.id, index, -1)}
              >
                −
              </button>
              <output aria-label={`Danni Commander da ${label} a ${player.name}`}>{value}</output>
              <button
                type="button"
                aria-label={`Aumenta danni Commander da ${label} a ${player.name}`}
                onClick={() => adjust(opponent.id, index, 1)}
              >
                +
              </button>
            </div>
          </div>
        )
      })}
    </details>
  )
}

interface CountersSectionProps extends SectionProps {
  delta: PanelDelta | null
}

export function OtherCountersSection({ player, delta, dispatch }: CountersSectionProps) {
  return (
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
            {deltaFor(delta, { kind: 'counter', playerId: player.id, counter: key })}
            <div className="stepper" role="group" aria-label={`${label} di ${player.name}`}>
              <button
                type="button"
                aria-label={`Riduci ${label.toLowerCase()} di ${player.name}`}
                onClick={() => dispatch({ type: 'adjust-counter', playerId: player.id, counter: key, amount: -1 })}
              >
                −
              </button>
              <output aria-label={`${label} di ${player.name}`}>{player[key]}</output>
              <button
                type="button"
                aria-label={`Aumenta ${label.toLowerCase()} di ${player.name}`}
                onClick={() => dispatch({ type: 'adjust-counter', playerId: player.id, counter: key, amount: 1 })}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

/** Commander name and artist credit (Fan Content Policy: the artist is always credited). */
export function CommanderLine({ player }: { player: PlayerState }) {
  if (!player.commander) return null
  return (
    <p className="commander-line">
      <span className="commander-line__name">{player.commander.name}</span>
      <span className="commander-credit">Illustrazione di {player.commander.artist}</span>
    </p>
  )
}
