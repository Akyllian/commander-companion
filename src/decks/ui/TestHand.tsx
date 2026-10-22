import { useState } from 'react'
import { CheckIcon } from '../../components/icons'
import { ModalSideSheet } from '../../components/ModalSideSheet'
import type { CardData } from '../../media/scryfall'
import { categorize, CATEGORY_LABELS } from '../categories'
import { confirmBottom, HAND_SIZE, keep, MAX_MULLIGANS, mulligan, newTry, startHand, toggleBottom } from '../hand'
import type { HandState } from '../hand'
import { drawablePool } from '../model'
import type { DeckRecord } from '../model'
import { CardCrop } from './CardCrop'

interface TestHandProps {
  deck: DeckRecord
  cards: Map<string, CardData>
  rng?: () => number
}

/**
 * Mano di prova (R3 §10): seven illustrated crops, never card reproductions, with the London
 * mulligan. It never judges the hand and keeps no history. Each crop opens its details, where the
 * artist is credited.
 */
export function TestHand({ deck, cards, rng = Math.random }: TestHandProps) {
  const pool = drawablePool(deck)
  const [state, setState] = useState<HandState>(() => startHand(pool, rng))
  const [deal, setDeal] = useState(0)
  const [details, setDetails] = useState<string | null>(null)

  if (state.phase === 'unavailable') {
    return (
      <div className="test-hand">
        <h2>Mano iniziale</h2>
        <p className="deck-plan__empty">Servono almeno {HAND_SIZE} carte pescabili per una mano di prova.</p>
      </div>
    )
  }

  const choosing = state.phase === 'bottom'
  const limit = state.phase === 'dealt' && state.mulligans >= MAX_MULLIGANS
  const shown = details ? cards.get(details) : undefined

  return (
    <div className="test-hand">
      <h2>
        Mano iniziale · {state.hand.length} carte{state.mulligans > 0 ? ` · Mulligan ${state.mulligans}` : ''}
      </h2>
      <p className="deck-import__help">Simulazione locale: nessuna carta intera viene mostrata.</p>
      <ol className="test-hand__cards" key={deal}>
        {state.hand.map((cardId, index) => {
          const card = cards.get(cardId)
          const order = choosing ? state.chosen.indexOf(index) : -1
          const label = `Carta ${index + 1} di ${state.hand.length}, ${card?.name ?? 'carta sconosciuta'}`
          return (
            <li key={`${cardId}-${index}`} className="test-hand__item" style={{ '--deal-index': index } as React.CSSProperties}>
              <button
                type="button"
                className="hand-card"
                aria-label={choosing ? `${label}${order >= 0 ? `, in fondo per ${order + 1}ª` : ''}` : `Dettagli di ${card?.name}`}
                aria-pressed={choosing ? order >= 0 : undefined}
                data-selected={order >= 0 || undefined}
                onClick={() => (choosing ? setState(toggleBottom(state, index)) : setDetails(cardId))}
              >
                <CardCrop cardIds={[cardId]} className="hand-card__art" />
                <span className="hand-card__name" aria-hidden="true">
                  {card?.name}
                </span>
                {order >= 0 && (
                  <span className="hand-card__order" aria-hidden="true">
                    <CheckIcon /> {order + 1}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      {state.phase === 'dealt' && (
        <div className="test-hand__actions">
          {limit && <p className="deck-line__hint">Limite raggiunto: puoi tenere una mano da zero carte</p>}
          <button type="button" className="primary-button" onClick={() => setState(keep(state))}>
            Tieni
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={limit}
            onClick={() => {
              setState(mulligan(state, rng))
              setDeal(deal + 1)
            }}
          >
            Mulligan
          </button>
        </div>
      )}
      {state.phase === 'bottom' && (
        <div className="test-hand__actions">
          <p>
            Scegli {state.mulligans} carte da mettere in fondo · {state.chosen.length} selezionate
          </p>
          <button type="button" className="quiet-button" onClick={() => setState({ ...state, chosen: [] })}>
            Annulla selezione
          </button>
          <button type="button" className="primary-button" disabled={state.chosen.length !== state.mulligans} onClick={() => setState(confirmBottom(state))}>
            Metti {state.mulligans} in fondo
          </button>
        </div>
      )}
      {state.phase === 'kept' && (
        <div className="test-hand__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setState(newTry(pool, rng))
              setDeal(deal + 1)
            }}
          >
            Nuova prova
          </button>
        </div>
      )}

      <ModalSideSheet open={shown !== undefined} title={`Dettagli di ${shown?.name ?? ''}`} onClose={() => setDetails(null)}>
        {shown && (
          <div className="hand-details">
            <CardCrop cardIds={[shown.cardId]} className="hand-details__art" />
            <p>{shown.typeLine}</p>
            <p>Illustrazione di {shown.artist}</p>
            <p>{categorize(shown).map((category) => CATEGORY_LABELS[category]).join(' · ')}</p>
          </div>
        )}
      </ModalSideSheet>
    </div>
  )
}
