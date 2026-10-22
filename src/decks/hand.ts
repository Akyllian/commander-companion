/**
 * The test hand (R3 §10): seven cards with the London mulligan. Each mulligan reshuffles the whole
 * library and deals seven again; keeping after N mulligans puts N chosen cards at the bottom, in
 * the order chosen. Pure and seeded, so every step is testable; nothing is saved.
 */

export const HAND_SIZE = 7
export const MAX_MULLIGANS = 7

export type HandState =
  | { phase: 'dealt'; mulligans: number; hand: string[]; library: string[] }
  | { phase: 'bottom'; mulligans: number; hand: string[]; library: string[]; chosen: number[] }
  | { phase: 'kept'; mulligans: number; hand: string[]; library: string[] }
  | { phase: 'unavailable'; reason: 'too-few-cards' }

/** Fisher–Yates with an injected random source. */
function shuffle(cards: string[], rng: () => number): string[] {
  const result = cards.slice()
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

function deal(cards: string[], mulligans: number, rng: () => number): HandState {
  if (cards.length < HAND_SIZE) return { phase: 'unavailable', reason: 'too-few-cards' }
  const shuffled = shuffle(cards, rng)
  return { phase: 'dealt', mulligans, hand: shuffled.slice(0, HAND_SIZE), library: shuffled.slice(HAND_SIZE) }
}

export const startHand = (pool: string[], rng: () => number = Math.random) => deal(pool, 0, rng)

export const newTry = startHand

export function mulligan(state: HandState, rng: () => number = Math.random): HandState {
  if (state.phase !== 'dealt' || state.mulligans >= MAX_MULLIGANS) return state
  return deal([...state.hand, ...state.library], state.mulligans + 1, rng)
}

export function keep(state: HandState): HandState {
  if (state.phase !== 'dealt') return state
  const { mulligans, hand, library } = state
  return mulligans > 0 ? { phase: 'bottom', mulligans, hand, library, chosen: [] } : { phase: 'kept', mulligans, hand, library }
}

/** Selects or unselects a card to put at the bottom; exactly `mulligans` may be chosen. */
export function toggleBottom(state: HandState, index: number): HandState {
  if (state.phase !== 'bottom' || index < 0 || index >= state.hand.length) return state
  if (state.chosen.includes(index)) return { ...state, chosen: state.chosen.filter((chosen) => chosen !== index) }
  if (state.chosen.length >= state.mulligans) return state
  return { ...state, chosen: [...state.chosen, index] }
}

export function confirmBottom(state: HandState): HandState {
  if (state.phase !== 'bottom' || state.chosen.length !== state.mulligans) return state
  const bottom = state.chosen.map((index) => state.hand[index])
  return {
    phase: 'kept',
    mulligans: state.mulligans,
    hand: state.hand.filter((_, index) => !state.chosen.includes(index)),
    library: [...state.library, ...bottom],
  }
}
