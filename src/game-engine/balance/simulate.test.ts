// src/game-engine/balance/simulate.test.ts
// These are BALANCE tests, not unit tests. They assert that the design's
// promises hold across whole playthroughs — the things no single-function test
// can see.

import { describe, it, expect } from 'vitest'
import { simulate, theoreticalDailyMax } from './simulate'
import type { Strategy, SimCrew } from './simulate'
import { impossibleDemand } from '../acts/endgame'

const ACT1_DAYS = 24 // three quota cycles

// ---------------------------------------------------------------------------
// The central promise: skill should separate outcomes
// ---------------------------------------------------------------------------

describe('strategies produce different outcomes', () => {
  // KNOWN BALANCE DEFECT, recorded deliberately rather than hidden.
  //
  // Under current tuning the harvester is never purchasable in Act 1: before
  // Q1 the player needs their cash for tribute, and afterwards they never
  // rebuild a 100-spice surplus before the next deadline. So the "optimal"
  // and "hoarder" lines produce identical income, which means the capex
  // decision the whole slice is built around does not actually exist yet.
  //
  // Act 1 income is ~470 spice against quotas totalling 800. Either the
  // quota curve must fall or income must rise; that is a design call, not a
  // silent code change, so it is surfaced here instead of tuned away.
  //
  // This test will FAIL once the tuning is fixed. That is intended — it is a
  // tripwire that forces this comment to be revisited.
  it('documents that the harvester is currently unaffordable in Act 1', () => {
    const optimal = simulate('optimal', ACT1_DAYS)
    const hoarder = simulate('hoarder', ACT1_DAYS)
    expect(optimal.totalEarned).toBeCloseTo(hoarder.totalEarned, 5)
  })

  it('records the Act 1 income shortfall against the quota curve', () => {
    const optimal = simulate('optimal', ACT1_DAYS)
    const quotaTotal = 100 + 250 + 450
    const available = optimal.totalEarned + 60 // plus starting spice
    expect(available).toBeLessThan(quotaTotal)
  })

  it('punishes the naive single-crew player', () => {
    const naive = simulate('naive', ACT1_DAYS)
    const optimal = simulate('optimal', ACT1_DAYS)
    expect(naive.totalEarned).toBeLessThan(optimal.totalEarned)
    expect(naive.finalPatience).toBeLessThanOrEqual(optimal.finalPatience)
  })

  it('does not let every strategy converge to the same result', () => {
    const results = (['optimal', 'greedy-harvest', 'hoarder', 'naive'] as Strategy[])
      .map(s => Math.round(simulate(s, ACT1_DAYS).totalEarned))
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Survivability — the design's recoverability promise
// ---------------------------------------------------------------------------

describe('survivability', () => {
  it('lets a competent player clear Act 1', () => {
    const result = simulate('optimal', ACT1_DAYS)
    expect(result.survived).toBe(true)
    expect(result.cyclesSettled).toBeGreaterThanOrEqual(3)
  })

  it('never loses patience faster than one per cycle', () => {
    // Patience can only fall on a due day, so a sudden collapse would mean a
    // settlement bug rather than a hard game.
    for (const strategy of ['optimal', 'greedy-harvest', 'hoarder', 'naive'] as Strategy[]) {
      const trace = simulate(strategy, ACT1_DAYS).patienceTrace
      for (let i = 1; i < trace.length; i++) {
        expect(trace[i]).toBeGreaterThanOrEqual(trace[i - 1] - 1)
      }
    }
  })

  it('is harder on hard difficulty than on easy', () => {
    const easy = simulate('optimal', ACT1_DAYS, 0.75)
    const hard = simulate('optimal', ACT1_DAYS, 1.3)
    expect(hard.finalPatience).toBeLessThanOrEqual(easy.finalPatience)
  })

  it('keeps easy difficulty comfortably survivable', () => {
    expect(simulate('optimal', ACT1_DAYS, 0.75).survived).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Determinism — the harness is only useful if reproducible
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('produces identical results for identical inputs', () => {
    expect(simulate('optimal', ACT1_DAYS)).toEqual(simulate('optimal', ACT1_DAYS))
  })

  it('runs a long game without diverging or throwing', () => {
    const long = simulate('optimal', 120)
    expect(Number.isFinite(long.totalEarned)).toBe(true)
    expect(long.totalEarned).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Act 4's demand, sized against real capacity
// ---------------------------------------------------------------------------

describe('the Act 4 demand', () => {
  const crews: SimCrew[] = [
    { size: 60, spiceSkill: 100, morale: 100, tier: 'heavy_harvester' },
    { size: 60, spiceSkill: 100, morale: 100, tier: 'heavy_harvester' },
  ]

  it('exceeds even a fully built-out operation', () => {
    const perDay = theoreticalDailyMax(crews, 90)
    const overCycle = perDay * 8
    expect(impossibleDemand(0, overCycle)).toBeGreaterThan(overCycle)
  })

  it('scales with the player rather than being a flat wall', () => {
    const weak = impossibleDemand(50, 100)
    const strong = impossibleDemand(2000, 4000)
    expect(strong).toBeGreaterThan(weak * 5)
  })
})

// ---------------------------------------------------------------------------
// Recorded baselines
// ---------------------------------------------------------------------------

describe('recorded baselines', () => {
  it('records Act 1 income for the optimal line', () => {
    // Not a correctness assertion — a tripwire. If a tuning change moves this
    // materially, the change was bigger than intended and wants a second look.
    const result = simulate('optimal', ACT1_DAYS)
    expect(result.totalEarned).toBeGreaterThan(250)
    expect(result.totalEarned).toBeLessThan(2000)
  })
})
