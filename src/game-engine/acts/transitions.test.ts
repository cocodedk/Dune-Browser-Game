// src/game-engine/acts/transitions.test.ts

import { describe, it, expect } from 'vitest'
import {
  evaluateEnding,
  evaluateActTransition,
  evaluateAct,
  actQuotaMultiplier,
  ACT_ORDER,
} from './transitions'
import type { ActWorldView, ActId } from './transitions'

function view(overrides: Partial<ActWorldView> = {}): ActWorldView {
  return {
    act: 'act1',
    quotasPaid: 0,
    pledgedCount: 0,
    charisma: 20,
    patience: 3,
    raidsRepelled: 0,
    maxRegionVegetation: 0,
    fortsDestroyed: 0,
    capitalFortDestroyed: false,
    palaceHeld: true,
    greenRegions: 0,
    averagePledgedLoyalty: 0,
    countdownExpired: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Act 1 -> Act 2
// ---------------------------------------------------------------------------

describe('act 1 exit', () => {
  it('requires both three tributes and three sietches', () => {
    expect(evaluateActTransition(view({ quotasPaid: 3, pledgedCount: 2 }))).toBeNull()
    expect(evaluateActTransition(view({ quotasPaid: 2, pledgedCount: 3 }))).toBeNull()
    expect(evaluateActTransition(view({ quotasPaid: 3, pledgedCount: 3 }))).toBe('act2')
  })

  it('stays satisfied beyond the thresholds', () => {
    expect(evaluateActTransition(view({ quotasPaid: 9, pledgedCount: 6 }))).toBe('act2')
  })
})

// ---------------------------------------------------------------------------
// Later acts
// ---------------------------------------------------------------------------

describe('later act exits', () => {
  it('gates act 2 on raids, greening and charisma together', () => {
    const nearly = view({ act: 'act2', raidsRepelled: 2, maxRegionVegetation: 30, charisma: 49 })
    expect(evaluateActTransition(nearly)).toBeNull()
    expect(evaluateActTransition({ ...nearly, charisma: 50 })).toBe('act3')
  })

  it('gates act 3 on two forts', () => {
    expect(evaluateActTransition(view({ act: 'act3', fortsDestroyed: 1 }))).toBeNull()
    expect(evaluateActTransition(view({ act: 'act3', fortsDestroyed: 2 }))).toBe('act4')
  })

  it('never advances past act 4', () => {
    expect(evaluateActTransition(view({ act: 'act4', fortsDestroyed: 9 }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Endings
// ---------------------------------------------------------------------------

describe('endings', () => {
  it('ends the run when patience is exhausted', () => {
    expect(evaluateEnding(view({ patience: 0 }))).toBe('loss_patience')
  })

  it('ends the run when the palace falls', () => {
    expect(evaluateEnding(view({ palaceHeld: false }))).toBe('loss_palace')
  })

  it('does not call an opening with no sietches abandonment', () => {
    // A player on day 1 has not been abandoned — they have not started.
    expect(evaluateEnding(view({ pledgedCount: 0, quotasPaid: 0 }))).toBeNull()
  })

  it('ends the run once every sietch is lost after a real start', () => {
    expect(evaluateEnding(view({ pledgedCount: 0, quotasPaid: 2 }))).toBe('loss_abandoned')
  })

  it('awards the ecology win only in act 4 and only on both conditions', () => {
    const green = view({ act: 'act4', greenRegions: 3, averagePledgedLoyalty: 80 })
    expect(evaluateEnding(green)).toBe('win_ecology')
    expect(evaluateEnding({ ...green, averagePledgedLoyalty: 79 })).toBeNull()
    expect(evaluateEnding({ ...green, act: 'act3' })).toBeNull()
  })

  it('awards the military win on the capital fort in act 4', () => {
    expect(evaluateEnding(view({ act: 'act4', capitalFortDestroyed: true })))
      .toBe('win_military')
  })

  it('prefers a loss over a simultaneous win', () => {
    // Losing the palace on the same day the capital falls is still a loss.
    const both = view({ act: 'act4', capitalFortDestroyed: true, palaceHeld: false })
    expect(evaluateEnding(both)).toBe('loss_palace')
  })
})

// ---------------------------------------------------------------------------
// evaluateAct — the single day-boundary entry point
// ---------------------------------------------------------------------------

describe('evaluateAct', () => {
  it('reports no change on an ordinary day', () => {
    expect(evaluateAct(view())).toEqual({ ending: null, nextAct: null })
  })

  it('advances when the exit conditions are met', () => {
    expect(evaluateAct(view({ quotasPaid: 3, pledgedCount: 3 })))
      .toEqual({ ending: null, nextAct: 'act2' })
  })

  it('lets an ending pre-empt an act advance on the same day', () => {
    // Both fire together: the run is over, so advancing would be nonsense.
    const result = evaluateAct(view({ quotasPaid: 3, pledgedCount: 3, patience: 0 }))
    expect(result.ending).toBe('loss_patience')
    expect(result.nextAct).toBeNull()
  })

  it('is stable — evaluating twice gives the same answer', () => {
    const v = view({ quotasPaid: 3, pledgedCount: 3 })
    expect(evaluateAct(v)).toEqual(evaluateAct(v))
  })
})

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

describe('actQuotaMultiplier', () => {
  it('escalates in the later acts', () => {
    expect(actQuotaMultiplier('act1')).toBe(1)
    expect(actQuotaMultiplier('act2')).toBe(1)
    expect(actQuotaMultiplier('act3')).toBe(1.5)
    expect(actQuotaMultiplier('act4')).toBe(1.5)
  })

  it('never reduces the demand', () => {
    for (const act of ACT_ORDER) {
      expect(actQuotaMultiplier(act as ActId)).toBeGreaterThanOrEqual(1)
    }
  })
})
