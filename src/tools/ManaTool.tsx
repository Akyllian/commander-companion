import type React from 'react'
import { ManaIcon } from '../components/icons'
import { adjustMana, EMPTY_POOL, isEmpty, MANA_LABELS, MANA_TYPES } from './mana'
import type { ManaPool } from './mana'

interface ManaToolProps {
  pool: ManaPool
  onChange: (pool: ManaPool) => void
  announce: (text: string) => void
}

const step = (label: string, sign: '+' | '−', onClick: () => void, disabled = false): React.ReactNode => (
  <button
    type="button"
    className="counter-column__step"
    aria-label={`${sign === '+' ? 'Aggiungi' : 'Togli'} 1 mana ${label}`}
    disabled={disabled}
    onClick={onClick}
  >
    {sign}
  </button>
)

/**
 * Shared mana (R2 §8.2): one vertical stepper per type, monochrome icons, letters for the type.
 * 3 × 2 by default, one row of six only where every control keeps its 44px.
 */
export function ManaTool({ pool, onChange, announce }: ManaToolProps) {
  return (
    <div className="mana-tool">
      <div className="mana-tool__pool">
        {MANA_TYPES.map((type) => {
          const label = MANA_LABELS[type]
          return (
            <div key={type} className="mana-column" role="group" aria-label={label}>
              {step(label, '+', () => onChange(adjustMana(pool, type, 1)))}
              <span className="mana-column__value">
                <ManaIcon />
                <strong data-testid="mana-value">{pool[type]}</strong>
                <span className="mana-column__type" aria-hidden="true">
                  {type}
                </span>
              </span>
              {step(label, '−', () => onChange(adjustMana(pool, type, -1)), pool[type] === 0)}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="quiet-button mana-tool__reset"
        disabled={isEmpty(pool)}
        onClick={() => {
          onChange(EMPTY_POOL)
          announce('Mana azzerato')
        }}
      >
        Azzera mana
      </button>
    </div>
  )
}
