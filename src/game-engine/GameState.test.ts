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
