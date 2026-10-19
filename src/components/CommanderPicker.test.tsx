import { IDBFactory } from 'fake-indexeddb'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { createIndexedDbArtStore, setArtStoreForTests } from '../media/artStore'

const card = {
  id: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9',
  name: 'Zimone, All-Questioning',
  artist: 'Ekaterina Burmak',
  image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/front/c/a/ca09.jpg' },
}

function stubNetwork(mode: 'ok' | 'offline') {
  const fetchMock = vi.fn(async (url: string) => {
    if (mode === 'offline') throw new TypeError('Failed to fetch')
    if (url.startsWith('https://api.scryfall.com/')) {
      return new Response(JSON.stringify({ data: [card] }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  setArtStoreForTests(createIndexedDbArtStore(new IDBFactory()))
  URL.createObjectURL = vi.fn(() => 'blob:art')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  setArtStoreForTests(undefined)
  vi.unstubAllGlobals()
})

const openDeckConfig = () => {
  const panel = screen.getByRole('region', { name: /giocatore 1/i })
  const details = within(panel).getByText('Configurazione mazzo').closest('details') as HTMLDetailsElement
  details.open = true
  return panel
}

describe('commander picker (Phase 2c)', () => {
  it('searches Scryfall, caches the art and shows it with the artist credit', async () => {
    const fetchMock = stubNetwork('ok')
    render(<App />)
    const panel = openDeckConfig()

    const search = within(panel).getByRole('searchbox', { name: 'Cerca il comandante' })
    fireEvent.change(search, { target: { value: 'zimone' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerca' }))

    const result = await within(panel).findByRole('button', { name: /Zimone, All-Questioning/ })
    expect(within(panel).getByText('1 risultato')).toBeInTheDocument()

    await act(async () => fireEvent.click(result))
    await waitFor(() => expect(panel.querySelector('.player-art img')).toHaveAttribute('src', 'blob:art'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(within(panel).getAllByText('Illustrazione di Ekaterina Burmak').length).toBeGreaterThan(0)
    expect(panel).toHaveAttribute('data-has-art')
    expect(panel.querySelector('.player-art')).toHaveAttribute('aria-hidden', 'true')

    // Undoable like any other change.
    fireEvent.click(screen.getByRole('button', { name: /annulla ultima azione/i }))
    await waitFor(() => expect(panel.querySelector('.player-art')).toBeNull())
  })

  it('explains that a connection is needed when offline', async () => {
    stubNetwork('offline')
    render(<App />)
    const panel = openDeckConfig()
    fireEvent.change(within(panel).getByRole('searchbox'), { target: { value: 'zimone' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerca' }))
    expect(await within(panel).findByText(/serve una connessione a internet/i)).toBeInTheDocument()
  })

  it('removes the commander', async () => {
    stubNetwork('ok')
    localStorage.setItem(
      'commander-companion.game.v1',
      JSON.stringify({
        version: 3,
        players: [1, 2].map((n) => ({
          id: `player-${n}`,
          name: `Giocatore ${n}`,
          life: 40,
          poison: 0,
          energy: 0,
          experience: 0,
          accent: n === 1 ? 'verdigris' : 'gold',
          hasPartner: false,
          commanderDamage: {},
          commander: n === 1 ? { cardId: card.id, name: card.name, artist: card.artist } : null,
        })),
      }),
    )
    render(<App />)
    const panel = openDeckConfig()
    expect(within(panel).getAllByText(card.name).length).toBeGreaterThan(0)
    fireEvent.click(within(panel).getByRole('button', { name: 'Rimuovi comandante' }))
    expect(within(panel).queryByText(card.name)).not.toBeInTheDocument()
  })
})
