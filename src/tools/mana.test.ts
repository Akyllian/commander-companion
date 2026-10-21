import { adjustMana, EMPTY_POOL, isEmpty, MANA_LABELS, MANA_MAX, MANA_TYPES } from './mana'

describe('shared mana pool (R2 §8.2)', () => {
  it('lists the five colours and colourless in a stable order', () => {
    expect(MANA_TYPES).toEqual(['W', 'U', 'B', 'R', 'G', 'C'])
    expect(MANA_TYPES.map((type) => MANA_LABELS[type])).toEqual(['Bianco', 'Blu', 'Nero', 'Rosso', 'Verde', 'Incolore'])
  })

  it('moves one type by one, between 0 and 99', () => {
    const one = adjustMana(EMPTY_POOL, 'R', 1)
    expect(one).toEqual({ ...EMPTY_POOL, R: 1 })
    expect(adjustMana({ ...EMPTY_POOL, R: MANA_MAX }, 'R', 1).R).toBe(99)
    expect(adjustMana(one, 'R', -5).R).toBe(0)
  })

  it('returns the same pool when nothing changes', () => {
    expect(adjustMana(EMPTY_POOL, 'G', -1)).toBe(EMPTY_POOL)
    const full = { ...EMPTY_POOL, C: MANA_MAX }
    expect(adjustMana(full, 'C', 1)).toBe(full)
  })

  it('knows when every type is zero', () => {
    expect(isEmpty(EMPTY_POOL)).toBe(true)
    expect(isEmpty({ ...EMPTY_POOL, U: 2 })).toBe(false)
  })
})
