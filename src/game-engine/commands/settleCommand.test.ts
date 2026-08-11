// src/game-engine/commands/settleCommand.test.ts
// CommandOutcome behavior for the settle command (chunk W2c):
// no-pending-settlement, range refusals, exactly-once application, and the
// shared ending authority (economy/actRun.ts's evaluateEndingAuthority)
// assigning a loss when settlement empties patience.

import { describe, it, expect, beforeEach } from 'vitest'
import { runSettleCommand } from './settleCommand'
import { world, setWorld, createInitialState } from '../GameState'
import { buildPendingSettlement, AUTO_SHIP_UNLOCKED_FLAG } from '../quota/settlement'

function withPendingSettlement(stock: number): void {
  const state = createInitialState()
  state.player.spice = stock
  state.pendingSettlement = buildPendingSettlement(state.quota, stock)
  setWorld(state)
}

describe('runSettleCommand', () => {
  beforeEach(() => {
    setWorld(createInitialState())
  })

  it('refuses no-pending-settlement when nothing is due', () => {
    const outcome = runSettleCommand(50)
    expect(outcome).toEqual({ ok: false, reason: 'no-pending-settlement' })
  })

  it('applies a full payment exactly once: deducts spice, clears the decision, advances the deadline', () => {
    withPendingSettlement(200) // amount 90, so full payment is affordable
    const dueBefore = world.pendingSettlement!.amountDue
    const cycleBefore = world.quota.cycleIndex
    const dueDayBefore = world.quota.nextDueDay

    const outcome = runSettleCommand(dueBefore)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.player.spice).toBe(200 - dueBefore)
    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(cycleBefore + 1)
    expect(world.quota.nextDueDay).toBeGreaterThan(dueDayBefore)
  })

  it('unlocks auto-shipment on the first completed settlement', () => {
    withPendingSettlement(200)
    expect(world.flags[AUTO_SHIP_UNLOCKED_FLAG]).toBeUndefined()

    runSettleCommand(0) // any band counts, including 'short'

    expect(world.flags[AUTO_SHIP_UNLOCKED_FLAG]).toBe(1)
  })

  it('a second dispatch after settling refuses no-pending-settlement, granting nothing twice', () => {
    withPendingSettlement(200)
    const first = runSettleCommand(90)
    expect(first.ok).toBe(true)
    const spiceAfterFirst = world.player.spice
    const cycleAfterFirst = world.quota.cycleIndex

    const second = runSettleCommand(90)

    expect(second).toEqual({ ok: false, reason: 'no-pending-settlement' })
    expect(world.player.spice).toBe(spiceAfterFirst)
    expect(world.quota.cycleIndex).toBe(cycleAfterFirst)
  })

  it('refuses a negative amount without mutating the pending decision', () => {
    withPendingSettlement(200)

    const outcome = runSettleCommand(-1)

    expect(outcome).toEqual({ ok: false, reason: 'amount-negative' })
    expect(world.pendingSettlement).not.toBeNull()
    expect(world.player.spice).toBe(200)
  })

  it('refuses an amount beyond the legal range without mutating anything', () => {
    withPendingSettlement(50) // legal range [0, 50]

    const outcome = runSettleCommand(51)

    expect(outcome).toEqual({ ok: false, reason: 'amount-exceeds-available' })
    expect(world.pendingSettlement).not.toBeNull()
    expect(world.player.spice).toBe(50)
  })

  it('assigns loss_patience as the settle command, not the day boundary, when payment empties patience', () => {
    const state = createInitialState()
    state.quota.patience = 1
    state.player.spice = 0
    state.pendingSettlement = buildPendingSettlement(state.quota, 0)
    setWorld(state)

    const outcome = runSettleCommand(0) // 'short' band -> patience 1 -> 0

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.quota.patience).toBe(0)
    expect(world.ending).toBe('loss_patience')
    expect(world.goalAchieved).toBe(true)
    expect(world.pendingSettlement).toBeNull()
  })
})
