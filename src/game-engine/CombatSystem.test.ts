// src/game-engine/CombatSystem.test.ts
// Unit tests for the Fedaykin attack / CombatSystem

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attackVillage, DEFENDER_STRENGTH } from './CombatSystem'
import { world, setWorld, createInitialState } from './GameState'
import type { WorldState } from '../types'

// Silence EventBus side-effects
vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshState(): WorldState {
  const state = createInitialState()
  state.player.troops = 50
  return state
}

function harkonnenVillage(state: WorldState) {
  // Use the first village and force it to be harkonnen-owned
  const v = state.villages[0]
  v.owner = 'harkonnen'
  v.status = 'neutral'
  v.loyalty = 40
  return v
}

// ---------------------------------------------------------------------------
// DEFENDER_STRENGTH table
// ---------------------------------------------------------------------------

describe('DEFENDER_STRENGTH', () => {
  it('has expected values for all factions', () => {
    expect(DEFENDER_STRENGTH.harkonnen).toBe(30)
    expect(DEFENDER_STRENGTH.emperor).toBe(25)
    expect(DEFENDER_STRENGTH.atreides).toBe(18)
    expect(DEFENDER_STRENGTH.smugglers).toBe(15)
    expect(DEFENDER_STRENGTH.neutral).toBe(10)
    expect(DEFENDER_STRENGTH.fremen).toBe(20)
    expect(DEFENDER_STRENGTH.player).toBe(999)
  })
})

// ---------------------------------------------------------------------------
// Guard tests (no mutation expected)
// ---------------------------------------------------------------------------

describe('attackVillage: guards', () => {
  beforeEach(() => {
    setWorld(freshState())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('rejects when troopsCommitted is 0', () => {
    const v = harkonnenVillage(world)
    const before = world.player.troops
    attackVillage(v.id, 0)
    expect(world.player.troops).toBe(before)
    expect(v.owner).toBe('harkonnen')
  })

  it('rejects when troopsCommitted exceeds player.troops', () => {
    const v = harkonnenVillage(world)
    world.player.troops = 10
    attackVillage(v.id, 11)
    expect(world.player.troops).toBe(10)
    expect(v.owner).toBe('harkonnen')
  })

  it('rejects attack on a player-owned village', () => {
    const v = world.villages[0]
    v.owner = 'player'
    const before = world.player.troops
    attackVillage(v.id, 10)
    expect(world.player.troops).toBe(before)
  })

  it('rejects attack on a pledged fremen sietch', () => {
    const v = world.villages[0]
    v.owner = 'fremen'
    // Add a pledged sietch for this village
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: true, fremenWorkers: 30, currentTask: null, outputProgress: 0 },
    ]
    const before = world.player.troops
    attackVillage(v.id, 20)
    expect(world.player.troops).toBe(before)
    expect(v.owner).toBe('fremen')
  })
})

// ---------------------------------------------------------------------------
// Victory path (roll=0.5 → effectiveDefense = harkonnen strength = 30)
// 40 committed > 30 → win
// ---------------------------------------------------------------------------

describe('attackVillage: victory path', () => {
  beforeEach(() => {
    setWorld(freshState())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('flips village owner to fremen on victory', () => {
    const v = harkonnenVillage(world)
    attackVillage(v.id, 40)
    expect(v.owner).toBe('fremen')
  })

  it('sets village status to friendly and loyalty to 60', () => {
    const v = harkonnenVillage(world)
    attackVillage(v.id, 40)
    expect(v.status).toBe('friendly')
    expect(v.loyalty).toBe(60)
  })

  it('deducts 20% attacker losses on victory (floor)', () => {
    harkonnenVillage(world)
    const v = world.villages[0]
    world.player.troops = 50
    attackVillage(v.id, 40)
    // 40 committed → floor(40*0.20) = 8 lost
    expect(world.player.troops).toBe(50 - 8)
  })

  it('leaves the matching sietch unpledged on victory (chunk W2b killed the combat pledge path)', () => {
    const v = harkonnenVillage(world)
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
    ]
    attackVillage(v.id, 40)
    const sietch = world.sietches.find(s => s.villageId === v.id)
    expect(sietch?.pledgedToPlayer).toBe(false)
    expect(world.flags['pledged.count']).toBeUndefined()
  })

  it('does not require a sietch (no crash if none exists)', () => {
    const v = harkonnenVillage(world)
    world.sietches = []
    expect(() => attackVillage(v.id, 40)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Defeat path (roll=0.5 → effectiveDefense=30; 20 < 30 → lose)
// ---------------------------------------------------------------------------

describe('attackVillage: defeat path', () => {
  beforeEach(() => {
    setWorld(freshState())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('leaves village owner unchanged on defeat', () => {
    const v = harkonnenVillage(world)
    attackVillage(v.id, 20)
    expect(v.owner).toBe('harkonnen')
  })

  it('leaves village status and loyalty unchanged on defeat', () => {
    const v = harkonnenVillage(world)
    v.status = 'neutral'
    v.loyalty = 40
    attackVillage(v.id, 20)
    expect(v.status).toBe('neutral')
    expect(v.loyalty).toBe(40)
  })

  it('deducts 55% attacker losses on defeat (floor)', () => {
    harkonnenVillage(world)
    const v = world.villages[0]
    world.player.troops = 50
    attackVillage(v.id, 20)
    // floor(20*0.55) = 11 lost
    expect(world.player.troops).toBe(50 - 11)
  })

  it('allows attack on un-pledged fremen village', () => {
    const v = world.villages[0]
    v.owner = 'fremen'
    world.sietches = [
      { villageId: v.id, pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
    ]
    world.player.troops = 50
    // effectiveDefense = round(20*1.0) = 20; committing 10 → lose but no crash
    attackVillage(v.id, 10)
    // defeat: floor(10*0.55)=5 lost; village still fremen
    expect(world.player.troops).toBe(50 - 5)
    expect(v.owner).toBe('fremen')
  })
})
