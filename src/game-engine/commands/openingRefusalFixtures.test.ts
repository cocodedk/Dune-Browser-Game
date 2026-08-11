// src/game-engine/commands/openingRefusalFixtures.test.ts
// Chunk W3g: the two 03-opening-experience.md "Deterministic fixtures" rows
// that prove a refusal, not a success — `opening-low-trust` and
// `opening-charisma-cap`. Engine-level: the current/required values and the
// mutation-free guarantee are the CommandOutcome contract's job; the
// recovery-route TEXT is a UI-layer concern already proven live for the
// identical PledgePanel.tsx/recoveryHint code path in opening3.spec.ts (the
// Tabr-45 low-trust case) — same component, same reason codes, so this file
// does not duplicate that browser-level proof for Red Wall specifically.

import { describe, it, expect } from 'vitest'
import { world, setWorld, createInitialState } from '../GameState'
import { runPledgeCommand } from './pledgeCommand'
import { PLEDGE_THRESHOLD, CHARISMA_PER_PLEDGE, maxPledged } from '../sietch/loyalty'

describe('opening-low-trust: Red Wall forced to loyalty 59', () => {
  it('refuses not-loyal-enough, exposes the current/required values, and mutates nothing', () => {
    const state = createInitialState()
    state.player.location = 'red_wall_sietch'
    state.sietches = state.sietches.map(s =>
      s.villageId === 'red_wall_sietch' ? { ...s, loyalty: 59 } : s,
    )
    setWorld(state)
    const charismaBefore = world.charisma

    const outcome = runPledgeCommand('red_wall_sietch')

    expect(outcome).toEqual({ ok: false, reason: 'not-loyal-enough' })
    // Current/required — PledgePanel.tsx renders exactly these two numbers.
    expect(world.sietches.find(s => s.villageId === 'red_wall_sietch')?.loyalty).toBe(59)
    expect(PLEDGE_THRESHOLD).toBe(60)
    // No mutation on refusal.
    expect(world.charisma).toBe(charismaBefore)
    expect(world.troopGroups).toHaveLength(0)
    expect(world.sietches.find(s => s.villageId === 'red_wall_sietch')?.pledgedToPlayer).toBe(false)
  })
})

describe('opening-charisma-cap: two real pledges fill the cap, a third is refused', () => {
  it('refuses charisma-cap on the third attempt via the real chain, with no mutation', () => {
    const state = createInitialState()
    state.player.location = 'red_wall_sietch'
    state.sietches = state.sietches.map(s => {
      if (s.villageId === 'red_wall_sietch') return { ...s, loyalty: PLEDGE_THRESHOLD }
      if (s.villageId === 'sietch_tabr') return { ...s, loyalty: PLEDGE_THRESHOLD }
      return s
    })
    setWorld(state)

    // Pledge 1: charisma 20 -> 24 (CHARISMA_PER_PLEDGE=4) — cap stays 2
    // (maxPledged(24)=2), exactly the reconciliation this chunk authors: at
    // the pre-W3g +5 award, this same pledge would have opened a third slot
    // before a third pledge, making this fixture unwritable.
    expect(runPledgeCommand('red_wall_sietch')).toEqual({ ok: true, code: 'pledged' })
    expect(world.charisma).toBe(20 + CHARISMA_PER_PLEDGE)
    expect(maxPledged(world.charisma)).toBe(2)

    // Pledge 2: charisma 24 -> 28 — still cap 2 (maxPledged(28)=2), now AT it.
    world.player.location = 'sietch_tabr'
    expect(runPledgeCommand('sietch_tabr')).toEqual({ ok: true, code: 'pledged' })
    expect(world.charisma).toBe(20 + 2 * CHARISMA_PER_PLEDGE)
    expect(maxPledged(world.charisma)).toBe(2)

    // Third attempt: sihaya_ridge is Fremen-owned and already loyal enough
    // (data/sietches.ts seeds it at 62) — this proves the cap refuses even a
    // sietch that would otherwise qualify, not a loyalty shortfall in disguise.
    world.player.location = 'sihaya_ridge'
    const charismaBeforeThird = world.charisma
    const troopGroupsBeforeThird = world.troopGroups.length

    const outcome = runPledgeCommand('sihaya_ridge')

    expect(outcome).toEqual({ ok: false, reason: 'charisma-cap' })
    expect(world.charisma).toBe(charismaBeforeThird) // no mutation
    expect(world.troopGroups).toHaveLength(troopGroupsBeforeThird)
    expect(world.sietches.find(s => s.villageId === 'sihaya_ridge')?.pledgedToPlayer).toBe(false)
    // Existing pledges remain safe (03 recovery row 2's own wording).
    expect(world.sietches.find(s => s.villageId === 'red_wall_sietch')?.pledgedToPlayer).toBe(true)
    expect(world.sietches.find(s => s.villageId === 'sietch_tabr')?.pledgedToPlayer).toBe(true)
  })
})
