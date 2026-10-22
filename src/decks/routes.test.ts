import { DECK_TABS, deckHref, deckRouteFromHash } from './routes'

describe('deck routes (R3, plan Task 8)', () => {
  it.each([
    ['#mazzi', { view: 'library' }],
    ['#mazzi/', { view: 'library' }],
    ['#mazzi/importa', { view: 'import' }],
    ['#mazzi/abc', { view: 'deck', deckId: 'abc', tab: 'panoramica' }],
    ['#mazzi/abc/lista', { view: 'deck', deckId: 'abc', tab: 'lista' }],
    ['#mazzi/abc/mano', { view: 'deck', deckId: 'abc', tab: 'mano' }],
    ['#mazzi/abc/ignota', { view: 'deck', deckId: 'abc', tab: 'panoramica' }],
    ['#mazzi/a%20b', { view: 'deck', deckId: 'a b', tab: 'panoramica' }],
    ['#mazzi/%E0%A4%A', { view: 'library' }],
    ['', { view: 'library' }],
  ])('reads %j', (hash, route) => {
    expect(deckRouteFromHash(hash)).toEqual(route)
  })

  it('writes the address of every route, and reads it back', () => {
    expect(DECK_TABS).toEqual(['panoramica', 'lista', 'strategia', 'mano'])
    expect(deckHref({ view: 'library' })).toBe('#mazzi')
    expect(deckHref({ view: 'import' })).toBe('#mazzi/importa')
    expect(deckHref({ view: 'deck', deckId: 'a b', tab: 'panoramica' })).toBe('#mazzi/a%20b')
    expect(deckHref({ view: 'deck', deckId: 'abc', tab: 'strategia' })).toBe('#mazzi/abc/strategia')
    for (const tab of DECK_TABS) expect(deckRouteFromHash(deckHref({ view: 'deck', deckId: 'x', tab }))).toEqual({ view: 'deck', deckId: 'x', tab })
  })
})
