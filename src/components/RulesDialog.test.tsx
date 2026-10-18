import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { RulesDialog } from './RulesDialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Regole
      </button>
      <RulesDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('RulesDialog', () => {
  it('renders the reference as one document with groups, rules, references and date', () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Regole' })
    opener.focus()
    fireEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Regole Commander' })
    expect(within(dialog).getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Soglie della partita',
      'Danni Commander',
      'Zona di comando',
    ])
    expect(within(dialog).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'Vita iniziale',
      'Vita a zero',
      'Veleno',
      'Danni Commander',
      'Riducono anche la vita',
      'Partner',
      'Tassa del comandante',
    ])
    expect(within(dialog).getByText('Regole 903.10a e 704.6c')).toBeInTheDocument()
    expect(Array.from(dialog.querySelectorAll('.rule-id')).map((node) => node.textContent)).toEqual([
      'R1',
      'R2',
      'R3',
      'R4',
      'R5',
      'R6',
      'R7',
    ])
    expect(within(dialog).getByText(/25 settembre 2026/)).toBeInTheDocument()
    expect(dialog.querySelectorAll('details, [role="tab"], input[type="search"]')).toHaveLength(0)

    const tax = within(dialog).getByRole('article', { name: 'Tassa del comandante' })
    expect(within(tax).getByText('Non tracciata dall’app')).toBeInTheDocument()
    expect(within(tax).getByRole('img', { name: 'due mana generici' })).toHaveTextContent('{2}')
    expect(within(dialog).getAllByText('Non tracciata dall’app')).toHaveLength(1)

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
