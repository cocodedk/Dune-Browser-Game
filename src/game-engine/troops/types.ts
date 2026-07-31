// src/game-engine/troops/types.ts
// Troop groups, equipment and spice fields — the entities the economy runs on.

import type { LocationId } from '../../types'

export type TroopTask =
  | 'harvest' | 'prospect' | 'train' | 'ecology' | 'garrison' | 'idle'

export type EquipmentKind =
  | 'harvester' | 'heavy_harvester' | 'thopter' | 'lr_thopter'
  | 'krys' | 'sonic_disruptor' | 'windtrap' | 'bulb_cache'

export interface Equipment {
  id: string
  kind: EquipmentKind
  /** Held by a sietch OR carried by a group — never both. */
  locationId: LocationId | null
  groupId: string | null
  condition: number // 0-100; not ticked in the Act 1 slice
}

export interface TroopSkills {
  spice: number
  prospect: number
  military: number
  ecology: number
}

export interface TroopGroup {
  id: string
  homeSietchId: LocationId
  locationId: LocationId
  size: number
  skills: TroopSkills
  morale: number
  equipmentIds: string[]
  task: TroopTask
  taskTargetId: string | null
  /** Days remaining of the reassignment changeover, during which output is 0. */
  changeoverDaysLeft: number
}

export interface SpiceField {
  id: string
  regionId: string
  position: { x: number; y: number }
  discovered: boolean
  /** Initial richness, 10-95. Effective density falls as the field depletes. */
  density: number
  capacity: number
  remaining: number
}

export const MIN_TASK_SIZE = 15
export const MERGE_HOME_SIZE = 10
export const CHANGEOVER_DAYS = 1

/** Extraction rate by the best harvesting equipment a group carries. */
export const EXTRACTION_RATE = {
  hand: 6,
  harvester: 20,
  heavy_harvester: 34,
} as const

export type ExtractionTier = keyof typeof EXTRACTION_RATE

/** A field's effective density tapers as it empties, so yields fade rather than cliff. */
export function effectiveDensity(field: SpiceField): number {
  if (field.capacity <= 0) return 0
  const fraction = Math.max(0, Math.min(1, field.remaining / field.capacity))
  return field.density * fraction
}

/** Best extraction tier available to a group, given the equipment it carries. */
export function extractionTier(kinds: readonly EquipmentKind[]): ExtractionTier {
  if (kinds.includes('heavy_harvester')) return 'heavy_harvester'
  if (kinds.includes('harvester')) return 'harvester'
  return 'hand'
}
