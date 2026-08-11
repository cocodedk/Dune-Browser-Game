// src/game-engine/sim/runner.smoke.test.ts
// The required smoke proof (07-balance-playtest-and-release.md; progress.md
// Round 16, WP04 chunk W4a): plays the `opening-reserve-line` fixture
// end-to-end purely through the runner API (reserveLine.ts), asserting
// opening.complete flips and the clock resumes afterward — no softlock,
// same shape commands/openingLineFixtures.test.ts's own expectClockResumes
// proves at the engine level. Walking Beat 7's debrief afterward is this
// chunk's own strengthening (see reserveLine.ts's walkQ1Debrief doc): it
// exercises maybeOpenQ1Debrief headlessly, runtimeTick.ts's SECOND auto-open
// hook, not only the campaign-creation one every run already needs.

import { describe, it, expect } from 'vitest'
import { createCampaignRunner } from './runner'
import { walkOpeningBriefing, walkToFirstCrew, walkQ1Debrief } from './reserveLine'
import { FIRST_DEADLINE_DAY } from '../quota/quota'

describe('runner smoke: opening-reserve-line end-to-end through the runner API only', () => {
  it('briefing -> travel -> trust -> pledge -> assign -> day 12 -> settle full-available -> debrief -> clock resumes', () => {
    const rc = createCampaignRunner(1, 'normal')

    // Sanity: the opening chain has not completed itself before any command.
    expect(rc.visibleState().activeObjective?.id).toBe('act1.receive_briefing')

    walkOpeningBriefing(rc)
    walkToFirstCrew(rc)
    rc.advanceToDay(FIRST_DEADLINE_DAY)

    const pending = rc.visibleState().pendingSettlement
    expect(pending).not.toBeNull()
    expect(pending!.cycleIndex).toBe(0) // Q1

    rc.settleTribute(pending!.legalRange.max) // "settle full-available"

    // opening.complete flips — activeOpeningObjective is null only once
    // every chain step, including opening.complete, is done
    // (acts/openingObjectives.ts's own doc for the CHAIN's last entry).
    expect(rc.visibleState().activeObjective).toBeNull()
    expect(rc.visibleState().pendingSettlement).toBeNull() // decision cleared

    walkQ1Debrief(rc)
    expect(rc.visibleState().dialogue).toBeNull() // debrief fully closed, past Thufir

    // No softlock: a further tick genuinely advances the clock — pause.ts's
    // settlementPending/inDialogue gates have both cleared.
    const hashBefore = rc.hashNow()
    rc.tick(50)
    expect(rc.hashNow()).not.toBe(hashBefore)
    expect(rc.isBlocked()).toBe(false)
  })
})
