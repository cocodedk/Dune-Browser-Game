// src/game-engine/dayRunner.quarantine.test.ts
// Fixture: no-faction (docs/PRD/game-completion/08-execution-plan.md WP01
// exit proof: "the ... no-faction fixture ... pass[es] through production
// engine entry points"). Proves the campaign day path never touches the
// emergent faction simulation, the multi-faction goal AI, or the Harkonnen
// village-attack timer — all quarantined per
// baseline/legacy-authority-inventory.md category 1.
//
// factionProfiles/regions/aiTimers are asserted untouched rather than "no
// faction_decision event was emitted": at the time this fixture was written,
// the legacy VillageSystem.updateVillages rebellion check (kept running —
// see dayRunner.ts's LEGACY PRODUCTION SEAM) pushed that exact same event
// type on loyalty collapse, so an event-type filter alone would have been a
// false signal. WP02e removed that seam entirely (updateVillages no longer
// exists), so nothing in the campaign day path pushes 'faction_decision'
// today — the field-level assertions below remain the direct proof either
// way. updateFactionAI/executeGoals push events without mutating state, so
// they are proven not-called directly.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'
import { BRIEFING_COMPLETE_FLAG } from './acts/openingObjectives'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

vi.mock('./AISystem', () => ({
  updateAI: vi.fn(),
  updateFactionAI: vi.fn(),
}))

vi.mock('./faction/GoalExecutor', () => ({
  executeGoals: vi.fn(),
}))

import { updateAI, updateFactionAI } from './AISystem'
import { executeGoals } from './faction/GoalExecutor'

describe('no-faction: campaign day path never touches the retired faction/AI authority', () => {
  it('leaves factionProfiles/regions/aiTimers untouched and never calls the quarantined systems, after several days', () => {
    const state = createInitialState(7)
    // W3a: pause.ts's briefingPending gate blocks processDayBoundary() until
    // briefing.complete is set — irrelevant to what this fixture tests.
    state.flags[BRIEFING_COMPLETE_FLAG] = true
    setWorld(state)
    initLoop()

    const factionProfilesBefore = JSON.parse(JSON.stringify(world.factionProfiles))
    const regionsBefore = JSON.parse(JSON.stringify(world.regions))
    const aiTimersBefore = JSON.parse(JSON.stringify(world.aiTimers))

    // Several days, comfortably short of the day-12 quota deadline.
    update(1)
    for (let i = 0; i < 5; i++) update(60)

    expect(world.factionProfiles).toEqual(factionProfilesBefore)
    expect(world.regions).toEqual(regionsBefore)
    expect(world.aiTimers).toEqual(aiTimersBefore)
    expect(updateAI).not.toHaveBeenCalled()
    expect(updateFactionAI).not.toHaveBeenCalled()
    expect(executeGoals).not.toHaveBeenCalled()
  })
})
