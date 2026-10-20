import { render, screen, within } from '@testing-library/react'
import { TableControls } from './TableControls'

const setup = ({ compact = false, showLayout = true } = {}) => {
  render(
    <TableControls
      currentPlayerCount={4}
      canUndo={false}
      canRedo={false}
      compact={compact}
      preferences={{ keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'same-side' }}
      onPreferencesChange={vi.fn()}
      showPreferences
      layoutLabel={showLayout ? 'Layout dei quattro giocatori' : null}
      onOpenLayout={vi.fn()}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      onReset={vi.fn()}
      onNewGame={vi.fn()}
      onOpenRules={vi.fn()}
    />,
  )
  const controls = screen.getByRole('group', { name: 'Controlli partita' })
  return within(controls)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim())
}

describe('TableControls layout access (D-034)', () => {
  it('places Layout after Regole and before Preferenze in the standard header', () => {
    const names = setup()
    expect(names.slice(names.indexOf('Regole Commander'))).toEqual(['Regole Commander', 'Layout dei quattro giocatori', 'Preferenze'])
  })

  it('places Layout after Regole and before Partita in compact density', () => {
    expect(setup({ compact: true })).toEqual([
      'Annulla ultima azione',
      'Ripeti ultima azione',
      'Regole Commander',
      'Layout dei quattro giocatori',
      'Partita',
    ])
  })

  it('hides Layout when the table has neither two nor four players', () => {
    expect(setup({ showLayout: false })).not.toContain('Layout dei quattro giocatori')
  })
})
