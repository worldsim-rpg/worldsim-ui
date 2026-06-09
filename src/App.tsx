import { useMemo } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { ConversePanel } from './components/ConversePanel'
import { LocationPanel } from './components/LocationPanel'
import { LOCATION_FADE_MS } from './config'
import { FixtureEngine } from './engine/FixtureEngine'
import { useGame } from './useGame'

export default function App() {
  const engine = useMemo(() => new FixtureEngine(), [])
  const game = useGame(engine)

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
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-2.5">
        <span className="text-[14px] font-bold tracking-[0.3px]">{state.title}</span>
        <span className="text-[11px] text-muted">
          {state.difficultyLabel} · {state.languageLabel}
        </span>
      </header>

      <main
        className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-line-soft"
        style={{
          opacity: game.fading ? 0 : 1,
          transition: `opacity ${LOCATION_FADE_MS / 2}ms ease`,
        }}
      >
        <ConversePanel
          npcs={state.npcs}
          selectedId={game.addresseeId}
          log={game.log}
          onSelect={game.selectNpc}
        />
        <LocationPanel
          state={state}
          narrative={game.narrative}
          skipSignal={game.skipSignal}
          onSkip={game.bumpSkip}
          onExit={game.goExit}
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
        />
      </main>

      <footer className="shrink-0 border-t border-line bg-panel px-4 py-2 text-[10.5px] tracking-[0.3px] text-faint">
        Enter — отправить · Shift+Enter — перенос строки · стрелки вверх/вниз — история команд
        · клик по тексту локации — показать сразу
      </footer>
    </div>
  )
}
