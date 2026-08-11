// src/game-engine/dayRunner.settlement.test.ts
// Fixtures for chunk W2c's pending-settlement day-boundary behavior:
// creation payload, engine-authoritative pause, auto-shipment settling
// without pausing (including a same-day ending), and the mid-catch-up
// freeze/resume regression this chunk's advisor review named — a jump
// that crosses the deadline mid-catch-up must rewind bookkeeping to the
// day the decision was created, not the jump's original target, or the
// days between get silently skipped once the decision resolves.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'
import { runSettleCommand } from './commands/settleCommand'
import { AUTO_SHIP_UNLOCKED_FLAG, AUTO_SHIP_ENABLED_FLAG } from './quota/settlement'
import { DAY_SECONDS } from './TimeSystem'
import type { WorldState } from '../types'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

/** Same alignment helper dayRunner.determinism.test.ts uses. */
function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

function withProspectingCrew(seed: number): WorldState {
  const state = createInitialState(seed)
  state.troopGroups = [{
    id: 'group_tabr_1', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
    size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60, task: 'prospect', taskTargetId: null, changeoverDaysLeft: 0,
  }]
  return state
}

describe('runTributeCheck: creates the pending decision at the deadline', () => {
  it('snapshots the quota/stock into the payload, and pauses — a huge delta advances nothing', () => {
    const state = createInitialState(2)
    state.quota.nextDueDay = 3
    state.player.spice = 40
    setWorld(state)
    initLoop()

    advanceToDay(0); advanceToDay(1); advanceToDay(2); advanceToDay(3)

    expect(world.pendingSettlement).not.toBeNull()
    expect(world.pendingSettlement?.dueDay).toBe(3)
    expect(world.pendingSettlement?.amountDue).toBe(90)
    expect(world.pendingSettlement?.stock).toBe(40)
    expect(world.pendingSettlement?.legalRange).toEqual({ min: 0, max: 40 })
    expect(world.quota.cycleIndex).toBe(0) // still unsettled

    const timeAtPause = world.time
    update(1000) // shouldPause must ignore this delta entirely
    expect(world.time).toBe(timeAtPause)
  })
})

describe('auto-shipment: settles automatically at the deadline, never pausing', () => {
  it('deducts spice and advances the deadline with no pending decision ever appearing', () => {
    const state = createInitialState(4)
    state.quota.nextDueDay = 3
    state.player.spice = 200
    state.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1
    state.flags[AUTO_SHIP_ENABLED_FLAG] = 1
    setWorld(state)
    initLoop()

    advanceToDay(0); advanceToDay(1); advanceToDay(2); advanceToDay(3)

    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(1)
    expect(world.player.spice).toBe(110) // 200 - 90 (full due, the default configured amount)
  })

  it('can end the run same day via the shared ending authority, with no decision ever created', () => {
    const state = createInitialState(4)
    state.quota.nextDueDay = 3
    state.quota.patience = 1
    state.player.spice = 0
    state.flags[AUTO_SHIP_UNLOCKED_FLAG] = 1
    state.flags[AUTO_SHIP_ENABLED_FLAG] = 1
    setWorld(state)
    initLoop()

    advanceToDay(0); advanceToDay(1); advanceToDay(2); advanceToDay(3)

    expect(world.pendingSettlement).toBeNull()
    expect(world.ending).toBe('loss_patience')
  })
})

describe('mid-catch-up freeze: a jump crossing the deadline rewinds, and resuming does not skip the days after it', () => {
  it('processes days 13-15 once resumed, not just day 15, after a jump that froze at day 12', () => {
    setWorld(withProspectingCrew(17))
    initLoop()

    // Play normally to day 5, then jump far ahead in one call — the
    // "restored tab" shape this fixture targets.
    for (let d = 0; d <= 5; d++) advanceToDay(d)
    const stepAtDay5 = world.rng.step

    world.time = 20 * DAY_SECONDS - 1
    update(1) // days 6-20 crossed in one call; day 12's deadline freezes it mid-loop

    expect(world.pendingSettlement).not.toBeNull()
    expect(world.lastProcessedDay).toBe(12) // rewound, not left at 20
    expect(world.time).toBe(12 * DAY_SECONDS) // rewound, not the jump's target
    const stepAtFreeze = world.rng.step
    expect(stepAtFreeze).toBeGreaterThan(stepAtDay5) // days 6-12 genuinely ran

    runSettleCommand(0) // resolve it — 0 is always in range

    // Resume with another single jump straight to day 15. Each day a
    // prospecting crew is out unconditionally draws at least one roll
    // (economy/prospectRun.ts's revealDesertSite) — a skip of days 13-14
    // would leave the step delta at a one-day floor instead of a three-day
    // one.
    world.time = 15 * DAY_SECONDS - 1
    update(1)

    expect(world.lastProcessedDay).toBe(15)
    expect(world.rng.step - stepAtFreeze).toBeGreaterThanOrEqual(3)
  })
})
