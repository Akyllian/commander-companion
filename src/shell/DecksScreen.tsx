import { useState } from 'react'
import type { GameAction, PlayerState } from '../game/types'
import { deckLinkSource } from '../decks/linkSource'
import { useDecksContext } from '../decks/ui/DecksContext'
import { LinkToPlayer } from '../decks/ui/LinkToPlayer'
import { DeckLibrary } from '../decks/ui/DeckLibrary'
import { DeckDetail } from '../decks/ui/DeckDetail'
import { ImportDeck } from '../decks/ui/ImportDeck'
import { useDeckRoute } from '../decks/ui/useDeckRoute'

interface DecksScreenProps {
  /** The current match, for «Collega a un giocatore». */
  players: PlayerState[]
  dispatch: (action: GameAction) => void
}

/** Mazzi (R3): the library, the import and each deck, under `#mazzi/…`. */
export function DecksScreen({ players, dispatch }: DecksScreenProps) {
  const { status, decks, cards, store, reload } = useDecksContext()
  const { route, go, setTab } = useDeckRoute()
  const [linking, setLinking] = useState(false)

  if (status === 'loading') {
    return (
      <div className="screen decks-screen" aria-busy="true">
        <h1 tabIndex={-1}>Mazzi</h1>
        <p className="decks-none" role="status">
          Caricamento dei mazzi…
        </p>
      </div>
    )
  }
  if (decks === null || cards === null || store === null) {
    return (
      <div className="screen decks-screen">
        <h1 tabIndex={-1}>Mazzi</h1>
        <p className="decks-none">I mazzi non sono leggibili su questo dispositivo.</p>
      </div>
    )
  }

  if (route.view === 'library') {
    return (
      <DeckLibrary
        decks={decks}
        cards={cards}
        onOpen={(deckId) => go({ view: 'deck', deckId, tab: 'panoramica' })}
        onImport={() => go({ view: 'import' })}
      />
    )
  }
  if (route.view === 'import') {
    return (
      <ImportDeck
        store={store}
        onSaved={() => void reload()}
        onDone={(deckId) => go({ view: 'deck', deckId, tab: 'panoramica' })}
        onCancel={() => go({ view: 'library' })}
      />
    )
  }
  const deck = decks.find((entry) => entry.id === route.deckId)
  if (!deck) {
    return (
      <div className="screen decks-screen">
        <h1 tabIndex={-1}>Mazzo non disponibile</h1>
        <button type="button" className="quiet-button" onClick={() => go({ view: 'library' })}>
          Torna ai mazzi
        </button>
      </div>
    )
  }
  const linkedTo = players.find((player) => player.deck?.deckId === deck.id)?.name ?? null
  const source = deckLinkSource(deck, cards)
  return (
    <>
      <DeckDetail
        deck={deck}
        cards={cards}
        store={store}
        tab={route.tab}
        onTab={setTab}
        onBack={() => go({ view: 'library' })}
        onChanged={reload}
        onOpenDeck={(deckId) => go({ view: 'deck', deckId, tab: 'panoramica' })}
        linkedTo={linkedTo}
        onLink={() => setLinking(true)}
      />
      <LinkToPlayer
        open={linking}
        deckName={deck.name}
        players={players}
        deckNames={new Map(decks.map((entry) => [entry.id, entry.name]))}
        onClose={() => setLinking(false)}
        onLink={(playerId) => {
          if (source) dispatch({ type: 'link-deck', playerId, deckId: deck.id, ...source })
          setLinking(false)
        }}
      />
    </>
  )
}
