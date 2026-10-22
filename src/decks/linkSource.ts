import type { CommanderArt, DeckLinkSource, GameState } from '../game/types'
import type { CardData } from '../media/scryfall'
import type { DeckStore } from './deckStore'
import type { DeckRecord } from './model'

const toArt = (card: CardData): CommanderArt => ({ cardId: card.cardId, name: card.name, artist: card.artist })

/** The commander(s) a linked deck gives a seat, or null when their card data is unknown. */
export function deckLinkSource(deck: DeckRecord, cards: Map<string, CardData>): DeckLinkSource | null {
  const [first, second] = deck.commanders
  const main = cards.get(first)
  const partner = second ? cards.get(second) : null
  if (!main || partner === undefined) return null
  return { commanders: [toArt(main), partner ? toArt(partner) : null], hasPartner: partner !== null }
}

/** Every deck linked in a game, resolved before a new game replaces it (plan fix 3); a deleted deck is null. */
export function resolveLinkSources(game: GameState, decks: DeckRecord[], cards: Map<string, CardData>): Map<string, DeckLinkSource | null> {
  const resolved = new Map<string, DeckLinkSource | null>()
  for (const player of game.players) {
    if (!player.deck || resolved.has(player.deck.deckId)) continue
    const deck = decks.find((entry) => entry.id === player.deck?.deckId)
    resolved.set(player.deck.deckId, deck ? deckLinkSource(deck, cards) : null)
  }
  return resolved
}

/**
 * Like resolveLinkSources, but read from the deck store itself (R3 review fix 3): the screen's
 * snapshot may lag behind an edit. Without a readable store every link is unknown, so the new game
 * keeps the commanders already applied.
 */
export async function readLinkSources(game: GameState, store: DeckStore | null): Promise<Map<string, DeckLinkSource | null>> {
  const ids = [...new Set(game.players.flatMap((player) => (player.deck ? [player.deck.deckId] : [])))]
  try {
    if (!store) throw new Error('no deck store')
    const decks = (await Promise.all(ids.map((id) => store.getDeck(id)))).filter((deck): deck is DeckRecord => deck !== null)
    const cards = await store.getCards(decks.flatMap((deck) => deck.commanders.filter((cardId): cardId is string => cardId !== null)))
    return resolveLinkSources(game, decks, cards)
  } catch {
    return resolveLinkSources(game, [], new Map())
  }
}
