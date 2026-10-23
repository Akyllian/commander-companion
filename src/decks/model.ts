/**
 * A saved deck (R3, D-040): the list, its commander(s), owner, notes and key cards. Card data and
 * art live in their own stores; a deck only references cards by Scryfall id. Every invariant is
 * checked by `parseDeck`, which treats stored data as unknown input.
 */

export interface CardRef {
  cardId: string
  name: string
  artist: string
}

/** One line of the list: a printing and how many copies. */
export interface DeckCard {
  cardId: string
  name: string
  quantity: number
  set: string | null
  number: string | null
}

export type DeckOwner = { kind: 'me' } | { kind: 'friend'; name: string }

/** Spec §12.1: complete, without every crop, or not prepared. */
export type OfflineState = 'complete' | 'partial' | 'incomplete'

export interface KeyCard {
  cardId: string
  note: string
}

export interface DeckRecord {
  version: 1
  id: string
  name: string
  owner: DeckOwner
  /** Card ids of the commander and, with Partner, the second commander; both in `cards`. */
  commanders: [string, string | null]
  cards: DeckCard[]
  /** Original lines saved without a match: shown, never counted or drawn. */
  unrecognized: string[]
  notes: string
  keyCards: KeyCard[]
  createdAt: number
  updatedAt: number
  offline: OfflineState
}

export const DECK_NAME_MAX = 60
export const OWNER_NAME_MAX = 28
export const MAX_QUANTITY = 99
export const MAX_KEY_CARDS = 8
export const KEY_NOTE_MAX = 140
export const NOTES_MAX = 10_000
const CARD_NAME_MAX = 200
const OFFLINE_STATES: OfflineState[] = ['complete', 'partial', 'incomplete']
const CARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** A save that would leave a deck without its commander: the UI must ask for a replacement. */
export class CommanderMissingError extends Error {
  constructor() {
    super('The commander is not in the list')
    this.name = 'CommanderMissingError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Non-empty, already trimmed and at most `max` code points. */
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim() && Array.from(value).length <= max

export const isCardId = (value: unknown): value is string => typeof value === 'string' && CARD_ID.test(value)

const isOptionalText = (value: unknown) => value === null || isText(value, 20)

function isDeckCard(value: unknown): value is DeckCard {
  if (!isRecord(value)) return false
  const { cardId, name, quantity, set, number } = value
  return (
    isCardId(cardId) &&
    isText(name, CARD_NAME_MAX) &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= MAX_QUANTITY &&
    isOptionalText(set) &&
    isOptionalText(number)
  )
}

function isOwner(value: unknown): value is DeckOwner {
  if (!isRecord(value)) return false
  if (value.kind === 'me') return true
  return value.kind === 'friend' && isText(value.name, OWNER_NAME_MAX)
}

export function parseDeck(value: unknown): DeckRecord | null {
  if (!isRecord(value) || value.version !== 1) return null
  const { id, name, owner, commanders, cards, unrecognized, notes, keyCards, createdAt, updatedAt, offline } = value
  if (!isText(id, 64) || !isText(name, DECK_NAME_MAX) || !isOwner(owner)) return null
  if (!Array.isArray(cards) || !cards.every(isDeckCard)) return null
  const ids = new Set(cards.map((entry) => entry.cardId))
  if (!Array.isArray(commanders) || commanders.length !== 2) return null
  const [first, second] = commanders
  if (!isCardId(first) || !ids.has(first)) return null
  if (second !== null && (!isCardId(second) || second === first || !ids.has(second))) return null
  if (!Array.isArray(unrecognized) || !unrecognized.every((line) => typeof line === 'string')) return null
  if (typeof notes !== 'string' || notes.length > NOTES_MAX) return null
  if (!Array.isArray(keyCards) || keyCards.length > MAX_KEY_CARDS) return null
  const keyIds = new Set<string>()
  for (const key of keyCards) {
    if (!isRecord(key) || !isCardId(key.cardId) || !ids.has(key.cardId) || keyIds.has(key.cardId)) return null
    if (typeof key.note !== 'string' || Array.from(key.note).length > KEY_NOTE_MAX) return null
    keyIds.add(key.cardId)
  }
  if (typeof createdAt !== 'number' || typeof updatedAt !== 'number') return null
  if (!OFFLINE_STATES.includes(offline as OfflineState)) return null
  return value as unknown as DeckRecord
}

export const totalCards = (deck: DeckRecord) => deck.cards.reduce((sum, entry) => sum + entry.quantity, 0)

/** The library a test hand draws from: every copy, minus one copy of each commander (spec §5.4). */
export function drawablePool(deck: DeckRecord): string[] {
  const commanders = new Set(deck.commanders.filter((cardId): cardId is string => cardId !== null))
  return deck.cards.flatMap((entry) => {
    const copies = commanders.has(entry.cardId) ? entry.quantity - 1 : entry.quantity
    return Array.from({ length: copies }, () => entry.cardId)
  })
}

/**
 * Applies a new list. Key cards no longer listed are removed with it (spec §8.2); a list without
 * a commander is refused, so no deck is ever saved with a dangling reference.
 */
export function withListChange(deck: DeckRecord, cards: DeckCard[], now: number): { deck: DeckRecord; removedKeyCards: string[] } {
  const ids = new Set(cards.map((entry) => entry.cardId))
  if (deck.commanders.some((cardId) => cardId !== null && !ids.has(cardId))) throw new CommanderMissingError()
  const removedKeyCards = deck.keyCards.filter((key) => !ids.has(key.cardId)).map((key) => key.cardId)
  return {
    deck: { ...deck, cards, keyCards: deck.keyCards.filter((key) => ids.has(key.cardId)), updatedAt: now },
    removedKeyCards,
  }
}
