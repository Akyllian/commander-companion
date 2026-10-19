import { DEFAULT_PREFERENCES, FOUR_PLAYER_LAYOUTS, loadPreferences, PREFERENCES_KEY, savePreferences } from './preferences'

afterEach(() => vi.restoreAllMocks())

describe('preferences', () => {
  it('keeps the screen on and uses the grid by default', () => {
    expect(loadPreferences()).toEqual({ keepScreenOn: true, fourPlayerLayout: 'grid' })
  })

  it('round-trips a saved choice', () => {
    expect(savePreferences({ keepScreenOn: false, fourPlayerLayout: 'grid' })).toBe(true)
    expect(loadPreferences()).toEqual({ keepScreenOn: false, fourPlayerLayout: 'grid' })
  })

  it.each(FOUR_PLAYER_LAYOUTS)('round-trips the %s layout (D-034)', (layout) => {
    savePreferences({ keepScreenOn: true, fourPlayerLayout: layout })
    expect(loadPreferences().fourPlayerLayout).toBe(layout)
  })

  it.each(['{broken', 'null', '42', '{"keepScreenOn":"no"}'])('falls back to defaults for %s', (raw) => {
    localStorage.setItem(PREFERENCES_KEY, raw)
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('migrates an older preference without a layout to the grid', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"keepScreenOn":false}')
    expect(loadPreferences()).toEqual({ keepScreenOn: false, fourPlayerLayout: 'grid' })
  })

  it.each(['"circle"', '3', 'null'])('falls back to the grid for layout %s, keeping a valid Wake Lock choice', (layout) => {
    localStorage.setItem(PREFERENCES_KEY, `{"keepScreenOn":false,"fourPlayerLayout":${layout}}`)
    expect(loadPreferences()).toEqual({ keepScreenOn: false, fourPlayerLayout: 'grid' })
  })

  it('keeps a valid layout when the Wake Lock value is corrupt', () => {
    localStorage.setItem(PREFERENCES_KEY, '{"keepScreenOn":"yes","fourPlayerLayout":"table"}')
    expect(loadPreferences()).toEqual({ keepScreenOn: true, fourPlayerLayout: 'table' })
  })

  it('reports a failed write without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(savePreferences({ keepScreenOn: true, fourPlayerLayout: 'facing' })).toBe(false)
  })
})
