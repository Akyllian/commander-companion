import type { DeckOwner } from './model'

/**
 * The import in progress (R3 §12.2), kept in localStorage so a reload or a closed tab never loses
 * it. Choices are keyed by line number, so the analysis is valid only for the exact text it ran
 * on: the hash ignores line endings and nothing else (plan, second review).
 */

export const DRAFT_KEY = 'commander-companion.import-draft'

export interface ImportDraft {
  step: 1 | 2 | 3
  text: string
  /** Hash of the analysed text; null until the first successful analysis. */
  textHash: string | null
  /** Line number → card id; the card data itself lives in the deck store's `cards`. */
  recognition: { matched: Record<string, string>; ambiguous: Record<string, string[]>; missing: number[] } | null
  choices: Record<string, string>
  ignoredLines: boolean
  acceptedMissing: boolean
  details: {
    name: string
    /** A friend's name may still be empty while typing. */
    owner: DeckOwner | { kind: 'friend'; name: string }
    commanders: [string | null, string | null]
    notes: string
  }
}

export const emptyDraft = (text = ''): ImportDraft => ({
  step: 1,
  text,
  textHash: null,
  recognition: null,
  choices: {},
  ignoredLines: false,
  acceptedMissing: false,
  details: { name: '', owner: { kind: 'me' }, commanders: [null, null], notes: '' },
})

/** FNV-1a over the text with only CRLF/CR turned into LF: blank lines, order and spaces count. */
export function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (const char of text.replace(/\r\n?/g, '\n')) {
    hash ^= char.codePointAt(0) as number
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** The draft for a new text: kept as is when it hashes the same, otherwise back to step 1. */
export function draftForText(draft: ImportDraft, text: string): ImportDraft {
  if (draft.textHash !== null && hashText(text) === draft.textHash) return draft
  return { ...draft, text, step: 1, textHash: null, recognition: null, choices: {}, ignoredLines: false, acceptedMissing: false }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringMap = (value: unknown) => isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string')

function isRecognition(value: unknown) {
  if (value === null) return true
  if (!isRecord(value) || !isStringMap(value.matched) || !isRecord(value.ambiguous)) return false
  if (!Object.values(value.ambiguous).every((options) => Array.isArray(options) && options.every((option) => typeof option === 'string'))) return false
  return Array.isArray(value.missing) && value.missing.every((line) => Number.isInteger(line))
}

function isDetails(value: unknown) {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.notes !== 'string') return false
  const { owner, commanders } = value
  const ownerOk = isRecord(owner) && (owner.kind === 'me' || (owner.kind === 'friend' && typeof owner.name === 'string'))
  const commandersOk = Array.isArray(commanders) && commanders.length === 2 && commanders.every((entry) => entry === null || typeof entry === 'string')
  return ownerOk && commandersOk
}

function parseDraft(value: unknown): ImportDraft | null {
  if (!isRecord(value)) return null
  const valid =
    (value.step === 1 || value.step === 2 || value.step === 3) &&
    typeof value.text === 'string' &&
    (value.textHash === null || typeof value.textHash === 'string') &&
    isRecognition(value.recognition) &&
    isStringMap(value.choices) &&
    typeof value.ignoredLines === 'boolean' &&
    typeof value.acceptedMissing === 'boolean' &&
    isDetails(value.details)
  return valid ? (value as unknown as ImportDraft) : null
}

export function loadDraft(): ImportDraft | null {
  try {
    return parseDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'))
  } catch {
    return null
  }
}

export function saveDraft(draft: ImportDraft): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to do: the next save overwrites it.
  }
}
