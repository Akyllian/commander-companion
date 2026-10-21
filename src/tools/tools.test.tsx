import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { createGame } from '../game/game'
import { STORAGE_KEY } from '../game/storage'

const PREFS = 'commander-companion.preferences'
const rhombus = () => screen.getByRole('button', { name: /^(apri strumenti e sezioni|chiudi strumenti)$/i })
const openTool = (name: 'Dadi' | 'Mana' | 'Moneta') => {
  fireEvent.click(rhombus())
  fireEvent.click(screen.getByRole('button', { name }))
}
const live = () => document.querySelector('#strumenti [aria-live="polite"]') as HTMLElement
const layoutPrefs = (fourPlayerLayout: string, twoPlayerLayout = 'same-side') =>
  localStorage.setItem(PREFS, JSON.stringify({ keepScreenOn: true, fourPlayerLayout, twoPlayerLayout, rhombusHintVersion: 2 }))

afterEach(() => vi.restoreAllMocks())

describe('Dadi (R2 §8.1)', () => {
  it('replaces the actions with the panel and focuses «Torna agli strumenti»', () => {
    render(<App />)
    openTool('Dadi')
    expect(screen.queryByRole('group', { name: 'Strumenti e sezioni' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Dadi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Torna agli strumenti' })).toHaveFocus()
  })

  it('rolls a d20 and announces it once; the same value rolled again is announced again', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8)
    render(<App />)
    openTool('Dadi')
    fireEvent.click(screen.getByRole('button', { name: 'Lancia d20' }))
    expect(screen.getByTestId('dice-result')).toHaveTextContent('d2017')
    expect(live()).toHaveTextContent('d20: 17')
    const first = live().textContent
    fireEvent.click(screen.getByRole('button', { name: 'Lancia d20' }))
    expect(live().textContent).not.toBe(first)
    expect(live()).toHaveTextContent('d20: 17')
  })

  it('shows four copies in Tavolo, three of them hidden from assistive technology', () => {
    layoutPrefs('table')
    render(<App />)
    openTool('Dadi')
    fireEvent.click(screen.getByRole('button', { name: 'Lancia d6' }))
    const copies = screen.getByTestId('dice-result').querySelectorAll('.oriented-result__copy')
    expect(Array.from(copies, (copy) => copy.getAttribute('data-orientation'))).toEqual(['0', '90', '180', '-90'])
    expect(Array.from(copies).filter((copy) => copy.getAttribute('aria-hidden') === 'true')).toHaveLength(3)
  })

  it('goes back to the actions with focus on Dadi, and the result is gone on any exit', () => {
    render(<App />)
    openTool('Dadi')
    fireEvent.click(screen.getByRole('button', { name: 'Lancia d6' }))
    fireEvent.click(screen.getByRole('button', { name: 'Torna agli strumenti' }))
    expect(screen.getByRole('button', { name: 'Dadi' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Dadi' }))
    expect(screen.queryByTestId('dice-result')).not.toBeInTheDocument()
  })

  it('closes the whole layer with Escape or the rhombus, focusing the rhombus', () => {
    render(<App />)
    openTool('Dadi')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.getElementById('strumenti')).toBeNull()
    expect(rhombus()).toHaveFocus()
    openTool('Dadi')
    fireEvent.click(rhombus())
    expect(document.getElementById('strumenti')).toBeNull()
    openTool('Dadi')
    expect(screen.queryByTestId('dice-result')).not.toBeInTheDocument()
  })
})

describe('Moneta (R2 §8.3)', () => {
  it('flips Testa or Croce, with a copy per side face to face, announced once in Italian', () => {
    layoutPrefs('grid', 'facing')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(2)))
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    render(<App />)
    openTool('Moneta')
    fireEvent.click(screen.getByRole('button', { name: 'Lancia moneta' }))
    const result = screen.getByTestId('coin-result')
    expect(within(result).getAllByText('Testa')).toHaveLength(2)
    expect(live()).toHaveTextContent('Moneta: Testa')
  })
})

describe('Mana (R2 §8.2)', () => {
  const add = (label: string) => fireEvent.click(screen.getByRole('button', { name: `Aggiungi 1 mana ${label}` }))
  const value = (label: string) => within(screen.getByRole('group', { name: label })).getByTestId('mana-value')

  it('offers six vertical steppers and a reset that is disabled at zero', () => {
    render(<App />)
    openTool('Mana')
    for (const label of ['Bianco', 'Blu', 'Nero', 'Rosso', 'Verde', 'Incolore']) {
      const group = screen.getByRole('group', { name: label })
      expect(within(group).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
        `Aggiungi 1 mana ${label}`,
        `Togli 1 mana ${label}`,
      ])
    }
    expect(screen.getByRole('button', { name: 'Azzera mana' })).toBeDisabled()
  })

  it('draws six distinct decorative symbols instead of letters (F34 exception)', () => {
    render(<App />)
    openTool('Mana')
    const symbols = Array.from(document.querySelectorAll<SVGElement>('.mana-symbol'))
    expect(symbols.map((symbol) => symbol.dataset.mana)).toEqual(['W', 'U', 'B', 'R', 'G', 'C'])
    for (const symbol of symbols) expect(symbol).toHaveAttribute('aria-hidden', 'true')
    // Each shape is its own drawing, not one glyph recoloured.
    expect(new Set(symbols.map((symbol) => symbol.innerHTML)).size).toBe(6)
    for (const letter of ['W', 'U', 'B', 'R', 'G', 'C']) expect(screen.queryByText(letter)).not.toBeInTheDocument()
  })

  it('resets at once, without a dialog, and announces it', () => {
    render(<App />)
    openTool('Mana')
    add('Rosso')
    add('Rosso')
    expect(value('Rosso')).toHaveTextContent('2')
    const reset = screen.getByRole('button', { name: 'Azzera mana' })
    expect(reset).toBeEnabled()
    fireEvent.click(reset)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(value('Rosso')).toHaveTextContent('0')
    expect(live()).toHaveTextContent('Mana azzerato')
  })

  it('keeps the pool across closing the tool and changing section, but not a score reset', () => {
    render(<App />)
    openTool('Mana')
    add('Verde')
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(rhombus())
    fireEvent.click(screen.getByRole('button', { name: 'Sezioni' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Azzera punteggi' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Azzera punteggi' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name: 'Partita' }))
    openTool('Mana')
    expect(value('Verde')).toHaveTextContent('1')
  })

  it('starts empty after a confirmed new game and after a reload', () => {
    const first = render(<App />)
    openTool('Mana')
    add('Blu')
    fireEvent.click(screen.getByRole('button', { name: 'Torna agli strumenti' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sezioni' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nuova partita' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nuova partita' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sezioni' })).getByRole('link', { name: 'Partita' }))
    openTool('Mana')
    expect(value('Blu')).toHaveTextContent('0')
    add('Blu')
    first.unmount()
    render(<App />)
    openTool('Mana')
    expect(value('Blu')).toHaveTextContent('0')
  })
})
