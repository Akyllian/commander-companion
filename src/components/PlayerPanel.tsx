import { useState } from 'react'
import type React from 'react'
import { getDefeatReasons } from '../game/game'
import type { GroupDelta } from '../game/history'
import type { GameAction, PlayerState } from '../game/types'
import { deltaFor } from './DeltaBadge'
import { ModalSideSheet } from './ModalSideSheet'
import { useArtImage } from '../media/useCommanderArt'
import { CommanderLine, DeckConfigSection, DefeatBadge, RemoveIcon } from './PlayerSections'
import { QuickScoreDock, ScoreAdjust, ScoreModeStrip, ScoreSourceRow, useScoreSelection } from './QuickScoreDock'
import { useScoreAnnouncement } from './useScoreAnnouncement'

export type { PanelDelta } from './DeltaBadge'

interface PlayerPanelProps {
  player: PlayerState
  opponents: PlayerState[]
  playerCount: number
  canRemovePartner: boolean
  /** The open tap group, when it concerns this player. */
  delta: GroupDelta | null
  /** Compact landscape: score rail on the panel, everything else in the details sheet. */
  compact?: boolean
  monarchPlayerId: string | null
  initiativePlayerId: string | null
  dispatch: (action: GameAction) => void
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="button-icon">
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="12" cy="12" r="1.25" />
      <circle cx="19" cy="12" r="1.25" />
    </svg>
  )
}

const LIFE_STEPS = [-5, -1, 1, 5] as const

export function PlayerPanel({
  player,
  opponents,
  playerCount,
  canRemovePartner,
  delta,
  compact = false,
  monarchPlayerId,
  initiativePlayerId,
  dispatch,
}: PlayerPanelProps) {
  // Lives above both presentations, so switching layout keeps the chosen mode and sources.
  const selection = useScoreSelection(player, opponents)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // One-shot light bloom on the life total when it changes (never on first render, D-024).
  const [lastLife, setLastLife] = useState(player.life)
  const [bloom, setBloom] = useState(0)
  if (lastLife !== player.life) {
    setLastLife(player.life)
    setBloom((count) => count + 1)
  }
  const art = useArtImage(player.commanders[0]?.cardId ?? null)
  const partnerArt = useArtImage(player.hasPartner ? (player.commanders[1]?.cardId ?? null) : null)
  const defeatReasons = getDefeatReasons(player)
  const defeated = defeatReasons.length > 0
  const spoken = useScoreAnnouncement(player, opponents, delta)
  const canRemove = playerCount > 2
  const remove = () => dispatch({ type: 'remove-player', playerId: player.id })

  const nameInput = (
    <>
      <label className="sr-only" htmlFor={`${player.id}-name`}>
        Nome giocatore
      </label>
      {/* data-text sizes the radial contrast mask to the visible name (D-029). */}
      <span className="name-field" data-text={player.name}>
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
          onBlur={(event) => dispatch({ type: 'rename-player', playerId: player.id, name: event.currentTarget.value })}
        />
      </span>
    </>
  )

  const lifeButton = (amount: number) => (
    <button
      className={Math.abs(amount) === 1 ? 'score-button score-button--primary' : 'score-button'}
      type="button"
      key={amount}
      aria-label={`${amount > 0 ? 'Aumenta' : 'Riduci'} di ${Math.abs(amount)} la vita di ${player.name}`}
      onClick={() => dispatch({ type: 'adjust-life', playerId: player.id, amount })}
    >
      {amount > 0 ? `+${amount}` : amount}
    </button>
  )

  // Commander damage also moves life: the same burst shows, mirrored, on life (D-036).
  const lifeDelta =
    delta?.target.kind === 'commander' && delta.lifeDelta !== undefined
      ? { key: `${delta.key}:life`, target: { kind: 'life', playerId: player.id } as const, delta: delta.lifeDelta, at: delta.at }
      : delta
  const lifeValue = (
    <span className="life-value">
      <strong key={bloom} className="life-total" data-testid="life-total" data-bloom={bloom > 0 || undefined}>
        {player.life}
      </strong>
      {deltaFor(lifeDelta, { kind: 'life', playerId: player.id })}
    </span>
  )

  // The panel's only live region: one announcement per settled burst (D-036).
  const announcement = (
    <span className="sr-only score-announcement" aria-live="polite" aria-atomic="true">
      {spoken}
    </span>
  )

  const dockProps = { player, opponents, selection, delta, monarchPlayerId, initiativePlayerId, dispatch }
  const deckSection = <DeckConfigSection player={player} dispatch={dispatch} canRemovePartner={canRemovePartner} />

  const sectionProps = {
    className: 'player-panel',
    'data-accent': player.accent,
    'data-defeated': defeated || undefined,
    'data-has-art': art ? '' : undefined,
    'aria-label': `Segnapunti di ${player.name}`,
  }

  // Commander art behind the C2.1 veil (decorative: names and credits are text elsewhere).
  // Partners with two arts split 50/50 on a slight diagonal (D-027); otherwise full-bleed.
  const split = Boolean(art && partnerArt)
  const veil = {
    name: Math.max(art?.veil.name ?? 0, split ? (partnerArt?.veil.name ?? 0) : 0),
    life: Math.max(art?.veil.life ?? 0, split ? (partnerArt?.veil.life ?? 0) : 0),
  }
  const veilStyle = { '--art-veil-name': veil.name, '--art-veil-life': veil.life } as React.CSSProperties
  const artLayer = art && (
    <div className="player-art" aria-hidden="true" data-split={split || undefined}>
      {split ? (
        <>
          <span className="player-art__half player-art__half--1">
            <img src={art.url} alt="" decoding="async" />
          </span>
          <span className="player-art__half player-art__half--2">
            <img src={partnerArt?.url} alt="" decoding="async" />
          </span>
        </>
      ) : (
        <img src={art.url} alt="" decoding="async" />
      )}
    </div>
  )

  if (compact) {
    return (
      <section {...sectionProps} style={veilStyle} data-compact="">
        {artLayer}
        <header className="player-panel__header">
          {nameInput}
          <DefeatBadge reasons={defeatReasons} variant="compact" />
          <ScoreModeStrip {...dockProps} />
          <button
            type="button"
            className="icon-button details-button"
            aria-label={`Dettagli di ${player.name}`}
            title={`Dettagli di ${player.name}`}
            onClick={() => setDetailsOpen(true)}
          >
            <DetailsIcon />
          </button>
        </header>

        <ScoreSourceRow player={player} selection={selection} />
        {selection.mode === 'life' ? (
          <div className="score-rail" role="group" aria-label={`Punti vita di ${player.name}`}>
            {lifeButton(-5)}
            {lifeButton(-1)}
            {lifeValue}
            {lifeButton(1)}
            {lifeButton(5)}
          </div>
        ) : (
          // Other modes take the controls; life stays on the rail, still the largest value.
          <div className="score-rail score-rail--mode">
            <ScoreAdjust {...dockProps} lifeControls={null} />
            {lifeValue}
          </div>
        )}
        {announcement}

        <ModalSideSheet
          open={detailsOpen}
          title={`Dettagli di ${player.name}`}
          className="player-details-sheet"
          onClose={() => setDetailsOpen(false)}
        >
          {defeated && (
            <p className="defeat-line">
              <DefeatBadge reasons={defeatReasons} />
            </p>
          )}
          <CommanderLine player={player} />
          {player.hasPartner && <span className="partner-badge">Partner</span>}
          {deckSection}
          {canRemove && (
            <div className="sheet-danger-zone">
              <button
                type="button"
                className="quiet-button remove-player-action"
                onClick={() => {
                  // Close first; the Undo bar then takes focus in the removed cell.
                  setDetailsOpen(false)
                  remove()
                }}
              >
                <RemoveIcon /> Rimuovi giocatore
              </button>
            </div>
          )}
        </ModalSideSheet>
      </section>
    )
  }

  return (
    <section {...sectionProps} style={veilStyle}>
      {artLayer}
      <div className="player-panel__sigil" aria-hidden="true">
        <span />
      </div>

      <header className="player-panel__header">
        {nameInput}
        {player.hasPartner && <span className="partner-badge">Partner</span>}
        {canRemove && (
          <button
            className="icon-button remove-button"
            type="button"
            aria-label={`Rimuovi ${player.name}`}
            title={`Rimuovi ${player.name}`}
            onClick={remove}
          >
            <RemoveIcon />
          </button>
        )}
      </header>

      <CommanderLine player={player} />

      {defeated && (
        <p className="defeat-line">
          <DefeatBadge reasons={defeatReasons} />
        </p>
      )}

      <div className="life-zone">
        <span className="life-label">Punti vita</span>
        {lifeValue}
        {announcement}
      </div>

      <QuickScoreDock
        {...dockProps}
        lifeControls={
          <div className="life-controls" role="group" aria-label={`Controlli vita di ${player.name}`}>
            {LIFE_STEPS.map(lifeButton)}
          </div>
        }
      />

      {deckSection}
    </section>
  )
}
