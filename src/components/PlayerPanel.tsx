import { useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import { getDefeatReasons } from '../game/game'
import type { GroupDelta } from '../game/history'
import type { GameAction, PlayerState } from '../game/types'
import type { RandomArt } from '../match/presentation'
import { useArtImage, useArtState } from '../media/useCommanderArt'
import { CommanderDamagePanel } from './CommanderDamagePanel'
import { CountersDrawer } from './CountersDrawer'
import { deltaFor } from './DeltaBadge'
import { CommanderDamageIcon, CountersIcon, CrownIcon, DetailsIcon } from './icons'
import { ModalSideSheet } from './ModalSideSheet'
import { CommanderLine, DeckConfigSection, DefeatReasons, RemoveIcon } from './PlayerSections'
import { useScoreAnnouncement } from './useScoreAnnouncement'

export type { PanelDelta } from './DeltaBadge'

export type CardSurface = 'counters' | 'commander'

/**
 * Below this usable height the inner panels use the compact full-card mode (R2 §5.3, D-039). The
 * spec names 132px, but the standard drawer needs its 44px title row above 44 + value + 44px
 * columns, so it only fits from about 190px: the compact mode (columns of exactly 123px) takes
 * over everywhere the standard one would clip its controls.
 */
export const SHORT_CARD_HEIGHT = 200

/** True while the card is shorter than {@link SHORT_CARD_HEIGHT}, measured in its own (unrotated) frame. */
function useShortCard(ref: React.RefObject<HTMLElement | null>): boolean {
  const [short, setShort] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setShort(element.clientHeight > 0 && element.clientHeight < SHORT_CARD_HEIGHT)
    // Measured at once, then on every resize: the first frame already has the right mode.
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return short
}

interface PlayerPanelProps {
  player: PlayerState
  opponents: PlayerState[]
  playerCount: number
  canRemovePartner: boolean
  /** The open tap group, when it concerns this player. */
  delta: GroupDelta | null
  /** Compact density: same anatomy, tighter rhythm; the artist credit moves to Dettagli. */
  compact?: boolean
  monarchPlayerId: string | null
  initiativePlayerId: string | null
  /** This seat's random illustration, shown only without a commander (D-039). */
  randomArt: RandomArt | null
  /** The inner panel open on this card, if the app's single transient surface is one of its own. */
  openSurface: CardSurface | null
  onOpenSurface: (surface: CardSurface) => void
  onCloseSurface: () => void
  dispatch: (action: GameAction) => void
}

/**
 * The player card (R2 §3): Monarch crown, name and commander, life ±1, and three entries —
 * Dettagli, Contatori and Danni Commander. Contatori and Danni Commander open inside the card,
 * so they rotate with its seat; only Dettagli leaves it, as an upright side sheet.
 */
export function PlayerPanel({
  player,
  opponents,
  playerCount,
  canRemovePartner,
  delta,
  compact = false,
  monarchPlayerId,
  initiativePlayerId,
  randomArt,
  openSurface,
  onOpenSurface,
  onCloseSurface,
  dispatch,
}: PlayerPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const short = useShortCard(cardRef)
  // One-shot light bloom on the life total when it changes (never on first render, D-024).
  const [lastLife, setLastLife] = useState(player.life)
  const [bloom, setBloom] = useState(0)
  if (lastLife !== player.life) {
    setLastLife(player.life)
    setBloom((count) => count + 1)
  }
  const [main, partner] = player.commanders
  const art = useArtImage(main?.cardId ?? null)
  const partnerArt = useArtImage(player.hasPartner ? (partner?.cardId ?? null) : null)
  // The random art is only asked for while the seat has no commander (R2 §4.2).
  const random = useArtState(main ? null : (randomArt?.cardId ?? null))
  const defeatReasons = getDefeatReasons(player)
  const out = defeatReasons.length > 0
  const spoken = useScoreAnnouncement(player, opponents, delta)
  const monarch = monarchPlayerId === player.id
  const countersId = `${player.id}-counters`
  const commanderId = `${player.id}-commander`

  const lifeButton = (amount: 1 | -1) => (
    <button
      className="score-button score-button--primary"
      type="button"
      aria-label={`${amount > 0 ? 'Aumenta' : 'Riduci'} di 1 la vita di ${player.name}`}
      onClick={() => dispatch({ type: 'adjust-life', playerId: player.id, amount })}
    >
      {amount > 0 ? '+' : '−'}
    </button>
  )

  // Commander damage also moves life: the same burst shows, mirrored, on life (D-036).
  const lifeDelta =
    delta?.target.kind === 'commander' && delta.lifeDelta !== undefined
      ? {
          key: `${delta.key}:life`,
          target: { kind: 'life', playerId: player.id } as const,
          delta: delta.lifeDelta,
          at: delta.at,
        }
      : delta

  // Commander art first; otherwise this seat's random art; otherwise the neutral texture.
  const split = Boolean(art && partnerArt)
  const shown = art ?? (main ? null : random.image)
  const artKind = art ? 'commander' : shown ? 'random' : 'neutral'
  const veil = {
    name: Math.max(shown?.veil.name ?? 0, split ? (partnerArt?.veil.name ?? 0) : 0),
    life: Math.max(shown?.veil.life ?? 0, split ? (partnerArt?.veil.life ?? 0) : 0),
  }
  const veilStyle = {
    '--art-veil-name': veil.name,
    '--art-veil-life': veil.life,
  } as React.CSSProperties
  // Decorative: names and credits are text elsewhere. Partners split 50/50 on a diagonal (D-027).
  const artLayer = (
    <div className="player-art" aria-hidden="true" data-split={split || undefined}>
      {split ? (
        <>
          <span className="player-art__half player-art__half--1">
            <img src={art?.url} alt="" decoding="async" />
          </span>
          <span className="player-art__half player-art__half--2">
            <img src={partnerArt?.url} alt="" decoding="async" />
          </span>
        </>
      ) : (
        shown && <img key={shown.url} src={shown.url} alt="" decoding="async" />
      )}
    </div>
  )

  const commanderNames = player.commanders.flatMap((slot) => (slot ? [slot.name] : []))
  const randomCredit = !main && shown && randomArt ? randomArt.artist : null

  const open = (surface: CardSurface) => (openSurface === surface ? onCloseSurface() : onOpenSurface(surface))

  return (
    <section
      ref={cardRef}
      className="player-panel"
      data-accent={player.accent}
      data-player-id={player.id}
      data-compact={compact || undefined}
      data-short={short || undefined}
      data-out={out || undefined}
      data-art={artKind}
      data-has-art={artKind === 'neutral' ? undefined : ''}
      data-surface={openSurface ?? undefined}
      aria-label={`Segnapunti di ${player.name}`}
      style={veilStyle}
    >
      {artLayer}

      <header className="player-panel__header">
        <button
          type="button"
          className="icon-button monarch-button"
          aria-label={monarch ? 'Rilascia Monarca' : 'Prendi Monarca'}
          aria-pressed={monarch}
          onClick={() =>
            dispatch({
              type: 'set-table-role',
              role: 'monarch',
              playerId: monarch ? null : player.id,
            })
          }
        >
          <CrownIcon />
        </button>
        <div className="player-panel__identity">
          {/* data-text sizes the radial contrast mask to the visible name (D-029). */}
          <span className="name-field" data-text={player.name}>
            <span className="player-name">{player.name}</span>
          </span>
          <p className="player-commander">{commanderNames.length > 0 ? commanderNames.join(' + ') : 'Comandante non scelto'}</p>
          {out && <p className="out-line">Fuori dalla partita</p>}
        </div>
        <button
          type="button"
          className="icon-button details-button"
          aria-label={`Apri dettagli di ${player.name}`}
          title={`Dettagli di ${player.name}`}
          onClick={() => setDetailsOpen(true)}
        >
          <DetailsIcon />
        </button>
      </header>

      <div className="life-zone" role="group" aria-label={`Punti vita di ${player.name}`}>
        {lifeButton(-1)}
        <span className="life-value">
          <strong key={bloom} className="life-total" data-testid="life-total" data-bloom={bloom > 0 || undefined}>
            {player.life}
          </strong>
          {deltaFor(lifeDelta, { kind: 'life', playerId: player.id })}
        </span>
        {lifeButton(1)}
      </div>
      {/* The card's only live region: one announcement per settled burst (D-036). */}
      <span className="sr-only score-announcement" aria-live="polite" aria-atomic="true">
        {spoken}
      </span>

      <div className="player-panel__footer">
        <button
          type="button"
          className="counters-trigger"
          data-surface-trigger="counters"
          aria-expanded={openSurface === 'counters'}
          aria-controls={countersId}
          aria-label={compact ? 'Contatori' : undefined}
          onClick={() => open('counters')}
        >
          <CountersIcon />
          <span className="counters-trigger__label">Contatori</span>
        </button>
        {!compact && randomCredit && <p className="art-credit">Illustrazione di {randomCredit}</p>}
        <button
          type="button"
          className="commander-trigger"
          data-surface-trigger="commander"
          aria-expanded={openSurface === 'commander'}
          aria-controls={commanderId}
          aria-label={`Danni Commander di ${player.name}`}
          onClick={() => open('commander')}
        >
          <CommanderDamageIcon />
        </button>
      </div>

      {openSurface === 'counters' && (
        <CountersDrawer
          id={countersId}
          player={player}
          delta={delta}
          monarchPlayerId={monarchPlayerId}
          initiativePlayerId={initiativePlayerId}
          dispatch={dispatch}
          onClose={onCloseSurface}
        />
      )}
      {openSurface === 'commander' && (
        <CommanderDamagePanel
          id={commanderId}
          player={player}
          opponents={opponents}
          delta={delta}
          dispatch={dispatch}
          onClose={onCloseSurface}
        />
      )}

      <ModalSideSheet
        open={detailsOpen}
        title={`Dettagli di ${player.name}`}
        className="player-details-sheet"
        onClose={() => setDetailsOpen(false)}
      >
        {/* Mounted only while open, so the card's text is never duplicated in a closed sheet. */}
        {detailsOpen && (
          <>
            <label className="details-field">
              <span>Nome giocatore</span>
              <input
                key={player.name}
                className="details-name"
                defaultValue={player.name}
                maxLength={28}
                enterKeyHint="done"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') {
                    // Restore, and keep the sheet open: Escape here only undoes the typing.
                    event.preventDefault()
                    event.stopPropagation()
                    event.currentTarget.value = player.name
                  }
                }}
                onBlur={(event) =>
                  dispatch({
                    type: 'rename-player',
                    playerId: player.id,
                    name: event.currentTarget.value,
                  })
                }
              />
            </label>
            <DefeatReasons reasons={defeatReasons} />
            <CommanderLine player={player} />
            {player.hasPartner && <span className="partner-badge">Partner</span>}
            {!main &&
              (randomArt && !random.missing ? (
                <div className="random-art-credit">
                  <p className="random-art-credit__title">Arte casuale</p>
                  <p className="random-art-credit__name">{randomArt.name}</p>
                  <p className="commander-credit">Illustrazione di {randomArt.artist}</p>
                </div>
              ) : (
                <p className="random-art-credit">Illustrazione non disponibile offline</p>
              ))}
            <DeckConfigSection player={player} dispatch={dispatch} canRemovePartner={canRemovePartner} />
            {playerCount > 2 && (
              <div className="sheet-danger-zone">
                <button
                  type="button"
                  className="quiet-button remove-player-action"
                  onClick={() => {
                    setDetailsOpen(false)
                    dispatch({ type: 'remove-player', playerId: player.id })
                  }}
                >
                  <RemoveIcon /> Rimuovi giocatore
                </button>
              </div>
            )}
          </>
        )}
      </ModalSideSheet>
    </section>
  )
}
