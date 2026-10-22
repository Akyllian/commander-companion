/**
 * The pasted list (R3 §5.2): `quantity name`, optionally `(SET) number`, under optional section
 * headings. Lines that do not fit are kept as invalid, never guessed or dropped, so Verifica can
 * show them next to their original text.
 */

export type ParsedSection = 'commander' | 'main' | 'excluded'

export type ParsedLine =
  | {
      kind: 'card'
      section: ParsedSection
      /** The heading the line sits under, as written in canonical case, or null before any heading. */
      sectionName: string | null
      quantity: number
      name: string
      /** Lowercase set code and collector number, when the line names a printing. */
      set: string | null
      number: string | null
      source: string
      line: number
    }
  | { kind: 'invalid'; source: string; line: number }

/** Headings, any case, optionally in brackets and with a trailing colon. */
const HEADINGS: Record<string, { section: ParsedSection; name: string }> = {
  commander: { section: 'commander', name: 'Commander' },
  mainboard: { section: 'main', name: 'Mainboard' },
  sideboard: { section: 'excluded', name: 'Sideboard' },
  maybeboard: { section: 'excluded', name: 'Maybeboard' },
  considering: { section: 'excluded', name: 'Considering' },
}

const HEADING = /^\[?([a-z]+)\]?:?$/i
const CARD = /^(\d{1,2})x? (.+?)(?: \(([a-z0-9]{2,6})\) ([a-z0-9★-]+))?$/i

export function parseList(text: string): ParsedLine[] {
  let section: ParsedSection = 'main'
  let sectionName: string | null = null
  const result: ParsedLine[] = []
  text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .forEach((raw, index) => {
      const source = raw.trim()
      const line = index + 1
      if (!source) return
      const normal = source.replace(/\s+/g, ' ')
      const heading = HEADING.exec(normal)
      const known = heading && HEADINGS[heading[1].toLowerCase()]
      if (known) {
        section = known.section
        sectionName = known.name
        return
      }
      const card = CARD.exec(normal)
      const quantity = card ? Number(card[1]) : 0
      // Card names never contain parentheses: such a line is a printing we could not read.
      if (!card || quantity < 1 || /[()]/.test(card[2])) {
        result.push({ kind: 'invalid', source, line })
        return
      }
      result.push({
        kind: 'card',
        section,
        sectionName,
        quantity,
        name: card[2],
        set: card[3] ? card[3].toLowerCase() : null,
        number: card[4] ?? null,
        source,
        line,
      })
    })
  return result
}
