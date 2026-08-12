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
 * so `max(MIN_PLEDGE_CREW_SIZE, round(fremenWorkers/6))` ==
 * MIN_PLEDGE_CREW_SIZE for the entire shipped roster today — the formula
 * only diverges from the floor once a sietch's worker count exceeds 6x the
 * floor. balance/simulate.ts's headless model used to expand with flat
 * size-28 crews instead — a divergence from this production formula, not a
 * reconciled alternative. Closed at WP04 chunk W4a (progress.md Round 16)
 * by deleting that parallel-economy model: game-engine/sim/runner.ts drives
 * crew sizing through THIS function, the production formula, so the
 * 15-vs-28 gap cannot recur.
 *
 * WP04 chunk W4e (balance tuning, round 1): floor raised 15 -> 30
 * (harvest.ts's own REFERENCE_SIZE — a pledged crew now starts at zero size
 * penalty/bonus instead of harvest.ts's 0.3x-2.0x clamp discounting it to
 * 0.5x). Evidence: baseline/wp04-sweep/sweep-report.md measured the reserve
 * line landing PARTIAL at cycle-1 (stock 77.35 vs 90 due) and the invest
 * line SHORT (51.54 vs 54 minimum) — both traced to a size-15 crew running
 * at half the sizeFactor a size-30 crew gets.
 *
 * Round 2: raised again, 30 -> 40 (sizeFactor 1.0 -> 1.333). Round 1 alone
 * left T1/T2 comfortably met but T3 (recovery) still failing 0/10: the
 * distressedCampaign.ts probe traced the death to a SINGLE recovering crew
 * needing to fund both a genuine loyalty-decay gift (recovery.ts's own
 * correct policy — lastVisitedDay is never refreshed by a gift, only by a
 * true arrival, so a neglected pledge keeps decaying under it) and the
 * cycle-3 settlement from the same ~5/day income — see quota.ts's
 * BASE_AMOUNTS citation for the other half of this round's fix.
 */
export const MIN_PLEDGE_CREW_SIZE = 40

export function groupsForPledgedSietch(
  sietchId: string,
  population: number,
): TroopGroup {
  return {
    id: `group_${sietchId}`,
    homeSietchId: sietchId,
    locationId: sietchId,
    size: Math.max(MIN_PLEDGE_CREW_SIZE, Math.round(population / 6)),
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 55,
    task: 'idle',
    taskTargetId: null,
    changeoverDaysLeft: 0,
  }
}
