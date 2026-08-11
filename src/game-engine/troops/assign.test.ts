// src/game-engine/troops/assign.test.ts

import { describe, it, expect } from 'vitest'
import { checkAssign, assignRefusalMessage, applyAssign } from './assign'
import { MIN_TASK_SIZE, CHANGEOVER_DAYS } from './types'
import type { AssignRefusal } from './assign'
import type { TroopGroup, SpiceField } from './types'

function group(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'g1',
    homeSietchId: 'sietch_tabr',
    locationId: 'sietch_tabr',
    size: 30,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60,
    task: 'idle',
    taskTargetId: null,
    changeoverDaysLeft: 0,
    ...overrides,
  }
}

function field(overrides: Partial<SpiceField> = {}): SpiceField {
  return {
    id: 'f1',
    regionId: 'r1',
    position: { x: 0, y: 0 },
    discovered: true,
    density: 50,
    capacity: 400,
    remaining: 400,
    ...overrides,
  }
}

describe('checkAssign: harvest', () => {
  it('accepts a valid harvest assignment', () => {
    expect(checkAssign({ group: group(), task: 'harvest', target: field(), hasThopter: false }))
      .toEqual({ ok: true })
  })

  it('refuses a crew below the minimum size', () => {
    expect(checkAssign({
      group: group({ size: MIN_TASK_SIZE - 1 }), task: 'harvest', target: field(), hasThopter: false,
    })).toEqual({ ok: false, reason: 'too-small' })
  })

  it('refuses harvest with no field chosen', () => {
    expect(checkAssign({ group: group(), task: 'harvest', target: undefined, hasThopter: false }))
      .toEqual({ ok: false, reason: 'no-target' })
  })

  it('refuses an undiscovered field', () => {
    expect(checkAssign({
      group: group(), task: 'harvest', target: field({ discovered: false }), hasThopter: false,
    })).toEqual({ ok: false, reason: 'target-undiscovered' })
  })

  it('refuses a worked-out field', () => {
    expect(checkAssign({
      group: group(), task: 'harvest', target: field({ remaining: 0 }), hasThopter: false,
    })).toEqual({ ok: false, reason: 'target-exhausted' })
  })

  it('refuses a no-op reassignment to the same task and field', () => {
    // Otherwise the player pays a changeover day for clicking the button twice.
    expect(checkAssign({
      group: group({ task: 'harvest', taskTargetId: 'f1' }),
      task: 'harvest', target: field(), hasThopter: false,
    })).toEqual({ ok: false, reason: 'already-assigned' })
  })

  it('allows switching to a different field', () => {
    expect(checkAssign({
      group: group({ task: 'harvest', taskTargetId: 'f1' }),
      task: 'harvest', target: field({ id: 'f2' }), hasThopter: false,
    })).toEqual({ ok: true })
  })
})

describe('checkAssign: prospect', () => {
  it('requires an ornithopter', () => {
    expect(checkAssign({ group: group(), task: 'prospect', target: undefined, hasThopter: false }))
      .toEqual({ ok: false, reason: 'needs-thopter' })
  })

  it('accepts prospecting with a thopter and no field target', () => {
    expect(checkAssign({ group: group(), task: 'prospect', target: undefined, hasThopter: true }))
      .toEqual({ ok: true })
  })
})

describe('assignRefusalMessage', () => {
  it('gives a distinct non-empty message per reason', () => {
    const reasons: AssignRefusal[] = [
      'too-small', 'no-target', 'target-undiscovered',
      'target-exhausted', 'already-assigned', 'needs-thopter',
    ]
    const messages = reasons.map(assignRefusalMessage)
    expect(new Set(messages).size).toBe(reasons.length)
    for (const m of messages) expect(m.length).toBeGreaterThan(0)
  })
})

describe('applyAssign', () => {
  it('sets task and target and starts a changeover', () => {
    const g = applyAssign(group(), 'harvest', 'f1')
    expect(g.task).toBe('harvest')
    expect(g.taskTargetId).toBe('f1')
    expect(g.changeoverDaysLeft).toBe(CHANGEOVER_DAYS)
  })

  it('charges no changeover for standing down', () => {
    // Standing a crew down should never be punished.
    const g = applyAssign(group({ task: 'harvest', taskTargetId: 'f1' }), 'idle', null)
    expect(g.task).toBe('idle')
    expect(g.changeoverDaysLeft).toBe(0)
  })

  it('does not mutate the original group', () => {
    const original = group()
    applyAssign(original, 'harvest', 'f1')
    expect(original.task).toBe('idle')
    expect(original.taskTargetId).toBeNull()
  })
})
