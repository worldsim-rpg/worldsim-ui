/**
 * "World is thinking" wait line (previz microdecision: wait-line).
 *
 * Rendered under the narrative while the engine is busy. The fixture answers
 * instantly (brainstorm round 3: no artificial latency), so in Phase 1 this
 * practically never shows; Phase 2 keeps it mounted behind the same `busy`
 * flag and real HTTP latency makes it visible.
 */
export function LlmWaitIndicator() {
  return (
    <div className="mt-1.5 text-[11.5px] text-faint">
      Мир думает{' '}
      <span style={{ animation: 'ws-blink 1s step-end infinite' }}>_</span>
    </div>
  )
}
