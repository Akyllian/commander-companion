import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { CheckIcon } from '../../components/icons'
import { analyzeArt } from '../../media/analyzeImage'
import { getArtStore } from '../../media/artStore'
import { downloadArt, fetchCollection, ScryfallError, searchCommanders, searchLocalized } from '../../media/scryfall'
import type { CardData } from '../../media/scryfall'
import type { DeckStore } from '../deckStore'
import { clearDraft, draftForText, emptyDraft, hashText, loadDraft, saveDraft } from '../importDraft'
import type { ImportDraft } from '../importDraft'
import { DECK_NAME_MAX, OWNER_NAME_MAX, withListChange } from '../model'
import type { DeckCard, DeckRecord, OfflineState } from '../model'
import { parseList } from '../parseList'
import type { ParsedLine } from '../parseList'
import { prepareOffline } from '../prepareOffline'
import { recognize } from '../recognize'
import type { Recognition } from '../recognize'
import { CardCrop } from './CardCrop'
import { BackIcon } from './deckIcons'

type PrepareResult = { offline: OfflineState; missing: string[]; reason: 'network' | 'quota' | null }

/** The network and storage the import needs, injectable for tests. */
export interface ImportServices {
  recognize: (lines: ParsedLine[]) => Promise<Recognition>
  searchCommander: (query: string) => Promise<CardData[]>
  prepare: (deck: DeckRecord, cards: CardData[], onProgress: (done: number, total: number) => void) => Promise<PrepareResult>
  newId: () => string
  now: () => number
}

async function searchCommanderCards(query: string): Promise<CardData[]> {
  const candidates = await searchCommanders(query)
  if (candidates.length === 0) return []
  const { found } = await fetchCollection(candidates.map((candidate) => ({ name: candidate.name })))
  return found.slice(0, 5)
}

export const defaultImportServices: ImportServices = {
  recognize: (lines) => recognize(lines, { fetchCollection: (identifiers) => fetchCollection(identifiers), searchLocalized: (name) => searchLocalized(name) }),
  searchCommander: searchCommanderCards,
  prepare: async (deck, cards, onProgress) => {
    const art = getArtStore()
    if (!art) return { offline: 'partial', missing: cards.map((card) => card.cardId), reason: null }
    return prepareOffline(deck, cards, { art, download: (url) => downloadArt(url), analyze: analyzeArt, onProgress })
  },
  newId: () => crypto.randomUUID(),
  now: () => Date.now(),
}

type CardLine = Extract<ParsedLine, { kind: 'card' }>
type Outcome = { kind: 'saving'; done: number; total: number } | { kind: 'saved'; deckId: string; result: PrepareResult } | null

const NETWORK_NOTICE = 'Serve una connessione per riconoscere nuove carte. La partita e i mazzi già salvati restano disponibili.'

interface ImportDeckProps {
  store: DeckStore
  onDone: (deckId: string) => void
  onCancel: () => void
  onSaved: () => void
  services?: ImportServices
  /** «Incolla aggiornamento» (R3 §8.2): replace this deck's list, keeping name, owner, notes and key cards. */
  replace?: DeckRecord
  /** Card data already known (the deck being updated), so dropped key cards can be named. */
  knownCards?: Map<string, CardData>
}

/**
 * Importa mazzo (R3 §5): Lista → Verifica → Dettagli on one page. The text is never lost: the
 * draft is saved at every change, and the analysis is stored with the card data, so a reload at
 * Verifica comes back even offline (plan fix 2). One polite region speaks progress and errors.
 */
export function ImportDeck({ store, onDone, onCancel, onSaved, services = defaultImportServices, replace, knownCards }: ImportDeckProps) {
  // An update never touches the import draft of a new deck.
  const [draft, setDraft] = useState<ImportDraft>(() => (replace ? null : loadDraft()) ?? emptyDraft())
  const [recovered] = useState(() => !replace && loadDraft() !== null)
  const [cards, setCards] = useState<Map<string, CardData>>(() => new Map(knownCards ?? []))
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [announcement, setAnnouncement] = useState(recovered ? 'Bozza di importazione recuperata' : '')

  useEffect(() => {
    if (!replace) saveDraft(draft)
  }, [draft, replace])

  // A recovered analysis reads its card data from the store: no request, works offline.
  const recognition = draft.recognition
  useEffect(() => {
    if (!recognition) return
    const ids = [...Object.values(recognition.matched), ...Object.values(recognition.ambiguous).flat(), ...Object.values(draft.choices)]
    void store.getCards(ids).then((found) => setCards((previous) => new Map([...previous, ...found])))
  }, [recognition, draft.choices, store])

  const lines = useMemo(() => parseList(draft.text), [draft.text])
  const lineByNumber = useMemo(() => new Map(lines.map((line) => [String(line.line), line])), [lines])

  const update = (patch: Partial<ImportDraft>) => setDraft((previous) => ({ ...previous, ...patch }))
  const updateDetails = (patch: Partial<ImportDraft['details']>) => setDraft((previous) => ({ ...previous, details: { ...previous.details, ...patch } }))

  const analyse = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await services.recognize(lines)
      const found = [...result.matched.map(({ card }) => card), ...result.ambiguous.flatMap(({ options }) => options)]
      await store.putCards(found)
      setCards((previous) => new Map([...previous, ...found.map((card) => [card.cardId, card] as const)]))
      setDraft((previous) => ({
        ...previous,
        step: 2,
        textHash: hashText(previous.text),
        recognition: {
          matched: Object.fromEntries(result.matched.map(({ line, card }) => [String(line.line), card.cardId])),
          ambiguous: Object.fromEntries(result.ambiguous.map(({ line, options }) => [String(line.line), options.map((option) => option.cardId)])),
          missing: [...result.missing, ...result.invalid].map((line) => line.line).toSorted((left, right) => left - right),
        },
        choices: {},
        ignoredLines: false,
        acceptedMissing: false,
      }))
      setAnnouncement(`${result.matched.length} righe riconosciute`)
    } catch (error) {
      const message = error instanceof ScryfallError && error.kind === 'network' ? NETWORK_NOTICE : 'Scryfall non risponde. Il testo resta qui: riprova tra poco.'
      setNotice(message)
      setAnnouncement(message)
    } finally {
      setBusy(false)
    }
  }

  // Verifica: what is resolved, what needs a choice, what is left out.
  const resolved = new Map<string, string>()
  if (recognition) {
    for (const [line, cardId] of Object.entries(recognition.matched)) resolved.set(line, cardId)
    for (const [line, cardId] of Object.entries(draft.choices)) resolved.set(line, cardId)
  }
  const pendingAmbiguous = recognition ? Object.keys(recognition.ambiguous).filter((line) => !draft.choices[line]) : []
  const pendingMissing = recognition ? recognition.missing.map(String).filter((line) => !draft.choices[line]) : []
  const excluded = lines.filter((line): line is CardLine => line.kind === 'card' && line.section === 'excluded')
  const recognisedCopies = [...resolved.keys()].reduce((sum, line) => {
    const parsed = lineByNumber.get(line)
    return sum + (parsed?.kind === 'card' ? parsed.quantity : 1)
  }, 0)
  const canContinue = pendingAmbiguous.length === 0 && (pendingMissing.length === 0 || draft.acceptedMissing) && (excluded.length === 0 || draft.ignoredLines)

  const legendary = [...new Set(resolved.values())].map((cardId) => cards.get(cardId)).filter((card): card is CardData => Boolean(card && /legendary/i.test(card.typeLine)))

  const ownerName = draft.details.owner.kind === 'friend' ? draft.details.owner.name : ''
  const [first, second] = draft.details.commanders
  const [usePartner, setUsePartner] = useState(second !== null)
  const canSave =
    draft.details.name.trim().length > 0 &&
    first !== null &&
    (!usePartner || (second !== null && second !== first)) &&
    (draft.details.owner.kind === 'me' || ownerName.trim().length > 0)

  const buildCards = () => {
    const deckCards: DeckCard[] = []
    for (const [lineNumber, cardId] of resolved) {
      const line = lineByNumber.get(lineNumber)
      const card = cards.get(cardId)
      if (!card || line?.kind !== 'card') continue
      deckCards.push({ cardId, name: card.name, quantity: line.quantity, set: line.set ?? card.set, number: line.number ?? card.number })
    }
    return deckCards
  }

  const save = async () => {
    const deckCards = buildCards()
    for (const commander of [first, usePartner ? second : null]) {
      const card = commander ? cards.get(commander) : undefined
      if (card && !deckCards.some((entry) => entry.cardId === card.cardId)) {
        deckCards.push({ cardId: card.cardId, name: card.name, quantity: 1, set: card.set, number: card.number })
      }
    }
    const unrecognized = draft.acceptedMissing ? pendingMissing.map((line) => lineByNumber.get(line)?.source ?? '').filter(Boolean) : []
    const now = services.now()
    const deck: DeckRecord = {
      version: 1,
      id: services.newId(),
      name: draft.details.name.trim().slice(0, DECK_NAME_MAX),
      owner: draft.details.owner.kind === 'me' ? { kind: 'me' } : { kind: 'friend', name: ownerName.trim().slice(0, OWNER_NAME_MAX) },
      commanders: [first as string, usePartner ? second : null],
      cards: deckCards,
      unrecognized,
      notes: draft.details.notes,
      keyCards: [],
      createdAt: now,
      updatedAt: now,
      offline: 'incomplete',
    }
    await store.putDeck(deck)
    clearDraft()
    await runPrepare(deck)
  }

  const runPrepare = async (deck: DeckRecord) => {
    const deckCardData = deck.cards.map((entry) => cards.get(entry.cardId)).filter((card): card is CardData => Boolean(card))
    setOutcome({ kind: 'saving', done: 0, total: deckCardData.length })
    const result = await services.prepare(deck, deckCardData, (done, total) => setOutcome({ kind: 'saving', done, total }))
    // A full device is never declared offline until the player accepts it (spec §5.5).
    const offline = result.reason === 'quota' ? 'incomplete' : result.offline
    await store.putDeck({ ...deck, offline })
    setOutcome({ kind: 'saved', deckId: deck.id, result })
    setAnnouncement(result.offline === 'complete' ? 'Mazzo disponibile offline' : 'Preparazione offline incompleta')
    onSaved()
  }

  const acceptPartial = async (deckId: string) => {
    const deck = await store.getDeck(deckId)
    if (deck) await store.putDeck({ ...deck, offline: 'partial' })
    onSaved()
    onDone(deckId)
  }

  const resume = async (deckId: string) => {
    const deck = await store.getDeck(deckId)
    if (deck) await runPrepare(deck)
  }

  const discard = async (deckId: string) => {
    await store.deleteDeck(deckId)
    onSaved()
    onCancel()
  }

  // Corrections: a new name is recognised alone and offered like any other result.
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [correctionResults, setCorrectionResults] = useState<Record<string, CardData[] | 'none'>>({})
  const searchCorrection = async (line: string) => {
    const query = (corrections[line] ?? '').trim()
    if (!query) return
    try {
      const result = await services.recognize(parseList(`1 ${query}`))
      const options = [...result.matched.map(({ card }) => card), ...result.ambiguous.flatMap((entry) => entry.options)].slice(0, 5)
      await store.putCards(options)
      setCards((previous) => new Map([...previous, ...options.map((card) => [card.cardId, card] as const)]))
      setCorrectionResults((previous) => ({ ...previous, [line]: options.length > 0 ? options : 'none' }))
    } catch {
      setNotice(NETWORK_NOTICE)
    }
  }

  // Commander search (step 3): a commander not in the list is added on request.
  const [commanderQuery, setCommanderQuery] = useState('')
  const [commanderResults, setCommanderResults] = useState<CardData[] | null>(null)
  const [pendingCommander, setPendingCommander] = useState<CardData | null>(null)
  const searchCommander = async () => {
    try {
      const found = await services.searchCommander(commanderQuery)
      await store.putCards(found)
      setCards((previous) => new Map([...previous, ...found.map((card) => [card.cardId, card] as const)]))
      setCommanderResults(found)
    } catch {
      setNotice(NETWORK_NOTICE)
    }
  }
  const inList = (cardId: string) => [...resolved.values()].includes(cardId)
  const chooseCommander = (slot: 0 | 1, cardId: string | null) => {
    const commanders: [string | null, string | null] = [draft.details.commanders[0], draft.details.commanders[1]]
    commanders[slot] = cardId
    updateDetails({ commanders })
  }

  const stepLabel = ['1 di 3 · Lista', '2 di 3 · Verifica', replace ? '3 di 3 · Conferma' : '3 di 3 · Dettagli'][draft.step - 1]

  // Update mode, step 3: what the new list keeps and what it drops.
  const [replacement, setReplacement] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const newCards = replace && draft.step === 3 ? buildCards() : []
  const missingCommander = replace ? replace.commanders.some((cardId) => cardId && !newCards.some((entry) => entry.cardId === cardId)) : false
  const droppedKeys = replace ? replace.keyCards.filter((key) => !newCards.some((entry) => entry.cardId === key.cardId)) : []
  const applyReplace = async () => {
    if (!replace) return
    const kept = replace.commanders.filter((cardId): cardId is string => Boolean(cardId && newCards.some((entry) => entry.cardId === cardId)))
    const commanders: [string, string | null] = missingCommander ? [replacement, kept.find((cardId) => cardId !== replacement) ?? null] : replace.commanders
    const unrecognized = draft.acceptedMissing ? pendingMissing.map((line) => lineByNumber.get(line)?.source ?? '').filter(Boolean) : []
    const { deck } = withListChange({ ...replace, commanders, unrecognized }, newCards, services.now())
    await store.putDeck({ ...deck, offline: 'incomplete' })
    await runPrepare({ ...deck, offline: 'incomplete' })
  }

  if (outcome?.kind === 'saving') {
    return (
      <div className="screen deck-import">
        <h1 tabIndex={-1}>Importa mazzo</h1>
        <p className="deck-import__progress" role="status">
          Carte {outcome.done} di {outcome.total}
        </p>
        <progress className="deck-import__bar" max={outcome.total || 1} value={outcome.done} aria-hidden="true" />
      </div>
    )
  }

  if (outcome?.kind === 'saved') {
    const { result, deckId } = outcome
    return (
      <div className="screen deck-import">
        <h1 tabIndex={-1}>Importa mazzo</h1>
        <div className="deck-import__outcome" data-outcome={result.reason ?? result.offline}>
          {result.offline === 'complete' && (
            <>
              <p className="deck-import__done">
                <CheckIcon /> Mazzo disponibile offline
              </p>
              <button type="button" className="primary-button" onClick={() => onDone(deckId)}>
                Apri il mazzo
              </button>
            </>
          )}
          {result.reason === 'network' && (
            <>
              <p>Preparazione offline incompleta</p>
              <button type="button" className="primary-button" onClick={() => void resume(deckId)}>
                Riprendi download
              </button>
              <button type="button" className="quiet-button" onClick={() => onDone(deckId)}>
                Apri il mazzo
              </button>
            </>
          )}
          {result.reason === 'quota' && (
            <>
              <p>Lo spazio del dispositivo non basta per tutti i ritagli</p>
              <button type="button" className="primary-button" onClick={() => void acceptPartial(deckId)}>
                Salva senza tutti i ritagli
              </button>
              <button type="button" className="quiet-button" onClick={() => void discard(deckId)}>
                Annulla
              </button>
            </>
          )}
          {result.offline === 'partial' && result.reason === null && (
            <>
              <p>Offline senza tutti i ritagli</p>
              <button type="button" className="primary-button" onClick={() => onDone(deckId)}>
                Apri il mazzo
              </button>
            </>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    )
  }

  return (
    <div className="screen deck-import">
      <button type="button" className="quiet-button deck-back" onClick={onCancel}>
        <BackIcon /> {replace ? 'Torna al mazzo' : 'Torna ai mazzi'}
      </button>
      <h1 tabIndex={-1}>{replace ? 'Incolla aggiornamento' : 'Importa mazzo'}</h1>
      <p className="deck-import__step">{stepLabel}</p>
      {notice && (
        <p className="inline-notice" role="alert">
          {notice}
        </p>
      )}

      {draft.step === 1 && (
        <section className="deck-import__panel">
          <label className="deck-import__field">
            <span>Incolla la lista</span>
            <textarea
              value={draft.text}
              rows={14}
              aria-describedby="deck-import-help"
              onChange={(event) => {
                // Read now: the updater runs later, when the event is gone.
                const text = event.currentTarget.value
                setDraft((previous) => draftForText(previous, text))
              }}
            />
          </label>
          <p id="deck-import-help" className="deck-import__help">
            Una carta per riga, nel formato «quantità nome». Sono accettate anche intestazioni come Commander, Mainboard o Sideboard; i nomi vengono
            verificati con Scryfall.
          </p>
          <div className="deck-import__actions">
            <button type="button" className="primary-button" disabled={busy || draft.text.trim() === ''} onClick={() => void analyse()}>
              {notice ? 'Riprova analisi' : 'Analizza lista'}
            </button>
            {draft.text && (
              <button type="button" className="quiet-button quiet-danger" onClick={() => setDraft(emptyDraft())}>
                Svuota
              </button>
            )}
          </div>
        </section>
      )}

      {draft.step === 2 && recognition && (
        <section className="deck-import__panel">
          <p className="deck-import__summary">
            {recognisedCopies} carte riconosciute · {pendingAmbiguous.length + pendingMissing.length} righe da correggere
          </p>

          {(pendingAmbiguous.length > 0 || recognition.missing.length > 0) && (
            <div className="deck-import__group">
              <h2>Da correggere</h2>
              <ul className="deck-lines">
                {Object.entries(recognition.ambiguous).map(([line, options]) => (
                  <li key={`a${line}`} className="deck-line" data-ambiguous="">
                    <p className="deck-line__source">{lineByNumber.get(line)?.source}</p>
                    <p className="deck-line__hint">Scegli una corrispondenza</p>
                    <div role="radiogroup" aria-label={`Corrispondenze per ${lineByNumber.get(line)?.source}`}>
                      {options.map((cardId) => {
                        const card = cards.get(cardId)
                        const checked = draft.choices[line] === cardId
                        return (
                          <button
                            key={cardId}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            className="card-result"
                            onClick={() => update({ choices: { ...draft.choices, [line]: cardId } })}
                          >
                            <CardCrop cardIds={[cardId]} className="card-result__art" />
                            <span className="card-result__name">{card?.printedName ?? card?.name}</span>
                            <span className="card-result__artist">
                              {card?.set.toUpperCase()} · Illustrazione di {card?.artist}
                            </span>
                            {checked && <CheckIcon />}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
                {recognition.missing.map(String).map((line) => {
                  const chosen = draft.choices[line]
                  const results = correctionResults[line]
                  return (
                    <li key={`m${line}`} className="deck-line" data-missing="">
                      <p className="deck-line__source">{lineByNumber.get(line)?.source}</p>
                      {chosen ? (
                        <p className="deck-line__fixed">
                          <CheckIcon /> {cards.get(chosen)?.name}
                        </p>
                      ) : (
                        <>
                          <label className="deck-line__correction">
                            <span className="sr-only">Correggi {lineByNumber.get(line)?.source}</span>
                            <input value={corrections[line] ?? ''} onChange={(event) => setCorrections({ ...corrections, [line]: event.currentTarget.value })} />
                          </label>
                          <button type="button" className="quiet-button" onClick={() => void searchCorrection(line)}>
                            Cerca carta
                          </button>
                          {results === 'none' && <p className="deck-line__hint">Nessuna corrispondenza</p>}
                          {Array.isArray(results) &&
                            results.map((card) => (
                              <button
                                key={card.cardId}
                                type="button"
                                className="card-result"
                                onClick={() => update({ choices: { ...draft.choices, [line]: card.cardId } })}
                              >
                                <CardCrop cardIds={[card.cardId]} className="card-result__art" />
                                <span className="card-result__name">{card.printedName ?? card.name}</span>
                                <span className="card-result__artist">Illustrazione di {card.artist}</span>
                              </button>
                            ))}
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
              {pendingMissing.length > 0 &&
                (draft.acceptedMissing ? (
                  <p className="deck-import__accepted">
                    <CheckIcon /> {pendingMissing.length} righe escluse
                  </p>
                ) : (
                  <button type="button" className="quiet-button" onClick={() => update({ acceptedMissing: true })}>
                    Salva senza {pendingMissing.length} righe
                  </button>
                ))}
            </div>
          )}

          {excluded.length > 0 && (
            <div className="deck-import__group">
              <h2>Sezioni non importate</h2>
              <ul className="deck-lines">
                {[...new Set(excluded.map((line) => line.sectionName))].map((section) => {
                  const inSection = excluded.filter((line) => line.sectionName === section)
                  return (
                    <li key={section} className="deck-line">
                      <p className="deck-line__section">
                        {section} · {inSection.length}
                      </p>
                      {inSection.map((line) => (
                        <p key={line.line} className="deck-line__source">
                          {line.source}
                        </p>
                      ))}
                    </li>
                  )
                })}
              </ul>
              <label className="check-option">
                <input type="checkbox" checked={draft.ignoredLines} onChange={(event) => update({ ignoredLines: event.currentTarget.checked })} />
                <span>Ignora {excluded.length} righe fuori lista</span>
              </label>
            </div>
          )}

          <details className="deck-import__group">
            <summary>Riconosciute</summary>
            <ul className="deck-lines">
              {[...resolved.entries()].map(([line, cardId]) => (
                <li key={line} className="deck-line deck-line--ok">
                  {lineByNumber.get(line)?.kind === 'card' ? (lineByNumber.get(line) as CardLine).quantity : 1} {cards.get(cardId)?.name}
                </li>
              ))}
            </ul>
          </details>

          <div className="deck-import__actions">
            <button type="button" className="quiet-button" onClick={() => update({ step: 1 })}>
              Torna al testo
            </button>
            <button type="button" className="primary-button" disabled={!canContinue} onClick={() => update({ step: 3 })}>
              Continua
            </button>
          </div>
        </section>
      )}

      {draft.step === 3 && replace && (
        <section className="deck-import__panel">
          <p className="deck-import__summary">{newCards.reduce((sum, entry) => sum + entry.quantity, 0)} carte nella nuova lista</p>
          {missingCommander && (
            <label className="deck-import__field">
              <span>Il comandante non è nella nuova lista: scegli un sostituto</span>
              <select value={replacement} onChange={(event) => setReplacement(event.currentTarget.value)}>
                <option value="">Scegli…</option>
                {legendary.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {droppedKeys.length > 0 && (
            <p className="deck-line__hint">Saranno rimosse anche da Carte chiave: {droppedKeys.map((key) => cards.get(key.cardId)?.name ?? key.cardId).join(', ')}</p>
          )}
          <div className="deck-import__actions">
            <button type="button" className="quiet-button" onClick={() => update({ step: 2 })}>
              Indietro
            </button>
            <button type="button" className="primary-button" disabled={missingCommander && !replacement} onClick={() => setConfirmReplace(true)}>
              Sostituisci lista
            </button>
          </div>
          <ConfirmDialog
            open={confirmReplace}
            title="Sostituire la lista?"
            description="Nome, proprietario, note e carte chiave restano; la lista viene sostituita."
            confirmLabel="Sostituisci lista"
            onConfirm={() => {
              setConfirmReplace(false)
              void applyReplace()
            }}
            onCancel={() => setConfirmReplace(false)}
          />
        </section>
      )}

      {draft.step === 3 && !replace && (
        <section className="deck-import__panel">
          <label className="deck-import__field">
            <span>Nome del mazzo</span>
            <input value={draft.details.name} maxLength={DECK_NAME_MAX} required onChange={(event) => updateDetails({ name: event.currentTarget.value })} />
          </label>

          <fieldset className="deck-import__field">
            <legend>Questo mazzo è di</legend>
            <label className="check-option">
              <input type="radio" name="owner" checked={draft.details.owner.kind === 'me'} onChange={() => updateDetails({ owner: { kind: 'me' } })} />
              <span>Me</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="owner"
                checked={draft.details.owner.kind === 'friend'}
                onChange={() => updateDetails({ owner: { kind: 'friend', name: ownerName } })}
              />
              <span>Un amico</span>
            </label>
            {draft.details.owner.kind === 'friend' && (
              <label className="deck-import__field">
                <span>Nome dell'amico</span>
                <input
                  value={ownerName}
                  maxLength={OWNER_NAME_MAX}
                  onChange={(event) => updateDetails({ owner: { kind: 'friend', name: event.currentTarget.value } })}
                />
              </label>
            )}
          </fieldset>

          {([0, 1] as const).map((slot) =>
            slot === 1 && !usePartner ? null : (
              <label key={slot} className="deck-import__field">
                <span>{slot === 0 ? 'Comandante' : 'Comandante 2'}</span>
                <select value={draft.details.commanders[slot] ?? ''} onChange={(event) => chooseCommander(slot, event.currentTarget.value || null)}>
                  <option value="">Scegli…</option>
                  {[...legendary, ...(commanderResults ?? []).filter((card) => inList(card.cardId) || draft.details.commanders.includes(card.cardId))]
                    .filter((card, index, all) => all.findIndex((other) => other.cardId === card.cardId) === index)
                    .map((card) => (
                      <option key={card.cardId} value={card.cardId}>
                        {card.name}
                      </option>
                    ))}
                </select>
              </label>
            ),
          )}
          <label className="check-option">
            <input
              type="checkbox"
              checked={usePartner}
              onChange={(event) => {
                setUsePartner(event.currentTarget.checked)
                if (!event.currentTarget.checked) chooseCommander(1, null)
              }}
            />
            <span>Due comandanti (Partner)</span>
          </label>

          <div className="deck-import__field">
            <label>
              <span>Cerca un comandante</span>
              <input type="search" value={commanderQuery} onChange={(event) => setCommanderQuery(event.currentTarget.value)} />
            </label>
            <button type="button" className="quiet-button" onClick={() => void searchCommander()}>
              Cerca
            </button>
            {commanderResults?.map((card) => (
              <button
                key={card.cardId}
                type="button"
                className="card-result"
                onClick={() => (inList(card.cardId) ? chooseCommander(draft.details.commanders[0] && usePartner ? 1 : 0, card.cardId) : setPendingCommander(card))}
              >
                <CardCrop cardIds={[card.cardId]} className="card-result__art" />
                <span className="card-result__name">{card.name}</span>
                <span className="card-result__artist">Illustrazione di {card.artist}</span>
              </button>
            ))}
            {pendingCommander && (
              <p className="deck-line__hint">
                {pendingCommander.name} non è nella lista.{' '}
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    chooseCommander(draft.details.commanders[0] && usePartner ? 1 : 0, pendingCommander.cardId)
                    setPendingCommander(null)
                  }}
                >
                  Aggiungi come comandante
                </button>
              </p>
            )}
          </div>

          <label className="deck-import__field">
            <span>Note di strategia</span>
            <textarea value={draft.details.notes} rows={4} onChange={(event) => updateDetails({ notes: event.currentTarget.value })} />
          </label>
          <p className="deck-import__help">Legalità non verificata dall'app.</p>
          <p className="deck-import__help">Le carte e i ritagli verranno salvati per l'uso offline.</p>
          <div className="deck-import__actions">
            <button type="button" className="quiet-button" onClick={() => update({ step: 2 })}>
              Indietro
            </button>
            <button type="button" className="primary-button" disabled={!canSave} onClick={() => void save()}>
              Salva e prepara offline
            </button>
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
