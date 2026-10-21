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
export function useMatchArt(players: PlayerState[]): { match: MatchPresentation; startNew: () => void } {
  const [match, setMatch] = useState(() => loadMatch(newMatchId))
  const matchRef = useRef(match)
  const playersRef = useRef(players)
  const pruned = useRef(false)
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
        if (pruned.current) return
        pruned.current = true
        // Drop cached art nothing uses: neither a commander nor this match's envelope.
        const keep = artKeepSet(filled)
        for (const player of playersRef.current) for (const slot of player.commanders) if (slot) keep.add(slot.cardId)
        return pruneArt(store, keep)
      })
      .catch(() => undefined)
  }, [seatKey])

  return { match, startNew: () => setMatch((previous) => startNewMatch(previous, newMatchId)) }
}
