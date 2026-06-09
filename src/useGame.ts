import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCATION_SLIDE_MS, TOAST_MS } from './config'
import type { WorldEngine } from './engine/WorldEngine'
import type {
  ActionChip,
  DialogueEntry,
  ExitChip,
  JournalEntry,
  NarrativeBlock,
  UiNpc,
  UiWorldState,
} from './types/ui'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
/** Resolves after the browser painted the current commit (for slide-in). */
const afterPaint = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

/** Location-change slide phases (previz: out left, in from the right). */
export type SlidePhase = 'idle' | 'out' | 'enter'

export interface Toast {
  id: number
  text: string
}

/** UI part of the autosave blob (engine state is saved separately). */
export interface UiSave {
  journal: JournalEntry[]
  log: DialogueEntry[]
  narrativeBlocks: NarrativeBlock[]
  addresseeId: string | null
  recency: Record<string, number>
  counters: { entry: number; block: number; journal: number; recency: number }
}

export interface GameApi {
  state: UiWorldState | null
  /** NPCs of the current location ordered by talk recency (round 5). */
  orderedNpcs: UiNpc[]
  log: DialogueEntry[]
  /** Narrative scrollback of the current location, oldest first (round 5). */
  narrativeBlocks: NarrativeBlock[]
  journal: JournalEntry[]
  toasts: Toast[]
  addresseeId: string | null
  busy: boolean
  slidePhase: SlidePhase
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

export function useGame(
  engine: WorldEngine,
  restored: UiSave | null,
  persist: (ui: UiSave) => void,
): GameApi {
  const [state, setState] = useState<UiWorldState | null>(null)
  const [log, setLog] = useState<DialogueEntry[]>(restored?.log ?? [])
  const [narrativeBlocks, setNarrativeBlocks] = useState<NarrativeBlock[]>(
    restored?.narrativeBlocks ?? [],
  )
  const [journal, setJournal] = useState<JournalEntry[]>(restored?.journal ?? [])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [addresseeId, setAddresseeId] = useState<string | null>(
    restored?.addresseeId ?? null,
  )
  const [recency, setRecency] = useState<Record<string, number>>(
    restored?.recency ?? {},
  )
  const [busy, setBusy] = useState(false)
  const [slidePhase, setSlidePhase] = useState<SlidePhase>('idle')
  const [skipSignal, setSkipSignal] = useState(0)
  const [injected, setInjected] = useState({ text: '', n: 0 })
  const [turn, setTurn] = useState(0)

  const entryId = useRef(restored?.counters.entry ?? 1)
  const blockId = useRef(restored?.counters.block ?? 1)
  const journalId = useRef(restored?.counters.journal ?? 1)
  const recencyCounter = useRef(restored?.counters.recency ?? 1)
  const toastId = useRef(1)

  useEffect(() => {
    let cancelled = false
    engine.start().then(({ state: s, narrative }) => {
      if (cancelled) return
      setState(s)
      if (!restored) {
        setNarrativeBlocks([{ id: blockId.current++, text: narrative }])
        setJournal([{ id: journalId.current++, t: 'narrative', text: narrative }])
      }
    })
    return () => {
      cancelled = true
    }
    // `restored` is fixed for the lifetime of one game mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  // Autosave after every turn (round 8). The effect reads post-turn state.
  useEffect(() => {
    if (turn === 0) return
    persist({
      journal,
      log,
      narrativeBlocks,
      addresseeId,
      recency,
      counters: {
        entry: entryId.current,
        block: blockId.current,
        journal: journalId.current,
        recency: recencyCounter.current,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn])

  const bumpRecency = useCallback((npcId: string) => {
    setRecency((r) => ({ ...r, [npcId]: recencyCounter.current++ }))
  }, [])

  const showToasts = useCallback((texts: string[]) => {
    if (texts.length === 0) return
    const items = texts.map((text) => ({ id: toastId.current++, text }))
    setToasts((t) => [...t, ...items])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => !items.some((i) => i.id === x.id)))
    }, TOAST_MS)
  }, [])

  const run = useCallback(
    async (text: string, addressee: string | null) => {
      const trimmed = text.trim()
      if (!trimmed || busy || slidePhase !== 'idle') return
      setBusy(true)
      try {
        const out = await engine.submitTurn({ text: trimmed, addresseeId: addressee })
        const nameOf = (id: string) =>
          out.state.npcs.find((n) => n.character.id === id)?.character.name ?? '???'

        const newLogEntries: DialogueEntry[] = []
        const newJournal: JournalEntry[] = []

        const pushDialogue = (speakerId: string, text2: string) => {
          newLogEntries.push({
            id: entryId.current++,
            kind: 'npc',
            speakerId,
            text: text2,
          })
          newJournal.push({
            id: journalId.current++,
            t: 'dialogue',
            side: 'npc',
            speakerName: nameOf(speakerId),
            text: text2,
          })
          bumpRecency(speakerId)
        }

        switch (out.kind) {
          case 'dialogue': {
            if (out.playerEcho) {
              newLogEntries.push({
                id: entryId.current++,
                kind: 'player',
                text: out.playerEcho,
              })
              newJournal.push({
                id: journalId.current++,
                t: 'dialogue',
                side: 'player',
                speakerName: 'Ты',
                text: out.playerEcho,
              })
            }
            if (out.npcReply) pushDialogue(out.npcReply.speakerId, out.npcReply.text)
            setState(out.state)
            setLog((l) => [...l, ...newLogEntries])
            break
          }
          case 'move': {
            // Slide out, swap the scene, slide in from the right (previz).
            setSlidePhase('out')
            await sleep(LOCATION_SLIDE_MS / 2)

            const marker = `Вы перешли в: ${out.state.location.name}`
            newJournal.push({ id: journalId.current++, t: 'transition', text: marker })
            const arrival = out.narrative ?? ''
            newJournal.push({ id: journalId.current++, t: 'narrative', text: arrival })
            const moveLog: DialogueEntry[] = [
              { id: entryId.current++, kind: 'system', text: marker },
            ]
            for (const line of out.initiative ?? []) {
              moveLog.push({
                id: entryId.current++,
                kind: 'npc',
                speakerId: line.speakerId,
                text: line.text,
              })
              newJournal.push({
                id: journalId.current++,
                t: 'dialogue',
                side: 'npc',
                speakerName: nameOf(line.speakerId),
                text: line.text,
              })
              bumpRecency(line.speakerId)
            }

            setState(out.state)
            // Scrollback resets on transition (round 5).
            setNarrativeBlocks([{ id: blockId.current++, text: arrival }])
            setLog(moveLog)
            setAddresseeId(null)
            setSlidePhase('enter')
            await afterPaint()
            setSlidePhase('idle')
            break
          }
          case 'narrative': {
            setState(out.state)
            if (out.narrative) {
              setNarrativeBlocks((b) => [
                ...b,
                { id: blockId.current++, text: out.narrative!, check: out.check },
              ])
              newJournal.push({
                id: journalId.current++,
                t: 'narrative',
                text: out.narrative,
                check: out.check,
              })
            }
            for (const line of out.initiative ?? []) pushDialogue(line.speakerId, line.text)
            if (newLogEntries.length > 0) setLog((l) => [...l, ...newLogEntries])
            break
          }
          case 'none':
            break
        }

        for (const item of out.itemsGained ?? []) {
          newJournal.push({
            id: journalId.current++,
            t: 'item',
            text: `Получено: ${item}`,
          })
        }
        for (const up of out.skillUps ?? []) {
          newJournal.push({
            id: journalId.current++,
            t: 'skill',
            text: `${up.label}: ${up.from} → ${up.to}`,
          })
        }
        showToasts((out.skillUps ?? []).map((u) => `Навык растёт: ${u.label} ${u.to}`))

        if (newJournal.length > 0) setJournal((j) => [...j, ...newJournal])
        setTurn((t) => t + 1)
      } finally {
        setBusy(false)
      }
    },
    [engine, busy, slidePhase, bumpRecency, showToasts],
  )

  const submit = useCallback(
    (text: string) => {
      void run(text, addresseeId)
    },
    [run, addresseeId],
  )

  const runChip = useCallback(
    (chip: ActionChip) => {
      if (!chip.available) return
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

  const selectNpc = useCallback(
    (id: string) => {
      setAddresseeId(id)
      // Selection floats the NPC to the top and it stays there after reset
      // (rounds 4-5: order by recency of interaction).
      bumpRecency(id)
    },
    [bumpRecency],
  )

  const orderedNpcs = state
    ? [...state.npcs].sort((a, b) => {
        const ra = recency[a.character.id] ?? 0
        const rb = recency[b.character.id] ?? 0
        return rb - ra
      })
    : []

  return {
    state,
    orderedNpcs,
    log,
    narrativeBlocks,
    journal,
    toasts,
    addresseeId,
    busy,
    slidePhase,
    skipSignal,
    injected,
    selectNpc,
    clearAddressee: useCallback(() => setAddresseeId(null), []),
    submit,
    runChip,
    goExit,
    bumpSkip: useCallback(() => setSkipSignal((s) => s + 1), []),
  }
}
