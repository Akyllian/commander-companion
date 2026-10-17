export const PREFERENCES_KEY = 'commander-companion.preferences'

export interface Preferences {
  /** Keep the screen awake during play (UX decision 7: on by default). */
  keepScreenOn: boolean
}

export const DEFAULT_PREFERENCES: Preferences = { keepScreenOn: true }

/** Unknown or partial data falls back field by field to the defaults. */
export function loadPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES
    const { keepScreenOn } = parsed as Record<string, unknown>
    return {
      keepScreenOn: typeof keepScreenOn === 'boolean' ? keepScreenOn : DEFAULT_PREFERENCES.keepScreenOn,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: Preferences): boolean {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
