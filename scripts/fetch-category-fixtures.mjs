/**
 * Build-time fixtures for the deck categories (R3 plan, Task 4, D-040).
 *
 * This is the one exception to the rule that only src/media/scryfall.ts talks to Scryfall: a
 * developer script, run by hand, never imported by the app or by tests. Its output is reviewed
 * and committed; the tests read the committed JSON and never touch the network.
 *
 * Run: node scripts/fetch-category-fixtures.mjs
 *
 * It follows Scryfall's API guidelines: at least 125 ms between requests, an Accept header and
 * an identifying User-Agent. It keeps only name, type line and oracle text (no images, no prices).
 */
import { writeFile } from 'node:fs/promises'

const FIXTURE_CARDS = {
  lands: ['Command Tower', 'Forest', 'Reliquary Tower', 'Exotic Orchard', 'Bojuka Bog', 'Dryad Arbor'],
  ramp: ['Sol Ring', 'Arcane Signet', 'Llanowar Elves', 'Cultivate', 'Rampant Growth', 'Three Visits', 'Exploration'],
  draw: ['Rhystic Study', 'Brainstorm', 'Ponder', "Night's Whisper", 'Harmonize', 'Mystic Remora'],
  targeted: ['Swords to Plowshares', 'Path to Exile', 'Counterspell', 'Beast Within', 'Anguished Unmaking', "Nature's Claim", 'Lightning Bolt'],
  sweepers: ['Wrath of God', 'Damnation', 'Toxic Deluge', 'Blasphemous Act', 'Farewell', 'Austere Command', 'Evacuation'],
  protection: ['Heroic Intervention', 'Lightning Greaves', 'Swiftfoot Boots', "Teferi's Protection", 'Flawless Maneuver', 'Boros Charm'],
  tutors: ['Demonic Tutor', 'Vampiric Tutor', 'Enlightened Tutor', 'Worldly Tutor', 'Mystical Tutor', 'Finale of Devastation'],
  recursion: ['Eternal Witness', 'Regrowth', 'Reanimate', 'Sun Titan', 'Unearth', 'Phyrexian Reclamation', 'Ramunap Excavator'],
  wincons: ["Thassa's Oracle", 'Laboratory Maniac', 'Approach of the Second Sun', 'Felidar Sovereign', 'Revel in Riches', 'Craterhoof Behemoth', 'Overrun'],
  other: ['Grizzly Bears', 'Serra Angel', 'Doubling Season', 'Panharmonicon', 'Anointed Procession', 'Glorious Anthem', 'Carnage Tyrant'],
  negatives: ['Cyclonic Rift'],
}

const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'CommanderCompanion-fixtures/1.0',
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const names = [...new Set(Object.values(FIXTURE_CARDS).flat())]
const cards = []
for (let start = 0; start < names.length; start += 75) {
  if (start > 0) await wait(125)
  const identifiers = names.slice(start, start + 75).map((name) => ({ name }))
  const response = await fetch('https://api.scryfall.com/cards/collection', { method: 'POST', headers: HEADERS, body: JSON.stringify({ identifiers }) })
  if (!response.ok) throw new Error(`Scryfall answered ${response.status}`)
  const body = await response.json()
  if (body.not_found?.length) throw new Error(`Not found: ${JSON.stringify(body.not_found)}`)
  for (const card of body.data) {
    const faces = Array.isArray(card.card_faces) ? card.card_faces : []
    cards.push({
      name: card.name,
      typeLine: card.type_line,
      oracleText: typeof card.oracle_text === 'string' ? card.oracle_text : faces.map((face) => face.oracle_text ?? '').join('\n'),
    })
  }
}
cards.sort((left, right) => left.name.localeCompare(right.name))
await writeFile(new URL('../src/decks/__fixtures__/category-cards.json', import.meta.url), `${JSON.stringify(cards, null, 2)}\n`)
console.log(`Wrote ${cards.length} cards.`)
