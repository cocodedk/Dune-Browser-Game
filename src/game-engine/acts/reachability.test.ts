// src/game-engine/acts/reachability.test.ts
// Can the game actually be finished?
//
// This exists because the answer was no, and nothing noticed. The act2 -> act3
// transition gates on charisma >= 50; charisma starts at 20 and *nothing in
// the entire codebase ever wrote to it*. Acts 3 and 4, the forts, the endgame
// and every act-based ending were unreachable in normal play, behind 871
// passing tests.
//
// Every test here asserts progress is possible, not that a formula is correct.

import { describe, it, expect } from 'vitest'
import { evaluateActTransition, evaluateEnding } from './transitions'
import type { ActWorldView } from './transitions'
import {
  CHARISMA_PER_PLEDGE, CHARISMA_PER_QUOTA, CHARISMA_PER_RAID,
} from '../sietch/loyalty'

const STARTING_CHARISMA = 20

const view = (over: Partial<ActWorldView> = {}): ActWorldView => ({
  act: 'act1',
  quotasPaid: 0,
  pledgedCount: 0,
  charisma: STARTING_CHARISMA,
  patience: 3,
  raidsRepelled: 0,
  maxRegionVegetation: 0,
  fortsDestroyed: 0,
  capitalFortDestroyed: false,
  palaceHeld: true,
  greenRegions: 0,
  averagePledgedLoyalty: 0,
  countdownExpired: false,
  ...over,
})

describe('act progression is reachable', () => {
  it('advances out of act 1 on deeds a player can actually do', () => {
    expect(evaluateActTransition(view({ quotasPaid: 3, pledgedCount: 3 }))).toBe('act2')
  })

  it('can reach the charisma the act 3 gate demands', () => {
    // The exact deadlock that shipped: this threshold was unreachable because
    // no code path increased charisma at all.
    const earned = STARTING_CHARISMA
      + 3 * CHARISMA_PER_PLEDGE
      + 3 * CHARISMA_PER_QUOTA
      + 2 * CHARISMA_PER_RAID
    expect(earned).toBeGreaterThanOrEqual(50)
  })

  it('advances out of act 2 once that renown is earned', () => {
    const earned = STARTING_CHARISMA + 3 * CHARISMA_PER_PLEDGE + 3 * CHARISMA_PER_QUOTA
      + 2 * CHARISMA_PER_RAID
    expect(evaluateActTransition(view({
      act: 'act2', quotasPaid: 5, pledgedCount: 4, charisma: earned,
      raidsRepelled: 2, maxRegionVegetation: 30,
    }))).toBe('act3')
  })

  it('reaches a winning ending rather than only losing ones', () => {
    const military = evaluateEnding(view({
      act: 'act4', capitalFortDestroyed: true, fortsDestroyed: 3,
      charisma: 60, pledgedCount: 4, quotasPaid: 6,
    }))
    expect(military).toBe('win_military')
  })

  it('still ends badly when the player earns that instead', () => {
    expect(evaluateEnding(view({ patience: 0 }))).toBe('loss_patience')
    expect(evaluateEnding(view({ palaceHeld: false }))).toBe('loss_palace')
  })
})

describe('renown is granted, not merely required', () => {
  it('rewards every deed the act gates ask about', () => {
    // A gate on a stat nothing awards is a wall, not a gate. If any of these
    // ever returns to zero, the game becomes unfinishable again.
    expect(CHARISMA_PER_PLEDGE).toBeGreaterThan(0)
    expect(CHARISMA_PER_QUOTA).toBeGreaterThan(0)
    expect(CHARISMA_PER_RAID).toBeGreaterThan(0)
  })
})
