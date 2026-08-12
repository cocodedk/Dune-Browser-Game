// src/game-engine/sietch/assignTask.test.ts
// Unit tests for the pledge helper.
//
// canAssignTask/assignTask coverage removed in WP02e along with the
// functions themselves (legacy-authority-inventory.md category 2) —
// SietchState.currentTask/outputProgress production is gone; crews are the
// sole production authority now.

import { describe, it, expect } from 'vitest'
import type { SietchState } from './types'
import { pledgeSietch } from './assignTask'

function makeSietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'sietch_tabr',
    pledgedToPlayer: false,
    fremenWorkers: 50,
    ...overrides,
  }
}

describe('pledgeSietch', () => {
  it('sets pledgedToPlayer = true on the matching sietch', () => {
    const s = makeSietch({ pledgedToPlayer: false })
    const result = pledgeSietch([s], 'sietch_tabr')
    expect(result[0].pledgedToPlayer).toBe(true)
  })

  it('is idempotent — pledging twice returns the same state', () => {
    const s = makeSietch({ pledgedToPlayer: true })
    const once = pledgeSietch([s], 'sietch_tabr')
    const twice = pledgeSietch(once, 'sietch_tabr')
    expect(twice[0].pledgedToPlayer).toBe(true)
    expect(once[0]).toBe(twice[0]) // same object reference — no unnecessary copy
  })

  it('leaves other sietches unchanged', () => {
    const s1 = makeSietch({ villageId: 'sietch_tabr' })
    const s2 = makeSietch({ villageId: 'sietch_other' })
    const result = pledgeSietch([s1, s2], 'sietch_tabr')
    expect(result.find((s) => s.villageId === 'sietch_other')).toEqual(s2)
  })
})
