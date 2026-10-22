import { useState } from 'react'
import { ChevronDownIcon, DecksIcon } from '../../components/icons'
import type { CardData } from '../../media/scryfall'
import type { DeckRecord } from '../model'
import { deckHref } from '../routes'
import { commanderLine, matchesSearch, OFFLINE_LABELS, ownerLabel, topCategories } from '../summary'
import { CardCrop } from './CardCrop'
import { DownloadIcon, OfflineDoneIcon, WarningIcon } from './deckIcons'

/** The search field appears only once there are this many decks (spec §4.1). */
export const SEARCH_THRESHOLD = 7

interface DeckLibraryProps {
  decks: DeckRecord[]
  cards: Map<string, CardData>
  onOpen: (deckId: string) => void
  onImport: () => void
}

/** The grimoire (R3 §4): a continuous register of decks, never a card grid. */
export function DeckLibrary({ decks, cards, onOpen, onImport }: DeckLibraryProps) {
  const [query, setQuery] = useState('')
  const sorted = decks.toSorted((left, right) => right.updatedAt - left.updatedAt)
  const shown = sorted.filter((deck) => matchesSearch(deck, cards, query))

  return (
    <div className="screen decks-screen">
      <header className="decks-header">
        <div>
          <h1 tabIndex={-1}>Mazzi</h1>
          <p className="decks-header__lede">Liste, strategie e mani di prova, disponibili anche offline.</p>
        </div>
        {decks.length > 0 && (
          <button type="button" className="primary-button decks-import" onClick={onImport}>
            <DownloadIcon /> Importa mazzo
          </button>
        )}
      </header>

      {decks.length === 0 ? (
        <div className="decks-empty">
          <span className="decks-empty__icon">
            <DecksIcon />
          </span>
          <h2>Il tuo grimorio è vuoto</h2>
          <p>Incolla una lista di carte: la prepariamo una volta e resta con te anche offline.</p>
          <button type="button" className="primary-button" onClick={onImport}>
            <DownloadIcon /> Importa il primo mazzo
          </button>
          <p className="decks-empty__example" aria-hidden="true">
            1 Sol Ring
            <br />
            12 Island
          </p>
        </div>
      ) : (
        <>
          {decks.length >= SEARCH_THRESHOLD && (
            <label className="decks-search">
              <span className="sr-only">Cerca nei mazzi</span>
              <input type="search" placeholder="Cerca nei mazzi" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
            </label>
          )}
          {shown.length === 0 ? (
            <p className="decks-none">Nessun mazzo trovato</p>
          ) : (
            <ul className="deck-rows">
              {shown.map((deck) => {
                const summary = topCategories(deck, cards)
                return (
                  <li key={deck.id}>
                    <a
                      className="deck-row"
                      href={deckHref({ view: 'deck', deckId: deck.id, tab: 'panoramica' })}
                      onClick={(event) => {
                        event.preventDefault()
                        onOpen(deck.id)
                      }}
                    >
                      <CardCrop cardIds={deck.commanders} className="deck-row__art" />
                      <span className="deck-row__identity">
                        <span className="deck-row__name">{deck.name}</span>
                        <span className="deck-row__commander">{commanderLine(deck, cards) || 'Comandante non disponibile'}</span>
                        <span className="deck-row__owner">{ownerLabel(deck)}</span>
                      </span>
                      <span className="deck-row__state" data-offline={deck.offline}>
                        {deck.offline === 'complete' ? <OfflineDoneIcon /> : <WarningIcon />}
                        {OFFLINE_LABELS[deck.offline]}
                      </span>
                      {summary && <span className="deck-row__categories">{summary}</span>}
                      <span className="deck-row__chevron">
                        <ChevronDownIcon />
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
