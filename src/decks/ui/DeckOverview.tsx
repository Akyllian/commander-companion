import { useState } from 'react'
import type { CardData } from '../../media/scryfall'
import { categoryCounts, CATEGORY_LABELS } from '../categories'
import type { DeckRecord } from '../model'
import { totalCards } from '../model'
import { OFFLINE_LABELS } from '../summary'

interface DeckOverviewProps {
  deck: DeckRecord
  cards: Map<string, CardData>
  /** «Collegato a [nome]» when a player in the current match uses this deck. */
  linkedTo: string | null
  onLink: () => void
  onStrategy: () => void
}

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Panoramica (R3 §7): totals and state, the player link, descriptive categories with their cards,
 * and the first lines of the owner's notes. Counts are text; the thin bars only help scanning.
 */
export function DeckOverview({ deck, cards, linkedTo, onLink, onStrategy }: DeckOverviewProps) {
  const [open, setOpen] = useState<string | null>(null)
  const counts = categoryCounts(deck, cards)
  const max = Math.max(1, ...counts.map((entry) => entry.count))
  const noteLines = deck.notes.split('\n').filter((line) => line.trim()).slice(0, 4)

  return (
    <div className="deck-overview">
      <p className="deck-overview__facts">
        {totalCards(deck)} carte · {OFFLINE_LABELS[deck.offline]} · Aggiornato {dateFormat.format(deck.updatedAt)}
      </p>
      <div className="deck-overview__link">
        {linkedTo ? (
          <>
            <p>Collegato a {linkedTo}</p>
            <button type="button" className="quiet-button" onClick={onLink}>
              Cambia giocatore
            </button>
          </>
        ) : (
          <button type="button" className="primary-button" onClick={onLink}>
            Collega a un giocatore
          </button>
        )}
      </div>

      <section className="deck-categories" aria-labelledby={`${deck.id}-categories`}>
        <h2 id={`${deck.id}-categories`}>Categorie riconosciute</h2>
        <p className="deck-categories__note">Calcolate dalle carte riconosciute. Una carta può comparire in più categorie.</p>
        <ul>
          {counts.map(({ category, count, cardIds }) => {
            const expanded = open === category
            const panelId = `${deck.id}-category-${category}`
            return (
              <li key={category} className="deck-category" data-category={category}>
                <button
                  type="button"
                  className="deck-category__row"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : category)}
                >
                  <span className="deck-category__name">{CATEGORY_LABELS[category]}</span>
                  <span className="deck-category__bar" aria-hidden="true">
                    <span style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                  <span className="deck-category__count">{count}</span>
                </button>
                {expanded && (
                  <ul id={panelId} className="deck-category__cards">
                    {cardIds.map((cardId) => (
                      <li key={cardId}>{cards.get(cardId)?.name}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="deck-plan" aria-labelledby={`${deck.id}-plan`}>
        <h2 id={`${deck.id}-plan`}>Piano di gioco</h2>
        {noteLines.length > 0 ? (
          <>
            {noteLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            <button type="button" className="quiet-button" onClick={onStrategy}>
              Leggi e modifica
            </button>
          </>
        ) : (
          <>
            <p className="deck-plan__empty">Nessuna nota di strategia</p>
            <button type="button" className="quiet-button" onClick={onStrategy}>
              Aggiungi note
            </button>
          </>
        )}
      </section>
    </div>
  )
}
