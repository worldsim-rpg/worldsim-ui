/*
 * Wire protocol between ClaudeEngine (browser) and the spike server
 * (server/src/index.ts). Types only — imported by both sides.
 *
 * The response of POST /api/turn is a chunked text/plain stream of raw
 * text deltas; the accumulated body is the final narrative / NPC line.
 */

export type TurnMode = 'narrative' | 'dialogue'

export interface TurnRequestNpc {
  id: string
  name: string
  role: string | null
  /** False for strangers: the player does not know the name yet. */
  known: boolean
}

export interface TurnRequestContext {
  locationName: string
  locationDescription: string
  dayLabel: string
  timeLabel: string
  npcsHere: TurnRequestNpc[]
  inventory: string[]
  knownFacts: string[]
}

export interface TurnRequest {
  /** Client-generated id; the server keeps message history per session. */
  sessionId: string
  mode: TurnMode
  playerText: string
  /** Addressee — required for mode === 'dialogue'. */
  npc?: TurnRequestNpc
  /**
   * The fixture's canned reply for this turn, passed to the model as the
   * factual canvas: the live line must not contradict it.
   */
  scriptedReply?: string
  context: TurnRequestContext
}
