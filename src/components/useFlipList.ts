import { useLayoutEffect, useRef } from 'react'

/**
 * FLIP animation for list reorders (round 5: NPC rows shift smoothly,
 * ~200 ms). Rows must carry data-flip-id. When the order signature changes,
 * each moved row plays an inverted translateY transition via the Web
 * Animations API.
 */
export function useFlipList<T extends HTMLElement>(orderSignature: string, durationMs = 200) {
  const containerRef = useRef<T>(null)
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'))
    const next = new Map<string, number>()
    for (const row of rows) next.set(row.dataset.flipId!, row.offsetTop)
    for (const row of rows) {
      const id = row.dataset.flipId!
      const prev = positions.current.get(id)
      const now = next.get(id)!
      if (prev !== undefined && prev !== now) {
        row.animate(
          [{ transform: `translateY(${prev - now}px)` }, { transform: 'translateY(0)' }],
          { duration: durationMs, easing: 'ease' },
        )
      }
    }
    positions.current = next
  }, [orderSignature, durationMs])

  return containerRef
}
