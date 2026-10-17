import { createGame } from './game'
import { createHistory, HISTORY_LIMIT, historyReducer } from './history'
import type { History } from './history'

const lifeUp = { type: 'apply', action: { type: 'adjust-life', playerId: 'player-1', amount: 1 } } as const
const life = (history: History) => history.present.players[0].life

describe('historyReducer', () => {
  it('records changes and supports undo and redo', () => {
    let history = createHistory(createGame(2))
    history = historyReducer(history, lifeUp)
    history = historyReducer(history, lifeUp)
    expect(life(history)).toBe(42)

    history = historyReducer(history, { type: 'undo' })
    expect(life(history)).toBe(41)
    history = historyReducer(history, { type: 'redo' })
    expect(life(history)).toBe(42)
  })

  it('does not record actions that change nothing', () => {
    const history = createHistory(createGame(2))
    const next = historyReducer(history, {
      type: 'apply',
      action: { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: -1 },
    })
    expect(next).toBe(history)
  })

  it('returns the same history when there is nothing to undo or redo', () => {
    const history = createHistory(createGame(2))
    expect(historyReducer(history, { type: 'undo' })).toBe(history)
    expect(historyReducer(history, { type: 'redo' })).toBe(history)
  })

  it('discards the redo branch after a new action', () => {
    let history = historyReducer(createHistory(createGame(2)), lifeUp)
    history = historyReducer(history, { type: 'undo' })
    history = historyReducer(history, {
      type: 'apply',
      action: { type: 'adjust-life', playerId: 'player-1', amount: -1 },
    })
    expect(history.future).toEqual([])
    expect(life(history)).toBe(39)
  })

  it(`keeps at most ${HISTORY_LIMIT} undo steps`, () => {
    let history = createHistory(createGame(2))
    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, lifeUp)
    expect(history.past).toHaveLength(HISTORY_LIMIT)

    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, { type: 'undo' })
    expect(life(history)).toBe(45)

    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, { type: 'redo' })
    expect(life(history)).toBe(40 + HISTORY_LIMIT + 5)
    expect(history.past).toHaveLength(HISTORY_LIMIT)
  })

  it('clears every step when the game is replaced', () => {
    const history = historyReducer(createHistory(createGame(2)), lifeUp)
    const replaced = historyReducer(history, { type: 'replace', game: createGame(3) })
    expect(replaced).toEqual(createHistory(createGame(3)))
  })

  it('records a game from another tab as an undoable step', () => {
    const history = createHistory(createGame(2))
    const remote = historyReducer(history, lifeUp).present

    const synced = historyReducer(history, { type: 'external', game: remote })
    expect(synced.present).toBe(remote)
    expect(historyReducer(synced, { type: 'undo' }).present).toBe(history.present)
  })

  it('ignores an external game equal to the current one', () => {
    const history = createHistory(createGame(2))
    expect(historyReducer(history, { type: 'external', game: createGame(2) })).toBe(history)
  })
})
