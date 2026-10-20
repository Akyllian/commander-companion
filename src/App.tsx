import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { AppNotices } from './components/AppNotices'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PlayerPanel } from './components/PlayerPanel'
import { PlayerSeat } from './components/PlayerSeat'
import type { TableLayout } from './components/PlayerSeat'
import { RulesDialog } from './components/RulesDialog'
import { blocksSeats, CLOSED, surfaceReducer } from './match/surface'
import type { SurfaceEvent, Tool } from './match/surface'
import { useMatchArt } from './media/useMatchArt'
import { canRemovePartner, createGame } from './game/game'
import { createHistory, getGroupDelta, historyReducer } from './game/history'
import { loadGame, requestPersistentStorage, saveGame, subscribeToExternalChanges } from './game/storage'
import type { LoadStatus } from './game/storage'
import type { GameAction } from './game/types'
import { useCompactDensity } from './platform/useCompactDensity'
import { isWakeLockSupported, useWakeLock } from './platform/useWakeLock'
import { hintPending, loadPreferences, RHOMBUS_HINT_VERSION, savePreferences } from './settings/preferences'
import type { Preferences } from './settings/preferences'
import { DecksScreen } from './shell/DecksScreen'
import { LearnScreen } from './shell/LearnScreen'
import { MoreScreen } from './shell/MoreScreen'
import { SectionNav } from './shell/SectionNav'
import type { Point } from './shell/centre'
import type { Insets, Rect } from './shell/hubGeometry'
import { RhombusHub } from './shell/RhombusHub'
import { CoinTool } from './tools/CoinTool'
import { DiceTool } from './tools/DiceTool'
import { EMPTY_POOL } from './tools/mana'
import { ManaTool } from './tools/ManaTool'
import { ToolFrame } from './tools/ToolFrame'
import { readSafeInsets } from './shell/safeInsets'
import { ShellRhombus } from './shell/ShellRhombus'
import type { Section } from './shell/sections'
import { useCentreLayout } from './shell/useCentreLayout'
import { useSection } from './shell/useSection'

type PendingConfirmation = { kind: 'new-game'; playerCount: number } | { kind: 'reset' } | null

const NAV_ID = 'sezioni'
const HUB_ID = 'strumenti'
const RHOMBUS = '.shell-rhombus'
const TOOL_TITLES: Record<Tool, string> = { dice: 'Dadi', mana: 'Mana', coin: 'Moneta' }

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
  // The one transient surface (R2 §2.5): hub, tool, or a card's Contatori or Danni Commander.
  const [surface, dispatchSurface] = useReducer(surfaceReducer, CLOSED)
  // Where focus goes once the surface that held it is gone.
  const focusAfterClose = useRef<string | null>(null)
  // The tool last opened from the hub: «Torna agli strumenti» refocuses its action (R2 §8).
  const [lastTool, setLastTool] = useState<Tool | null>(null)
  // The hub's single live region (R2 §11); a repeated result changes invisibly so it is spoken again.
  const [announcement, setAnnouncement] = useState('')
  // Shared mana: kept across tool closes and sections, never saved; a new game empties it (R2 §8.2).
  const [mana, setMana] = useState(EMPTY_POOL)
  const announce = (text: string) => setAnnouncement((previous) => (previous === text ? `${text}\u200b` : text))
  const [section, navigate] = useSection()
  const compact = useCompactDensity()
  const rhombusRef = useRef<HTMLButtonElement>(null)
  const focusTitleNext = useRef(false)
  const focusBarNext = useRef(false)
  const game = history.present
  const groupDelta = getGroupDelta(history)
  const playing = section === 'partita'
  const showHint = hintPending(preferences)

  // Persist every change synchronously so a closed tab never loses the last action.
  // oxlint-disable-next-line react/set-state-in-effect -- the result comes from an external system (storage).
  useEffect(() => setSaveFailed(!saveGame(game)), [game])

  // Random art for seats without a commander, fixed for the whole match (D-039).
  const { match, startNew: startNewMatch } = useMatchArt(game.players)

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

  // The rhombus opens or closes the hub; hub and bar are never open together (R2 §7.4).
  const toggleHub = () => {
    if (showHint) updatePreferences({ ...preferences, rhombusHintVersion: RHOMBUS_HINT_VERSION })
    setRevealed(false)
    setLastTool(null)
    dispatchSurface({ type: 'toggle-hub' })
  }

  // «Sezioni» closes the hub, reveals the R1 bar and focuses the current section in it.
  const showSections = () => {
    dispatchSurface({ type: 'close' })
    focusBarNext.current = true
    setRevealed(true)
  }

  // Opening the bar from «Sezioni» moves focus to the current section in it.
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

  /**
   * Closes the active surface. A card panel hands focus back to its trigger (R2 §11); the hub and
   * its tools hand it to the rhombus, never to a control that just unmounted (R2 §8).
   */
  const closeSurface = () => {
    focusAfterClose.current =
      surface.kind === 'counters' || surface.kind === 'commander'
        ? `[data-player-id="${surface.playerId}"] [data-surface-trigger="${surface.kind}"]`
        : RHOMBUS
    dispatchSurface({ type: 'close' })
  }

  const onHubEvent = (event: SurfaceEvent) => {
    if (event.type === 'close') return closeSurface()
    if (event.type === 'open' && event.surface.kind === 'tool') setLastTool(event.surface.tool)
    dispatchSurface(event)
  }

  // The hub is placed in the viewport from the rhombus' live position (R2 §7.3, §8).
  const hubOpen = blocksSeats(surface)
  const [hubFrame, setHubFrame] = useState<{ anchor: Point; viewport: Rect; insets: Insets } | null>(null)
  useLayoutEffect(() => {
    if (!hubOpen) return
    let frame = 0
    const measure = () => {
      const box = rhombusRef.current?.getBoundingClientRect()
      if (!box) return
      setHubFrame({
        anchor: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
        viewport: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        insets: readSafeInsets(),
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [hubOpen])

  useEffect(() => {
    if (surface.kind !== 'closed' || !focusAfterClose.current) return
    document.querySelector<HTMLElement>(focusAfterClose.current)?.focus()
    focusAfterClose.current = null
  }, [surface])

  // Escape closes the active surface, unless a dialog above it handles the key first.
  useEffect(() => {
    if (surface.kind === 'closed') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], [role="dialog"]')) return
      closeSurface()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // A panel whose player left closes, and focus falls back to the rhombus, never to <body>.
  const playerIds = game.players.map((player) => player.id).join(',')
  const previousCount = useRef(game.players.length)
  useEffect(() => {
    const ids = playerIds.split(',')
    dispatchSurface({ type: 'players-changed', playerIds: ids })
    const removed = ids.length < previousCount.current
    previousCount.current = ids.length
    if (!removed) return
    // After the removed card's own controls unmount (and its sheet hands focus back).
    const timer = window.setTimeout(() => {
      const active = document.activeElement
      if (!active || active === document.body || !active.isConnected) rhombusRef.current?.focus()
    })
    return () => window.clearTimeout(timer)
  }, [playerIds])

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
    // A surface never survives a new layout: its geometry and focus would be orphaned (R2 §9).
    dispatchSurface({ type: 'layout-changed' })
    const grid = gridRef.current
    if (typeof grid?.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    grid.animate([{ opacity: 0, transform: 'translateY(2px)' }, { opacity: 1, transform: 'none' }], {
      duration: 140,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    })
  }, [layout])

  // The rhombus sits on the table's centre and each card keeps the touching corner free (R1).
  const centre = useCentreLayout(gridRef, `${layout}|${playerCount}|${panelDensity}|${section}|${showHint}`)

  const cells = game.players.map((player, index) => (
    <PlayerSeat
      key={player.id}
      layout={layout}
      index={index}
      clear={centre.clearances[index]}
      hintReserve={showHint ? centre.hintReserves[index] : null}
      inert={blocksSeats(surface)}
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
        randomArt={match.randomArtBySeat[player.id] ?? null}
        openSurface={(surface.kind === 'counters' || surface.kind === 'commander') && surface.playerId === player.id ? surface.kind : null}
        onOpenSurface={(kind) => dispatchSurface({ type: 'open', surface: { kind, playerId: player.id } })}
        onCloseSurface={closeSurface}
        dispatch={dispatch}
      />
    </PlayerSeat>
  ))

  const confirm = () => {
    if (pending?.kind === 'new-game') {
      dispatchHistory({ type: 'replace', game: createGame(pending.playerCount) })
      startNewMatch()
      setMana(EMPTY_POOL)
    }
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
          expanded={hubOpen}
          controlsId={HUB_ID}
          // The label hides while a surface is open; its reserved band stays, so no card moves.
          showHint={showHint && surface.kind === 'closed'}
          onToggle={toggleHub}
          buttonRef={rhombusRef}
          style={centre.point ? { left: centre.point.x, top: centre.point.y } : undefined}
        />
        {hubOpen && hubFrame && (
          <RhombusHub
            id={HUB_ID}
            surface={surface}
            anchor={hubFrame.anchor}
            viewport={hubFrame.viewport}
            insets={hubFrame.insets}
            returnFocusTo={surface.kind === 'hub' ? lastTool : null}
            onEvent={onHubEvent}
            onShowSections={showSections}
            announcement={announcement}
            tool={
              surface.kind === 'tool' && (
                <ToolFrame
                  key={surface.tool}
                  title={TOOL_TITLES[surface.tool]}
                  anchor={hubFrame.anchor}
                  viewport={hubFrame.viewport}
                  insets={hubFrame.insets}
                  onBack={() => dispatchSurface({ type: 'back-to-hub' })}
                >
                  {surface.tool === 'dice' && <DiceTool layout={layout} announce={announce} />}
                  {surface.tool === 'mana' && <ManaTool pool={mana} onChange={setMana} announce={announce} />}
                  {surface.tool === 'coin' && <CoinTool layout={layout} announce={announce} />}
                </ToolFrame>
              )
            }
          />
        )}
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
