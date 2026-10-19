import { useId, useState } from 'react'
import type { GameAction, PlayerState } from '../game/types'
import { useCommanderSearch } from '../media/useCommanderArt'

interface CommanderPickerProps {
  player: PlayerState
  dispatch: (action: GameAction) => void
}

/**
 * Choose the player's commander from Scryfall (Phase 2c, D-026). Functional placeholder:
 * placement and visuals await the design owner; behaviour and accessibility are final.
 * The art is downloaded once and cached, so the panel keeps it offline.
 */
export function CommanderPicker({ player, dispatch }: CommanderPickerProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const { state, search, select } = useCommanderSearch((commander) =>
    dispatch({ type: 'set-commander', playerId: player.id, commander }),
  )
  const busy = state.status === 'searching' || state.status === 'saving'

  const status =
    state.status === 'searching'
      ? 'Ricerca su Scryfall…'
      : state.status === 'saving'
        ? `Scarico l’illustrazione di ${state.candidate.name}…`
        : state.status === 'error'
          ? state.message
          : state.status === 'results'
            ? state.candidates.length === 0
              ? 'Nessun comandante trovato.'
              : `${state.candidates.length} ${state.candidates.length === 1 ? 'risultato' : 'risultati'}`
            : ''

  return (
    <div className="commander-picker">
      {player.commander && (
        <div className="commander-current">
          <p>
            Comandante: <strong>{player.commander.name}</strong>
            <span className="commander-credit">Illustrazione di {player.commander.artist}</span>
          </p>
          <button
            type="button"
            className="quiet-button"
            onClick={() => dispatch({ type: 'set-commander', playerId: player.id, commander: null })}
          >
            Rimuovi comandante
          </button>
        </div>
      )}

      <form
        className="commander-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          void search(query)
        }}
      >
        <label htmlFor={`${id}-query`}>{player.commander ? 'Cambia comandante' : 'Cerca il comandante'}</label>
        <div className="commander-search__row">
          <input
            id={`${id}-query`}
            type="search"
            value={query}
            minLength={2}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <button type="submit" disabled={busy || query.trim().length < 2}>
            Cerca
          </button>
        </div>
      </form>

      <p className="commander-status" role="status">
        {status}
      </p>

      {state.status === 'results' && state.candidates.length > 0 && (
        <ul className="commander-results" aria-label="Comandanti trovati">
          {state.candidates.map((candidate) => (
            <li key={candidate.cardId}>
              <button type="button" disabled={busy} onClick={() => void select(candidate)}>
                <span>{candidate.name}</span>
                <span className="commander-credit">Illustrazione di {candidate.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="commander-source">Dati e illustrazioni da Scryfall; scaricati una volta e salvati sul dispositivo.</p>
    </div>
  )
}
