/*
 * TypeScript mirrors of the canon pydantic models.
 *
 * Source of truth: worldsim-workspace/packages/schemas/src/worldsim_schemas/schemas.py
 * Mirrored at canon SCHEMA_VERSION 0.1.0.
 *
 * Field names stay snake_case on purpose: they mirror the JSON wire format
 * produced by pydantic `.model_dump()`, so in Phase 2 the orchestrator HTTP
 * API responses parse into these types without any mapping layer.
 *
 * Only the subset the UI actually consumes is mirrored. When the canon
 * changes, update this file by hand and re-check against schemas.py.
 */

export const MIRRORED_SCHEMA_VERSION = '0.1.0'

export type Condition = 'ok' | 'tired' | 'wounded' | 'exhausted'

export interface Goal {
  text: string
  priority: number // 0..1
}

export interface Location {
  id: string
  name: string
  short_description: string
  full_description: string | null
  tags: string[]
  connected_to: string[]
  parent_region_id: string | null
  active_elements: string[]
  discovered: boolean
  visited: boolean
}

/** Shared model for NPCs and the player (player has is_player=true). */
export interface Character {
  id: string
  name: string
  is_player: boolean
  role: string | null
  faction_id: string | null
  public_traits: string[]
  hidden_traits: string[]
  goals: Goal[]
  knowledge: string[]
  attitude_to_player: number // -1..1
  location_id: string
  condition: Condition
  alive: boolean
}

export interface Attributes {
  perception: number
  empathy: number
  lore: number
  athletics: number
  subterfuge: number
}

export interface PlayerProgression {
  character_id: string
  attributes: Attributes
  skill_counters: Record<string, number>
  reputation: Record<string, number> // faction_id -> -1..1
  known_facts: string[]
  inventory: string[]
  flags: string[]
  condition: Condition
}

export interface WorldMeta {
  id: string
  title: string
  genre: string
  tone: string[]
  themes: string[]
  premise: string
  tick: number
  player_character_id: string
  schema_version: string
}

export interface GameSettings {
  language: 'ru' | 'en'
  difficulty: 'casual' | 'normal' | 'hardcore'
  generation_depth: 'compact' | 'rich'
  model_default: string
  model_heavy: string
  turn_tempo: 'scene' | 'minute' | 'hour'
}

/**
 * Normalized player intent. In Phase 2 the orchestrator derives this from
 * free text; the fixture engine mirrors that step with a tiny keyword matcher.
 */
export interface Intent {
  intent: string // move | examine | converse | gather_information | use_item | wait | custom
  method: string | null
  target: string | null
  target_raw: string | null
  tone: string | null
  risk_level: 'low' | 'medium' | 'high'
  raw_text: string
}
