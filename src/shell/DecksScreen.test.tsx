import { render, screen } from '@testing-library/react'
import { DecksContext } from '../decks/ui/DecksContext'
import type { DecksValue } from '../decks/ui/DecksContext'
import { DecksScreen } from './DecksScreen'

const value = (status: DecksValue['status']): DecksValue => ({ status, decks: null, cards: null, store: null, reload: async () => undefined })

const renderWith = (status: DecksValue['status']) =>
  render(
    <DecksContext.Provider value={value(status)}>
      <DecksScreen players={[]} dispatch={() => undefined} />
    </DecksContext.Provider>,
  )

describe('Mazzi before the decks are read (review fix 6)', () => {
  it('shows a quiet loading state, not an error, while the decks load', () => {
    renderWith('loading')
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento dei mazzi…')
    expect(screen.queryByText('I mazzi non sono leggibili su questo dispositivo.')).not.toBeInTheDocument()
  })

  it('says the decks cannot be read only when the store is unavailable', () => {
    renderWith('unavailable')
    expect(screen.getByText('I mazzi non sono leggibili su questo dispositivo.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
