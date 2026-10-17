import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

describe('Commander Companion app', () => {
  it('changes a life total and can undo the action', () => {
    render(<App />)
    const player = screen.getByRole('region', { name: /giocatore 1/i })

    fireEvent.click(within(player).getByRole('button', { name: /aumenta.*1.*vita/i }))
    expect(within(player).getByTestId('life-total')).toHaveTextContent('41')

    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    expect(within(player).getByTestId('life-total')).toHaveTextContent('40')
  })

  it('persists the latest score for a later mount', () => {
    const first = render(<App />)
    const player = screen.getByRole('region', { name: /giocatore 1/i })
    fireEvent.click(within(player).getByRole('button', { name: /riduci.*5.*vita/i }))
    first.unmount()

    render(<App />)
    const restoredPlayer = screen.getByRole('region', { name: /giocatore 1/i })
    expect(within(restoredPlayer).getByTestId('life-total')).toHaveTextContent('35')
  })
})
