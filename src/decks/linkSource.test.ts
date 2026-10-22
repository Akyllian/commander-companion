import { createGame, gameReducer } from '../game/game'
import { deckLinkSource, resolveLinkSources } from './linkSource'
import { cardData, deckRecord, uuid } from './testing'

const cards = new Map([
  [uuid(1), cardData(1, { name: 'Zimone' })],
  [uuid(2), cardData(2, { name: 'Kraum' })],
])
const art = (n: number) => ({ cardId: uuid(n), name: cards.get(uuid(n))?.name, artist: `Artista ${n}` })

describe('deck link sources (R3 §11)', () => {
  it('turns a deck into the commanders a seat gets', () => {
    expect(deckLinkSource(deckRecord(), cards)).toEqual({ commanders: [art(1), null], hasPartner: false })
    expect(deckLinkSource(deckRecord({ commanders: [uuid(1), uuid(2)] }), cards)).toEqual({ commanders: [art(1), art(2)], hasPartner: true })
  })

  it('has no source when the commander data is missing', () => {
    expect(deckLinkSource(deckRecord({ commanders: [uuid(9), null] }), cards)).toBeNull()
    expect(deckLinkSource(deckRecord({ commanders: [uuid(1), uuid(9)] }), cards)).toBeNull()
  })

  it('resolves every link of a game, a deleted deck as null', () => {
    let game = gameReducer(createGame(3), { type: 'link-deck', playerId: 'player-1', deckId: 'a', commanders: [art(1) as never, null], hasPartner: false })
    game = gameReducer(game, { type: 'link-deck', playerId: 'player-2', deckId: 'gone', commanders: [art(2) as never, null], hasPartner: false })
    const resolved = resolveLinkSources(game, [deckRecord({ id: 'a' })], cards)
    expect([...resolved.entries()]).toEqual([
      ['a', { commanders: [art(1), null], hasPartner: false }],
      ['gone', null],
    ])
  })
})
