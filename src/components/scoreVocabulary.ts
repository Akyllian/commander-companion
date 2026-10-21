import type { CommanderIndex, CounterKey, PlayerState } from '../game/types'

/** Shared names of the scores, for the card, its panels and the announcements (R2). */

export const COUNTER_LABELS: Record<CounterKey, string> = {
  poison: 'Veleno',
  energy: 'Energia',
  experience: 'Esperienza',
  rad: 'Radiazioni',
}

/** Stable drawer order (R2 §5.2). */
export const COUNTER_ORDER: CounterKey[] = ['poison', 'energy', 'experience', 'rad']

/** Abbreviations for the 35px middle row of compact columns (R2 §5.3); names stay full for AT. */
export const COUNTER_ABBREVIATIONS: Record<CounterKey, string> = { poison: 'VEL', energy: 'ENE', experience: 'ESP', rad: 'RAD' }

/** «Aggiungi 1 al veleno»: the counter with its article, to and from it. */
export const COUNTER_TO: Record<CounterKey, string> = { poison: 'al veleno', energy: "all'energia", experience: "all'esperienza", rad: 'alle radiazioni' }
export const COUNTER_FROM: Record<CounterKey, string> = { poison: 'dal veleno', energy: "dall'energia", experience: "dall'esperienza", rad: 'dalle radiazioni' }

export const COMMANDER_HINT = 'Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.'

export const slotName = (slot: CommanderIndex) => `Comandante ${slot + 1}`

/** One opponent's commander as a source of Commander damage (R2 §6.2). */
export interface DamageSource {
  sourcePlayerId: string
  commander: CommanderIndex
  opponent: PlayerState
  /** «Giulia · Comandante», or «Marco · Comandante 1» for a Partner deck. */
  label: string
  /** «Marco» or «Marco, Comandante 2»: the form used inside sentences. */
  spoken: string
}

export function damageSources(opponents: PlayerState[]): DamageSource[] {
  return opponents.flatMap((opponent) =>
    (opponent.hasPartner ? ([0, 1] as const) : ([0] as const)).map((commander) => ({
      sourcePlayerId: opponent.id,
      commander,
      opponent,
      label: `${opponent.name} · ${opponent.hasPartner ? slotName(commander) : 'Comandante'}`,
      spoken: opponent.hasPartner ? `${opponent.name}, ${slotName(commander)}` : opponent.name,
    })),
  )
}
