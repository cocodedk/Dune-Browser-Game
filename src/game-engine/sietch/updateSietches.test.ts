// src/game-engine/sietch/updateSietches.test.ts

import { describe, it, expect } from 'vitest'
import type { SietchState } from './types'
import { updateSietches } from './updateSietches'

function makeSietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'sietch_tabr',
    pledgedToPlayer: true,
    fremenWorkers: 50,
    currentTask: 'harvest_spice',
    outputProgress: 0,
    ...overrides,
  }
}

// ── Idle / unpledged ────────────────────────────────────────────────────────

describe('idle and unpledged sietches', () => {
  it('unpledged sietch with no task is returned unchanged with no payout', () => {
    const s = makeSietch({ pledgedToPlayer: false, currentTask: null })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0]).toBe(s)
    expect(payouts).toHaveLength(0)
  })

  it('pledged sietch with no task is returned unchanged with no payout', () => {
    const s = makeSietch({ currentTask: null })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0]).toBe(s)
    expect(payouts).toHaveLength(0)
  })

  it('unpledged sietch that somehow has a task is returned unchanged with no payout', () => {
    const s = makeSietch({ pledgedToPlayer: false, currentTask: 'harvest_spice' })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0]).toBe(s)
    expect(payouts).toHaveLength(0)
  })
})

// ── harvest_spice progress accumulation ────────────────────────────────────

describe('progress accumulation (harvest_spice)', () => {
  it('50 workers at 0 progress → progress 1.0 after one call, no payout', () => {
    const { sietches, payouts } = updateSietches([makeSietch({ fremenWorkers: 50, outputProgress: 0 })])
    expect(sietches[0].outputProgress).toBeCloseTo(1.0)
    expect(payouts).toHaveLength(0)
  })

  it('25 workers at 0 progress → progress 0.5 after one call, no payout', () => {
    const { sietches, payouts } = updateSietches([makeSietch({ fremenWorkers: 25, outputProgress: 0 })])
    expect(sietches[0].outputProgress).toBeCloseTo(0.5)
    expect(payouts).toHaveLength(0)
  })
})

// ── harvest_spice payout trigger ───────────────────────────────────────────

describe('payout trigger (harvest_spice)', () => {
  it('50 workers at progress 2.5 → spice payout emitted and progress reset to 0', () => {
    const s = makeSietch({ fremenWorkers: 50, outputProgress: 2.5 })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0].outputProgress).toBe(0)
    expect(payouts).toHaveLength(1)
    expect(payouts[0]).toEqual({ kind: 'spice', villageId: 'sietch_tabr', amount: 12 })
  })

  it('currentTask remains harvest_spice after payout (sietch keeps working)', () => {
    const s = makeSietch({ fremenWorkers: 50, outputProgress: 2.5 })
    const { sietches } = updateSietches([s])
    expect(sietches[0].currentTask).toBe('harvest_spice')
  })
})

// ── train_troops progress accumulation ────────────────────────────────────

describe('progress accumulation (train_troops)', () => {
  it('50 workers at 0 progress → progress 1.0 after one call, no payout', () => {
    const s = makeSietch({ currentTask: 'train_troops', fremenWorkers: 50, outputProgress: 0 })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0].outputProgress).toBeCloseTo(1.0)
    expect(payouts).toHaveLength(0)
  })

  it('25 workers at 0 progress → progress 0.5 after one call, no payout', () => {
    const s = makeSietch({ currentTask: 'train_troops', fremenWorkers: 25, outputProgress: 0 })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0].outputProgress).toBeCloseTo(0.5)
    expect(payouts).toHaveLength(0)
  })
})

// ── train_troops payout trigger ────────────────────────────────────────────

describe('payout trigger (train_troops)', () => {
  it('50 workers at progress 2.5 → troops payout emitted and progress reset to 0', () => {
    const s = makeSietch({ currentTask: 'train_troops', fremenWorkers: 50, outputProgress: 2.5 })
    const { sietches, payouts } = updateSietches([s])
    expect(sietches[0].outputProgress).toBe(0)
    expect(payouts).toHaveLength(1)
    expect(payouts[0]).toEqual({ kind: 'troops', villageId: 'sietch_tabr', amount: 6 })
  })

  it('currentTask remains train_troops after payout (sietch keeps working)', () => {
    const s = makeSietch({ currentTask: 'train_troops', fremenWorkers: 50, outputProgress: 2.5 })
    const { sietches } = updateSietches([s])
    expect(sietches[0].currentTask).toBe('train_troops')
  })
})

// ── Multiple sietches ───────────────────────────────────────────────────────

describe('multiple sietches', () => {
  it('two pledged sietches both at 2.5 progress (harvest) → both emit spice payouts', () => {
    const a = makeSietch({ villageId: 'sietch_tabr', fremenWorkers: 50, outputProgress: 2.5 })
    const b = makeSietch({ villageId: 'sietch_red_wall', fremenWorkers: 50, outputProgress: 2.5 })
    const { payouts } = updateSietches([a, b])
    expect(payouts).toHaveLength(2)
    const ids = payouts.map((p) => p.villageId)
    expect(ids).toContain('sietch_tabr')
    expect(ids).toContain('sietch_red_wall')
    payouts.forEach(p => expect(p.kind).toBe('spice'))
  })

  it('mix of pledged and unpledged — only pledged contributes payout', () => {
    const pledged = makeSietch({ villageId: 'sietch_tabr', fremenWorkers: 50, outputProgress: 2.5 })
    const unpledged = makeSietch({ villageId: 'sietch_red_wall', pledgedToPlayer: false, outputProgress: 2.5 })
    const { payouts } = updateSietches([pledged, unpledged])
    expect(payouts).toHaveLength(1)
    expect(payouts[0].villageId).toBe('sietch_tabr')
  })

  it('mixed tasks: one harvesting + one training both pay out in same call', () => {
    const harvester = makeSietch({
      villageId: 'sietch_tabr',
      currentTask: 'harvest_spice',
      fremenWorkers: 50,
      outputProgress: 2.5,
    })
    const trainer = makeSietch({
      villageId: 'sietch_red_wall',
      currentTask: 'train_troops',
      fremenWorkers: 50,
      outputProgress: 2.5,
    })
    const { payouts } = updateSietches([harvester, trainer])
    expect(payouts).toHaveLength(2)
    const spicePayout = payouts.find(p => p.kind === 'spice')
    const troopsPayout = payouts.find(p => p.kind === 'troops')
    expect(spicePayout?.villageId).toBe('sietch_tabr')
    expect(spicePayout?.amount).toBe(12)
    expect(troopsPayout?.villageId).toBe('sietch_red_wall')
    expect(troopsPayout?.amount).toBe(6)
  })
})

// ── Immutability ────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('returned sietches array is a new reference', () => {
    const input = [makeSietch()]
    const { sietches } = updateSietches(input)
    expect(sietches).not.toBe(input)
  })

  it('input sietch objects are not mutated', () => {
    const s = makeSietch({ outputProgress: 0 })
    const progressBefore = s.outputProgress
    updateSietches([s])
    expect(s.outputProgress).toBe(progressBefore)
  })

  it('input sietch object reference is unchanged when no mutation occurs', () => {
    const s = makeSietch({ currentTask: null })
    const { sietches } = updateSietches([s])
    expect(sietches[0]).toBe(s)
  })
})
