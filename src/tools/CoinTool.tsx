import { useState } from 'react'
import type { TableLayout } from '../components/PlayerSeat'
import { CoinIcon } from '../components/icons'
import { OrientedResult } from './OrientedResult'
import { flipCoin } from './random'
import type { CoinFace } from './random'

interface CoinToolProps {
  layout: TableLayout
  announce: (text: string) => void
  rng?: () => number
}

/** «Lancia moneta» (R2 §8.3): Testa or Croce, a flat 220ms fade between faces, never a 3D spin. */
export function CoinTool({ layout, announce, rng }: CoinToolProps) {
  const [result, setResult] = useState<{ face: CoinFace; flip: number } | null>(null)
  const flip = () => {
    const face = flipCoin(rng)
    setResult((previous) => ({ face, flip: (previous?.flip ?? 0) + 1 }))
    announce(`Moneta: ${face}`)
  }
  return (
    <div className="coin-tool">
      <button type="button" className="tool-button tool-button--wide" onClick={flip}>
        Lancia moneta
      </button>
      {result && (
        <div key={result.flip} className="tool-result tool-result--coin" data-testid="coin-result">
          <OrientedResult layout={layout}>
            <CoinIcon />
            <strong className="tool-result__value">{result.face}</strong>
          </OrientedResult>
        </div>
      )}
    </div>
  )
}
