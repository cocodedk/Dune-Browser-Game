// src/game-engine/GameState.test.ts
// createInitialState is the production entry point for the canonical
// campaign opening. docs/PRD/game-completion/02-runtime-consolidation.md,
// "Deterministic fixtures" table, `new-campaign-normal`: "Start a Normal
// run" -> "Arrakeen, day 0, 60 spice, no pledge, no crew, Q1 90/day 12, no
// faction-AI event." (The faction-AI clause belongs to the GameLoop task
// that stops calling the emergent sim in campaign mode, not to this
// package's contract-opening scope, so it is not asserted here.)

import { describe, it, expect } from 'vitest'
import { createInitialState } from './GameState'

describe('createInitialState: new-campaign-normal fixture', () => {
  it('starts the player at Arrakeen', () => {
    expect(createInitialState().player.location).toBe('arrakeen')
  })

  it('starts on day 0', () => {
    expect(createInitialState().time).toBe(0)
  })

  it('starts with 60 spice', () => {
    // 00-index.md "Opening state": 60 spice — a deliberate change from the
    // prior 0, so the starting harvester purchase decision is reachable.
    expect(createInitialState().player.spice).toBe(60)
  })

  it('has no pledged sietches', () => {
    const world = createInitialState()
    expect(world.sietches.length).toBeGreaterThan(0)
    expect(world.sietches.every(s => s.pledgedToPlayer === false)).toBe(true)
  })

  it('has no operational crew', () => {
    expect(createInitialState().troopGroups).toEqual([])
  })

  it('sets Q1 to 90 spice due on day 12', () => {
    const world = createInitialState()
    expect(world.quota.amount).toBe(90)
    expect(world.quota.nextDueDay).toBe(12)
  })

  it('initializes rng from the seed parameter, at step 0', () => {
    expect(createInitialState(42).rng).toEqual({ seed: 42, step: 0 })
  })

  it('defaults to a fixed, deterministic seed when none is given', () => {
    // Every existing call site invoking createInitialState() with no
    // argument must keep producing the exact same opening it always has —
    // which also proves the default cannot come from Date.now() or
    // Math.random(), either of which would differ between these two calls.
    expect(createInitialState().rng).toEqual(createInitialState().rng)
    expect(createInitialState().rng.step).toBe(0)
  })
})

// 03-opening-experience.md "Title and run setup": "Difficulty is written
// once into campaign state and cannot change until another new campaign
// begins." createInitialState is that one write site — see ui/title/
// NewCampaignPanel.tsx's single call to store.ts's newGame(difficulty).
// The negative half of "written once" (no other production writer exists)
// is proven at runtime by runtime/CommandWiring.test.ts's "an untyped
// game:difficulty emission changes nothing" test, and at the type level by
// 'game:difficulty' being absent from types.bus.ts's BusEvents entirely.
describe('createInitialState: difficulty is written once, at construction', () => {
  it('defaults to normal when no difficulty is given', () => {
    expect(createInitialState().difficulty).toBe('normal')
  })

  it('writes the chosen difficulty onto world.difficulty', () => {
    expect(createInitialState(1, 'easy').difficulty).toBe('easy')
    expect(createInitialState(1, 'hard').difficulty).toBe('hard')
  })

  it('threads difficulty into the seeded quota, not just the label — Q1 scales with it from frame one', () => {
    // difficulty.ts's real quotaMultiplier values: easy 0.75, normal 1.0,
    // hard 1.3, against the base Q1 amount of 90 (quota/quota.ts's
    // BASE_AMOUNTS[0]), rounded by createQuotaState itself
    // (Math.round(90 * 0.75) = 68, not 67.5).
    expect(createInitialState(1, 'easy').quota.amount).toBe(68)
    expect(createInitialState(1, 'normal').quota.amount).toBe(90)
    expect(createInitialState(1, 'hard').quota.amount).toBe(117)
  })
})
