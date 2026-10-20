import { OpenBookIcon } from '../components/icons'

/**
 * Impara until R4 (R1 design §8). The quick Commander reference (D-021) stays reachable through
 * a bridge button, approved by the product owner, so nothing already published goes missing.
 */
export function LearnScreen({ onOpenRules }: { onOpenRules: () => void }) {
  return (
    <div className="screen placeholder-screen placeholder-screen--learn">
      <h1 tabIndex={-1}>Impara</h1>
      <div className="placeholder-screen__body">
        <span className="placeholder-screen__icon">
          <OpenBookIcon />
        </span>
        <h2>Una guida che cresce con te</h2>
        <p>Le basi, le meccaniche e gli scenari interattivi arriveranno qui.</p>
        <button type="button" className="rules-bridge" onClick={onOpenRules}>
          <OpenBookIcon />
          <span>Riferimento rapido Commander</span>
        </button>
      </div>
    </div>
  )
}
