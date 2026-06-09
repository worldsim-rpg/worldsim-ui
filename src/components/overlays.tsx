/* Modal overlays: journal (rounds 5-6) and settings (rounds 7-8). */

import { useEffect, useState, type ReactNode } from 'react'
import type { JournalEntry, UiWorldState } from '../types/ui'

function Overlay({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[80vh] w-[92%] flex-col rounded-xl border border-line bg-panel shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-faint px-4 py-2.5">
          <span className="text-[12px] font-bold uppercase tracking-[1.2px] text-accent">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="cursor-pointer rounded px-1.5 text-[15px] leading-none text-tag transition-colors hover:text-ink"
          >
            {'×'}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Colored mark + tiny glyph per event type (round 6). */
function JournalMarker({ t }: { t: 'transition' | 'item' | 'skill' }) {
  const color =
    t === 'transition'
      ? 'var(--color-accent)'
      : t === 'item'
        ? 'var(--color-item)'
        : 'var(--color-skill)'
  return (
    <svg viewBox="0 0 12 12" className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true">
      {t === 'transition' && (
        <path
          d="M2 6h7M6.5 3 9.5 6l-3 3"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {t === 'item' && <path d="M6 1.2 10.8 6 6 10.8 1.2 6z" fill={color} />}
      {t === 'skill' && (
        <path
          d="M2.5 8.5 6 4l3.5 4.5M6 4v6.8"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export function JournalOverlay({
  journal,
  onClose,
}: {
  journal: JournalEntry[]
  onClose: () => void
}) {
  return (
    <Overlay title="Журнал" onClose={onClose} wide>
      <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3">
        {journal.length === 0 && (
          <p className="text-[12px] text-faint">Пока пусто.</p>
        )}
        {journal.map((e) => {
          switch (e.t) {
            case 'narrative':
              return (
                <div key={e.id} className="text-[12.5px] leading-relaxed text-ink-soft">
                  {e.check && (
                    <span
                      className={`mr-1.5 text-[10.5px] uppercase tracking-[0.5px] ${
                        e.check.success ? 'text-cond-ok' : 'text-risk'
                      }`}
                    >
                      [{e.check.skill}: {e.check.success ? 'успех' : 'провал'}]
                    </span>
                  )}
                  {e.text}
                </div>
              )
            case 'dialogue':
              return (
                <div key={e.id} className="text-[12.5px] leading-snug">
                  <span
                    className={e.side === 'npc' ? 'text-accent' : 'text-you-msg-ink'}
                  >
                    {e.speakerName}:
                  </span>{' '}
                  <span className="text-npc-msg-ink">{e.text}</span>
                </div>
              )
            default:
              return (
                <div key={e.id} className="flex items-start gap-2">
                  <JournalMarker t={e.t} />
                  <span className="text-[11.5px] uppercase tracking-[0.5px] text-muted">
                    {e.text}
                  </span>
                </div>
              )
          }
        })}
      </div>
    </Overlay>
  )
}

export function SettingsOverlay({
  state,
  onRestart,
  onClose,
}: {
  state: UiWorldState
  onRestart: () => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <Overlay title="Настройки" onClose={onClose}>
      <div className="flex flex-col gap-2 px-4 py-3 text-[12.5px]">
        <div className="flex justify-between">
          <span className="text-muted">Мир</span>
          <span>{state.title}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Сложность</span>
          <span>{state.difficultyLabel.replace('сложность: ', '')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Язык</span>
          <span>{state.languageLabel.replace('язык: ', '')}</span>
        </div>

        <div className="my-1 h-px bg-line-faint" />

        {/* Restart wipes the autosave (round 8). */}
        <button
          type="button"
          onClick={() => {
            if (confirming) {
              onRestart()
            } else {
              setConfirming(true)
            }
          }}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
            confirming
              ? 'border-risk bg-risk/15 text-ink'
              : 'border-risk/60 text-risk hover:border-risk hover:text-ink'
          }`}
        >
          {confirming ? 'Точно начать заново? Сейв будет удалён' : 'Начать заново'}
        </button>
      </div>
    </Overlay>
  )
}
