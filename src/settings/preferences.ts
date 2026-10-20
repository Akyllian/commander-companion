export const PREFERENCES_KEY = 'commander-companion.preferences'

/** Four-player seating (D-034): a device preference, never part of the game or its history. */
export const FOUR_PLAYER_LAYOUTS = ['grid', 'facing', 'table'] as const
export type FourPlayerLayout = (typeof FOUR_PLAYER_LAYOUTS)[number]

export const isFourPlayerLayout = (value: unknown): value is FourPlayerLayout =>
  FOUR_PLAYER_LAYOUTS.includes(value as FourPlayerLayout)

/** Two-player seating (D-035): both on one side, or one per side with the far panel turned. */
export const TWO_PLAYER_LAYOUTS = ['same-side', 'facing'] as const
export type TwoPlayerLayout = (typeof TWO_PLAYER_LAYOUTS)[number]

const isTwoPlayerLayout = (value: unknown): value is TwoPlayerLayout =>
  TWO_PLAYER_LAYOUTS.includes(value as TwoPlayerLayout)

export interface Preferences {
  /** Keep the screen awake during play (UX decision 7: on by default). */
  keepScreenOn: boolean
  /** Chosen by hand; rotating the device never changes it. */
  fourPlayerLayout: FourPlayerLayout
  /** Kept separately, so switching between 2 and 4 players restores each table's choice. */
  twoPlayerLayout: TwoPlayerLayout
}

export const DEFAULT_PREFERENCES: Preferences = { keepScreenOn: true, fourPlayerLayout: 'grid', twoPlayerLayout: 'same-side' }

/** Unknown or partial data falls back field by field to the defaults. */
export function loadPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES
    const { keepScreenOn, fourPlayerLayout, twoPlayerLayout } = parsed as Record<string, unknown>
    return {
      keepScreenOn: typeof keepScreenOn === 'boolean' ? keepScreenOn : DEFAULT_PREFERENCES.keepScreenOn,
      fourPlayerLayout: isFourPlayerLayout(fourPlayerLayout) ? fourPlayerLayout : DEFAULT_PREFERENCES.fourPlayerLayout,
      twoPlayerLayout: isTwoPlayerLayout(twoPlayerLayout) ? twoPlayerLayout : DEFAULT_PREFERENCES.twoPlayerLayout,
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
