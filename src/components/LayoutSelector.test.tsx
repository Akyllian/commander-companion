import { fireEvent, render, screen, within } from '@testing-library/react'
import { LayoutSelector } from './LayoutSelector'

const setup = (layout: 'grid' | 'facing' | 'table' = 'grid') => {
  const onChoose = vi.fn()
  const onClose = vi.fn()
  render(<LayoutSelector open layout={layout} onChoose={onChoose} onClose={onClose} />)
  const sheet = screen.getByRole('dialog', { name: 'Layout dei giocatori' })
  return { onChoose, onClose, sheet, group: within(sheet).getByRole('radiogroup', { name: 'Layout dei giocatori' }) }
}

describe('LayoutSelector (D-034)', () => {
  it('offers the three approved layouts with names and descriptions', () => {
    const { group } = setup()
    expect(within(group).getAllByRole('radio').map((option) => option.getAttribute('aria-label'))).toEqual([
      'Griglia: Tutti verso di te',
      'Fronte a fronte: Due per lato',
      'Tavolo: Uno per bordo',
    ])
    for (const text of ['Griglia', 'Fronte a fronte', 'Tavolo', 'Tutti verso di te', 'Due per lato', 'Uno per bordo']) {
      expect(within(group).getByText(text)).toBeInTheDocument()
    }
  })

  it('marks the current choice with aria-checked and visible text', () => {
    const { group } = setup('facing')
    const checked = within(group).getAllByRole('radio', { checked: true })
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveAccessibleName('Fronte a fronte: Due per lato')
    expect(within(checked[0]).getByText('Selezionato')).toBeInTheDocument()
    expect(within(group).getAllByText('Selezionato')).toHaveLength(1)
  })

  it('reports the chosen layout', () => {
    const { group, onChoose } = setup()
    fireEvent.click(within(group).getByRole('radio', { name: /^tavolo/i }))
    expect(onChoose).toHaveBeenCalledWith('table')
  })

  it('draws a schematic preview for each option, without images', () => {
    const { group } = setup()
    for (const option of within(group).getAllByRole('radio')) {
      expect(option.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
      expect(option.querySelector('img')).toBeNull()
    }
  })
})
