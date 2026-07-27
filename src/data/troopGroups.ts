// src/data/troopGroups.ts
// Starting troop groups. Only the player's home sietch fields a crew at the
// outset; every other group arrives by pledging a sietch, which is what makes
// the pledge loop the engine of the whole economy.

import type { TroopGroup } from '../game-engine/troops/types'

export const INITIAL_TROOP_GROUPS: TroopGroup[] = [
  {
    id: 'group_tabr_1',
    homeSietchId: 'sietch_tabr',
    locationId: 'sietch_tabr',
    size: 30,
    // Deliberately green. Skill grows by doing, so the opening crew is slow
    // rather than incapable — and the player feels them improve.
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60,
    equipmentIds: [],
    task: 'idle',
    taskTargetId: null,
    changeoverDaysLeft: 0,
  },
]

/** Crews granted when a sietch pledges — sized from its population. */
export function groupsForPledgedSietch(
  sietchId: string,
  population: number,
  index: number,
): TroopGroup {
  return {
    id: `group_${sietchId}_${index}`,
    homeSietchId: sietchId,
    locationId: sietchId,
    size: Math.max(15, Math.round(population / 6)),
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 55,
    equipmentIds: [],
    task: 'idle',
    taskTargetId: null,
    changeoverDaysLeft: 0,
  }
}
