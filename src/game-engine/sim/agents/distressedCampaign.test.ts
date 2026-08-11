// src/game-engine/sim/agents/distressedCampaign.test.ts
// Pins the recovery fixture reading owed since progress.md Round 16: patience
// 1, real arrears, a threatened pledge, and a fully worked-out field — see
// distressedCampaign.ts's own module doc for what is played versus hand-set.

import { describe, it, expect } from 'vitest'
import { distressedCampaign } from './distressedCampaign'
import { STARTING_PATIENCE } from '../../quota/quota'
import { UNPLEDGE_THRESHOLD, PLEDGE_THRESHOLD } from '../../sietch/loyalty'

describe('distressedCampaign: the recorded reading (07\'s recovery row)', () => {
  it('patience 1, real arrears, a threatened pledge, a fully worked field', () => {
    const { reading } = distressedCampaign(1)

    expect(reading.patience).toBe(1)
    expect(reading.patience).toBeLessThan(STARTING_PATIENCE)
    expect(reading.arrears).toBeGreaterThan(0)
    expect(reading.amountDue).toBeGreaterThan(reading.arrears) // due includes a live cycle amount too

    // "Threatened" per this fixture's own margin: above the unpledge floor
    // (still a real pledge to protect) but close enough that neglect alone
    // could cross it soon.
    expect(reading.pledgeLoyalty).toBeGreaterThan(UNPLEDGE_THRESHOLD)
    expect(reading.pledgeLoyalty).toBeLessThan(UNPLEDGE_THRESHOLD + 10)
    expect(reading.pledgeLoyalty).toBeLessThan(PLEDGE_THRESHOLD)

    expect(reading.fieldRemaining).toBe(0)
    expect(reading.handSet).toHaveLength(2)
  })

  it('deterministic: same seed produces the same reading', () => {
    const a = distressedCampaign(5).reading
    const b = distressedCampaign(5).reading

    expect(b).toEqual(a)
  })

  it('the handed-off runner is live: recovery can decide from it immediately', () => {
    const { runner } = distressedCampaign(2)
    const view = runner.visibleState()

    expect(view.quota.patience).toBe(1)
    expect(view.dialogue).toBeNull() // no open decision blocking the caller
    expect(runner.isBlocked()).toBe(false)
  })
})
