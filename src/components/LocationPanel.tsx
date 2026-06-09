import { TYPEWRITER_CPS } from '../config'
import type { ExitChip, NoticedItem, UiWorldState } from '../types/ui'
import { ChipButton, InfoChip, PanelTitle, SectionTag } from './chrome'
import { Tile } from './Tile'
import { useTypewriter } from './useTypewriter'

interface LocationPanelProps {
  state: UiWorldState
  narrative: string
  skipSignal: number
  onSkip: () => void
  onExit: (exit: ExitChip) => void
}

export function LocationPanel({
  state,
  narrative,
  skipSignal,
  onSkip,
  onExit,
}: LocationPanelProps) {
  const { visible, done } = useTypewriter(narrative, TYPEWRITER_CPS, skipSignal)

  return (
    <section className="flex min-h-0 flex-col overflow-y-auto px-3.5 py-3">
      <PanelTitle>Локация</PanelTitle>

      <div className="flex items-center gap-2">
        <Tile
          entityId={state.location.id}
          glyph={state.locationGlyph}
          sizeClass="h-[28px] w-[28px]"
          glyphClass="h-[18px] w-[18px]"
        />
        <span className="text-[14px] font-bold">{state.location.name}</span>
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted">
        {state.dayLabel} · {state.timeLabel}
      </div>

      {/* Click reveals the rest of the narrative at once (skippable typewriter). */}
      <p
        onClick={onSkip}
        className={`mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft ${
          done ? '' : 'cursor-pointer'
        }`}
        title={done ? undefined : 'Показать весь текст'}
      >
        {visible}
        {!done && <span className="opacity-60">_</span>}
      </p>

      {state.noticed.length > 0 && (
        <>
          <SectionTag>Замечаешь</SectionTag>
          {/* Noticed items are display-only in Phase 1; interactions go
              through action chips or free text. */}
          <div className="flex flex-wrap gap-1.5">
            {state.noticed.map((item: NoticedItem) => (
              <InfoChip key={item.id}>{item.label}</InfoChip>
            ))}
          </div>
        </>
      )}

      <SectionTag>Выходы</SectionTag>
      <div className="flex flex-wrap gap-1.5">
        {state.exits.map((exit) => (
          <ChipButton
            key={exit.toLocationId}
            onClick={() => onExit(exit)}
            title={`Перейти: ${exit.targetName}`}
          >
            {exit.direction} {'→'} {exit.targetName}
          </ChipButton>
        ))}
      </div>
    </section>
  )
}
