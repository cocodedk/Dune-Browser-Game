// src/game-engine/dayRunner.sessionBoundary.test.ts
// Regression coverage for the three production session-boundary failures in
// docs/PRD/game-completion/baseline/wp01-critic-verdict.md's "biggest gap":
// day-boundary bookkeeping now lives on `world.lastProcessedDay` (types.ts,
// TimeSystem.ts's crossedDays()), not a TimeSystem module-global, so
// `setWorld()`/serialization carry it correctly by construction. Each test
// drives the EXACT production sequence the audit measured — store.ts's
// Load (setWorld only, no initLoop), New (resetWorld + setWorld, no
// initLoop), and main.tsx/ThreeContainer's reload (deserialize + initLoop)
// — not a hand-rolled shortcut. serializeWorld/deserializeWorld (now
// canonical-envelope-backed, persistence.ts) stand in for the production
// save/load path minus the IndexedDB transport, which vitest's `node`
// environment cannot provide.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState, resetWorld } from './GameState'
import { serializeWorld, deserializeWorld } from './persistence'
import { hashState } from './state/hash'
import { DAY_SECONDS } from './TimeSystem'
import { BRIEFING_COMPLETE_FLAG } from './acts/openingObjectives'
import type { WorldState } from '../types'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

/**
 * A prospecting crew (proves rng.step moves) plus a SECOND crew harvesting a
 * discovered field (proves spice moves too — crew harvest is the sole spice
 * authority since WP02e removed VillageSystem's updateVillages/
 * collectPlayerSpice, legacy-authority-inventory.md category 2). A prospect
 * crew alone earns no spice, so it cannot by itself distinguish "day
 * boundaries fire" from "day boundaries are inert". No equipment (hand-tier
 * extraction) avoids worm rolls, which would otherwise make rng.step
 * comparisons across the control/actual branches path-dependent. Quota
 * pushed out so tribute settlement never interferes with these bookkeeping
 * checks.
 */
function withProspectingCrewAndVillage(seed: number): WorldState {
  const state = createInitialState(seed)
  // W3a: pause.ts's briefingPending gate blocks processDayBoundary() until
  // briefing.complete is set — irrelevant to what this fixture tests, so
  // it's set directly rather than through the (out-of-scope) stand-in
  // dialogue.
  state.flags[BRIEFING_COMPLETE_FLAG] = true
  state.troopGroups = [
    {
      id: 'group_tabr_1', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
      size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
      morale: 60, task: 'prospect', taskTargetId: null, changeoverDaysLeft: 0,
    },
    {
      id: 'group_tabr_2', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
      size: 30, skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
      morale: 60, task: 'harvest', taskTargetId: 'field_session_boundary', changeoverDaysLeft: 0,
    },
  ]
  state.spiceFields = [
    ...state.spiceFields,
    {
      id: 'field_session_boundary', regionId: 'sietch_tabr', position: { x: 0, y: 0 },
      discovered: true, density: 60, capacity: 1000, remaining: 1000,
    },
  ]
  state.equipment = []
  state.quota.nextDueDay = 9999
  return state
}

/** Same alignment helper dayRunner.determinism.test.ts uses. */
function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

describe('production Load: in-session Load does not replay intervening days', () => {
  it('day-5 save loaded mid-session at day 8, then replayed forward to day 8 again, matches an uninterrupted day-8-plus-one-frame control', () => {
    const seed = 41

    // CONTROL: uninterrupted play straight through to day 8, one ordinary
    // extra frame — no save/load anywhere in this branch.
    setWorld(withProspectingCrewAndVillage(seed)); initLoop()
    for (let d = 0; d <= 8; d++) advanceToDay(d)
    update(1) // mid-day-8 frame; deliberately short of day 9's boundary
    const controlSpice = world.player.spice
    const controlStep = world.rng.step
    const controlQuota = world.quota.cycleIndex

    // ACTUAL: identical replay to day 5, save via the production save path,
    // keep playing the SAME live session on to day 8 (its bookkeeping now
    // sits at 8), then Load via store.ts's exact sequence — `setWorld
    // (loaded)` only, no `initLoop()` — which swaps in the day-5 snapshot
    // and its OWN bookkeeping. Days 6, 7, 8 have never happened on THIS
    // (loaded) timeline, so it must process them once each, exactly like
    // the control — this is where the historical bug bit: a stale
    // module-level `lastDay` left at 8 from the pre-Load phase made
    // `day <= lastDay` true for 6, 7, AND 8, silently skipping all three
    // rather than replaying them (baseline/wp01-critic-verdict.md PROBE B).
    setWorld(withProspectingCrewAndVillage(seed)); initLoop()
    for (let d = 0; d <= 5; d++) advanceToDay(d)
    const daySaveBlob = serializeWorld(world) // production save path
    for (let d = 6; d <= 8; d++) advanceToDay(d) // keep playing past the save
    setWorld(deserializeWorld(daySaveBlob)) // store.ts loadGame(): setWorld only, NO initLoop
    for (let d = 6; d <= 8; d++) advanceToDay(d) // the loaded timeline's own days 6-8
    update(1)

    // Compared field-by-field, not via hashState: the two branches'
    // world.events legitimately carry different id numbering (the ACTUAL
    // branch's discarded pre-Load "keep playing to day 8" detour consumes
    // extra ids from EventSystem's module-level counter, which — correctly
    // — Load does not reset). That is a test-harness artifact of running
    // two branches in one module, not a game-state difference; the fields
    // that ARE meant to be identical (progress, RNG, tribute) are asserted
    // directly instead.
    expect(world.player.spice).toBe(controlSpice)
    expect(world.rng.step).toBe(controlStep)
    expect(world.quota.cycleIndex).toBe(controlQuota)
  })
})

describe('production New: a fresh mid-session campaign processes its own day boundaries', () => {
  it('days 0-2 of a New campaign advance rng/spice even though the old session reached day 20', () => {
    const seed = 41

    // A live session that reached day 20 — stale bookkeeping the New
    // sequence must discard, not resync against.
    setWorld(withProspectingCrewAndVillage(seed)); initLoop()
    for (let d = 0; d <= 20; d++) advanceToDay(d)

    // Production New sequence (store.ts newGame(difficulty), chunk W3b):
    // setWorld(createInitialState(seed, difficulty)) replaces the engine's
    // world with a brand-new state — no initLoop() call, exactly like
    // loadGame(). resetWorld() stands in for that call here: difficulty
    // only ever affects world.difficulty/world.quota's multiplier (see
    // GameState.ts), never lastProcessedDay/rng bookkeeping, so it is an
    // exact stand-in for this test's purposes. IndexedDB's deleteSave() and
    // the React store update are UI-layer concerns outside game-engine's
    // surface; neither touches day bookkeeping.
    resetWorld()
    setWorld(withProspectingCrewAndVillage(seed))

    const beforeStep = world.rng.step
    const beforeSpice = world.player.spice
    for (let d = 0; d <= 2; d++) advanceToDay(d)

    expect(world.rng.step).toBeGreaterThan(beforeStep)
    expect(world.player.spice).not.toBe(beforeSpice)
  })
})

describe('production reload: the first frame after loading does not re-run the saved day', () => {
  it('matches an uninterrupted day-5-plus-one-frame control after save -> deserialize -> initLoop -> update', () => {
    const seed = 41

    // CONTROL: uninterrupted play to day 5, one ordinary extra frame.
    setWorld(withProspectingCrewAndVillage(seed)); initLoop()
    for (let d = 0; d <= 5; d++) advanceToDay(d)
    update(1)
    const controlStep = world.rng.step
    const controlHash = hashState(world)

    // ACTUAL: identical replay to day 5, save via the production save path,
    // then the real reload sequence (chunk W3b: a reload always re-shows
    // the title screen — see ui/store.ts's `screen` doc) — the title's
    // Continue button calls store.ts's loadGame(), which deserializes into
    // a fresh world object via setWorld(), then ThreeContainer's mount
    // (deferred until `screen` flips to 'game') calls GameDriver.initLoop()
    // before the first frame. No player command in between.
    setWorld(withProspectingCrewAndVillage(seed)); initLoop()
    for (let d = 0; d <= 5; d++) advanceToDay(d)
    const daySaveBlob = serializeWorld(world)
    setWorld(deserializeWorld(daySaveBlob))
    initLoop()
    update(1)

    expect(world.rng.step).toBe(controlStep)
    expect(hashState(world)).toBe(controlHash)
  })
})
