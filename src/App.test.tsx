import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { createGame, gameReducer } from './game/game'
import { BACKUP_KEY, STORAGE_KEY } from './game/storage'
import { updateStore } from './pwa/updates'
import { installMatchMedia } from './test/matchMedia'

let clock = 0
const panel = (name: RegExp) => screen.getByRole('region', { name })
const life = (name: RegExp) => within(panel(name)).getByTestId('life-total')
const badgeOf = (scope: HTMLElement) => within(scope).getByText('Sconfitto').closest('.status-badge') as HTMLElement
const click = (scope: HTMLElement, name: RegExp) => fireEvent.click(within(scope).getByRole('button', { name }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  updateStore.reset()
})

describe('scoring', () => {
  it('changes a life total and can undo the action', () => {
    render(<App />)

    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('41')

    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    expect(life(/giocatore 1/i)).toHaveTextContent('40')

    fireEvent.click(screen.getByRole('button', { name: /ripeti ultima azione/i }))
    expect(life(/giocatore 1/i)).toHaveTextContent('41')
  })

  it('persists the latest score for a later mount', () => {
    const first = render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)
    first.unmount()

    render(<App />)
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
  })

  it('adjusts counters through the steppers', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /riduci veleno di giocatore 1/i)
    expect(within(player).getByRole('status', { name: /veleno di giocatore 1/i })).toHaveTextContent('1')
  })

  it('applies Commander damage to life as one undoable step', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)

    click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('38')
    expect(within(target).getByRole('status', { name: /danni commander da giocatore 2/i })).toHaveTextContent('2')

    click(target, /riduci danni commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('39')

    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    expect(life(/giocatore 1/i)).toHaveTextContent('38')
  })

  it('shows the defeat label with its reason', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    for (let step = 0; step < 10; step += 1) click(player, /aumenta veleno di giocatore 1/i)
    expect(badgeOf(player)).toHaveTextContent('Sconfitto · 10 veleno: 10 segnalini veleno')
  })

  it('summarises several defeat conditions', () => {
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 1000))
    render(<App />)
    const player = panel(/giocatore 1/i)
    for (let step = 0; step < 10; step += 1) click(player, /aumenta veleno di giocatore 1/i)
    for (let step = 0; step < 8; step += 1) click(player, /riduci di 5 la vita/i)
    expect(badgeOf(player)).toHaveTextContent(/^Sconfitto · 2 condizioni/)
  })

  it('summarises Commander damage with the maximum from one commander, not the sum', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)
    for (let step = 0; step < 3; step += 1) click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    click(target, /aumenta danni commander da giocatore 3 a giocatore 1/i)
    expect(within(target).getByText('massimo 3/21')).toBeInTheDocument()
  })

  it('keeps the Commander section open once expanded', () => {
    render(<App />)
    const summary = within(panel(/giocatore 1/i)).getByText('Danni Commander')
    const details = summary.closest('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    details.open = true
    fireEvent(details, new Event('toggle'))
    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)
    expect(details.open).toBe(true)
  })
})

describe('partner commanders', () => {
  it('tracks the two commanders of a partner deck separately', () => {
    render(<App />)
    fireEvent.click(within(panel(/giocatore 2/i)).getByRole('checkbox', { name: /due comandanti/i }))
    expect(within(panel(/giocatore 2/i)).getByText('Partner')).toBeInTheDocument()

    const target = panel(/giocatore 1/i)
    click(target, /aumenta danni commander da giocatore 2, comandante 2 a giocatore 1/i)
    expect(
      within(target).getByRole('status', { name: /danni commander da giocatore 2, comandante 2/i }),
    ).toHaveTextContent('1')
    expect(
      within(target).getByRole('status', { name: /danni commander da giocatore 2, comandante 1/i }),
    ).toHaveTextContent('0')

    const toggle = within(panel(/giocatore 2/i)).getByRole('checkbox', { name: /due comandanti/i })
    expect(toggle).toBeDisabled()
    expect(within(panel(/giocatore 2/i)).getByText('Azzera prima i danni del Comandante 2.')).toBeInTheDocument()
  })
})

describe('players and match', () => {
  it('renames with Enter and cancels with Escape', () => {
    render(<App />)
    const input = within(panel(/giocatore 1/i)).getByRole('textbox', { name: /nome giocatore/i })

    fireEvent.change(input, { target: { value: 'Liliana' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(panel(/liliana/i)).toBeInTheDocument()

    const renamed = within(panel(/liliana/i)).getByRole('textbox', { name: /nome giocatore/i })
    fireEvent.change(renamed, { target: { value: 'Nessuno' } })
    fireEvent.keyDown(renamed, { key: 'Escape' })
    fireEvent.blur(renamed)
    expect(panel(/liliana/i)).toBeInTheDocument()
  })

  it('removes a player and keeps the new-game selector in sync', () => {
    render(<App />)
    click(panel(/giocatore 4/i), /rimuovi giocatore 4/i)
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.getByRole('combobox', { name: /numero di giocatori/i })).toHaveValue('3')
  })

  it('starts a new game only after confirming in the dialog', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)
    fireEvent.change(screen.getByRole('combobox', { name: /numero di giocatori/i }), { target: { value: '2' } })
    const opener = screen.getByRole('button', { name: /nuova partita/i })
    opener.focus()

    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: /iniziare una nuova partita/i })
    expect(dialog).toHaveAccessibleDescription('I punteggi attuali verranno sostituiti.')
    // Focus starts on the safe action, so Enter never confirms by accident.
    expect(within(dialog).getByRole('button', { name: 'Annulla' })).toHaveFocus()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(screen.getAllByRole('region')).toHaveLength(4)

    fireEvent.click(opener)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
    expect(screen.getAllByRole('region')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /annulla ultima azione/i })).toBeDisabled()
  })

  it('resets scores only after confirming, and closes with Escape', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)

    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
    const dialog = screen.getByRole('dialog', { name: /azzerare tutti i punteggi/i })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(life(/giocatore 1/i)).toHaveTextContent('35')

    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Azzera punteggi' }))
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
  })
})

describe('keyboard shortcuts', () => {
  it('undoes and redoes with Ctrl/Cmd+Z, Shift+Z and Y', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
    fireEvent.keyDown(window, { key: 'Z', metaKey: true, shiftKey: true })
    expect(life(/giocatore 1/i)).toHaveTextContent('41')
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(life(/giocatore 1/i)).toHaveTextContent('41')
  })

  it('leaves text fields and other shortcuts alone', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)
    const input = within(panel(/giocatore 1/i)).getByRole('textbox', { name: /nome giocatore/i })

    fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'z' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, altKey: true })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(life(/giocatore 1/i)).toHaveTextContent('41')
  })
})

describe('announcements', () => {
  it('announces the settled life total once rapid taps stop', () => {
    vi.useFakeTimers()
    render(<App />)
    const player = panel(/giocatore 1/i)
    const announcement = within(player).getByText(/giocatore 1: \d+ punti vita/i)

    click(player, /aumenta.*1.*vita/i)
    click(player, /aumenta.*1.*vita/i)
    expect(announcement).toHaveTextContent('Giocatore 1: 40 punti vita')

    act(() => vi.advanceTimersByTime(700))
    expect(announcement).toHaveTextContent('Giocatore 1: 42 punti vita')
  })
})

describe('persistence and system notices', () => {
  it('tells the player when an unreadable save was replaced and backed up', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    render(<App />)

    expect(screen.getByText(/non era leggibile/i)).toBeInTheDocument()
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{broken')
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(screen.queryByText(/non era leggibile/i)).not.toBeInTheDocument()
  })

  it('warns when scores cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    render(<App />)
    expect(screen.getByText(/salvataggio non è disponibile/i)).toBeInTheDocument()
  })

  it('follows a game changed in another tab', () => {
    render(<App />)
    const remote = gameReducer(createGame(4), { type: 'adjust-life', playerId: 'player-2', amount: -7 })

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(remote) }))
    })
    expect(life(/giocatore 2/i)).toHaveTextContent('33')
  })

  it('asks before activating a new app version', async () => {
    const apply = vi.fn(async () => undefined)
    render(<App />)

    act(() => updateStore.markNeedRefresh(apply))
    fireEvent.click(screen.getByRole('button', { name: /più tardi/i }))
    expect(apply).not.toHaveBeenCalled()
    expect(screen.queryByText(/nuova versione/i)).not.toBeInTheDocument()

    act(() => updateStore.markNeedRefresh(apply))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^aggiorna$/i })))
    expect(apply).toHaveBeenCalledOnce()
  })

})

describe('rapid taps (UX decision 3)', () => {
  it('groups fast taps into one undo step and shows the cumulative delta', () => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    render(<App />)
    const player = panel(/giocatore 1/i)

    for (const at of [0, 300, 600]) {
      now = at
      click(player, /aumenta di 1 la vita/i)
    }
    expect(life(/giocatore 1/i)).toHaveTextContent('43')
    expect(within(player).getByTestId('delta-badge')).toHaveTextContent('+3')

    act(() => vi.advanceTimersByTime(700))
    expect(within(player).queryByTestId('delta-badge')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
  })

  it('shows deltas next to counters and Commander damage', () => {
    // One instant: every tap falls in the window, so only target/direction changes split groups.
    vi.spyOn(performance, 'now').mockReturnValue(0)
    render(<App />)
    const player = panel(/giocatore 1/i)
    click(player, /riduci di 1 la vita/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /aumenta veleno di giocatore 1/i)
    expect(within(player).getByTestId('delta-badge')).toHaveTextContent('+2')
    click(player, /aumenta danni commander da giocatore 3 a giocatore 1/i)
    expect(within(player).getByTestId('delta-badge')).toHaveTextContent('+1')
    click(player, /riduci danni commander da giocatore 3 a giocatore 1/i)
    expect(within(player).getByTestId('delta-badge')).toHaveTextContent('−1')
  })
})

describe('player removal (UX decision 2)', () => {
  it('removes immediately and offers Annulla inline, in the removed panel position', () => {
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    expect(screen.getAllByRole('region')).toHaveLength(3)

    const bar = screen.getByText('Giocatore 3 rimosso').closest('.undo-bar') as HTMLElement
    const cells = Array.from(document.getElementById('main')?.children ?? [])
    expect(cells.indexOf(bar)).toBe(2)
    expect(bar).toHaveFocus()
    fireEvent.click(within(bar).getByRole('button', { name: 'Annulla' }))
    expect(screen.getAllByRole('region')).toHaveLength(4)
    expect(screen.queryByText('Giocatore 3 rimosso')).not.toBeInTheDocument()
  })

  it('hides the bar after six seconds unless its button has focus', () => {
    vi.useFakeTimers()
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    const undo = within(screen.getByText('Giocatore 3 rimosso').closest('.undo-bar') as HTMLElement).getByRole(
      'button',
      { name: 'Annulla' },
    )

    fireEvent.focus(undo)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Giocatore 3 rimosso')).toBeInTheDocument()

    fireEvent.blur(undo)
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.queryByText('Giocatore 3 rimosso')).not.toBeInTheDocument()
    // The global undo still restores the player.
    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    expect(screen.getAllByRole('region')).toHaveLength(4)
  })

  it('moves focus to the score grid when the focused bar disappears', () => {
    vi.useFakeTimers()
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    act(() => vi.advanceTimersByTime(6000))
    expect(document.getElementById('main')).toHaveFocus()
  })

  it('hides the bar as soon as another action happens', () => {
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    click(panel(/giocatore 1/i), /aumenta di 1 la vita/i)
    expect(screen.queryByText('Giocatore 3 rimosso')).not.toBeInTheDocument()
  })
})

describe('preferences (UX decision 7)', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('hides the screen-on control when the browser cannot keep the screen awake', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Preferenze' })).not.toBeInTheDocument()
  })

  it('offers the control on by default and remembers the choice', () => {
    const request = vi.fn(async () => ({ released: false, release: vi.fn(async () => undefined) }))
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Preferenze' }))
    const toggle = screen.getByRole('checkbox', { name: /mantieni lo schermo acceso/i })
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)
    first.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Preferenze' }))
    expect(screen.getByRole('checkbox', { name: /mantieni lo schermo acceso/i })).not.toBeChecked()
  })
})

describe('compact landscape (Phase 1.6)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const shell = () => document.querySelector('.app-shell') as HTMLElement

  it('switches layout when the media query changes, without touching the game', () => {
    const media = installMatchMedia(false)
    render(<App />)
    click(panel(/giocatore 1/i), /riduci di 5 la vita/i)
    expect(shell()).toHaveAttribute('data-compact-landscape', 'false')

    act(() => media.set(true))
    expect(shell()).toHaveAttribute('data-compact-landscape', 'true')
    expect(life(/giocatore 1/i)).toHaveTextContent('35')

    act(() => media.set(false))
    expect(screen.getByRole('button', { name: 'Nuova partita' })).toBeInTheDocument()
  })

  it('keeps Undo, Redo and Partita in the header and moves match actions inside Partita', () => {
    installMatchMedia(true)
    render(<App />)
    const controls = screen.getByRole('group', { name: 'Controlli partita' })
    const names = within(controls)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    expect(names).toEqual(['Annulla ultima azione', 'Ripeti ultima azione', 'Partita'])

    fireEvent.click(within(controls).getByRole('button', { name: 'Partita' }))
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    expect(screen.getByRole('dialog', { name: /azzerare tutti i punteggi/i })).toBeInTheDocument()
  })

  it('shows a score rail and moves secondary controls to the details sheet', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)

    const rail = within(player).getByRole('group', { name: 'Punti vita di Giocatore 1' })
    expect(within(rail).getAllByRole('button').map((button) => button.textContent)).toEqual(['-5', '-1', '+1', '+5'])
    expect(rail.children[2]).toContainElement(within(player).getByTestId('life-total'))
    expect(within(player).queryByRole('button', { name: /rimuovi/i })).not.toBeInTheDocument()
    expect(within(player).queryByText('Danni Commander')).not.toBeInTheDocument()

    const details = within(player).getByRole('button', { name: 'Dettagli di Giocatore 1' })
    details.focus()
    fireEvent.click(details)
    const sheet = screen.getByRole('dialog', { name: 'Dettagli di Giocatore 1' })
    expect(within(sheet).getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    const headings = Array.from(sheet.querySelectorAll('summary, .remove-player-action')).map((node) =>
      node.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(headings.map((text) => text?.split(/massimo|\d/)[0].trim())).toEqual([
      'Danni Commander',
      'Altri segnalini',
      'Configurazione mazzo',
      'Rimuovi giocatore',
    ])

    fireEvent(sheet, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(details).toHaveFocus()
  })

  it('keeps scores and the Commander section state across close and reopen', () => {
    installMatchMedia(true)
    render(<App />)
    const open = () => fireEvent.click(within(panel(/giocatore 1/i)).getByRole('button', { name: /dettagli/i }))

    open()
    let sheet = screen.getByRole('dialog')
    const commander = within(sheet).getByText('Danni Commander').closest('details') as HTMLDetailsElement
    commander.open = true
    fireEvent(commander, new Event('toggle'))
    fireEvent.click(within(sheet).getByRole('button', { name: /aumenta danni commander da giocatore 2/i }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Chiudi' }))
    expect(life(/giocatore 1/i)).toHaveTextContent('39')

    open()
    sheet = screen.getByRole('dialog')
    expect((within(sheet).getByText('Danni Commander').closest('details') as HTMLDetailsElement).open).toBe(true)
    expect(within(sheet).getByText('massimo 1/21')).toBeInTheDocument()
  })

  it('removes from the sheet and leaves a focused Undo bar in that cell', () => {
    installMatchMedia(true)
    render(<App />)
    fireEvent.click(within(panel(/giocatore 2/i)).getByRole('button', { name: /dettagli/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rimuovi giocatore' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const bar = screen.getByText('Giocatore 2 rimosso').closest('.undo-bar') as HTMLElement
    expect(Array.from(document.getElementById('main')?.children ?? []).indexOf(bar)).toBe(1)
    expect(bar).toHaveFocus()

    fireEvent.click(within(bar).getByRole('button', { name: 'Annulla' }))
    expect(screen.getAllByRole('region')).toHaveLength(4)
  })

  it('shows the compact defeat label and keeps every reason for screen readers', () => {
    installMatchMedia(true)
    render(<App />)
    fireEvent.click(within(panel(/giocatore 1/i)).getByRole('button', { name: /dettagli/i }))
    const sheet = screen.getByRole('dialog')
    for (let step = 0; step < 21; step += 1) {
      fireEvent.click(within(sheet).getByRole('button', { name: /aumenta danni commander da giocatore 2/i }))
    }
    fireEvent.click(within(sheet).getByRole('button', { name: 'Chiudi' }))
    expect(badgeOf(panel(/giocatore 1/i))).toHaveTextContent(
      'Sconfitto · 21 Commander: 21 danni da un comandante',
    )
  })

  it('offers removal only when more than two players remain', () => {
    installMatchMedia(true)
    localStorage.setItem('commander-companion.game.v1', JSON.stringify(createGame(2)))
    render(<App />)
    fireEvent.click(within(panel(/giocatore 1/i)).getByRole('button', { name: /dettagli/i }))
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Rimuovi giocatore' })).not.toBeInTheDocument()
  })

  it('moves notices into the header as Stato app', () => {
    installMatchMedia(true)
    localStorage.setItem('commander-companion.game.v1', '{broken')
    render(<App />)
    const controls = screen.getByRole('group', { name: 'Controlli partita' })
    expect(within(controls).getByRole('button', { name: 'Stato app' })).toHaveAccessibleDescription('1 avviso')
    expect(document.querySelector('.app-notices:not(.app-notices--panel)')).toBeNull()
  })
})
