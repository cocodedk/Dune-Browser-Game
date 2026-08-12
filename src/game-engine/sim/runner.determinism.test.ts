// src/game-engine/sim/runner.determinism.test.ts
// The determinism guard (07-balance-playtest-and-release.md "Determinism
// and parity"; progress.md Round 16, WP04 chunk W4a): same seed + same
// policy (here, the fixed opening-reserve-line script) produces a
// byte-identical trace and hashState; a different seed diverges. Also
// covers this chunk's own save/reload requirement: a mid-run reload at day
// 6 continues to the identical final hash as the un-reloaded run.
//
// Each play-through captures its own trace/hashLog/finalHash/rngSteps
// BEFORE the next createCampaignRunner() call re-points the shared `world`
// singleton — see runner.ts's own doc for why an earlier runner's live
// queries go stale, not a second world-mutation path.

import { describe, it, expect } from 'vitest'
import { createCampaignRunner } from './runner'
import { walkOpeningBriefing, walkToFirstCrew } from './reserveLine'
import { FIRST_DEADLINE_DAY } from '../quota/quota'
import { world } from '../GameState'
import type { CommandTrace, HashStep } from './trace'

interface PlayResult {
  trace: CommandTrace
  hashLog: HashStep[]
  finalHash: string
  /** world.rng.step at the end — read directly (this is test-verification
   * code reading engine internals to CHECK determinism, not a policy
   * selecting a command from a hidden future roll — visibleState()
   * deliberately excludes this same field for that reason). */
  rngSteps: number
}

function playReserveLine(seed: number): PlayResult {
  const rc = createCampaignRunner(seed, 'normal')
  const rngStepsAtStart = world.rng.step

  walkOpeningBriefing(rc)
  walkToFirstCrew(rc)
  rc.advanceToDay(FIRST_DEADLINE_DAY)
  const pending = rc.visibleState().pendingSettlement!
  rc.settleTribute(pending.legalRange.max)

  return {
    trace: rc.trace,
    hashLog: rc.hashLog,
    finalHash: rc.hashNow(),
    rngSteps: world.rng.step - rngStepsAtStart,
  }
}

describe('runner determinism: same seed replays byte-identical, a different seed diverges', () => {
  it('same seed twice: identical trace and identical hash at every step', () => {
    const a = playReserveLine(11)
    const b = playReserveLine(11)

    // Not vacuous: a genuinely populated log (>=12 day snapshots, the
    // reserve line's own day-0-through-12 span), not two empty arrays
    // trivially equal to each other.
    expect(a.hashLog.filter(h => h.kind === 'day').length).toBeGreaterThanOrEqual(12)
    expect(b.trace).toEqual(a.trace)
    expect(b.hashLog).toEqual(a.hashLog)
    expect(b.finalHash).toBe(a.finalHash)
  })

  it('different seed: same command trace and rng step count, diverging hash', () => {
    const a = playReserveLine(11)
    const b = playReserveLine(12)

    // The script is fixed (no branching on hidden state) — the ISSUED
    // commands are identical regardless of seed; only what production
    // computed from them (e.g. the settle amount, read live from
    // pending.legalRange.max) can differ.
    expect(b.trace.map(([name]) => name)).toEqual(a.trace.map(([name]) => name))

    // Act 1 has no raids (combat/resolve.ts's raidInterval('act1') is null)
    // and this line has no prospecting crew, so runHarvestDay's one
    // resolveWorm() draw per active-harvest day is the sole rng consumer —
    // a fixed count per day regardless of the roll's own value (no branch
    // in harvestRun.ts calls rng.next() again based on a prior result).
    // Same commands, same days, therefore the same number of draws.
    expect(b.rngSteps).toBe(a.rngSteps)
    expect(b.rngSteps).toBeGreaterThan(0) // the guard is not vacuously true

    expect(b.finalHash).not.toBe(a.finalHash)
  })

  it('mid-run save/reload at day 6 continues to the identical final hash', () => {
    const straight = playReserveLine(21)

    const rc = createCampaignRunner(21, 'normal')
    walkOpeningBriefing(rc)
    walkToFirstCrew(rc)
    rc.advanceToDay(6)

    const saved = rc.save()
    rc.reload(saved)

    rc.advanceToDay(FIRST_DEADLINE_DAY)
    const pending = rc.visibleState().pendingSettlement!
    rc.settleTribute(pending.legalRange.max)

    expect(rc.hashNow()).toBe(straight.finalHash)
  })
})
