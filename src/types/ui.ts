/*
 * UI-facing types: what the panels render and what the engine exchanges
 * with the UI. These are NOT canon mirrors — they are the view contract.
 */

import type { Attributes, Character, Condition, Location, PlayerProgression } from './canon'

/** Keys of role/place glyphs available in components/glyphs.tsx. */
export type GlyphKey =
  | 'mug'
  | 'anchor'
  | 'hood'
  | 'house'
  | 'wheel'
  | 'fish'
  | 'salt'
  | 'road'

/** NPC annotated for rendering: glyph plus epistemic "does the player know them". */
export interface UiNpc {
  character: Character
  glyph: GlyphKey
  /**
   * False for strangers: gray tile, role caption instead of the name, no
   * relation meter (brainstorm round 4). Flips to true once the fixture
   * reveals them.
   */
  known: boolean
}

/**
 * Action chips come in two kinds (brainstorm rounds 1-2):
 *  - atomic: clicking executes the command immediately;
 *  - template: label ends with an ellipsis, clicking inserts `command`
 *    into the input field for the player to complete.
 */
export type ChipKind = 'atomic' | 'template'

export interface ActionChip {
  id: string
  label: string
  kind: ChipKind
  /** Command text: executed (atomic) or inserted into the input (template). */
  command: string
  /**
   * Unavailable chips render dimmed with cursor not-allowed and do nothing
   * (previz microdecision: show, do not hide).
   */
  available: boolean
  /** Risky actions are marked with color + glyph, no percentages (round 8). */
  risky?: boolean
}

export interface ExitChip {
  toLocationId: string
  /** Compass direction, e.g. "север". */
  direction: string
  /** Target display name, e.g. "дорога". */
  targetName: string
}

export interface NoticedItem {
  id: string
  label: string
}

/** One entry of the dialogue log in the Converse panel. */
export interface DialogueEntry {
  id: number
  kind: 'npc' | 'player' | 'system'
  /** Set for kind === 'npc'. */
  speakerId?: string
  text: string
}

/** Skill check result shown as a light plate above the narrative (round 8). */
export interface CheckResult {
  skill: string
  success: boolean
}

/** One narrative block in the Location panel scrollback (round 5). */
export interface NarrativeBlock {
  id: number
  text: string
  check?: CheckResult
}

/** Journal entry (round 5-6): full chronological history of the session. */
export type JournalEntry =
  | { id: number; t: 'narrative'; text: string; check?: CheckResult }
  | { id: number; t: 'dialogue'; side: 'npc' | 'player'; speakerName: string; text: string }
  | { id: number; t: 'transition'; text: string }
  | { id: number; t: 'item'; text: string }
  | { id: number; t: 'skill'; text: string }

/** Everything the three panels need to render one frame of the game. */
export interface UiWorldState {
  title: string
  dayLabel: string
  timeLabel: string
  difficultyLabel: string
  languageLabel: string
  location: Location
  locationGlyph: GlyphKey
  npcs: UiNpc[]
  noticed: NoticedItem[]
  exits: ExitChip[]
  actionChips: ActionChip[]
  progression: PlayerProgression
  conditionLabel: string
}

/** One player turn: free text plus optional addressee (selected NPC). */
export interface TurnInput {
  text: string
  addresseeId: string | null
}

export type TurnKind = 'narrative' | 'dialogue' | 'move' | 'none'

export interface SkillUp {
  attribute: keyof Attributes
  label: string
  from: number
  to: number
}

export interface TurnOutput {
  kind: TurnKind
  /** New narrative for the Location panel (typewriter target), if changed. */
  narrative?: string
  /** Skill check attached to the narrative (round 8). */
  check?: CheckResult
  /** NPC reply to show in the dialogue log (kind === 'dialogue'). */
  npcReply?: { speakerId: string; text: string }
  /** Player line echoed into the dialogue log (kind === 'dialogue'). */
  playerEcho?: string
  /** Target location id (kind === 'move'). */
  movedToLocationId?: string
  /** Scripted NPC initiative lines triggered by this turn (round 4). */
  initiative?: Array<{ speakerId: string; text: string }>
  /** Attribute increases produced by this turn (round 6). */
  skillUps?: SkillUp[]
  /** Items added to the inventory this turn (journal markers). */
  itemsGained?: string[]
  /** Fresh full state after the turn. */
  state: UiWorldState
}

export const CONDITION_LABELS: Record<Condition, string> = {
  ok: 'здоров',
  tired: 'устал',
  wounded: 'ранен',
  exhausted: 'измотан',
}

export const ATTRIBUTE_LABELS: Record<keyof Attributes, string> = {
  perception: 'Восприятие',
  empathy: 'Эмпатия',
  lore: 'Знание',
  athletics: 'Атлетика',
  subterfuge: 'Скрытность',
}
