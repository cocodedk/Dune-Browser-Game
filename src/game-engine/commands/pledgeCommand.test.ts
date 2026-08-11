// src/game-engine/commands/pledgeCommand.test.ts
// The reference CommandOutcome path (chunk W2a) — success code and every
// current refusal code, exercised through runPledgeCommand exactly as
// CommandWiring.ts's onPledge calls it (the "dispatch seam").

import { describe, it, expect, beforeEach } from 'vitest'
import { runPledgeCommand } from './pledgeCommand'
import { world, setWorld, createInitialState } from '../GameState'

describe('runPledgeCommand', () => {
  beforeEach(() => {
    const state = createInitialState()
    // sietch_tabr: fremen-owned, unpledged — needs no other setup.
    state.player.location = 'sietch_tabr'
    setWorld(state)
  })

  it('reports the pledged success code and performs the mutation', () => {
    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(true)
  })

  it('refuses not-present without mutating anything', () => {
    world.player.location = 'hagg'
    const charismaBefore = world.charisma

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'not-present' })
    expect(world.charisma).toBe(charismaBefore)
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(false)
  })

  it('refuses not-fremen for a village not owned by the Fremen', () => {
    // hagg is atreides-owned in the shipped roster (data/villages.ts).
    world.player.location = 'hagg'

    const outcome = runPledgeCommand('hagg')

    expect(outcome).toEqual({ ok: false, reason: 'not-fremen' })
  })

  it('refuses already-pledged on a second pledge of the same sietch', () => {
    const first = runPledgeCommand('sietch_tabr')
    expect(first.ok).toBe(true)
    const charismaAfterFirst = world.charisma

    const second = runPledgeCommand('sietch_tabr')

    expect(second).toEqual({ ok: false, reason: 'already-pledged' })
    // Idempotent: repeating the same command grants no second charisma award.
    expect(world.charisma).toBe(charismaAfterFirst)
  })

  it('refuses no-sietch for a location with no sietch record at all', () => {
    const outcome = runPledgeCommand('nowhere-on-the-map')

    expect(outcome).toEqual({ ok: false, reason: 'no-sietch' })
  })
})
