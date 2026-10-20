import { fireEvent, render, screen, within } from '@testing-library/react'
import { DEFAULT_PREFERENCES } from '../settings/preferences'
import type { Preferences } from '../settings/preferences'
import { MoreScreen } from './MoreScreen'

const setup = ({ playerCount = 4, wakeLockSupported = true, preferences = DEFAULT_PREFERENCES as Preferences } = {}) => {
  const props = {
    playerCount,
    preferences,
    wakeLockSupported,
    onPreferencesChange: vi.fn(),
    onNewGame: vi.fn(),
    onReset: vi.fn(),
  }
  const view = render(<MoreScreen {...props} />)
  return { ...props, view }
}

describe('MoreScreen (R1)', () => {
  it('opens with its title and the four groups in order', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Altro' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByText('Partita, schermo e informazioni')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Disposizione del tavolo',
      'Nuova partita',
      'Partita attuale',
      'Informazioni',
    ])
  })

  it('offers the four-player layouts of the current table and applies one at once', () => {
    const { onPreferencesChange } = setup({ playerCount: 4 })
    const group = screen.getByRole('radiogroup', { name: 'Layout dei giocatori' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label')?.split(':')[0])).toEqual([
      'Griglia',
      'Fronte a fronte',
      'Tavolo',
    ])
    fireEvent.click(within(group).getByRole('radio', { name: /^tavolo/i }))
    expect(onPreferencesChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, fourPlayerLayout: 'table' })
  })

  it('offers the two-player layouts with two players, and plain text with three', () => {
    const view = setup({ playerCount: 2 })
    expect(screen.getAllByRole('radio', { name: /^(stesso lato|fronte a fronte)/i })).toHaveLength(2)
    view.view.unmount()
    setup({ playerCount: 3 })
    expect(screen.queryByRole('radiogroup', { name: 'Layout dei giocatori' })).not.toBeInTheDocument()
    expect(screen.getByText('Griglia')).toBeInTheDocument()
  })

  it('swaps the layout options when the table changes size, without touching the saved choices', () => {
    const { view, onPreferencesChange, ...props } = setup({ playerCount: 4 })
    view.rerender(<MoreScreen {...props} onPreferencesChange={onPreferencesChange} playerCount={2} />)
    expect(screen.getByRole('radio', { name: /^stesso lato/i })).toBeInTheDocument()
    expect(onPreferencesChange).not.toHaveBeenCalled()
  })

  it('keeps the screen on through a native switch, hidden when unsupported', () => {
    const { onPreferencesChange, view } = setup()
    const toggle = screen.getByRole('switch', { name: /mantieni lo schermo acceso/i })
    expect(toggle).toHaveAccessibleDescription('Evita che lo schermo si spenga durante la partita')
    fireEvent.click(toggle)
    expect(onPreferencesChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, keepScreenOn: false })
    view.unmount()
    setup({ wakeLockSupported: false })
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('prepares a new game with a draft player count, then asks', () => {
    const { onNewGame } = setup({ playerCount: 4 })
    const players = screen.getByRole('radiogroup', { name: 'Giocatori per la nuova partita' })
    expect(within(players).getByRole('radio', { name: '4' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(players).getByRole('radio', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
    expect(onNewGame).toHaveBeenCalledWith(3)
  })

  it('asks to reset the current scores', () => {
    const { onReset } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('shows the version, the Scryfall credit and the Fan Content notice', () => {
    setup()
    expect(screen.getByText(/^Versione /)).toBeInTheDocument()
    expect(screen.getByText('Dati e illustrazioni delle carte da Scryfall')).toBeInTheDocument()
    expect(screen.getByText(/unofficial Fan Content permitted under the Fan Content Policy/i)).toHaveAttribute('lang', 'en')
  })
})
