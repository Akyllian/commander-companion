import { useEffect, useState } from 'react'

/**
 * Compact density (Phase 1.6, D-034): a short viewport, such as a phone on its side or Safari
 * with visible chrome. It changes control density only; the four-player layout is a separate
 * preference and rotation never chooses it. CSS keys off `data-compact-density` instead of
 * repeating the query.
 */
export const COMPACT_DENSITY_QUERY = '(max-height: 30rem)'

const mediaList = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(COMPACT_DENSITY_QUERY)
    : null

export function useCompactDensity(): boolean {
  const [matches, setMatches] = useState(() => mediaList()?.matches ?? false)

  useEffect(() => {
    const list = mediaList()
    if (!list) return
    const handleChange = (event: { matches: boolean }) => setMatches(event.matches)
    list.addEventListener('change', handleChange)
    return () => list.removeEventListener('change', handleChange)
  }, [])

  return matches
}
