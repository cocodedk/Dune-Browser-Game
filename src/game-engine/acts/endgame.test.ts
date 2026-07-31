// src/game-engine/acts/endgame.test.ts

import { describe, it, expect } from 'vitest'
import {
  checkAssault,
  assaultRefusalMessage,
  impossibleDemand,
  makeChoice,
  tickCountdown,
  submissionSurvivable,
  countdownExpired,
  destroyedCount,
  capitalDestroyed,
  RAID_SKILL_REQUIRED,
  DEFIANCE_COUNTDOWN_DAYS,
  ACT4_DEMAND_MULTIPLIER,
} from './endgame'
import type { FortState, AssaultRefusal } from './endgame'

function fort(overrides: Partial<FortState> = {}): FortState {
  return { locationId: 'carthag', strength: 200, isCapital: false, destroyed: false, ...overrides }
}

// ---------------------------------------------------------------------------
// Assault gating
// ---------------------------------------------------------------------------

describe('checkAssault', () => {
  const ready = { size: 40, militarySkill: RAID_SKILL_REQUIRED }

  it('accepts a drilled force against a standing outpost', () => {
    expect(checkAssault(fort(), ready, 0)).toEqual({ ok: true })
  })

  it('refuses a fort already taken', () => {
    expect(checkAssault(fort({ destroyed: true }), ready, 0))
      .toEqual({ ok: false, reason: 'already-destroyed' })
  })

  it('refuses an undrilled force', () => {
    expect(checkAssault(fort(), { ...ready, militarySkill: RAID_SKILL_REQUIRED - 1 }, 0))
      .toEqual({ ok: false, reason: 'untrained' })
  })

  it('refuses a token force', () => {
    expect(checkAssault(fort(), { ...ready, size: 19 }, 0))
      .toEqual({ ok: false, reason: 'too-few' })
  })

  it('locks the capital until two outposts have fallen', () => {
    // The endgame must not be rushable past the war that gives it meaning.
    const capital = fort({ isCapital: true })
    expect(checkAssault(capital, ready, 1)).toEqual({ ok: false, reason: 'capital-locked' })
    expect(checkAssault(capital, ready, 2)).toEqual({ ok: true })
  })

  it('gives a distinct message per refusal', () => {
    const reasons: AssaultRefusal[] = [
      'already-destroyed', 'untrained', 'too-few', 'capital-locked',
    ]
    const messages = reasons.map(assaultRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
  })
})

// ---------------------------------------------------------------------------
// The impossible demand
// ---------------------------------------------------------------------------

describe('impossibleDemand', () => {
  it('is twice what the player could actually reach', () => {
    // Computed live so it is always exactly out of reach, rather than
    // arbitrarily cruel or accidentally payable.
    expect(impossibleDemand(200, 300)).toBe(500 * ACT4_DEMAND_MULTIPLIER)
  })

  it('scales with a stronger operation', () => {
    expect(impossibleDemand(1000, 2000)).toBeGreaterThan(impossibleDemand(100, 200))
  })

  it('stays meaningful for a player with nothing', () => {
    expect(impossibleDemand(0, 0)).toBeGreaterThan(0)
  })

  it('is never payable from current capacity', () => {
    for (const [stock, income] of [[0, 0], [100, 100], [5000, 5000]]) {
      expect(impossibleDemand(stock, income)).toBeGreaterThan(stock + income)
    }
  })

  it('ignores negative inputs', () => {
    expect(impossibleDemand(-500, -500)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// The final choice
// ---------------------------------------------------------------------------

describe('the final choice', () => {
  it('starts a countdown only on defiance', () => {
    expect(makeChoice('defy').countdown).toBe(DEFIANCE_COUNTDOWN_DAYS)
    expect(makeChoice('submit').countdown).toBe(0)
  })

  it('counts down day by day', () => {
    let state = makeChoice('defy')
    state = tickCountdown(state)
    expect(state.countdown).toBe(DEFIANCE_COUNTDOWN_DAYS - 1)
  })

  it('never counts below zero', () => {
    let state = makeChoice('defy')
    for (let i = 0; i < 50; i++) state = tickCountdown(state)
    expect(state.countdown).toBe(0)
  })

  it('does not tick for a player who submitted', () => {
    const state = tickCountdown(makeChoice('submit'))
    expect(state.countdown).toBe(0)
  })

  it('reports expiry only after defiance runs out', () => {
    let state = makeChoice('defy')
    expect(countdownExpired(state)).toBe(false)
    for (let i = 0; i < DEFIANCE_COUNTDOWN_DAYS; i++) state = tickCountdown(state)
    expect(countdownExpired(state)).toBe(true)
  })

  it('never reports expiry for submission', () => {
    expect(countdownExpired(makeChoice('submit'))).toBe(false)
  })

  it('keeps submission survivable — a choice that cannot win is not a choice', () => {
    expect(submissionSurvivable(1)).toBe(true)
    expect(submissionSurvivable(0)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Fort aggregates
// ---------------------------------------------------------------------------

describe('fort aggregates', () => {
  const forts = [
    fort({ locationId: 'a', destroyed: true }),
    fort({ locationId: 'b', destroyed: true }),
    fort({ locationId: 'c' }),
    fort({ locationId: 'capital', isCapital: true }),
  ]

  it('counts destroyed forts for the act 3 gate', () => {
    expect(destroyedCount(forts)).toBe(2)
  })

  it('reports the capital separately', () => {
    expect(capitalDestroyed(forts)).toBe(false)
    expect(capitalDestroyed([...forts, fort({ isCapital: true, destroyed: true })])).toBe(true)
  })

  it('handles an empty fort list', () => {
    expect(destroyedCount([])).toBe(0)
    expect(capitalDestroyed([])).toBe(false)
  })
})
