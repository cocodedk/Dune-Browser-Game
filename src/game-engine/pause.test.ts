// src/game-engine/pause.test.ts

import { describe, it, expect } from 'vitest'
import { shouldPause, effectiveDelta } from './pause'
import type { PauseInputs } from './pause'

function inputs(overrides: Partial<PauseInputs> = {}): PauseInputs {
  return { manual: false, inDialogue: false, ended: false, settlementPending: false, ...overrides }
}

// ---------------------------------------------------------------------------
// shouldPause
// ---------------------------------------------------------------------------

describe('shouldPause', () => {
  it('runs when nothing is blocking', () => {
    expect(shouldPause(inputs())).toBe(false)
  })

  it('pauses for each reason independently', () => {
    expect(shouldPause(inputs({ manual: true }))).toBe(true)
    expect(shouldPause(inputs({ inDialogue: true }))).toBe(true)
    expect(shouldPause(inputs({ ended: true }))).toBe(true)
    expect(shouldPause(inputs({ settlementPending: true }))).toBe(true)
  })

  it('does not let a manual unpause resume time with a settlement pending', () => {
    // Engine-authoritative like dialogue (02 "Tribute": "the clock freezes
    // until the decision resolves") — clicking pause/unpause elsewhere must
    // not bleed the clock through a pending tribute decision either.
    expect(shouldPause(inputs({ manual: false, settlementPending: true }))).toBe(true)
  })

  it('does not let a manual unpause resume time during dialogue', () => {
    // The reasons must not cancel each other out — this is the bug that would
    // let the quota clock bleed while the player reads a conversation.
    expect(shouldPause(inputs({ manual: false, inDialogue: true }))).toBe(true)
  })

  it('stays paused after the run has ended regardless of other inputs', () => {
    expect(shouldPause(inputs({ ended: true, manual: false, inDialogue: false }))).toBe(true)
  })

  it('pauses when every reason applies at once', () => {
    expect(shouldPause(inputs({ manual: true, inDialogue: true, ended: true }))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// effectiveDelta
// ---------------------------------------------------------------------------

describe('effectiveDelta', () => {
  it('scales by speed when running', () => {
    expect(effectiveDelta(2, 1, false)).toBe(2)
    expect(effectiveDelta(2, 5, false)).toBe(10)
  })

  it('returns 0 while paused, whatever the speed', () => {
    expect(effectiveDelta(2, 5, true)).toBe(0)
    expect(effectiveDelta(100, 1, true)).toBe(0)
  })

  it('never runs the clock backwards on a negative speed', () => {
    expect(effectiveDelta(2, -3, false)).toBe(0)
  })

  it('handles a zero or negative delta without producing negative time', () => {
    expect(effectiveDelta(0, 5, false)).toBe(0)
    expect(effectiveDelta(-1, 5, false)).toBe(0)
  })

  it('is monotonic in delta at a fixed speed', () => {
    expect(effectiveDelta(1, 2, false)).toBeLessThan(effectiveDelta(2, 2, false))
  })
})
