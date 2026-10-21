import { useEffect, useRef, useState } from 'react'
import { GROUP_WINDOW_MS } from '../game/history'
import type { GroupDelta } from '../game/history'
import type { PlayerState } from '../game/types'
import { COUNTER_LABELS, slotName } from './scoreVocabulary'

const lifeText = (player: PlayerState) => `${player.name}: ${player.life} punti vita`

/** What a settled burst says: its value, and for Commander damage the life it moved too. */
function describeBurst(player: PlayerState, opponents: PlayerState[], delta: GroupDelta): string {
  const { target } = delta
  switch (target.kind) {
    case 'life':
      return lifeText(player)
    case 'counter':
      return `${player.name}: ${COUNTER_LABELS[target.counter].toLowerCase()} ${player[target.counter]}`
    case 'commander': {
      const source = opponents.find((opponent) => opponent.id === target.sourcePlayerId)
      const label = source?.hasPartner ? `${source.name}, ${slotName(target.commander)}` : (source?.name ?? '')
      const damage = player.commanderDamage[target.sourcePlayerId]?.[target.commander] ?? 0
      return `${player.name}: ${damage} ${damage === 1 ? 'danno' : 'danni'} Commander da ${label}; vita ${player.life}`
    }
    case 'commander-tax':
      return `${player.name}: tassa del ${slotName(target.commander)}, più ${player.commanderTax[target.commander]} mana`
  }
}

/**
 * The panel's single polite announcement (D-036). It speaks once per settled tap burst, never
 * for a mode or source change, and a Commander burst says damage and life together. Life changes
 * from outside a burst (Undo, Redo, reset, another tab) are still spoken once they settle.
 */
export function useScoreAnnouncement(player: PlayerState, opponents: PlayerState[], delta: GroupDelta | null): string {
  const [message, setMessage] = useState(() => lifeText(player))
  const latest = useRef({ player, opponents, delta })
  const spokenLife = useRef(player.life)
  useEffect(() => {
    latest.current = { player, opponents, delta }
  })

  const burstId = delta ? `${delta.key}#${delta.at}` : null
  useEffect(() => {
    if (!burstId) return
    const timer = window.setTimeout(() => {
      const { player: now, opponents: others, delta: burst } = latest.current
      if (!burst) return
      if (burst.target.kind === 'life' || burst.target.kind === 'commander') spokenLife.current = now.life
      setMessage(describeBurst(now, others, burst))
    }, GROUP_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [burstId])

  const lifeOutsideBurst = delta ? null : player.life
  useEffect(() => {
    if (lifeOutsideBurst === null || lifeOutsideBurst === spokenLife.current) return
    const timer = window.setTimeout(() => {
      spokenLife.current = latest.current.player.life
      setMessage(lifeText(latest.current.player))
    }, GROUP_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [lifeOutsideBurst])

  return message
}
