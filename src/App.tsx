import { useEffect, useReducer, useRef, useState } from 'react'
import { AppNotices } from './components/AppNotices'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PlayerPanel } from './components/PlayerPanel'
import { PlayerSeat } from './components/PlayerSeat'
import type { TableLayout } from './components/PlayerSeat'
import { RulesDialog } from './components/RulesDialog'
import { getArtStore, pruneArt } from './media/artStore'
import { canRemovePartner, createGame } from './game/game'
import { createHistory, getGroupDelta, historyReducer } from './game/history'
import { loadGame, requestPersistentStorage, saveGame, subscribeToExternalChanges } from './game/storage'
import type { LoadStatus } from './game/storage'
import type { GameAction } from './game/types'
import { useCompactDensity } from './platform/useCompactDensity'
import { isWakeLockSupported, useWakeLock } from './platform/useWakeLock'
import { loadPreferences, savePreferences } from './settings/preferences'
import type { Preferences } from './settings/preferences'
import { DecksScreen } from './shell/DecksScreen'
import { LearnScreen } from './shell/LearnScreen'
import { MoreScreen } from './shell/MoreScreen'
import { SectionNav } from './shell/SectionNav'
import { ShellRhombus } from './shell/ShellRhombus'
import type { Section } from './shell/sections'
import { useCentreLayout } from './shell/useCentreLayout'
import { useSection } from './shell/useSection'

type PendingConfirmation = { kind: 'new-game'; playerCount: number } | { kind: 'reset' } | null

const NAV_ID = 'sezioni'

/**
 * The app shell (D-037, R1): four sections behind a top bar. The game view stays mounted and is
 * only hidden, so leaving and coming back never remounts a panel. During play the bar is hidden
 * until the central rhombus reveals it.
 */
export default function App() {
  const [initial] = useState(loadGame)
  const [history, dispatchHistory] = useReducer(historyReducer, initial.game, createHistory)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(initial.status)
  const [saveFailed, setSaveFailed] = useState(false)
  const [preferences, setPreferences] = useState(loadPreferences)
  const [pending, setPending] = useState<PendingConfirmation>(null)
  // Presentation state only: never dispatched, persisted or part of history.
  const [rulesOpen, setRulesOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [section, navigate] = useSection()
  const compact = useCompactDensity()
  const rhombusRef = useRef<HTMLButtonElement>(null)
  const focusTitleNext = useRef(false)
  const focusBarNext = useRef(false)
  const game = history.present
  const groupDelta = getGroupDelta(history)
  const playing = section === 'partita'

  // Persist every change synchronously so a closed tab never loses the last action.
  // oxlint-disable-next-line react/set-state-in-effect -- the result comes from an external system (storage).
  useEffect(() => setSaveFailed(!saveGame(game)), [game])

  // Drop cached art no current player uses.
  useEffect(() => {
    const store = getArtStore()
    const keep = new Set(initial.game.players.flatMap((player) => player.commanders.flatMap((slot) => (slot ? [slot.cardId] : []))))
    if (store) void pruneArt(store, keep).catch(() => undefined)
  }, [initial])

  useEffect(() => {
    void requestPersistentStorage()
    return subscribeToExternalChanges((external) => dispatchHistory({ type: 'external', game: external }))
  }, [])

  // The screen stays awake only while the table is on screen (R1 design §6.2).
  useWakeLock(preferences.keepScreenOn && playing)

  const updatePreferences = (next: Preferences) => {
    setPreferences(next)
    savePreferences(next)
  }

  const hideBar = () => {
    setRevealed(false)
    rhombusRef.current?.focus()
  }

  // Esc hides the bar revealed over the game and hands focus back to the rhombus.
  useEffect(() => {
    if (!playing || !revealed) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], [role="dialog"]')) return
      setRevealed(false)
      rhombusRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playing, revealed])

  // After a keyboard choice, focus lands on the new view's title (R1 design §4.2).
  useEffect(() => {
    if (!focusTitleNext.current) return
    focusTitleNext.current = false
    document.querySelector<HTMLElement>(`[data-section="${section}"] h1`)?.focus()
  }, [section])

  const toggleBar = (byKeyboard: boolean) => {
    if (!preferences.rhombusHintSeen) updatePreferences({ ...preferences, rhombusHintSeen: true })
    if (revealed) {
      setRevealed(false)
      return
    }
    focusBarNext.current = byKeyboard
    setRevealed(true)
  }

  // Opening the bar from the keyboard moves focus to the current section in it.
  useEffect(() => {
    if (!revealed || !focusBarNext.current) return
    focusBarNext.current = false
    document.querySelector<HTMLElement>(`#${NAV_ID} [aria-current="page"]`)?.focus()
  }, [revealed])

  const goTo = (next: Section, byKeyboard: boolean) => {
    setRevealed(false)
    if (byKeyboard && next !== 'partita') focusTitleNext.current = true
    navigate(next)
  }

  const dispatch = (action: GameAction) => dispatchHistory({ type: 'apply', action, at: performance.now() })

  // Two players may face each other (D-035); four players use their chosen layout (D-034).
  const playerCount = game.players.length
  const layout: TableLayout =
    playerCount === 4 ? preferences.fourPlayerLayout : playerCount === 2 && preferences.twoPlayerLayout === 'facing' ? 'two-facing' : 'grid'
  // Tavolo seats are short strips along an edge, so they always use compact panels (D-034).
  // Two players face to face keep the density of Stesso lato (R1 §13.3).
  const panelDensity = compact || layout === 'table'

  // Layout change: one 140 ms crossfade with a 2px settle on the whole grid, never an animated
  // rotation and never a remount; immediate with reduced motion (D-034).
  const gridRef = useRef<HTMLElement>(null)
  const previousLayout = useRef(layout)
  useEffect(() => {
    if (previousLayout.current === layout) return
    previousLayout.current = layout
    const grid = gridRef.current
    if (typeof grid?.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    grid.animate([{ opacity: 0, transform: 'translateY(2px)' }, { opacity: 1, transform: 'none' }], {
      duration: 140,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    })
  }, [layout])

  // The rhombus sits on the table's centre and each card keeps the touching corner free (R1).
  const centre = useCentreLayout(gridRef, `${layout}|${playerCount}|${panelDensity}|${section}|${preferences.rhombusHintSeen}`)

  const cells = game.players.map((player, index) => (
    <PlayerSeat
      key={player.id}
      layout={layout}
      index={index}
      clear={centre.clearances[index]}
      hintReserve={preferences.rhombusHintSeen ? null : centre.hintReserves[index]}
    >
      <PlayerPanel
        player={player}
        opponents={game.players.filter((opponent) => opponent.id !== player.id)}
        playerCount={playerCount}
        canRemovePartner={canRemovePartner(game, player.id)}
        delta={groupDelta?.target.playerId === player.id ? groupDelta : null}
        compact={panelDensity}
        monarchPlayerId={game.monarchPlayerId}
        initiativePlayerId={game.initiativePlayerId}
        dispatch={dispatch}
      />
    </PlayerSeat>
  ))

  const confirm = () => {
    if (pending?.kind === 'new-game') dispatchHistory({ type: 'replace', game: createGame(pending.playerCount) })
    if (pending?.kind === 'reset') dispatch({ type: 'reset-game' })
    setPending(null)
  }

  return (
    <div className="app-shell" data-compact-density={compact} data-active-section={section}>
      <SectionNav
        id={NAV_ID}
        section={section}
        state={playing ? (revealed ? 'revealed' : 'hidden') : 'persistent'}
        onNavigate={goTo}
        onRequestClose={hideBar}
      />

      <AppNotices
        loadStatus={loadStatus}
        saveFailed={saveFailed}
        onDismissLoadStatus={() => setLoadStatus('restored')}
        placement={playing ? 'toast' : 'inline'}
      />

      <main
        id="main"
        ref={gridRef}
        className="player-grid"
        data-player-count={playerCount}
        data-layout={layout}
        data-section="partita"
        hidden={!playing}
        tabIndex={-1}
      >
        {cells}
        <ShellRhombus
          expanded={revealed}
          controlsId={NAV_ID}
          showHint={!preferences.rhombusHintSeen}
          onToggle={toggleBar}
          buttonRef={rhombusRef}
          style={centre.point ? { left: centre.point.x, top: centre.point.y } : undefined}
        />
      </main>

      <section className="app-view" data-section="mazzi" hidden={section !== 'mazzi'}>
        <DecksScreen />
      </section>
      <section className="app-view" data-section="impara" hidden={section !== 'impara'}>
        <LearnScreen onOpenRules={() => setRulesOpen(true)} />
      </section>
      <section className="app-view" data-section="altro" hidden={section !== 'altro'}>
        <MoreScreen
          key={playerCount}
          playerCount={playerCount}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          wakeLockSupported={isWakeLockSupported()}
          onNewGame={(count) => setPending({ kind: 'new-game', playerCount: count })}
          onReset={() => setPending({ kind: 'reset' })}
        />
      </section>

      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <ConfirmDialog
        open={pending?.kind === 'new-game'}
        title="Iniziare una nuova partita?"
        description="I punteggi attuali verranno sostituiti."
        confirmLabel="Nuova partita"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Azzerare tutti i punteggi?"
        description="Vita, danni, segnalini, tassa, Monarca e Iniziativa torneranno ai valori iniziali. Nomi, Partner e comandanti resteranno invariati."
        confirmLabel="Azzera punteggi"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
