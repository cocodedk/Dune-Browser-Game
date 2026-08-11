// src/game-engine/sim/cycleTwo.test.ts
// WP04 chunk W4b's own required fixtures (progress.md Round 16; 07-balance-
// playtest-and-release.md "parity protocol" item 4 — "at least one tribute"
// per fixture is the FLOOR, not the ceiling): both opening lines walked
// through TWO settlement cycles, each with a reload checkpoint at the
// cycle-1 pending-settlement decision (the engine's own natural freeze
// point — settlementPending pauses the clock by rule, and world.time is
// already rewound to exactly `day * DAY_SECONDS` there — dayRunner.ts's own
// doc). This is the headless twin of e2e/parity.spec.ts's browser walk, and
// the source of the measured numbers this chunk's own report cites.

import { describe, it, expect } from 'vitest'
import { createCampaignRunner } from './runner'
import {
  walkOpeningBriefing, walkToFirstCrew, walkQ1Debrief, settleFullAvailable, SECOND_DEADLINE_DAY,
} from './reserveLine'
import { walkToSecondCrew } from './investLine'
import { FIRST_DEADLINE_DAY } from '../quota/quota'

describe('opening-reserve-line through cycle-2, with a reload checkpoint at the cycle-1 decision', () => {
  it('settles cycle 1, reloads, resumes, and settles cycle 2 with no ending', () => {
    const rc = createCampaignRunner(31, 'normal')
    walkOpeningBriefing(rc)
    walkToFirstCrew(rc)
    rc.advanceToDay(FIRST_DEADLINE_DAY)

    const cycle1 = rc.visibleState().pendingSettlement!
    expect(cycle1.cycleIndex).toBe(0)
    const preReloadHash = rc.hashNow()
    console.log('reserve-line cycle-1 measured:', {
      stock: cycle1.stock, amountDue: cycle1.amountDue, minPartialPayment: cycle1.minPartialPayment,
    })

    const saved = rc.save()
    rc.reload(saved)
    expect(rc.hashNow()).toBe(preReloadHash) // reload itself changes nothing

    settleFullAvailable(rc)
    walkQ1Debrief(rc)
    expect(rc.visibleState().dialogue).toBeNull()

    rc.advanceToDay(SECOND_DEADLINE_DAY)
    const cycle2 = rc.visibleState().pendingSettlement!
    expect(cycle2.cycleIndex).toBe(1)
    console.log('reserve-line cycle-2 measured:', {
      stock: cycle2.stock, amountDue: cycle2.amountDue, minPartialPayment: cycle2.minPartialPayment,
    })
    settleFullAvailable(rc)

    expect(rc.visibleState().pendingSettlement).toBeNull()
    expect(rc.isBlocked()).toBe(false)
  })
})

describe('opening-invest-line through cycle-2, with a reload checkpoint at the cycle-1 decision', () => {
  it('lands cycle 1 SHORT as measured through the real route (not the engine-shortcut PARTIAL), reloads, resumes, settles cycle 2', () => {
    const rc = createCampaignRunner(31, 'normal')
    walkOpeningBriefing(rc)
    walkToFirstCrew(rc)
    walkToSecondCrew(rc)
    expect(rc.visibleState().crews).toHaveLength(2) // both crews harvesting

    rc.advanceToDay(FIRST_DEADLINE_DAY)
    const cycle1 = rc.visibleState().pendingSettlement!
    expect(cycle1.cycleIndex).toBe(0)

    // Measured (not assumed) — and a genuine divergence from
    // commands/openingLineFixtures.test.ts's engine-level shortcut fixture
    // (54.35, PARTIAL, teleported with zero travel/dialogue time spent):
    // walked through the real production route (real travel hops, real
    // dialogue including story/tabr_dilemma's own three ticks), two crews
    // land at ~51.5 by day 12 — BELOW the 54 minPartialPayment floor, i.e.
    // the SHORT band, not PARTIAL. This chunk's own "one partial-band
    // settlement" fixture requirement is satisfied by the RESERVE line's
    // cycle-1 instead (see the sibling describe block above — ~77-78 vs 90
    // due, 54 minimum: genuinely PARTIAL). Reported, not forced — see this
    // chunk's own final report for the root cause (extra harvest-window time
    // spent in real travel/dialogue that the engine-level shortcut skips).
    expect(cycle1.legalRange.max).toBeLessThan(cycle1.minPartialPayment)
    expect(cycle1.legalRange.max).toBeLessThan(cycle1.amountDue)
    console.log('invest-line cycle-1 measured:', {
      stock: cycle1.stock, amountDue: cycle1.amountDue, minPartialPayment: cycle1.minPartialPayment,
    })

    const saved = rc.save()
    rc.reload(saved)
    settleFullAvailable(rc)
    walkQ1Debrief(rc)

    rc.advanceToDay(SECOND_DEADLINE_DAY)
    const cycle2 = rc.visibleState().pendingSettlement!
    expect(cycle2.cycleIndex).toBe(1)
    console.log('invest-line cycle-2 measured:', {
      stock: cycle2.stock, amountDue: cycle2.amountDue, minPartialPayment: cycle2.minPartialPayment,
    })
    settleFullAvailable(rc)

    expect(rc.visibleState().pendingSettlement).toBeNull()
    expect(rc.isBlocked()).toBe(false)
  })
})
