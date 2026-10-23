import { useState } from 'react'
import type { GameAction, PlayerState } from '../../game/types'
import { deckLinkSource } from '../linkSource'
import { commanderLine, ownerLabel } from '../summary'
import { CardCrop } from './CardCrop'
import { useDecksContext } from './DecksContext'

/**
 * «Mazzo collegato» in a player's Dettagli (R3 §11.2): choose a saved deck, see when the match
 * overrides it, re-apply it, or unlink it with an explicit choice about the commander.
 */
export function DeckPicker({ player, dispatch }: { player: PlayerState; dispatch: (action: GameAction) => void }) {
  const { decks, cards } = useDecksContext()
  const [choosing, setChoosing] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  if (!decks || !cards) return null

  const linked = player.deck ? decks.find((deck) => deck.id === player.deck?.deckId) : undefined
  const link = (deckId: string) => {
    const deck = decks.find((entry) => entry.id === deckId)
    const source = deck && deckLinkSource(deck, cards)
    if (!source) return
    dispatch({ type: 'link-deck', playerId: player.id, deckId, ...source })
    setChoosing(false)
  }

  return (
    <div className="deck-picker">
      <p className="deck-picker__title">Mazzo collegato</p>
      {player.deck ? (
        linked ? (
          <p className="deck-picker__current">{linked.name}</p>
        ) : (
          <p className="deck-picker__current">Mazzo non disponibile: scegline un altro</p>
        )
      ) : (
        <p className="deck-picker__current">Nessun mazzo</p>
      )}
      {player.deck?.overridden && linked && (
        <>
          <p className="deck-line__hint">Comandante modificato per questa partita</p>
          <button type="button" className="quiet-button" onClick={() => link(linked.id)}>
            Riapplica dal mazzo
          </button>
        </>
      )}
      <button type="button" className="quiet-button" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
        {player.deck ? 'Cambia mazzo' : 'Scegli un mazzo'}
      </button>
      {player.deck && (
        <button type="button" className="quiet-button" onClick={() => setUnlinking(true)}>
          Scollega
        </button>
      )}
      {unlinking && (
        <div className="deck-picker__unlink" role="group" aria-label="Scollega il mazzo">
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              dispatch({ type: 'unlink-deck', playerId: player.id, keepCommander: true })
              setUnlinking(false)
            }}
          >
            Mantieni comandante
          </button>
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              dispatch({ type: 'unlink-deck', playerId: player.id, keepCommander: false })
              setUnlinking(false)
            }}
          >
            Rimuovi comandante
          </button>
        </div>
      )}
      {choosing &&
        (decks.length === 0 ? (
          <p className="deck-line__hint">Nessun mazzo salvato: importane uno da Mazzi.</p>
        ) : (
          <ul className="deck-picker__list">
            {decks.map((deck) => (
              <li key={deck.id}>
                <button type="button" className="deck-picker__row" onClick={() => link(deck.id)}>
                  <CardCrop cardIds={deck.commanders} className="deck-picker__art" />
                  <span className="deck-picker__name">{deck.name}</span>
                  <span className="deck-picker__meta">
                    {commanderLine(deck, cards)} · {ownerLabel(deck)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
