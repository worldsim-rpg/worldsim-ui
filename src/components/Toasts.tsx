import type { Toast } from '../useGame'

/** Corner toasts for skill growth (round 6): visible a couple of seconds. */
export function Toasts({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-12 right-4 z-50 flex flex-col gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-skill/70 bg-panel px-3 py-1.5 text-[12px] text-ink shadow-lg"
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
