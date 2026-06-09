import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCATION_FADE_MS } from './config'
import type { WorldEngine } from './engine/WorldEngine'
import type { ActionChip, DialogueEntry, ExitChip, UiWorldState } from './types/ui'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface GameApi {
  state: UiWorldState | null
  log: DialogueEntry[]
  narrative: string
  addresseeId: string | null
  busy: boolean
  /** True while panels are faded out during a location change. */
  fading: boolean
  /** Increment -> the typewriter reveals the rest of the narrative. */
  skipSignal: number
  /** Text injected into the input field by template chips. */
  injected: { text: string; n: number }
  selectNpc: (id: string) => void
  clearAddressee: () => void
  submit: (text: string) => void
  runChip: (chip: ActionChip) => void
  goExit: (exit: ExitChip) => void
  bumpSkip: () => void
}

export function useGame(engine: WorldEngine): GameApi {
  const [state, setState] = useState<UiWorldState | null>(null)
  const [log, setLog] = useState<DialogueEntry[]>([])
  const [narrative, setNarrative] = useState('')
  const [addresseeId, setAddresseeId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fading, setFading] = useState(false)
  const [skipSignal, setSkipSignal] = useState(0)
  const [injected, setInjected] = useState({ text: '', n: 0 })
  const entryId = useRef(1)

  useEffect(() => {
    let cancelled = false
    engine.start().then(({ state: s, narrative: n }) => {
      if (cancelled) return
      setState(s)
      setNarrative(n)
    })
    return () => {
      cancelled = true
    }
  }, [engine])

  const pushEntries = useCallback((entries: Array<Omit<DialogueEntry, 'id'>>) => {
    setLog((l) => [...l, ...entries.map((e) => ({ ...e, id: entryId.current++ }))])
  }, [])

  const run = useCallback(
    async (text: string, addressee: string | null) => {
      const trimmed = text.trim()
      if (!trimmed || busy || fading) return
      setBusy(true)
      try {
        const out = await engine.submitTurn({ text: trimmed, addresseeId: addressee })
        switch (out.kind) {
          case 'dialogue': {
            const entries: Array<Omit<DialogueEntry, 'id'>> = []
            if (out.playerEcho) entries.push({ kind: 'player', text: out.playerEcho })
            if (out.npcReply) {
              entries.push({
                kind: 'npc',
                speakerId: out.npcReply.speakerId,
                text: out.npcReply.text,
              })
            }
            pushEntries(entries)
            setState(out.state)
            break
          }
          case 'move': {
            // Brainstorm round 3: short cross-fade, log cleared with a marker,
            // addressee reset (the NPC list is new).
            setFading(true)
            await sleep(LOCATION_FADE_MS / 2)
            setState(out.state)
            setNarrative(out.narrative ?? '')
            setLog([
              {
                id: entryId.current++,
                kind: 'system',
                text: `Вы перешли в: ${out.state.location.name}`,
              },
            ])
            setAddresseeId(null)
            setFading(false)
            break
          }
          case 'narrative':
            setState(out.state)
            if (out.narrative) setNarrative(out.narrative)
            break
          case 'none':
            break
        }
      } finally {
        setBusy(false)
      }
    },
    [engine, busy, fading, pushEntries],
  )

  const submit = useCallback(
    (text: string) => {
      void run(text, addresseeId)
    },
    [run, addresseeId],
  )

  const runChip = useCallback(
    (chip: ActionChip) => {
      if (chip.kind === 'atomic') {
        // Atomic chips are always world actions, never dialogue lines.
        void run(chip.command, null)
      } else {
        setInjected((i) => ({ text: chip.command, n: i.n + 1 }))
      }
    },
    [run],
  )

  const goExit = useCallback(
    (exit: ExitChip) => {
      void run(`идти: ${exit.targetName}`, null)
    },
    [run],
  )

  return {
    state,
    log,
    narrative,
    addresseeId,
    busy,
    fading,
    skipSignal,
    injected,
    selectNpc: useCallback((id: string) => setAddresseeId(id), []),
    clearAddressee: useCallback(() => setAddresseeId(null), []),
    submit,
    runChip,
    goExit,
    bumpSkip: useCallback(() => setSkipSignal((s) => s + 1), []),
  }
}
