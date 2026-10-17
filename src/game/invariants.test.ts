import fc from 'fast-check'
import { COMMANDER_DAMAGE_LIMIT, COUNTER_MAX, createGame, gameReducer, LIFE_MAX, LIFE_MIN } from './game'
import { createHistory, historyReducer } from './history'
import { parseStoredGame } from './storage'
import type { GameAction, GameState } from './types'

const playerId = fc.constantFrom('player-1', 'player-2', 'player-3', 'player-4', 'ghost')
// Mostly table-sized amounts, sometimes hostile ones.
const amount = fc.oneof(
  { weight: 8, arbitrary: fc.integer({ min: -25, max: 25 }) },
  { weight: 1, arbitrary: fc.integer() },
  { weight: 1, arbitrary: fc.constantFrom(Number.NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER, -LIFE_MAX * 3) },
)

const action: fc.Arbitrary<GameAction> = fc.oneof(
  fc.record({ type: fc.constant('adjust-life' as const), playerId, amount }),
  fc.record({
    type: fc.constant('adjust-counter' as const),
    playerId,
    counter: fc.constantFrom('poison' as const, 'energy' as const, 'experience' as const),
    amount,
  }),
  fc.record({
    type: fc.constant('adjust-commander-damage' as const),
    playerId,
    sourcePlayerId: playerId,
    commander: fc.constantFrom(0 as const, 1 as const),
    amount,
  }),
  fc.record({ type: fc.constant('set-partner' as const), playerId, hasPartner: fc.boolean() }),
  fc.record({ type: fc.constant('rename-player' as const), playerId, name: fc.string({ maxLength: 40 }) }),
  fc.record({ type: fc.constant('remove-player' as const), playerId }),
  fc.constant({ type: 'reset-game' as const }),
)

const scenario = fc.record({
  players: fc.integer({ min: 2, max: 4 }),
  actions: fc.array(action, { maxLength: 60 }),
})

const run = (players: number, actions: GameAction[]) => actions.reduce(gameReducer, createGame(players))
const totalCommanderDamage = (game: GameState, index: number) =>
  Object.values(game.players[index].commanderDamage).reduce((sum, [a, b]) => sum + a + b, 0)

describe('reducer invariants (property-based)', () => {
  it('always produces a game that storage accepts unchanged', () => {
    fc.assert(
      fc.property(scenario, ({ players, actions }) => {
        const game = run(players, actions)
        expect(parseStoredGame(JSON.parse(JSON.stringify(game)))).toEqual({ game, migrated: false })
      }),
      { numRuns: 1000 },
    )
  })

  it('keeps every value a bounded safe integer', () => {
    fc.assert(
      fc.property(scenario, ({ players, actions }) => {
        for (const player of run(players, actions).players) {
          expect(player.life).toBeGreaterThanOrEqual(LIFE_MIN)
          expect(player.life).toBeLessThanOrEqual(LIFE_MAX)
          for (const value of [player.poison, player.energy, player.experience]) {
            expect(Number.isSafeInteger(value) && value >= 0 && value <= COUNTER_MAX).toBe(true)
          }
        }
      }),
      { numRuns: 1000 },
    )
  })

  it('moves life by exactly the applied Commander damage', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -30, max: 30 }).filter((value) => value !== 0), { maxLength: 40 }),
        (amounts) => {
          let game = createGame(2)
          for (const value of amounts) {
            game = gameReducer(game, {
              type: 'adjust-commander-damage',
              playerId: 'player-1',
              sourcePlayerId: 'player-2',
              commander: 0,
              amount: value,
            })
          }
          expect(game.players[0].life).toBe(40 - totalCommanderDamage(game, 0))
          const [damage] = game.players[0].commanderDamage['player-2'] ?? [0]
          expect(damage >= COMMANDER_DAMAGE_LIMIT).toBe(game.players[0].life <= 40 - COMMANDER_DAMAGE_LIMIT)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('restores every earlier state through undo and redo', () => {
    fc.assert(
      fc.property(scenario, ({ players, actions }) => {
        let history = createHistory(createGame(players))
        const states = [history.present]
        for (const [index, next] of actions.entries()) {
          const before = history
          // Spaced beyond the grouping window so every change is its own step.
          history = historyReducer(history, { type: 'apply', action: next, at: index * 10_000 })
          if (history !== before) states.push(history.present)
        }
        const steps = Math.min(states.length - 1, 50)
        for (let step = 1; step <= steps; step += 1) {
          history = historyReducer(history, { type: 'undo' })
          expect(history.present).toBe(states[states.length - 1 - step])
        }
        for (let step = 0; step < steps; step += 1) history = historyReducer(history, { type: 'redo' })
        expect(history.present).toBe(states.at(-1))
      }),
      { numRuns: 500 },
    )
  })
})

describe('tap grouping invariants (property-based)', () => {
  it('one undo after a burst of grouped taps restores the state before the burst', () => {
    fc.assert(
      fc.property(
        scenario,
        fc.array(fc.integer({ min: 0, max: 700 }), { minLength: 1, maxLength: 20 }),
        fc.constantFrom(1, -1, 5, -5),
        ({ players, actions }, gaps, step) => {
          let history = createHistory(run(players, actions))
          const target = history.present.players[0].id
          const before = history.present
          let at = 1_000_000
          for (const gap of gaps) {
            at += gap
            history = historyReducer(history, {
              type: 'apply',
              at,
              action: { type: 'adjust-life', playerId: target, amount: step },
            })
          }
          expect(history.past.length).toBeLessThanOrEqual(1)
          expect(historyReducer(history, { type: 'undo' }).present).toBe(before)
        },
      ),
      { numRuns: 500 },
    )
  })
})
