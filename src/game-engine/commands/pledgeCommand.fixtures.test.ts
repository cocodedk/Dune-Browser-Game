// src/game-engine/commands/pledgeCommand.fixtures.test.ts
// The exact fixtures docs/PRD/game-completion/02-runtime-consolidation.md's
// "Deterministic fixtures" table names for the pledge chain, plus the extra
// proofs chunk W2b's brief calls for: crew id determinism across a real
// save/load round-trip, the win-back (decay-then-re-pledge) crew-dedup
// case, the Water-of-Life dialogue gate this chain feeds, and one
// production-entry-point proof that a fresh campaign can still pledge.

import { describe, it, expect } from 'vitest'
import { runPledgeCommand } from './pledgeCommand'
import { runSietchLoyaltyDay } from '../economy/sietchLoyaltyRun'
import { world, setWorld, createInitialState } from '../GameState'
import { serializeWorld, deserializeWorld } from '../persistence'
import { rootNodeForCharacter } from '../dialogue/select'
import { INITIAL_DIALOGUE_STATES } from '../../data/dialogueStates'
import { PLEDGE_THRESHOLD, NEGLECT_DAYS } from '../sietch/loyalty'

function freshAtTabr(): ReturnType<typeof createInitialState> {
  const state = createInitialState()
  state.player.location = 'sietch_tabr'
  return state
}

describe('pledge-below-threshold: loyalty 59, free capacity', () => {
  it('refuses, mutates nothing, and leaves no success toast', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 59 } : s)
    setWorld(state)

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: false, reason: 'not-loyal-enough' })
    expect(world.charisma).toBe(20)
    expect(world.troopGroups).toHaveLength(0)
    expect(world.flags['pledged.count']).toBeUndefined()
    expect(world.events.some(e => e.type === 'sietch_pledged')).toBe(false)
  })
})

describe('pledge-at-threshold: loyalty 60', () => {
  it('grants one pledge, one crew, one charisma award, and updates the objective/flag projection', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s)
    setWorld(state)

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    expect(world.charisma).toBe(25)
    expect(world.troopGroups).toHaveLength(1)
    expect(world.flags['pledged.count']).toBe(1)
    // The act machine's projection reads world.sietches live (actRun.ts's
    // actView), so it reflects this pledge with no separate write.
    expect(world.sietches.filter(s => s.pledgedToPlayer)).toHaveLength(1)
  })
})

describe('pledge-replayed: the same successful command sent twice', () => {
  it('grants nothing the second time', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s)
    setWorld(state)

    runPledgeCommand('sietch_tabr')
    const charismaAfterFirst = world.charisma
    const crewCountAfterFirst = world.troopGroups.length
    const flagAfterFirst = world.flags['pledged.count']

    const second = runPledgeCommand('sietch_tabr')

    expect(second).toEqual({ ok: false, reason: 'already-pledged' })
    expect(world.charisma).toBe(charismaAfterFirst)
    expect(world.troopGroups.length).toBe(crewCountAfterFirst)
    expect(world.flags['pledged.count']).toBe(flagAfterFirst)
  })
})

describe('crew id determinism across a save/load round-trip', () => {
  it('keeps the same crew id after serializeWorld/deserializeWorld', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s)
    setWorld(state)
    runPledgeCommand('sietch_tabr')
    const idBefore = world.troopGroups[0].id

    const reloaded = deserializeWorld(serializeWorld(world))

    expect(reloaded.troopGroups).toHaveLength(1)
    expect(reloaded.troopGroups[0].id).toBe(idBefore)
    expect(reloaded.troopGroups[0].id).toBe('group_sietch_tabr')
    expect(reloaded.sietches.find(s => s.villageId === 'sietch_tabr')?.crewIds).toEqual([idBefore])
  })
})

describe('win-back: decay to unpledge, restore loyalty, re-pledge', () => {
  it('never manufactures a second crew for the same sietch', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s)
    setWorld(state)

    runPledgeCommand('sietch_tabr')
    expect(world.troopGroups).toHaveLength(1)
    const originalCrewId = world.troopGroups[0].id

    // Neglect past the window (lastVisitedDay is still the seed's 0), one
    // tick under UNPLEDGE_THRESHOLD: 30 decays to 29, which is strictly
    // below it — mirrors sietch/loyalty.test.ts's own boundary fixture
    // (31 would land exactly on 30 and stay pledged).
    world.time = NEGLECT_DAYS * 60 // TimeSystem.DAY_SECONDS=60, inlined to
    // keep this fixture free of a cross-module import for one constant.
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: 30 } : s,
    )
    runSietchLoyaltyDay()
    const afterDecay = world.sietches.find(s => s.villageId === 'sietch_tabr')
    expect(afterDecay?.pledgedToPlayer).toBe(false)
    expect(afterDecay?.loyalty).toBe(29)

    // Win back: loyalty recovers, re-pledge through the real chain.
    world.sietches = world.sietches.map(s =>
      s.villageId === 'sietch_tabr' ? { ...s, loyalty: PLEDGE_THRESHOLD } : s,
    )
    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    expect(world.troopGroups).toHaveLength(1) // not 2
    expect(world.troopGroups[0].id).toBe(originalCrewId)
    expect(world.sietches.find(s => s.villageId === 'sietch_tabr')?.crewIds).toEqual([originalCrewId])
  })
})

describe('Water of Life: pledging through the canonical chain satisfies its reader', () => {
  it('opens sova_ritual_root once pledged.count >= 1, via the real dialogue selector', () => {
    const state = freshAtTabr()
    state.sietches = state.sietches.map(s => s.villageId === 'sietch_tabr' ? { ...s, loyalty: 60 } : s)
    setWorld(state)

    expect(rootNodeForCharacter('sova', INITIAL_DIALOGUE_STATES, world.flags))
      .toBe('sova_greeting_root') // before any pledge

    const outcome = runPledgeCommand('sietch_tabr')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    expect(rootNodeForCharacter('sova', INITIAL_DIALOGUE_STATES, world.flags))
      .toBe('sova_ritual_root')
  })
})

describe('playability: a fresh campaign can still pledge, via the real chain', () => {
  it('pledges a sietch that opens above threshold with no gift or dialogue setup', () => {
    // red_wall_sietch (loyalty 80, data/sietches.ts) is one of three shipped
    // sietches already above PLEDGE_THRESHOLD at opening — sietch_tabr (45)
    // is deliberately NOT one of them: the fresh-campaign pledge path no
    // longer runs through the player's own home sietch on click one, unlike
    // the pre-chain live behavior (any Fremen sietch, no loyalty gate).
    const state = createInitialState()
    state.player.location = 'red_wall_sietch'
    setWorld(state)

    const outcome = runPledgeCommand('red_wall_sietch')

    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    const crew = world.troopGroups.find(g => g.id === 'group_red_wall_sietch')
    expect(crew).toBeDefined()
    expect(crew?.task).toBe('idle') // ready for a production assignCrew command
  })
})
