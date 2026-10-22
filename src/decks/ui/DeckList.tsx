import { useState } from 'react'
import { categorize, CATEGORY_LABELS } from '../categories'
import { CommanderMissingError, MAX_QUANTITY, withListChange } from '../model'
import type { DeckCard, DeckRecord } from '../model'
import { parseList } from '../parseList'
import type { Recognition } from '../recognize'
import type { CardData } from '../../media/scryfall'
import { CardCrop } from './CardCrop'

/** List groups, in the spec's order (R3 §8.1); the type comes from the front face. */
const GROUPS: Array<{ key: string; label: string; test: (type: string) => boolean }> = [
  { key: 'creature', label: 'Creature', test: (type) => /\bcreature\b/.test(type) },
  { key: 'instant', label: 'Istantanei', test: (type) => /\binstant\b/.test(type) },
  { key: 'sorcery', label: 'Stregonerie', test: (type) => /\bsorcery\b/.test(type) },
  { key: 'artifact', label: 'Artefatti', test: (type) => /\bartifact\b/.test(type) },
  { key: 'enchantment', label: 'Incantesimi', test: (type) => /\benchantment\b/.test(type) },
  { key: 'planeswalker', label: 'Planeswalker', test: (type) => /\bplaneswalker\b/.test(type) },
  { key: 'battle', label: 'Battaglie', test: (type) => /\bbattle\b/.test(type) },
  { key: 'land', label: 'Terre', test: (type) => /\bland\b/.test(type) },
]

const frontType = (card: CardData | undefined) => (card ? card.typeLine.split(' // ')[0].toLowerCase() : '')

/** Lands are checked last: a land creature (Dryad Arbor) reads as a land, like in the game. */
function groupOf(card: CardData | undefined): string {
  const type = frontType(card)
  if (/\bland\b/.test(type)) return 'land'
  return GROUPS.find((group) => group.test(type))?.key ?? 'land'
}

interface DeckListProps {
  deck: DeckRecord
  cards: Map<string, CardData>
  editing: boolean
  online: boolean
  onEdit: (editing: boolean) => void
  onSave: (deck: DeckRecord, newCards: CardData[]) => Promise<void>
  recognizeName: (name: string) => Promise<Recognition>
  onPasteUpdate: () => void
  now: () => number
}

/**
 * Lista (R3 §8): a text register grouped by type, with an explicit edit mode. A quantity at zero
 * marks «Da rimuovere» until saved; a missing commander blocks the save until a replacement is
 * chosen; key cards that leave the list are named before they go.
 */
export function DeckList({ deck, cards, editing, online, onEdit, onSave, recognizeName, onPasteUpdate, now }: DeckListProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [added, setAdded] = useState<CardData[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardData[] | 'none' | null>(null)
  const [replacement, setReplacement] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const commanders = new Set(deck.commanders.filter((cardId): cardId is string => cardId !== null))
  const lines: DeckCard[] = [...deck.cards, ...added.map((card) => ({ cardId: card.cardId, name: card.name, quantity: 1, set: card.set, number: card.number }))]
  const quantityOf = (line: DeckCard) => quantities[line.cardId] ?? line.quantity
  const pending = lines.filter((line) => quantityOf(line) > 0)
  const removedKeys = deck.keyCards.filter((key) => !pending.some((line) => line.cardId === key.cardId))
  const commanderGone = deck.commanders.some((cardId) => cardId && !pending.some((line) => line.cardId === cardId))

  const reset = () => {
    setQuantities({})
    setAdded([])
    setResults(null)
    setQuery('')
    setReplacement('')
    setProblem(null)
  }

  const save = async () => {
    const next = pending.map((line) => ({ ...line, quantity: quantityOf(line) }))
    let base = deck
    if (commanderGone) {
      const card = cards.get(replacement) ?? added.find((entry) => entry.cardId === replacement)
      if (!card || !next.some((line) => line.cardId === card.cardId)) {
        setProblem('Scegli un nuovo comandante prima di salvare.')
        return
      }
      const kept = deck.commanders.filter((cardId): cardId is string => Boolean(cardId && next.some((line) => line.cardId === cardId)))
      base = { ...deck, commanders: [card.cardId, kept.find((cardId) => cardId !== card.cardId) ?? null] }
    }
    try {
      const { deck: changed } = withListChange(base, next, now())
      await onSave(changed, added)
      reset()
      onEdit(false)
    } catch (error) {
      if (error instanceof CommanderMissingError) setProblem('Scegli un nuovo comandante prima di salvare.')
      else throw error
    }
  }

  const search = async () => {
    const result = await recognizeName(query)
    const options = [...result.matched.map(({ card }) => card), ...result.ambiguous.flatMap((entry) => entry.options)].slice(0, 5)
    setResults(options.length > 0 ? options : 'none')
  }

  const grouped = [
    { key: 'commander', label: 'Comandante', lines: lines.filter((line) => commanders.has(line.cardId)) },
    ...GROUPS.map((group) => ({ ...group, lines: lines.filter((line) => !commanders.has(line.cardId) && cards.get(line.cardId) && groupOf(cards.get(line.cardId)) === group.key) })),
  ].filter((group) => group.lines.length > 0)

  return (
    <div className="deck-list">
      {editing ? (
        <div className="deck-list__tools">
          <label className="deck-list__search">
            <span>Aggiungi carta</span>
            <input type="search" value={query} disabled={!online} onChange={(event) => setQuery(event.currentTarget.value)} />
          </label>
          {online ? (
            <button type="button" className="quiet-button" disabled={!query.trim()} onClick={() => void search()}>
              Cerca
            </button>
          ) : (
            <p className="deck-line__hint">Serve una connessione per cercare nuove carte.</p>
          )}
          {results === 'none' && <p className="deck-line__hint">Nessuna corrispondenza</p>}
          {Array.isArray(results) &&
            results.map((card) => (
              <button
                key={card.cardId}
                type="button"
                className="card-result"
                onClick={() => {
                  if (!lines.some((line) => line.cardId === card.cardId)) setAdded([...added, card])
                  setResults(null)
                  setQuery('')
                }}
              >
                <CardCrop cardIds={[card.cardId]} className="card-result__art" />
                <span className="card-result__name">{card.name}</span>
                <span className="card-result__artist">Illustrazione di {card.artist}</span>
              </button>
            ))}
          <button type="button" className="quiet-button" disabled={!online} onClick={onPasteUpdate}>
            Incolla aggiornamento
          </button>
        </div>
      ) : (
        <button type="button" className="quiet-button deck-list__edit" onClick={() => onEdit(true)}>
          Modifica lista
        </button>
      )}

      {grouped.map((group) => (
        <section key={group.key} className="deck-group" aria-labelledby={`${deck.id}-group-${group.key}`}>
          <h2 id={`${deck.id}-group-${group.key}`} className="deck-group__title">
            {group.label} · {group.lines.reduce((sum, line) => sum + quantityOf(line), 0)}
          </h2>
          <ul>
            {group.lines.map((line) => {
              const card = cards.get(line.cardId) ?? added.find((entry) => entry.cardId === line.cardId)
              const quantity = quantityOf(line)
              const open = expanded === line.cardId
              return (
                <li key={`${line.cardId}-${line.set}-${line.number}`} className="deck-card" data-removing={quantity === 0 || undefined}>
                  {editing ? (
                    <div className="deck-card__edit">
                      <button
                        type="button"
                        className="counter-column__step"
                        aria-label={`Togli una copia di ${line.name}`}
                        disabled={quantity === 0}
                        onClick={() => setQuantities({ ...quantities, [line.cardId]: quantity - 1 })}
                      >
                        −
                      </button>
                      <span className="deck-card__quantity">{quantity}</span>
                      <button
                        type="button"
                        className="counter-column__step"
                        aria-label={`Aggiungi una copia di ${line.name}`}
                        disabled={quantity >= MAX_QUANTITY}
                        onClick={() => setQuantities({ ...quantities, [line.cardId]: quantity + 1 })}
                      >
                        +
                      </button>
                      <span className="deck-card__name">{line.name}</span>
                      {quantity === 0 && <span className="deck-card__flag">Da rimuovere</span>}
                    </div>
                  ) : (
                    <button type="button" className="deck-card__row" aria-expanded={open} onClick={() => setExpanded(open ? null : line.cardId)}>
                      <span className="deck-card__quantity">{quantity}</span>
                      <span className="deck-card__name">{line.name}</span>
                      <span className="deck-card__cost">{card?.manaCost}</span>
                    </button>
                  )}
                  {open && !editing && card && (
                    <div className="deck-card__more">
                      <CardCrop cardIds={[card.cardId]} className="deck-card__art" />
                      <p>{card.typeLine}</p>
                      <p>Illustrazione di {card.artist}</p>
                      <p>{categorize(card).map((category) => CATEGORY_LABELS[category]).join(' · ')}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {deck.unrecognized.length > 0 && (
        <section className="deck-group" aria-labelledby={`${deck.id}-group-unrecognized`}>
          <h2 id={`${deck.id}-group-unrecognized`} className="deck-group__title">
            Non riconosciute · {deck.unrecognized.length}
          </h2>
          <ul>
            {deck.unrecognized.map((source) => (
              <li key={source} className="deck-card deck-card--unknown">
                {source}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <div className="deck-list__save">
          {removedKeys.length > 0 && (
            <p className="deck-line__hint">
              {removedKeys.map((key) => cards.get(key.cardId)?.name).join(', ')}: sarà rimossa anche da Carte chiave
            </p>
          )}
          {commanderGone && (
            <label className="deck-import__field">
              <span>Nuovo comandante</span>
              <select
                value={replacement}
                aria-invalid={problem !== null && !replacement}
                aria-describedby={problem ? `${deck.id}-list-problem` : undefined}
                onChange={(event) => setReplacement(event.currentTarget.value)}
              >
                <option value="">Scegli…</option>
                {pending
                  .map((line) => cards.get(line.cardId) ?? added.find((entry) => entry.cardId === line.cardId))
                  .filter((card): card is CardData => Boolean(card && /legendary/i.test(card.typeLine)))
                  .map((card) => (
                    <option key={card.cardId} value={card.cardId}>
                      {card.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {problem && (
            <p id={`${deck.id}-list-problem`} className="inline-notice" role="alert">
              {problem}
            </p>
          )}
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              reset()
              onEdit(false)
            }}
          >
            Annulla modifiche
          </button>
          <button type="button" className="primary-button" onClick={() => void save()}>
            Salva modifiche
          </button>
        </div>
      )}
    </div>
  )
}

/** Parses one name for «Aggiungi carta». */
export const singleLine = (name: string) => parseList(`1 ${name}`)
