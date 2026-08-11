// src/game-engine/troops/types.ts
// Troop groups, equipment and spice fields — the entities the economy runs on.

import type { LocationId } from '../../types'

export type TroopTask =
  | 'harvest' | 'prospect' | 'train' | 'ecology' | 'garrison' | 'idle'

export type EquipmentKind =
  | 'harvester' | 'heavy_harvester' | 'thopter' | 'lr_thopter'
  | 'krys' | 'sonic_disruptor' | 'windtrap' | 'bulb_cache'

/**
 * Every item has exactly one holder (docs/PRD/game-completion/
 * 02-runtime-consolidation.md "Equipment"): a location (unissued, sitting in
 * inventory there), or one crew. `locationId`/`groupId` stay a flat pair
 * rather than a discriminated union so the on-disk shape is unchanged (no
 * schema bump — v5 is WP02f's, not this chunk's) — but every writer must
 * set exactly one and null the other; see troops/equipment.ts's `issueTo`/
 * `unissueAt`, the single pair of mutation helpers every holder-change goes
 * through now (marketOps.ts's buyEquipment, commands/issueEquipmentCommand.ts,
 * troops/casualty.ts's dissolve/merge equipment transfer).
 *
 * `condition` is a WP02d decision, not a WP01 leftover: 02 "Equipment"
 * requires condition to be either fully active (decay + repair commands +
 * consequences) or removed from the UI and release scope. It was found
 * partially wired — harvestRun.ts decremented it on worm damage with no
 * repair command, no consequence, and no UI reader — so it is now removed
 * from scope: created at 100 and never mutated again. The field stays
 * (removing it would touch the save shape) but is inert.
 */
export interface Equipment {
  id: string
  kind: EquipmentKind
  locationId: LocationId | null
  groupId: string | null
  /** Always 100. Inert — see the doc comment above. */
  condition: number
}

export interface TroopSkills {
  spice: number
  prospect: number
  military: number
  ecology: number
}

/**
 * `equipmentIds` used to live here as a second, crew-owned pointer back to
 * `Equipment.groupId` — the same relationship recorded twice. It was never
 * written by the mutation layer (marketOps.ts's old `issueEquipment` only
 * ever set `Equipment.groupId`), so it stayed `[]` forever while
 * `Equipment.groupId` carried the real, live link — a two-holders bug for
 * this specific relationship: `CrewPanel.tsx`'s tier readout and
 * `quota/projection.ts`'s income projection both read the dead field and so
 * silently under-reported any crew that had actually been issued gear.
 * Removed for WP02d's single-holder model (02 "Equipment"); every reader now
 * goes through `economy/carried.ts`'s `carriedKinds(groupId)`, which already
 * queried the correct (`Equipment.groupId`) side.
 */
export interface TroopGroup {
  id: string
  homeSietchId: LocationId
  locationId: LocationId
  size: number
  skills: TroopSkills
  morale: number
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

/**
 * Extraction rate by the best harvesting equipment a group carries.
 *
 * WP04 chunk W4e (balance tuning, round 2): `hand` raised 6 -> 7. Round 1's
 * crew-size and field-density legs alone left the invariant-2 recovery
 * probe (game-engine/sim/agents/recoveryProbe.test.ts) dying at its second
 * post-handoff settlement even after troopGroups.ts's round-2 crew-size
 * bump and quota.ts's BASE_AMOUNTS[2] cut — a single hand-tier crew still
 * could not out-earn both a genuine loyalty-protection gift and two
 * consecutive settlements. This is the calibration-affecting lever
 * harvest.test.ts's own header names ("updating those pins IS the authored
 * retune") — its `hand`/`harvester` ratio pin is updated with the same
 * citation.
 */
export const EXTRACTION_RATE = {
  hand: 7,
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
