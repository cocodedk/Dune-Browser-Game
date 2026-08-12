// src/game-engine/troops/casualty.ts
// PURE casualty rule — docs/PRD/game-completion/02-runtime-consolidation.md
// "Crew lifecycle": "Casualties change crew size and may merge or dissolve a
// crew according to one engine rule. A destroyed crew cannot remain
// selectable."
//
// Three call sites used to apply losses their own way (harvestRun.ts's worm
// encounter mutated `group.size` directly; raidRun.ts and endgameOps.ts both
// used combat/resolve.ts's `applyLosses`, which only ever shrinks — it never
// dissolved or merged anything, so a crew that hit 0 stayed in
// `world.troopGroups` at size 0, visible and "assignable" until something
// else refused it). This is the one rule all three now go through.
//
// A crew that reaches 0 is dissolved outright. A crew left standing but
// below `MERGE_HOME_SIZE` folds into another live crew from the same home
// sietch, if one exists — survivors regroup with their own people rather
// than the roster quietly accumulating unworkable four-person crews.
// Equipment and the owning sietch's `crewIds` move or drop with the crew, so
// dissolving/merging never leaves a dangling holder or a sietch pointing at
// a crew id that no longer exists.

import { MERGE_HOME_SIZE } from './types'
import type { TroopGroup, Equipment } from './types'
import type { SietchState } from '../sietch/types'

export type CasualtyOutcome = 'shrunk' | 'merged' | 'dissolved'

export interface CasualtyResult {
  groups: TroopGroup[]
  equipment: Equipment[]
  sietches: SietchState[]
  outcome: CasualtyOutcome
  /** The crew's id afterward: itself if shrunk, the merge target if merged, null if dissolved. */
  survivorId: string | null
}

function detachFromSietches(sietches: readonly SietchState[], groupId: string): SietchState[] {
  return sietches.map(s =>
    s.crewIds?.includes(groupId)
      ? { ...s, crewIds: s.crewIds.filter(id => id !== groupId) }
      : s,
  )
}

function transferEquipment(equipment: readonly Equipment[], fromGroupId: string, toGroupId: string | null, atLocationId: string): Equipment[] {
  return equipment.map(item =>
    item.groupId === fromGroupId
      ? { ...item, groupId: toGroupId, locationId: toGroupId === null ? atLocationId : null }
      : item,
  )
}

function weightedAverage(a: number, aSize: number, b: number, bSize: number): number {
  const total = aSize + bSize
  return total > 0 ? Math.round((a * aSize + b * bSize) / total) : a
}

/**
 * Apply `lost` casualties to the crew `groupId` within `groups`.
 *
 * `lost` is clamped to the crew's own size — this never removes people from
 * another crew. Returns the (possibly restructured) `groups`/`equipment`/
 * `sietches` arrays; a group not found in `groups` returns the inputs
 * unchanged with `outcome: 'shrunk'` and `survivorId: null` (nothing to do —
 * the caller already resolved to a stale id, most likely a crew this same
 * casualty pass already dissolved).
 */
export function applyCasualty(
  groups: readonly TroopGroup[],
  equipment: readonly Equipment[],
  sietches: readonly SietchState[],
  groupId: string,
  lost: number,
): CasualtyResult {
  const index = groups.findIndex(g => g.id === groupId)
  if (index < 0) {
    return { groups: [...groups], equipment: [...equipment], sietches: [...sietches], outcome: 'shrunk', survivorId: null }
  }

  const group = groups[index]
  const newSize = Math.max(0, group.size - Math.max(0, lost))

  if (newSize <= 0) {
    const nextGroups = groups.filter(g => g.id !== groupId)
    return {
      groups: nextGroups,
      equipment: transferEquipment(equipment, groupId, null, group.locationId),
      sietches: detachFromSietches(sietches, groupId),
      outcome: 'dissolved',
      survivorId: null,
    }
  }

  if (newSize < MERGE_HOME_SIZE) {
    const targetIndex = groups.findIndex(g => g.id !== groupId && g.homeSietchId === group.homeSietchId)
    if (targetIndex >= 0) {
      const target = groups[targetIndex]
      const merged: TroopGroup = {
        ...target,
        size: target.size + newSize,
        skills: {
          spice: weightedAverage(target.skills.spice, target.size, group.skills.spice, newSize),
          prospect: weightedAverage(target.skills.prospect, target.size, group.skills.prospect, newSize),
          military: weightedAverage(target.skills.military, target.size, group.skills.military, newSize),
          ecology: weightedAverage(target.skills.ecology, target.size, group.skills.ecology, newSize),
        },
        morale: weightedAverage(target.morale, target.size, group.morale, newSize),
      }
      const nextGroups = groups
        .filter(g => g.id !== groupId && g.id !== target.id)
        .concat(merged)
      return {
        groups: nextGroups,
        equipment: transferEquipment(equipment, groupId, target.id, group.locationId),
        sietches: detachFromSietches(sietches, groupId),
        outcome: 'merged',
        survivorId: target.id,
      }
    }
  }

  const shrunk: TroopGroup = { ...group, size: newSize }
  const nextGroups = groups.map(g => (g.id === groupId ? shrunk : g))
  return {
    groups: nextGroups,
    equipment: [...equipment],
    sietches: [...sietches],
    outcome: 'shrunk',
    survivorId: groupId,
  }
}
