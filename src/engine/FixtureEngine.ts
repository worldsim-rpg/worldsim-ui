/*
 * Deterministic fixture implementation of WorldEngine.
 *
 * Mirrors the orchestrator pipeline in miniature: free text -> Intent ->
 * world mutation -> fresh UI state. No LLM calls, no randomness; responses
 * come from src/fixture/world.ts. Fixture answers instantly (brainstorm
 * round 3: no simulated LLM latency until Phase 2).
 *
 * The whole mutable state is serializable (dump/restore) for the
 * localStorage autosave (brainstorm round 8). In Phase 2 persistence moves
 * server-side to the orchestrator.
 */

import type {
  Character,
  Intent,
  Location,
  PlayerProgression,
  WorldMeta,
} from '../types/canon'
import type {
  NoticedItem,
  SkillUp,
  TurnInput,
  TurnOutput,
  UiWorldState,
} from '../types/ui'
import { ATTRIBUTE_LABELS, CONDITION_LABELS } from '../types/ui'
import {
  DIFFICULTY_LABELS,
  FALLBACK_NARRATIVE,
  TIME_PARTS,
  baseChips,
  characters as fixtureCharacters,
  dialogues,
  growthRules,
  locationExtras,
  locations as fixtureLocations,
  meta as fixtureMeta,
  npcExtras,
  progression as fixtureProgression,
  reveals,
  settings as fixtureSettings,
  triggers,
  type FixtureAction,
  type FixtureLocationExtras,
} from '../fixture/world'
import type { WorldEngine } from './WorldEngine'

/** Word prefixes that signal a movement verb in free text. */
const MOVE_PREFIXES = [
  'ид', 'пойд', 'пойт', 'перейд', 'перейт', 'переход', 'перехож',
  'выход', 'выйд', 'выйт', 'войд', 'войт', 'зайд', 'зайт',
  'верн', 'сверн', 'двин', 'направ', 'шаг',
]

const LOOK_COMMANDS = ['осмотреться', 'осмотр', 'оглядеться', 'оглянуться']
const INVENTORY_COMMANDS = ['инвентарь', 'рюкзак']

const ATTRIBUTE_CAP = 5

interface ParsedTurn {
  intent: Intent
  npc?: Character
  exitTo?: string
  action?: FixtureAction
}

/** Serializable snapshot of everything the engine mutates. */
export interface FixtureSave {
  meta: WorldMeta
  characters: Character[]
  locations: Location[]
  progression: PlayerProgression
  noticed: Record<string, NoticedItem[]>
  usedActions: string[]
  fallbackIndex: Record<string, number>
  knownNpcs: string[]
  firedTriggers: string[]
}

export class FixtureEngine implements WorldEngine {
  private meta: WorldMeta
  private characters: Character[]
  private locations: Location[]
  private progression: PlayerProgression
  /** Remaining "Замечаешь" items per location id. */
  private noticed: Record<string, NoticedItem[]>
  /** Ids of one-time fixture actions already used (their chips go dim). */
  private usedActions: Set<string>
  /** Per-NPC rotation index for dialogue fallback lines. */
  private fallbackIndex: Record<string, number>
  /** NPCs the player knows (strangers are revealed in-game, round 4). */
  private knownNpcs: Set<string>
  /** Once-only initiative triggers that already fired (round 4). */
  private firedTriggers: Set<string>

  constructor(save?: FixtureSave) {
    if (save) {
      const s = structuredClone(save)
      this.meta = s.meta
      this.characters = s.characters
      this.locations = s.locations
      this.progression = s.progression
      this.noticed = s.noticed
      this.usedActions = new Set(s.usedActions)
      this.fallbackIndex = s.fallbackIndex
      this.knownNpcs = new Set(s.knownNpcs)
      this.firedTriggers = new Set(s.firedTriggers)
      return
    }
    // Deep-clone the fixture so "new game" is just `new FixtureEngine()`.
    this.meta = structuredClone(fixtureMeta)
    this.characters = structuredClone(fixtureCharacters)
    this.locations = structuredClone(fixtureLocations)
    this.progression = structuredClone(fixtureProgression)
    this.noticed = Object.fromEntries(
      Object.entries(locationExtras).map(([locId, ex]) => [
        locId,
        structuredClone(ex.noticed),
      ]),
    )
    this.usedActions = new Set()
    this.fallbackIndex = {}
    this.knownNpcs = new Set(
      Object.entries(npcExtras)
        .filter(([, ex]) => ex.known)
        .map(([id]) => id),
    )
    this.firedTriggers = new Set()
  }

  /** Snapshot for the localStorage autosave. */
  dump(): FixtureSave {
    return structuredClone({
      meta: this.meta,
      characters: this.characters,
      locations: this.locations,
      progression: this.progression,
      noticed: this.noticed,
      usedActions: [...this.usedActions],
      fallbackIndex: this.fallbackIndex,
      knownNpcs: [...this.knownNpcs],
      firedTriggers: [...this.firedTriggers],
    })
  }

  // --- WorldEngine ----------------------------------------------------------

  async start(): Promise<{ state: UiWorldState; narrative: string }> {
    return {
      state: this.buildState(),
      narrative: this.arrivalNarrative(this.currentLocation().id, null),
    }
  }

  async submitTurn(input: TurnInput): Promise<TurnOutput> {
    const text = input.text.trim()
    if (!text) return { kind: 'none', state: this.buildState() }

    const parsed = this.parse(input, text)
    switch (parsed.intent.intent) {
      case 'converse':
        return this.runConverse(parsed.npc!, text)
      case 'move':
        return this.runMove(parsed.exitTo!)
      case 'examine':
        return parsed.intent.method === 'check_inventory'
          ? this.narrate(this.inventoryText())
          : this.runLookAround()
      case 'custom':
        if (parsed.action) return this.runFixtureAction(parsed.action)
        return this.narrate(FALLBACK_NARRATIVE)
      default:
        return this.narrate(FALLBACK_NARRATIVE)
    }
  }

  // --- intent parsing (mirrors the orchestrator's intent step) ---------------

  private parse(input: TurnInput, text: string): ParsedTurn {
    const norm = text.toLowerCase()
    const words = norm.split(/[^a-zа-яё0-9]+/u).filter(Boolean)
    const base: Intent = {
      intent: 'custom',
      method: null,
      target: null,
      target_raw: null,
      tone: null,
      risk_level: 'low',
      raw_text: text,
    }

    // Dialogue: an addressee is selected and present in the current location.
    if (input.addresseeId) {
      const npc = this.npcsHere().find((c) => c.id === input.addresseeId)
      if (npc) {
        return {
          intent: { ...base, intent: 'converse', target: npc.id, target_raw: npc.name },
          npc,
        }
      }
    }

    // Base commands match the whole input (so "осмотреть следы" stays free).
    if (LOOK_COMMANDS.includes(norm)) {
      return { intent: { ...base, intent: 'examine', method: 'look_around' } }
    }
    if (INVENTORY_COMMANDS.includes(norm)) {
      return { intent: { ...base, intent: 'examine', method: 'check_inventory' } }
    }

    // Movement: exit chip command "идти: дорога" or verb/direction in free text.
    const exitTo = this.matchExit(norm, words)
    if (exitTo) {
      return { intent: { ...base, intent: 'move', target: exitTo, target_raw: text }, exitTo }
    }

    // Contextual fixture actions of the current location.
    const ex = this.extras()
    const action = ex.actions.find(
      (a) =>
        !(this.usedActions.has(a.id) && a.oneTime) &&
        a.match.some((m) => norm.includes(m)),
    )
    if (action) {
      return { intent: { ...base, intent: 'custom', method: action.id }, action }
    }

    return { intent: base }
  }

  private matchExit(norm: string, words: string[]): string | undefined {
    const exits = this.extras().exits

    if (norm.startsWith('идти:')) {
      const target = norm.slice('идти:'.length).trim()
      const exit = exits.find(
        (e) => e.targetName === target || e.keywords.some((k) => target.includes(k)),
      )
      return exit?.toLocationId
    }

    const hasMoveVerb = words.some((w) => MOVE_PREFIXES.some((p) => w.startsWith(p)))
    const exit = exits.find((e) => {
      const directionHit = words.some((w) => w.startsWith(e.direction))
      const keywordHit = e.keywords.some((k) => norm.includes(k))
      return directionHit || (hasMoveVerb && keywordHit)
    })
    return exit?.toLocationId
  }

  // --- turn execution ---------------------------------------------------------

  private runConverse(npc: Character, text: string): TurnOutput {
    const norm = text.toLowerCase()
    let reply: string

    // Stranger reveal (round 4): talking while carrying the matching item
    // uncovers the name; the gray tile colors up on the next render.
    const reveal = reveals.find(
      (r) =>
        r.npcId === npc.id &&
        !this.knownNpcs.has(npc.id) &&
        this.progression.inventory.some((i) =>
          i.toLowerCase().includes(r.requiresInventorySubstring),
        ),
    )
    if (reveal) {
      this.knownNpcs.add(npc.id)
      npc.name = reveal.newName
      npc.role = reveal.newRole
      reply = reveal.reply
    } else {
      const table = dialogues[npc.id]
      const keyed = table.keyed.find((k) => k.keywords.some((kw) => norm.includes(kw)))
      if (keyed) {
        reply = keyed.reply
      } else {
        const i = this.fallbackIndex[npc.id] ?? 0
        reply = table.fallbacks[i % table.fallbacks.length]
        this.fallbackIndex[npc.id] = i + 1
      }
    }

    const skillUps = this.bumpCounter('talked_to_npcs')
    return {
      kind: 'dialogue',
      playerEcho: text,
      npcReply: { speakerId: npc.id, text: reply },
      skillUps,
      state: this.buildState(),
    }
  }

  private runMove(toLocationId: string): TurnOutput {
    const from = this.currentLocation().id
    const dest = this.locations.find((l) => l.id === toLocationId)
    if (!dest) return this.narrate(FALLBACK_NARRATIVE)

    this.pc().location_id = dest.id
    this.meta.tick += 1
    dest.discovered = true
    let skillUps: SkillUp[] = []
    if (!dest.visited) {
      dest.visited = true
      skillUps = this.bumpCounter('explored_locations')
    }
    const initiative = this.fireTriggers(
      (t) => t.on.type === 'enter' && t.on.locationId === dest.id,
    )
    return {
      kind: 'move',
      movedToLocationId: dest.id,
      narrative: this.arrivalNarrative(dest.id, from),
      initiative,
      skillUps,
      state: this.buildState(),
    }
  }

  private runLookAround(): TurnOutput {
    const skillUps = this.bumpCounter('looked_around')
    return { ...this.narrate(this.extras().lookText), skillUps }
  }

  private runFixtureAction(action: FixtureAction): TurnOutput {
    if (action.oneTime) this.usedActions.add(action.id)
    const itemsGained: string[] = []
    if (action.addToInventory) {
      this.progression.inventory.push(action.addToInventory)
      itemsGained.push(action.addToInventory)
    }
    if (action.addFact && !this.progression.known_facts.includes(action.addFact)) {
      this.progression.known_facts.push(action.addFact)
    }
    if (action.removeNoticedLabel) {
      const locId = this.currentLocation().id
      this.noticed[locId] = this.noticed[locId].filter(
        (n) => n.label !== action.removeNoticedLabel,
      )
    }
    const initiative = this.fireTriggers(
      (t) => t.on.type === 'action' && t.on.actionId === action.id,
    )
    return {
      ...this.narrate(action.narrative),
      check: action.check,
      initiative,
      itemsGained,
    }
  }

  private narrate(narrative: string): TurnOutput {
    return { kind: 'narrative', narrative, state: this.buildState() }
  }

  /** Fire matching once-only triggers whose speaker is in the player's location. */
  private fireTriggers(
    matches: (t: (typeof triggers)[number]) => boolean,
  ): Array<{ speakerId: string; text: string }> {
    const here = new Set(this.npcsHere().map((c) => c.id))
    const fired: Array<{ speakerId: string; text: string }> = []
    for (const t of triggers) {
      if (this.firedTriggers.has(t.id) || !matches(t) || !here.has(t.npcId)) continue
      this.firedTriggers.add(t.id)
      fired.push({ speakerId: t.npcId, text: t.text })
    }
    return fired
  }

  /** Increment a skill counter and apply growth rules (round 6). */
  private bumpCounter(key: string): SkillUp[] {
    const next = (this.progression.skill_counters[key] ?? 0) + 1
    this.progression.skill_counters[key] = next
    const ups: SkillUp[] = []
    for (const rule of growthRules) {
      if (rule.counter !== key || next % rule.every !== 0) continue
      const current = this.progression.attributes[rule.attribute]
      if (current >= ATTRIBUTE_CAP) continue
      this.progression.attributes[rule.attribute] = current + 1
      ups.push({
        attribute: rule.attribute,
        label: ATTRIBUTE_LABELS[rule.attribute],
        from: current,
        to: current + 1,
      })
    }
    return ups
  }

  // --- state assembly -----------------------------------------------------------

  private buildState(): UiWorldState {
    const loc = this.currentLocation()
    const ex = this.extras()
    const day = Math.floor(this.meta.tick / TIME_PARTS.length) + 1
    return {
      title: this.meta.title,
      dayLabel: `День ${day}`,
      timeLabel: TIME_PARTS[this.meta.tick % TIME_PARTS.length],
      difficultyLabel: `сложность: ${DIFFICULTY_LABELS[fixtureSettings.difficulty]}`,
      languageLabel: `язык: ${fixtureSettings.language === 'ru' ? 'рус' : 'eng'}`,
      location: structuredClone(loc),
      locationGlyph: ex.glyph,
      npcs: this.npcsHere().map((c) => ({
        character: structuredClone(c),
        glyph: npcExtras[c.id].glyph,
        known: this.knownNpcs.has(c.id),
      })),
      noticed: [...this.noticed[loc.id]],
      exits: ex.exits.map(({ toLocationId, direction, targetName }) => ({
        toLocationId,
        direction,
        targetName,
      })),
      // Used one-time chips stay visible but dimmed (previz: disabled-dim).
      actionChips: [...baseChips, ...ex.chips].map((chip) => ({
        ...chip,
        available: !this.usedActions.has(chip.id),
      })),
      progression: structuredClone(this.progression),
      conditionLabel: CONDITION_LABELS[this.progression.condition],
    }
  }

  private arrivalNarrative(locId: string, fromId: string | null): string {
    const ex = locationExtras[locId]
    const link = (fromId && ex.arrivalLinks[fromId]) || ex.arrivalLinks['*']
    const loc = this.locations.find((l) => l.id === locId)!
    return link + (loc.full_description ?? loc.short_description)
  }

  private inventoryText(): string {
    return `Ты перетряхиваешь пожитки: ${this.progression.inventory.join(', ')}.`
  }

  // --- helpers ---------------------------------------------------------------------

  private pc(): Character {
    return this.characters.find((c) => c.is_player)!
  }

  private currentLocation(): Location {
    const id = this.pc().location_id
    return this.locations.find((l) => l.id === id)!
  }

  private extras(): FixtureLocationExtras {
    return locationExtras[this.currentLocation().id]
  }

  private npcsHere(): Character[] {
    const locId = this.pc().location_id
    return this.characters.filter(
      (c) => !c.is_player && c.alive && c.location_id === locId,
    )
  }
}
