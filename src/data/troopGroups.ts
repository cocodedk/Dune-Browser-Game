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

/**
 * The one crew an ordinary pledge grants (docs/PRD/game-completion/
 * 02-runtime-consolidation.md "Crew lifecycle"). `id` is derived from
 * `sietchId` alone — never a counter — so it is the same id every time this
 * sietch pledges, including after a save/load round-trip: a reload can
 * never desync it from the crew already attached to sietch.crewIds, and
 * SietchSystem.pledgePlayerSietch relies on that to detect a win-back
 * (decay-then-re-pledge) instead of manufacturing a second crew.
 *
 * `fremenWorkers` at every current sietch tops out at 60 (data/sietches.ts),
 * so `max(15, round(fremenWorkers/6))` == 15 for the entire shipped roster
 * today — the formula only diverges from the floor once a sietch's worker
 * count exceeds 90. balance/simulate.ts's headless model expands with
 * flat size-28 crews instead; the two are not yet reconciled (out of this
 * chunk's scope — flagged for the balance owner).
 */
export function groupsForPledgedSietch(
  sietchId: string,
  population: number,
): TroopGroup {
  return {
    id: `group_${sietchId}`,
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
