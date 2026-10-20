import { fireEvent, render, screen } from '@testing-library/react'
import { DecksScreen } from './DecksScreen'
import { LearnScreen } from './LearnScreen'

describe('Mazzi placeholder (R1)', () => {
  it('says what is coming, with no fake actions', () => {
    render(<DecksScreen />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mazzi' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 2, name: 'Il tuo grimorio è in preparazione' })).toBeInTheDocument()
    expect(
      screen.getByText('Qui potrai importare le tue liste, aggiungere strategie e provare una mano iniziale.'),
    ).toBeInTheDocument()
    expect(screen.getByText('In preparazione')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Impara placeholder and Regole bridge (R1)', () => {
  it('keeps the quick Commander reference reachable until R4', () => {
    const onOpenRules = vi.fn()
    render(<LearnScreen onOpenRules={onOpenRules} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Impara' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 2, name: 'Una guida che cresce con te' })).toBeInTheDocument()
    expect(screen.getByText('Le basi, le meccaniche e gli scenari interattivi arriveranno qui.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Riferimento rapido Commander' }))
    expect(onOpenRules).toHaveBeenCalledOnce()
  })
})
