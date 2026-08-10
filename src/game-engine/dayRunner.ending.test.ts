// src/game-engine/dayRunner.ending.test.ts
// Fixtures: campaign-goal-authority and the patience-0 single-writer proof
// for the EconomySystem.runQuotaCheck / acts/transitions.ts ending-writer
// collapse (docs/PRD/game-completion/02-runtime-consolidation.md "Campaign
// status": "world.act and world.ending are the only progression authority").

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from './GameLoop'
import { world, setWorld, createInitialState } from './GameState'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('campaign-goal-authority: full village ownership does not end the run', () => {
  it('leaves world.ending null across several act-2 days when every village is player-owned', () => {
    const state = createInitialState(5)
    state.act = 'act2'
    state.flags['act'] = 2
    // Isolate ending authority from tribute settlement — that path is
    // covered by the patience-0 fixture below, not this one.
    state.quota.nextDueDay = 999
    state.villages = state.villages.map(v => ({ ...v, owner: 'player' as const, status: 'friendly' as const }))
    setWorld(state)
    initLoop()

    update(1)
    for (let i = 0; i < 5; i++) update(60)

    expect(world.act).toBe('act2') // no premature/unintended act jump either
    expect(world.ending).toBeNull()
    expect(world.goalAchieved).toBe(false)
  })
})

describe('patience-0: runActCheck is the sole ending writer', () => {
  it('lands loss_patience the same day patience hits 0, with exactly one ending event', () => {
    const state = createInitialState(9)
    state.quota.patience = 1
    state.quota.nextDueDay = 0 // due immediately, on day 0
    state.quota.amount = 100
    state.quota.arrears = 0
    state.player.spice = 0 // nothing to pay -> 'short' band -> patience 1 -> 0
    setWorld(state)
    initLoop()

    update(1) // day-0 boundary: runQuotaCheck settles, then runActCheck ends the run

    expect(world.quota.patience).toBe(0)
    expect(world.ending).toBe('loss_patience')
    expect(world.goalAchieved).toBe(true)

    const endingEvents = world.events.filter(e => e.type === 'poc_goal_achieved')
    expect(endingEvents).toHaveLength(1)
    expect(endingEvents[0].message).toBe('The Emperor recalls you. Arrakis is taken from your house.')
  })
})
