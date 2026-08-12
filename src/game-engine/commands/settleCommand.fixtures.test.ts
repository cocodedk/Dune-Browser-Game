// src/game-engine/commands/settleCommand.fixtures.test.ts
// The exact fixtures docs/PRD/game-completion/02-runtime-consolidation.md's
// "Deterministic fixtures" table names for tribute (settlement-reload) plus
// 03-opening-experience.md's opening-partial-payment/opening-short-payment
// bands. The production-entry-point playability proof lives in
// settleCommand.playability.test.ts — split out (chunk W3d) once Beat 4's
// dialogue leg pushed this file past the 200-line cap.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import { serializeWorld, deserializeWorld } from '../persistence'
import { runSettleCommand } from './settleCommand'
import { DAY_SECONDS } from '../TimeSystem'
import { BRIEFING_COMPLETE_FLAG, OPENING_COMPLETE_FLAG } from '../acts/openingObjectives'
import { Q1_DEBRIEF_PENDING_FLAG, Q1_DEBRIEF_BAND_FLAG, buildPendingSettlement } from '../quota/settlement'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

function reachQ1(spice: number): void {
  const state = createInitialState()
  // pause.ts's briefingPending gate blocks processDayBoundary() until
  // briefing.complete is set — irrelevant to what these three fixtures
  // test (the settlement bands themselves), so it's set directly rather
  // than by walking the real Duke Leto tree. settleCommand.playability.
  // test.ts drives the real tree instead, since that IS part of what it
  // proves.
  state.flags[BRIEFING_COMPLETE_FLAG] = true
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
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true) // any band closes the opening (03 "Beat 7")
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
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true) // short still closes the opening
  })
})

describe('Beat 7 debrief signal: cycle 0 sets it, cycle 1 does not', () => {
  it('sets the pending flag and encodes the band on the first settlement', () => {
    reachQ1(90) // full payment
    runSettleCommand(90)

    expect(world.flags[Q1_DEBRIEF_PENDING_FLAG]).toBe(true)
    expect(world.flags[Q1_DEBRIEF_BAND_FLAG]).toBe(2) // full
  })

  it('encodes partial (1) and short (0) correctly', () => {
    reachQ1(60)
    runSettleCommand(54) // minPartialPayment — partial band
    expect(world.flags[Q1_DEBRIEF_BAND_FLAG]).toBe(1)

    reachQ1(30)
    runSettleCommand(30) // below the partial threshold — short band
    expect(world.flags[Q1_DEBRIEF_BAND_FLAG]).toBe(0)
  })

  it('does not set the signal on a later cycle (only the FIRST settlement)', () => {
    reachQ1(90)
    runSettleCommand(90) // cycle 0 -> cycle 1
    world.flags[Q1_DEBRIEF_PENDING_FLAG] = false // consumed, as the runtime hook would

    // Directly install cycle 1's pending decision rather than simulating
    // eight more days (which, with this fixture's zero-crew, zero-pledge
    // setup, risks tripping an unrelated loss_abandoned ending) — this test
    // is about the debrief SIGNAL, not day-boundary mechanics.
    world.pendingSettlement = buildPendingSettlement(world.quota, world.player.spice)
    runSettleCommand(world.pendingSettlement.legalRange.max)

    expect(world.quota.cycleIndex).toBe(2)
    expect(world.flags[Q1_DEBRIEF_PENDING_FLAG]).toBe(false)
  })
})
