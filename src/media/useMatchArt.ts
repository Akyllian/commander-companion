import { useEffect, useRef, useState } from 'react'
import type { PlayerState } from '../game/types'
import { artKeepSet, loadMatch, saveMatch, startNewMatch, subscribeToMatchChanges } from '../match/presentation'
import type { MatchPresentation } from '../match/presentation'
import { analyzeArt } from './analyzeImage'
import { getArtStore, pruneArt } from './artStore'
import { fetchAndStoreArt } from './commanderArt'
import { fillRandomArt } from './randomArt'
import { downloadArt, fetchRandomCandidate } from './scryfall'

const newMatchId = () => crypto.randomUUID()

/**
 * The match envelope (D-039): loads and saves it, follows other tabs, and gives every seat
 * without a commander its random illustration. The network never blocks the game: seats
 * show the neutral texture until their art is cached.
 */
export type DeckArt = Set<string> | 'loading' | 'unavailable'

export function useMatchArt(players: PlayerState[], deckArt: DeckArt): { match: MatchPresentation; startNew: () => void } {
  const [match, setMatch] = useState(() => loadMatch(newMatchId))
  const matchRef = useRef(match)
  const playersRef = useRef(players)
  const pruned = useRef(false)
  // The match art kept after the first fill settles; the prune also waits for the decks (R3).
  const [settledKeep, setSettledKeep] = useState<Set<string> | null>(null)
  // Declared before the fill effect, so it reads the values of the same render.
  useEffect(() => {
    matchRef.current = match
    playersRef.current = players
  })

  useEffect(() => void saveMatch(match), [match])
  useEffect(() => subscribeToMatchChanges(setMatch), [])

  const seats = players.filter((player) => !player.commanders[0]).map((player) => player.id)
  const seatKey = `${match.matchId}|${seats.join(',')}`

  useEffect(() => {
    const store = getArtStore()
    if (!store) return
    const storeArt = (candidate: Parameters<typeof fetchAndStoreArt>[0]) =>
      fetchAndStoreArt(candidate, { store, download: (url) => downloadArt(url), analyze: analyzeArt })
    const seatIds = seatKey.split('|')[1].split(',').filter(Boolean)
    void fillRandomArt(matchRef.current, seatIds, { store, fetchCandidate: () => fetchRandomCandidate(), storeArt })
      .then((filled) => {
        // A new match started meanwhile keeps its own, empty seats.
        setMatch((previous) =>
          previous.matchId === filled.matchId
            ? { ...previous, randomArtBySeat: { ...previous.randomArtBySeat, ...filled.randomArtBySeat } }
            : previous,
        )
        setSettledKeep((previous) => previous ?? artKeepSet(filled))
      })
      .catch(() => undefined)
  }, [seatKey])

  // One prune per session, once both the match fill and the decks are known (R3, fix 1). It keeps
  // the match envelope, every player's commanders and every saved deck's cards; if the decks
  // cannot be read it never runs, so no deck art is deleted by mistake.
  useEffect(() => {
    const store = getArtStore()
    if (pruned.current || !store || !settledKeep || !(deckArt instanceof Set)) return
    pruned.current = true
    const keep = new Set([...settledKeep, ...deckArt])
    for (const player of playersRef.current) for (const slot of player.commanders) if (slot) keep.add(slot.cardId)
    void pruneArt(store, keep).catch(() => undefined)
  }, [settledKeep, deckArt])

  return { match, startNew: () => setMatch((previous) => startNewMatch(previous, newMatchId)) }
}
