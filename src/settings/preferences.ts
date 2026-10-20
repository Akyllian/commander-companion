export const PREFERENCES_KEY = 'commander-companion.preferences'

/** Four-player seating (D-034): a device preference, never part of the game or its history. */
export const FOUR_PLAYER_LAYOUTS = ['grid', 'facing', 'table'] as const
export type FourPlayerLayout = (typeof FOUR_PLAYER_LAYOUTS)[number]

export const isFourPlayerLayout = (value: unknown): value is FourPlayerLayout =>
  FOUR_PLAYER_LAYOUTS.includes(value as FourPlayerLayout)

export interface Preferences {
  /** Keep the screen awake during play (UX decision 7: on by default). */
  keepScreenOn: boolean
  /** Chosen by hand; rotating the device never changes it. */
  fourPlayerLayout: FourPlayerLayout
}

export const DEFAULT_PREFERENCES: Preferences = { keepScreenOn: true, fourPlayerLayout: 'grid' }

/** Unknown or partial data falls back field by field to the defaults. */
export function loadPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES
    const { keepScreenOn, fourPlayerLayout } = parsed as Record<string, unknown>
    return {
      keepScreenOn: typeof keepScreenOn === 'boolean' ? keepScreenOn : DEFAULT_PREFERENCES.keepScreenOn,
      fourPlayerLayout: isFourPlayerLayout(fourPlayerLayout) ? fourPlayerLayout : DEFAULT_PREFERENCES.fourPlayerLayout,
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
