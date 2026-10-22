import { useRef, useState } from 'react'
import type React from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DetailsIcon } from '../../components/icons'
import { ModalSideSheet } from '../../components/ModalSideSheet'
import type { CardData } from '../../media/scryfall'
import type { DeckStore } from '../deckStore'
import { DECK_NAME_MAX, OWNER_NAME_MAX } from '../model'
import type { DeckRecord } from '../model'
import { DECK_TABS } from '../routes'
import type { DeckTab } from '../routes'
import { commanderLine, ownerLabel } from '../summary'
import { CardCrop } from './CardCrop'
import { BackIcon } from './deckIcons'
import { DeckList, singleLine } from './DeckList'
import { DeckOverview } from './DeckOverview'
import { DeckStrategy } from './DeckStrategy'
import { defaultImportServices, ImportDeck } from './ImportDeck'
import type { ImportServices } from './ImportDeck'
import { TestHand } from './TestHand'

const TAB_LABELS: Record<DeckTab, string> = { panoramica: 'Panoramica', lista: 'Lista', strategia: 'Strategia', mano: 'Mano' }

interface DeckDetailProps {
  deck: DeckRecord
  cards: Map<string, CardData>
  store: DeckStore
  tab: DeckTab
  onTab: (tab: DeckTab) => void
  onBack: () => void
  onChanged: () => Promise<void>
  onOpenDeck: (deckId: string) => void
  /** The name of the match player linked to this deck, if any. */
  linkedTo: string | null
  onLink: () => void
  services?: ImportServices
  rng?: () => number
}

/**
 * The deck (R3 §6–10): a wide commander hero, the deck's actions, and four tabs. The tabs are a
 * real tablist with roving focus and manual activation; the chosen tab lives in the address.
 */
export function DeckDetail({ deck, cards, store, tab, onTab, onBack, onChanged, onOpenDeck, linkedTo, onLink, services = defaultImportServices, rng }: DeckDetailProps) {
  const [menu, setMenu] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editingList, setEditingList] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  const saveDeck = async (update: (current: DeckRecord) => DeckRecord) => {
    const current = (await store.getDeck(deck.id)) ?? deck
    await store.putDeck(update(current))
    await onChanged()
  }

  const prepare = async (target: DeckRecord) => {
    const data = target.cards.map((entry) => cards.get(entry.cardId)).filter((card): card is CardData => Boolean(card))
    const result = await services.prepare(target, data, () => undefined)
    await saveDeck((current) => ({ ...current, offline: result.offline }))
  }

  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: DECK_TABS.length - 1 - index }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = (index + moves[event.key] + DECK_TABS.length) % DECK_TABS.length
    tabs.current[next]?.focus()
  }

  const credits = deck.commanders.filter((cardId): cardId is string => Boolean(cardId && cards.get(cardId))).map((cardId) => cards.get(cardId) as CardData)

  if (replacing) {
    return (
      <ImportDeck
        store={store}
        services={services}
        replace={deck}
        knownCards={cards}
        onSaved={() => void onChanged()}
        onDone={() => {
          setReplacing(false)
          onTab('lista')
        }}
        onCancel={() => setReplacing(false)}
      />
    )
  }

  return (
    <div className="screen deck-detail">
      <header className="deck-hero">
        <CardCrop cardIds={deck.commanders} className="deck-hero__art" />
        <div className="deck-hero__top">
          <button type="button" className="quiet-button deck-back" onClick={onBack}>
            <BackIcon /> Torna ai mazzi
          </button>
          <button type="button" className="icon-button" aria-label="Azioni del mazzo" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <DetailsIcon />
          </button>
        </div>
        {menu && (
          <ul className="deck-menu" role="menu" aria-label="Azioni del mazzo">
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setMenu(false), setEditingDetails(true))}>
                Modifica dettagli
              </button>
            </li>
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setMenu(false), setEditingList(true), onTab('lista'))}>
                Modifica lista
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  const copy: DeckRecord = { ...deck, id: services.newId(), name: `${deck.name} (copia)`.slice(0, DECK_NAME_MAX), createdAt: services.now(), updatedAt: services.now() }
                  void store.putDeck(copy).then(onChanged).then(() => onOpenDeck(copy.id))
                }}
              >
                Duplica mazzo
              </button>
            </li>
            {deck.offline !== 'complete' && (
              <li role="none">
                <button type="button" role="menuitem" onClick={() => (setMenu(false), void prepare(deck))}>
                  Prepara di nuovo offline
                </button>
              </li>
            )}
            <li role="none" className="deck-menu__danger">
              <button type="button" role="menuitem" className="quiet-danger" onClick={() => (setMenu(false), setConfirmDelete(true))}>
                Elimina mazzo
              </button>
            </li>
          </ul>
        )}
        <div className="deck-hero__identity">
          <h1 tabIndex={-1}>{deck.name}</h1>
          <p className="deck-hero__commander">
            {commanderLine(deck, cards)} · {ownerLabel(deck)}
          </p>
          {credits.length > 0 && <p className="deck-hero__credit">Illustrazione di {credits.map((card) => card.artist).join(' e ')}</p>}
        </div>
      </header>

      <div className="deck-tabs" role="tablist" aria-label="Sezioni del mazzo">
        {DECK_TABS.map((name, index) => (
          <button
            key={name}
            ref={(element) => {
              tabs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${deck.id}-tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`${deck.id}-panel`}
            tabIndex={tab === name ? 0 : -1}
            className="deck-tab"
            onKeyDown={(event) => onTabKey(event, index)}
            onClick={() => onTab(name)}
          >
            {TAB_LABELS[name]}
          </button>
        ))}
      </div>

      <div className="deck-panel" role="tabpanel" id={`${deck.id}-panel`} aria-labelledby={`${deck.id}-tab-${tab}`} key={tab}>
        {tab === 'panoramica' && <DeckOverview deck={deck} cards={cards} linkedTo={linkedTo} onLink={onLink} onStrategy={() => onTab('strategia')} />}
        {tab === 'lista' && (
          <DeckList
            deck={deck}
            cards={cards}
            editing={editingList}
            online={online}
            onEdit={(editing) => {
              setOnline(navigator.onLine)
              setEditingList(editing)
            }}
            recognizeName={(name) => services.recognize(singleLine(name))}
            onPasteUpdate={() => setReplacing(true)}
            now={services.now}
            onSave={async (changed, added) => {
              if (added.length > 0) await store.putCards(added)
              const missingArt = added.some((card) => card.artUrl)
              await saveDeck(() => ({ ...changed, offline: missingArt ? 'incomplete' : changed.offline }))
              if (missingArt) await prepare({ ...changed })
            }}
          />
        )}
        {tab === 'strategia' && <DeckStrategy deck={deck} cards={cards} saveDeck={saveDeck} />}
        {tab === 'mano' && <TestHand deck={deck} cards={cards} rng={rng} />}
      </div>

      <ModalSideSheet open={editingDetails} title="Modifica dettagli" onClose={() => setEditingDetails(false)}>
        {editingDetails && <DetailsForm deck={deck} onSave={(patch) => void saveDeck((current) => ({ ...current, ...patch, updatedAt: services.now() })).then(() => setEditingDetails(false))} />}
      </ModalSideSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare il mazzo?"
        description="La lista, le note e le carte chiave verranno eliminate da questo dispositivo."
        confirmLabel="Elimina mazzo"
        onConfirm={() => {
          setConfirmDelete(false)
          void store.deleteDeck(deck.id).then(onChanged).then(onBack)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function DetailsForm({ deck, onSave }: { deck: DeckRecord; onSave: (patch: Pick<DeckRecord, 'name' | 'owner'>) => void }) {
  const [name, setName] = useState(deck.name)
  const [friend, setFriend] = useState(deck.owner.kind === 'friend')
  const [friendName, setFriendName] = useState(deck.owner.kind === 'friend' ? deck.owner.name : '')
  const valid = name.trim().length > 0 && (!friend || friendName.trim().length > 0)
  return (
    <form
      className="deck-details-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onSave({ name: name.trim(), owner: friend ? { kind: 'friend', name: friendName.trim() } : { kind: 'me' } })
      }}
    >
      <label className="deck-import__field">
        <span>Nome del mazzo</span>
        <input value={name} maxLength={DECK_NAME_MAX} onChange={(event) => setName(event.currentTarget.value)} />
      </label>
      <label className="check-option">
        <input type="checkbox" checked={friend} onChange={(event) => setFriend(event.currentTarget.checked)} />
        <span>Mazzo di un amico</span>
      </label>
      {friend && (
        <label className="deck-import__field">
          <span>Nome dell'amico</span>
          <input value={friendName} maxLength={OWNER_NAME_MAX} onChange={(event) => setFriendName(event.currentTarget.value)} />
        </label>
      )}
      <button type="submit" className="primary-button" disabled={!valid}>
        Salva
      </button>
    </form>
  )
}
