import { useEffect, useState } from 'react'
import { deckHref, deckRouteFromHash } from '../routes'
import type { DeckRoute, DeckTab } from '../routes'

/**
 * The view inside Mazzi, kept in the address (plan Task 8, fix 5): opening the import or a deck
 * pushes one history entry; changing tab replaces it, so one Back always returns to the library.
 */
export function useDeckRoute(): { route: DeckRoute; go: (route: DeckRoute) => void; setTab: (tab: DeckTab) => void } {
  const [route, setRoute] = useState(() => deckRouteFromHash(window.location.hash))

  useEffect(() => {
    const follow = () => setRoute(deckRouteFromHash(window.location.hash))
    window.addEventListener('popstate', follow)
    window.addEventListener('hashchange', follow)
    return () => {
      window.removeEventListener('popstate', follow)
      window.removeEventListener('hashchange', follow)
    }
  }, [])

  const go = (next: DeckRoute) => {
    window.history.pushState(null, '', deckHref(next))
    setRoute(next)
  }

  const setTab = (tab: DeckTab) => {
    if (route.view !== 'deck' || route.tab === tab) return
    const next = { ...route, tab }
    window.history.replaceState(null, '', deckHref(next))
    setRoute(next)
  }

  return { route, go, setTab }
}
