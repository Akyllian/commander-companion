import { useState } from 'react'
import { CheckIcon } from '../../components/icons'
import { ModalSideSheet } from '../../components/ModalSideSheet'
import type { PlayerState } from '../../game/types'

interface LinkToPlayerProps {
  open: boolean
  deckName: string
  players: PlayerState[]
  /** Deck names by id, to say which deck each player has now. */
  deckNames: Map<string, string>
  onClose: () => void
  onLink: (playerId: string) => void
}

/** «Collega a un giocatore» (R3 §11.1): an upright sheet listing the current match's players 1→4. */
export function LinkToPlayer({ open, onClose, ...rest }: LinkToPlayerProps) {
  return (
    <ModalSideSheet open={open} title="Collega a un giocatore" onClose={onClose}>
      {/* Mounted only while open, so every opening starts with no player chosen. */}
      {open && <LinkChoices {...rest} />}
    </ModalSideSheet>
  )
}

function LinkChoices({ deckName, players, deckNames, onLink }: Omit<LinkToPlayerProps, 'open' | 'onClose'>) {
  const [chosen, setChosen] = useState<string | null>(null)
  return (
    <div className="link-player">
      <p className="deck-import__help">{deckName}</p>
      <div role="radiogroup" aria-label="Giocatore">
        {players.map((player) => {
          const checked = chosen === player.id
          const current = player.deck ? (deckNames.get(player.deck.deckId) ?? 'Mazzo non disponibile') : 'Nessun mazzo'
          return (
            <button
              key={player.id}
              type="button"
              role="radio"
              aria-checked={checked}
              className="link-player__row"
              onClick={() => setChosen(player.id)}
            >
              <span className="link-player__name">{player.name}</span>
              <span className="link-player__deck">
                {player.commanders[0]?.name ?? 'Comandante non scelto'} · {current}
              </span>
              {checked && (
                <span className="commander-source__state">
                  <CheckIcon /> Selezionato
                </span>
              )}
            </button>
          )
        })}
      </div>
      <button type="button" className="primary-button" disabled={!chosen} onClick={() => chosen && onLink(chosen)}>
        Collega mazzo
      </button>
    </div>
  )
}
