import { useEffect, useState } from 'react'

/**
 * Phase 1.6: a phone held horizontally. Usable height, not device detection, so it also
 * covers Safari with visible browser chrome. This is the single source of the condition:
 * CSS keys off `data-compact-landscape` instead of repeating the query.
 */
export const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 30rem)'

const mediaList = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(COMPACT_LANDSCAPE_QUERY)
    : null

export function useCompactLandscape(): boolean {
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
