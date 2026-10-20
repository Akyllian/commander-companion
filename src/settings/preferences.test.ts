import {
  DEFAULT_PREFERENCES,
  FOUR_PLAYER_LAYOUTS,
  hintPending,
  loadPreferences,
  PREFERENCES_KEY,
  RHOMBUS_HINT_VERSION,
  savePreferences,
  TWO_PLAYER_LAYOUTS,
} from './preferences'

const base = { keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'same-side', rhombusHintVersion: 0 } as const

afterEach(() => vi.restoreAllMocks())

describe('preferences', () => {
  it('keeps the screen on and uses the grid by default', () => {
    expect(loadPreferences()).toEqual(base)
  })

  it('round-trips a saved choice', () => {
    expect(savePreferences({ ...base, keepScreenOn: false })).toBe(true)
    expect(loadPreferences()).toEqual({ ...base, keepScreenOn: false })
  })

  it.each(FOUR_PLAYER_LAYOUTS)('round-trips the %s layout (D-034)', (layout) => {
    savePreferences({ ...base, fourPlayerLayout: layout })
    expect(loadPreferences().fourPlayerLayout).toBe(layout)
  })

  it.each(['{broken', 'null', '42', '{"keepScreenOn":"no"}'])('falls back to defaults for %s', (raw) => {
    localStorage.setItem(PREFERENCES_KEY, raw)
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('migrates an older preference without a layout to the grid', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"keepScreenOn":false}')
    expect(loadPreferences()).toEqual({ ...base, keepScreenOn: false })
  })

  it.each(['"circle"', '3', 'null'])('falls back to the grid for layout %s, keeping a valid Wake Lock choice', (layout) => {
    localStorage.setItem(PREFERENCES_KEY, `{"keepScreenOn":false,"fourPlayerLayout":${layout}}`)
    expect(loadPreferences()).toEqual({ ...base, keepScreenOn: false })
  })

  it('keeps a valid layout when the Wake Lock value is corrupt', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"keepScreenOn":"yes","fourPlayerLayout":"table"}')
    expect(loadPreferences()).toEqual({ ...base, fourPlayerLayout: 'table' })
  })

  it.each(TWO_PLAYER_LAYOUTS)('round-trips the %s two-player layout, separate from four players (D-035)', (layout) => {
    savePreferences({ ...base, fourPlayerLayout: 'table', twoPlayerLayout: layout })
    expect(loadPreferences()).toEqual({ ...base, fourPlayerLayout: 'table', twoPlayerLayout: layout })
  })

  it('falls back to the same side for an unknown two-player layout, keeping the rest', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"keepScreenOn":false,"fourPlayerLayout":"table","twoPlayerLayout":"diagonal"}')
    expect(loadPreferences()).toEqual({ ...base, keepScreenOn: false, fourPlayerLayout: 'table' })
  })

  it('starts with no hint seen', () => {
    expect(loadPreferences().rhombusHintVersion).toBe(0)
    expect(hintPending(loadPreferences())).toBe(true)
  })

  it('migrates the R1 flag to version 1, so the R2 hint still shows', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"rhombusHintSeen":true}')
    expect(loadPreferences().rhombusHintVersion).toBe(1)
    expect(hintPending(loadPreferences())).toBe(true)
  })

  it('round-trips version 2 without writing the legacy flag', () => {
    savePreferences({ ...base, rhombusHintVersion: RHOMBUS_HINT_VERSION })
    expect(RHOMBUS_HINT_VERSION).toBe(2)
    expect(hintPending(loadPreferences())).toBe(false)
    expect(localStorage.getItem(PREFERENCES_KEY)).not.toContain('rhombusHintSeen')
  })

  it.each(['-1', '1.5', '"2"', 'null'])('falls back to 0 for version %s, keeping the rest', (version) => {
    localStorage.setItem(
      PREFERENCES_KEY,
      `{"keepScreenOn":false,"fourPlayerLayout":"table","twoPlayerLayout":"facing","rhombusHintVersion":${version}}`,
    )
    expect(loadPreferences()).toEqual({ keepScreenOn: false, fourPlayerLayout: 'table', twoPlayerLayout: 'facing', rhombusHintVersion: 0 })
  })

  it('reports a failed write without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(savePreferences({ ...base, fourPlayerLayout: 'facing' })).toBe(false)
  })
})
