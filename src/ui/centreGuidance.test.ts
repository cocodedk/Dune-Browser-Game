// src/ui/centreGuidance.test.ts
// livePrompt is the whole policy behind the centre-screen decision card, so
// it is the whole thing worth testing: vitest runs `environment: 'node'`,
// which cannot render ActionPrompt.tsx at all — the component is proven in
// e2e/opening11.spec.ts, the rule is proven here.
//
// Fixtures go through createInitialState + setWorld rather than hand-built
// WorldState literals (TravelSystem.test.ts's own pattern): checkPledgeChain
// reads game-engine/GameState.ts's live singleton, so setWorld is not
// optional bookkeeping here — it is what makes the pledge half of the policy
// answer about THIS world.

import { describe, it, expect } from 'vitest'
import { createInitialState, setWorld } from '../game-engine/GameState'
import { FIRST_HARVEST_FLAG } from '../game-engine/acts/openingObjectives'
import { livePrompt, promptKey } from './centreGuidance'
import type { WorldState } from '../types'
import type { TroopGroup } from '../game-engine/troops/types'

const RED_WALL = 'red_wall_sietch'

/** A world with the player standing at Red Wall Sietch, its loyalty set. */
function atRedWall(loyalty: number): WorldState {
  const state = createInitialState()
  state.player.location = RED_WALL
  state.sietches = state.sietches.map(s => (s.villageId === RED_WALL ? { ...s, loyalty } : s))
  setWorld(state)
  return state
}

function idleCrew(overrides: Partial<TroopGroup> = {}): TroopGroup {
  return {
    id: 'group_red_wall_sietch',
    homeSietchId: RED_WALL,
    locationId: RED_WALL,
    size: 24,
    skills: { spice: 30, prospect: 25, military: 20, ecology: 15 },
    morale: 60,
    task: 'idle',
    taskTargetId: null,
    changeoverDaysLeft: 0,
    ...overrides,
  }
}

/** Red Wall pledged, one idle crew raised — the state right after Beat 4. */
function withIdleCrew(crew: TroopGroup = idleCrew()): WorldState {
  const state = atRedWall(60)
  state.sietches = state.sietches.map(s =>
    s.villageId === RED_WALL ? { ...s, pledgedToPlayer: true } : s)
  state.troopGroups = [crew]
  setWorld(state)
  return state
}

describe('livePrompt — nothing to offer', () => {
  it('is silent on a fresh campaign at Arrakeen', () => {
    const state = createInitialState()
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('is silent while a conversation is open', () => {
    const state = atRedWall(60)
    state.dialogue = { treeId: 'story/redwall_trust', currentNodeId: 'root', villageId: RED_WALL }
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('is silent while a tribute settlement is pending', () => {
    const state = atRedWall(60)
    state.pendingSettlement = {
      cycleIndex: 0, dueDay: 12, amountDue: 90, stock: 100,
      minPartialPayment: 45, arrearsSurchargeRate: 0.25,
      legalRange: { min: 0, max: 90 },
    }
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })
})

describe('livePrompt — the pledge card', () => {
  it('offers the pledge at an unpledged Fremen sietch once the chain passes', () => {
    const state = atRedWall(60)
    expect(livePrompt(state)).toEqual({
      kind: 'pledge', villageId: RED_WALL, name: 'Red Wall Sietch',
    })
  })

  it('stays silent below the pledge threshold — the same rule PledgePanel disables on', () => {
    const state = atRedWall(55) // data/sietches.ts's own seed; threshold is 60
    expect(livePrompt(state)).toBeNull()
  })

  it('stays silent once that sietch has already pledged', () => {
    const state = atRedWall(60)
    state.sietches = state.sietches.map(s =>
      s.villageId === RED_WALL ? { ...s, pledgedToPlayer: true } : s)
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('is never offered remotely — presence is step 1 of the chain', () => {
    const state = atRedWall(60)
    state.player.location = 'arrakeen'
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('is not offered at a non-Fremen location', () => {
    const state = createInitialState()
    state.player.location = 'carthag'
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })
})

describe('livePrompt — the first-harvest card', () => {
  it('names the crew and the field CrewCard would star', () => {
    const state = withIdleCrew()
    expect(livePrompt(state)).toEqual({
      kind: 'first-harvest',
      groupId: 'group_red_wall_sietch',
      fieldId: 'field_red_wall_pan',
      fieldName: 'Red Wall Pan',
    })
  })

  it('retires for good once the first harvest order has been given', () => {
    const state = withIdleCrew()
    state.flags[FIRST_HARVEST_FLAG] = true
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('ignores a crew that already has work', () => {
    const state = withIdleCrew(idleCrew({ task: 'harvest', taskTargetId: 'field_red_wall_pan' }))
    expect(livePrompt(state)).toBeNull()
  })

  it('ignores a crew still moving to new orders', () => {
    const state = withIdleCrew(idleCrew({ changeoverDaysLeft: 1 }))
    expect(livePrompt(state)).toBeNull()
  })

  it('stays silent when no discovered field has anything left', () => {
    const state = withIdleCrew()
    state.spiceFields = state.spiceFields.map(f => ({ ...f, remaining: 0 }))
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })

  it('stays silent when nothing is discovered yet', () => {
    const state = withIdleCrew()
    state.spiceFields = state.spiceFields.map(f => ({ ...f, discovered: false }))
    setWorld(state)
    expect(livePrompt(state)).toBeNull()
  })
})

describe('livePrompt — precedence', () => {
  it('offers the pledge first when both cards could be live', () => {
    // Standing at an unpledged Red Wall with an idle crew already raised
    // elsewhere: the registry's order decides, and pledge comes first.
    const state = atRedWall(60)
    state.troopGroups = [idleCrew({ id: 'group_sietch_tabr', locationId: 'sietch_tabr' })]
    setWorld(state)
    expect(livePrompt(state)?.kind).toBe('pledge')
  })
})

describe('promptKey', () => {
  it('scopes a pledge dismissal to its own sietch', () => {
    expect(promptKey({ kind: 'pledge', villageId: RED_WALL, name: 'Red Wall Sietch' }))
      .toBe('prompt.pledge.red_wall_sietch')
    expect(promptKey({ kind: 'pledge', villageId: 'sietch_tabr', name: 'Sietch Tabr' }))
      .toBe('prompt.pledge.sietch_tabr')
  })

  it('gives the one-time harvest card a single key', () => {
    expect(promptKey({
      kind: 'first-harvest', groupId: 'g', fieldId: 'field_red_wall_pan', fieldName: 'Red Wall Pan',
    })).toBe('prompt.first-harvest')
  })
})
