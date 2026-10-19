import { useId, useState } from 'react'
import type { CommanderIndex, GameAction, PlayerState } from '../game/types'
import { useArtImage, useCommanderSearch } from '../media/useCommanderArt'

interface CommanderSlotPickerProps {
  player: PlayerState
  slot: CommanderIndex
  dispatch: (action: GameAction) => void
}

/** "Comandante" for a single commander, "Comandante 1/2" for partners — same as the damage labels. */
export const commanderSlotLabel = (player: PlayerState, slot: CommanderIndex) =>
  player.hasPartner ? `Comandante ${slot + 1}` : 'Comandante'

function CurrentCommander({ player, slot, dispatch }: CommanderSlotPickerProps) {
  const commander = player.commanders[slot]
  const art = useArtImage(commander?.cardId ?? null)
  if (!commander) return null
  return (
    <div className="commander-current">
      <div className="commander-row">
        <span className="commander-thumb" aria-hidden="true">
          {art && <img src={art.url} alt="" width={48} height={48} />}
        </span>
        <span className="commander-row__text">
          <span className="commander-row__name">{commander.name}</span>
          <span className="commander-credit">Illustrazione di {commander.artist}</span>
        </span>
      </div>
      <button
        type="button"
        className="quiet-button remove-commander"
        onClick={() => dispatch({ type: 'set-commander', playerId: player.id, slot, commander: null })}
      >
        Rimuovi {commanderSlotLabel(player, slot).toLowerCase()}
      </button>
    </div>
  )
}

/**
 * Choose one commander slot from Scryfall (Phase 2c, D-026/D-027). The art is downloaded once
 * and cached, so the panel keeps it offline. Used inline (standard) and in the details sheet.
 */
export function CommanderSlotPicker({ player, slot, dispatch }: CommanderSlotPickerProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const label = commanderSlotLabel(player, slot)
  const { state, search, select } = useCommanderSearch((commander) =>
    dispatch({ type: 'set-commander', playerId: player.id, slot, commander }),
  )
  const busy = state.status === 'searching' || state.status === 'saving'
  const current = player.commanders[slot]

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
    <div className="commander-picker" role="group" aria-label={label}>
      <CurrentCommander player={player} slot={slot} dispatch={dispatch} />

      <form
        className="commander-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          void search(query)
        }}
      >
        <label htmlFor={`${id}-query`}>{current ? `Cambia ${label.toLowerCase()}` : `Cerca ${label.toLowerCase()}`}</label>
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
        <ul className="commander-results" aria-label={`Risultati per ${label.toLowerCase()}`}>
          {state.candidates.map((candidate) => (
            <li key={candidate.cardId}>
              <button
                type="button"
                className="commander-row"
                disabled={busy}
                aria-label={`${candidate.name}, illustrazione di ${candidate.artist}`}
                onClick={() => void select(candidate)}
              >
                <span className="commander-thumb" aria-hidden="true">
                  <img src={candidate.artUrl} alt="" width={48} height={48} loading="lazy" />
                </span>
                <span className="commander-row__text">
                  <span className="commander-row__name">{candidate.name}</span>
                  <span className="commander-credit">Illustrazione di {candidate.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
