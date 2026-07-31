// src/game-engine/sietch/assignTask.test.ts
// Unit tests for sietch task-assignment and pledge functions

import { describe, it, expect } from 'vitest'
import type { SietchState } from './types'
import { canAssignTask, assignTask, pledgeSietch } from './assignTask'

function makeSietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'sietch_tabr',
    pledgedToPlayer: false,
    fremenWorkers: 50,
    currentTask: null,
    outputProgress: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// canAssignTask
// ---------------------------------------------------------------------------

describe('canAssignTask', () => {
  it('returns false for a non-pledged sietch even with enough workers', () => {
    const s = makeSietch({ pledgedToPlayer: false, fremenWorkers: 50 })
    expect(canAssignTask(s, 'harvest_spice')).toBe(false)
  })

  it('returns false for a pledged sietch with too few workers (< 5)', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 4 })
    expect(canAssignTask(s, 'harvest_spice')).toBe(false)
  })

  it('returns true for a pledged sietch with exactly 5 workers', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 5 })
    expect(canAssignTask(s, 'harvest_spice')).toBe(true)
  })

  it('returns true for a pledged sietch with more than 5 workers', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 20 })
    expect(canAssignTask(s, 'harvest_spice')).toBe(true)
  })

  it('train_troops: returns false with too few workers (< 10)', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 9 })
    expect(canAssignTask(s, 'train_troops')).toBe(false)
  })

  it('train_troops: returns true with exactly 10 workers', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 10 })
    expect(canAssignTask(s, 'train_troops')).toBe(true)
  })

  it('train_troops: returns false when not pledged even with enough workers', () => {
    const s = makeSietch({ pledgedToPlayer: false, fremenWorkers: 50 })
    expect(canAssignTask(s, 'train_troops')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// assignTask
// ---------------------------------------------------------------------------

describe('assignTask', () => {
  it('assigns harvest_spice to a pledged, well-staffed sietch', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 10 })
    const result = assignTask([s], 'sietch_tabr', 'harvest_spice')
    expect(result[0].currentTask).toBe('harvest_spice')
  })

  it('resets outputProgress to 0 when assigning a task', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 10, outputProgress: 2.5 })
    const result = assignTask([s], 'sietch_tabr', 'harvest_spice')
    expect(result[0].outputProgress).toBe(0)
  })

  it('does not mutate the input array', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 10 })
    const input = [s]
    const result = assignTask(input, 'sietch_tabr', 'harvest_spice')
    expect(result).not.toBe(input)
  })

  it('leaves other sietches unchanged', () => {
    const s1 = makeSietch({ villageId: 'sietch_tabr', pledgedToPlayer: true, fremenWorkers: 10 })
    const s2 = makeSietch({ villageId: 'sietch_other', pledgedToPlayer: true, fremenWorkers: 10 })
    const result = assignTask([s1, s2], 'sietch_tabr', 'harvest_spice')
    expect(result.find((s) => s.villageId === 'sietch_other')).toEqual(s2)
  })

  it('returns sietch unchanged when not pledged to player', () => {
    const s = makeSietch({ pledgedToPlayer: false, fremenWorkers: 10 })
    const result = assignTask([s], 'sietch_tabr', 'harvest_spice')
    expect(result[0].currentTask).toBeNull()
  })

  it('returns sietch unchanged when worker count is too low', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 3, outputProgress: 1.5 })
    const result = assignTask([s], 'sietch_tabr', 'harvest_spice')
    expect(result[0].currentTask).toBeNull()
    expect(result[0].outputProgress).toBe(1.5)
  })

  it('assigns train_troops to a pledged sietch with enough workers', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 15 })
    const result = assignTask([s], 'sietch_tabr', 'train_troops')
    expect(result[0].currentTask).toBe('train_troops')
  })

  it('train_troops: returns sietch unchanged when worker count is too low (< 10)', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 9 })
    const result = assignTask([s], 'sietch_tabr', 'train_troops')
    expect(result[0].currentTask).toBeNull()
  })

  it('train_troops: resets outputProgress to 0 when assigning', () => {
    const s = makeSietch({ pledgedToPlayer: true, fremenWorkers: 15, outputProgress: 1.5 })
    const result = assignTask([s], 'sietch_tabr', 'train_troops')
    expect(result[0].outputProgress).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// pledgeSietch
// ---------------------------------------------------------------------------

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
