import { COMMANDER_DAMAGE_LIMIT, LIFE_DEFEAT_LIMIT, POISON_LIMIT, STARTING_LIFE } from '../game/game'

/**
 * Quick rules reference (Phase 2a, spec 2026-10-18). Static and bundled, so it works offline.
 * Copy is the approved Italian text; every threshold comes from the domain constants, so the
 * reference can never contradict the rules the app applies (tested in rules.test.ts).
 * Verified against the Comprehensive Rules effective 2026-09-25.
 */

export type RuleGroupId = 'thresholds' | 'commander' | 'command-zone'
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7'

export interface RuleTextPart {
  text: string
  emphasis?: boolean
  /** Spoken alternative, e.g. for the {2} mana cost. */
  accessibleLabel?: string
}

export interface RuleItem {
  id: RuleId
  group: RuleGroupId
  title: string
  body: readonly RuleTextPart[]
  references: readonly string[]
  status?: 'not-tracked'
}

export interface RuleGroup {
  id: RuleGroupId
  title: string
}

export const RULES_EFFECTIVE_DATE = '2026-09-25'

export function formatRulesDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

export const RULES_INTRODUCTION = 'Queste sono le regole che spiegano i punteggi mostrati da Commander Companion.'

export const RULES_DISCLAIMER = `Regole aggiornate al ${formatRulesDate(RULES_EFFECTIVE_DATE)}. Riferimento sintetico: non sostituisce le regole ufficiali.`

export const RULE_GROUPS: readonly RuleGroup[] = [
  { id: 'thresholds', title: 'Soglie della partita' },
  { id: 'commander', title: 'Danni Commander' },
  { id: 'command-zone', title: 'Zona di comando' },
]

const plain = (text: string): RuleTextPart => ({ text })
const strong = (text: string): RuleTextPart => ({ text, emphasis: true })

export const RULE_ITEMS: readonly RuleItem[] = [
  {
    id: 'R1',
    group: 'thresholds',
    title: 'Vita iniziale',
    body: [plain('Ogni giocatore inizia la partita con '), strong(String(STARTING_LIFE)), plain(' punti vita.')],
    references: ['Regola 903.7'],
  },
  {
    id: 'R2',
    group: 'thresholds',
    title: 'Vita a zero',
    body: [
      plain('Un giocatore con '),
      strong(`${LIFE_DEFEAT_LIMIT} o meno`),
      plain(' punti vita perde. La vita può scendere sotto zero.'),
    ],
    references: ['Regola 704.5a'],
  },
  {
    id: 'R3',
    group: 'thresholds',
    title: 'Veleno',
    body: [plain('Un giocatore con '), strong(`${POISON_LIMIT} o più`), plain(' segnalini veleno perde.')],
    references: ['Regola 704.5c'],
  },
  {
    id: 'R4',
    group: 'commander',
    title: 'Danni Commander',
    body: [
      plain('Un giocatore perde dopo aver subito '),
      strong(`${COMMANDER_DAMAGE_LIMIT} o più danni da combattimento dallo stesso comandante`),
      plain(
        ' nel corso della partita. I danni di comandanti diversi non si sommano, anche se appartengono allo stesso avversario.',
      ),
    ],
    references: ['Regole 903.10a e 704.6c'],
  },
  {
    id: 'R5',
    group: 'commander',
    title: 'Riducono anche la vita',
    body: [
      plain('Quando registri danni Commander, l’app riduce automaticamente anche i punti vita dello stesso valore.'),
    ],
    references: ['Regola 903.10a'],
  },
  {
    id: 'R6',
    group: 'commander',
    title: 'Partner',
    body: [
      plain('Con Partner, ciascun comandante ha un conteggio separato verso la soglia di '),
      strong(String(COMMANDER_DAMAGE_LIMIT)),
      plain('.'),
    ],
    references: ['Regole 702.124 e 903.10a'],
  },
  {
    id: 'R7',
    group: 'command-zone',
    title: 'Tassa del comandante',
    body: [
      plain('Lanciare un comandante dalla zona di comando costa '),
      { text: '{2}', emphasis: true, accessibleLabel: 'due mana generici' },
      strong(' in più'),
      plain(' per ogni volta precedente in cui è stato lanciato da lì.'),
    ],
    references: ['Regola 903.8'],
    status: 'not-tracked',
  },
]

export function rulePlainText(item: RuleItem): string {
  return item.body.map((part) => part.text).join('')
}
