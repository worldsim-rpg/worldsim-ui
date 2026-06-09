import { useEffect, useRef, useState } from 'react'
import { INPUT_MAX_ROWS } from '../config'
import type { ActionChip, UiNpc, UiWorldState } from '../types/ui'
import { ChipButton, InfoChip, PanelTitle, SectionTag } from './chrome'
import { LlmWaitIndicator } from './LlmWaitIndicator'

interface ActionPanelProps {
  state: UiWorldState
  addressee: UiNpc | null
  busy: boolean
  /** Template-chip text to insert into the input. */
  injected: { text: string; n: number }
  onSubmit: (text: string) => void
  onClearAddressee: () => void
  onChip: (chip: ActionChip) => void
  /** Enter on an empty field: used to skip the running typewriter. */
  onEmptyEnter: () => void
}

/** Approx. pixel height of INPUT_MAX_ROWS text rows incl. padding. */
const MAX_INPUT_PX = INPUT_MAX_ROWS * 20 + 18

export function ActionPanel({
  state,
  addressee,
  busy,
  injected,
  onSubmit,
  onClearAddressee,
  onChip,
  onEmptyEnter,
}: ActionPanelProps) {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number | null>(null)
  const draftRef = useRef('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Template chips insert their text and focus the field (brainstorm round 1).
  useEffect(() => {
    if (injected.n === 0) return
    setValue(injected.text)
    setHistIdx(null)
    const ta = taRef.current
    if (ta) {
      ta.focus()
      requestAnimationFrame(() => ta.setSelectionRange(ta.value.length, ta.value.length))
    }
  }, [injected])

  // Auto-grow up to INPUT_MAX_ROWS rows, then scroll inside.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_PX)}px`
  }, [value])

  const send = () => {
    const text = value.trim()
    if (!text) {
      onEmptyEnter()
      return
    }
    onSubmit(text)
    setHistory((h) => (h[h.length - 1] === text ? h : [...h, text]))
    setHistIdx(null)
    setValue('')
  }

  const recall = (idx: number | null) => {
    if (idx === null) {
      setValue(draftRef.current)
    } else {
      setValue(history[idx])
    }
    setHistIdx(idx)
    const ta = taRef.current
    if (ta) requestAnimationFrame(() => ta.setSelectionRange(ta.value.length, ta.value.length))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
      return
    }

    // Terminal-style history (brainstorm round 1): ArrowUp on the first line
    // goes back, ArrowDown on the last line goes forward to the draft.
    if (e.key === 'ArrowUp' && history.length > 0) {
      const firstNl = value.indexOf('\n')
      const onFirstLine = firstNl === -1 || ta.selectionStart <= firstNl
      if (!onFirstLine) return
      e.preventDefault()
      if (histIdx === null) {
        draftRef.current = value
        recall(history.length - 1)
      } else if (histIdx > 0) {
        recall(histIdx - 1)
      }
      return
    }

    if (e.key === 'ArrowDown' && histIdx !== null) {
      const lastNl = value.lastIndexOf('\n')
      const onLastLine = lastNl === -1 || ta.selectionEnd > lastNl
      if (!onLastLine) return
      e.preventDefault()
      recall(histIdx < history.length - 1 ? histIdx + 1 : null)
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-y-auto px-3.5 py-3">
      <PanelTitle>Действие</PanelTitle>

      <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
        {addressee ? (
          <>
            <span>
              Обращаешься к: <b className="text-accent">{addressee.character.name}</b>
            </span>
            <button
              type="button"
              onClick={onClearAddressee}
              aria-label="Сбросить адресата (режим действия)"
              title="Сбросить адресата (режим действия)"
              className="cursor-pointer rounded px-1 leading-none text-tag transition-colors hover:text-ink"
            >
              {'×'}
            </button>
          </>
        ) : (
          <span className="text-faint">Режим действия</span>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-input-bg px-2.5 py-2">
        <span className="select-none pt-px text-[13px] text-faint">{'>'}</span>
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setHistIdx(null)
          }}
          onKeyDown={onKeyDown}
          placeholder={
            addressee ? `Сказать (${addressee.character.name})...` : 'Что делаешь?'
          }
          className="max-h-[98px] w-full resize-none bg-transparent text-[13px] leading-snug text-ink outline-none placeholder:text-faint"
        />
      </div>

      <div className="mt-1 h-4">{busy && <LlmWaitIndicator />}</div>

      <SectionTag>Действия</SectionTag>
      <div className="flex flex-wrap gap-1.5">
        {state.actionChips.map((chip) => (
          <ChipButton
            key={chip.id}
            onClick={() => onChip(chip)}
            title={
              chip.kind === 'template'
                ? 'Подставить в поле ввода'
                : 'Выполнить сразу'
            }
          >
            {chip.label}
          </ChipButton>
        ))}
      </div>

      <SectionTag>Инвентарь</SectionTag>
      <div className="flex flex-wrap gap-1.5">
        {state.progression.inventory.map((item, i) => (
          <InfoChip key={`${item}-${i}`}>{item}</InfoChip>
        ))}
      </div>

      <SectionTag>Состояние</SectionTag>
      <div className="text-[12.5px] text-cond-ok">{state.conditionLabel}</div>
    </section>
  )
}
