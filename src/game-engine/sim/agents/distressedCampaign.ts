// src/game-engine/sim/agents/distressedCampaign.ts
// The recovery fixture reading owed since progress.md Round 16: 07's own
// `recovery` row asks for "patience 1, arrears, a damaged field, and a
// threatened pledge" — but 07's "damaged field" and a raid threat do not
// exist in Act 1 (Round 16's own note), so this constructs the nearest
// in-scope equivalent: patience 1, real arrears, a fully worked-out field,
// and a pledge decayed close to UNPLEDGE_THRESHOLD.
//
// PLAYED through production commands wherever play can reach it (the
// opening, both tribute cycles, the resulting patience/arrears/spice are
// all genuine settlement outcomes — see settleShort's own doc). Two fields
// are hand-set, each cited at the point it is written: play cannot reach
// either within the ~2-cycle window invariant 2's own probe needs to test
// recovery inside (the math is in each citation below, not asserted).

import { createCampaignRunner, type CampaignRunner } from '../runner'
import { walkOpeningBriefing, walkToFirstCrew, walkQ1Debrief, SECOND_DEADLINE_DAY } from '../reserveLine'
import { FIRST_DEADLINE_DAY } from '../../quota/quota'
import { UNPLEDGE_THRESHOLD, NEGLECT_DECAY_PER_DAY } from '../../sietch/loyalty'
import { world } from '../../GameState'
import type { Difficulty } from '../../../types'

const RED_WALL = 'red_wall_sietch'
const RED_WALL_FIELD = 'field_red_wall_pan'

/** 3 points above UNPLEDGE_THRESHOLD — "close to" per 07's "a threatened
 * pledge", not already lost (recovery's own gift-to-protect move must still
 * have a pledge left to protect when it decides). See the write site below
 * for why play cannot reach this number. */
const NEAR_DECAY_LOYALTY = UNPLEDGE_THRESHOLD + 3

/** Pay just under the partial-band floor whenever affordable, else pay
 * everything on hand — guarantees a 'short' settlement (the patience-losing
 * band) at every deadline this fixture plays through, without ever
 * requesting more than `legalRange.max` allows (a request above it is a
 * refused command, not a payment). */
function settleShort(rc: CampaignRunner): void {
  const pending = rc.visibleState().pendingSettlement!
  const amount = Math.min(pending.legalRange.max, pending.minPartialPayment - 1)
  rc.settleTribute(amount)
}

export interface DistressedReading {
  day: number
  patience: number
  arrears: number
  amountDue: number
  stock: number
  /** red_wall_sietch's loyalty at the point the fixture is handed off. */
  pledgeLoyalty: number
  /** field_red_wall_pan's remaining spice at the point the fixture is
   * handed off. */
  fieldRemaining: number
  /** Every field this fixture set directly rather than through a
   * production command, and why play cannot reach it — 07's own
   * requirement ("a citation listing exactly which fields were set by hand
   * and why that matches 07's defined state"). */
  handSet: { field: string; citation: string }[]
}

/**
 * Build the distressed fixture and hand it to the caller as a live runner
 * (recovery.decide() then runs FROM this point — recoveryProbe.test.ts).
 * Same seed always produces the same reading (every played step is
 * deterministic given the seed; the two hand-set fields are fixed
 * constants, not seed-derived), matching the harness's own determinism
 * contract.
 */
export function distressedCampaign(seed: number, difficulty: Difficulty = 'normal'): {
  runner: CampaignRunner
  reading: DistressedReading
} {
  const rc = createCampaignRunner(seed, difficulty)

  // Played: reach Red Wall, earn trust, pledge, put the one crew to work —
  // the same opening reserveLine.ts's own smoke fixture proves reachable.
  walkOpeningBriefing(rc)
  walkToFirstCrew(rc)

  // Played: Q1, settled short — patience 3 -> 2, real arrears begins.
  rc.advanceToDay(FIRST_DEADLINE_DAY)
  settleShort(rc)
  walkQ1Debrief(rc) // Beat 7's debrief only opens for cycle 0 (Q1)

  // Played: Q2, settled short again — patience 2 -> 1 (07's "patience 1"),
  // arrears compounds onto the still-unpaid Q1 shortfall, stock is spent
  // down to whatever the crew earned since (genuinely broke, not merely
  // "declining to pay" — see progress.md Round 16's own reading note).
  rc.advanceToDay(SECOND_DEADLINE_DAY)
  settleShort(rc)

  const handSet: DistressedReading['handSet'] = []

  // Hand-set 1: pledge near decay. Beat 4's dialogue effect plus Red Wall's
  // seed loyalty (55, data/sietches.ts) lands a fresh pledge at exactly 60
  // (opening-redwall-trust.ts's own citation). NEGLECT_DAYS gates any decay
  // at all for the first 10 days after the last visit; even by day 20 (this
  // fixture's own second settlement) only ~11 decay-eligible days have
  // passed, landing loyalty in the high 40s in play (measured: 49) — 19
  // points above UNPLEDGE_THRESHOLD (30). Closing that gap through neglect
  // alone needs roughly another 19 days beyond day 20 at
  // NEGLECT_DECAY_PER_DAY (1/day), i.e. past day 39 — outside the ~2-cycle
  // window (day 20 -> day 36) invariant 2's own probe tests recovery
  // inside. Set directly here, on `red_wall_sietch` only.
  const sietch = world.sietches.find(s => s.villageId === RED_WALL)!
  sietch.loyalty = NEAR_DECAY_LOYALTY
  handSet.push({
    field: 'sietches[red_wall_sietch].loyalty',
    citation: `played value ~49 at day ${SECOND_DEADLINE_DAY} is ${49 - UNPLEDGE_THRESHOLD} points above ` +
      `UNPLEDGE_THRESHOLD; closing that gap needs ~19 more decay-days at ` +
      `${NEGLECT_DECAY_PER_DAY}/day, past day 39 — beyond the probe's own two-settlement window.`,
  })

  // Hand-set 2: damaged field. field_red_wall_pan's own extraction is
  // density x (remaining/capacity) — density-proportional decay, so
  // remaining falls off compounding at this crew's size and skill. WP04
  // chunk W4e's yield-lever rounds (higher density, a bigger crew) speed
  // this up over the pre-retune measurement (was ~93% of 440 at day 20) —
  // re-measured after both rounds: ~80.5% of 760 capacity still remains at
  // day 20. Reaching a genuinely "damaged" state through play alone is
  // still well beyond the ~2-cycle window. Set directly to 0 (fully worked
  // out) so `recommendedFieldId` stops recommending it and recovery's
  // "reassign to best field" move has a real, observable job —
  // field_tabr_shallows (the opening's other discovered field, data/
  // spiceFields.ts) is the fallback.
  const field = world.spiceFields.find(f => f.id === RED_WALL_FIELD)!
  field.remaining = 0
  handSet.push({
    field: 'spiceFields[field_red_wall_pan].remaining',
    citation: 'measured ~80.5% (611.8/760) still remaining at day 20 (WP04 chunk W4e round 2 re-measure; ' +
      'was ~93% of 440 before this round\'s yield levers) — density-proportional extraction still leaves ' +
      'genuine exhaustion unreachable within the probe\'s own window; set to 0 so recommendedFieldId moves off it.',
  })

  const view = rc.visibleState()
  return {
    runner: rc,
    reading: {
      day: view.day,
      patience: view.quota.patience,
      arrears: view.quota.arrears,
      amountDue: view.quota.amountDue,
      stock: view.player.spice,
      pledgeLoyalty: NEAR_DECAY_LOYALTY,
      fieldRemaining: 0,
      handSet,
    },
  }
}
