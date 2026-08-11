// src/game-engine/commands/settleCommand.fixtures.test.ts
// The exact fixtures docs/PRD/game-completion/02-runtime-consolidation.md's
// "Deterministic fixtures" table names for tribute (settlement-reload) plus
// 03-opening-experience.md's opening-partial-payment/opening-short-payment
// bands, and one production-entry-point proof that a fresh campaign can
// reach and resolve Q1 through the same commands the UI dispatches.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import { serializeWorld, deserializeWorld } from '../persistence'
import { runSettleCommand } from './settleCommand'
import { runPledgeCommand } from './pledgeCommand'
import { assignCrew } from '../EconomySystem'
import { DAY_SECONDS } from '../TimeSystem'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

function reachQ1(spice: number): void {
  const state = createInitialState()
  state.player.spice = spice
  setWorld(state)
  initLoop()
  for (let d = 0; d <= 12; d++) advanceToDay(d) // FIRST_DEADLINE_DAY
}

describe('settlement-reload: same decision survives a save/load round trip', () => {
  it('carries identical amount/options, settles exactly once, and refuses a second settle', () => {
    reachQ1(60)
    expect(world.pendingSettlement).not.toBeNull()
    const beforeReload = world.pendingSettlement

    const reloaded = deserializeWorld(serializeWorld(world))

    expect(reloaded.pendingSettlement).toEqual(beforeReload)
    setWorld(reloaded)

    const outcome = runSettleCommand(60)
    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(1)
    const nextDeadline = world.quota.nextDueDay

    const second = runSettleCommand(1)
    expect(second).toEqual({ ok: false, reason: 'no-pending-settlement' })
    expect(world.quota.cycleIndex).toBe(1) // unchanged — one settlement, one next deadline
    expect(world.quota.nextDueDay).toBe(nextDeadline)
  })
})

describe('opening-partial-payment: paying exactly the minimum partial threshold', () => {
  it('holds patience, carries 45 arrears after the surcharge, and advances the deadline', () => {
    reachQ1(60) // due 90; minPartialPayment = round(90 * 0.6) = 54
    const patienceBefore = world.quota.patience

    const outcome = runSettleCommand(54)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.quota.patience).toBe(patienceBefore) // held, not restored (not full) or lost
    expect(world.quota.arrears).toBe(45) // round((90-54) * 1.25)
    expect(world.quota.nextDueDay).toBe(12 + 8)
    expect(world.ending).toBeNull()
  })
})

describe('opening-short-payment: reaching day 12 below the minimum partial threshold', () => {
  it('applies once, loses one patience, carries the full shortfall, and the campaign continues', () => {
    reachQ1(30) // below 54 — the fixture's own legal range caps at 30
    expect(world.pendingSettlement?.legalRange.max).toBe(30)
    const patienceBefore = world.quota.patience

    const outcome = runSettleCommand(30)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.quota.patience).toBe(patienceBefore - 1)
    expect(world.quota.arrears).toBe(60) // 90 - 30, no surcharge below the partial band
    expect(world.ending).toBeNull() // patience started at 3; one loss does not end the run
    expect(world.player.spice).toBe(0)
  })
})

describe('playability: a fresh campaign can pledge, earn, and reach and resolve Q1 through production commands', () => {
  it('pledges Red Wall, orders its crew to harvest, reaches the day-12 decision, and settles it', () => {
    const state = createInitialState()
    state.player.location = 'red_wall_sietch' // loyalty 80 at opening — no gift/dialogue setup needed
    setWorld(state)
    initLoop()

    const pledge = runPledgeCommand('red_wall_sietch')
    expect(pledge).toEqual({ ok: true, code: 'pledged' })

    assignCrew('group_red_wall_sietch', 'harvest', 'field_red_wall_pan')
    const crew = world.troopGroups.find(g => g.id === 'group_red_wall_sietch')
    expect(crew?.task).toBe('harvest')

    for (let d = 0; d <= 12; d++) advanceToDay(d)

    expect(world.pendingSettlement).not.toBeNull()
    const amount = world.pendingSettlement!.legalRange.max

    const outcome = runSettleCommand(amount)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(1)
  })
})
