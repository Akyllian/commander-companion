import fc from 'fast-check'
import { confirmBottom, HAND_SIZE, keep, MAX_MULLIGANS, mulligan, newTry, startHand, toggleBottom } from './hand'
import type { HandState } from './hand'
import { drawablePool } from './model'
import { deckRecord, deckCard, uuid } from './testing'

/** A deterministic rng from a seed (mulberry32). */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pool = drawablePool(deckRecord({ cards: Array.from({ length: 100 }, (_, i) => deckCard(i + 1)) }))
const all = (state: HandState) => (state.phase === 'unavailable' ? [] : [...state.hand, ...state.library])

describe('test hand, London mulligan (R3 §10)', () => {
  it('deals seven cards from the drawable pool, never the commander (Review Focus 3)', () => {
    expect(HAND_SIZE).toBe(7)
    expect(pool).toHaveLength(99)
    const state = startHand(pool, seeded(1))
    expect(state).toMatchObject({ phase: 'dealt', mulligans: 0 })
    if (state.phase !== 'dealt') throw new Error('not dealt')
    expect(state.hand).toHaveLength(7)
    expect(state.library).toHaveLength(92)
    expect(all(state)).not.toContain(uuid(1))
  })

  it('needs at least seven drawable cards', () => {
    expect(startHand(pool.slice(0, 6), seeded(1))).toEqual({ phase: 'unavailable', reason: 'too-few-cards' })
    expect(newTry(pool.slice(0, 6), seeded(1))).toEqual({ phase: 'unavailable', reason: 'too-few-cards' })
  })

  it('keeps a first hand with nothing to put back', () => {
    const kept = keep(startHand(pool, seeded(2)))
    expect(kept).toMatchObject({ phase: 'kept', mulligans: 0 })
    if (kept.phase !== 'kept') throw new Error('not kept')
    expect(kept.hand).toHaveLength(7)
  })

  it('after two mulligans, puts two chosen cards at the bottom in the chosen order', () => {
    let state = mulligan(mulligan(startHand(pool, seeded(3)), seeded(4)), seeded(5))
    expect(state).toMatchObject({ phase: 'dealt', mulligans: 2 })
    state = keep(state)
    expect(state).toMatchObject({ phase: 'bottom', mulligans: 2, chosen: [] })
    if (state.phase !== 'bottom') throw new Error('not bottom')
    const [first, , third] = state.hand
    state = toggleBottom(toggleBottom(state, 2), 0)
    // A third pick is ignored: exactly two must go.
    expect(toggleBottom(state, 4)).toBe(state)
    expect(state).toMatchObject({ chosen: [2, 0] })
    // Unselecting frees a slot.
    expect(toggleBottom(state, 2)).toMatchObject({ chosen: [0] })
    const done = confirmBottom(state)
    expect(done).toMatchObject({ phase: 'kept', mulligans: 2 })
    if (done.phase !== 'kept') throw new Error('not kept')
    expect(done.hand).toHaveLength(5)
    expect(done.library.slice(-2)).toEqual([third, first])
    expect([...done.hand, ...done.library].toSorted()).toEqual(pool.toSorted())
  })

  it('cannot confirm before choosing enough, and ignores out-of-range picks', () => {
    const state = keep(mulligan(startHand(pool, seeded(6)), seeded(7)))
    expect(confirmBottom(state)).toBe(state)
    expect(toggleBottom(state, 9)).toBe(state)
    const dealt = startHand(pool, seeded(8))
    expect(toggleBottom(dealt, 0)).toBe(dealt)
    expect(confirmBottom(dealt)).toBe(dealt)
  })

  it('stops at seven mulligans: the seventh hand goes entirely to the bottom', () => {
    expect(MAX_MULLIGANS).toBe(7)
    let state = startHand(pool, seeded(9))
    for (let index = 0; index < 7; index += 1) state = mulligan(state, seeded(10 + index))
    expect(state).toMatchObject({ phase: 'dealt', mulligans: 7 })
    expect(mulligan(state, seeded(99))).toBe(state)
    state = keep(state)
    for (let index = 0; index < 7; index += 1) state = toggleBottom(state, index)
    const done = confirmBottom(state)
    expect(done).toMatchObject({ phase: 'kept', mulligans: 7 })
    if (done.phase !== 'kept') throw new Error('not kept')
    expect(done.hand).toEqual([])
  })

  it('ignores actions that do not fit the phase, and starts over with a new try', () => {
    const unavailable = startHand([], seeded(1))
    expect(mulligan(unavailable, seeded(1))).toBe(unavailable)
    expect(keep(unavailable)).toBe(unavailable)
    const kept = keep(startHand(pool, seeded(11)))
    expect(mulligan(kept, seeded(1))).toBe(kept)
    expect(keep(kept)).toBe(kept)
    expect(newTry(pool, seeded(12))).toMatchObject({ phase: 'dealt', mulligans: 0 })
  })

  it('always keeps every card of the pool across hand and library', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 0, max: 7 }), (seed, mulligans) => {
        let state = startHand(pool, seeded(seed))
        for (let index = 0; index < mulligans; index += 1) state = mulligan(state, seeded(seed + index + 1))
        state = keep(state)
        for (let index = 0; index < mulligans; index += 1) state = toggleBottom(state, index)
        state = confirmBottom(state)
        expect(all(state).toSorted()).toEqual(pool.toSorted())
      }),
    )
  })
})
