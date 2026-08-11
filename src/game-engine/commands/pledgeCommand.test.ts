// src/game-engine/commands/pledgeCommand.test.ts
// The atomic five-step pledge chain (chunk W2b), exercised through
// runPledgeCommand exactly as CommandWiring.ts's onPledge calls it (the
// "dispatch seam") — every refusal code plus the success mutation set.
//
// sietch_tabr's seeded loyalty (45) is below PLEDGE_THRESHOLD (60), so
// fixtures that expect success raise it explicitly; fixtures exercising a
// refusal that doesn't depend on loyalty leave it as shipped.

import { describe, it, expect, beforeEach } from 'vitest'
import { runPledgeCommand } from './pledgeCommand'
import { world, setWorld, createInitialState } from '../GameState'
import { CHARISMA_PER_PLEDGE } from '../sietch/loyalty'

function withLoyalty(villageId: string, loyalty: number): void {
  world.sietches = world.sietches.map(s => s.villageId === villageId ? { ...s, loyalty } : s)
}

describe('runPledgeCommand', () => {
  beforeEach(() => {
    const state = createInitialState()
    state.player.location = 'sietch_tabr'
    setWorld(state)
  })

  it('reports the pledged success code and performs the full mutation set', () => {
    withLoyalty('sietch_tabr', 60)
    const charismaBefore = world.charisma

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(true)
    expect(sietch?.crewIds).toEqual(['group_sietch_tabr'])
    // Chunk W3g: CHARISMA_PER_PLEDGE dropped 5 -> 4 (sietch/loyalty.ts's own
    // doc, citing the opening-charisma-cap fixture).
    expect(world.charisma).toBe(charismaBefore + CHARISMA_PER_PLEDGE)
    expect(world.flags['pledged.count']).toBe(1)
    const crew = world.troopGroups.find(g => g.id === 'group_sietch_tabr')
    expect(crew).toBeDefined()
    expect(crew?.homeSietchId).toBe('sietch_tabr')
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
    // hagg is a sietch-kind village but atreides-owned in the shipped
    // roster (data/villages.ts) — it has a SietchState record, so this
    // proves step 2's ownership check, not step 2's existence check.
    world.player.location = 'hagg'

    const outcome = runPledgeCommand('hagg')

    expect(outcome).toEqual({ ok: false, reason: 'not-fremen' })
  })

  it('refuses already-pledged on a second pledge of the same sietch', () => {
    withLoyalty('sietch_tabr', 60)
    const first = runPledgeCommand('sietch_tabr')
    expect(first.ok).toBe(true)
    const charismaAfterFirst = world.charisma
    const troopGroupsAfterFirst = world.troopGroups.length

    const second = runPledgeCommand('sietch_tabr')

    expect(second).toEqual({ ok: false, reason: 'already-pledged' })
    // Idempotent: repeating the same command grants no second charisma
    // award and manufactures no second crew.
    expect(world.charisma).toBe(charismaAfterFirst)
    expect(world.troopGroups.length).toBe(troopGroupsAfterFirst)
  })

  it('refuses no-sietch for a location with no sietch record at all', () => {
    // Step 1 (presence) runs before step 2 (existence): the player must be
    // "at" the fake location for the chain to even ask whether it has a
    // sietch, so this fixture moves them there rather than leaving them at
    // sietch_tabr — matching a real player who walked somewhere with no
    // Fremen record, not one who never went anywhere.
    world.player.location = 'nowhere-on-the-map'

    const outcome = runPledgeCommand('nowhere-on-the-map')

    expect(outcome).toEqual({ ok: false, reason: 'no-sietch' })
  })

  it('refuses not-loyal-enough below PLEDGE_THRESHOLD, mutating nothing', () => {
    withLoyalty('sietch_tabr', 59)
    const charismaBefore = world.charisma

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'not-loyal-enough' })
    expect(world.charisma).toBe(charismaBefore)
    expect(world.troopGroups).toHaveLength(0)
    expect(world.flags['pledged.count']).toBeUndefined()
  })

  it('refuses charisma-cap once the player already holds as many sietches as charisma allows', () => {
    // charisma 20 -> maxPledged 2; pre-mark two OTHER sietches pledged
    // (bypassing the chain, isolating this refusal from pledge order).
    world.charisma = 20
    world.sietches = world.sietches.map(s =>
      s.villageId === 'red_wall_sietch' || s.villageId === 'hagg'
        ? { ...s, pledgedToPlayer: true }
        : s,
    )
    withLoyalty('sietch_tabr', 60)

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'charisma-cap' })
    const sietch = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(sietch?.pledgedToPlayer).toBe(false)
  })
})
