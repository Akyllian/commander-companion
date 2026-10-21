import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { GroupDelta } from '../game/history'
import type { CommanderIndex, GameAction, PlayerState } from '../game/types'
import { deltaFor } from './DeltaBadge'
import { CheckIcon, CloseIcon, CommanderDamageIcon } from './icons'
import { COMMANDER_HINT, damageSources } from './scoreVocabulary'

interface CommanderDamagePanelProps {
  id: string
  player: PlayerState
  opponents: PlayerState[]
  delta: GroupDelta | null
  dispatch: (action: GameAction) => void
  onClose: () => void
  /** Fading out after closing: no longer interactive or announced (R2 §10). */
  closing?: boolean
}

interface Choice {
  sourcePlayerId: string
  commander: CommanderIndex
}

const NEXT_KEYS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Commander damage received by one player, inside the card (R2 §6): pick the source (each Partner
 * commander on its own), then one horizontal stepper. Each step moves life in the same action.
 * The chosen source is presentation state; a source that disappears falls back to the first.
 */
export function CommanderDamagePanel({ id, player, opponents, delta, dispatch, onClose, closing = false }: CommanderDamagePanelProps) {
  const [choice, setChoice] = useState<Choice | null>(null)
  const sources = damageSources(opponents)
  const selectedIndex = Math.max(
    0,
    sources.findIndex((source) => source.sourcePlayerId === choice?.sourcePlayerId && source.commander === choice.commander),
  )
  const selected = sources[selectedIndex] ?? null
  const radios = useRef<Array<HTMLButtonElement | null>>([])
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = `${id}-title`

  // Opening focuses the chosen source, or the close control when there is none (R2 §11).
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => (rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? closeRef.current)?.focus(), [])

  const choose = (index: number) => {
    const source = sources[index]
    setChoice({ sourcePlayerId: source.sourcePlayerId, commander: source.commander })
    radios.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = sources.length - 1
    const target =
      event.key in NEXT_KEYS ? (index + NEXT_KEYS[event.key] + sources.length) % sources.length : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (target === null) return
    event.preventDefault()
    choose(target)
  }

  const value = selected ? (player.commanderDamage[selected.sourcePlayerId]?.[selected.commander] ?? 0) : 0
  const from = selected ? `da ${selected.spoken} ` : ''
  const adjust = (amount: number) => {
    if (!selected) return
    dispatch({
      type: 'adjust-commander-damage',
      playerId: player.id,
      sourcePlayerId: selected.sourcePlayerId,
      commander: selected.commander,
      amount,
    })
  }

  return (
    <div
      ref={rootRef}
      className="commander-panel card-surface"
      id={id}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={`${id}-hint`}
      data-drawer="commander"
      data-closing={closing || undefined}
      aria-hidden={closing || undefined}
      inert={closing || undefined}
    >
      <p className="sr-only" id={`${id}-hint`}>
        {COMMANDER_HINT}
      </p>
      <div className="card-surface__header">
        <p className="card-surface__title" id={titleId}>
          Danni Commander
        </p>
        <button ref={closeRef} type="button" className="icon-button card-surface__close" aria-label="Chiudi danni Commander" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      {selected ? (
        <div className="commander-panel__sources" role="radiogroup" aria-label="Sorgente dei danni Commander">
          {sources.map((source, index) => {
            const checked = index === selectedIndex
            return (
              <button
                key={`${source.sourcePlayerId}:${source.commander}`}
                ref={(element) => {
                  radios.current[index] = element
                }}
                type="button"
                role="radio"
                className="commander-source"
                aria-checked={checked}
                aria-label={source.label}
                tabIndex={checked ? 0 : -1}
                onClick={() => choose(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {checked && <CheckIcon />}
                {source.label}
                {checked && <span className="commander-source__state">Selezionato</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="commander-panel__empty">Nessun avversario disponibile</p>
      )}
      <div className="commander-panel__stepper">
        <button
          type="button"
          className="counter-column__step"
          aria-label={`Togli 1 danno Commander ${from}a ${player.name}`}
          disabled={!selected || value === 0}
          onClick={() => adjust(-1)}
        >
          −
        </button>
        <span className="commander-panel__value">
          <CommanderDamageIcon />
          <strong data-testid="commander-value">{value}</strong>
          {selected && deltaFor(delta, { kind: 'commander', playerId: player.id, sourcePlayerId: selected.sourcePlayerId, commander: selected.commander })}
        </span>
        <button
          type="button"
          className="counter-column__step"
          aria-label={`Aggiungi 1 danno Commander ${from}a ${player.name}`}
          disabled={!selected}
          onClick={() => adjust(1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
