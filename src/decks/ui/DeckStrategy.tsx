import { useEffect, useRef, useState } from 'react'
import type { CardData } from '../../media/scryfall'
import { KEY_NOTE_MAX, MAX_KEY_CARDS, NOTES_MAX } from '../model'
import type { DeckRecord, KeyCard } from '../model'
import { CardCrop } from './CardCrop'

/** Notes are saved this long after the last keystroke (plan Task 11). */
export const AUTOSAVE_MS = 600

interface DeckStrategyProps {
  deck: DeckRecord
  cards: Map<string, CardData>
  /** Applies a change to the latest stored deck and saves it. */
  saveDeck: (update: (deck: DeckRecord) => DeckRecord) => Promise<void>
}

/**
 * Strategia (R3 §9): the owner's plain notes, saved on the device as they type, and up to eight
 * key cards chosen by hand. Writes are serialised (plan fix 9): one at a time, the latest text
 * wins, and a pending change is flushed on blur and when the view goes away. A failed write keeps
 * its text and stops the autosave until «Riprova salvataggio», blur or leaving retry it.
 */
export function DeckStrategy({ deck, cards, saveDeck }: DeckStrategyProps) {
  const [notes, setNotes] = useState(deck.notes)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorAnnounced, setErrorAnnounced] = useState(false)
  const [picking, setPicking] = useState(false)
  const timer = useRef<number | null>(null)
  const queued = useRef<string | null>(null)
  const writing = useRef(false)
  // After a failed write the drain stops until an explicit retry: blur, unmount or the button.
  const failed = useRef(false)
  const saveRef = useRef(saveDeck)
  useEffect(() => {
    saveRef.current = saveDeck
  })

  const drain = async () => {
    if (writing.current) return
    writing.current = true
    while (queued.current !== null) {
      const value = queued.current
      queued.current = null
      try {
        await saveRef.current((current) => ({ ...current, notes: value, updatedAt: Date.now() }))
        failed.current = false
        setStatus('saved')
        setErrorAnnounced(false)
      } catch {
        // The failed text stays dirty unless newer text was typed meanwhile.
        queued.current ??= value
        failed.current = true
        setStatus('error')
        setErrorAnnounced(true)
        break
      }
    }
    writing.current = false
  }

  /** Writes what is pending; `retry` also writes after a failure. */
  const flush = (retry = true) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    if (queued.current !== null && (retry || !failed.current)) void drain()
  }

  // Leaving the view writes what is pending.
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })
  useEffect(() => () => flushRef.current(), [])

  const onType = (value: string) => {
    setNotes(value)
    queued.current = value
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => flush(false), AUTOSAVE_MS)
  }

  const keyCards = deck.keyCards
  const setKeys = (next: KeyCard[]) => void saveDeck((current) => ({ ...current, keyCards: next, updatedAt: Date.now() }))
  const move = (index: number, by: -1 | 1) => {
    const next = keyCards.slice()
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    setKeys(next)
  }
  const choosable = deck.cards.filter((entry) => !deck.commanders.includes(entry.cardId) && !keyCards.some((key) => key.cardId === entry.cardId))

  return (
    <div className="deck-strategy">
      <label className="deck-strategy__notes">
        <span>Note di strategia</span>
        <textarea
          value={notes}
          maxLength={NOTES_MAX}
          rows={10}
          aria-describedby={`${deck.id}-notes-help`}
          onChange={(event) => onType(event.currentTarget.value)}
          onBlur={() => flush()}
        />
      </label>
      <p id={`${deck.id}-notes-help`} className="deck-import__help">
        Scrivi il piano di gioco, le priorità e le sinergie da ricordare.
      </p>
      <p className="deck-strategy__status">{status === 'saved' ? 'Salvato sul dispositivo' : status === 'error' ? 'Salvataggio non riuscito' : ''}</p>
      {status === 'error' && (
        <button type="button" className="quiet-button" onClick={() => flush()}>
          Riprova salvataggio
        </button>
      )}
      <p className="sr-only" aria-live="polite">
        {errorAnnounced ? 'Le note non sono state salvate sul dispositivo' : ''}
      </p>
      <button type="button" className="quiet-button deck-strategy__done" onClick={(event) => event.currentTarget.blur()}>
        Fine modifica
      </button>

      <section className="deck-keys" aria-labelledby={`${deck.id}-keys`}>
        <h2 id={`${deck.id}-keys`}>Carte chiave</h2>
        {keyCards.length === 0 && <p className="deck-plan__empty">Nessuna carta chiave selezionata</p>}
        <ol className="deck-keys__list">
          {keyCards.map((key, index) => {
            const card = cards.get(key.cardId)
            return (
              <li key={key.cardId} className="deck-key">
                <CardCrop cardIds={[key.cardId]} className="deck-key__art" />
                <span className="deck-key__name">{card?.name}</span>
                <label className="deck-key__note">
                  <span className="sr-only">Nota per {card?.name}</span>
                  <input
                    defaultValue={key.note}
                    maxLength={KEY_NOTE_MAX}
                    onBlur={(event) => {
                      const note = event.currentTarget.value
                      if (note !== key.note) setKeys(keyCards.map((entry) => (entry.cardId === key.cardId ? { ...entry, note } : entry)))
                    }}
                  />
                </label>
                <button type="button" className="quiet-button" aria-label={`Sposta prima ${card?.name}`} disabled={index === 0} onClick={() => move(index, -1)}>
                  Sposta prima
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  aria-label={`Sposta dopo ${card?.name}`}
                  disabled={index === keyCards.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Sposta dopo
                </button>
                <button type="button" className="quiet-button" aria-label={`Togli ${card?.name} dalle carte chiave`} onClick={() => setKeys(keyCards.filter((entry) => entry.cardId !== key.cardId))}>
                  Togli
                </button>
              </li>
            )
          })}
        </ol>
        {keyCards.length < MAX_KEY_CARDS && (
          <button type="button" className="quiet-button" aria-expanded={picking} onClick={() => setPicking(!picking)}>
            Scegli dalla lista
          </button>
        )}
        {picking && keyCards.length < MAX_KEY_CARDS && (
          <ul className="deck-keys__choices">
            {choosable.map((entry) => (
              <li key={entry.cardId}>
                <button
                  type="button"
                  className="deck-card__row"
                  onClick={() => {
                    setKeys([...keyCards, { cardId: entry.cardId, note: '' }])
                    if (keyCards.length + 1 >= MAX_KEY_CARDS) setPicking(false)
                  }}
                >
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
