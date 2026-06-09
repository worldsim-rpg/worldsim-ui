/*
 * Deterministic fixture implementation of WorldEngine.
 *
 * Mirrors the orchestrator pipeline in miniature: free text -> Intent ->
 * world mutation -> fresh UI state. No LLM calls, no randomness; responses
 * come from src/fixture/world.ts. Fixture answers instantly (brainstorm
 * round 3: no simulated LLM latency until Phase 2).
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
  TurnInput,
  TurnOutput,
  UiWorldState,
} from '../types/ui'
import { CONDITION_LABELS } from '../types/ui'
import {
  DIFFICULTY_LABELS,
  FALLBACK_NARRATIVE,
  TIME_PARTS,
  baseChips,
  characters as fixtureCharacters,
  dialogues,
  locationExtras,
  locations as fixtureLocations,
  meta as fixtureMeta,
  npcExtras,
  progression as fixtureProgression,
  settings as fixtureSettings,
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

interface ParsedTurn {
  intent: Intent
  npc?: Character
  exitTo?: string
  action?: FixtureAction
}

export class FixtureEngine implements WorldEngine {
  private meta: WorldMeta
  private characters: Character[]
  private locations: Location[]
  private progression: PlayerProgression
  /** Remaining "Замечаешь" items per location id. */
  private noticed: Record<string, NoticedItem[]>
  /** Ids of one-time fixture actions already used. */
  private usedActions = new Set<string>()
  /** Per-NPC rotation index for dialogue fallback lines. */
  private fallbackIndex: Record<string, number> = {}

  constructor() {
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
    const table = dialogues[npc.id]
    const keyed = table.keyed.find((k) => k.keywords.some((kw) => norm.includes(kw)))
    let reply: string
    if (keyed) {
      reply = keyed.reply
    } else {
      const i = this.fallbackIndex[npc.id] ?? 0
      reply = table.fallbacks[i % table.fallbacks.length]
      this.fallbackIndex[npc.id] = i + 1
    }
    this.bumpCounter('talked_to_npcs')
    return {
      kind: 'dialogue',
      playerEcho: text,
      npcReply: { speakerId: npc.id, text: reply },
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
    if (!dest.visited) {
      dest.visited = true
      this.bumpCounter('explored_locations')
    }
    return {
      kind: 'move',
      movedToLocationId: dest.id,
      narrative: this.arrivalNarrative(dest.id, from),
      state: this.buildState(),
    }
  }

  private runLookAround(): TurnOutput {
    this.bumpCounter('looked_around')
    return this.narrate(this.extras().lookText)
  }

  private runFixtureAction(action: FixtureAction): TurnOutput {
    if (action.oneTime) this.usedActions.add(action.id)
    if (action.addToInventory) this.progression.inventory.push(action.addToInventory)
    if (action.addFact && !this.progression.known_facts.includes(action.addFact)) {
      this.progression.known_facts.push(action.addFact)
    }
    if (action.removeNoticedLabel) {
      const locId = this.currentLocation().id
      this.noticed[locId] = this.noticed[locId].filter(
        (n) => n.label !== action.removeNoticedLabel,
      )
    }
    return this.narrate(action.narrative)
  }

  private narrate(narrative: string): TurnOutput {
    return { kind: 'narrative', narrative, state: this.buildState() }
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
        known: npcExtras[c.id].known,
      })),
      noticed: [...this.noticed[loc.id]],
      exits: ex.exits.map(({ toLocationId, direction, targetName }) => ({
        toLocationId,
        direction,
        targetName,
      })),
      // Unavailable actions are simply omitted from the list.
      // TODO(previz-v2): visual treatment for unavailable actions is being
      // decided in previz; when it lands, emit them with a disabled flag.
      actionChips: [
        ...baseChips,
        ...ex.chips.filter((ch) => !this.usedActions.has(ch.id)),
      ],
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

  private bumpCounter(key: string): void {
    this.progression.skill_counters[key] = (this.progression.skill_counters[key] ?? 0) + 1
  }
}
