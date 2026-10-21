/**
 * The table's shared mana pool (R2 §8.2): five colours and colourless, for whoever is playing a
 * turn. Presentation state only: never saved, cleared by hand, by a new game or by a reload.
 */

export const MANA_TYPES = ['W', 'U', 'B', 'R', 'G', 'C'] as const
export type ManaType = (typeof MANA_TYPES)[number]
export type ManaPool = Record<ManaType, number>

export const MANA_LABELS: Record<ManaType, string> = { W: 'Bianco', U: 'Blu', B: 'Nero', R: 'Rosso', G: 'Verde', C: 'Incolore' }
export const MANA_MAX = 99

export const EMPTY_POOL: ManaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }

export function adjustMana(pool: ManaPool, type: ManaType, amount: number): ManaPool {
  const value = Math.min(MANA_MAX, Math.max(0, pool[type] + amount))
  return value === pool[type] ? pool : { ...pool, [type]: value }
}

export const isEmpty = (pool: ManaPool) => MANA_TYPES.every((type) => pool[type] === 0)
