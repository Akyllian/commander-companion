import { useId, useState } from 'react'
import { FOUR_PLAYER_CHOICES, LayoutOptions, TWO_PLAYER_CHOICES } from '../components/LayoutSelector'
import { FAN_CONTENT_NOTICE } from '../content/legal'
import type { Preferences } from '../settings/preferences'

type PlayerCount = 2 | 3 | 4
const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4]

interface MoreScreenProps {
  /** Players of the current game: the layout options follow it, never the draft below. */
  playerCount: number
  preferences: Preferences
  onPreferencesChange: (next: Preferences) => void
  wakeLockSupported: boolean
  /** Asks for a new game; the confirmation dialog stays with the app. */
  onNewGame: (count: PlayerCount) => void
  onReset: () => void
}

/** Altro / Impostazioni (D-037, R1 design §6): one editorial list, no card grid. */
export function MoreScreen({ playerCount, preferences, onPreferencesChange, wakeLockSupported, onNewGame, onReset }: MoreScreenProps) {
  const [draft, setDraft] = useState<PlayerCount>(() => (PLAYER_COUNTS.includes(playerCount as PlayerCount) ? (playerCount as PlayerCount) : 4))
  const wakeHint = useId()

  const layout =
    playerCount === 4 ? (
      <LayoutOptions
        key={`four-${preferences.fourPlayerLayout}`}
        choices={FOUR_PLAYER_CHOICES}
        value={preferences.fourPlayerLayout}
        onChoose={(fourPlayerLayout) => onPreferencesChange({ ...preferences, fourPlayerLayout })}
      />
    ) : playerCount === 2 ? (
      <LayoutOptions
        key={`two-${preferences.twoPlayerLayout}`}
        choices={TWO_PLAYER_CHOICES}
        value={preferences.twoPlayerLayout}
        onChoose={(twoPlayerLayout) => onPreferencesChange({ ...preferences, twoPlayerLayout })}
      />
    ) : (
      <p className="settings-row__value">Griglia</p>
    )

  return (
    <div className="screen more-screen">
      <header className="screen__header">
        <h1 tabIndex={-1}>Altro</h1>
        <p className="screen__subtitle">Partita, schermo e informazioni</p>
      </header>

      <section className="settings-group" aria-labelledby="altro-tavolo">
        <h2 id="altro-tavolo">Disposizione del tavolo</h2>
        <div className="settings-row settings-row--layout">
          <p className="settings-row__label">Layout dei giocatori</p>
          {layout}
        </div>
        {wakeLockSupported && (
          <label className="settings-row settings-row--switch">
            <span className="settings-row__label">Mantieni lo schermo acceso</span>
            <span className="settings-row__hint" id={wakeHint}>
              Evita che lo schermo si spenga durante la partita
            </span>
            <input
              type="checkbox"
              role="switch"
              className="settings-switch"
              aria-describedby={wakeHint}
              checked={preferences.keepScreenOn}
              onChange={(event) => onPreferencesChange({ ...preferences, keepScreenOn: event.currentTarget.checked })}
            />
          </label>
        )}
      </section>

      <section className="settings-group" aria-labelledby="altro-nuova">
        <h2 id="altro-nuova">Nuova partita</h2>
        <div className="settings-row">
          <p className="settings-row__label" id="altro-giocatori">
            Giocatori per la nuova partita
          </p>
          <div className="segmented" role="radiogroup" aria-labelledby="altro-giocatori">
            {PLAYER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={draft === count}
                className="segmented__option"
                onClick={() => setDraft(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="primary-button" onClick={() => onNewGame(draft)}>
          Nuova partita
        </button>
      </section>

      <section className="settings-group settings-group--current" aria-labelledby="altro-attuale">
        <h2 id="altro-attuale">Partita attuale</h2>
        <button type="button" className="quiet-button reset-scores-button" onClick={onReset}>
          Azzera punteggi
        </button>
      </section>

      <section className="settings-group settings-group--info" aria-labelledby="altro-info">
        <h2 id="altro-info">Informazioni</h2>
        <p className="settings-info__name">
          Commander Companion <span className="settings-info__version">Versione {__APP_VERSION__}</span>
        </p>
        <p>Dati e illustrazioni delle carte da Scryfall</p>
        <p className="fan-content-notice" lang="en">
          {FAN_CONTENT_NOTICE}
        </p>
      </section>
    </div>
  )
}
