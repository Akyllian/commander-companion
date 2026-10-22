import { useDecksContext } from '../decks/ui/DecksContext'
import { DeckLibrary } from '../decks/ui/DeckLibrary'
import { DeckDetail } from '../decks/ui/DeckDetail'
import { ImportDeck } from '../decks/ui/ImportDeck'
import { useDeckRoute } from '../decks/ui/useDeckRoute'

/** Mazzi (R3): the library, the import and each deck, under `#mazzi/…`. */
export function DecksScreen() {
  const { decks, cards, store, reload } = useDecksContext()
  const { route, go, setTab } = useDeckRoute()

  if (decks === null || cards === null || store === null) {
    return (
      <div className="screen decks-screen">
        <h1 tabIndex={-1}>Mazzi</h1>
        <p className="decks-none">I mazzi non sono leggibili su questo dispositivo.</p>
      </div>
    )
  }

  if (route.view === 'library') {
    return <DeckLibrary decks={decks} cards={cards} onOpen={(deckId) => go({ view: 'deck', deckId, tab: 'panoramica' })} onImport={() => go({ view: 'import' })} />
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
  return (
    <DeckDetail
      deck={deck}
      cards={cards}
      store={store}
      tab={route.tab}
      onTab={setTab}
      onBack={() => go({ view: 'library' })}
      onChanged={reload}
      onOpenDeck={(deckId) => go({ view: 'deck', deckId, tab: 'panoramica' })}
      linkedTo={null}
      onLink={() => undefined}
    />
  )
}
