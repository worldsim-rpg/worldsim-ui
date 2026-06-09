import { useEffect, useRef } from 'react'
import { TYPEWRITER_CPS } from '../config'
import type { CheckResult, ExitChip, NarrativeBlock, NoticedItem, UiWorldState } from '../types/ui'
import { BookIcon, ChipButton, IconButton, InfoChip, PanelTitle, SectionTag } from './chrome'
import { LlmWaitIndicator } from './LlmWaitIndicator'
import { Tile } from './Tile'
import { useTypewriter } from './useTypewriter'

/** Light check plate above the narrative: no dice, no numbers (round 8). */
function CheckPlate({ check }: { check: CheckResult }) {
  return (
    <div
      className={`mb-1 inline-block self-start rounded border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.5px] ${
        check.success ? 'border-cond-ok/50 text-cond-ok' : 'border-risk/60 text-risk'
      }`}
    >
      Проверка: {check.skill} — {check.success ? 'успех' : 'провал'}
    </div>
  )
}

interface LocationPanelProps {
  state: UiWorldState
  /** Scrollback of the current location, oldest first (round 5). */
  blocks: NarrativeBlock[]
  busy: boolean
  skipSignal: number
  onSkip: () => void
  onExit: (exit: ExitChip) => void
  onOpenJournal: () => void
}

export function LocationPanel({
  state,
  blocks,
  busy,
  skipSignal,
  onSkip,
  onExit,
  onOpenJournal,
}: LocationPanelProps) {
  const last = blocks[blocks.length - 1]
  const { visible, done } = useTypewriter(last?.text ?? '', TYPEWRITER_CPS, skipSignal)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Follow the typewriter / new blocks unless the player scrolled up.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [visible, blocks.length])

  return (
    <section className="flex min-h-0 flex-col px-3.5 py-3">
      <PanelTitle
        right={
          <span className="flex items-center gap-2">
            <span className="text-[11px] normal-case tracking-normal text-muted">
              {state.dayLabel} · {state.timeLabel}
            </span>
            {/* Journal button lives in the Location panel corner (round 7). */}
            <IconButton label="Журнал" onClick={onOpenJournal}>
              <BookIcon />
            </IconButton>
          </span>
        }
      >
        Локация
      </PanelTitle>

      <div className="flex shrink-0 items-center gap-2">
        <Tile
          entityId={state.location.id}
          glyph={state.locationGlyph}
          sizeClass="h-[28px] w-[28px]"
          glyphClass="h-[18px] w-[18px]"
        />
        <span className="text-[14px] font-bold">{state.location.name}</span>
      </div>

      <div ref={scrollRef} className="mt-2.5 min-h-0 flex-1 overflow-y-auto pr-1">
        {blocks.map((block, i) => {
          const isLast = i === blocks.length - 1
          return (
            <div key={block.id} className="mb-2.5 flex flex-col">
              {block.check && <CheckPlate check={block.check} />}
              {/* Click reveals the rest of the narrative at once. */}
              <p
                onClick={isLast && !done ? onSkip : undefined}
                className={`whitespace-pre-line text-[13px] leading-relaxed text-ink-soft ${
                  isLast && !done ? 'cursor-pointer' : ''
                }`}
                title={isLast && !done ? 'Показать весь текст' : undefined}
              >
                {isLast ? visible : block.text}
                {isLast && !done && <span className="opacity-60">_</span>}
              </p>
            </div>
          )
        })}
        {/* Wait line under the narrative (previz: wait-line). */}
        {busy && <LlmWaitIndicator />}
      </div>

      <div className="shrink-0">
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
        <div className="flex flex-wrap gap-1.5 pb-0.5">
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
      </div>
    </section>
  )
}
