import { useState } from 'react'
import type React from 'react'
import { COMMANDER_DAMAGE_LIMIT, COMMANDER_TAX_STEP } from '../game/game'
import type { GroupTarget } from '../game/history'
import type { CommanderIndex, CounterKey, GameAction, PlayerState, TableRole } from '../game/types'
import { useArtImage } from '../media/useCommanderArt'
import { GROUP_WINDOW_MS } from '../game/history'
import { deltaFor } from './DeltaBadge'
import type { PanelDelta } from './DeltaBadge'
import { useSettledValue } from './useSettledValue'
import {
  CommanderDamageIcon,
  CrownIcon,
  EnergyIcon,
  ExperienceIcon,
  InitiativeIcon,
  LifeIcon,
  PoisonIcon,
  RadIcon,
  TaxIcon,
} from './icons'

/**
 * Direct scoring dock (D-033): every frequent score is one tap away on the panel itself.
 * The selected mode and sources are presentation state only; every change is a GameAction.
 */

export type ScoreMode = 'life' | 'commander' | CounterKey | 'tax'

export interface DamageSource {
  playerId: string
  commander: CommanderIndex
}

interface SourceOption extends DamageSource {
  opponent: PlayerState
  /** "Giocatore 2" or, for a Partner deck, "Giocatore 2, Comandante 1". */
  label: string
}

export interface ScoreSelection {
  mode: ScoreMode
  setMode: (mode: ScoreMode) => void
  sources: SourceOption[]
  source: SourceOption | null
  setSource: (source: DamageSource) => void
  taxSlot: CommanderIndex
  setTaxSlot: (slot: CommanderIndex) => void
}

const COUNTER_LABELS: Record<CounterKey, string> = {
  poison: 'Veleno',
  energy: 'Energia',
  experience: 'Esperienza',
  rad: 'Radiazioni',
}

const MODES: Array<{ mode: ScoreMode; label: string; Icon: () => React.JSX.Element }> = [
  { mode: 'life', label: 'Vita', Icon: LifeIcon },
  { mode: 'commander', label: 'Commander', Icon: CommanderDamageIcon },
  { mode: 'poison', label: COUNTER_LABELS.poison, Icon: PoisonIcon },
  { mode: 'energy', label: COUNTER_LABELS.energy, Icon: EnergyIcon },
  { mode: 'experience', label: COUNTER_LABELS.experience, Icon: ExperienceIcon },
  { mode: 'rad', label: COUNTER_LABELS.rad, Icon: RadIcon },
  { mode: 'tax', label: 'Tassa', Icon: TaxIcon },
]

const ROLES: Array<{ role: TableRole; label: string; Icon: () => React.JSX.Element }> = [
  { role: 'monarch', label: 'Monarca', Icon: CrownIcon },
  { role: 'initiative', label: 'Iniziativa', Icon: InitiativeIcon },
]

export const COMMANDER_HINT = 'Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.'

const isCounter = (mode: ScoreMode): mode is CounterKey => mode in COUNTER_LABELS
const slotName = (slot: CommanderIndex) => `Comandante ${slot + 1}`

function damageSources(opponents: PlayerState[]): SourceOption[] {
  return opponents.flatMap((opponent) =>
    (opponent.hasPartner ? ([0, 1] as const) : ([0] as const)).map((commander) => ({
      opponent,
      playerId: opponent.id,
      commander,
      label: opponent.hasPartner ? `${opponent.name}, ${slotName(commander)}` : opponent.name,
    })),
  )
}

/** Mode, Commander source and tax slot of one panel; invalid choices fall back to the first option. */
export function useScoreSelection(player: PlayerState, opponents: PlayerState[]): ScoreSelection {
  const [mode, setMode] = useState<ScoreMode>('life')
  const [chosenSource, setSource] = useState<DamageSource | null>(null)
  const [chosenSlot, setTaxSlot] = useState<CommanderIndex>(0)
  const sources = damageSources(opponents)
  const source =
    sources.find((option) => option.playerId === chosenSource?.playerId && option.commander === chosenSource.commander) ??
    sources[0] ??
    null
  return { mode, setMode, sources, source, setSource, taxSlot: player.hasPartner ? chosenSlot : 0, setTaxSlot }
}

/** Generic mana shown the way it is printed: a number in a circle. */
function ManaSymbol({ value }: { value: number }) {
  return (
    <span className="mana-cost mana-symbol" aria-hidden="true">
      {value}
    </span>
  )
}

const maxCommanderDamage = (player: PlayerState) => Math.max(0, ...Object.values(player.commanderDamage).flat())

function modeValue(player: PlayerState, mode: ScoreMode): { text: React.ReactNode; spoken: string } {
  if (mode === 'life') return { text: player.life, spoken: String(player.life) }
  if (mode === 'commander') {
    // The 21 threshold is per commander, so the summary is the maximum, never the sum.
    const max = maxCommanderDamage(player)
    return { text: `${max}/${COMMANDER_DAMAGE_LIMIT}`, spoken: `massimo ${max} su ${COMMANDER_DAMAGE_LIMIT}` }
  }
  if (mode === 'tax') {
    const [first, second] = player.commanderTax
    return player.hasPartner
      ? {
          text: (
            <>
              +<ManaSymbol value={first} /> +<ManaSymbol value={second} />
            </>
          ),
          spoken: `più ${first} e più ${second} mana`,
        }
      : { text: <>+<ManaSymbol value={first} /></>, spoken: `più ${first} mana` }
  }
  return { text: player[mode], spoken: String(player[mode]) }
}

interface StripProps {
  player: PlayerState
  selection: ScoreSelection
  monarchPlayerId: string | null
  initiativePlayerId: string | null
  dispatch: (action: GameAction) => void
}

/** One continuous strip of modes, then the two table roles after a divider. */
export function ScoreModeStrip({ player, selection, monarchPlayerId, initiativePlayerId, dispatch }: StripProps) {
  const owners: Record<TableRole, string | null> = { monarch: monarchPlayerId, initiative: initiativePlayerId }
  return (
    <div className="score-modes" role="group" aria-label={`Punteggio di ${player.name}`}>
      {MODES.map(({ mode, label, Icon }) => {
        const value = modeValue(player, mode)
        return (
          <button
            key={mode}
            type="button"
            className="score-mode"
            data-score-mode={mode}
            aria-pressed={selection.mode === mode}
            aria-label={`${label}: ${value.spoken}`}
            title={label}
            onClick={() => selection.setMode(mode)}
          >
            <Icon />
            <span className="score-mode__label">{label}</span>
            <span className="score-mode__value">{value.text}</span>
          </button>
        )
      })}
      <span className="score-modes__divider" aria-hidden="true" />
      {ROLES.map(({ role, label, Icon }) => {
        const held = owners[role] === player.id
        return (
          <button
            key={role}
            type="button"
            className="score-mode score-role"
            data-table-role={role}
            data-held={held || undefined}
            aria-pressed={held}
            aria-label={label}
            title={label}
            onClick={() => dispatch({ type: 'set-table-role', role, playerId: held ? null : player.id })}
          >
            <Icon />
            <span className="score-mode__label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SourceButton({ option, player, selected, onSelect }: { option: SourceOption; player: PlayerState; selected: boolean; onSelect: () => void }) {
  const commander = option.opponent.commanders[option.commander]
  const art = useArtImage(commander?.cardId ?? null)
  const value = player.commanderDamage[option.playerId]?.[option.commander] ?? 0
  return (
    <button
      type="button"
      className="score-source"
      data-accent={option.opponent.accent}
      aria-pressed={selected}
      aria-label={`${option.label}: ${value} danni`}
      onClick={onSelect}
    >
      {art ? <img className="score-source__art" src={art.url} alt="" /> : <span className="score-source__sigil" aria-hidden="true" />}
      <span className="score-source__name">{option.opponent.name}</span>
      {option.opponent.hasPartner && <span className="score-source__slot">{option.commander + 1}</span>}
      <span className="score-source__value">{value}</span>
    </button>
  )
}

interface SourceRowProps {
  player: PlayerState
  selection: ScoreSelection
}

/** Commander sources or Partner tax slots, on the panel itself. Null when there is nothing to choose. */
export function ScoreSourceRow({ player, selection }: SourceRowProps) {
  if (selection.mode === 'commander') {
    return (
      <>
        <div
          className="score-sources"
          role="group"
          aria-label={`Fonte dei danni Commander a ${player.name}`}
          aria-describedby={`${player.id}-commander-hint`}
        >
          {selection.sources.map((option) => (
            <SourceButton
              key={`${option.playerId}-${option.commander}`}
              option={option}
              player={player}
              selected={option === selection.source}
              onSelect={() => selection.setSource(option)}
            />
          ))}
        </div>
        {/* Rules reference (Phase 2a): visible in the standard panel, a description in compact. */}
        <p className="score-hint" id={`${player.id}-commander-hint`}>
          {COMMANDER_HINT}
        </p>
      </>
    )
  }
  if (selection.mode === 'tax' && player.hasPartner) {
    return (
      <div className="score-sources" role="group" aria-label={`Comandante della tassa di ${player.name}`}>
        {([0, 1] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            className="score-source"
            aria-pressed={selection.taxSlot === slot}
            aria-label={`${slotName(slot)}: più ${player.commanderTax[slot]} mana`}
            onClick={() => selection.setTaxSlot(slot)}
          >
            <span className="score-source__name">{player.commanders[slot]?.name ?? slotName(slot)}</span>
            <span className="score-source__value">
              +<ManaSymbol value={player.commanderTax[slot]} />
            </span>
          </button>
        ))}
      </div>
    )
  }
  return null
}

interface AdjustProps {
  player: PlayerState
  selection: ScoreSelection
  delta: PanelDelta | null
  dispatch: (action: GameAction) => void
  /** The existing life rail, shown unchanged in Vita mode. */
  lifeControls: React.ReactNode
}

interface Stepper {
  label: string
  down: { label: string; text: React.ReactNode; action: GameAction }
  up: { label: string; text: React.ReactNode; action: GameAction }
  output: { label: string; text: React.ReactNode }
  target: GroupTarget
  key: string
  /** Spoken once the burst settles (D-036), e.g. "Giocatore 1: veleno 3". */
  announce: string
}

function stepperFor(player: PlayerState, selection: ScoreSelection): Stepper | null {
  const { mode, source } = selection
  if (isCounter(mode)) {
    const label = COUNTER_LABELS[mode]
    const lower = label.toLowerCase()
    const action = (amount: number): GameAction => ({ type: 'adjust-counter', playerId: player.id, counter: mode, amount })
    return {
      label: `${label} di ${player.name}`,
      down: { label: `Riduci ${lower} di ${player.name}`, text: '−1', action: action(-1) },
      up: { label: `Aumenta ${lower} di ${player.name}`, text: '+1', action: action(1) },
      output: { label: `${label} di ${player.name}`, text: player[mode] },
      target: { kind: 'counter', playerId: player.id, counter: mode },
      key: mode,
      announce: `${player.name}: ${lower} ${player[mode]}`,
    }
  }
  if (mode === 'commander') {
    if (!source) return null
    const action = (amount: number): GameAction => ({
      type: 'adjust-commander-damage',
      playerId: player.id,
      sourcePlayerId: source.playerId,
      commander: source.commander,
      amount,
    })
    return {
      label: `Danni Commander da ${source.label}`,
      down: { label: `Riduci danni Commander da ${source.label} a ${player.name}`, text: '−1', action: action(-1) },
      up: { label: `Aumenta danni Commander da ${source.label} a ${player.name}`, text: '+1', action: action(1) },
      output: {
        label: `Danni Commander da ${source.label} a ${player.name}`,
        text: player.commanderDamage[source.playerId]?.[source.commander] ?? 0,
      },
      target: { kind: 'commander', playerId: player.id, sourcePlayerId: source.playerId, commander: source.commander },
      key: `commander-${source.playerId}-${source.commander}`,
      announce: `${player.name}: danni Commander da ${source.label}, ${player.commanderDamage[source.playerId]?.[source.commander] ?? 0}`,
    }
  }
  if (mode === 'tax') {
    const slot = selection.taxSlot
    const name = `tassa del ${slotName(slot)} di ${player.name}`
    const action = (amount: number): GameAction => ({ type: 'adjust-commander-tax', playerId: player.id, commander: slot, amount })
    const value = player.commanderTax[slot]
    return {
      label: `Tassa del ${slotName(slot)} di ${player.name}`,
      down: {
        label: `Riduci di ${COMMANDER_TAX_STEP} mana la ${name}`,
        text: <>−<ManaSymbol value={COMMANDER_TAX_STEP} /></>,
        action: action(-COMMANDER_TAX_STEP),
      },
      up: {
        label: `Aumenta di ${COMMANDER_TAX_STEP} mana la ${name}`,
        text: <>+<ManaSymbol value={COMMANDER_TAX_STEP} /></>,
        action: action(COMMANDER_TAX_STEP),
      },
      output: { label: `Tassa del ${slotName(slot)} di ${player.name}: più ${value} mana`, text: <>+<ManaSymbol value={value} /></> },
      target: { kind: 'commander-tax', playerId: player.id, commander: slot },
      key: `tax-${slot}`,
      announce: `${player.name}: tassa del ${slotName(slot)}, più ${value} mana`,
    }
  }
  return null
}

/** The in-place adjustment bar of the active mode: life rail in Vita, `[−] value [+]` otherwise. */
export function ScoreAdjust({ player, selection, delta, dispatch, lifeControls }: AdjustProps) {
  const stepper = selection.mode === 'life' ? null : stepperFor(player, selection)
  // One polite announcement per burst; the outputs themselves stay silent (D-036).
  const announcement = useSettledValue(stepper?.announce ?? '', GROUP_WINDOW_MS)
  const live = (
    <span className="sr-only score-announcement" aria-live="polite" aria-atomic="true">
      {announcement}
    </span>
  )
  if (selection.mode === 'life') {
    return (
      <>
        {lifeControls}
        {live}
      </>
    )
  }
  if (!stepper) return <p className="score-adjust score-adjust--empty">Nessun avversario</p>
  return (
    <div className="score-adjust" role="group" aria-label={stepper.label} data-mode={selection.mode}>
      {live}
      <button type="button" className="score-button score-button--primary" aria-label={stepper.down.label} onClick={() => dispatch(stepper.down.action)}>
        {stepper.down.text}
      </button>
      {/* Keyed twice: a new mode fades and settles 2px, a new source only fades (120 ms, D-033). */}
      <span className="score-adjust__value" key={selection.mode}>
        <span className="score-adjust__source" key={stepper.key}>
          <output aria-label={stepper.output.label} aria-live="off">
            {stepper.output.text}
          </output>
          {deltaFor(delta, stepper.target)}
        </span>
      </span>
      <button type="button" className="score-button score-button--primary" aria-label={stepper.up.label} onClick={() => dispatch(stepper.up.action)}>
        {stepper.up.text}
      </button>
    </div>
  )
}

interface DockProps extends StripProps, AdjustProps {
  opponents: PlayerState[]
}

/** Standard presentation: strip, sources, then the adjustment bar. */
export function QuickScoreDock(props: DockProps) {
  return (
    <div className="score-dock" data-mode={props.selection.mode}>
      <ScoreModeStrip {...props} />
      <ScoreSourceRow player={props.player} selection={props.selection} />
      <ScoreAdjust {...props} />
    </div>
  )
}
