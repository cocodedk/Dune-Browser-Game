// src/game-engine/dayRunner.determinism.test.ts
// Fixtures from docs/PRD/game-completion/02-runtime-consolidation.md
// "Deterministic fixtures": multi-day-catch-up and seeded-prospect. Both go
// through the production GameLoop.update()/initLoop() entry points, driving
// a prospecting crew so the day's one seeded RngService (dayRunner.ts) is
// actually exercised — a prospect task avoids harvestRun's worm mechanics,
// which would otherwise make wormSightings.atTime sensitive to the exact
// intra-day world.time value (see advanceToDay below).

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'
import { hashState } from './state/hash'
import { DAY_SECONDS } from './TimeSystem'
import type { WorldState } from '../types'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

/** A fresh campaign with one crew prospecting from day 0. */
function withProspectingCrew(seed: number): WorldState {
  const state = createInitialState(seed)
  state.troopGroups = [{
    id: 'group_tabr_1', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
    size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60, task: 'prospect', taskTargetId: null, changeoverDaysLeft: 0,
  }]
  return state
}

/**
 * Land world.time on exactly `day * DAY_SECONDS` and process it.
 * dayRunner.ts's processDayBoundary() pins each intermediate day of a
 * multi-day jump to exactly `day * DAY_SECONDS` too, so driving one-day-at-a
 * -time calls through this same exact alignment makes a batched jump and N
 * separate one-day calls produce byte-identical timestamps/events, not just
 * equal world-state content.
 */
function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

describe('multi-day-catch-up: one jump equals three one-day calls', () => {
  it('day 2 -> day 5 in one call matches three separate day calls (identical hashState)', () => {
    const seed = 11

    // Branch A: replay to day 2, then jump straight to day 5 in one call.
    setWorld(withProspectingCrew(seed))
    initLoop()
    advanceToDay(0); advanceToDay(1); advanceToDay(2)
    world.time = 5 * DAY_SECONDS - 1 // one call short of day 5 — a single jump
    update(1)
    const hashA = hashState(world)
    const rngStepA = world.rng.step

    // Branch B: the same replay to day 2, then three separate one-day calls.
    setWorld(withProspectingCrew(seed))
    initLoop()
    advanceToDay(0); advanceToDay(1); advanceToDay(2)
    advanceToDay(3); advanceToDay(4); advanceToDay(5)
    const hashB = hashState(world)
    const rngStepB = world.rng.step

    expect(rngStepA).toBeGreaterThan(0) // days 3-5 actually drew rolls
    expect(hashA).toBe(hashB)
    expect(rngStepA).toBe(rngStepB)
  })
})

describe('seeded-prospect: identical seed and command sequence twice', () => {
  it('produces identical hashState and identical world.rng.step', () => {
    const seed = 23
    const days = [0, 1, 2, 3, 4]

    setWorld(withProspectingCrew(seed))
    initLoop()
    for (const day of days) advanceToDay(day)
    const hash1 = hashState(world)
    const step1 = world.rng.step

    setWorld(withProspectingCrew(seed))
    initLoop()
    for (const day of days) advanceToDay(day)
    const hash2 = hashState(world)
    const step2 = world.rng.step

    expect(step1).toBeGreaterThan(0)
    expect(hash1).toBe(hash2)
    expect(step1).toBe(step2)
  })
})

describe('save-load reset: the first update after loading a mid-campaign save processes only that day', () => {
  it('does not backfill days 0..39 when loading a day-40 save (one pending decision, not four settlements)', () => {
    // TimeSystem.crossedDays()'s null sentinel is what makes this true: with
    // a `-1` sentinel, this first update() would compute [0..40] and replay
    // 40 days (cycles due at 12, 20, 28, 36) in one call. Still valid under
    // the current semantics — the sentinel now lives on
    // world.lastProcessedDay rather than a TimeSystem module variable (see
    // its doc comment), but `createInitialState()` still seeds it `null`,
    // so this fixture still exercises the exact same "first call after a
    // fresh state" path. It does NOT cover the three production
    // session-boundary failures (in-session Load, New, reload) baseline/
    // wp01-critic-verdict.md found this fixture blind to — see
    // dayRunner.sessionBoundary.test.ts for those, driven through the real
    // production save/load sequences instead of a hand-built `state.time`.
    //
    // Chunk W2c update (cited): tribute no longer auto-settles from stock
    // (EconomySystem.ts's runTributeCheck), so the symptom this fixture
    // reads moved from `quota.cycleIndex` (which no longer advances without
    // a settle command) to `lastProcessedDay` and `pendingSettlement` —
    // the direct outputs of the exact backfill hazard this fixture targets.
    // `cycleIndex` stays 0 (unsettled) either way, which is itself part of
    // the proof: a backfill bug replaying days 12/20/28/36 would still only
    // ever produce ONE pending decision (dayRunner.ts's pause-on-pending
    // break stops the loop the moment the first one is created), so
    // `lastProcessedDay` is the assertion that actually discriminates a
    // backfill from the correct single-day path.
    const state = createInitialState(3)
    state.time = 40 * DAY_SECONDS
    state.quota.nextDueDay = 12
    setWorld(state)
    initLoop()

    update(1)

    expect(world.lastProcessedDay).toBe(40) // not resynced from day 0
    expect(world.quota.cycleIndex).toBe(0) // unsettled: no auto-settle anymore
    expect(world.pendingSettlement).not.toBeNull()
    expect(world.pendingSettlement?.cycleIndex).toBe(0)
  })
})
