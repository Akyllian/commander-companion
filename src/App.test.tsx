import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { createGame, gameReducer } from './game/game'
import { BACKUP_KEY, STORAGE_KEY } from './game/storage'
import { updateStore } from './pwa/updates'
import { installMatchMedia } from './test/matchMedia'
import { DELTA_EXIT_MS } from './components/DeltaBadge'

let clock = 0
const panel = (name: RegExp) => screen.getByRole('region', { name })
const life = (name: RegExp) => within(panel(name)).getByTestId('life-total')
// The first badge in DOM order is the visible one (a closed details sheet may hold another).
const badgeOf = (scope: HTMLElement) => within(scope).getAllByText('Sconfitto')[0].closest('.status-badge') as HTMLElement
const click = (scope: HTMLElement, name: RegExp) => fireEvent.click(within(scope).getByRole('button', { name }))
/** Picks a score mode in the panel's dock (D-033). */
const mode = (scope: HTMLElement, label: RegExp) =>
  fireEvent.click(within(within(scope).getByRole('group', { name: /^punteggio di/i })).getByRole('button', { name: label }))

/** Opens a section the way a player does: from the game, the rhombus first reveals the bar. */
const goTo = (name: 'Partita' | 'Mazzi' | 'Impara' | 'Altro') => {
  if (!screen.queryByRole('navigation', { name: 'Sezioni' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Mostra le sezioni' }))
  }
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name }))
}
/** Asks for a new game from Altro and confirms it. */
const newGame = (players: 2 | 3 | 4) => {
  goTo('Altro')
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Giocatori per la nuova partita' })).getByRole('radio', { name: String(players) }))
  fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
  goTo('Partita')
}
/** Resets the scores from Altro and returns to the table. */
const resetScores = () => {
  goTo('Altro')
  fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Azzera punteggi' }))
  goTo('Partita')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  updateStore.reset()
  window.history.replaceState(null, '', window.location.pathname)
})

describe('scoring', () => {
  it('changes a life total', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)
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
    mode(player, /^veleno/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /riduci veleno di giocatore 1/i)
    expect(within(player).getByRole('status', { name: /veleno di giocatore 1/i })).toHaveTextContent('1')
  })

  it('applies Commander damage to life as one undoable step', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)
    mode(target, /^commander/i)

    click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('38')
    expect(within(target).getByRole('status', { name: /danni commander da giocatore 2/i })).toHaveTextContent('2')

    click(target, /riduci danni commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('39')
  })

  it('shows the defeat label with its reason', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    mode(player, /^veleno/i)
    for (let step = 0; step < 10; step += 1) click(player, /aumenta veleno di giocatore 1/i)
    expect(badgeOf(player)).toHaveTextContent('Sconfitto · 10 veleno: 10 segnalini veleno')
  })

  it('summarises several defeat conditions', () => {
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 1000))
    render(<App />)
    const player = panel(/giocatore 1/i)
    mode(player, /^veleno/i)
    for (let step = 0; step < 10; step += 1) click(player, /aumenta veleno di giocatore 1/i)
    mode(player, /^vita/i)
    for (let step = 0; step < 8; step += 1) click(player, /riduci di 5 la vita/i)
    expect(badgeOf(player)).toHaveTextContent(/^Sconfitto · 2 condizioni/)
    // Eighteen full-app taps: under coverage on a busy machine this can pass 5 s.
  }, 15_000)

  it('summarises Commander damage with the maximum from one commander, not the sum', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)
    mode(target, /^commander/i)
    for (let step = 0; step < 3; step += 1) click(target, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    click(target, /^giocatore 3/i)
    click(target, /aumenta danni commander da giocatore 3 a giocatore 1/i)
    expect(within(target).getByRole('button', { name: 'Commander: massimo 3 su 21' })).toHaveTextContent('3/21')
  })

  it('keeps the chosen mode while the rest of the table keeps scoring', () => {
    render(<App />)
    mode(panel(/giocatore 1/i), /^commander/i)
    click(panel(/giocatore 2/i), /aumenta.*1.*vita/i)
    click(panel(/giocatore 2/i), /riduci.*1.*vita/i)
    expect(within(panel(/giocatore 1/i)).getByRole('button', { name: /^commander/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('partner commanders', () => {
  it('tracks the two commanders of a partner deck separately', () => {
    render(<App />)
    fireEvent.click(within(panel(/giocatore 2/i)).getByRole('checkbox', { name: /due comandanti/i }))
    expect(within(panel(/giocatore 2/i)).getByText('Partner')).toBeInTheDocument()

    const target = panel(/giocatore 1/i)
    mode(target, /^commander/i)
    click(target, /^giocatore 2, comandante 2/i)
    click(target, /aumenta danni commander da giocatore 2, comandante 2 a giocatore 1/i)
    expect(
      within(target).getByRole('status', { name: /danni commander da giocatore 2, comandante 2/i }),
    ).toHaveTextContent('1')
    expect(within(target).getByRole('button', { name: /^giocatore 2, comandante 1/i })).toHaveAccessibleName(
      'Giocatore 2, Comandante 1: 0 danni',
    )

    const toggle = within(panel(/giocatore 2/i)).getByRole('checkbox', { name: /due comandanti/i })
    expect(toggle).toBeDisabled()
    expect(within(panel(/giocatore 2/i)).getByText('Azzera prima danni e tassa del Comandante 2.')).toBeInTheDocument()
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

  it('removes a player at once and starts the new-game draft from the current table', () => {
    render(<App />)
    click(panel(/giocatore 4/i), /rimuovi giocatore 4/i)
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText('Giocatore 4 rimosso')).not.toBeInTheDocument()
    goTo('Altro')
    expect(
      within(screen.getByRole('radiogroup', { name: 'Giocatori per la nuova partita' })).getByRole('radio', { name: '3' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('starts a new game only after confirming in the dialog', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)
    goTo('Altro')
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Giocatori per la nuova partita' })).getByRole('radio', { name: '2' }))
    const opener = screen.getByRole('button', { name: 'Nuova partita' })
    opener.focus()

    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: /iniziare una nuova partita/i })
    expect(dialog).toHaveAccessibleDescription('I punteggi attuali verranno sostituiti.')
    // Focus starts on the safe action, so Enter never confirms by accident.
    expect(within(dialog).getByRole('button', { name: 'Annulla' })).toHaveFocus()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()

    fireEvent.click(opener)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
    goTo('Partita')
    expect(screen.getAllByRole('region')).toHaveLength(2)
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
  })

  it('resets scores only after confirming, and closes with Escape', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)
    goTo('Altro')

    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
    const dialog = screen.getByRole('dialog', { name: /azzerare tutti i punteggi/i })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Azzera punteggi' }))
    goTo('Partita')
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
  })
})

describe('no Undo or Redo (D-037)', () => {
  it('offers no Undo or Redo control and ignores Ctrl/Cmd+Z and Y', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /aumenta.*1.*vita/i)
    expect(screen.queryByRole('button', { name: /annulla ultima azione|ripeti ultima azione/i })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Z', metaKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
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

  it('speaks a Commander burst once, then the life restored by a reset (D-036)', () => {
    vi.useFakeTimers()
    render(<App />)
    const player = panel(/giocatore 1/i)
    const live = player.querySelector('.score-announcement') as HTMLElement
    mode(player, /^commander/i)
    click(player, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    click(player, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    act(() => vi.advanceTimersByTime(700))
    expect(live).toHaveTextContent('Giocatore 1: 2 danni Commander da Giocatore 2; vita 38')

    resetScores()
    act(() => vi.advanceTimersByTime(700))
    expect(live).toHaveTextContent('Giocatore 1: 40 punti vita')
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
  it('groups fast taps and shows the cumulative delta', () => {
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
    expect(within(player).getByTestId('delta-badge')).toHaveAttribute('data-phase', 'exit')
    act(() => vi.advanceTimersByTime(DELTA_EXIT_MS))
    expect(within(player).queryByTestId('delta-badge')).not.toBeInTheDocument()
  })

  it('shows deltas next to counters and Commander damage', () => {
    // One instant: every tap falls in the window, so only target/direction changes split groups.
    vi.spyOn(performance, 'now').mockReturnValue(0)
    render(<App />)
    const player = panel(/giocatore 1/i)
    click(player, /riduci di 1 la vita/i)
    mode(player, /^veleno/i)
    click(player, /aumenta veleno di giocatore 1/i)
    click(player, /aumenta veleno di giocatore 1/i)
    const dockBadge = () => player.querySelector('.score-adjust .delta-badge:not([data-phase])')
    const lifeBadge = () => player.querySelector('.life-value .delta-badge:not([data-phase])')
    expect(dockBadge()).toHaveTextContent('+2')
    mode(player, /^commander/i)
    click(player, /^giocatore 3/i)
    click(player, /aumenta danni commander da giocatore 3 a giocatore 1/i)
    expect(dockBadge()).toHaveTextContent('+1')
    // D-036: the same burst also shows, mirrored, on life.
    expect(lifeBadge()).toHaveTextContent('−1')
    click(player, /riduci danni commander da giocatore 3 a giocatore 1/i)
    expect(dockBadge()).toHaveTextContent('−1')
    expect(lifeBadge()).toHaveTextContent('+1')
  })
})

describe('player removal (D-037: no Undo bar)', () => {
  it('removes at once, with no Undo bar, and the table closes up', () => {
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText('Giocatore 3 rimosso')).not.toBeInTheDocument()
    expect(document.querySelectorAll('#main > .player-seat')).toHaveLength(3)
  })
})

describe('screen-on preference in Altro (UX decision 7)', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('hides the screen-on control when the browser cannot keep the screen awake', () => {
    render(<App />)
    goTo('Altro')
    expect(screen.queryByRole('switch', { name: /mantieni lo schermo acceso/i })).not.toBeInTheDocument()
  })

  it('offers the control on by default and remembers the choice', () => {
    const request = vi.fn(async () => ({ released: false, release: vi.fn(async () => undefined) }))
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
    const first = render(<App />)
    goTo('Altro')
    const toggle = screen.getByRole('switch', { name: /mantieni lo schermo acceso/i })
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)
    first.unmount()
    render(<App />)
    expect(screen.getByRole('switch', { name: /mantieni lo schermo acceso/i })).not.toBeChecked()
  })
})

describe('compact landscape (Phase 1.6)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const shell = () => document.querySelector('.app-shell') as HTMLElement

  it('switches layout when the media query changes, without touching the game', () => {
    const media = installMatchMedia(false)
    render(<App />)
    click(panel(/giocatore 1/i), /riduci di 5 la vita/i)
    expect(shell()).toHaveAttribute('data-compact-density', 'false')

    act(() => media.set(true))
    expect(shell()).toHaveAttribute('data-compact-density', 'true')
    expect(life(/giocatore 1/i)).toHaveTextContent('35')

    act(() => media.set(false))
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
  })

  it('shows a score rail and moves secondary controls to the details sheet', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)

    const rail = within(player).getByRole('group', { name: 'Punti vita di Giocatore 1' })
    expect(within(rail).getAllByRole('button').map((button) => button.textContent)).toEqual(['-5', '-1', '+1', '+5'])
    expect(rail.children[2]).toContainElement(within(player).getByTestId('life-total'))
    expect(within(player).queryByRole('button', { name: /rimuovi/i })).not.toBeInTheDocument()

    const details = within(player).getByRole('button', { name: 'Dettagli di Giocatore 1' })
    details.focus()
    fireEvent.click(details)
    const sheet = screen.getByRole('dialog', { name: 'Dettagli di Giocatore 1' })
    expect(within(sheet).getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    const headings = Array.from(sheet.querySelectorAll('summary, .remove-player-action')).map((node) =>
      node.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(headings).toEqual(['Comandante e mazzo', 'Rimuovi giocatore'])

    fireEvent(sheet, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(details).toHaveFocus()
  })

  it('scores Commander damage on the compact panel, with life still on the rail', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)
    mode(player, /^commander/i)
    click(player, /aumenta danni commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('39')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    mode(player, /^vita/i)
    expect(within(player).getByRole('group', { name: 'Punti vita di Giocatore 1' })).toBeInTheDocument()
  })

  it('removes from the sheet at once, with no Undo bar', () => {
    installMatchMedia(true)
    render(<App />)
    fireEvent.click(within(panel(/giocatore 2/i)).getByRole('button', { name: /dettagli/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rimuovi giocatore' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText('Giocatore 2 rimosso')).not.toBeInTheDocument()
  })

  it('shows the compact defeat label and keeps every reason for screen readers', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)
    mode(player, /^commander/i)
    for (let step = 0; step < 21; step += 1) click(player, /aumenta danni commander da giocatore 2/i)
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

  it('shows notices during play as a toast outside the table', () => {
    installMatchMedia(true)
    localStorage.setItem('commander-companion.game.v1', '{broken')
    render(<App />)
    const toast = document.querySelector('.app-notices[data-placement="toast"]') as HTMLElement
    expect(toast).toHaveTextContent(/salvataggio precedente non era leggibile/i)
    expect(document.getElementById('main')).not.toContainElement(toast)
  })
})

describe('rules reference, bridged in Impara until R4 (Phase 2a, R1)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('opens from Impara and closes without changing the game', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci di 5 la vita/i)
    const stored = localStorage.getItem('commander-companion.game.v1')
    goTo('Impara')

    const trigger = screen.getByRole('button', { name: 'Riferimento rapido Commander' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Regole Commander' })).getByRole('button', { name: 'Chiudi' }))
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent(screen.getByRole('dialog', { name: 'Regole Commander' }), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(localStorage.getItem('commander-companion.game.v1')).toBe(stored)
    goTo('Partita')
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
  })

  it('uses the combat-damage helper wherever Commander damage is shown', () => {
    const helper = 'Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.'
    const standard = render(<App />)
    mode(panel(/giocatore 1/i), /^commander/i)
    expect(within(panel(/giocatore 1/i)).getByRole('group', { name: /fonte dei danni commander/i })).toHaveAccessibleDescription(helper)
    standard.unmount()

    installMatchMedia(true)
    render(<App />)
    mode(panel(/giocatore 1/i), /^commander/i)
    expect(within(panel(/giocatore 1/i)).getByRole('group', { name: /fonte dei danni commander/i })).toHaveAccessibleDescription(helper)
  })
})

describe('four-player layout in Altro (D-034, R1)', () => {
  const PREFS = 'commander-companion.preferences'

  it('applies and saves the choice at once, outside the game', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci di 5 la vita/i)
    const savedGame = localStorage.getItem(STORAGE_KEY)
    goTo('Altro')
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Layout dei giocatori' })).getByRole('radio', { name: /^tavolo/i }))

    expect(JSON.parse(localStorage.getItem(PREFS) ?? '{}')).toMatchObject({ fourPlayerLayout: 'table' })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(savedGame)
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'table')
  })

  it('shows the two-player options after a player leaves, and the saved four-player choice when back at four', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'facing' }))
    render(<App />)
    click(panel(/giocatore 4/i), /rimuovi giocatore 4/i)
    goTo('Altro')
    expect(screen.queryByRole('radiogroup', { name: 'Layout dei giocatori' })).not.toBeInTheDocument()
    goTo('Partita')
    newGame(4)
    goTo('Altro')
    expect(screen.getByRole('radio', { checked: true, name: /fronte a fronte/i })).toHaveAccessibleName('Fronte a fronte: Due per lato')
  })
})

describe('four-player seats (D-034)', () => {
  afterEach(() => vi.unstubAllGlobals())
  const PREFS = 'commander-companion.preferences'
  const seatOf = (name: RegExp) => panel(name).closest('.player-seat') as HTMLElement
  const orientations = () => [1, 2, 3, 4].map((n) => seatOf(new RegExp(`giocatore ${n}$`, 'i')).getAttribute('data-orientation'))

  it.each([
    ['grid', ['0', '0', '0', '0']],
    ['facing', ['180', '180', '0', '0']],
    ['table', ['0', '90', '180', '-90']],
  ] as const)('orients the named players for %s, keeping DOM order 1→4', (layout, expected) => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: layout }))
    render(<App />)
    expect(document.getElementById('main')).toHaveAttribute('data-layout', layout)
    expect(orientations()).toEqual(expected)
    expect(screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual([
      'Segnapunti di Giocatore 1',
      'Segnapunti di Giocatore 2',
      'Segnapunti di Giocatore 3',
      'Segnapunti di Giocatore 4',
    ])
  })

  it('switches layout without remounting panels or touching scores', () => {
    render(<App />)
    const before = panel(/giocatore 2/i)
    click(before, /riduci di 5 la vita/i)
    goTo('Altro')
    fireEvent.click(screen.getByRole('radio', { name: /^fronte a fronte/i }))
    goTo('Partita')
    expect(panel(/giocatore 2/i)).toBe(before)
    expect(life(/giocatore 2/i)).toHaveTextContent('35')
    expect(seatOf(/giocatore 2/i)).toHaveAttribute('data-orientation', '180')
  })

  it('keeps the chosen layout when the viewport density changes (rotation)', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'table' }))
    const media = installMatchMedia(false)
    render(<App />)
    act(() => media.set(true))
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'table')
    act(() => media.set(false))
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'table')
    expect(orientations()).toEqual(['0', '90', '180', '-90'])
  })

  it('uses the plain grid below four players without losing the preference', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'facing' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(3)))
    render(<App />)
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'grid')
    expect(JSON.parse(localStorage.getItem(PREFS) ?? '{}')).toMatchObject({ fourPlayerLayout: 'facing' })
  })
})

describe('two-player layouts (D-035)', () => {
  const PREFS = 'commander-companion.preferences'
  const seatOf = (name: RegExp) => panel(name).closest('.player-seat') as HTMLElement

  it('offers Stesso lato and Fronte a fronte with two players, saved apart from the four-player choice', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'table', twoPlayerLayout: 'same-side' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(2)))
    render(<App />)
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'grid')

    goTo('Altro')
    const sheet = screen.getByRole('radiogroup', { name: 'Layout dei giocatori' })
    expect(within(sheet).getAllByRole('radio').map((option) => option.getAttribute('aria-label'))).toEqual([
      'Stesso lato: Tutti e due verso di te',
      'Fronte a fronte: Uno per lato',
    ])
    expect(within(sheet).getByRole('radio', { checked: true })).toHaveAccessibleName('Stesso lato: Tutti e due verso di te')
    fireEvent.click(within(sheet).getByRole('radio', { name: /^fronte a fronte/i }))
    goTo('Partita')

    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'two-facing')
    expect(seatOf(/giocatore 1$/i)).toHaveAttribute('data-seat', 'top-start')
    expect(seatOf(/giocatore 1$/i)).toHaveAttribute('data-orientation', '0')
    expect(seatOf(/giocatore 2$/i)).toHaveAttribute('data-seat', 'top-end')
    expect(seatOf(/giocatore 2$/i)).toHaveAttribute('data-orientation', '180')
    expect(screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual([
      'Segnapunti di Giocatore 1',
      'Segnapunti di Giocatore 2',
    ])
    expect(JSON.parse(localStorage.getItem(PREFS) ?? '{}')).toEqual({
      keepScreenOn: true,
      fourPlayerLayout: 'table',
      twoPlayerLayout: 'facing',
      // Reaching Altro used the rhombus, so its first-use hint is gone.
      rhombusHintSeen: true,
    })
  })

  it('keeps the side-by-side density face to face: only the opposite player turns (R1 §13.3)', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'facing' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(2)))
    render(<App />)
    expect(screen.getAllByRole('region').some((region) => region.hasAttribute('data-compact'))).toBe(false)
    expect(seatOf(/giocatore 1$/i)).toHaveAttribute('data-orientation', '0')
    expect(seatOf(/giocatore 2$/i)).toHaveAttribute('data-orientation', '180')
  })

  it('switches to the two-player layout as soon as the third player leaves', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'facing' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(3)))
    render(<App />)
    click(panel(/giocatore 3/i), /rimuovi giocatore 3/i)
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'two-facing')
  })
})

describe('reset scope (D-033)', () => {
  it('says that reset also clears tax and table roles, and does so', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    mode(player, /^tassa/i)
    click(player, /^aumenta di 2 mana/i)
    mode(player, /^monarca/i)
    goTo('Altro')
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    const dialog = screen.getByRole('dialog', { name: /azzerare tutti i punteggi/i })
    expect(dialog).toHaveTextContent('Vita, danni, segnalini, tassa, Monarca e Iniziativa torneranno ai valori iniziali.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Azzera punteggi' }))
    goTo('Partita')
    expect(within(player).getByRole('button', { name: /^monarca/i })).toHaveAttribute('aria-pressed', 'false')
    expect(within(player).getByRole('status', { name: /tassa del comandante 1/i })).toHaveAccessibleName(
      'Tassa del Comandante 1 di Giocatore 1: più 0 mana',
    )
  })
})

describe('direct scoring dock structure (D-033)', () => {
  it.each([
    ['standard', false],
    ['compact', true],
  ])('renders exactly one labelled mode group per panel (%s)', (_label, compact) => {
    installMatchMedia(compact)
    render(<App />)
    for (const region of screen.getAllByRole('region')) {
      const name = region.getAttribute('aria-label')?.replace('Segnapunti di ', '')
      expect(within(region).getAllByRole('group', { name: `Punteggio di ${name}` })).toHaveLength(1)
    }
  })

  it('keeps the same panel nodes when the mode changes', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    const strip = within(player).getByRole('group', { name: /^punteggio di/i })
    mode(player, /^radiazioni/i)
    mode(player, /^vita/i)
    expect(panel(/giocatore 1/i)).toBe(player)
    expect(within(player).getByRole('group', { name: /^punteggio di/i })).toBe(strip)
  })
})

describe('canonical one-shot light (D-024)', () => {
  it('blooms only the life total that changed, never on first render', () => {
    render(<App />)
    expect(document.querySelectorAll('.life-total[data-bloom]')).toHaveLength(0)

    click(panel(/giocatore 2/i), /aumenta di 1 la vita/i)
    const bloomed = Array.from(document.querySelectorAll('.life-total[data-bloom]'))
    expect(bloomed).toHaveLength(1)
    expect(bloomed[0]).toBe(life(/giocatore 2/i))
  })
})

describe('Fan Content Policy (D-025)', () => {
  it('shows the required notice in English in Altro, with the Scryfall credit', () => {
    render(<App />)
    goTo('Altro')
    const altro = document.querySelector('[data-section="altro"]') as HTMLElement
    const notice = within(altro).getByText(/is unofficial Fan Content permitted under the Fan Content Policy/)
    expect(notice).toHaveAttribute('lang', 'en')
    expect(notice).toHaveTextContent('©Wizards of the Coast LLC.')
    expect(screen.getByText('Dati e illustrazioni delle carte da Scryfall')).toBeVisible()
  })

  it('keeps the notice reachable through the rules reference', () => {
    render(<App />)
    goTo('Impara')
    fireEvent.click(screen.getByRole('button', { name: 'Riferimento rapido Commander' }))
    expect(within(screen.getByRole('dialog', { name: 'Regole Commander' })).getByText(/unofficial Fan Content/)).toBeVisible()
  })
})

describe('app shell (D-037, R1)', () => {
  const nav = () => screen.queryByRole('navigation', { name: 'Sezioni' })
  const rhombus = () => screen.getByRole('button', { name: /le sezioni$/ })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('opens on the game with the bar hidden, and the rhombus reveals it without remounting the table', () => {
    render(<App />)
    const table = panel(/giocatore 1/i)
    expect(nav()).toBeNull()
    expect(document.getElementById('sezioni')).toHaveAttribute('hidden')
    expect(rhombus()).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(rhombus())
    expect(nav()).toBeInTheDocument()
    expect(rhombus()).toHaveAccessibleName('Nascondi le sezioni')
    expect(panel(/giocatore 1/i)).toBe(table)
    expect(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' })).toHaveAttribute('aria-current', 'page')
  })

  it('hides the revealed bar with Esc, with Partita or with the rhombus, keeping focus on the rhombus', () => {
    render(<App />)
    fireEvent.click(rhombus())
    within(nav() as HTMLElement).getByRole('link', { name: 'Mazzi' }).focus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
    expect(nav()).toBeNull()
    expect(rhombus()).toHaveFocus()

    fireEvent.click(rhombus())
    fireEvent.click(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' }))
    expect(nav()).toBeNull()
    expect(rhombus()).toHaveFocus()

    fireEvent.click(rhombus())
    fireEvent.click(rhombus())
    expect(nav()).toBeNull()
  })

  it('moves focus into the bar when the rhombus is used from the keyboard', () => {
    render(<App />)
    fireEvent.click(rhombus(), { detail: 0 })
    expect(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' })).toHaveFocus()
  })

  it('keeps the bar outside the game, keeps the scores, and follows Back', () => {
    render(<App />)
    click(panel(/giocatore 1/i), /riduci di 5 la vita/i)
    goTo('Altro')
    expect(window.location.hash).toBe('#altro')
    expect(nav()).toBeInTheDocument()
    expect(document.getElementById('main')).toHaveAttribute('hidden')
    expect(screen.getByRole('heading', { level: 1, name: 'Altro' })).toBeVisible()

    act(() => {
      window.history.replaceState(null, '', window.location.pathname)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(document.getElementById('main')).not.toHaveAttribute('hidden')
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
    expect(nav()).toBeNull()
  })

  it('opens on the section in the address', () => {
    window.history.replaceState(null, '', '#impara')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Impara' })).toBeVisible()
  })

  it('moves focus to the new title after choosing a section from the keyboard', () => {
    render(<App />)
    fireEvent.click(rhombus(), { detail: 0 })
    fireEvent.click(within(nav() as HTMLElement).getByRole('link', { name: 'Mazzi' }), { detail: 0 })
    expect(screen.getByRole('heading', { level: 1, name: 'Mazzi' })).toHaveFocus()
  })

  it('shows the hint until the rhombus is first used, and never again', () => {
    const first = render(<App />)
    expect(screen.getByText('Tocca ◇ per le sezioni')).toBeInTheDocument()
    fireEvent.click(rhombus())
    expect(screen.queryByText('Tocca ◇ per le sezioni')).not.toBeInTheDocument()
    first.unmount()
    render(<App />)
    expect(screen.queryByText('Tocca ◇ per le sezioni')).not.toBeInTheDocument()
  })

  it('holds the screen awake only while the game is visible', async () => {
    const release = vi.fn(async () => undefined)
    const request = vi.fn(async () => ({ released: false, release }))
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
    render(<App />)
    await act(async () => undefined)
    expect(request).toHaveBeenCalledTimes(1)
    goTo('Altro')
    await act(async () => undefined)
    expect(release).toHaveBeenCalled()
    goTo('Partita')
    await act(async () => undefined)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('keeps notices in the flow outside the game', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    render(<App />)
    goTo('Altro')
    expect(document.querySelector('.app-notices[data-placement="inline"]')).toHaveTextContent(/non era leggibile/i)
  })

  it('has no header, brand or footer any more', () => {
    render(<App />)
    expect(document.querySelector('.app-header, .brand, .app-footer')).toBeNull()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Controlli partita' })).not.toBeInTheDocument()
  })
})
