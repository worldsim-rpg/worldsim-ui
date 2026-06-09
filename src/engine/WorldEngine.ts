import type { TurnInput, TurnOutput, UiWorldState } from '../types/ui'

/**
 * The single boundary between the UI and the game world.
 *
 * Phase 1: FixtureEngine — deterministic, fully local, no LLM calls.
 * Phase 2: an HTTP implementation backed by the worldsim-orchestrator API
 * plugs in here without changes to the panels (both methods are async for
 * exactly that reason).
 *
 * TODO(phase-2): add HttpEngine implementing this interface over the
 * orchestrator HTTP API (separate spec).
 */
export interface WorldEngine {
  /** Snapshot of the current UI-facing world state. */
  getState(): Promise<UiWorldState>
  /** Execute one player turn: free text plus optional addressee. */
  submitTurn(input: TurnInput): Promise<TurnOutput>
}
