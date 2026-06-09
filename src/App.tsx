import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { ConversePanel } from './components/ConversePanel'
import { LocationPanel } from './components/LocationPanel'
import { JournalOverlay, SettingsOverlay } from './components/overlays'
import { Toasts } from './components/Toasts'
import { LOCATION_SLIDE_MS, SAVE_KEY } from './config'
import { FixtureEngine, type FixtureSave } from './engine/FixtureEngine'
import { meta as fixtureMeta } from './fixture/world'
import { useGame, type SlidePhase, type UiSave } from './useGame'

/** Autosave blob: engine snapshot + UI state (round 8). */
interface SaveBlob {
  v: 1
  engine: FixtureSave
  ui: UiSave
}

function readSave(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const blob = JSON.parse(raw) as SaveBlob
    if (blob.v !== 1 || !blob.engine || !blob.ui) return null
    return blob
  } catch {
    return null
  }
}

/** Scene slide on location change (previz: out left, in from the right). */
const HALF = LOCATION_SLIDE_MS / 2
const SLIDE_STYLES: Record<SlidePhase, CSSProperties> = {
  idle: {
    transform: 'translateX(0)',
    opacity: 1,
    transition: `transform ${HALF}ms ease-out, opacity ${HALF}ms ease-out`,
  },
  out: {
    transform: 'translateX(-56px)',
    opacity: 0,
    transition: `transform ${HALF}ms ease-in, opacity ${HALF}ms ease-in`,
  },
  enter: { transform: 'translateX(56px)', opacity: 0, transition: 'none' },
}

interface GameSession {
  id: number
  engine: FixtureEngine
  restored: UiSave | null
}

export default function App() {
  const [session, setSession] = useState<GameSession | null>(null)
  const [saveExists, setSaveExists] = useState(() => readSave() !== null)

  const newGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY)
    setSaveExists(false)
    setSession((s) => ({ id: (s?.id ?? 0) + 1, engine: new FixtureEngine(), restored: null }))
  }, [])

  const continueGame = useCallback(() => {
    const blob = readSave()
    if (!blob) {
      setSaveExists(false)
      return
    }
    setSession((s) => ({
      id: (s?.id ?? 0) + 1,
      engine: new FixtureEngine(blob.engine),
      restored: blob.ui,
    }))
  }, [])

  const toTitle = useCallback(() => {
    localStorage.removeItem(SAVE_KEY)
    setSaveExists(false)
    setSession(null)
  }, [])

  if (!session) {
    return (
      <TitleScreen
        saveExists={saveExists}
        onContinue={continueGame}
        onNewGame={newGame}
      />
    )
  }

  return (
    <GameScreen
      key={session.id}
      engine={session.engine}
      restored={session.restored}
      onRestart={toTitle}
    />
  )
}

/** Mini title screen (round 8). TODO(phase-2): world selection list. */
function TitleScreen({
  saveExists,
  onContinue,
  onNewGame,
}: {
  saveExists: boolean
  onContinue: () => void
  onNewGame: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-wide text-ink">{fixtureMeta.title}</h1>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          {fixtureMeta.premise}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {saveExists && (
          <button
            type="button"
            onClick={onContinue}
            className="cursor-pointer rounded-lg border border-accent bg-chip-bg px-8 py-2 text-[13px] text-ink transition-colors hover:bg-row-sel"
          >
            Продолжить
          </button>
        )}
        <button
          type="button"
          onClick={onNewGame}
          className="cursor-pointer rounded-lg border border-line bg-chip-bg px-8 py-2 text-[13px] text-chip-act-ink transition-colors hover:border-accent hover:text-ink"
        >
          Новая игра
        </button>
      </div>
      <p className="text-[10.5px] text-faint">
        Phase 1: прототип на фикстуре, без LLM
      </p>
    </div>
  )
}

function GameScreen({
  engine,
  restored,
  onRestart,
}: {
  engine: FixtureEngine
  restored: UiSave | null
  onRestart: () => void
}) {
  const persist = useCallback(
    (ui: UiSave) => {
      const blob: SaveBlob = { v: 1, engine: engine.dump(), ui }
      localStorage.setItem(SAVE_KEY, JSON.stringify(blob))
    },
    [engine],
  )

  const game = useGame(engine, restored, persist)
  const [journalOpen, setJournalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const slideStyle = useMemo(() => SLIDE_STYLES[game.slidePhase], [game.slidePhase])

  if (!game.state) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-faint">
        Загрузка мира...
      </div>
    )
  }

  const state = game.state
  const addressee =
    state.npcs.find((n) => n.character.id === game.addresseeId) ?? null

  return (
    <div className="flex h-full flex-col">
      {/* No top bar (round 6): global buttons live in panel corners. */}
      <main
        className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line-soft"
        style={slideStyle}
      >
        <ConversePanel
          npcs={game.orderedNpcs}
          selectedId={game.addresseeId}
          log={game.log}
          onSelect={game.selectNpc}
        />
        <LocationPanel
          state={state}
          blocks={game.narrativeBlocks}
          busy={game.busy}
          skipSignal={game.skipSignal}
          onSkip={game.bumpSkip}
          onExit={game.goExit}
          onOpenJournal={() => setJournalOpen(true)}
        />
        <ActionPanel
          state={state}
          addressee={addressee}
          busy={game.busy}
          injected={game.injected}
          onSubmit={game.submit}
          onClearAddressee={game.clearAddressee}
          onChip={game.runChip}
          onEmptyEnter={game.bumpSkip}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </main>

      <footer className="shrink-0 border-t border-line bg-panel px-4 py-2 text-[10.5px] tracking-[0.3px] text-faint">
        Enter — отправить · Shift+Enter — перенос строки · стрелки вверх/вниз — история команд
        · клик по тексту локации — показать сразу
      </footer>

      {journalOpen && (
        <JournalOverlay journal={game.journal} onClose={() => setJournalOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsOverlay
          state={state}
          onRestart={onRestart}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <Toasts toasts={game.toasts} />
    </div>
  )
}
