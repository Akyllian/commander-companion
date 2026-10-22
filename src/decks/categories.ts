import type { CardData } from '../media/scryfall'
import type { DeckRecord } from './model'

/**
 * Descriptive deck categories (R3 §7.2, D-040): a fixed, deterministic matrix over the English
 * type line and oracle text, never a model or a judgement. A card can be in several categories;
 * «Non classificate» only when no other matches. The regexes are the plan's normative matrix.
 */

export const CATEGORIES = ['lands', 'ramp', 'draw', 'targeted', 'sweepers', 'protection', 'tutors', 'recursion', 'wincons', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  lands: 'Terre',
  ramp: 'Accelerazione',
  draw: 'Pescata e selezione',
  targeted: 'Interazione mirata',
  sweepers: 'Rimozioni globali',
  protection: 'Protezione',
  tutors: 'Tutor',
  recursion: 'Recupero dal cimitero',
  wincons: 'Condizioni di vittoria',
  other: 'Non classificate',
}

type CategorySource = Pick<CardData, 'name' | 'typeLine' | 'oracleText'>

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Lowercase, reminder text removed, own names replaced by `cardname`, whitespace collapsed. */
function normalise(card: CategorySource): { o: string; t: string } {
  let o = card.oracleText.toLowerCase().replace(/[‘’]/g, "'").replace(/\([^)]*\)/g, ' ')
  const names = [card.name, ...card.name.split(' // ')].map((name) => name.toLowerCase().replace(/[‘’]/g, "'"))
  for (const name of names.toSorted((left, right) => right.length - left.length)) {
    o = o.replace(new RegExp(escape(name), 'g'), 'cardname')
  }
  return { o: o.replace(/\s+/g, ' ').trim(), t: card.typeLine.toLowerCase() }
}

const any = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text))

const LIBRARY_SEARCH = 'search your library(?: and/or graveyard)? for'
const LAND_WORDS = '(?:basic|land|forest|plains|island|swamp|mountain|snow)'

const RULES: Array<{ category: Exclude<Category, 'other'>; test: (o: string, t: string) => boolean }> = [
  { category: 'lands', test: (_o, t) => /\bland\b/.test(t) },
  {
    category: 'ramp',
    test: (o, t) =>
      !/\bland\b/.test(t) &&
      any(o, [
        /\badd (\{|one mana|two mana|three mana|x mana|an amount of)/,
        new RegExp(`${LIBRARY_SEARCH} [^.]*?(basic land|land card|forest|plains|island|swamp|mountain)[^.]*onto the battlefield`),
        /you may play an additional land/,
        /put a land card from your hand onto the battlefield/,
      ]),
  },
  {
    category: 'draw',
    test: (o) =>
      any(o, [
        /\bdraws? (a|an|one|two|three|four|five|six|seven|x|that many) cards?\b/,
        /\b(scry|surveil) (\d+|x)\b/,
        /\blook at the top (\w+ )?cards? of your library\b/,
        /\binvestigate\b/,
      ]),
  },
  {
    category: 'targeted',
    test: (o) =>
      any(o, [
        /\b(destroy|exile) target\b/,
        /\bcounter target (spell|activated|triggered|noncreature|creature)/,
        /\breturn target [^.]*? to (its|their) owner'?s'? hand/,
        /\bdeals? (\d+|x) damage to (any target|target creature|target planeswalker)/,
        /\btarget creature gets -(\d+|x)\/-/,
      ]),
  },
  {
    category: 'sweepers',
    test: (o) =>
      any(o, [
        /\b(destroy|exile) all\b/,
        /\breturn all [^.]*? to (their|its) owners'? hands?/,
        /\ball creatures get -(\d+|x)\/-/,
        /\bdeals? (\d+|x) damage to each creature\b/,
        /\beach player sacrifices (all|each)\b/,
      ]),
  },
  {
    category: 'protection',
    // Granted protection only: a creature's own keyword line ("trample, hexproof") does not count.
    test: (o) => any(o, [/\b(gains?|have|has) [^.]*?\b(hexproof|indestructible|shroud|protection from|ward)\b/, /\bphases? out\b/]),
  },
  {
    category: 'tutors',
    // Searching for lands is ramp, not a tutor.
    test: (o) => new RegExp(`${LIBRARY_SEARCH} (a|an|up to (one|two|three|x)) (?!${LAND_WORDS}\\b)`).test(o),
  },
  {
    category: 'recursion',
    test: (o) =>
      any(o, [
        /from (your|a|their) graveyards? (to|onto) (your hand|the battlefield)/,
        /\b(play|cast) [^.]*? from your graveyard/,
        /\b(flashback|unearth|escape|retrace|disturb|jump-start)\b/,
      ]),
  },
  {
    category: 'wincons',
    // An overrun ends "until end of turn"; a static anthem does not.
    test: (o) =>
      any(o, [
        /\byou win the game\b/,
        /\b(each opponent|target player|that player) loses the game\b/,
        /creatures you control (gain [^.]*? and )?get \+(\d+|x)\/\+(\d+|x)[^.]*until end of turn/,
      ]),
  },
]

export function categorize(card: CategorySource): Category[] {
  const { o, t } = normalise(card)
  const matched: Category[] = RULES.filter((rule) => rule.test(o, t)).map((rule) => rule.category)
  return matched.length > 0 ? matched : ['other']
}

/** Copies per category, without the commanders and without cards whose data is unknown. */
export function categoryCounts(
  deck: Pick<DeckRecord, 'cards' | 'commanders'>,
  cards: Map<string, CategorySource>,
): Array<{ category: Category; count: number; cardIds: string[] }> {
  const commanders = new Set(deck.commanders)
  const counts = new Map<Category, { count: number; cardIds: string[] }>()
  for (const entry of deck.cards) {
    const card = cards.get(entry.cardId)
    if (!card || commanders.has(entry.cardId)) continue
    for (const category of categorize(card)) {
      const current = counts.get(category) ?? { count: 0, cardIds: [] }
      current.count += entry.quantity
      current.cardIds.push(entry.cardId)
      counts.set(category, current)
    }
  }
  return CATEGORIES.filter((category) => counts.has(category)).map((category) => ({ category, ...(counts.get(category) as { count: number; cardIds: string[] }) }))
}
