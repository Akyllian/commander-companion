import { createGame, gameReducer, isPlayerDefeated } from './game'

describe('Commander game reducer', () => {
  it('creates between two and four players at 40 life', () => {
    expect(createGame(1).players).toHaveLength(2)
    expect(createGame(5).players).toHaveLength(4)
    expect(createGame(3).players.map((player) => player.life)).toEqual([40, 40, 40])
  })

  it('allows life below zero while clamping poison at zero', () => {
    const initial = createGame(2)
    const damaged = gameReducer(initial, {
      type: 'adjust-life',
      playerId: initial.players[0].id,
      amount: -45,
    })
    const cured = gameReducer(damaged, {
      type: 'adjust-counter',
      playerId: initial.players[0].id,
      counter: 'poison',
      amount: -1,
    })

    expect(cured.players[0].life).toBe(-5)
    expect(cured.players[0].poison).toBe(0)
  })

  it('tracks Commander damage by source and detects 21 damage', () => {
    const initial = createGame(3)
    const target = initial.players[0]
    const source = initial.players[1]
    const next = gameReducer(initial, {
      type: 'adjust-commander-damage',
      playerId: target.id,
      sourcePlayerId: source.id,
      amount: 21,
    })

    expect(next.players[0].commanderDamage[source.id]).toBe(21)
    expect(isPlayerDefeated(next.players[0])).toBe(true)
  })

  it('resets counters but preserves player identity', () => {
    const initial = createGame(2)
    const renamed = gameReducer(initial, {
      type: 'rename-player',
      playerId: initial.players[0].id,
      name: 'Liliana',
    })
    const damaged = gameReducer(renamed, {
      type: 'adjust-life',
      playerId: initial.players[0].id,
      amount: -12,
    })
    const reset = gameReducer(damaged, { type: 'reset-game' })

    expect(reset.players[0]).toMatchObject({
      id: initial.players[0].id,
      name: 'Liliana',
      life: 40,
      poison: 0,
      energy: 0,
      experience: 0,
      commanderDamage: {},
    })
  })

  it('removes Commander damage references when a player leaves', () => {
    const initial = createGame(3)
    const sourceId = initial.players[2].id
    const damaged = gameReducer(initial, {
      type: 'adjust-commander-damage',
      playerId: initial.players[0].id,
      sourcePlayerId: sourceId,
      amount: 8,
    })
    const next = gameReducer(damaged, { type: 'remove-player', playerId: sourceId })

    expect(next.players).toHaveLength(2)
    expect(next.players[0].commanderDamage[sourceId]).toBeUndefined()
  })
})
