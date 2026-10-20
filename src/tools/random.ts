import type { Orientation, TableLayout } from '../components/PlayerSeat'

/** Dice and coin for the rhombus tools (R2 §8): results are transient and never part of the game. */

export type CoinFace = 'Testa' | 'Croce'

export function rollDie(sides: 6 | 20, rng: () => number = Math.random): number {
  return Math.floor(rng() * sides) + 1
}

export function flipCoin(rng: () => number = Math.random): CoinFace {
  return rng() < 0.5 ? 'Testa' : 'Croce'
}

/** One copy per side of the table that seats a player (R2 §8.1): the same value, turned. */
export function resultOrientations(layout: TableLayout): Orientation[] {
  if (layout === 'table') return [0, 90, 180, -90]
  if (layout === 'facing' || layout === 'two-facing') return [0, 180]
  return [0]
}
