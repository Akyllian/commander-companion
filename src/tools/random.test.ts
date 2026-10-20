import { flipCoin, resultOrientations, rollDie } from './random'

describe('table randomness (R2 §8)', () => {
  it('rolls each face of a die, from 1 to its sides', () => {
    expect(rollDie(6, () => 0)).toBe(1)
    expect(rollDie(6, () => 0.999)).toBe(6)
    expect(rollDie(20, () => 0.8)).toBe(17)
    expect(rollDie(20, () => 0.999)).toBe(20)
  })

  it('flips a fair coin', () => {
    expect(flipCoin(() => 0.2)).toBe('Testa')
    expect(flipCoin(() => 0.5)).toBe('Croce')
  })

  it('repeats results so every seat reads one upright copy', () => {
    expect(resultOrientations('grid')).toEqual([0])
    expect(resultOrientations('facing')).toEqual([0, 180])
    expect(resultOrientations('two-facing')).toEqual([0, 180])
    expect(resultOrientations('table')).toEqual([0, 90, 180, -90])
  })
})
