import { useEffect, useRef, useState } from 'react'

/**
 * Typewriter effect over `text`. Restarts when `text` changes; any change of
 * `skipSignal` reveals the whole text at once (skip is wired to a click on
 * the narrative and to Enter in the empty input field).
 */
export function useTypewriter(
  text: string,
  cps: number,
  skipSignal: number,
): { visible: string; done: boolean } {
  const [count, setCount] = useState(0)
  const lastSkip = useRef(skipSignal)

  useEffect(() => {
    setCount(0)
  }, [text])

  const done = count >= text.length

  useEffect(() => {
    if (done) return
    const interval = window.setInterval(
      () => setCount((c) => Math.min(c + 1, text.length)),
      Math.max(1000 / cps, 8),
    )
    return () => window.clearInterval(interval)
  }, [text, done, cps])

  useEffect(() => {
    if (skipSignal !== lastSkip.current) {
      lastSkip.current = skipSignal
      setCount(text.length)
    }
  }, [skipSignal, text.length])

  return { visible: text.slice(0, count), done }
}
