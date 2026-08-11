// src/game-engine/economy/actRun.test.ts
// averagePledgedSietchLoyalty: SietchState is the sole loyalty authority for
// pledged sietches (docs/PRD/game-completion/02-runtime-consolidation.md
// "Sietches and loyalty") — the corresponding Village's `loyalty` is never
// consulted, even when it disagrees.

import { describe, it, expect } from 'vitest'
import { averagePledgedSietchLoyalty } from './actRun'
import type { SietchState } from '../sietch/types'

function sietch(overrides: Partial<SietchState>): SietchState {
  return {
    villageId: 'x', pledgedToPlayer: true, fremenWorkers: 20, ...overrides,
  }
}

describe('averagePledgedSietchLoyalty', () => {
  it('averages loyalty across pledged sietches only', () => {
    const sietches = [
      sietch({ villageId: 'a', loyalty: 80 }),
      sietch({ villageId: 'b', loyalty: 40 }),
      sietch({ villageId: 'c', loyalty: 100, pledgedToPlayer: false }), // unpledged: excluded
    ]

    expect(averagePledgedSietchLoyalty(sietches)).toBe(60)
  })

  it('is 0 when nothing is pledged', () => {
    const sietches = [sietch({ villageId: 'a', loyalty: 90, pledgedToPlayer: false })]

    expect(averagePledgedSietchLoyalty(sietches)).toBe(0)
  })

  it('never reads a would-be Village loyalty value — only the SietchState field', () => {
    // A sietch whose own loyalty (20) deliberately disagrees with what a
    // corresponding Village.loyalty might say (see data/sietches.ts vs
    // data/villages.ts) proves the average tracks the sietch, not a village
    // lookup — there is no village argument this function could even read.
    const sietches = [sietch({ villageId: 'a', loyalty: 20 })]

    expect(averagePledgedSietchLoyalty(sietches)).toBe(20)
  })

  it('falls back to 0, not NaN, for a sietch predating the loyalty field', () => {
    // A pre-chunk save or an out-of-scope test fixture (see sietch/types.ts's
    // SietchState doc) omits `loyalty` entirely — the documented default
    // must hold rather than an in-memory migration adapter being required.
    const sietches: SietchState[] = [
      { villageId: 'legacy', pledgedToPlayer: true, fremenWorkers: 50 },
    ]

    expect(averagePledgedSietchLoyalty(sietches)).toBe(0)
    expect(Number.isNaN(averagePledgedSietchLoyalty(sietches))).toBe(false)
  })

  it('mixes a legacy (fieldless) sietch and a modern one without producing NaN', () => {
    const sietches: SietchState[] = [
      { villageId: 'legacy', pledgedToPlayer: true, fremenWorkers: 50 },
      sietch({ villageId: 'modern', loyalty: 60 }),
    ]

    expect(averagePledgedSietchLoyalty(sietches)).toBe(30)
  })
})
