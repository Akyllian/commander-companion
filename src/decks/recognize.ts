import { foldName } from '../media/scryfall'
import type { CardData, CollectionIdentifier } from '../media/scryfall'
import type { ParsedLine } from './parseList'

type CardLine = Extract<ParsedLine, { kind: 'card' }>

export interface Recognition {
  matched: Array<{ line: CardLine; card: CardData }>
  /** Several printings answer the name: the player chooses («Scegli una corrispondenza»). */
  ambiguous: Array<{ line: CardLine; options: CardData[] }>
  missing: CardLine[]
  /** Sideboard, Maybeboard and Considering lines: shown, never saved. */
  excluded: CardLine[]
  invalid: ParsedLine[]
}

interface Dependencies {
  fetchCollection: (identifiers: CollectionIdentifier[]) => Promise<{ found: CardData[]; notFound: unknown[] }>
  searchLocalized: (name: string) => Promise<CardData[]>
}

const printingKey = (set: string, number: string) => `${set.toLowerCase()}|${number}`

/** Every name a card answers to: the full name and each face's. */
const namesOf = (card: CardData) => [card.name, ...card.name.split(' // ')].map(foldName)

/**
 * Identifies the pasted lines (R3 §5.2–5.4), with as few requests as possible: printings first,
 * then every remaining distinct name in one collection request, then one exact multilingual
 * search per name still unknown. A network error stops everything; the caller keeps the text.
 */
export async function recognize(lines: ParsedLine[], deps: Dependencies): Promise<Recognition> {
  const result: Recognition = { matched: [], ambiguous: [], missing: [], excluded: [], invalid: [] }
  const wanted: CardLine[] = []
  for (const line of lines) {
    if (line.kind === 'invalid') result.invalid.push(line)
    else if (line.section === 'excluded') result.excluded.push(line)
    else wanted.push(line)
  }

  const byLine = new Map<CardLine, CardData>()
  const printed = wanted.filter((line) => line.set && line.number)
  if (printed.length > 0) {
    const { found } = await deps.fetchCollection(printed.map((line) => ({ set: line.set as string, collector_number: line.number as string })))
    const byPrinting = new Map(found.map((card) => [printingKey(card.set, card.number), card]))
    for (const line of printed) {
      const card = byPrinting.get(printingKey(line.set as string, line.number as string))
      if (card) byLine.set(line, card)
    }
  }

  const byName = wanted.filter((line) => !byLine.has(line))
  const names = new Map<string, string>()
  for (const line of byName) if (!names.has(foldName(line.name))) names.set(foldName(line.name), line.name)
  if (names.size > 0) {
    const { found } = await deps.fetchCollection([...names.values()].map((name) => ({ name })))
    const known = new Map<string, CardData>()
    for (const card of found) for (const name of namesOf(card)) if (!known.has(name)) known.set(name, card)
    for (const line of byName) {
      const card = known.get(foldName(line.name))
      if (card) byLine.set(line, card)
    }
  }

  // Localized or unknown names: one exact multilingual search each, asked once per name.
  const localized = new Map<string, CardData[]>()
  for (const line of wanted) {
    const card = byLine.get(line)
    if (card) {
      result.matched.push({ line, card })
      continue
    }
    const key = foldName(line.name)
    if (!localized.has(key)) localized.set(key, await deps.searchLocalized(line.name))
    const options = localized.get(key) as CardData[]
    if (options.length === 1) result.matched.push({ line, card: options[0] })
    else if (options.length > 1) result.ambiguous.push({ line, options })
    else result.missing.push(line)
  }
  return result
}
