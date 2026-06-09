/*
 * UI-facing types: what the panels render and what the engine exchanges
 * with the UI. These are NOT canon mirrors — they are the view contract.
 */

import type { Character, Condition, Location, PlayerProgression } from './canon'

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
  /** False for strangers: relation meter is replaced by a question mark. */
  known: boolean
}

/**
 * Action chips come in two kinds (brainstorm round 1/2):
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
}

export interface ExitChip {
  toLocationId: string
  /** Compass direction, e.g. "север". */
  direction: string
  /** Display label, e.g. "север - дорога" rendered with an arrow. */
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

export interface TurnOutput {
  kind: TurnKind
  /** New narrative for the Location panel (typewriter target), if changed. */
  narrative?: string
  /** NPC reply to show in the dialogue log (kind === 'dialogue'). */
  npcReply?: { speakerId: string; text: string }
  /** Player line echoed into the dialogue log (kind === 'dialogue'). */
  playerEcho?: string
  /** Target location id (kind === 'move'). */
  movedToLocationId?: string
  /** Fresh full state after the turn. */
  state: UiWorldState
}

export const CONDITION_LABELS: Record<Condition, string> = {
  ok: 'здоров',
  tired: 'устал',
  wounded: 'ранен',
  exhausted: 'измотан',
}
