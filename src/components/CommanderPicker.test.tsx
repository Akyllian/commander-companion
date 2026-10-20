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
  const details = within(panel).getByText('Comandante e mazzo').closest('details') as HTMLDetailsElement
  details.open = true
  return panel
}

describe('commander picker (Phase 2c)', () => {
  it('searches Scryfall, caches the art and shows it with the artist credit', async () => {
    const fetchMock = stubNetwork('ok')
    render(<App />)
    const panel = openDeckConfig()

    const search = within(panel).getByRole('searchbox', { name: 'Cerca comandante' })
    fireEvent.change(search, { target: { value: 'zimone' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerca' }))

    const result = await within(panel).findByRole('button', { name: 'Zimone, All-Questioning, illustrazione di Ekaterina Burmak' })
    expect(result.querySelector('img')).toHaveAttribute('src', card.image_uris.art_crop)
    expect(within(panel).getByText('1 risultato')).toBeInTheDocument()

    await act(async () => fireEvent.click(result))
    await waitFor(() => expect(panel.querySelector('.player-art > img')).toHaveAttribute('src', 'blob:art'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(within(panel).getAllByText('Illustrazione di Ekaterina Burmak').length).toBeGreaterThan(0)
    expect(panel).toHaveAttribute('data-has-art')
    expect(panel.querySelector('.player-art')).toHaveAttribute('aria-hidden', 'true')
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
        version: 4,
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
          commanders: [n === 1 ? { cardId: card.id, name: card.name, artist: card.artist } : null, null],
        })),
      }),
    )
    render(<App />)
    const panel = openDeckConfig()
    expect(within(panel).getAllByText(card.name).length).toBeGreaterThan(0)
    fireEvent.click(within(panel).getByRole('button', { name: 'Rimuovi comandante' }))
    expect(within(panel).queryByText(card.name)).not.toBeInTheDocument()
  })

  it('offers a second slot for partners and splits the panel when both have art', async () => {
    stubNetwork('ok')
    const commander = { cardId: card.id, name: card.name, artist: card.artist }
    localStorage.setItem(
      'commander-companion.game.v1',
      JSON.stringify({
        version: 4,
        players: [1, 2].map((n) => ({
          id: `player-${n}`,
          name: `Giocatore ${n}`,
          life: 40,
          poison: 0,
          energy: 0,
          experience: 0,
          accent: n === 1 ? 'verdigris' : 'gold',
          hasPartner: n === 1,
          commanderDamage: {},
          commanders: n === 1 ? [commander, { ...commander, cardId: '0f6d9a0e-1111-4c55-9d1e-2c4b4a6b7c8d', name: 'Dina' }] : [null, null],
        })),
      }),
    )
    const store = createIndexedDbArtStore(new IDBFactory())
    const stored = { bytes: new Uint8Array([1]).buffer, type: 'image/jpeg', veil: { name: 0.2, life: 0.5 } }
    await store.put(card.id, stored)
    await store.put('0f6d9a0e-1111-4c55-9d1e-2c4b4a6b7c8d', { ...stored, veil: { name: 0.6, life: 0.1 } })
    setArtStoreForTests(store)

    render(<App />)
    const panel = openDeckConfig()
    expect(within(panel).getByRole('group', { name: 'Comandante 1' })).toBeInTheDocument()
    expect(within(panel).getByRole('group', { name: 'Comandante 2' })).toBeInTheDocument()
    await waitFor(() => expect(panel.querySelector('.player-art[data-split]')).not.toBeNull())
    expect(panel.querySelectorAll('.player-art__half img')).toHaveLength(2)
    // The shared text veils take the stronger reinforcement of the two arts.
    expect(panel.style.getPropertyValue('--art-veil-name')).toBe('0.6')
    expect(panel.style.getPropertyValue('--art-veil-life')).toBe('0.5')
    expect(within(panel).getAllByText('Illustrazione di Ekaterina Burmak').length).toBeGreaterThan(1)
  })
})
