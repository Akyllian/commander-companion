import {
  createRateLimiter,
  downloadArt,
  fetchRandomCandidate,
  MAX_ART_BYTES,
  SCRYFALL_MIN_INTERVAL_MS,
  ScryfallError,
  searchCommanders,
  toCandidate,
} from './scryfall'

const card = (overrides: Record<string, unknown> = {}) => ({
  id: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9',
  name: 'Zimone, All-Questioning',
  artist: 'Ekaterina Burmak',
  image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/front/c/a/ca09.jpg?1' },
  ...overrides,
})

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('toCandidate', () => {
  it('maps a normal card to an art-crop candidate', () => {
    expect(toCandidate(card())).toEqual({
      cardId: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9',
      name: 'Zimone, All-Questioning',
      artist: 'Ekaterina Burmak',
      artUrl: 'https://cards.scryfall.io/art_crop/front/c/a/ca09.jpg?1',
    })
  })

  it('uses the front face of double-faced cards', () => {
    const dfc = card({
      image_uris: undefined,
      artist: undefined,
      card_faces: [{ artist: 'Johannes Voss', image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/front/e.jpg' } }],
    })
    expect(toCandidate(dfc)).toMatchObject({ artist: 'Johannes Voss', artUrl: 'https://cards.scryfall.io/art_crop/front/e.jpg' })
  })

  it.each([
    ['non-objects', 'card'],
    ['cards without art', card({ image_uris: {} })],
    ['art from another host', card({ image_uris: { art_crop: 'https://evil.example/x.jpg' } })],
    ['missing artist', card({ artist: ' ' })],
    ['missing name', card({ name: undefined })],
    ['faces without data', card({ image_uris: undefined, card_faces: ['x'] })],
  ])('rejects %s', (_label, value) => {
    expect(toCandidate(value)).toBeNull()
  })
})

describe('searchCommanders', () => {
  it('asks Scryfall once for commanders matching the query', async () => {
    const fetchImpl = vi.fn(() => json(200, { data: [card(), card({ id: 'x', name: 'Bad', image_uris: {} })] }))
    const result = await searchCommanders('  zimone ', fetchImpl as unknown as typeof fetch)

    expect(result).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.scryfall.com/cards/search?q=is%3Acommander%20zimone&order=name')
    expect(init.headers).toEqual({ Accept: 'application/json' })
  })

  it('does not search for fewer than two characters', async () => {
    const fetchImpl = vi.fn()
    expect(await searchCommanders(' z ', fetchImpl as unknown as typeof fetch)).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns no results for 404 and at most five otherwise', async () => {
    expect(await searchCommanders('none', (() => json(404, {})) as unknown as typeof fetch)).toEqual([])
    const many = Array.from({ length: 12 }, (_, i) => card({ id: `id-${i}` }))
    expect(await searchCommanders('many', (() => json(200, { data: many })) as unknown as typeof fetch)).toHaveLength(5)
    expect(await searchCommanders('odd', (() => json(200, 'odd')) as unknown as typeof fetch)).toEqual([])
  })

  it('reports network and server failures', async () => {
    await expect(searchCommanders('zimone', (() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' })
    await expect(searchCommanders('zimone', (() => json(500, {})) as unknown as typeof fetch)).rejects.toBeInstanceOf(ScryfallError)
  })
})

describe('downloadArt', () => {
  const image = (bytes: number, type = 'image/jpeg', status = 200) =>
    (() =>
      Promise.resolve(new Response(new Uint8Array(bytes), { status, headers: { 'Content-Type': type } }))) as unknown as typeof fetch
  const url = 'https://cards.scryfall.io/art_crop/front/c/a/ca09.jpg'

  it('downloads an art crop', async () => {
    const blob = await downloadArt(url, image(10))
    expect(blob.size).toBe(10)
  })

  it.each([
    ['another host', 'https://evil.example/x.jpg', image(10)],
    ['an error status', url, image(10, 'image/jpeg', 500)],
    ['a non-image', url, image(10, 'text/html')],
    ['an empty file', url, image(0)],
    ['an oversized file', url, image(MAX_ART_BYTES + 1)],
  ])('rejects %s', async (_label, target, fetchImpl) => {
    await expect(downloadArt(target, fetchImpl)).rejects.toBeInstanceOf(ScryfallError)
  })

  it('reports an unreachable image', async () => {
    await expect(downloadArt(url, (() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('fetchRandomCandidate (R2 §4.2)', () => {
  it('asks for one random card with art, never a digital-only one', async () => {
    const fetchImpl = vi.fn(() => json(200, card()))
    expect(await fetchRandomCandidate(fetchImpl as unknown as typeof fetch)).toMatchObject({ name: 'Zimone, All-Questioning' })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.scryfall.com/cards/random?q=has%3Aart%20-is%3Adigital')
    expect(init.headers).toEqual({ Accept: 'application/json' })
  })

  it('reports a card without art, a server error and a network failure', async () => {
    await expect(fetchRandomCandidate((() => json(200, card({ image_uris: {} }))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'response' })
    await expect(fetchRandomCandidate((() => json(503, {})) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'response' })
    await expect(fetchRandomCandidate((() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('createRateLimiter (D-039)', () => {
  it('keeps Scryfall requests at least 125 ms apart, one at a time', async () => {
    expect(SCRYFALL_MIN_INTERVAL_MS).toBe(125)
    let clock = 0
    const waits: number[] = []
    const limit = createRateLimiter(125, () => clock, async (ms) => {
      waits.push(ms)
      clock += ms
    })
    const starts: number[] = []
    const task = async () => {
      starts.push(clock)
      clock += 10
      return starts.length
    }
    expect(await Promise.all([limit(task), limit(task), limit(task)])).toEqual([1, 2, 3])
    expect(starts).toEqual([0, 125, 250])
    expect(waits).toEqual([115, 115])
  })

  it('does not wait when the interval has already passed, and survives a failed task', async () => {
    let clock = 0
    const wait = vi.fn(async () => undefined)
    const limit = createRateLimiter(125, () => clock, wait)
    await expect(limit(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    clock = 500
    expect(await limit(async () => 'ok')).toBe('ok')
    expect(wait).not.toHaveBeenCalled()
  })
})
