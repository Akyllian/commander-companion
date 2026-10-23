import {
  createRateLimiter,
  fetchCollection,
  parseCardData,
  searchLocalized,
  toCardData,
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

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const raw = (overrides: Record<string, unknown> = {}) => ({
  id: uuid(1),
  name: 'Sol Ring',
  type_line: 'Artifact',
  oracle_text: '{T}: Add {C}{C}.',
  mana_cost: '{1}',
  artist: 'Mike Bierek',
  set: 'cmm',
  collector_number: '396',
  image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/front/1.jpg' },
  ...overrides,
})

describe('toCardData (R3)', () => {
  it('maps a normal card', () => {
    expect(toCardData(raw())).toEqual({
      cardId: uuid(1),
      name: 'Sol Ring',
      printedName: null,
      typeLine: 'Artifact',
      oracleText: '{T}: Add {C}{C}.',
      manaCost: '{1}',
      artist: 'Mike Bierek',
      artUrl: 'https://cards.scryfall.io/art_crop/front/1.jpg',
      set: 'cmm',
      number: '396',
    })
  })

  it('joins both faces of a double-faced card, with the front art, cost and artist', () => {
    const dfc = raw({
      name: 'Delver of Secrets // Insectile Aberration',
      type_line: 'Creature — Human Wizard // Creature — Human Insect',
      oracle_text: undefined,
      mana_cost: undefined,
      artist: undefined,
      image_uris: undefined,
      card_faces: [
        { name: 'Delver of Secrets', mana_cost: '{U}', oracle_text: 'Look at the top card.', artist: 'Matt Stewart', image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/front/d.jpg' } },
        { name: 'Insectile Aberration', mana_cost: '', oracle_text: 'Flying', artist: 'Matt Stewart', image_uris: { art_crop: 'https://cards.scryfall.io/art_crop/back/d.jpg' } },
      ],
    })
    expect(toCardData(dfc)).toMatchObject({
      name: 'Delver of Secrets // Insectile Aberration',
      oracleText: 'Look at the top card.\nFlying',
      manaCost: '{U}',
      artist: 'Matt Stewart',
      artUrl: 'https://cards.scryfall.io/art_crop/front/d.jpg',
    })
  })

  it('reads a split card whose faces share one image', () => {
    const split = raw({
      name: 'Fire // Ice',
      oracle_text: undefined,
      mana_cost: '{1}{R} // {1}{U}',
      card_faces: [
        { name: 'Fire', oracle_text: 'Fire deals 2 damage divided as you choose.' },
        { name: 'Ice', oracle_text: 'Tap target permanent. Draw a card.' },
      ],
    })
    expect(toCardData(split)).toMatchObject({ oracleText: 'Fire deals 2 damage divided as you choose.\nTap target permanent. Draw a card.', manaCost: '{1}{R} // {1}{U}' })
  })

  it('keeps cards without a usable crop, with no art url', () => {
    expect(toCardData(raw({ image_uris: undefined }))?.artUrl).toBeNull()
    expect(toCardData(raw({ image_uris: { art_crop: 'https://evil.example/x.jpg' } }))?.artUrl).toBeNull()
    expect(toCardData(raw({ image_uris: { art_crop: 3 } }))?.artUrl).toBeNull()
    // A face without rules text (a vanilla back face) contributes an empty line.
    expect(toCardData(raw({ oracle_text: undefined, card_faces: [{ name: 'A' }, { name: 'B', oracle_text: 'Flying' }] }))?.oracleText).toBe('\nFlying')
    expect(toCardData(raw({ printed_name: 'Anello del Sole' }))?.printedName).toBe('Anello del Sole')
  })

  it.each([
    ['a non-object', 'x'],
    ['a missing id', raw({ id: undefined })],
    ['a missing name', raw({ name: '' })],
    ['a missing type line', raw({ type_line: undefined })],
    ['a missing artist', raw({ artist: undefined })],
    ['a missing set', raw({ set: undefined })],
    ['a missing collector number', raw({ collector_number: undefined })],
  ])('rejects %s', (_, value) => {
    expect(toCardData(value)).toBeNull()
  })
})

describe('parseCardData (R3, stored entries)', () => {
  const stored = () => toCardData(raw()) as NonNullable<ReturnType<typeof toCardData>>

  it('accepts what toCardData produced, after a JSON round trip', () => {
    expect(parseCardData(JSON.parse(JSON.stringify(stored())))).toEqual(stored())
    expect(parseCardData({ ...stored(), artUrl: null, printedName: 'Anello del Sole', manaCost: '' })).not.toBeNull()
  })

  it.each([
    ['a raw Scryfall object', raw()],
    ['a non-object', null],
    ['a bad id', { ...stored(), cardId: 'x' }],
    ['a missing field', { ...stored(), typeLine: undefined }],
    ['a foreign art host', { ...stored(), artUrl: 'https://evil.example/x.jpg' }],
    ['an over-long name', { ...stored(), name: 'x'.repeat(201) }],
    ['an over-long oracle text', { ...stored(), oracleText: 'x'.repeat(4001) }],
    ['a non-string printed name', { ...stored(), printedName: 3 }],
  ])('rejects %s', (_, value) => {
    expect(parseCardData(value)).toBeNull()
  })
})

describe('fetchCollection (R3)', () => {
  it('posts JSON identifiers in chunks of 75 and maps found and not found', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      const { identifiers } = JSON.parse(String(init.body)) as { identifiers: unknown[] }
      return json(200, { data: [raw({ id: uuid(calls.length) })], not_found: identifiers.slice(0, 1) })
    })
    const identifiers = Array.from({ length: 160 }, (_, i) => ({ name: `Card ${i}` }))
    const result = await fetchCollection(identifiers, fetchImpl as unknown as typeof fetch)
    expect(calls.map((call) => (JSON.parse(String(call.init.body)) as { identifiers: unknown[] }).identifiers.length)).toEqual([75, 75, 10])
    expect(calls[0].url).toBe('https://api.scryfall.com/cards/collection')
    expect(calls[0].init).toMatchObject({ method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } })
    expect(result.found.map((entry) => entry.cardId)).toEqual([uuid(1), uuid(2), uuid(3)])
    expect(result.notFound).toEqual([{ name: 'Card 0' }, { name: 'Card 75' }, { name: 'Card 150' }])
  })

  it('makes no request for no identifiers, and tolerates an odd body', async () => {
    const fetchImpl = vi.fn(() => json(200, 'odd'))
    expect(await fetchCollection([], fetchImpl as unknown as typeof fetch)).toEqual({ found: [], notFound: [] })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await fetchCollection([{ name: 'x' }], fetchImpl as unknown as typeof fetch)).toEqual({ found: [], notFound: [] })
    const partial = (() => json(200, { data: ['bad', raw()] })) as unknown as typeof fetch
    expect((await fetchCollection([{ name: 'x' }], partial)).found).toHaveLength(1)
    expect(await fetchCollection([{ name: 'x' }], (() => json(200, {})) as unknown as typeof fetch)).toEqual({ found: [], notFound: [] })
  })

  it('reports network and server failures', async () => {
    await expect(fetchCollection([{ name: 'x' }], (() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' })
    await expect(fetchCollection([{ name: 'x' }], (() => json(503, {})) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'response' })
  })
})

describe('searchLocalized (R3)', () => {
  it('asks for an exact multilingual match and keeps equal printed or English names, ignoring case and accents', async () => {
    const fetchImpl = vi.fn(() =>
      json(200, {
        data: [
          raw({ id: uuid(1), printed_name: 'Anello del Sole' }),
          raw({ id: uuid(2), name: 'Other', printed_name: 'Altro' }),
          raw({ id: uuid(3), name: 'Señor', printed_name: undefined }),
        ],
      }),
    )
    expect((await searchLocalized('anello del sole', fetchImpl as unknown as typeof fetch)).map((entry) => entry.cardId)).toEqual([uuid(1)])
    const [url] = fetchImpl.mock.calls[0] as unknown as [string]
    expect(url).toBe(`https://api.scryfall.com/cards/search?include_multilingual=true&q=${encodeURIComponent('!"anello del sole"')}`)
    expect((await searchLocalized('SENOR', fetchImpl as unknown as typeof fetch)).map((entry) => entry.cardId)).toEqual([uuid(3)])
  })

  it('deduplicates, sorts stably and keeps at most five options', async () => {
    const prints = Array.from({ length: 8 }, (_, i) => raw({ id: uuid(i + 1), printed_name: 'Anello del Sole', set: `s${8 - i}`, collector_number: String(10 - i) }))
    const response = (cards: unknown[]) => (() => json(200, { data: cards })) as unknown as typeof fetch
    const first = await searchLocalized('Anello del Sole', response([...prints, prints[0]]))
    const shuffled = await searchLocalized('Anello del Sole', response(prints.toReversed()))
    expect(first).toHaveLength(5)
    expect(first.map((entry) => entry.set)).toEqual(['s1', 's2', 's3', 's4', 's5'])
    expect(shuffled).toEqual(first)
  })

  it('orders by name, then set, then collector number numerically', async () => {
    const cards = [
      raw({ id: uuid(1), name: 'B', printed_name: 'X', set: 'a', collector_number: '1' }),
      raw({ id: uuid(2), name: 'A', printed_name: 'X', set: 'b', collector_number: '1' }),
      raw({ id: uuid(3), name: 'A', printed_name: 'X', set: 'a', collector_number: '10' }),
      raw({ id: uuid(4), name: 'A', printed_name: 'X', set: 'a', collector_number: '9' }),
    ]
    const result = await searchLocalized('x', (() => json(200, { data: cards })) as unknown as typeof fetch)
    expect(result.map((entry) => entry.cardId)).toEqual([uuid(4), uuid(3), uuid(2), uuid(1)])
  })

  it('returns nothing for 404 or an odd body, and reports failures', async () => {
    expect(await searchLocalized('x', (() => json(404, {})) as unknown as typeof fetch)).toEqual([])
    expect(await searchLocalized('x', (() => json(200, 'odd')) as unknown as typeof fetch)).toEqual([])
    await expect(searchLocalized('x', (() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' })
    await expect(searchLocalized('x', (() => json(500, {})) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'response' })
  })
})
