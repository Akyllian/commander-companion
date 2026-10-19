import type { DefeatReason } from '../game/game'
import type { CommanderIndex, GameAction, PlayerState } from '../game/types'
import { CommanderSlotPicker, commanderSlotLabel } from './CommanderPicker'

/**
 * Secondary player sections, shared by the standard panel (inline) and the compact
 * player-details sheet (spec 2026-10-18). Scoring lives in the dock instead (D-033).
 */


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

/** "Comandante e mazzo" (D-027): commander slots first, then the partner toggle, Scryfall note last. */
export function DeckConfigSection({ player, dispatch, canRemovePartner }: DeckConfigSectionProps) {
  return (
    <details className="deck-config">
      <summary>Comandante e mazzo</summary>
      <CommanderSlotPicker player={player} slot={0} dispatch={dispatch} />
      {player.hasPartner && <CommanderSlotPicker player={player} slot={1} dispatch={dispatch} />}
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
          ? 'Azzera prima danni e tassa del Comandante 2.'
          : 'Danni e tassa dei due comandanti si contano separatamente.'}
      </p>
      <p className="commander-source">Dati e illustrazioni da Scryfall; scaricati una volta e salvati sul dispositivo.</p>
    </details>
  )
}

/** Commander names and artist credits (Fan Content Policy: the artist is always credited). */
export function CommanderLine({ player }: { player: PlayerState }) {
  const slots = player.commanders.flatMap((commander, index) =>
    commander ? [{ commander, label: commanderSlotLabel(player, index as CommanderIndex) }] : [],
  )
  if (slots.length === 0) return null
  return (
    <div className="commander-lines">
      {slots.map(({ commander, label }) => (
        <p className="commander-line" key={label}>
          {player.hasPartner && <span className="sr-only">{label}: </span>}
          <span className="commander-line__name">{commander.name}</span>
          <span className="commander-credit">Illustrazione di {commander.artist}</span>
        </p>
      ))}
    </div>
  )
}
