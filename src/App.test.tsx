import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { createGame, gameReducer } from './game/game'
import { BACKUP_KEY, STORAGE_KEY } from './game/storage'
import { updateStore } from './pwa/updates'
import { installMatchMedia } from './test/matchMedia'
import { DELTA_EXIT_MS } from './components/DeltaBadge'
import { MATCH_KEY } from './match/presentation'
import { setArtStoreForTests } from './media/artStore'
import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbDeckStore, setDeckStoreForTests } from './decks/deckStore'
import type { ArtStore } from './media/artStore'

let clock = 0
const panel = (name: RegExp) => screen.getByRole('region', { name })
const life = (name: RegExp) => within(panel(name)).getByTestId('life-total')
const click = (scope: HTMLElement, name: RegExp) => fireEvent.click(within(scope).getByRole('button', { name }))
/** Taps a card's life button `times` times (R2: ±1 only). */
const tapLife = (scope: HTMLElement, sign: 1 | -1, times: number) => {
  for (let tap = 0; tap < times; tap += 1) click(scope, sign > 0 ? /^aumenta di 1 la vita/i : /^riduci di 1 la vita/i)
}
/** Opens a card's Contatori drawer (R2 §5) or Danni Commander panel (R2 §6). */
const openCounters = (scope: HTMLElement) => fireEvent.click(within(scope).getByRole('button', { name: 'Contatori' }))
const openCommander = (scope: HTMLElement) => fireEvent.click(within(scope).getByRole('button', { name: /^danni commander di/i }))
const chooseSource = (scope: HTMLElement, name: string) => fireEvent.click(within(scope).getByRole('radio', { name }))
const counterValue = (scope: HTMLElement, name: string) => within(within(scope).getByRole('group', { name })).getByTestId('counter-value')
/** Opens a card's upright Dettagli sheet (R2 §4.3). */
const openDetails = (scope: HTMLElement) => fireEvent.click(within(scope).getByRole('button', { name: /^apri dettagli di/i }))
const removePlayer = (scope: HTMLElement) => {
  openDetails(scope)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rimuovi giocatore' }))
}

/** Opens a section the way a player does: from the game, rhombus → «Sezioni» reveals the bar (R2 §7.4). */
const goTo = (name: 'Partita' | 'Mazzi' | 'Impara' | 'Altro') => {
  if (!screen.queryByRole('navigation', { name: 'Sezioni' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Apri strumenti e sezioni' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sezioni' }))
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
    tapLife(panel(/giocatore 1/i), -1, 5)
    first.unmount()

    render(<App />)
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
  })

  it('adjusts counters in the Contatori drawer', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCounters(player)
    click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    click(player, /^togli 1 dal veleno di giocatore 1/i)
    expect(counterValue(player, 'Veleno')).toHaveTextContent('1')
  })

  it('applies Commander damage to life as one step', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)
    openCommander(target)

    click(target, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    click(target, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('38')
    expect(within(target).getByTestId('commander-value')).toHaveTextContent('2')

    click(target, /^togli 1 danno commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('39')
  })

  it('marks a poisoned player out of the game and lists the cause in Dettagli', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCounters(player)
    for (let step = 0; step < 10; step += 1) click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    expect(within(player).getByText('Fuori dalla partita')).toBeInTheDocument()
    click(player, /^chiudi contatori/i)
    openDetails(player)
    expect(within(screen.getByRole('dialog')).getByText('10 segnalini veleno')).toBeInTheDocument()
  })

  it('lists several defeat causes together in Dettagli', () => {
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 1000))
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCounters(player)
    for (let step = 0; step < 10; step += 1) click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    click(player, /^chiudi contatori/i)
    tapLife(player, -1, 40)
    openDetails(player)
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByText('10 segnalini veleno')).toBeInTheDocument()
    expect(within(sheet).getByText('punti vita a zero o meno')).toBeInTheDocument()
    // Fifty full-app taps: under coverage on a busy machine this can pass 5 s.
  }, 15_000)

  it('keeps one opponent’s damage per source: 21 from one commander, never the sum', () => {
    render(<App />)
    const target = panel(/giocatore 1/i)
    openCommander(target)
    for (let step = 0; step < 20; step += 1) click(target, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    chooseSource(target, 'Giocatore 3 · Comandante')
    click(target, /^aggiungi 1 danno commander da giocatore 3 a giocatore 1/i)
    expect(within(target).queryByText('Fuori dalla partita')).not.toBeInTheDocument()
    chooseSource(target, 'Giocatore 2 · Comandante')
    click(target, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    expect(within(target).getByText('Fuori dalla partita')).toBeInTheDocument()
  })

  it('keeps one card’s panel open while the rest of the table keeps scoring', () => {
    render(<App />)
    openCommander(panel(/giocatore 1/i))
    click(panel(/giocatore 2/i), /aumenta.*1.*vita/i)
    click(panel(/giocatore 2/i), /riduci.*1.*vita/i)
    expect(within(panel(/giocatore 1/i)).getByRole('radiogroup')).toBeInTheDocument()
  })
})

describe('partner commanders', () => {
  it('tracks the two commanders of a partner deck separately', () => {
    render(<App />)
    openDetails(panel(/giocatore 2/i))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: /due comandanti/i }))
    expect(within(screen.getByRole('dialog')).getByText('Partner')).toBeInTheDocument()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    const target = panel(/giocatore 1/i)
    openCommander(target)
    chooseSource(target, 'Giocatore 2 · Comandante 2')
    click(target, /^aggiungi 1 danno commander da giocatore 2, comandante 2 a giocatore 1/i)
    expect(within(target).getByTestId('commander-value')).toHaveTextContent('1')
    chooseSource(target, 'Giocatore 2 · Comandante 1')
    expect(within(target).getByTestId('commander-value')).toHaveTextContent('0')

    openDetails(panel(/giocatore 2/i))
    const toggle = within(screen.getByRole('dialog')).getByRole('checkbox', { name: /due comandanti/i })
    expect(toggle).toBeDisabled()
    expect(within(screen.getByRole('dialog')).getByText('Azzera prima danni e tassa del Comandante 2.')).toBeInTheDocument()
  })
})

describe('players and match', () => {
  it('renames in Dettagli with Enter and cancels with Escape', () => {
    render(<App />)
    openDetails(panel(/giocatore 1/i))
    const input = within(screen.getByRole('dialog')).getByRole('textbox', { name: /nome giocatore/i })

    fireEvent.change(input, { target: { value: 'Liliana' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(panel(/liliana/i)).toBeInTheDocument()

    const renamed = within(screen.getByRole('dialog')).getByRole('textbox', { name: /nome giocatore/i })
    fireEvent.change(renamed, { target: { value: 'Nessuno' } })
    fireEvent.keyDown(renamed, { key: 'Escape' })
    fireEvent.blur(renamed)
    expect(panel(/liliana/i)).toBeInTheDocument()
  })

  it('removes a player at once and starts the new-game draft from the current table', () => {
    render(<App />)
    removePlayer(panel(/giocatore 4/i))
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText('Giocatore 4 rimosso')).not.toBeInTheDocument()
    goTo('Altro')
    expect(
      within(screen.getByRole('radiogroup', { name: 'Giocatori per la nuova partita' })).getByRole('radio', { name: '3' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('starts a new game only after confirming in the dialog', () => {
    render(<App />)
    tapLife(panel(/giocatore 1/i), -1, 5)
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
    tapLife(panel(/giocatore 1/i), -1, 5)
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
    openCommander(player)
    click(player, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    click(player, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    act(() => vi.advanceTimersByTime(700))
    expect(live).toHaveTextContent('Giocatore 1: 2 danni Commander da Giocatore 2; vita 38')

    click(player, /^chiudi danni commander/i)
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
    openCounters(player)
    click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    click(player, /^aggiungi 1 al veleno di giocatore 1/i)
    const panelBadge = () => player.querySelector('[data-drawer] .delta-badge:not([data-phase])')
    const lifeBadge = () => player.querySelector('.life-value .delta-badge:not([data-phase])')
    expect(panelBadge()).toHaveTextContent('+2')
    openCommander(player)
    chooseSource(player, 'Giocatore 3 · Comandante')
    click(player, /^aggiungi 1 danno commander da giocatore 3 a giocatore 1/i)
    expect(panelBadge()).toHaveTextContent('+1')
    // D-036: the same burst also shows, mirrored, on life.
    expect(lifeBadge()).toHaveTextContent('−1')
    click(player, /^togli 1 danno commander da giocatore 3 a giocatore 1/i)
    expect(panelBadge()).toHaveTextContent('−1')
    expect(lifeBadge()).toHaveTextContent('+1')
  })
})

describe('player removal (D-037: no Undo bar)', () => {
  it('removes at once from Dettagli, with no Undo bar, and the table closes up', () => {
    render(<App />)
    removePlayer(panel(/giocatore 3/i))
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

describe('compact landscape (Phase 1.6, R2)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const shell = () => document.querySelector('.app-shell') as HTMLElement

  it('switches layout when the media query changes, without touching the game', () => {
    const media = installMatchMedia(false)
    render(<App />)
    tapLife(panel(/giocatore 1/i), -1, 5)
    expect(shell()).toHaveAttribute('data-compact-density', 'false')

    act(() => media.set(true))
    expect(shell()).toHaveAttribute('data-compact-density', 'true')
    expect(life(/giocatore 1/i)).toHaveTextContent('35')

    act(() => media.set(false))
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
  })

  it('keeps the same card anatomy, with removal only in Dettagli', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)

    const rail = within(player).getByRole('group', { name: 'Punti vita di Giocatore 1' })
    expect(within(rail).getAllByRole('button').map((button) => button.textContent)).toEqual(['−', '+'])
    expect(rail.children[1]).toContainElement(within(player).getByTestId('life-total'))
    expect(within(player).queryByRole('button', { name: /rimuovi/i })).not.toBeInTheDocument()

    const details = within(player).getByRole('button', { name: 'Apri dettagli di Giocatore 1' })
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

  it('scores Commander damage inside the compact card', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCommander(player)
    click(player, /^aggiungi 1 danno commander da giocatore 2 a giocatore 1/i)
    expect(life(/giocatore 1/i)).toHaveTextContent('39')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('removes from the sheet at once, with no Undo bar', () => {
    installMatchMedia(true)
    render(<App />)
    removePlayer(panel(/giocatore 2/i))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText('Giocatore 2 rimosso')).not.toBeInTheDocument()
  })

  it('marks 21 Commander damage from one source out of the game, with the cause in Dettagli', () => {
    installMatchMedia(true)
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCommander(player)
    for (let step = 0; step < 21; step += 1) click(player, /^aggiungi 1 danno commander da giocatore 2/i)
    expect(within(player).getByText('Fuori dalla partita')).toBeInTheDocument()
    click(player, /^chiudi danni commander/i)
    openDetails(player)
    expect(within(screen.getByRole('dialog')).getByText('21 danni da un comandante')).toBeInTheDocument()
  })

  it('offers removal only when more than two players remain', () => {
    installMatchMedia(true)
    localStorage.setItem('commander-companion.game.v1', JSON.stringify(createGame(2)))
    render(<App />)
    openDetails(panel(/giocatore 1/i))
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
    tapLife(panel(/giocatore 1/i), -1, 5)
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
    openCommander(panel(/giocatore 1/i))
    expect(within(panel(/giocatore 1/i)).getByRole('group', { name: 'Danni Commander' })).toHaveAccessibleDescription(helper)
    standard.unmount()

    installMatchMedia(true)
    render(<App />)
    openCommander(panel(/giocatore 1/i))
    expect(within(panel(/giocatore 1/i)).getByRole('group', { name: 'Danni Commander' })).toHaveAccessibleDescription(helper)
  })
})

describe('four-player layout in Altro (D-034, R1)', () => {
  const PREFS = 'commander-companion.preferences'

  it('applies and saves the choice at once, outside the game', () => {
    render(<App />)
    tapLife(panel(/giocatore 1/i), -1, 5)
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
    removePlayer(panel(/giocatore 4/i))
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
    tapLife(before, -1, 5)
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
      rhombusHintVersion: 2,
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
    removePlayer(panel(/giocatore 3/i))
    expect(document.getElementById('main')).toHaveAttribute('data-layout', 'two-facing')
  })
})

describe('reset scope (D-033)', () => {
  it('says that reset also clears tax and table roles, and does so', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCounters(player)
    click(player, /^aggiungi 2 alla tassa del comandante di giocatore 1/i)
    click(player, /^chiudi contatori/i)
    click(player, /^prendi monarca$/i)
    goTo('Altro')
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    const dialog = screen.getByRole('dialog', { name: /azzerare tutti i punteggi/i })
    expect(dialog).toHaveTextContent('Vita, danni, segnalini, tassa, Monarca e Iniziativa torneranno ai valori iniziali.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Azzera punteggi' }))
    goTo('Partita')
    expect(within(player).getByRole('button', { name: 'Prendi Monarca' })).toHaveAttribute('aria-pressed', 'false')
    openCounters(player)
    expect(counterValue(player, 'Tassa C1')).toHaveTextContent('0')
  })
})

describe('closed card structure (R2 §3)', () => {
  it.each([
    ['standard', false],
    ['compact', true],
  ])('shows no counter and exactly three entries per card (%s)', (_label, compact) => {
    installMatchMedia(compact)
    render(<App />)
    for (const region of screen.getAllByRole('region')) {
      expect(within(region).queryByRole('group', { name: 'Contatori' })).not.toBeInTheDocument()
      expect(region.querySelectorAll('[data-surface-trigger]')).toHaveLength(2)
      expect(within(region).getAllByRole('button', { name: /^apri dettagli di/i })).toHaveLength(1)
    }
  })

  it('keeps the same card nodes when a panel opens and closes', () => {
    render(<App />)
    const player = panel(/giocatore 1/i)
    openCounters(player)
    click(player, /^chiudi contatori/i)
    expect(panel(/giocatore 1/i)).toBe(player)
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

describe('app shell (D-037, R1, R2 §7)', () => {
  const nav = () => screen.queryByRole('navigation', { name: 'Sezioni' })
  const rhombus = () => screen.getByRole('button', { name: /^(apri strumenti e sezioni|chiudi strumenti)$/i })
  const hub = () => document.getElementById('strumenti')
  const sections = () => fireEvent.click(screen.getByRole('button', { name: 'Sezioni' }))

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('opens on the game with the bar hidden; the rhombus opens the hub without remounting the table', () => {
    render(<App />)
    const table = panel(/giocatore 1/i)
    expect(nav()).toBeNull()
    expect(document.getElementById('sezioni')).toHaveAttribute('hidden')
    expect(rhombus()).toHaveAccessibleName('Apri strumenti e sezioni')
    expect(rhombus()).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(rhombus())
    expect(hub()).toBeInTheDocument()
    expect(rhombus()).toHaveAccessibleName('Chiudi strumenti')
    expect(rhombus()).toHaveAttribute('aria-controls', 'strumenti')
    expect(screen.getByRole('button', { name: 'Sezioni' })).toHaveFocus()
    expect(panel(/giocatore 1/i)).toBe(table)
    // The cards cannot be reached or tapped while the hub is open (R2 §7.2).
    for (const seat of document.querySelectorAll('.player-seat')) expect(seat).toHaveAttribute('inert')

    fireEvent.click(rhombus())
    expect(hub()).toBeNull()
    for (const seat of document.querySelectorAll('.player-seat')) expect(seat).not.toHaveAttribute('inert')
  })

  it('reveals the bar from «Sezioni» with focus on Partita, never with the hub open', () => {
    render(<App />)
    fireEvent.click(rhombus())
    sections()
    expect(hub()).toBeNull()
    expect(nav()).toBeInTheDocument()
    expect(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' })).toHaveFocus()
    expect(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(rhombus())
    expect(nav()).toBeNull()
    expect(hub()).toBeInTheDocument()
  })

  it('closes the hub with Escape or a tap outside, focusing the rhombus, without touching a card', () => {
    render(<App />)
    fireEvent.click(rhombus())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(hub()).toBeNull()
    expect(rhombus()).toHaveFocus()

    fireEvent.click(rhombus())
    fireEvent.click(document.querySelector('[data-hub-dismiss]') as HTMLElement)
    expect(hub()).toBeNull()
    expect(rhombus()).toHaveFocus()
    expect(life(/giocatore 1/i)).toHaveTextContent('40')
  })

  it('opening the hub closes a card panel (one surface at a time)', () => {
    render(<App />)
    openCounters(panel(/giocatore 1/i))
    fireEvent.click(rhombus())
    expect(document.querySelector('[data-drawer]:not([data-closing])')).toBeNull()
    expect(hub()).toBeInTheDocument()
  })

  it('re-measures the hub on resize and picks the 2×2 matrix when the radial does not fit', async () => {
    render(<App />)
    const button = rhombus()
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 167, y: 428, width: 56, height: 56 }))
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
    fireEvent.click(button)
    expect(hub()).toHaveAttribute('data-variant', 'radial')

    vi.stubGlobal('innerWidth', 844)
    vi.stubGlobal('innerHeight', 390)
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 394, y: 40, width: 56, height: 56 }))
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
    expect(hub()).toHaveAttribute('data-variant', 'grid')
    vi.unstubAllGlobals()
  })

  it('hides the revealed bar with Esc or Partita, keeping focus on the rhombus', () => {
    render(<App />)
    fireEvent.click(rhombus())
    sections()
    within(nav() as HTMLElement).getByRole('link', { name: 'Mazzi' }).focus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
    expect(nav()).toBeNull()
    expect(rhombus()).toHaveFocus()

    fireEvent.click(rhombus())
    sections()
    fireEvent.click(within(nav() as HTMLElement).getByRole('link', { name: 'Partita' }))
    expect(nav()).toBeNull()
    expect(rhombus()).toHaveFocus()
  })

  it('keeps the bar outside the game, keeps the scores, and follows Back', () => {
    render(<App />)
    tapLife(panel(/giocatore 1/i), -1, 5)
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
    fireEvent.click(rhombus())
    sections()
    fireEvent.click(within(nav() as HTMLElement).getByRole('link', { name: 'Mazzi' }), { detail: 0 })
    expect(screen.getByRole('heading', { level: 1, name: 'Mazzi' })).toHaveFocus()
  })

  it('shows the R2 hint once more to someone who saw the R1 hint', () => {
    localStorage.setItem('commander-companion.preferences', JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'same-side', rhombusHintSeen: true }))
    render(<App />)
    expect(screen.getByText('Tocca ◇ per strumenti e sezioni')).toBeInTheDocument()
  })

  it('shows the hint until the rhombus is first used, and never again', () => {
    const first = render(<App />)
    expect(screen.getByText('Tocca ◇ per strumenti e sezioni')).toBeInTheDocument()
    fireEvent.click(rhombus())
    // During the first hub session it is hidden but keeps its place (D-039).
    expect(screen.getByText('Tocca ◇ per strumenti e sezioni')).toHaveAttribute('data-dimmed')
    fireEvent.click(rhombus())
    expect(screen.queryByText('Tocca ◇ per strumenti e sezioni')).not.toBeInTheDocument()
    first.unmount()
    render(<App />)
    expect(screen.queryByText('Tocca ◇ per strumenti e sezioni')).not.toBeInTheDocument()
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

describe('random art per seat (R2 §4.2, D-039)', () => {
  const cardId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const art = (n: number) => ({ cardId: cardId(n), name: `Carta ${n}`, artist: `Artista ${n}` })
  const storedMatch = () => JSON.parse(localStorage.getItem(MATCH_KEY) ?? 'null') as { matchId: string; randomArtBySeat: Record<string, unknown> }

  afterEach(() => {
    setArtStoreForTests(undefined)
    setDeckStoreForTests(undefined)
    vi.unstubAllGlobals()
  })

  it('changes the match only on a confirmed new game, never on a score reset', () => {
    render(<App />)
    const first = storedMatch().matchId
    expect(first).toBeTruthy()
    resetScores()
    expect(storedMatch().matchId).toBe(first)
    newGame(4)
    expect(storedMatch().matchId).not.toBe(first)
  })

  it('offline, gives seats unused cached spares and keeps them out of the prune', async () => {
    const keys = new Set([cardId(8), cardId(9), cardId(77)])
    const store: ArtStore = {
      get: async (id) => (keys.has(id) ? { bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } } : undefined),
      put: async (id) => void keys.add(id),
      delete: vi.fn(async (id: string) => void keys.delete(id)),
      keys: async () => [...keys],
    }
    setArtStoreForTests(store)
    // No saved decks: the prune may run once the (empty) deck snapshot is known.
    setDeckStoreForTests(createIndexedDbDeckStore(new IDBFactory()))
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('offline')))
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem(MATCH_KEY, JSON.stringify({ version: 1, matchId: 'm1', randomArtBySeat: {}, spareArt: [art(8), art(9)] }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(2)))
    render(<App />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(storedMatch().randomArtBySeat).toEqual({ 'player-1': art(8), 'player-2': art(9) })
    await vi.waitFor(() => expect(store.delete).toHaveBeenCalledWith(cardId(77)))
    expect(store.delete).not.toHaveBeenCalledWith(cardId(8))
    expect(store.delete).not.toHaveBeenCalledWith(cardId(9))
  })
})

describe('one transient surface at a time (R2 §2.5)', () => {
  const PREFS = 'commander-companion.preferences'

  it('replaces one card’s panel with another’s, and Escape returns focus to the trigger', () => {
    render(<App />)
    openCounters(panel(/giocatore 1/i))
    openCommander(panel(/giocatore 2/i))
    expect(document.querySelectorAll('[data-drawer]:not([data-closing])')).toHaveLength(1)
    expect(within(panel(/giocatore 2/i)).getByRole('radiogroup')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('[data-drawer]:not([data-closing])')).toBeNull()
    expect(within(panel(/giocatore 2/i)).getByRole('button', { name: 'Danni Commander di Giocatore 2' })).toHaveFocus()
  })

  it('returns focus to Contatori when the drawer closes from its own control', () => {
    render(<App />)
    openCounters(panel(/giocatore 1/i))
    click(panel(/giocatore 1/i), /^chiudi contatori/i)
    expect(within(panel(/giocatore 1/i)).getByRole('button', { name: 'Contatori' })).toHaveFocus()
  })

  it('closes an open panel when the layout changes', () => {
    localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'same-side' }))
    render(<App />)
    openCounters(panel(/giocatore 1/i))
    goTo('Altro')
    fireEvent.click(screen.getByRole('radio', { name: /tavolo/i }))
    goTo('Partita')
    expect(document.querySelector('[data-drawer]:not([data-closing])')).toBeNull()
  })

  it('leaves no panel and lands focus on the rhombus when that player is removed', async () => {
    render(<App />)
    openCounters(panel(/giocatore 3/i))
    removePlayer(panel(/giocatore 3/i))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('[data-drawer]:not([data-closing])')).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toHaveClass('shell-rhombus')
  })

  it('keeps the seats interactive while a card panel is open', () => {
    render(<App />)
    openCounters(panel(/giocatore 1/i))
    for (const seat of document.querySelectorAll('.player-seat')) expect(seat).not.toHaveAttribute('inert')
  })
})

describe('first-use hint reserve (R2 §7.1, D-039)', () => {
  /** A measured 390px column of four 220px cards, so the rhombus and hint reserve are real. */
  const measureColumn = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.id === 'main') return DOMRect.fromRect({ x: 0, y: 0, width: 390, height: 916 })
      if (this.classList.contains('player-seat')) {
        const index = Array.from(this.parentElement?.querySelectorAll(':scope > .player-seat') ?? []).indexOf(this)
        return DOMRect.fromRect({ x: 0, y: index * 232, width: 390, height: 220 })
      }
      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('shell-rhombus__hint') ? 144 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('shell-rhombus__hint') ? 40 : 0
    })
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
  }
  const reserves = () => Array.from(document.querySelectorAll<HTMLElement>('.player-seat'), (seat) => seat.style.getPropertyValue('--hint-reserve'))
  const rhombusButton = () => document.querySelector('.shell-rhombus') as HTMLElement

  afterEach(() => vi.unstubAllGlobals())

  it('keeps the reserve through the first hub session and releases it only on close', () => {
    measureColumn()
    render(<App />)
    const before = reserves()
    expect(before.some(Boolean)).toBe(true)

    fireEvent.click(rhombusButton())
    expect(reserves()).toEqual(before)
    // The label is hidden but keeps its place, so nothing inside the cards moves.
    expect(document.querySelector('.shell-rhombus__hint')).toHaveAttribute('data-dimmed')
    fireEvent.click(screen.getByRole('button', { name: 'Dadi' }))
    expect(reserves()).toEqual(before)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(reserves().every((reserve) => reserve === '')).toBe(true)
    expect(document.querySelector('.shell-rhombus__hint')).toBeNull()
  })

  it('keeps the reserve while a card panel is open before the first hub use', () => {
    measureColumn()
    render(<App />)
    const before = reserves()
    openCounters(panel(/giocatore 1/i))
    expect(reserves()).toEqual(before)
  })
})
