import { COMMANDER_DAMAGE_LIMIT, LIFE_DEFEAT_LIMIT, POISON_LIMIT, STARTING_LIFE } from '../game/game'
import {
  RULE_GROUPS,
  RULE_ITEMS,
  RULES_DISCLAIMER,
  RULES_EFFECTIVE_DATE,
  RULES_INTRODUCTION,
  formatRulesDate,
  rulePlainText,
} from './rules'

const byId = (id: string) => RULE_ITEMS.find((item) => item.id === id)!

describe('rules content (spec 2026-10-18)', () => {
  it('has the approved introduction, date and disclaimer', () => {
    expect(RULES_INTRODUCTION).toBe('Queste sono le regole che spiegano i punteggi mostrati da Commander Companion.')
    expect(RULES_EFFECTIVE_DATE).toBe('2026-09-25')
    expect(formatRulesDate(RULES_EFFECTIVE_DATE)).toBe('25 settembre 2026')
    expect(RULES_DISCLAIMER).toBe(
      'Regole aggiornate al 25 settembre 2026. Riferimento sintetico: non sostituisce le regole ufficiali.',
    )
  })

  it('lists the three groups in order and R1–R7 without gaps', () => {
    expect(RULE_GROUPS.map((group) => group.title)).toEqual(['Soglie della partita', 'Danni Commander', 'Zona di comando'])
    expect(RULE_ITEMS.map((item) => item.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'])
    expect(RULE_ITEMS.map((item) => item.group)).toEqual([
      'thresholds',
      'thresholds',
      'thresholds',
      'commander',
      'commander',
      'commander',
      'command-zone',
    ])
  })

  it('uses the approved copy and references', () => {
    expect(RULE_ITEMS.map((item) => [item.id, item.title, rulePlainText(item), item.references])).toEqual([
      ['R1', 'Vita iniziale', 'Ogni giocatore inizia la partita con 40 punti vita.', ['Regola 903.7']],
      ['R2', 'Vita a zero', 'Un giocatore con 0 o meno punti vita perde. La vita può scendere sotto zero.', ['Regola 704.5a']],
      ['R3', 'Veleno', 'Un giocatore con 10 o più segnalini veleno perde.', ['Regola 704.5c']],
      [
        'R4',
        'Danni Commander',
        'Un giocatore perde dopo aver subito 21 o più danni da combattimento dallo stesso comandante nel corso della partita. I danni di comandanti diversi non si sommano, anche se appartengono allo stesso avversario.',
        ['Regole 903.10a e 704.6c'],
      ],
      [
        'R5',
        'Riducono anche la vita',
        'Quando registri danni Commander, l’app riduce automaticamente anche i punti vita dello stesso valore.',
        ['Regola 903.10a'],
      ],
      ['R6', 'Partner', 'Con Partner, ciascun comandante ha un conteggio separato verso la soglia di 21.', ['Regole 702.124 e 903.10a']],
      [
        'R7',
        'Tassa del comandante',
        'Lanciare un comandante dalla zona di comando costa {2} in più per ogni volta precedente in cui è stato lanciato da lì.',
        ['Regola 903.8'],
      ],
    ])
  })

  it('takes every threshold from the domain constants', () => {
    const emphasised = (id: string) => byId(id).body.filter((part) => part.emphasis).map((part) => part.text)
    expect(emphasised('R1')).toEqual([String(STARTING_LIFE)])
    expect(emphasised('R2')).toEqual([`${LIFE_DEFEAT_LIMIT} o meno`])
    expect(emphasised('R3')).toEqual([`${POISON_LIMIT} o più`])
    expect(emphasised('R4')[0]).toBe(`${COMMANDER_DAMAGE_LIMIT} o più danni da combattimento dallo stesso comandante`)
    expect(emphasised('R6')).toEqual([String(COMMANDER_DAMAGE_LIMIT)])
  })

  it('marks only R7 as not tracked, with a spoken mana cost', () => {
    expect(RULE_ITEMS.filter((item) => item.status).map((item) => [item.id, item.status])).toEqual([['R7', 'not-tracked']])
    const mana = byId('R7').body.find((part) => part.accessibleLabel)
    expect(mana).toMatchObject({ text: '{2}', accessibleLabel: 'due mana generici' })
  })
})
