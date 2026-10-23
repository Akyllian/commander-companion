import { clearDraft, DRAFT_KEY, draftForText, emptyDraft, hashText, loadDraft, saveDraft } from './importDraft'
import type { ImportDraft } from './importDraft'

const analysed = (text: string): ImportDraft => ({
  ...emptyDraft(text),
  step: 2,
  textHash: hashText(text),
  recognition: { matched: { 1: '00000000-0000-4000-8000-000000000001' }, ambiguous: { 2: ['00000000-0000-4000-8000-000000000002'] }, missing: [3] },
  choices: { 2: '00000000-0000-4000-8000-000000000002' },
  ignoredLines: true,
  acceptedMissing: true,
})

describe('import draft (R3 §12.2, fix 2)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts with no hash until the first successful analysis', () => {
    expect(emptyDraft('1 Sol Ring')).toMatchObject({ step: 1, text: '1 Sol Ring', textHash: null, recognition: null })
  })

  it('round-trips a draft and drops a corrupt one', () => {
    const draft = analysed('1 Sol Ring\n1 Cultivate')
    expect(saveDraft(draft)).toBe(true)
    expect(loadDraft()).toEqual(draft)
    localStorage.setItem(DRAFT_KEY, '{broken')
    expect(loadDraft()).toBeNull()
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step: 4 }))
    expect(loadDraft()).toBeNull()
    clearDraft()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('loads nothing when no draft was saved, and round-trips a fresh or a friend’s draft', () => {
    expect(loadDraft()).toBeNull()
    saveDraft(emptyDraft('1 Sol Ring'))
    expect(loadDraft()).toEqual(emptyDraft('1 Sol Ring'))
    const friend = { ...emptyDraft(''), details: { ...emptyDraft('').details, owner: { kind: 'friend' as const, name: '' } } }
    saveDraft(friend)
    expect(loadDraft()).toEqual(friend)
  })

  it.each([
    ['a non-object', 3],
    ['a non-object recognition', { ...analysed('x'), recognition: 'x' }],
    ['a non-object ambiguous map', { ...analysed('x'), recognition: { matched: {}, ambiguous: [], missing: [] } }],
    ['a friend without a name field', { ...analysed('x'), details: { ...analysed('x').details, owner: { kind: 'friend' } } }],
    ['a numeric commander', { ...analysed('x'), details: { ...analysed('x').details, commanders: [3, null] } }],
    ['non-array commanders', { ...analysed('x'), details: { ...analysed('x').details, commanders: 'x' } }],
    ['three commander slots', { ...analysed('x'), details: { ...analysed('x').details, commanders: [null, null, null] } }],
    ['non-string notes', { ...analysed('x'), details: { ...analysed('x').details, notes: 3 } }],
    ['a non-string text', { ...analysed('x'), text: 3 }],
    ['a bad hash', { ...analysed('x'), textHash: 7 }],
    ['bad choices', { ...analysed('x'), choices: { 2: 4 } }],
    ['a bad recognition', { ...analysed('x'), recognition: { matched: [], ambiguous: {}, missing: [] } }],
    ['bad missing lines', { ...analysed('x'), recognition: { matched: {}, ambiguous: {}, missing: ['a'] } }],
    ['bad ambiguous options', { ...analysed('x'), recognition: { matched: {}, ambiguous: { 1: 'x' }, missing: [] } }],
    ['bad flags', { ...analysed('x'), ignoredLines: 'yes' }],
    ['bad details', { ...analysed('x'), details: null }],
    ['a bad owner', { ...analysed('x'), details: { ...analysed('x').details, owner: 'me' } }],
    ['bad commanders', { ...analysed('x'), details: { ...analysed('x').details, commanders: ['a'] } }],
  ])('rejects %s', (_, value) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value))
    expect(loadDraft()).toBeNull()
  })

  it('reports a failed write without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(saveDraft(emptyDraft(''))).toBe(false)
  })

  it('hashes only line endings away: CRLF keeps the analysis and choices', () => {
    const draft = analysed('1 Sol Ring\n1 Cultivate\n1 Coltivare')
    expect(hashText('a\r\nb\rc')).toBe(hashText('a\nb\nc'))
    expect(draftForText(draft, '1 Sol Ring\r\n1 Cultivate\r\n1 Coltivare')).toBe(draft)
  })

  it('invalidates the choices when an empty line moves the lines (fix 2)', () => {
    const draft = analysed('1 Sol Ring\n1 Coltivare')
    const moved = draftForText(draft, '1 Sol Ring\n\n1 Coltivare')
    expect(moved).toMatchObject({ step: 1, textHash: null, recognition: null, choices: {}, ignoredLines: false, acceptedMissing: false })
    expect(moved.text).toBe('1 Sol Ring\n\n1 Coltivare')
    expect(moved.details).toEqual(draft.details)
  })

  it('invalidates them when one space inside a line changes', () => {
    expect(draftForText(analysed('1 Sol Ring'), '1 Sol  Ring').recognition).toBeNull()
  })
})
