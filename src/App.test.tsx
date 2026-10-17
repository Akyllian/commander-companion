import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { createGame, gameReducer } from './game/game'
import { BACKUP_KEY, STORAGE_KEY } from './game/storage'
import { updateStore } from './pwa/updates'

const panel = (name: RegExp) => screen.getByRole('region', { name })
const life = (name: RegExp) => within(panel(name)).getByTestId('life-total')
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
    expect(within(player).getByText('Sconfitto')).toHaveTextContent(/10 segnalini veleno/)
  })
})

describe('partner commanders', () => {
  it('tracks the two commanders of a partner deck separately', () => {
    render(<App />)
    fireEvent.click(within(panel(/giocatore 2/i)).getByRole('checkbox', { name: /due comandanti/i }))

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
    expect(within(panel(/giocatore 2/i)).getByText(/azzera prima i danni/i)).toBeInTheDocument()
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

  it('starts a new game only after confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)
    fireEvent.change(screen.getByRole('combobox', { name: /numero di giocatori/i }), { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: /nuova partita/i }))
    expect(screen.getAllByRole('region')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /nuova partita/i }))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('region')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /annulla ultima azione/i })).toBeDisabled()
  })

  it('resets scores only after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<App />)
    click(panel(/giocatore 1/i), /riduci.*5.*vita/i)

    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
    expect(life(/giocatore 1/i)).toHaveTextContent('35')
    fireEvent.click(screen.getByRole('button', { name: /azzera punteggi/i }))
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

  it('confirms when the app is ready to work offline', () => {
    render(<App />)
    act(() => updateStore.markOfflineReady())
    expect(screen.getByText(/senza connessione/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(screen.queryByText(/senza connessione/i)).not.toBeInTheDocument()
  })
})
