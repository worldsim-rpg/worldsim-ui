/*
 * Spike WorldEngine backed by Claude through the local server (server/).
 *
 * Deliberately narrow scope: the engine wraps a FixtureEngine, so all
 * mechanics (intent parsing, moves, items, checks, triggers, progression)
 * stay deterministic. Only two kinds of text go live:
 *  - NPC replies: the fixture's canned line is sent along as the factual
 *    canvas and the model rewrites it in character;
 *  - narrative for free text the fixture did not understand (its fallback).
 * On any server/network error the fixture text stands, so the UI works
 * exactly as before without a key or server.
 */

import type { TurnInput, TurnOutput, UiWorldState } from '../types/ui'
import { FALLBACK_NARRATIVE } from '../fixture/world'
import type { TurnRequest, TurnRequestNpc } from './claudeProtocol'
import { FixtureEngine, type FixtureSave } from './FixtureEngine'
import type { WorldEngine } from './WorldEngine'

/** Live-text listener: accumulated text so far for the current turn. */
export type StreamListener = (text: string) => void

/** Engines that stream narrative deltas expose this (used by useGame). */
export interface StreamingEngine {
  onNarrativeStream(listener: StreamListener | null): void
}

export function isStreamingEngine(e: unknown): e is StreamingEngine {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as StreamingEngine).onNarrativeStream === 'function'
  )
}

export class ClaudeEngine implements WorldEngine, StreamingEngine {
  private inner: FixtureEngine
  private sessionId: string
  private listener: StreamListener | null = null

  constructor(save?: FixtureSave) {
    this.inner = new FixtureEngine(save)
    this.sessionId = crypto.randomUUID()
  }

  /** Same snapshot shape as the fixture: the autosave works unchanged. */
  dump(): FixtureSave {
    return this.inner.dump()
  }

  onNarrativeStream(listener: StreamListener | null): void {
    this.listener = listener
  }

  async start(): Promise<{ state: UiWorldState; narrative: string }> {
    return this.inner.start()
  }

  async submitTurn(input: TurnInput): Promise<TurnOutput> {
    const out = await this.inner.submitTurn(input)
    try {
      if (out.kind === 'dialogue' && out.npcReply) {
        const npc = this.findNpc(out.state, out.npcReply.speakerId)
        const live = await this.requestTurn({
          mode: 'dialogue',
          playerText: input.text,
          npc,
          scriptedReply: out.npcReply.text,
          context: this.buildContext(out.state),
        })
        if (live) out.npcReply = { ...out.npcReply, text: live }
      } else if (out.kind === 'narrative' && out.narrative === FALLBACK_NARRATIVE) {
        const live = await this.requestTurn(
          {
            mode: 'narrative',
            playerText: input.text,
            context: this.buildContext(out.state),
          },
          /* streamToListener */ true,
        )
        if (live) out.narrative = live
      }
    } catch (err) {
      // Spike: the fixture output stands; the player just sees canned text.
      console.warn('[ClaudeEngine] live turn failed, fixture text used:', err)
    }
    return out
  }

  private async requestTurn(
    payload: Omit<TurnRequest, 'sessionId'>,
    streamToListener = false,
  ): Promise<string> {
    const res = await fetch('/api/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, ...payload }),
    })
    if (!res.ok || !res.body) throw new Error(`server responded ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let acc = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      acc += decoder.decode(value, { stream: true })
      if (streamToListener && acc.trim()) this.listener?.(acc)
    }
    acc += decoder.decode()
    return acc.trim()
  }

  private buildContext(state: UiWorldState): TurnRequest['context'] {
    return {
      locationName: state.location.name,
      locationDescription:
        state.location.full_description ?? state.location.short_description,
      dayLabel: state.dayLabel,
      timeLabel: state.timeLabel,
      npcsHere: state.npcs.map((n) => this.toRequestNpc(n.character.id, state)),
      inventory: state.progression.inventory,
      knownFacts: state.progression.known_facts,
    }
  }

  private findNpc(state: UiWorldState, id: string): TurnRequestNpc {
    return this.toRequestNpc(id, state)
  }

  private toRequestNpc(id: string, state: UiWorldState): TurnRequestNpc {
    const npc = state.npcs.find((n) => n.character.id === id)
    return {
      id,
      name: npc?.character.name ?? '???',
      role: npc?.character.role ?? null,
      known: npc?.known ?? true,
    }
  }
}
