import { useDecksContext } from '../decks/ui/DecksContext'
import { DeckLibrary } from '../decks/ui/DeckLibrary'
import { ImportDeck } from '../decks/ui/ImportDeck'
import { useDeckRoute } from '../decks/ui/useDeckRoute'

/** Mazzi (R3): the library, the import and each deck, under `#mazzi/…`. */
export function DecksScreen() {
  const { decks, cards, store, reload } = useDecksContext()
  const { route, go } = useDeckRoute()

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
  return null
}
