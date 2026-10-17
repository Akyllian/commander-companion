import { DEFAULT_PREFERENCES, loadPreferences, PREFERENCES_KEY, savePreferences } from './preferences'

afterEach(() => vi.restoreAllMocks())

describe('preferences', () => {
  it('keeps the screen on by default', () => {
    expect(loadPreferences()).toEqual({ keepScreenOn: true })
  })

  it('round-trips a saved choice', () => {
    expect(savePreferences({ keepScreenOn: false })).toBe(true)
    expect(loadPreferences()).toEqual({ keepScreenOn: false })
  })

  it.each(['{broken', 'null', '42', '{"keepScreenOn":"no"}'])('falls back to defaults for %s', (raw) => {
    localStorage.setItem(PREFERENCES_KEY, raw)
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('reports a failed write without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(savePreferences({ keepScreenOn: true })).toBe(false)
  })
})
