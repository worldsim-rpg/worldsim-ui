/**
 * Placeholder for the "LLM is thinking" indicator.
 *
 * TODO(previz-v2): the visual design of the wait state is being decided in
 * previz right now; do not invent it here. In Phase 1 the fixture answers
 * instantly (brainstorm round 3), so this component practically never shows.
 * Phase 2 keeps it mounted behind the same `busy` flag and it becomes real.
 */
export function LlmWaitIndicator() {
  return (
    <div className="text-[10px] uppercase tracking-[1px] text-faint">
      мир отвечает...
    </div>
  )
}
