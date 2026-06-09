import { useEffect, useRef } from 'react'
import type { DialogueEntry, UiNpc } from '../types/ui'
import { PanelTitle, SectionTag } from './chrome'
import { Tile } from './Tile'

/** Relation meter: 1..3 filled pips from attitude_to_player (-1..1). */
function pipsFor(attitude: number): number {
  if (attitude > 0.6) return 3
  if (attitude > 0.25) return 2
  return 1
}

function RelationMeter({ npc }: { npc: UiNpc }) {
  if (!npc.known) {
    return <span className="text-[13px] font-bold text-tag">?</span>
  }
  const filled = pipsFor(npc.character.attitude_to_player)
  return (
    <span className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < filled ? 'bg-accent' : 'bg-pip-off'}`}
        />
      ))}
    </span>
  )
}

interface ConversePanelProps {
  npcs: UiNpc[]
  selectedId: string | null
  log: DialogueEntry[]
  onSelect: (id: string) => void
}

export function ConversePanel({ npcs, selectedId, log, onSelect }: ConversePanelProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const nameOf = (id: string | undefined) =>
    npcs.find((n) => n.character.id === id)?.character.name

  return (
    <section className="flex min-h-0 flex-col px-3.5 py-3">
      <PanelTitle>Беседа</PanelTitle>
      <SectionTag>Доступны для разговора</SectionTag>

      <div className="shrink-0">
        {npcs.map((npc) => {
          const c = npc.character
          const selected = c.id === selectedId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`mb-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-row-sel/60 ${
                selected ? 'bg-row-sel shadow-[inset_2px_0_0_var(--color-accent)]' : ''
              }`}
            >
              <Tile entityId={c.id} glyph={npc.glyph} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{c.name}</span>
                <span className="block truncate text-[11px] text-tag">{c.role}</span>
              </span>
              <RelationMeter npc={npc} />
            </button>
          )
        })}
      </div>

      <div className="my-2.5 h-px shrink-0 bg-line-soft" />

      <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-1">
        {log.length === 0 && (
          <p className="text-[11.5px] leading-relaxed text-faint">
            Выбери собеседника и напиши ему в панели «Действие» — или действуй сам.
          </p>
        )}
        {log.map((entry) => {
          if (entry.kind === 'system') {
            return (
              <div key={entry.id} className="self-center py-1 text-[10.5px] uppercase tracking-[0.7px] text-faint">
                {entry.text}
              </div>
            )
          }
          const isNpc = entry.kind === 'npc'
          return (
            <div
              key={entry.id}
              className={`max-w-[93%] rounded-lg border px-2.5 py-1.5 text-[12.5px] leading-snug ${
                isNpc
                  ? 'self-start border-line-faint bg-npc-msg text-npc-msg-ink'
                  : 'self-end border-you-msg-line bg-you-msg text-you-msg-ink'
              }`}
            >
              {isNpc && (
                <div className="mb-0.5 text-[10px] uppercase tracking-[0.5px] text-tag">
                  {nameOf(entry.speakerId)}
                </div>
              )}
              {entry.text}
            </div>
          )
        })}
      </div>
    </section>
  )
}
