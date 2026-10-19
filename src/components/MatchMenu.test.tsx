import { fireEvent, render, screen } from '@testing-library/react'
import { MatchMenu } from './MatchMenu'

const setup = ({ showKeepScreenOn = true, supportsPopover = false, currentPlayerCount = 4 } = {}) => {
  const props = {
    currentPlayerCount,
    preferences: { keepScreenOn: true },
    onPreferencesChange: vi.fn(),
    showKeepScreenOn,
    onNewGame: vi.fn(),
    onReset: vi.fn(),
    supportsPopover,
  }
  const view = render(<MatchMenu {...props} />)
  return { ...props, view, button: screen.getByRole('button', { name: 'Partita' }) }
}

describe('MatchMenu', () => {
  it('opens with focus inside and offers every match action', () => {
    const { button, onNewGame, onPreferencesChange } = setup()
    fireEvent.click(button)

    const select = screen.getByRole('combobox', { name: /numero di giocatori/i })
    expect(select).toHaveFocus()
    fireEvent.change(select, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /mantieni lo schermo acceso/i }))
    expect(onPreferencesChange).toHaveBeenCalledWith({ keepScreenOn: false })

    fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
    expect(onNewGame).toHaveBeenCalledWith(3)
    // The menu closes and focus returns to Partita, the dialog's opener.
    expect(screen.queryByRole('button', { name: 'Nuova partita' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes before asking to reset scores', () => {
    const { button, onReset } = setup()
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    expect(onReset).toHaveBeenCalledOnce()
    expect(button).toHaveFocus()
  })

  it('separates match management from the screen-on option (P3)', () => {
    const { button } = setup()
    fireEvent.click(button)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('hides the screen-on option and its divider when unsupported', () => {
    const { button } = setup({ showKeepScreenOn: false })
    fireEvent.click(button)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('closes with Escape and returns focus', () => {
    const { button } = setup()
    fireEvent.click(button)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Nuova partita' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('follows the table size when it changes', () => {
    const { view, button, ...props } = setup({ currentPlayerCount: 4 })
    view.rerender(<MatchMenu {...props} currentPlayerCount={3} />)
    fireEvent.click(button)
    expect(screen.getByRole('combobox', { name: /numero di giocatori/i })).toHaveValue('3')
  })

  it('uses a native popover when available', () => {
    const { button } = setup({ supportsPopover: true })
    expect(button).toHaveAttribute('popovertarget')
  })
})
