// src/game-engine/dayRunner.ts
// The ordered day processor — docs/PRD/game-completion/02-runtime-consolidation.md
// "Day-boundary order". GameLoop calls processDayBoundary() once per frame;
// it runs runDay() once for EVERY day crossed since the last call, in order,
// never collapsing a multi-day jump onto only the final day.
//
// RNG pattern: one createRng(world.rng) instance per day (per runDay() call),
// threaded by parameter into every system that still rolls dice today
// (harvest/worm, prospect, raid — see rng/rng.ts), written back to world.rng
// exactly once at the end of the day. Not one instance per individual roll:
// that would be equally deterministic, but per-day scoping keeps step
// accounting legible (a day's rolls are one contiguous step range) and
// matches "one seeded engine service" in 02 "Randomness" without re-reading
// world.rng mid-day.

import { world } from './GameState'
import { pushEvent } from './EventSystem'
import { DAY_SECONDS, crossedDays } from './TimeSystem'
import { updateVillages } from './VillageSystem'
import { updateSietches } from './sietch/updateSietches'
import { createRng } from './rng/rng'
import {
  runHarvestDay, runProspectDay, runQuotaCheck, runActCheck,
  runTrainingDay, runRaidCheck, runEcologyDay, runSietchLoyaltyDay,
} from './EconomySystem'

/** Run every campaign day-boundary system for exactly one day, in order. */
export function runDay(): void {
  const rng = createRng(world.rng)

  // LEGACY PRODUCTION SEAM — WP02 removes; see legacy-authority-inventory.md
  // category 2. Village production/collection (VillageSystem.updateVillages)
  // duplicates crew harvest and is one of the two retired paths named in 02's
  // "Current conflicts to retire" table; it is not this package's to remove.
  updateVillages()

  // Step 1: Finish task changeovers.
  // Step 2: Apply harvest and field depletion.
  // Step 5: Apply equipment wear and worm consequences.
  // One call fulfils all three: runHarvestDay ticks changeoverDaysLeft down,
  // extracts spice, and resolves worm encounters together — see
  // economy/harvestRun.ts. Splitting it into three call sites would reorder
  // production against changeover state and is out of this task's scope.
  runHarvestDay(rng)

  // Step 3: Apply prospecting/discovery.
  runProspectDay(rng)

  // Step 9 (today's stand-in): tribute settlement.
  // 02 places "create the pending settlement decision" at step 9, after the
  // act/ending check (step 8). There is no pause-and-decide flow yet — that
  // is WP02's "pausing tribute settlement" scope — so runQuotaCheck settles
  // immediately from stock. It must run before step 8 below so a patience-0
  // loss is evaluated and lands the SAME day it happens, exactly as before
  // this change (see EconomySystem.ts's runQuotaCheck header for the single
  // ending-writer note this enables).
  runQuotaCheck()

  // Step 4: Apply training and ecology.
  runEcologyDay()
  runTrainingDay()

  // Step 6: Resolve scheduled authored events and raids.
  // Authored random-event selection does not exist yet — no call for it.
  runRaidCheck(rng)

  // Step 7: Update loyalty neglect, morale, and persistent location state.
  // Sietch loyalty neglect is authored now (economy/sietchLoyaltyRun.ts,
  // chunk W2b) — village loyalty neglect/rebellion still lives inside the
  // legacy updateVillages() call above (untouched; that seam is not this
  // chunk's). Morale neglect/drift has no day-boundary writer yet.
  runSietchLoyaltyDay()

  // Step 8: Evaluate act objectives and endings — the sole ending writer.
  runActCheck()

  // Step 10: Publish one consolidated world update and ordered player-facing
  // events. No consolidated single-event publish exists yet; each system
  // above still pushes its own event(s) as it runs, as today.

  // LEGACY PRODUCTION SEAM — WP02 removes; see legacy-authority-inventory.md
  // category 2. The threshold-based sietch task/payout loop duplicates crew
  // harvest/training and is the other retired path from that same table.
  const sietchResult = updateSietches(world.sietches)
  world.sietches = sietchResult.sietches
  for (const payout of sietchResult.payouts) {
    const village = world.villages.find(v => v.id === payout.villageId)
    const name = village?.name ?? payout.villageId
    if (payout.kind === 'spice') {
      world.player.spice += payout.amount
      pushEvent('spice_shipment_received', `Fremen at ${name} deliver ${payout.amount} spice`)
    } else {
      world.player.troops += payout.amount
      pushEvent('fedaykin_ready', `${payout.amount} Fedaykin at ${name} ready for your command`)
    }
  }

  world.rng = rng.state()
}

/**
 * Called once per frame from GameLoop. Runs runDay() once for every day
 * crossed since the last call — a multi-day jump (large delta, or a debug
 * time-set) processes each crossed day in order, not just the final one
 * (02 "Day-boundary order").
 *
 * world.time is temporarily pinned to each intermediate day's start so
 * currentDay()-reading systems (quota, raids, act) see the right day; the
 * real elapsed time is restored for the final (current) day. A non-null
 * `world.ending` stops the loop early — "a non-null ending freezes
 * simulation" (02 "Campaign status") — so a jump that crosses an ending mid-
 * way does not keep processing days past it. world.time is left pinned to
 * the ending day in that case rather than the real elapsed time; nothing
 * reads world.time again once the run is frozen.
 */
export function processDayBoundary(): void {
  const days = crossedDays()
  if (days.length === 0) return

  const realTime = world.time
  const last = days[days.length - 1]
  for (const day of days) {
    world.time = day === last ? realTime : day * DAY_SECONDS
    runDay()
    // world.ending is the freeze authority (02 "Campaign status");
    // goalAchieved is only its derived compatibility shadow.
    if (world.ending !== null) break
  }
}
