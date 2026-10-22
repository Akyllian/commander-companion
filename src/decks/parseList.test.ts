import { parseList } from './parseList'

const cards = (text: string) =>
  parseList(text).map((line) => (line.kind === 'card' ? [line.section, line.quantity, line.name, line.set, line.number] : ['invalid', line.source]))

describe('deck list parser (R3 §5.2)', () => {
  it.each([
    ['1 Sol Ring', [['main', 1, 'Sol Ring', null, null]]],
    ['12 Island', [['main', 12, 'Island', null, null]]],
    ['1x Sol Ring', [['main', 1, 'Sol Ring', null, null]]],
    ['2X Sol Ring', [['main', 2, 'Sol Ring', null, null]]],
    ['1 Sol Ring (CMM) 396', [['main', 1, 'Sol Ring', 'cmm', '396']]],
    ['1 Swords to Plowshares (PLST) LTR-14', [['main', 1, 'Swords to Plowshares', 'plst', 'LTR-14']]],
    ['1 Sol Ring (CMM) 396★', [['main', 1, 'Sol Ring', 'cmm', '396★']]],
    ['1 Fire // Ice', [['main', 1, 'Fire // Ice', null, null]]],
    ['   1   Sol   Ring   ', [['main', 1, 'Sol Ring', null, null]]],
    ['1\tSol Ring', [['main', 1, 'Sol Ring', null, null]]],
    ['﻿1 Sol Ring', [['main', 1, 'Sol Ring', null, null]]],
  ])('reads %j', (text, expected) => {
    expect(cards(text)).toEqual(expected)
  })

  it('ignores empty lines and accepts Windows line endings, keeping 1-based line numbers', () => {
    const lines = parseList('1 Sol Ring\r\n\r\n1 Arcane Signet\r\n')
    expect(lines.map((line) => line.line)).toEqual([1, 3])
  })

  it.each(['Commander', 'commander', 'COMMANDER:', '[Commander]', '[commander]:'])('treats %j as the commander heading', (heading) => {
    expect(cards(`${heading}\n1 Zimone, Infinite Analyst`)).toEqual([['commander', 1, 'Zimone, Infinite Analyst', null, null]])
  })

  it('reads Mainboard as the drawable list and keeps lines before any heading in it', () => {
    expect(cards('1 Sol Ring\nMainboard\n1 Arcane Signet')).toEqual([
      ['main', 1, 'Sol Ring', null, null],
      ['main', 1, 'Arcane Signet', null, null],
    ])
  })

  it.each(['Sideboard', 'Maybeboard', 'Considering', '[Sideboard]', 'maybeboard:'])('keeps %j lines as excluded, with their section name', (heading) => {
    const [line] = parseList(`${heading}\n1 Pithing Needle`)
    expect(line).toMatchObject({ kind: 'card', section: 'excluded', quantity: 1, name: 'Pithing Needle' })
    expect(line.kind === 'card' && line.sectionName).toBe(heading.replace(/[[\]:]/g, '').replace(/^./, (first) => first.toUpperCase()))
  })

  it('keeps two printings of the same name as two lines (Review Focus 4)', () => {
    expect(cards('1 Sol Ring (CMM) 396\n1 Sol Ring')).toEqual([
      ['main', 1, 'Sol Ring', 'cmm', '396'],
      ['main', 1, 'Sol Ring', null, null],
    ])
  })

  it.each(['0 Sol Ring', 'Sol Ring', '1', 'x Sol Ring', '100 Island', '1 Sol Ring (C) 3', '// comment'])('keeps %j as an invalid line, never guessing', (text) => {
    expect(cards(text)).toEqual([['invalid', text]])
  })

  it('keeps the original text and line number of every line', () => {
    const lines = parseList('Commander\n1 Zimone\n\nwhat is this\n2x Island')
    expect(lines).toEqual([
      { kind: 'card', section: 'commander', sectionName: 'Commander', quantity: 1, name: 'Zimone', set: null, number: null, source: '1 Zimone', line: 2 },
      { kind: 'invalid', source: 'what is this', line: 4 },
      { kind: 'card', section: 'commander', sectionName: 'Commander', quantity: 2, name: 'Island', set: null, number: null, source: '2x Island', line: 5 },
    ])
  })
})
