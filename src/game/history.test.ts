import { createGame } from './game'
import { createHistory, getGroupDelta, GROUP_WINDOW_MS, HISTORY_LIMIT, historyReducer } from './history'
import type { History } from './history'

// Spaced beyond the grouping window: each tap is its own step.
let clock = 0
const lifeUpAction = { type: 'adjust-life', playerId: 'player-1', amount: 1 } as const
const lifeUpAt = () => ({ type: 'apply', action: lifeUpAction, at: (clock += 10_000) }) as const
const life = (history: History) => history.present.players[0].life

describe('historyReducer', () => {
  it('records changes and supports undo and redo', () => {
    let history = createHistory(createGame(2))
    history = historyReducer(history, lifeUpAt())
    history = historyReducer(history, lifeUpAt())
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
      at: 0,
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
    let history = historyReducer(createHistory(createGame(2)), lifeUpAt())
    history = historyReducer(history, { type: 'undo' })
    history = historyReducer(history, {
      type: 'apply',
      at: (clock += 10_000),
      action: { type: 'adjust-life', playerId: 'player-1', amount: -1 },
    })
    expect(history.future).toEqual([])
    expect(life(history)).toBe(39)
  })

  it(`keeps at most ${HISTORY_LIMIT} undo steps`, () => {
    let history = createHistory(createGame(2))
    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, lifeUpAt())
    expect(history.past).toHaveLength(HISTORY_LIMIT)

    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, { type: 'undo' })
    expect(life(history)).toBe(45)

    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) history = historyReducer(history, { type: 'redo' })
    expect(life(history)).toBe(40 + HISTORY_LIMIT + 5)
    expect(history.past).toHaveLength(HISTORY_LIMIT)
  })

  it('clears every step when the game is replaced', () => {
    const history = historyReducer(createHistory(createGame(2)), lifeUpAt())
    const replaced = historyReducer(history, { type: 'replace', game: createGame(3) })
    expect(replaced).toEqual(createHistory(createGame(3)))
    expect(replaced.group).toBeNull()
  })

  it('records a game from another tab as an undoable step', () => {
    const history = createHistory(createGame(2))
    const remote = historyReducer(history, lifeUpAt()).present

    const synced = historyReducer(history, { type: 'external', game: remote })
    expect(synced.present).toBe(remote)
    expect(historyReducer(synced, { type: 'undo' }).present).toBe(history.present)
  })

  it('ignores an external game equal to the current one', () => {
    const history = createHistory(createGame(2))
    expect(historyReducer(history, { type: 'external', game: createGame(2) })).toBe(history)
  })
})

describe('grouping rapid taps (UX decision 3)', () => {
  const tap = (amount: number, at: number, playerId = 'player-1') =>
    ({ type: 'apply', at, action: { type: 'adjust-life', playerId, amount } }) as const

  it('merges same-direction taps within the window into one undo step', () => {
    let history = createHistory(createGame(2))
    for (const at of [0, 500, 1100, 1700]) history = historyReducer(history, tap(1, at))

    expect(life(history)).toBe(44)
    expect(history.past).toHaveLength(1)
    expect(getGroupDelta(history)).toEqual({ target: { kind: 'life', playerId: 'player-1' }, delta: 4, at: 1700 })

    history = historyReducer(history, { type: 'undo' })
    expect(life(history)).toBe(40)
    expect(getGroupDelta(history)).toBeNull()
  })

  it.each([
    ['time passes', tap(1, GROUP_WINDOW_MS + 1)],
    ['direction changes', tap(-1, 100)],
    ['player changes', tap(1, 100, 'player-2')],
    [
      'counter changes',
      {
        type: 'apply',
        at: 100,
        action: { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: 1 },
      } as const,
    ],
  ])('starts a new step when %s', (_label, next) => {
    let history = historyReducer(createHistory(createGame(2)), tap(1, 0))
    history = historyReducer(history, next)
    expect(history.past).toHaveLength(2)
  })

  it('groups Commander damage per commander and reports the cumulative delta', () => {
    let state = createHistory(createGame(2))
    state = historyReducer(state, { type: 'apply', action: { type: 'set-partner', playerId: 'player-2', hasPartner: true }, at: 0 })
    const hit = (commander: 0 | 1, at: number) =>
      historyReducer(state, {
        type: 'apply',
        at,
        action: { type: 'adjust-commander-damage', playerId: 'player-1', sourcePlayerId: 'player-2', commander, amount: 1 },
      })
    state = hit(1, 10)
    state = hit(1, 20)
    expect(state.past).toHaveLength(2)
    expect(getGroupDelta(state)?.delta).toBe(2)
    state = hit(0, 30)
    expect(state.past).toHaveLength(3)
  })

  it('reports counter deltas and never groups untyped actions', () => {
    let history = createHistory(createGame(2))
    const poison = (at: number) =>
      historyReducer(history, {
        type: 'apply',
        at,
        action: { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: 1 },
      })
    history = poison(0)
    history = poison(100)
    expect(getGroupDelta(history)).toMatchObject({ target: { kind: 'counter', counter: 'poison' }, delta: 2 })

    history = historyReducer(history, { type: 'apply', at: 150, action: { type: 'rename-player', playerId: 'player-1', name: 'A' } })
    history = historyReducer(history, { type: 'apply', at: 160, action: { type: 'rename-player', playerId: 'player-1', name: 'B' } })
    expect(getGroupDelta(history)).toBeNull()
    expect(history.past).toHaveLength(3)
  })

  it('keeps the group open across a tap that changes nothing', () => {
    let history = historyReducer(createHistory(createGame(2)), tap(-1, 0))
    const unchanged = historyReducer(history, {
      type: 'apply',
      at: 100,
      action: { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: -1 },
    })
    expect(unchanged).toBe(history)
    history = historyReducer(history, tap(-1, 200))
    expect(history.past).toHaveLength(1)
  })

  it('closes the group on redo, replace and external changes', () => {
    let history = historyReducer(createHistory(createGame(2)), tap(1, 0))
    history = historyReducer(history, { type: 'undo' })
    history = historyReducer(history, { type: 'redo' })
    expect(getGroupDelta(history)).toBeNull()
    expect(historyReducer(history, { type: 'replace', game: createGame(2) }).group).toBeNull()
    const remote = historyReducer(history, tap(5, 1)).present
    expect(historyReducer(historyReducer(history, tap(1, 2)), { type: 'external', game: remote }).group).toBeNull()
  })
})

describe('grouping frequent scores (D-033)', () => {
  const partnerGame = () => {
    let history = createHistory(createGame(2))
    history = historyReducer(history, {
      type: 'apply',
      at: 0,
      action: { type: 'set-partner', playerId: 'player-1', hasPartner: true },
    })
    return history
  }
  const taxTap = (history: History, commander: 0 | 1, amount: number, at: number) =>
    historyReducer(history, { type: 'apply', at, action: { type: 'adjust-commander-tax', playerId: 'player-1', commander, amount } })

  it('groups same-slot tax taps and reports the cumulative tax delta', () => {
    let history = partnerGame()
    history = taxTap(history, 0, 2, 100_000)
    history = taxTap(history, 0, 2, 100_300)
    expect(history.present.players[0].commanderTax).toEqual([4, 0])
    expect(getGroupDelta(history)).toEqual({
      target: { kind: 'commander-tax', playerId: 'player-1', commander: 0 },
      delta: 4,
      at: 100_300,
    })
    expect(historyReducer(history, { type: 'undo' }).present.players[0].commanderTax).toEqual([0, 0])
  })

  it('keeps different tax slots and directions in separate undo steps', () => {
    let history = partnerGame()
    history = taxTap(history, 0, 2, 100_000)
    history = taxTap(history, 1, 2, 100_100)
    history = taxTap(history, 1, -2, 100_200)
    expect(history.past).toHaveLength(4)
  })

  it('groups rad taps like any other counter', () => {
    let history = createHistory(createGame(2))
    for (const at of [0, 200, 400]) {
      history = historyReducer(history, {
        type: 'apply',
        at,
        action: { type: 'adjust-counter', playerId: 'player-2', counter: 'rad', amount: 1 },
      })
    }
    expect(history.past).toHaveLength(1)
    expect(getGroupDelta(history)?.delta).toBe(3)
  })

  it('records each table-role transfer as its own step', () => {
    let history = createHistory(createGame(3))
    for (const [at, playerId] of [[0, 'player-1'], [100, 'player-2'], [200, 'player-3']] as const) {
      history = historyReducer(history, { type: 'apply', at, action: { type: 'set-table-role', role: 'monarch', playerId } })
    }
    expect(history.past).toHaveLength(3)
    expect(history.group).toBeNull()
  })
})
