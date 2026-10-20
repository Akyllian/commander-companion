import { useEffect, useState } from 'react'
import { sectionFromHash, sectionHref } from './sections'
import type { Section } from './sections'

/**
 * The visible section, kept in the address (R1): reload stays on the same section and the
 * system Back button goes back to the previous one, like a native app.
 */
export function useSection(): [Section, (next: Section) => void] {
  const [section, setSection] = useState(() => sectionFromHash(window.location.hash))

  useEffect(() => {
    const follow = () => setSection(sectionFromHash(window.location.hash))
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  const navigate = (next: Section) => {
    if (next === section) return
    window.history.pushState(null, '', sectionHref(next))
    setSection(next)
  }

  return [section, navigate]
}
