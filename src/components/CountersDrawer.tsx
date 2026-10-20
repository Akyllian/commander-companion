import { useEffect, useRef } from 'react'
import type React from 'react'
import { COMMANDER_TAX_STEP } from '../game/game'
import type { GroupDelta, GroupTarget } from '../game/history'
import type { CommanderIndex, GameAction, PlayerState, TableRole } from '../game/types'
import { deltaFor } from './DeltaBadge'
import { CloseIcon, CrownIcon, EnergyIcon, ExperienceIcon, InitiativeIcon, PoisonIcon, RadIcon, TaxIcon } from './icons'
import { COUNTER_ABBREVIATIONS, COUNTER_FROM, COUNTER_LABELS, COUNTER_ORDER, COUNTER_TO } from './scoreVocabulary'

interface CountersDrawerProps {
  id: string
  player: PlayerState
  delta: GroupDelta | null
  monarchPlayerId: string | null
  initiativePlayerId: string | null
  dispatch: (action: GameAction) => void
  onClose: () => void
}

const COUNTER_ICONS = { poison: PoisonIcon, energy: EnergyIcon, experience: ExperienceIcon, rad: RadIcon }

interface ColumnProps {
  name: string
  abbreviation: string
  Icon: () => React.JSX.Element
  value: React.ReactNode
  badge?: React.ReactNode
  plus: { label: string; disabled?: boolean; onClick: () => void }
  minus: { label: string; disabled?: boolean; onClick: () => void }
}

/** One vertical column: + / symbol, value and name / − (R2 §5.1). */
function CounterColumn({ name, abbreviation, Icon, value, badge, plus, minus }: ColumnProps) {
  const button = (control: ColumnProps['plus'], sign: string) => (
    <button type="button" className="counter-column__step" aria-label={control.label} disabled={control.disabled} onClick={control.onClick}>
      {sign}
    </button>
  )
  return (
    <div className="counter-column" role="group" aria-label={name}>
      {button(plus, '+')}
      <span className="counter-column__value">
        <Icon />
        <strong data-testid="counter-value">{value}</strong>
        {badge}
        <span className="counter-column__name" aria-hidden="true">
          {name}
        </span>
        <span className="counter-column__abbr" aria-hidden="true">
          {abbreviation}
        </span>
      </span>
      {button(minus, '−')}
    </div>
  )
}

const ROLES: Array<{ role: TableRole; label: string; abbreviation: string; Icon: () => React.JSX.Element }> = [
  { role: 'monarch', label: 'Monarca', abbreviation: 'MON', Icon: CrownIcon },
  { role: 'initiative', label: 'Iniziativa', abbreviation: 'INI', Icon: InitiativeIcon },
]

/**
 * Every counter of one player, inside the card (R2 §5). It covers the card (`inset: 0`) and never
 * grows it; under 132px of height the CSS turns it into the compact full-card mode with a
 * decorative rail of name and life. Mounted only while open.
 */
export function CountersDrawer({ id, player, delta, monarchPlayerId, initiativePlayerId, dispatch, onClose }: CountersDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])
  const titleId = `${id}-title`
  const badge = (target: GroupTarget) => deltaFor(delta, target)

  const counters = COUNTER_ORDER.map((counter) => (
    <CounterColumn
      key={counter}
      name={COUNTER_LABELS[counter]}
      abbreviation={COUNTER_ABBREVIATIONS[counter]}
      Icon={COUNTER_ICONS[counter]}
      value={player[counter]}
      badge={badge({ kind: 'counter', playerId: player.id, counter })}
      plus={{
        label: `Aggiungi 1 ${COUNTER_TO[counter]} di ${player.name}`,
        onClick: () => dispatch({ type: 'adjust-counter', playerId: player.id, counter, amount: 1 }),
      }}
      minus={{
        label: `Togli 1 ${COUNTER_FROM[counter]} di ${player.name}`,
        disabled: player[counter] === 0,
        onClick: () => dispatch({ type: 'adjust-counter', playerId: player.id, counter, amount: -1 }),
      }}
    />
  ))

  const slots: CommanderIndex[] = player.hasPartner ? [0, 1] : [0]
  const taxes = slots.map((slot) => {
    const commander = player.hasPartner ? `del Comandante ${slot + 1}` : 'del comandante'
    const adjust = (amount: number) => dispatch({ type: 'adjust-commander-tax', playerId: player.id, commander: slot, amount })
    return (
      <CounterColumn
        key={`tax-${slot}`}
        name={`Tassa C${slot + 1}`}
        abbreviation={`C${slot + 1}`}
        Icon={TaxIcon}
        value={player.commanderTax[slot]}
        badge={badge({ kind: 'commander-tax', playerId: player.id, commander: slot })}
        plus={{ label: `Aggiungi ${COMMANDER_TAX_STEP} alla tassa ${commander} di ${player.name}`, onClick: () => adjust(COMMANDER_TAX_STEP) }}
        minus={{
          label: `Togli ${COMMANDER_TAX_STEP} dalla tassa ${commander} di ${player.name}`,
          disabled: player.commanderTax[slot] === 0,
          onClick: () => adjust(-COMMANDER_TAX_STEP),
        }}
      />
    )
  })

  const holders = { monarch: monarchPlayerId, initiative: initiativePlayerId }
  const roles = ROLES.map(({ role, label, abbreviation, Icon }) => {
    const held = holders[role] === player.id
    const set = (playerId: string | null) => dispatch({ type: 'set-table-role', role, playerId })
    return (
      <CounterColumn
        key={role}
        name={label}
        abbreviation={abbreviation}
        Icon={Icon}
        // Not a number: the role is held or it is not (R2 §5.2).
        value={held ? 'Sì' : '—'}
        plus={{
          label: held ? `Prendi ${label} (è già di ${player.name})` : `Prendi ${label} per ${player.name}`,
          disabled: held,
          onClick: () => set(player.id),
        }}
        minus={{
          label: held ? `Rilascia ${label} di ${player.name}` : `Rilascia ${label} (non è di ${player.name})`,
          disabled: !held,
          onClick: () => set(null),
        }}
      />
    )
  })

  return (
    <div className="counters-drawer card-surface" id={id} role="group" aria-labelledby={titleId} data-drawer="counters">
      <div className="counters-drawer__rail" aria-hidden="true">
        <span className="counters-drawer__rail-name">{player.name}</span>
        <strong className="counters-drawer__rail-life">{player.life}</strong>
      </div>
      <div className="card-surface__header">
        <p className="card-surface__title" id={titleId}>
          Contatori
        </p>
        <button ref={closeRef} type="button" className="icon-button card-surface__close" aria-label="Chiudi contatori" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="counters-drawer__track">
        {counters}
        {taxes}
        {roles}
      </div>
    </div>
  )
}
