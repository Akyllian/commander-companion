import { useState } from 'react'
import type { TableLayout } from '../components/PlayerSeat'
import { OrientedResult } from './OrientedResult'
import { rollDie } from './random'

interface DiceToolProps {
  layout: TableLayout
  announce: (text: string) => void
  rng?: () => number
}

/** d6 and d20 (R2 §8.1): one transient result; a new tap on the same die rolls again. */
export function DiceTool({ layout, announce, rng }: DiceToolProps) {
  const [result, setResult] = useState<{ die: 6 | 20; value: number; roll: number } | null>(null)
  const roll = (die: 6 | 20) => {
    const value = rollDie(die, rng)
    setResult((previous) => ({ die, value, roll: (previous?.roll ?? 0) + 1 }))
    announce(`d${die}: ${value}`)
  }
  return (
    <div className="dice-tool">
      <div className="dice-tool__dice">
        {([6, 20] as const).map((die) => (
          <button key={die} type="button" className="tool-button" aria-label={`Lancia d${die}`} onClick={() => roll(die)}>
            d{die}
          </button>
        ))}
      </div>
      {result && (
        // Keyed by roll, so the 160ms entry plays again on every roll.
        <div key={result.roll} className="tool-result tool-result--dice" data-testid="dice-result">
          <OrientedResult layout={layout}>
            <span className="tool-result__label">d{result.die}</span>
            <strong className="tool-result__value">{result.value}</strong>
          </OrientedResult>
        </div>
      )}
    </div>
  )
}
